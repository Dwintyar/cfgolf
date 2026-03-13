import { ArrowLeft, Globe, Mail, Camera, UserPlus, UserCheck, MessageCircle, Crown, Check, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import heroImg from "@/assets/golf-hero.jpg";
import venueImg from "@/assets/golf-venue.jpg";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CreateClubDialog from "@/components/CreateClubDialog";

type Tab = "about" | "clubs" | "gallery";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  handicap: number | null;
}

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  is_personal?: boolean;
}

const GolferProfile = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("about");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [buddyStatus, setBuddyStatus] = useState<string | null>(null);
  const [buddyConnectionId, setBuddyConnectionId] = useState<string | null>(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClubs = async (targetId: string) => {
    // Fetch clubs via membership
    const { data: membersData } = await supabase
      .from("members")
      .select("club_id, clubs(id, name, logo_url, is_personal)")
      .eq("user_id", targetId);

    // Also fetch personal club owned by user (in case not in members table)
    const { data: personalClub } = await supabase
      .from("clubs")
      .select("id, name, logo_url, is_personal")
      .eq("owner_id", targetId)
      .eq("is_personal", true)
      .maybeSingle();

    const memberClubs: Club[] = (membersData || [])
      .map((m: any) => m.clubs)
      .filter(Boolean);

    // Merge personal club if not already in list
    if (personalClub && !memberClubs.find((c) => c.id === personalClub.id)) {
      memberClubs.unshift(personalClub);
    }

    // Sort: personal club first
    memberClubs.sort((a, b) => {
      if (a.is_personal && !b.is_personal) return -1;
      if (!a.is_personal && b.is_personal) return 1;
      return 0;
    });

    setClubs(memberClubs);
  };

  const fetchInvites = async (targetId: string) => {
    const { data } = await supabase
      .from("club_invitations")
      .select("*, clubs(id, name, logo_url)")
      .eq("invited_user_id", targetId)
      .eq("status", "pending");
    setPendingInvites(data || []);
  };

  const handleAcceptInvite = async (inviteId: string, clubId: string) => {
    if (!currentUserId) return;
    await supabase.from("club_invitations").update({ status: "accepted" }).eq("id", inviteId);
    await supabase.from("members").insert({ club_id: clubId, user_id: currentUserId, role: "member" });
    toast({ title: "Berhasil bergabung!" });
    const targetId = paramId || currentUserId;
    if (targetId) { fetchClubs(targetId); fetchInvites(targetId); }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    await supabase.from("club_invitations").update({ status: "declined" }).eq("id", inviteId);
    toast({ title: "Undangan ditolak" });
    const targetId = paramId || currentUserId;
    if (targetId) fetchInvites(targetId);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);
      const targetId = paramId || user.id;
      setIsOwnProfile(targetId === user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .single();

      if (profileData) setProfile(profileData);

      await fetchClubs(targetId);

      // Check buddy status if viewing someone else
      if (targetId !== user.id) {
        const { data: connections } = await supabase
          .from("buddy_connections")
          .select("*")
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
          .limit(1);

        if (connections && connections.length > 0) {
          const conn = connections[0] as any;
          setBuddyConnectionId(conn.id);
          if (conn.status === "accepted") {
            setBuddyStatus("accepted");
          } else if (conn.status === "pending") {
            setBuddyStatus(conn.requester_id === user.id ? "sent" : "pending");
          }
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [navigate, paramId]);

  const handleAddBuddy = async () => {
    if (!profile || !currentUserId) return;
    const { error } = await supabase.from("buddy_connections").insert({
      requester_id: currentUserId,
      addressee_id: profile.id,
    });
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      setBuddyStatus("sent");
      toast({ title: "Permintaan buddy terkirim!" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload gagal", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (updateError) {
      toast({ title: "Update gagal", description: updateError.message, variant: "destructive" });
    } else {
      setProfile({ ...profile, avatar_url: urlData.publicUrl });
      toast({ title: "Avatar berhasil diperbarui" });
    }
    setUploading(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "ABOUT" },
    { id: "clubs", label: "CLUBS" },
    { id: "gallery", label: "GALLERY" },
  ];

  if (loading) {
    return (
      <div className="bottom-nav-safe p-6 space-y-4">
        <Skeleton className="h-28 w-28 rounded-full mx-auto" />
        <Skeleton className="h-6 w-40 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <div className="flex gap-3 px-8">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-nav-safe">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Green gradient header */}
      <div className="relative bg-gradient-to-b from-secondary to-background pb-6">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-10 rounded-full bg-background/40 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Centered avatar */}
        <div className="flex flex-col items-center pt-14">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-primary/50">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
              <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          <h1 className="mt-3 font-display text-xl font-bold">
            {profile?.full_name || "Unnamed Golfer"}
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {profile?.location || "No location set"}
          </p>

          {/* Stats badges */}
          <div className="mt-4 flex gap-3 px-8 w-full">
            <Badge variant="outline" className="flex-1 justify-center rounded-lg border-border px-4 py-2.5 text-sm font-bold">
              HCP {profile?.handicap ?? "N/A"}
            </Badge>
            <Badge variant="outline" className="flex-1 justify-center rounded-lg border-border px-4 py-2.5 text-sm font-bold">
              {clubs.length} CLUBS
            </Badge>
          </div>

          {/* Action buttons */}
          {!isOwnProfile && (
            <div className="mt-4 flex gap-3 px-8 w-full">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider border-border"
                onClick={() => navigate("/chat")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              {buddyStatus === "accepted" ? (
                <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider" variant="outline" disabled>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Buddies
                </Button>
              ) : buddyStatus === "sent" ? (
                <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider" variant="outline" disabled>
                  Requested
                </Button>
              ) : (
                <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider" onClick={handleAddBuddy}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Buddy
                </Button>
              )}
            </div>
          )}

          {isOwnProfile && (
            <div className="mt-4 flex gap-3 px-8 w-full">
              <Button variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider border-border" onClick={() => navigate("/settings")}>
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-8 border-b border-border/50 px-4">
        {tabs.map((t) => (
          <div key={t.id} className="flex items-center gap-4">
            <button
              onClick={() => setTab(t.id)}
              className={`relative py-3 text-sm font-semibold tracking-wider transition-colors ${
                tab === t.id ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            {t.id === "clubs" && isOwnProfile && (
              <button
                onClick={() => setShowCreateClub(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 pb-4">
        {tab === "about" && (
          <div className="space-y-4 animate-fade-in">
            <div className="px-2">
              <p className="text-sm italic text-muted-foreground">
                {profile?.bio || "No bio yet"}
              </p>
            </div>

            <div className="golf-card p-4 flex items-start gap-4">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">No website linked</p>
              </div>
            </div>

            <div className="golf-card p-4 flex items-center gap-4">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">Contact via Message</p>
            </div>
          </div>
        )}

        {tab === "clubs" && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {clubs.length === 0 && (
              <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
                Belum bergabung dengan klub manapun
              </p>
            )}
            {clubs.map((c, i) => (
              <div
                key={c.id}
                onClick={() => navigate(`/clubs/${c.id}`)}
                className="golf-card overflow-hidden animate-fade-in cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative h-28 bg-secondary flex items-center justify-center">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary/30">
                      {c.name.charAt(0)}
                    </span>
                  )}
                  {c.is_personal && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold text-primary-foreground uppercase tracking-wider">
                      <Crown className="h-3 w-3" />
                      Personal
                    </span>
                  )}
                </div>
                <p className="p-2.5 text-xs font-medium truncate">{c.name}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "gallery" && (
          <div className="grid grid-cols-4 gap-1 animate-fade-in">
            {[heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg].map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Gallery ${i + 1}`}
                className="aspect-square w-full object-cover animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Club Dialog */}
      <CreateClubDialog
        open={showCreateClub}
        onOpenChange={setShowCreateClub}
        onCreated={() => {
          const targetId = paramId || currentUserId;
          if (targetId) fetchClubs(targetId);
        }}
      />
    </div>
  );
};

export default GolferProfile;

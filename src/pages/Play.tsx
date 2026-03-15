import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Users, MessageCircle, X, Check } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type BuddyTab = "suggestions" | "requests" | "buddies";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  handicap: number | null;
}

interface BuddyConnection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
}

const Play = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<BuddyTab>("suggestions");
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<(BuddyConnection & { profile: Profile })[]>([]);
  const [buddies, setBuddies] = useState<(BuddyConnection & { profile: Profile })[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUserId(user.id);

    // Fetch all connections involving current user
    const { data: connections } = await supabase
      .from("buddy_connections")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const conns = connections || [];

    // Get IDs of connected users
    const connectedIds = new Set<string>();
    const pendingRequests: (BuddyConnection & { profile: Profile })[] = [];
    const acceptedBuddies: (BuddyConnection & { profile: Profile })[] = [];
    const sentReqIds = new Set<string>();

    conns.forEach((c: any) => {
      const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id;
      connectedIds.add(otherId);
    });

    // Fetch profiles for all connected users
    const connectedProfileIds = Array.from(connectedIds);
    let profileMap: Record<string, Profile> = {};

    if (connectedProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, location, handicap")
        .in("id", connectedProfileIds);
      if (profiles) {
        profiles.forEach((p: Profile) => { profileMap[p.id] = p; });
      }
    }

    conns.forEach((c: any) => {
      const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id;
      const profile = profileMap[otherId];
      if (!profile) return;

      if (c.status === "accepted") {
        acceptedBuddies.push({ ...c, profile });
      } else if (c.status === "pending" && c.addressee_id === user.id) {
        pendingRequests.push({ ...c, profile });
      } else if (c.status === "pending" && c.requester_id === user.id) {
        sentReqIds.add(otherId);
      }
    });

    setRequests(pendingRequests);
    setBuddies(acceptedBuddies);
    setSentRequests(sentReqIds);

    // Fetch suggestions (all profiles not yet connected)
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, location, handicap")
      .neq("id", user.id)
      .limit(50);

    if (allProfiles) {
      const suggestedProfiles = allProfiles.filter(
        (p: Profile) => !connectedIds.has(p.id) || sentReqIds.has(p.id)
      );
      setSuggestions(suggestedProfiles);
    }

    setLoading(false);
  };

  const sendRequest = async (addresseeId: string) => {
    if (!currentUserId) return;
    setActionLoading(addresseeId);
    const { error } = await supabase.from("buddy_connections").insert({
      requester_id: currentUserId,
      addressee_id: addresseeId,
    });
    if (error) {
      toast({ title: "Gagal mengirim permintaan", description: error.message, variant: "destructive" });
    } else {
      setSentRequests((prev) => new Set(prev).add(addresseeId));
      toast({ title: "Permintaan buddy terkirim!" });
    }
    setActionLoading(null);
  };

  const acceptRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("buddy_connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", connectionId);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Buddy diterima!" });
      fetchData();
    }
    setActionLoading(null);
  };

  const declineRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("buddy_connections")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", connectionId);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permintaan ditolak" });
      fetchData();
    }
    setActionLoading(null);
  };

  const removeBuddy = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from("buddy_connections")
      .delete()
      .eq("id", connectionId);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Buddy dihapus" });
      fetchData();
    }
    setActionLoading(null);
  };

  const startConversation = async (otherUserId: string) => {
    if (!currentUserId) return;

    const { data: myConvs, error: myConvsError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    if (myConvsError) {
      toast({ title: "Gagal membuka percakapan", description: myConvsError.message, variant: "destructive" });
      return;
    }

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map((c) => c.conversation_id);
      const { data: shared, error: sharedError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", myConvIds)
        .limit(1);

      if (sharedError) {
        toast({ title: "Gagal membuka percakapan", description: sharedError.message, variant: "destructive" });
        return;
      }

      if (shared && shared.length > 0) {
        navigate(`/chat/${shared[0].conversation_id}`);
        return;
      }
    }

    const newConversationId = crypto.randomUUID();
    const { error: createConversationError } = await supabase
      .from("conversations")
      .insert({ id: newConversationId });

    if (createConversationError) {
      toast({ title: "Gagal membuat percakapan", description: createConversationError.message, variant: "destructive" });
      return;
    }

    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: newConversationId, user_id: currentUserId },
        { conversation_id: newConversationId, user_id: otherUserId },
      ]);

    if (participantsError) {
      toast({ title: "Gagal menambahkan peserta", description: participantsError.message, variant: "destructive" });
      return;
    }

    navigate(`/chat/${newConversationId}`);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredSuggestions = suggestions.filter((p) =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBuddies = buddies.filter((b) =>
    !search || b.profile.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: BuddyTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "suggestions", label: "Suggestions", icon: UserPlus },
    { id: "requests", label: "Requests", icon: Users, count: requests.length },
    { id: "buddies", label: "My Buddies", icon: MessageCircle, count: buddies.length },
  ];

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Buddies" />

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search golfers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-secondary border-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold tracking-wide transition-colors ${
              tab === t.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* SUGGESTIONS TAB */}
            {tab === "suggestions" && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  People you may know
                </p>
                {filteredSuggestions.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No suggestions available
                  </p>
                )}
                {filteredSuggestions.map((p, i) => {
                  const isSent = sentRequests.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="golf-card flex items-center gap-3 p-3 animate-fade-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <button onClick={() => navigate(`/profile/${p.id}`)}>
                        <Avatar className="h-14 w-14 border-2 border-primary/30">
                          <AvatarImage src={p.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-sm font-bold">
                            {getInitials(p.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${p.id}`)}>
                        <p className="text-sm font-semibold truncate">{p.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.location || "No location"} · HCP {p.handicap ?? "N/A"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isSent ? "outline" : "default"}
                        disabled={isSent || actionLoading === p.id}
                        onClick={() => sendRequest(p.id)}
                        className="h-9 rounded-lg text-xs font-bold shrink-0"
                      >
                        {isSent ? "Requested" : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Add Buddy
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* REQUESTS TAB */}
            {tab === "requests" && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Buddy Requests
                </p>
                {requests.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No pending requests
                  </p>
                )}
                {requests.map((r, i) => (
                  <div
                    key={r.id}
                    className="golf-card flex items-center gap-3 p-3 animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <button onClick={() => navigate(`/profile/${r.profile.id}`)}>
                      <Avatar className="h-14 w-14 border-2 border-primary/30">
                        <AvatarImage src={r.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-sm font-bold">
                          {getInitials(r.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${r.profile.id}`)}>
                      <p className="text-sm font-semibold truncate">{r.profile.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.profile.location || "No location"} · HCP {r.profile.handicap ?? "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => acceptRequest(r.id)}
                        disabled={actionLoading === r.id}
                        className="h-9 w-9 rounded-lg p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineRequest(r.id)}
                        disabled={actionLoading === r.id}
                        className="h-9 w-9 rounded-lg p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MY BUDDIES TAB */}
            {tab === "buddies" && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Your Buddies ({filteredBuddies.length})
                </p>
                {filteredBuddies.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {search ? "No buddies found" : "You haven't added any buddies yet"}
                  </p>
                )}
                {filteredBuddies.map((b, i) => (
                  <div
                    key={b.id}
                    className="golf-card flex items-center gap-3 p-3 animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <button onClick={() => navigate(`/profile/${b.profile.id}`)}>
                      <Avatar className="h-14 w-14 border-2 border-primary/30">
                        <AvatarImage src={b.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-sm font-bold">
                          {getInitials(b.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${b.profile.id}`)}>
                      <p className="text-sm font-semibold truncate">{b.profile.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.profile.location || "No location"} · HCP {b.profile.handicap ?? "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startConversation(b.profile.id)}
                        className="h-9 w-9 rounded-lg p-0"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBuddy(b.id)}
                        disabled={actionLoading === b.id}
                        className="h-9 w-9 rounded-lg p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Play;

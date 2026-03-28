import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { User } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  defaultOrganizerClubId?: string;
}

const CreateTourDialog = ({ open, onOpenChange, onCreated, defaultOrganizerClubId }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("personal");
  const [clubId, setClubId] = useState(defaultOrganizerClubId ?? "");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (defaultOrganizerClubId) setClubId(defaultOrganizerClubId);
  }, [defaultOrganizerClubId]);

  // Fetch user's personal club
  const { data: personalClub } = useQuery({
    queryKey: ["my-personal-club", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("is_personal", true)
        .eq("owner_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch clubs where user is owner/admin (for internal/interclub)
  const { data: myClubs } = useQuery({
    queryKey: ["my-admin-clubs-create-tour", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("members")
        .select("club_id, clubs(id, name, is_personal)")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);
      return (data ?? [])
        .map((m: any) => m.clubs)
        .filter((c: any) => c && !c.is_personal) as { id: string; name: string }[];
    },
    enabled: !!userId,
  });

  // Auto-set clubId based on type
  useEffect(() => {
    if (defaultOrganizerClubId) return;
    if (type === "personal" && personalClub) {
      setClubId(personalClub.id);
      setIsPublic(false);
    } else if (type !== "personal") {
      // Clear if switching away from personal
      if (clubId === personalClub?.id) setClubId("");
      setIsPublic(true);
    }
  }, [type, personalClub]);

  const isPersonalType = type === "personal";

  // For personal: auto-create personal club if not exists
  const ensurePersonalClub = async (): Promise<string | null> => {
    if (personalClub) return personalClub.id;
    if (!userId) return null;

    // Get user profile name for club name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const clubName = `${profile?.full_name ?? "My"} Golf`;

    const { data: newClub, error } = await supabase
      .from("clubs")
      .insert({
        name: clubName,
        is_personal: true,
        owner_id: userId,
        facility_type: "golf_course",
      })
      .select("id")
      .single();

    if (error) { toast.error("Failed to create personal club: " + error.message); return null; }

    // Add user as owner member
    await supabase.from("members").insert({
      club_id: newClub.id,
      user_id: userId,
      role: "owner",
    });

    return newClub.id;
  };

  const handleSubmit = async () => {
    if (!name) { toast.error("Tournament name is required"); return; }
    setLoading(true);

    let resolvedClubId = clubId;

    if (isPersonalType) {
      const pcId = await ensurePersonalClub();
      if (!pcId) { setLoading(false); return; }
      resolvedClubId = pcId;
    }

    if (!resolvedClubId) { toast.error("Organizer club is required"); setLoading(false); return; }

    const { error } = await supabase.from("tours").insert({
      name,
      tournament_type: type,
      organizer_club_id: resolvedClubId,
      year: parseInt(year),
      description: description || null,
      is_public: isPublic,
    });

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tournament created successfully!");
    setName(""); setDescription(""); setIsPublic(false); setType("personal");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create Tournament</DialogTitle></DialogHeader>
        <div className="space-y-3">

          {/* Type selector */}
          <div>
            <Label className="text-xs">Tournament Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { value: "personal", label: "Personal", icon: "👤", desc: "Solo rounds" },
                { value: "internal", label: "Internal", icon: "🏌️", desc: "Club tournament" },
                { value: "interclub", label: "Interclub", icon: "🏆", desc: "Inter-club" },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    type === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="text-lg">{t.icon}</div>
                  <p className="text-[11px] font-semibold mt-0.5">{t.label}</p>
                  <p className="text-[9px] opacity-60 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Personal club info banner */}
          {isPersonalType && (
            <div className="flex items-center gap-2.5 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary">
                  {personalClub ? personalClub.name : "Personal Club will be created automatically"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {personalClub
                    ? "This tournament will be organized by your personal club"
                    : "Personal club will be created when you save your first tournament"}
                </p>
              </div>
            </div>
          )}

          {/* Organizer Club — only for internal/interclub */}
          {!isPersonalType && (
            <div>
              <Label className="text-xs">Organizer Club</Label>
              {myClubs && myClubs.length > 0 ? (
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                  <SelectContent>
                    {myClubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-xs text-amber-500 font-medium">No clubs yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Create or join a club first to create a {type}.
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Tournament Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder={isPersonalType ? "e.g. My Rounds 2026" : "e.g. Spring Championship"} />
          </div>

          <div>
            <Label className="text-xs">Year</Label>
            <Input type="number" value={year} onChange={e => setYear(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="golf-card p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{isPublic ? "🌐 Public" : "🔒 Private"}</p>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "All members can see this tournament"
                  : "Only you and registered players can see this"}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button className="w-full" onClick={handleSubmit}
            disabled={loading || (!isPersonalType && !clubId)}>
            {loading ? "Creating…" : "Create Tournament"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTourDialog;

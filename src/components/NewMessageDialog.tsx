import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const NewMessageDialog = ({ open, onOpenChange, userId }: Props) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [buddies, setBuddies] = useState<any[]>([]);
  const [loadingBuddies, setLoadingBuddies] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoadingBuddies(true);

    const load = async () => {
      // Step 1: fetch accepted connections
      const { data: connections } = await supabase
        .from("buddy_connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (!connections || connections.length === 0) {
        setBuddies([]);
        setLoadingBuddies(false);
        return;
      }

      // Step 2: get other person's ID from each connection
      const otherIds = connections.map((c: any) =>
        c.requester_id === userId ? c.addressee_id : c.requester_id
      );

      // Step 3: fetch profiles for those IDs
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, handicap")
        .in("id", otherIds);

      setBuddies(profiles ?? []);
      setLoadingBuddies(false);
    };

    load();
  }, [open, userId]);

  const filtered = search.trim().length < 1
    ? buddies
    : buddies.filter(b => b.full_name?.toLowerCase().includes(search.toLowerCase()));

  const selectUser = async (targetId: string, targetName: string) => {
    setCreating(true);

    // Check for existing conversation
    const { data: myParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (myParts) {
      for (const ep of myParts) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", ep.conversation_id)
          .eq("user_id", targetId)
          .limit(1);
        if (otherPart && otherPart.length > 0) {
          onOpenChange(false);
          navigate(`/chat/${ep.conversation_id}`);
          setCreating(false);
          return;
        }
      }
    }

    // Create new conversation
    const newId = crypto.randomUUID();
    const { error } = await supabase.from("conversations").insert({ id: newId });
    if (error) { toast.error("Failed to create conversation"); setCreating(false); return; }

    await supabase.from("conversation_participants").insert([
      { conversation_id: newId, user_id: userId },
      { conversation_id: newId, user_id: targetId },
    ]);

    toast.success(`Chat dimulai dengan ${targetName}`);
    onOpenChange(false);
    navigate(`/chat/${newId}`);
    setCreating(false);
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        {!loadingBuddies && buddies.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buddies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1">
          {loadingBuddies && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingBuddies && buddies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-primary/60" />
              </div>
              <p className="text-sm font-semibold">No buddies yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tambah buddy dulu di tab Play untuk bisa memulai chat.
              </p>
            </div>
          )}

          {!loadingBuddies && buddies.length > 0 && filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No results</p>
          )}

          {filtered.map((profile) => (
            <button
              key={profile.id}
              onClick={() => selectUser(profile.id, profile.full_name)}
              disabled={creating}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={profile.avatar_url ?? ""} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile.full_name}</p>
              </div>
              {profile.handicap != null && (
                <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                  HCP {profile.handicap}
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageDialog;

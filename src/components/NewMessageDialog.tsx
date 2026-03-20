import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2 } from "lucide-react";
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
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, handicap")
      .neq("id", userId)
      .ilike("full_name", `%${query.trim()}%`)
      .limit(15);
    setResults(data ?? []);
    setLoading(false);
  };

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
    if (error) {
      toast.error("Failed to create conversation");
      setCreating(false);
      return;
    }

    await supabase.from("conversation_participants").insert([
      { conversation_id: newId, user_id: userId },
      { conversation_id: newId, user_id: targetId },
    ]);

    toast.success(`Chat started with ${targetName}`);
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && search.trim().length >= 2 && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No players found</p>
          )}
          {results.map((profile) => (
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

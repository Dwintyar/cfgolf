import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  clubId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

const InviteMemberDialog = ({ clubId, open, onOpenChange, onDone }: Props) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${q}%`)
      .limit(10);
    setResults(data || []);
    setLoading(false);
  };

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if already member
    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      toast({ title: "Sudah menjadi member" });
      setInviting(null);
      return;
    }

    // Check if already invited
    const { data: existingInv } = await supabase
      .from("club_invitations")
      .select("id")
      .eq("club_id", clubId)
      .eq("invited_user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existingInv) {
      toast({ title: "Undangan sudah dikirim sebelumnya" });
      setInviting(null);
      return;
    }

    const { error } = await supabase.from("club_invitations").insert({
      club_id: clubId,
      invited_by: user.id,
      invited_user_id: userId,
      status: "pending",
    });

    if (error) {
      toast({ title: "Gagal mengundang", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Undangan berhasil dikirim!" });
      onDone();
    }
    setInviting(null);
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "??";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Undang Member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search golfer name..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
            {loading && <p className="text-xs text-muted-foreground py-3 text-center">Searching...</p>}
            {results.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url ?? ""} />
                  <AvatarFallback className="bg-secondary text-xs font-semibold">{getInitials(p.full_name)}</AvatarFallback>
                </Avatar>
                <p className="flex-1 text-sm font-medium truncate">{p.full_name || "Golfer"}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3"
                  disabled={inviting === p.id}
                  onClick={() => handleInvite(p.id)}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {inviting === p.id ? "..." : "Invite"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;

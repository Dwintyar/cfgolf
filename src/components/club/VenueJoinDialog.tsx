import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserCheck, Flag, Anchor, GraduationCap, Users } from "lucide-react";

const ROLES = [
  { id: "caddy",   label: "Caddy",   desc: "Pendamping & pembawa tas golfer",       icon: UserCheck },
  { id: "marshal", label: "Marshal", desc: "Pengatur arus permainan di lapangan",    icon: Flag },
  { id: "starter", label: "Starter", desc: "Petugas tee box pertama",               icon: Anchor },
  { id: "pro",     label: "Pro",     desc: "Golf professional / instruktur",         icon: GraduationCap },
  { id: "staff",   label: "Staff",   desc: "Staf umum venue",                       icon: Users },
] as const;

type Role = typeof ROLES[number]["id"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  clubName: string;
  userId: string;
  onSuccess: () => void;
}

const VenueJoinDialog = ({ open, onOpenChange, clubId, clubName, userId, onSuccess }: Props) => {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    const { error } = await supabase.from("club_staff").insert({
      club_id: clubId,
      user_id: userId,
      staff_role: selected,
      status: "pending",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Request sudah dikirim sebelumnya", variant: "destructive" });
      } else {
        toast({ title: "Gagal mengirim request", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Request terkirim ✓", description: `Menunggu persetujuan ${clubName}` });
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Bergabung ke {clubName}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Pilih role yang ingin kamu lamar</p>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {ROLES.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                selected === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-secondary/60"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected === id ? "border-primary bg-primary" : "border-border"
              }`}>
                {selected === id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button className="flex-1" disabled={!selected || loading} onClick={handleSubmit}>
            {loading ? "Mengirim..." : "Kirim Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VenueJoinDialog;

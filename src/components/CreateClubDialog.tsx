import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateClubDialog = ({ open, onOpenChange, onCreated }: CreateClubDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Nama klub harus diisi", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: club, error } = await supabase
      .from("clubs")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        owner_id: user.id,
        is_personal: false,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Gagal membuat klub", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Auto-join as owner
    await supabase.from("members").insert({
      club_id: club.id,
      user_id: user.id,
      role: "owner",
    });

    toast({ title: "Klub berhasil dibuat!" });
    setName("");
    setDescription("");
    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Buat Klub Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="club-name">Nama Klub</Label>
            <Input
              id="club-name"
              placeholder="Enter club name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="club-desc">Deskripsi (opsional)</Label>
            <Textarea
              id="club-desc"
              placeholder="Deskripsi singkat tentang klub"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Membuat..." : "Buat Klub"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClubDialog;

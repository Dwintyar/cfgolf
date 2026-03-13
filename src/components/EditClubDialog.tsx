import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EditClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club: { id: string; name: string; description: string | null; logo_url: string | null };
  onUpdated: () => void;
}

const EditClubDialog = ({ open, onOpenChange, club, onUpdated }: EditClubDialogProps) => {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description || "");
  const [logoUrl, setLogoUrl] = useState(club.logo_url || "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "??";

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${club.id}/logo.${ext}`;

    const { error } = await supabase.storage.from("club-logos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload gagal", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nama klub harus diisi", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("clubs")
      .update({ name: name.trim(), description: description.trim() || null, logo_url: logoUrl || null })
      .eq("id", club.id);

    if (error) {
      toast({ title: "Gagal update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Klub berhasil diperbarui!" });
      onUpdated();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Klub</DialogTitle></DialogHeader>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        <div className="space-y-4 pt-2">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/30">
                <AvatarImage src={logoUrl} />
                <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nama Klub</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleSave} disabled={loading || uploading} className="w-full">
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditClubDialog;

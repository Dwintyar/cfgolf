import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ClaimProfileDialogProps {
  open: boolean;
  onClose: () => void;
  claimantId: string;
  claimantName: string;
}

const ClaimProfileDialog = ({ open, onClose, claimantId, claimantName }: ClaimProfileDialogProps) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data: results, isFetching } = useQuery({
    queryKey: ["claim-search", search],
    queryFn: async () => {
      if (search.trim().length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, handicap, location, avatar_url, created_at")
        .ilike("full_name", `%${search.trim()}%`)
        .neq("id", claimantId)
        .limit(8);
      return data ?? [];
    },
    enabled: search.trim().length >= 2,
  });

  // Check if user already has a pending claim
  const { data: existingClaim } = useQuery({
    queryKey: ["my-claim", claimantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_claim_requests")
        .select("*, profiles:target_profile_id(full_name)")
        .eq("claimant_id", claimantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!claimantId,
  });

  const handleSubmit = async () => {
    if (!selected || !claimantId) return;
    setSubmitting(true);
    const { error } = await supabase.from("profile_claim_requests").insert({
      claimant_id: claimantId,
      target_profile_id: selected.id,
      reason: reason.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Anda sudah pernah mengajukan klaim untuk profil ini");
      } else {
        toast.error("Gagal mengajukan klaim");
      }
      return;
    }
    // Notify admin
    const { data: admins } = await supabase
      .from("system_admins")
      .select("user_id")
      .eq("is_active", true);
    for (const admin of admins ?? []) {
      await supabase.from("notifications").insert({
        user_id: admin.user_id,
        title: "Klaim Profil Baru 🔔",
        message: `${claimantName} mengklaim profil "${selected.full_name}". Harap review di Admin Dashboard.`,
        type: "system",
      });
    }
    setDone(true);
    toast.success("Klaim berhasil diajukan! Admin akan memverifikasi dalam 1–2 hari kerja.");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50 shrink-0">
          <div>
            <p className="font-semibold text-sm">Klaim Data Turnamen</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Cari nama Anda di data EGT dan hubungkan ke akun ini
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Existing claim status */}
          {existingClaim && !done && (
            <div className={`rounded-xl px-3 py-2.5 text-sm flex items-start gap-2 ${
              existingClaim.status === "pending" ? "bg-amber-500/10 text-amber-500" :
              existingClaim.status === "approved" ? "bg-green-500/10 text-green-500" :
              "bg-red-400/10 text-red-400"
            }`}>
              {existingClaim.status === "approved"
                ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium capitalize">
                  Klaim {existingClaim.status === "pending" ? "sedang diproses" :
                         existingClaim.status === "approved" ? "disetujui" : "ditolak"}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Profil: {(existingClaim.profiles as any)?.full_name ?? "—"}
                  {existingClaim.admin_note && ` · ${existingClaim.admin_note}`}
                </p>
              </div>
            </div>
          )}

          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">📨</div>
              <p className="font-semibold">Klaim berhasil diajukan!</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tim GolfBuana akan memverifikasi klaim Anda dalam 1–2 hari kerja.
                Setelah disetujui, semua data turnamen EGT akan otomatis masuk ke akun Anda.
              </p>
              <Button className="w-full" onClick={onClose}>Tutup</Button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Cari nama Anda di data EGT
                </label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Ketik minimal 2 huruf..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                    className="pl-8 h-10 text-sm"
                  />
                </div>
              </div>

              {/* Search results */}
              {search.trim().length >= 2 && (
                <div className="space-y-1.5">
                  {isFetching && (
                    <p className="text-xs text-muted-foreground text-center py-2">Mencari...</p>
                  )}
                  {!isFetching && (results?.length ?? 0) === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nama tidak ditemukan di database EGT
                    </p>
                  )}
                  {results?.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        selected?.id === p.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={p.avatar_url ?? ""} />
                        <AvatarFallback className="text-xs">{p.full_name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.location || "—"} · HCP {p.handicap ?? "—"}
                        </p>
                      </div>
                      {selected?.id === p.id && (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected + reason */}
              {selected && (
                <div className="space-y-3 pt-1 border-t border-border/50">
                  <div className="rounded-xl bg-primary/5 px-3 py-2.5 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm">
                      Mengklaim profil <span className="font-semibold">{selected.full_name}</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Alasan / Bukti identitas (opsional)
                    </label>
                    <Textarea
                      placeholder="Contoh: Saya ikut EGT 2027 sebagai peserta dari EGC. No HP: 08xx..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1.5 text-sm min-h-[80px]"
                    />
                  </div>
                  <Button
                    className="w-full h-11"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? "Mengajukan..." : "Ajukan Klaim →"}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Admin akan memverifikasi sebelum data digabungkan
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimProfileDialog;

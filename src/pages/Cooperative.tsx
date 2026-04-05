import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type TierKey = "caddy" | "golfer" | "venue";

const TIERS: Record<TierKey, {
  emoji: string; label: string; class: string;
  price: string; color: string; bg: string; border: string;
  desc: string; benefits: string[];
}> = {
  caddy: {
    emoji: "🎒", label: "Caddy", class: "Kelas B",
    price: "Rp 25.000/bulan", color: "text-green-500",
    bg: "bg-green-500/10", border: "border-green-500/30",
    desc: "Untuk caddy aktif yang ingin profil terverifikasi dan penghasilan terstruktur.",
    benefits: [
      "Profil caddy terverifikasi + sistem rating",
      "Terima penugasan booking langsung via app",
      "Dashboard jadwal & estimasi pendapatan",
      "Notifikasi push saat ada penugasan baru",
      "Akses program BPJS kolektif koperasi",
      "SHU tahunan dari caddy fee yang difasilitasi",
      "Hak suara di Rapat Anggota Tahunan",
    ],
  },
  golfer: {
    emoji: "🏌️", label: "Golfer", class: "Kelas A",
    price: "Rp 50.000/bulan", color: "text-primary",
    bg: "bg-primary/10", border: "border-primary/30",
    desc: "Untuk golfer aktif yang ingin booking tee time, ikut turnamen resmi, dan dapat bagi hasil.",
    benefits: [
      "Booking tee time di semua venue koperasi",
      "Daftar turnamen resmi EGT dan event komunitas",
      "Diskon green fee 5% di venue anggota",
      "Notifikasi push semua aktivitas platform",
      "Bergabung unlimited klub komunitas",
      "SHU tahunan dari aktivitas ronde & booking",
      "Hak suara di Rapat Anggota Tahunan",
    ],
  },
  venue: {
    emoji: "🏢", label: "Golf Course", class: "Kelas C",
    price: "Rp 500.000/bulan", color: "text-amber-500",
    bg: "bg-amber-500/10", border: "border-amber-500/30",
    desc: "Untuk pengelola lapangan golf yang ingin digitalisasi operasional dan akses komunitas golfer.",
    benefits: [
      "Dashboard venue & analytics kunjungan penuh",
      "Kelola tee time, caddy, dan booking digital",
      "Tournament hosting tools lengkap",
      "Benchmark anonim vs venue koperasi lain",
      "Co-marketing di platform GolfBuana",
      "SHU dari nilai booking & transaksi di venue",
      "Hak suara di Rapat Anggota (cap 40%)",
    ],
  },
};

const FREE_FEATURES = [
  "Profil golfer publik",
  "Handicap tracking & input scorecard",
  "Lihat leaderboard & hasil turnamen",
  "Feed komunitas (read-only)",
  "Bergabung 1 klub komunal",
  "Mode Demo untuk coba semua fitur",
];

const ROADMAP = [
  { phase: "Sekarang", title: "Platform Aktif", desc: "GolfBuana beroperasi dengan komunitas EGC dan 199+ golfer terdaftar.", done: true },
  { phase: "Bulan 1–12", title: "Komunitas Tumbuh", desc: "Akuisisi organik via EGT 2027, demo mode, dan referral komunitas.", done: false },
  { phase: "Bulan 12–18", title: "Founding Members", desc: "Rekrut 33+ founding members dari tiga kelas — target Anda adalah salah satunya.", done: false },
  { phase: "Bulan 24+", title: "Koperasi Resmi", desc: "Pengesahan Kemenkop UKM, RAT pertama, distribusi SHU perdana.", done: false },
];

const Cooperative = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedTier, setExpandedTier] = useState<TierKey | null>("golfer");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["coop-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, subscription_tier")
        .eq("id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const { data: myInterest } = useQuery({
    queryKey: ["my-coop-interest", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cooperative_interests")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: interestCount } = useQuery({
    queryKey: ["coop-interest-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("cooperative_interests")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const handleSubmit = async () => {
    if (!userId || !selectedTier) return;
    setSubmitting(true);
    const classMap: Record<TierKey, string> = { caddy: "B", golfer: "A", venue: "C" };
    const { error } = await supabase.from("cooperative_interests").upsert({
      user_id: userId,
      member_class: classMap[selectedTier],
      tier: selectedTier,
      notes: notes || null,
      status: "pending",
    }, { onConflict: "user_id" });
    setSubmitting(false);
    if (error) { toast.error("Gagal mendaftar, coba lagi"); return; }
    setSubmitted(true);
    toast.success("Minat Anda tercatat! Tim GolfBuana akan menghubungi Anda.");
  };

  const alreadyInterested = !!myInterest;
  const progressPct = Math.min(Math.round(((interestCount ?? 0) / 33) * 100), 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-bold text-base">GBPlay Cooperative</h1>
          <p className="text-[11px] text-muted-foreground">Koperasi Multi Pihak Golf Indonesia</p>
        </div>
      </div>

      <div className="px-4 space-y-6 pt-5">

        {/* Hero */}
        <div className="text-center space-y-3 py-2">
          <div className="text-4xl">⛳</div>
          <h2 className="text-2xl font-bold leading-tight">
            Bukan sekadar aplikasi.<br />
            <span className="text-primary">Kamu adalah pemiliknya.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            GBPlay Cooperative adalah koperasi digital golf pertama di Indonesia. Subscription Anda bukan biaya — ini simpanan yang menghasilkan bagi hasil.
          </p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-1">
            <span>🏌️ Golfer</span>
            <span>🎒 Caddy</span>
            <span>🏢 Golf Course</span>
          </div>
        </div>

        {/* Founding member counter */}
        <div className="golf-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Founding Members</span>
            </div>
            <span className="text-xs text-muted-foreground">{interestCount ?? 0} / 33 target</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {33 - (interestCount ?? 0)} slot lagi untuk mencapai kuorum pendirian koperasi.
            {(interestCount ?? 0) > 0 && ` ${interestCount} orang sudah menyatakan minat.`}
          </p>
        </div>

        {/* Free tier */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Selalu gratis</p>
          <div className="golf-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🆓</span>
              <div>
                <p className="text-sm font-semibold">Free — Selamanya</p>
                <p className="text-[11px] text-muted-foreground">Tidak ada batas waktu, tidak perlu kartu kredit</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              {FREE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <span className="text-muted-foreground mt-0.5">✓</span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Paid tiers */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Anggota Koperasi</p>
          {(Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][]).map(([key, t]) => {
            const isExpanded = expandedTier === key;
            return (
              <div key={key} className={`golf-card border ${t.border} overflow-hidden`}>
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedTier(isExpanded ? null : key)}
                >
                  <span className="text-2xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{t.label}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.bg} ${t.color} font-medium`}>
                        {t.class}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${t.color}`}>{t.price}</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                    <div className="space-y-1.5">
                      {t.benefits.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          <span className={`${t.color} mt-0.5 shrink-0`}>✓</span>
                          <span className="text-foreground/80">{b}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-lg ${t.bg} px-3 py-2 text-[11px] ${t.color} font-medium`}>
                      💡 Simpanan pokok dicicil otomatis dari subscription bulan pertama
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SHU explanation */}
        <div className="golf-card p-4 space-y-3">
          <p className="text-sm font-semibold">💰 Bagaimana Bagi Hasil (SHU) Bekerja?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Setiap tahun, surplus koperasi dibagikan kembali ke anggota berdasarkan kontribusi dan aktivitas masing-masing.
          </p>
          <div className="space-y-2">
            {[
              { label: "Dana Cadangan", pct: "25%", color: "bg-primary" },
              { label: "Bagi Hasil Anggota (SHU)", pct: "40%", color: "bg-green-500" },
              { label: "Pengembangan Platform", pct: "20%", color: "bg-amber-500" },
              { label: "Pendidikan Koperasi", pct: "5%",  color: "bg-blue-500" },
              { label: "Dana Sosial", pct: "10%", color: "bg-muted-foreground" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                <span className="text-xs font-bold">{item.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Roadmap Pendirian</p>
          {ROADMAP.map((r, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${r.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {r.done ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                {i < ROADMAP.length - 1 && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
              </div>
              <div className="pb-4">
                <p className="text-[10px] text-muted-foreground">{r.phase}</p>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form minat */}
        {alreadyInterested || submitted ? (
          <div className="golf-card p-5 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <p className="text-sm font-semibold">Minat Anda sudah tercatat!</p>
            <p className="text-xs text-muted-foreground">
              Tier: <span className="font-medium capitalize">{myInterest?.tier ?? selectedTier}</span> ·
              Kelas {myInterest?.member_class ?? (selectedTier === "caddy" ? "B" : selectedTier === "golfer" ? "A" : "C")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tim GolfBuana akan menghubungi Anda via WhatsApp untuk konfirmasi pembayaran dan proses bergabung sebagai founding member.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Daftar minat founding member
            </p>
            <p className="text-xs text-muted-foreground">
              Belum ada tagihan sekarang. Tim kami akan menghubungi Anda untuk konfirmasi.
            </p>

            {/* Tier selector */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][]).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTier(key)}
                  className={`rounded-xl p-3 text-center border transition-all ${
                    selectedTier === key
                      ? `${t.bg} ${t.border} border-2`
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="text-xl mb-1">{t.emoji}</div>
                  <div className={`text-xs font-medium ${selectedTier === key ? t.color : "text-muted-foreground"}`}>
                    {t.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{t.class}</div>
                </button>
              ))}
            </div>

            {selectedTier && (
              <div className={`rounded-xl ${TIERS[selectedTier].bg} px-3 py-2 text-[11px] ${TIERS[selectedTier].color}`}>
                {TIERS[selectedTier].price} · simpanan pokok dicicil otomatis
              </div>
            )}

            <Textarea
              placeholder="Pertanyaan atau catatan (opsional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[80px]"
            />

            <Button
              className="w-full h-12 text-sm font-semibold"
              disabled={!selectedTier || submitting || !userId}
              onClick={handleSubmit}
            >
              {submitting
                ? "Mendaftar..."
                : selectedTier
                ? `Saya Tertarik Jadi Founding ${TIERS[selectedTier].label} 🏌️`
                : "Pilih kelas keanggotaan dulu"}
            </Button>

            {!userId && (
              <p className="text-xs text-center text-muted-foreground">
                <button onClick={() => navigate("/login")} className="text-primary underline underline-offset-2">
                  Login dulu
                </button>{" "}untuk mendaftar minat.
              </p>
            )}
          </div>
        )}

        <p className="text-[10px] text-center text-muted-foreground pb-4">
          Dengan mendaftar, Anda menyatakan minat bergabung sebagai founding member GBPlay KMP.
          Koperasi belum resmi terbentuk — tidak ada kewajiban hukum saat ini.
        </p>
      </div>
    </div>
  );
};

export default Cooperative;

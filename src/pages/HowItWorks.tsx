import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Role = "golfer" | "venue" | "caddy";

const journeys: Record<Role, { emoji: string; label: string; color: string; bg: string; steps: { icon: string; title: string; desc: string }[] }> = {
  golfer: {
    emoji: "🏌️",
    label: "Golfer",
    color: "text-primary",
    bg: "bg-primary/10",
    steps: [
      { icon: "👤", title: "Buat profil", desc: "Daftar dengan Google, isi handicap awal dan foto profil Anda." },
      { icon: "🏆", title: "Bergabung ke klub", desc: "Temukan klub golf Anda atau buat klub baru bersama rekan bermain." },
      { icon: "📊", title: "Catat ronde", desc: "Input scorecard digital setelah bermain — handicap terupdate otomatis." },
      { icon: "🥇", title: "Ikut turnamen", desc: "Daftar turnamen EGT atau event komunitas, pantau leaderboard real-time." },
      { icon: "📅", title: "Book tee time", desc: "Pilih lapangan, pilih waktu, booking langsung ke venue — konfirmasi instan." },
      { icon: "💰", title: "Dapat bagi hasil", desc: "Sebagai anggota koperasi GBPlay, Anda mendapat SHU tahunan dari aktivitas bermain." },
    ],
  },
  venue: {
    emoji: "🏢",
    label: "Golf Course",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    steps: [
      { icon: "📋", title: "Daftar sebagai mitra", desc: "Isi form singkat, unggah dokumen venue, verifikasi oleh tim GolfBuana." },
      { icon: "⚙️", title: "Setup lapangan", desc: "Input tee boxes, atur slot tee time, tentukan harga green fee weekday & weekend." },
      { icon: "🎒", title: "Daftarkan caddy", desc: "Tambahkan roster caddy aktif di venue Anda — mereka akan terhubung ke profil platform." },
      { icon: "✅", title: "Kelola booking", desc: "Konfirmasi permintaan tee time, assign caddy, dan set status siap bermain." },
      { icon: "📈", title: "Pantau analytics", desc: "Dashboard kunjungan, tren tee time, dan pendapatan dari booking platform." },
      { icon: "💰", title: "Terima SHU", desc: "Sebagai anggota Kelas C koperasi, venue mendapat bagi hasil dari transaksi di platform." },
    ],
  },
  caddy: {
    emoji: "🎒",
    label: "Caddy",
    color: "text-green-500",
    bg: "bg-green-500/10",
    steps: [
      { icon: "🏌️", title: "Daftar melalui venue", desc: "Pengelola lapangan mendaftarkan Anda ke platform — tidak perlu proses ribet." },
      { icon: "👤", title: "Profil caddy aktif", desc: "Nama Anda terlihat di sistem booking — golfer bisa request caddy spesifik." },
      { icon: "🔔", title: "Terima penugasan", desc: "Notifikasi otomatis saat venue assign Anda ke booking tee time atau turnamen." },
      { icon: "⭐", title: "Bangun reputasi", desc: "Golfer memberi rating setelah ronde — semakin banyak bintang semakin mudah dapat booking." },
      { icon: "📱", title: "Pantau jadwal", desc: "Lihat semua penugasan mendatang di tab Caddy profil Anda." },
      { icon: "🛡️", title: "Perlindungan koperasi", desc: "Akses BPJS kolektif, jaminan kompensasi cancel mendadak, dan pelatihan caddy bersertifikat." },
    ],
  },
};

const HowItWorks = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("golfer");
  const [step, setStep] = useState(0);
  const journey = journeys[role];
  const totalSteps = journey.steps.length;
  const currentStep = journey.steps[step];

  const handleRoleChange = (r: Role) => {
    setRole(r);
    setStep(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-border/50">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-bold text-base leading-tight">Cara Kerja GolfBuana</h1>
          <p className="text-[11px] text-muted-foreground">Platform golf komunitas Indonesia</p>
        </div>
      </div>

      {/* Role selector */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(journeys) as Role[]).map((r) => {
            const j = journeys[r];
            const isActive = role === r;
            return (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`rounded-xl p-3 text-center transition-all border ${
                  isActive
                    ? `${j.bg} border-current ${j.color} font-semibold`
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                }`}
              >
                <div className="text-xl mb-1">{j.emoji}</div>
                <div className="text-xs font-medium">{j.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step progress */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-1.5 mb-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all ${
                i <= step ? journey.color.replace("text-", "bg-") : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          Langkah {step + 1} dari {totalSteps}
        </p>
      </div>

      {/* Step card */}
      <div className="flex-1 px-4 pt-4 pb-6">
        <div className={`rounded-2xl ${journey.bg} border border-current/10 p-6 mb-4`}>
          <div className="text-4xl mb-4">{currentStep.icon}</div>
          <h2 className={`text-xl font-bold mb-2 ${journey.color}`}>{currentStep.title}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{currentStep.desc}</p>
        </div>

        {/* All steps overview */}
        <div className="space-y-2">
          {journey.steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                i === step
                  ? `${journey.bg} border border-current/20`
                  : "hover:bg-muted/50"
              }`}
            >
              <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold shrink-0 ${
                i < step
                  ? `bg-green-500 text-white`
                  : i === step
                  ? `${journey.bg} ${journey.color} border border-current/30`
                  : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`text-sm ${i === step ? `font-semibold ${journey.color}` : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/50 px-4 py-3 pb-safe space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11"
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Sebelumnya
          </Button>
          {step < totalSteps - 1 ? (
            <Button className="flex-1 h-11" onClick={() => setStep(s => s + 1)}>
              Selanjutnya <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1 h-11" onClick={() => navigate("/onboarding")}>
              Mulai Sekarang 🏌️
            </Button>
          )}
        </div>
        {step === totalSteps - 1 && (
          <p className="text-[11px] text-center text-muted-foreground">
            Sudah punya akun?{" "}
            <button onClick={() => navigate("/login")} className="text-primary font-medium underline underline-offset-2">
              Masuk
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default HowItWorks;

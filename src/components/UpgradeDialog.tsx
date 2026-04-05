import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tier, TIER_LABELS, TIER_PRICE, TIER_COLOR, TIER_BG } from "@/hooks/use-tier";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  requiredTier: Tier;
  featureName: string;
}

const TIER_BENEFITS: Record<Tier, string[]> = {
  free: [],
  caddy: [
    "Profil caddy terverifikasi & rating",
    "Terima penugasan booking via app",
    "Dashboard jadwal & pendapatan",
    "Notifikasi push penugasan",
    "Posting di channel komunitas",
    "SHU tahunan dari caddy fee",
    "Hak suara koperasi GBPlay",
  ],
  golfer: [
    "Booking tee time di semua venue",
    "Daftar turnamen resmi (EGT, dll)",
    "Notifikasi push semua aktivitas",
    "Bergabung unlimited klub",
    "Diskon green fee 5% di venue koperasi",
    "SHU tahunan dari aktivitas ronde",
    "Hak suara koperasi GBPlay",
  ],
  venue: [
    "Dashboard venue & analytics penuh",
    "Kelola tee time, caddy, booking",
    "Tournament hosting tools",
    "Benchmark vs venue koperasi lain",
    "Co-marketing di platform",
    "Diskon green fee 10% untuk anggota",
    "SHU dari booking & transaksi venue",
  ],
};

const TIER_EMOJI: Record<Tier, string> = {
  free: "🆓", caddy: "🎒", golfer: "🏌️", venue: "🏢",
};

const UpgradeDialog = ({ open, onClose, requiredTier, featureName }: UpgradeDialogProps) => {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${TIER_BG[requiredTier]} px-5 pt-5 pb-4`}>
          <div className="text-3xl mb-2">{TIER_EMOJI[requiredTier]}</div>
          <p className="text-base font-bold">
            Fitur {TIER_LABELS[requiredTier]}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-medium">{featureName}</span> tersedia untuk anggota{" "}
            <span className={`font-semibold ${TIER_COLOR[requiredTier]}`}>
              {TIER_LABELS[requiredTier]}
            </span>
          </p>
        </div>

        {/* Benefits */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Yang kamu dapat
          </p>
          {TIER_BENEFITS[requiredTier].slice(0, 4).map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 shrink-0 ${TIER_COLOR[requiredTier]}`}>✓</span>
              <span className="text-foreground/80">{b}</span>
            </div>
          ))}
          {TIER_BENEFITS[requiredTier].length > 4 && (
            <p className="text-xs text-muted-foreground pl-5">
              +{TIER_BENEFITS[requiredTier].length - 4} manfaat lainnya
            </p>
          )}
        </div>

        {/* Price + CTA */}
        <div className="px-5 pb-5 space-y-2">
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">Mulai dari</span>
            <span className={`text-sm font-bold ${TIER_COLOR[requiredTier]}`}>
              {TIER_PRICE[requiredTier]}
            </span>
          </div>
          <Button
            className="w-full h-11"
            onClick={() => { onClose(); navigate("/cooperative"); }}
          >
            Daftar sebagai {TIER_LABELS[requiredTier]} →
          </Button>
          <Button variant="ghost" className="w-full h-9 text-sm" onClick={onClose}>
            Nanti saja
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeDialog;

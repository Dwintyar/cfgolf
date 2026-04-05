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
  emoji: string; label: string; memberClass: string;
  price: string; color: string; bg: string; border: string;
  desc: string; benefits: string[];
}> = {
  caddy: {
    emoji: "🎒", label: "Caddy", memberClass: "Class B",
    price: "Rp 25,000/month", color: "text-green-500",
    bg: "bg-green-500/10", border: "border-green-500/30",
    desc: "For active caddies who want a verified profile and structured income.",
    benefits: [
      "Verified caddy profile with rating system",
      "Receive booking assignments directly via app",
      "Schedule & income dashboard",
      "Push notifications for new assignments",
      "Collective health insurance access (BPJS)",
      "Annual profit share (SHU) from facilitated caddy fees",
      "Voting rights at Annual General Meeting (RAT)",
    ],
  },
  golfer: {
    emoji: "🏌️", label: "Golfer", memberClass: "Class A",
    price: "Rp 50,000/month", color: "text-primary",
    bg: "bg-primary/10", border: "border-primary/30",
    desc: "For active golfers who want tee time booking, official tournaments, and annual dividends.",
    benefits: [
      "Tee time booking at all member venues",
      "Register for official tournaments (EGT and more)",
      "5% green fee discount at member venues",
      "Push notifications for all platform activity",
      "Join unlimited community clubs",
      "Annual profit share (SHU) from rounds & bookings",
      "Voting rights at Annual General Meeting (RAT)",
    ],
  },
  venue: {
    emoji: "🏢", label: "Golf Course", memberClass: "Class C",
    price: "Rp 500,000/month", color: "text-amber-500",
    bg: "bg-amber-500/10", border: "border-amber-500/30",
    desc: "For golf course operators who want to digitize operations and reach an active golfer community.",
    benefits: [
      "Full venue dashboard & visit analytics",
      "Manage tee times, caddies & bookings digitally",
      "Tournament hosting tools",
      "Anonymous benchmarking vs other member venues",
      "Co-marketing on GolfBuana platform",
      "Annual profit share (SHU) from venue transactions",
      "Voting rights at Annual General Meeting (capped 40%)",
    ],
  },
};

const FREE_FEATURES = [
  "Public golfer profile",
  "Handicap tracking & scorecard input",
  "View leaderboards & tournament results",
  "Community feed (read-only)",
  "Join 1 community club",
  "Demo Mode to explore all features",
];

const ROADMAP = [
  { phase: "Now", title: "Platform Active", desc: "GolfBuana is live with the EGC community and 199+ registered golfers.", done: true },
  { phase: "Month 1–12", title: "Community Growth", desc: "Organic acquisition via EGT 2025, demo mode, and community referrals.", done: false },
  { phase: "Month 12–18", title: "Founding Members", desc: "Recruit 33+ founding members across all three classes — you could be one of them.", done: false },
  { phase: "Month 24+", title: "Formal Cooperative", desc: "Registered with Ministry of Cooperatives, first AGM, first profit share distribution.", done: false },
];

const SHU_BREAKDOWN = [
  { label: "Reserve Fund", pct: "25%", color: "bg-primary" },
  { label: "Member Profit Share (SHU)", pct: "40%", color: "bg-green-500" },
  { label: "Platform Development", pct: "20%", color: "bg-amber-500" },
  { label: "Member Education", pct: "5%", color: "bg-blue-500" },
  { label: "Social Fund", pct: "10%", color: "bg-muted-foreground" },
];

const Cooperative = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedTier, setExpandedTier] = useState<TierKey | null>("golfer");
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  const { data: myInterest, refetch: refetchInterest } = useQuery({
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

  const { data: interestCount, refetch: refetchCount } = useQuery({
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
    if (error) { toast.error("Registration failed, please try again"); return; }
    setSubmitted(true);
    refetchInterest();
    refetchCount();
    toast.success("Interest registered! The GolfBuana team will contact you.");
  };

  const cancelInterest = async () => {
    if (!userId) return;
    setCancelling(true);
    const { error } = await supabase
      .from("cooperative_interests")
      .delete()
      .eq("user_id", userId);
    setCancelling(false);
    if (error) { toast.error("Failed to withdraw registration"); return; }
    toast.success("Registration withdrawn");
    setSubmitted(false);
    refetchInterest();
    refetchCount();
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
          <p className="text-[11px] text-muted-foreground">Golf's member-owned platform in Indonesia</p>
        </div>
      </div>

      <div className="px-4 space-y-6 pt-5">

        {/* Hero */}
        <div className="text-center space-y-3 py-2">
          <div className="text-4xl">⛳</div>
          <h2 className="text-2xl font-bold leading-tight">
            Not just an app.<br />
            <span className="text-primary">You own a piece of it.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            GBPlay Cooperative is Indonesia's first member-owned golf platform. Your subscription isn't a fee — it's a capital contribution that earns you annual profit share.
          </p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-1">
            <span>🏌️ Golfers</span>
            <span>🎒 Caddies</span>
            <span>🏢 Golf Courses</span>
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
            {33 - (interestCount ?? 0)} spots remaining to reach the quorum for formal cooperative registration.
            {(interestCount ?? 0) > 0 && ` ${interestCount} ${(interestCount ?? 0) === 1 ? "person has" : "people have"} expressed interest.`}
          </p>
        </div>

        {/* Free tier */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Always free</p>
          <div className="golf-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🆓</span>
              <div>
                <p className="text-sm font-semibold">Free — Forever</p>
                <p className="text-[11px] text-muted-foreground">No time limit, no credit card required</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              {FREE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <span className="mt-0.5">✓</span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Member tiers */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cooperative membership</p>
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
                        {t.memberClass}
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
                      💡 Member capital contribution (simpanan pokok) auto-installment from first month
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* How profit sharing works */}
        <div className="golf-card p-4 space-y-3">
          <p className="text-sm font-semibold">💰 How Profit Sharing Works</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every year, the cooperative's surplus is distributed back to members based on their contribution and activity.
          </p>
          <div className="space-y-2">
            {SHU_BREAKDOWN.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                <span className="text-xs font-bold">{item.pct}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Legally structured as Koperasi Multi Pihak (KMP) under Indonesian Cooperative Law No. 25/1992.
          </p>
        </div>

        {/* Roadmap */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Formation roadmap</p>
          {ROADMAP.map((r, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                  r.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {r.done
                    ? <CheckCircle className="h-3.5 w-3.5" />
                    : <span className="text-[10px] font-bold">{i + 1}</span>}
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

        {/* Registration form / status */}
        {alreadyInterested || submitted ? (
          <div className="golf-card p-5 space-y-3">
            <div className="text-center space-y-2">
              <div className="text-3xl">🎉</div>
              <p className="text-sm font-semibold">Your interest is registered!</p>
              <p className="text-xs text-muted-foreground">
                {myInterest?.tier ?? selectedTier} · {myInterest?.member_class ?? (selectedTier === "caddy" ? "Class B" : selectedTier === "golfer" ? "Class A" : "Class C")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The GolfBuana team will reach out via WhatsApp to confirm your membership contribution and onboarding as a founding member.
              </p>
            </div>
            {(myInterest?.status === "pending" || submitted) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50"
                disabled={cancelling}
                onClick={cancelInterest}
              >
                {cancelling ? "Withdrawing..." : "Withdraw Registration"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Register as a founding member
            </p>
            <p className="text-xs text-muted-foreground">
              No payment required now. Our team will contact you to confirm.
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
                  <div className="text-[9px] text-muted-foreground mt-0.5">{t.memberClass}</div>
                </button>
              ))}
            </div>

            {selectedTier && (
              <div className={`rounded-xl ${TIERS[selectedTier].bg} px-3 py-2 text-[11px] ${TIERS[selectedTier].color}`}>
                {TIERS[selectedTier].price} · capital contribution auto-installment
              </div>
            )}

            <Textarea
              placeholder="Questions or notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[80px]"
            />

            <Button
              className="w-full h-12 text-sm font-semibold"
              disabled={!selectedTier || submitting || !userId}
              onClick={() => selectedTier && setShowConfirm(true)}
            >
              {submitting
                ? "Registering..."
                : selectedTier
                ? `Join as Founding ${TIERS[selectedTier].label} 🏌️`
                : "Select a membership class first"}
            </Button>

            {!userId && (
              <p className="text-xs text-center text-muted-foreground">
                <button onClick={() => navigate("/login")} className="text-primary underline underline-offset-2">
                  Sign in
                </button>{" "}to register your interest.
              </p>
            )}
          </div>
        )}

        <p className="text-[10px] text-center text-muted-foreground pb-4">
          By registering, you express interest in joining GBPlay Cooperative as a founding member.
          The cooperative is not yet formally established — no legal obligations at this time.
        </p>
      </div>

      {/* Confirm dialog */}
      {showConfirm && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setShowConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <div className="text-3xl">{TIERS[selectedTier].emoji}</div>
              <p className="font-semibold text-sm">Confirm Registration</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are registering as a founding member:
              </p>
              <div className={`rounded-xl ${TIERS[selectedTier].bg} px-4 py-3 space-y-0.5`}>
                <p className={`font-bold text-sm ${TIERS[selectedTier].color}`}>
                  {TIERS[selectedTier].label} · {TIERS[selectedTier].memberClass}
                </p>
                <p className="text-xs text-muted-foreground">{TIERS[selectedTier].price}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                No payment required now. Our team will reach out to confirm next steps.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={submitting}
                onClick={() => { setShowConfirm(false); handleSubmit(); }}
              >
                {submitting ? "Registering..." : "Yes, Register"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cooperative;

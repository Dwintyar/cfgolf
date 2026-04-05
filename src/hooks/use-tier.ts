import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "free" | "caddy" | "golfer" | "venue";

const TIER_RANK: Record<Tier, number> = {
  free: 0, caddy: 1, golfer: 2, venue: 3,
};

export const TIER_LABELS: Record<Tier, string> = {
  free: "Free", caddy: "Caddy", golfer: "Golfer", venue: "Venue",
};

export const TIER_PRICE: Record<Tier, string> = {
  free: "Gratis", caddy: "Rp 25rb/bulan", golfer: "Rp 50rb/bulan", venue: "Rp 500rb/bulan",
};

export const TIER_COLOR: Record<Tier, string> = {
  free: "text-muted-foreground",
  caddy: "text-green-500",
  golfer: "text-primary",
  venue: "text-amber-500",
};

export const TIER_BG: Record<Tier, string> = {
  free: "bg-muted",
  caddy: "bg-green-500/10",
  golfer: "bg-primary/10",
  venue: "bg-amber-500/10",
};

// Feature gating map — which tier is required for each feature
export const FEATURE_TIERS: Record<string, Tier> = {
  "booking_tee_time":   "golfer",
  "join_tournament":    "golfer",
  "push_notifications": "caddy",
  "post_channel":       "caddy",
  "unlimited_clubs":    "golfer",
  "diskon_green_fee":   "golfer",
  "caddy_profile":      "caddy",
  "caddy_assignments":  "caddy",
  "venue_dashboard":    "venue",
  "venue_analytics":    "venue",
  "tournament_hosting": "venue",
};

export const useTier = (userId: string | null) => {
  const { data: profile, refetch } = useQuery({
    queryKey: ["tier-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier, active_roles, tier_expires_at")
        .eq("id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const tier = (profile?.subscription_tier ?? "free") as Tier;
  const activeRoles = profile?.active_roles ?? ["free"];

  const hasFeature = (feature: string): boolean => {
    const required = FEATURE_TIERS[feature];
    if (!required) return true; // unknown feature = allowed
    return TIER_RANK[tier] >= TIER_RANK[required];
  };

  const hasRole = (role: Tier): boolean => activeRoles.includes(role);

  const upgradeRequired = (feature: string): Tier | null => {
    const required = FEATURE_TIERS[feature];
    if (!required) return null;
    if (hasFeature(feature)) return null;
    return required;
  };

  return { tier, activeRoles, hasFeature, hasRole, upgradeRequired, refetch };
};

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FeatureFlags = {
  venue_booking: boolean;
  caddy_assignment: boolean;
  staff_join_request: boolean;
  invoice_download: boolean;
  tee_time_picker: boolean;
  venue_schedule_admin: boolean;
  [key: string]: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  venue_booking: false,
  caddy_assignment: false,
  staff_join_request: false,
  invoice_download: false,
  tee_time_picker: false,
  venue_schedule_admin: false,
};

export const useFeatureFlags = () => {
  const { data: flags, isLoading } = useQuery({
    queryKey: ["feature_flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, enabled");
      if (error) return DEFAULT_FLAGS;
      return Object.fromEntries(
        (data ?? []).map((f: { key: string; enabled: boolean }) => [f.key, f.enabled])
      ) as FeatureFlags;
    },
    staleTime: 1000 * 60 * 5, // cache 5 menit
  });

  return {
    flags: flags ?? DEFAULT_FLAGS,
    isLoading,
  };
};

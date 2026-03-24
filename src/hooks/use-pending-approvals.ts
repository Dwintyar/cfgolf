import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export const usePendingApprovals = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  const isAdmin = userEmail === "dwintyar@gmail.com";

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-approvals-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_approvals")
        .select("id")
        .eq("status", "pending");
      return data?.length ?? 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  return { pendingCount, isAdmin };
};

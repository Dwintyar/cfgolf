import { useState, useEffect, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminRouteProps {
  children: ReactNode;
  requirePlatformAdmin?: boolean;
}

const AdminRoute = ({ children, requirePlatformAdmin = false }: AdminRouteProps) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (requirePlatformAdmin) {
        const { data } = await supabase
          .from("system_admins")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .in("admin_level", ["super_admin"])
          .maybeSingle();
        setHasAccess(!!data);
      } else {
        const { data } = await supabase
          .from("members")
          .select("id")
          .eq("user_id", user.id)
          .in("role", ["owner", "admin"])
          .limit(1);
        setHasAccess(!!(data && data.length > 0));
      }
      setLoading(false);
    };
    checkAccess();
  }, [requirePlatformAdmin]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-3 w-full max-w-sm px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );

  if (!hasAccess) return <Navigate to="/news" replace />;

  return <>{children}</>;
};

export default AdminRoute;

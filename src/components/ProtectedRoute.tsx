import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "approved" | "rejected";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", session.user.id)
        .single();

      if (!profile?.is_approved) {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
        return;
      }

      if (!cancelled) setStatus("approved");
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          if (!cancelled) navigate("/login", { replace: true });
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_approved")
            .eq("id", session.user.id)
            .single();

          if (!profile?.is_approved) {
            await supabase.auth.signOut();
            return;
          }

          if (!cancelled) setStatus("approved");
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

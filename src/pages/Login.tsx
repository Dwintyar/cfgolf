import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import loginBg from "@/assets/golf-login-bg.jpg";
import logo from "@/assets/logo.svg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Clock, Mail } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const checkOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, is_approved")
      .eq("id", userId)
      .single();

    if (!data?.is_approved) {
      await supabase.auth.signOut();
      toast.error("Akun Anda belum disetujui oleh admin EGC. Silakan hubungi dwintyar@gmail.com");
      return;
    }

    if (!data?.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/news", { replace: true });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && !pendingApproval) {
          checkOnboarding(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !pendingApproval) checkOnboarding(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate, pendingApproval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isForgot) {
      if (!email) { toast.error("Masukkan email Anda"); return; }
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Cek email Anda untuk link reset password");
      setIsForgot(false);
      return;
    }

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    setLoading(true);

    if (isSignUp) {
      if (!fullName.trim()) {
        toast.error("Nama lengkap wajib diisi");
        setLoading(false);
        return;
      }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        // Sign out immediately and show waiting screen
        await supabase.auth.signOut();
        setPendingApproval(true);
      }
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }

      // Check approval status
      const userId = signInData.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_approved")
          .eq("id", userId)
          .single();

        if (profile?.is_approved === false) {
          await supabase.auth.signOut();
          setLoading(false);
          toast.error("Akun Anda belum disetujui oleh admin EGC.");
          setPendingApproval(true);
          return;
        }
      }
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook" | "linkedin_oidc") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/news` },
    });
    if (error) toast.error(error.message);
  };

  // Waiting screen
  if (pendingApproval) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center">
        <img src={loginBg} alt="Golf course" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="relative z-10 w-full max-w-sm px-6">
          <div className="rounded-2xl bg-card/90 backdrop-blur-lg border border-border/50 p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Menunggu Persetujuan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pendaftaran Anda sedang menunggu persetujuan admin EGC.
              Anda akan menerima notifikasi setelah disetujui.
            </p>
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-2">
              <Mail className="h-3.5 w-3.5" />
              <span>Hubungi <span className="font-medium text-foreground">dwintyar@gmail.com</span> jika ada pertanyaan</span>
            </div>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setPendingApproval(false)}
            >
              Kembali ke Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <img
        src={loginBg}
        alt="Golf course"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <div className="relative z-10 w-full max-w-sm px-6 pb-12">
        <div className="mb-8 text-center">
          <img src={logo} alt="CFGolf" className="mx-auto h-20 w-20 rounded-2xl shadow-lg mb-4 object-contain" />
          <h1 className="font-display text-3xl font-bold tracking-tight">
            CF<span className="text-primary">Golf</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isForgot
              ? "Masukkan email untuk reset password"
              : isSignUp
                ? "Create your account"
                : "Meet, Connect, Compete"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isForgot && (
            <Input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur"
          />
          {!isForgot && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur"
              minLength={6}
            />
          )}

          {!isForgot && !isSignUp && (
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsForgot(true)}
              >
                Lupa password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-semibold golf-glow"
            disabled={loading}
          >
            {loading
              ? isForgot
                ? "Mengirim…"
                : isSignUp
                  ? "Creating account…"
                  : "Signing in…"
              : isForgot
                ? "Kirim Link Reset"
                : isSignUp
                  ? "Sign Up"
                  : "Sign In"}
          </Button>
        </form>

        {!isForgot && (
          <>
            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">atau masuk dengan</span>
              <Separator className="flex-1" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSocialLogin("google")}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border/50 bg-card/80 backdrop-blur text-sm font-medium hover:border-primary/30 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button
                onClick={() => handleSocialLogin("facebook")}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border/50 bg-card/80 backdrop-blur text-sm font-medium hover:border-primary/30 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
              <button
                onClick={() => handleSocialLogin("linkedin_oidc")}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border/50 bg-card/80 backdrop-blur text-sm font-medium hover:border-primary/30 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </button>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isForgot ? (
            <button className="font-semibold text-primary" onClick={() => setIsForgot(false)}>
              Kembali ke Login
            </button>
          ) : (
            <>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                className="font-semibold text-primary"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </>
          )}
        </p>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Dengan login, Anda menyetujui{" "}
          <button
            onClick={() => navigate("/privacy-policy")}
            className="underline hover:text-foreground transition-colors"
          >
            Kebijakan Privasi
          </button>
          {" "}kami
        </p>
      </div>
    </div>
  );
};

export default Login;

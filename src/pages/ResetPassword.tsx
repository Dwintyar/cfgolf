import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import loginBg from "@/assets/golf-login-bg.jpg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check hash
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (password !== confirm) { toast.error("Password tidak cocok"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password berhasil diubah!");
    navigate("/news", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-end">
      <img src={loginBg} alt="Golf course" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="relative z-10 w-full max-w-sm px-6 pb-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Reset <span className="text-primary">Password</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready ? "Masukkan password baru Anda" : "Memverifikasi link reset…"}
          </p>
        </div>
        {ready ? (
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              type="password" placeholder="Password Baru" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur" minLength={6}
            />
            <Input
              type="password" placeholder="Konfirmasi Password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur"
            />
            <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold golf-glow" disabled={loading}>
              {loading ? "Menyimpan…" : "Simpan Password Baru"}
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Silakan gunakan link dari email Anda.</p>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <button className="font-semibold text-primary" onClick={() => navigate("/login")}>
            Kembali ke Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginBg from "@/assets/golf-login-bg.jpg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/news");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-end">
      <img
        src={loginBg}
        alt="Golf course"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <div className="relative z-10 w-full max-w-sm px-6 pb-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Cloud<span className="text-primary">Fairway</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your golf community awaits
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-border/50 bg-card/80 backdrop-blur"
          />
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-semibold golf-glow"
          >
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button className="font-semibold text-primary">Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export default Login;

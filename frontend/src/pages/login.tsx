import { useState, useEffect, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/animated-background";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      await login(username, password);
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <AnimatedBackground />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card glow-border rounded-md p-8 animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full blur-xl bg-[rgba(0,230,255,0.2)]" />
              <Shield className="relative h-12 w-12 text-primary neon-text" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight neon-text text-primary">
              Athena AI
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
              Mythos AI Security
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-md border border-[rgba(0,230,255,0.2)] bg-[rgba(0,230,255,0.03)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(0,230,255,0.5)] focus:shadow-[0_0_12px_rgba(0,230,255,0.15)] transition-all"
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-[rgba(0,230,255,0.2)] bg-[rgba(0,230,255,0.03)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(0,230,255,0.5)] focus:shadow-[0_0_12px_rgba(0,230,255,0.15)] transition-all"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p
                data-testid="text-error"
                className="text-xs text-destructive text-center"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              data-testid="button-login"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access System"
              )}
            </Button>
          </form>

          <div className="mt-6 h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,230,255,0.3)] to-transparent" />
          <p className="text-center text-[10px] text-muted-foreground mt-4 tracking-wider">
            ENCRYPTED CONNECTION ESTABLISHED
          </p>
        </div>
      </div>
    </div>
  );
}

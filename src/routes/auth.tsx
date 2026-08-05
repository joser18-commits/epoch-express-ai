import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — History Studio AI" },
      {
        name: "description",
        content: "Sign in to History Studio AI to research, script, illustrate and narrate your history videos.",
      },
      { property: "og:title", content: "Sign in — History Studio AI" },
      { property: "og:description", content: "Sign in to your private History Studio AI workspace." },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/studio", replace: true });
    });
  }, [navigate]);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/studio", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-bg flex min-h-screen items-center justify-center px-5">
      <main className="surface w-full max-w-sm rounded-xl p-6">
        <h1 className="text-2xl">History Studio AI</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Your private studio. Sign in to reach your projects.
        </p>

        {sent ? (
          <p className="mt-6 text-sm text-primary">
            Check your inbox and confirm your email address, then come back and sign in.
          </p>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              <input
                className={field}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className={field}
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="button"
              disabled={busy || !email || password.length < 6}
              onClick={submit}
              className="glow-ring mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="mt-4 w-full text-xs text-muted-foreground hover:text-primary"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}

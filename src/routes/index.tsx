import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "History Studio AI — AI history videos for Shorts & Reels" },
      {
        name: "description",
        content:
          "Research, script, illustrate and narrate accurate history videos in any language, ready for TikTok, Shorts and YouTube.",
      },
      { property: "og:title", content: "History Studio AI — AI history videos for Shorts & Reels" },
      {
        property: "og:description",
        content:
          "Research, script, illustrate and narrate accurate history videos in any language, ready for TikTok, Shorts and YouTube.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/studio", replace: true });
    });
  }, [navigate]);

  return (
    <div className="hero-bg min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 text-center">
        <h1 className="text-4xl leading-tight sm:text-5xl">
          History, dramatized into video — <span className="text-primary">in minutes</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Researched scripts, animated scene art, narration, subtitles and one-click 9:16 / 16:9 exports.
          Your projects stay private to your account.
        </p>
        <Link
          to="/auth"
          className="glow-ring mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" /> Sign in to the studio
        </Link>
      </main>
    </div>
  );
}

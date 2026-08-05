import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Film } from "lucide-react";
import {
  ACCURACY_LEVELS,
  ART_STYLES,
  ASPECT_RATIOS,
  DURATIONS,
  LANGUAGES,
  STORY_STYLES,
  VOICES,
} from "@/lib/studio-options";
import { createProjectFn, deleteProjectFn, listProjectsFn } from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/studio")({
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
        content: "Research, script, illustrate and narrate accurate history videos in any language, ready for TikTok, Shorts and YouTube.",
      },
    ],
  }),
  component: Index,
});

const field =
  "w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground";

function Index() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<string>("English");
  const [durationSeconds, setDuration] = useState(60);
  const [storyStyle, setStoryStyle] = useState<string>("Documentary");
  const [artStyle, setArtStyle] = useState<string>("Realistic");
  const [accuracyLevel, setAccuracy] = useState<string>("Student");
  const [voice, setVoice] = useState<string>("adult_male");
  const [aspectRatio, setAspect] = useState<string>("9:16");

  const projects = useQuery({ queryKey: ["projects"], queryFn: () => listProjectsFn() });

  const create = useMutation({
    mutationFn: () =>
      createProjectFn({
        data: { topic, language, durationSeconds, storyStyle, artStyle, accuracyLevel, voice, aspectRatio },
      }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/project/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProjectFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const accuracyIndex = ACCURACY_LEVELS.indexOf(accuracyLevel as (typeof ACCURACY_LEVELS)[number]);

  return (
    <div className="min-h-screen hero-bg">
      <header className="mx-auto max-w-3xl px-5 pt-12 pb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">History Studio AI</p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
          Turn any moment in history into a <em className="text-primary">finished video</em>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Researched script, scene art, narration and subtitles — in your language, in your style.
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="surface rounded-xl p-5">
          <label className={label} htmlFor="topic">
            Historical topic or question
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="e.g. Why did the Library of Alexandria really disappear?"
            className={`${field} resize-none`}
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Length</label>
              <select
                className={field}
                value={durationSeconds}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Format</label>
              <select className={field} value={aspectRatio} onChange={(e) => setAspect(e.target.value)}>
                {ASPECT_RATIOS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Language</label>
              <select className={field} value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Voice</label>
              <select className={field} value={voice} onChange={(e) => setVoice(e.target.value)}>
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className={label}>Storytelling style</label>
            <div className="flex flex-wrap gap-2">
              {STORY_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStoryStyle(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    storyStyle === s
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className={label}>Art style</label>
            <div className="flex flex-wrap gap-2">
              {ART_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setArtStyle(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    artStyle === s
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className={label}>Historical accuracy — {accuracyLevel}</label>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={accuracyIndex < 0 ? 1 : accuracyIndex}
              onChange={(e) => setAccuracy(ACCURACY_LEVELS[Number(e.target.value)]!)}
              className="w-full accent-[var(--primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
              {ACCURACY_LEVELS.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={create.isPending || topic.trim().length < 3}
            onClick={() => create.mutate()}
            className="glow-ring mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {create.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Researching & writing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate script
              </>
            )}
          </button>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-xl">Your projects</h2>
          {projects.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !projects.data?.length ? (
            <p className="text-sm text-muted-foreground">Nothing yet — your first script will appear here.</p>
          ) : (
            <ul className="space-y-2">
              {projects.data.map((p) => (
                <li key={p.id} className="surface flex items-center gap-3 rounded-lg p-3">
                  <Film className="h-4 w-4 shrink-0 text-primary" />
                  <Link
                    to="/project/$id"
                    params={{ id: p.id }}
                    className="min-w-0 flex-1 hover:text-primary"
                  >
                    <span className="block truncate text-sm">{p.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.language} · {p.story_style} · {p.art_style} · {p.aspect_ratio}
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete project"
                    onClick={() => remove.mutate(p.id)}
                    className="rounded-md p-2 text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

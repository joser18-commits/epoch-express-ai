import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Film, Loader2, Sparkles } from "lucide-react";
import { generateNextEpisodeFn, getSeriesFn, setAutoContinueFn } from "@/lib/studio.functions";
import { platformPreset } from "@/lib/studio-options";

export const Route = createFileRoute("/_authenticated/series/$id")({
  head: () => ({
    meta: [
      { title: "History series — History Studio AI" },
      {
        name: "description",
        content:
          "Connected history episodes with a shared cast, narrator, art style and timeline, ready for Shorts, Reels and TikTok.",
      },
      { property: "og:title", content: "History series — History Studio AI" },
      {
        property: "og:description",
        content: "Connected history episodes with shared characters, narrator and timeline.",
      },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["series", id], queryFn: () => getSeriesFn({ data: { id } }) });

  const next = useMutation({
    mutationFn: () => generateNextEpisodeFn({ data: { seriesId: id } }),
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["series", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/project/$id", params: { id: projectId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAuto = useMutation({
    mutationFn: (value: boolean) => setAutoContinueFn({ data: { id, value } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["series", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading series…</p>;
  if (q.error || !q.data) return <p className="p-8 text-sm text-destructive">Series not found.</p>;

  const { series, episodes } = q.data;
  const preset = platformPreset(series.platform);
  const remaining = series.episode_count - episodes.length;

  return (
    <div className="min-h-screen hero-bg">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/studio" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to studio
        </Link>

        <h1 className="mt-4 text-3xl leading-tight">{series.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{series.overview}</p>
        <p className="mt-3 text-xs uppercase tracking-wider text-primary">
          {preset.label} · {series.episode_seconds}s episodes · {episodes.length}/{series.episode_count} written
        </p>

        <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={series.auto_continue}
            onChange={(e) => toggleAuto.mutate(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Auto-continue: offer the next episode as soon as one is finished
        </label>

        <section className="surface mt-6 rounded-xl p-5">
          <h2 className="text-lg">Episodes</h2>
          <ul className="mt-3 space-y-2">
            {series.episode_plan.map((plan) => {
              const made = episodes.find((e) => e.episode_number === plan.number);
              return (
                <li key={plan.number} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm">
                        <span className="text-primary">Ep {plan.number}</span> — {made?.title ?? plan.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{made?.summary ?? plan.focus}</p>
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        Cliffhanger: {made?.cliffhanger ?? plan.cliffhanger}
                      </p>
                    </div>
                    {made ? (
                      <Link
                        to="/project/$id"
                        params={{ id: made.id }}
                        className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-primary/60 hover:text-primary"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Not written
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={next.isPending || remaining <= 0}
            onClick={() => next.mutate()}
            className="glow-ring mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {next.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Writing the next episode…
              </>
            ) : remaining > 0 ? (
              <>
                <Sparkles className="h-4 w-4" /> Generate episode {episodes.length + 1}
              </>
            ) : (
              <>
                <Film className="h-4 w-4" /> Series complete
              </>
            )}
          </button>
        </section>

        <section className="surface mt-6 rounded-xl p-5">
          <h2 className="text-lg">Continuity bible</h2>
          <p className="mt-2 text-xs text-muted-foreground">Narrator: {series.bible.narrator}</p>
          <p className="mt-1 text-xs text-muted-foreground">Visual style: {series.bible.visual_style}</p>
          {series.bible.characters?.length ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-primary">Characters</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {series.bible.characters.map((c) => (
                  <li key={c.name}>
                    <span className="text-foreground">{c.name}</span> — {c.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {series.bible.locations?.length ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-primary">Locations</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {series.bible.locations.map((l) => (
                  <li key={l.name}>
                    <span className="text-foreground">{l.name}</span> — {l.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {series.bible.timeline?.length ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-primary">Timeline</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                {series.bible.timeline.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

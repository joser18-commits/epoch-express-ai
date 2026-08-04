import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Film,
  ImageIcon,
  Languages,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { LANGUAGES } from "@/lib/studio-options";
import {
  generateSceneAudioFn,
  generateSceneImageFn,
  getProjectFn,
  translateProjectFn,
  updateSceneFn,
} from "@/lib/studio.functions";
import { buildLines, download, toSrt, toVtt } from "@/lib/subtitles";
import { downloadBlob, renderProjectVideo, type ExportFormat } from "@/lib/video-export";
import type { Scene } from "@/lib/studio-types";


export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Project — History Studio AI" },
      { name: "description", content: "Edit scenes, generate art and narration, and export your history video." },
      { property: "og:title", content: "History Studio AI project" },
      { property: "og:description", content: "Scenes, art, narration and subtitles for your history video." },
    ],
  }),
  component: ProjectPage,
});

const btn =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/60 hover:text-primary disabled:opacity-50";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50";

function ProjectPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectFn({ data: { id } }),
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [target, setTarget] = useState("Spanish");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project", id] });

  const genImage = useMutation({
    mutationFn: (sceneId: string) => generateSceneImageFn({ data: { sceneId } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const genAudio = useMutation({
    mutationFn: (sceneId: string) => generateSceneAudioFn({ data: { sceneId } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const saveScene = useMutation({
    mutationFn: (v: { sceneId: string; narration: string }) =>
      updateSceneFn({ data: { sceneId: v.sceneId, narration: v.narration } }),
    onSuccess: () => {
      toast.success("Narration saved — regenerate the voice to match.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const translate = useMutation({
    mutationFn: () => translateProjectFn({ data: { projectId: id, targetLanguage: target } }),
    onSuccess: () => toast.success(`Translated copy created in ${target}. Find it on the home screen.`),
    onError: (e: Error) => toast.error(e.message),
  });

  const scenes = data?.scenes ?? [];
  const project = data?.project;

  const runAll = async (kind: "image" | "audio") => {
    for (const s of scenes) {
      if (kind === "image" && s.image_url) continue;
      if (kind === "audio" && s.audio_url) continue;
      setBusy(`${kind}:${s.id}`);
      try {
        if (kind === "image") await genImage.mutateAsync(s.id);
        else await genAudio.mutateAsync(s.id);
      } catch {
        break;
      }
    }
    setBusy(null);
    refresh();
  };

  const sceneDuration = (s: Scene) => durations[s.id] ?? (Number(s.duration_seconds) || 5);

  // Preview playback
  useEffect(() => {
    if (!playing) {
      audioRef.current?.pause();
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const scene = scenes[activeIdx];
    if (!scene) {
      setPlaying(false);
      return;
    }
    const advance = () => {
      if (activeIdx + 1 < scenes.length) setActiveIdx(activeIdx + 1);
      else {
        setPlaying(false);
        setActiveIdx(0);
      }
    };
    if (scene.audio_url && audioRef.current) {
      const el = audioRef.current;
      el.src = scene.audio_url;
      el.onended = advance;
      void el.play().catch(() => setPlaying(false));
      return () => {
        el.onended = null;
      };
    }
    timerRef.current = setTimeout(advance, sceneDuration(scene) * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, activeIdx, scenes.length]);

  const exportSubtitles = (format: "srt" | "vtt") => {
    const lines = buildLines(scenes.map((s) => ({ narration: s.narration, duration: sceneDuration(s) })));
    const name = (project?.title ?? "history").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    download(
      `${name}.${format}`,
      format === "srt" ? toSrt(lines) : toVtt(lines),
      format === "srt" ? "application/x-subrip" : "text/vtt",
    );
  };

  const exportScript = () => {
    if (!project) return;
    const body = [
      project.title,
      `Topic: ${project.topic}`,
      `Language: ${project.language} · Style: ${project.story_style} · Art: ${project.art_style} · Accuracy: ${project.accuracy_level}`,
      "",
      ...scenes.map(
        (s) =>
          `SCENE ${s.idx + 1} [${s.is_dramatized ? "DRAMATIZED" : "DOCUMENTED"}] (${sceneDuration(s).toFixed(1)}s)\n${s.narration}\nVisual: ${s.visual_prompt}${s.source_note ? `\nSource: ${s.source_note}` : ""}`,
      ),
      "",
      "SOURCES",
      ...(project.sources ?? []).map((x) => `- ${x.title}: ${x.note}`),
    ].join("\n\n");
    download(`${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`, body, "text/plain");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">This project could not be loaded.</p>
        <Link to="/" className={btn}>
          Back to studio
        </Link>
      </div>
    );
  }

  const vertical = project.aspect_ratio === "9:16";
  const active = scenes[activeIdx];

  return (
    <div className="min-h-screen hero-bg pb-24">
      <header className="mx-auto max-w-3xl px-5 pt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>
        <h1 className="mt-3 text-3xl leading-tight">{project.title}</h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {project.language} · {project.story_style} · {project.art_style} · {project.accuracy_level} ·{" "}
          {project.aspect_ratio}
        </p>
        {project.summary ? <p className="mt-3 text-sm text-muted-foreground">{project.summary}</p> : null}
      </header>

      <main className="mx-auto max-w-3xl px-5">
        {/* Preview */}
        <section className="surface mt-6 rounded-xl p-4">
          <div className="mx-auto w-full max-w-sm">
            <div
              className={`relative overflow-hidden rounded-lg bg-secondary ${vertical ? "aspect-[9/16]" : "aspect-video"}`}
            >
              {active?.image_url ? (
                <img
                  src={active.image_url}
                  alt={`Scene ${activeIdx + 1}: ${active.visual_prompt.slice(0, 90)}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Generate scene art to preview
                </div>
              )}
              {active ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
                  <p className="text-center text-sm font-medium leading-snug text-white drop-shadow">
                    {active.narration}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" className={btnPrimary} onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pause" : "Play preview"}
            </button>
            <span className="text-xs text-muted-foreground">
              Scene {activeIdx + 1} / {scenes.length}
            </span>
          </div>
          <audio ref={audioRef} className="hidden" />
        </section>

        {/* Actions */}
        <section className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={!!busy} onClick={() => runAll("image")}>
            {busy?.startsWith("image") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            Generate all art
          </button>
          <button type="button" className={btn} disabled={!!busy} onClick={() => runAll("audio")}>
            {busy?.startsWith("audio") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            Generate all narration
          </button>
          <button type="button" className={btn} onClick={() => exportSubtitles("srt")}>
            <Download className="h-3.5 w-3.5" /> .srt
          </button>
          <button type="button" className={btn} onClick={() => exportSubtitles("vtt")}>
            <Download className="h-3.5 w-3.5" /> .vtt
          </button>
          <button type="button" className={btn} onClick={exportScript}>
            <Download className="h-3.5 w-3.5" /> Script
          </button>
        </section>

        <section className="surface mt-4 flex flex-wrap items-center gap-2 rounded-lg p-3">
          <Languages className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Translate this project into</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-md border border-border bg-input/40 px-2 py-1.5 text-xs"
          >
            {LANGUAGES.filter((l) => l !== project.language).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btnPrimary}
            disabled={translate.isPending}
            onClick={() => translate.mutate()}
          >
            {translate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Translate
          </button>
        </section>

        {/* Scenes */}
        <section className="mt-8 space-y-4">
          <h2 className="text-xl">Scenes</h2>
          {scenes.map((s) => (
            <SceneCard
              key={s.id}
              scene={s}
              vertical={vertical}
              busy={busy}
              onSelect={() => {
                setPlaying(false);
                setActiveIdx(s.idx);
              }}
              onDuration={(d) => setDurations((prev) => ({ ...prev, [s.id]: d }))}
              onImage={async () => {
                setBusy(`image:${s.id}`);
                await genImage.mutateAsync(s.id).catch(() => null);
                setBusy(null);
                refresh();
              }}
              onAudio={async () => {
                setBusy(`audio:${s.id}`);
                await genAudio.mutateAsync(s.id).catch(() => null);
                setBusy(null);
                refresh();
              }}
              onSave={(text) => saveScene.mutate({ sceneId: s.id, narration: text })}
            />
          ))}
        </section>

        {project.sources?.length ? (
          <section className="mt-10">
            <h2 className="text-xl">Sources</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {project.sources.map((src, i) => (
                <li key={i}>
                  <span className="text-foreground">{src.title}</span> — {src.note}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function SceneCard({
  scene,
  vertical,
  busy,
  onSelect,
  onImage,
  onAudio,
  onSave,
  onDuration,
}: {
  scene: Scene;
  vertical: boolean;
  busy: string | null;
  onSelect: () => void;
  onImage: () => void;
  onAudio: () => void;
  onSave: (text: string) => void;
  onDuration: (d: number) => void;
}) {
  const [text, setText] = useState(scene.narration);
  useEffect(() => setText(scene.narration), [scene.narration]);
  const dirty = text.trim() !== scene.narration.trim();

  return (
    <article className="surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onSelect} className="text-xs uppercase tracking-wider text-primary">
          Scene {scene.idx + 1}
        </button>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            scene.is_dramatized
              ? "bg-accent/20 text-accent"
              : "bg-primary/15 text-primary"
          }`}
        >
          {scene.is_dramatized ? "Dramatized" : "Documented"}
        </span>
      </div>

      <div className="mt-3 flex gap-3">
        <div
          className={`shrink-0 overflow-hidden rounded-md bg-secondary ${vertical ? "aspect-[9/16] w-24" : "aspect-video w-36"}`}
        >
          {scene.image_url ? (
            <img
              src={scene.image_url}
              alt={`Scene ${scene.idx + 1} artwork`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
              No art
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {scene.source_note ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Source: {scene.source_note}</p>
          ) : null}
        </div>
      </div>

      {scene.audio_url ? (
        <audio
          controls
          src={scene.audio_url}
          className="mt-3 w-full"
          onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={!!busy} onClick={onImage}>
          {busy === `image:${scene.id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {scene.image_url ? "Redo art" : "Generate art"}
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={onAudio}>
          {busy === `audio:${scene.id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {scene.audio_url ? "Redo voice" : "Generate voice"}
        </button>
        {scene.image_url ? (
          <a className={btn} href={scene.image_url} download={`scene-${scene.idx + 1}.png`}>
            <Download className="h-3.5 w-3.5" /> Image
          </a>
        ) : null}
        {scene.audio_url ? (
          <a className={btn} href={scene.audio_url} download={`scene-${scene.idx + 1}.mp3`}>
            <Download className="h-3.5 w-3.5" /> Audio
          </a>
        ) : null}
        {dirty ? (
          <button type="button" className={btnPrimary} onClick={() => onSave(text)}>
            Save narration
          </button>
        ) : null}
      </div>
    </article>
  );
}

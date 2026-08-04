// Client-side one-click video renderer: animates scene art (Ken Burns + cross-fades),
// mixes narration, burns in subtitles, and records a WebM file.

export type ExportScene = {
  idx: number;
  narration: string;
  on_screen_text: string | null;
  duration_seconds: number;
  image_url: string | null;
  audio_url: string | null;
};

export type ExportFormat = "9:16" | "16:9";

type Prepared = {
  image: HTMLImageElement | null;
  audio: AudioBuffer | null;
  duration: number;
  narration: string;
  label: string | null;
};

const SIZES: Record<ExportFormat, { w: number; h: number }> = {
  "9:16": { w: 720, h: 1280 },
  "16:9": { w: 1280, h: 720 },
};

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadAudio(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function pickMime(): string {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of options) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "video/webm";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(-6);
}

/** Draws one animated frame: slow zoom/pan on the still, vignette, caption. */
function drawScene(
  ctx: CanvasRenderingContext2D,
  s: Prepared,
  t: number, // 0..1 progress within the scene
  w: number,
  h: number,
  alpha: number,
  seed: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (s.image) {
    const zoom = 1.08 + 0.12 * t;
    const dirX = seed % 2 === 0 ? 1 : -1;
    const dirY = seed % 3 === 0 ? 1 : -1;
    const iw = s.image.width;
    const ih = s.image.height;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2 + dirX * (dw - w) * 0.18 * (t - 0.5);
    const dy = (h - dh) / 2 + dirY * (dh - h) * 0.18 * (t - 0.5);
    ctx.drawImage(s.image, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#12100d";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, s: Prepared, w: number, h: number) {
  // Bottom gradient scrim
  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  const fontSize = Math.round(w * 0.045);
  ctx.font = `600 ${fontSize}px "Work Sans", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const lines = wrap(ctx, s.narration, w * 0.86);
  const lh = fontSize * 1.32;
  let y = h - Math.round(h * 0.06);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    ctx.lineWidth = Math.max(3, fontSize * 0.16);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(line, w / 2, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, w / 2, y);
    y -= lh;
  }

  if (s.label) {
    const ts = Math.round(w * 0.035);
    ctx.font = `500 ${ts}px "Instrument Serif", Georgia, serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(226,184,102,0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = Math.max(2, ts * 0.14);
    ctx.strokeText(s.label, w / 2, h * 0.06);
    ctx.fillText(s.label, w / 2, h * 0.06);
  }
}

export async function renderProjectVideo(opts: {
  scenes: ExportScene[];
  format: ExportFormat;
  onProgress?: (fraction: number, note: string) => void;
}): Promise<Blob> {
  const { scenes, format } = opts;
  const progress = opts.onProgress ?? (() => {});
  const { w, h } = SIZES[format];

  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtor();
  await audioCtx.resume();

  progress(0, "Loading scene assets…");
  const prepared: Prepared[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]!;
    const image = s.image_url ? await loadImage(s.image_url) : null;
    const audio = s.audio_url ? await loadAudio(audioCtx, s.audio_url) : null;
    prepared.push({
      image,
      audio,
      duration: audio ? audio.duration + 0.35 : Math.max(2, Number(s.duration_seconds) || 5),
      narration: s.narration,
      label: s.on_screen_text,
    });
    progress(((i + 1) / scenes.length) * 0.25, `Loading assets ${i + 1}/${scenes.length}`);
  }

  const total = prepared.reduce((a, s) => a + s.duration, 0);
  if (total <= 0) throw new Error("Nothing to render yet — generate scene art first.");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  const stream = canvas.captureStream(30);
  const dest = audioCtx.createMediaStreamDestination();
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 5_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  // Schedule narration on the shared timeline.
  const startAt = audioCtx.currentTime + 0.25;
  let offset = 0;
  for (const s of prepared) {
    if (s.audio) {
      const src = audioCtx.createBufferSource();
      src.buffer = s.audio;
      const gain = audioCtx.createGain();
      gain.gain.value = 1;
      src.connect(gain).connect(dest);
      src.start(startAt + offset);
    }
    offset += s.duration;
  }

  recorder.start(1000);
  const t0 = performance.now() + 250;
  const FADE = 0.45;

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000;
      if (elapsed >= total) {
        resolve();
        return;
      }
      let acc = 0;
      let index = 0;
      for (let i = 0; i < prepared.length; i++) {
        if (elapsed < acc + prepared[i]!.duration) {
          index = i;
          break;
        }
        acc += prepared[i]!.duration;
        index = i;
      }
      const cur = prepared[index]!;
      const local = Math.max(0, Math.min(1, (elapsed - acc) / cur.duration));

      ctx.fillStyle = "#0b0a09";
      ctx.fillRect(0, 0, w, h);
      drawScene(ctx, cur, local, w, h, 1, index);

      // Cross-fade into the next scene.
      const remain = cur.duration - (elapsed - acc);
      const next = prepared[index + 1];
      if (next && remain < FADE) {
        drawScene(ctx, next, 0, w, h, 1 - remain / FADE, index + 1);
      }
      drawOverlay(ctx, cur, w, h);

      progress(0.25 + 0.75 * (elapsed / total), `Rendering ${Math.round((elapsed / total) * 100)}%`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  const blob = await done;
  await audioCtx.close();
  progress(1, "Done");
  return blob;
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export type SubtitleLine = { text: string; start: number; end: number };

function stamp(t: number, sep: string): string {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const f = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s}${sep}${f}`;
}

/** Splits long narration into readable caption chunks spread over the scene duration. */
export function chunkScene(text: string, start: number, duration: number, maxChars = 78): SubtitleLine[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks: string[] = [];
  let current = "";
  for (const w of words) {
    if (current && (current + " " + w).length > maxChars) {
      chunks.push(current);
      current = w;
    } else {
      current = current ? `${current} ${w}` : w;
    }
  }
  if (current) chunks.push(current);

  const totalWords = words.length;
  let cursor = start;
  return chunks.map((c) => {
    const share = (c.split(/\s+/).length / totalWords) * duration;
    const line = { text: c, start: cursor, end: cursor + share };
    cursor += share;
    return line;
  });
}

export function buildLines(scenes: { narration: string; duration: number }[]): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  let t = 0;
  for (const s of scenes) {
    lines.push(...chunkScene(s.narration, t, s.duration));
    t += s.duration;
  }
  return lines;
}

export function toSrt(lines: SubtitleLine[]): string {
  return lines
    .map((l, i) => `${i + 1}\n${stamp(l.start, ",")} --> ${stamp(l.end, ",")}\n${l.text}\n`)
    .join("\n");
}

export function toVtt(lines: SubtitleLine[]): string {
  return (
    "WEBVTT\n\n" +
    lines.map((l) => `${stamp(l.start, ".")} --> ${stamp(l.end, ".")}\n${l.text}\n`).join("\n")
  );
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

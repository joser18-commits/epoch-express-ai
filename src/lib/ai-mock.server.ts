// Server-only mock generators used in development so no AI credits are spent.
import { deflateSync } from "node:zlib";

/** True when AI calls should be faked instead of hitting the gateway. */
export function isMockAi(): boolean {
  const flag = process.env["AI_MOCK"];
  if (flag) return flag.toLowerCase() !== "false";
  return process.env["NODE_ENV"] !== "production";
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const out = new Uint8Array(body.length + 8);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(out.length - 4, crc32(body));
  return out;
}

/** Deterministic placeholder PNG (soft gradient) so the studio has visible art in dev. */
export function mockImageBytes(prompt: string, width = 720, height = 1280): Uint8Array {
  let seed = 0;
  for (const ch of prompt) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const hueShift = seed % 255;

  const raw = new Uint8Array((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const fx = x / width;
      const fy = y / height;
      raw[p++] = Math.round(30 + 120 * fy + (hueShift % 60));
      raw[p++] = Math.round(20 + 90 * fx);
      raw[p++] = Math.round(60 + 140 * (1 - fy));
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(Buffer.from(raw)))),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, part) => n + part.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

/** Quiet placeholder narration track (WAV) matching roughly the spoken length. */
export function mockSpeechWav(text: string): Uint8Array {
  const seconds = Math.min(60, Math.max(2, text.split(/\s+/).length / 2.6));
  const sampleRate = 16000;
  const frames = Math.round(seconds * sampleRate);
  const bytes = new Uint8Array(44 + frames * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + frames * 2, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, frames * 2, true);
  for (let i = 0; i < frames; i++) {
    // very quiet hum so playback/duration behave like a real track
    const v = Math.round(Math.sin((i / sampleRate) * 2 * Math.PI * 110) * 300);
    view.setInt16(44 + i * 2, v, true);
  }
  return bytes;
}

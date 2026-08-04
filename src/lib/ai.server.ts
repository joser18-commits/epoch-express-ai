// Server-only helpers for Lovable AI Gateway calls.
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project.");
  return key;
}

async function gatewayFetch(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached. Please wait a moment and retry.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep generating.");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res;
}

export async function chatJson<T>(system: string, user: string): Promise<T> {
  const res = await gatewayFetch("/chat/completions", {
    model: "google/gemini-3.6-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("The AI returned an unreadable response. Try again.");
  }
}

/** Returns raw PNG/JPEG bytes for a generated image. */
export async function generateImageBytes(prompt: string): Promise<Uint8Array> {
  const res = await gatewayFetch("/chat/completions", {
    model: "google/gemini-2.5-flash-image",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  });
  const data = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("The image model returned no image. Try again.");
  const base64 = url.includes(",") ? url.split(",")[1]! : url;
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

const VOICE_MAP: Record<string, { voice: string; instructions: string }> = {
  adult_male: { voice: "onyx", instructions: "A warm, grounded adult male narrator in his late 30s." },
  adult_female: { voice: "nova", instructions: "A clear, confident adult female narrator in her 30s." },
  young_man: { voice: "echo", instructions: "A bright, energetic young man in his early 20s." },
  young_woman: { voice: "shimmer", instructions: "A light, expressive young woman in her early 20s." },
  child: { voice: "coral", instructions: "A cheerful, curious child telling a story with wonder." },
  elderly_storyteller: {
    voice: "ash",
    instructions: "An elderly storyteller: slow, weathered, wise, with long thoughtful pauses.",
  },
};

/** Returns MP3 bytes of narration. */
export async function generateSpeechBytes(
  text: string,
  voiceId: string,
  style: string,
  language: string,
): Promise<Uint8Array> {
  const v = VOICE_MAP[voiceId] ?? VOICE_MAP["adult_male"]!;
  const res = await gatewayFetch("/audio/speech", {
    model: "openai/gpt-4o-mini-tts",
    input: text,
    voice: v.voice,
    response_format: "mp3",
    instructions: `${v.instructions} Narrate in ${language} with natural native pronunciation. Delivery style: ${style}.`,
  });
  return new Uint8Array(await res.arrayBuffer());
}

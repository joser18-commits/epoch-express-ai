// Server-only implementation of Series mode: connected episodes with shared continuity.
import { chatJson } from "./ai.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sceneCountFor, platformPreset } from "./studio-options";
import { ACCURACY_GUIDE } from "./studio.server";
import type { EpisodePlanItem, Series, SeriesBible, SeriesWithEpisodes } from "./studio-types";

type SeriesRow = {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  language: string;
  platform: string;
  episode_seconds: number;
  episode_count: number;
  story_style: string;
  art_style: string;
  accuracy_level: string;
  voice: string;
  aspect_ratio: string;
  overview: string | null;
  bible: SeriesBible;
  episode_plan: EpisodePlanItem[];
  auto_continue: boolean;
  created_at: string;
};

type SeriesPlan = {
  title: string;
  overview: string;
  bible: SeriesBible;
  episodes: EpisodePlanItem[];
};

type EpisodeScript = {
  title: string;
  hook: string;
  summary: string;
  recap: string;
  cliffhanger: string;
  sources: { title: string; note: string }[];
  scenes: {
    narration: string;
    visual_prompt: string;
    on_screen_text?: string;
    is_dramatized?: boolean;
    source_note?: string;
  }[];
};

function mockPlan(topic: string, count: number): SeriesPlan {
  return {
    title: `[Dev mock] ${topic.slice(0, 50)} — the series`,
    overview: "Development placeholder series plan. No AI credits were used.",
    bible: {
      narrator: "Steady, warm narrator with a conspiratorial edge.",
      visual_style: "Consistent cinematic staging, warm amber key light, muted period palette.",
      characters: [
        { name: "The Chronicler", description: "Middle-aged scribe, grey wool tunic, ink-stained hands." },
      ],
      locations: [{ name: "The great hall", description: "Stone hall lit by torches, long oak table." }],
      timeline: [`Episode 1 of the mock timeline for ${topic}.`],
      recurring_motifs: ["A single guttering candle marks each time jump."],
    },
    episodes: Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      title: `Mock episode ${i + 1}`,
      focus: `Placeholder focus for part ${i + 1} of ${topic}.`,
      cliffhanger: `Placeholder cliffhanger leading into episode ${i + 2}.`,
    })),
  };
}

function mockEpisode(series: SeriesRow, ep: EpisodePlanItem, count: number): EpisodeScript {
  return {
    title: `[Dev mock] ${ep.title}`,
    hook: `Mock hook for episode ${ep.number}.`,
    summary: ep.focus,
    recap: ep.number > 1 ? `Previously: mock recap of episode ${ep.number - 1}.` : "",
    cliffhanger: ep.cliffhanger,
    sources: [{ title: "Mock source", note: "Placeholder reference used in development mode." }],
    scenes: Array.from({ length: count }, (_, i) => ({
      narration: `Episode ${ep.number}, scene ${i + 1}: placeholder narration about ${series.topic}, long enough to test timing and subtitles.`,
      visual_prompt: `Placeholder episode ${ep.number} scene ${i + 1} illustrating ${series.topic}, period-accurate setting.`,
      on_screen_text: `Part ${ep.number}`,
      is_dramatized: i % 2 === 1,
      source_note: "Mock source note",
    })),
  };
}

function bibleText(bible: SeriesBible): string {
  const chars = (bible.characters ?? [])
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");
  const locs = (bible.locations ?? []).map((l) => `- ${l.name}: ${l.description}`).join("\n");
  return `NARRATOR: ${bible.narrator ?? ""}
VISUAL STYLE (must stay identical every episode): ${bible.visual_style ?? ""}
RECURRING CHARACTERS (identical appearance & clothing every episode):
${chars || "- none"}
RECURRING LOCATIONS:
${locs || "- none"}
HISTORICAL TIMELINE ORDER:
${(bible.timeline ?? []).map((t, i) => `${i + 1}. ${t}`).join("\n") || "n/a"}
RECURRING MOTIFS: ${(bible.recurring_motifs ?? []).join("; ")}`;
}

async function ownedSeries(id: string, userId: string): Promise<SeriesRow> {
  const { data, error } = await supabaseAdmin
    .from("series")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Series not found.");
  return data as unknown as SeriesRow;
}

export async function createSeries(input: {
  topic: string;
  language: string;
  platform: string;
  episodeCount: number;
  storyStyle: string;
  artStyle: string;
  accuracyLevel: string;
  voice: string;
  autoContinue: boolean;
  userId: string;
}): Promise<{ seriesId: string; projectId: string }> {
  const preset = platformPreset(input.platform);
  const count = Math.min(12, Math.max(2, input.episodeCount));

  const plan = await chatJson<SeriesPlan>(
    `You are a history series showrunner and researcher. You plan multi-episode short-form history series that stay
factually grounded in mainstream scholarship, and you keep characters, narrator, visuals, clothing, locations and the
historical timeline perfectly consistent across episodes. Respond with JSON only.`,
    `Plan a ${count}-episode history series about: "${input.topic}".

Target platform: ${preset.label}. Pacing: ${preset.pacing}
Each episode is about ${preset.episodeSeconds} seconds long.
Language of all viewer-facing text: ${input.language}. Storytelling style: ${input.storyStyle}.
Accuracy level: ${input.accuracyLevel}. ${ACCURACY_GUIDE[input.accuracyLevel] ?? ""}

Episodes must run in true historical/chronological order and each must end on a natural cliffhanger that makes the
viewer want the next episode. The "bible" fields must be written in ENGLISH (they feed image prompts) and describe
characters precisely enough (face, age, hair, clothing, colours) that every episode renders them identically.

Return JSON exactly as:
{"title":string,"overview":string,
"bible":{"narrator":string,"visual_style":string,
"characters":[{"name":string,"description":string}],
"locations":[{"name":string,"description":string}],
"timeline":[string],"recurring_motifs":[string]},
"episodes":[{"number":number,"title":string,"focus":string,"cliffhanger":string}]}`,
    () => mockPlan(input.topic, count),
  );

  const episodes = (plan.episodes ?? []).slice(0, count).map((e, i) => ({ ...e, number: i + 1 }));
  if (!episodes.length) throw new Error("The AI did not return an episode plan. Try again.");

  const { data: series, error } = await supabaseAdmin
    .from("series")
    .insert({
      user_id: input.userId,
      title: plan.title || input.topic.slice(0, 80),
      topic: input.topic,
      language: input.language,
      platform: input.platform,
      episode_seconds: preset.episodeSeconds,
      episode_count: episodes.length,
      story_style: input.storyStyle,
      art_style: input.artStyle,
      accuracy_level: input.accuracyLevel,
      voice: input.voice,
      aspect_ratio: preset.aspectRatio,
      overview: plan.overview ?? null,
      bible: (plan.bible ?? {}) as never,
      episode_plan: episodes as never,
      auto_continue: input.autoContinue,
    })
    .select("*")
    .single();
  if (error || !series) throw new Error(error?.message ?? "Could not save the series.");

  const projectId = await writeEpisode(series as unknown as SeriesRow, 1);
  return { seriesId: series.id, projectId };
}

/** Generates the script + project row for one episode, using the series bible and prior episodes as context. */
async function writeEpisode(series: SeriesRow, number: number): Promise<string> {
  const preset = platformPreset(series.platform);
  const plan = series.episode_plan ?? [];
  const ep: EpisodePlanItem =
    plan.find((p) => p.number === number) ??
    ({
      number,
      title: `Episode ${number}`,
      focus: `Continue the story of ${series.topic} where the previous episode stopped.`,
      cliffhanger: "End on an unresolved question.",
    } as EpisodePlanItem);

  const sceneCount = sceneCountFor(series.episode_seconds);
  const perScene = Math.round((series.episode_seconds / sceneCount) * 10) / 10;

  const { data: prior } = await supabaseAdmin
    .from("projects")
    .select("episode_number, title, summary, cliffhanger")
    .eq("series_id", series.id)
    .order("episode_number", { ascending: true });
  const priorText =
    (prior ?? [])
      .map((p) => `Ep ${p.episode_number}: ${p.title} — ${p.summary ?? ""} Cliffhanger: ${p.cliffhanger ?? ""}`)
      .join("\n") || "none yet";

  const shortsRule = preset.shorts
    ? `This is a short-form episode: total spoken length MUST land between 45 and 60 seconds. Scene 1 is a hook that
lands in the first 2 seconds. The final scene is a cliffhanger that makes the viewer open the next episode.`
    : `This is a long-form episode: open with a cold open, develop the story in clear beats, and end on a hook into the
next episode.`;

  const script = await chatJson<EpisodeScript>(
    `You are a rigorous history researcher and serial short-form scriptwriter. You only state facts supported by
mainstream scholarship, and you mark any invented dialogue, interiority or sensory reconstruction as dramatized.
You keep the series continuity bible exact: same narrator persona, same character appearances and clothing, same
locations, same visual style, same chronological timeline. Respond with JSON only.`,
    `SERIES: "${series.title}" — ${series.overview ?? ""}
TOPIC: ${series.topic}
CONTINUITY BIBLE:
${bibleText(series.bible ?? {})}

PREVIOUS EPISODES:
${priorText}

NOW WRITE EPISODE ${number}: "${ep.title}"
Focus: ${ep.focus}
Planned cliffhanger: ${ep.cliffhanger}

Requirements:
- Language of narration and on-screen text: ${series.language} (natural and native-sounding).
- Storytelling style: ${series.story_style}. Platform: ${preset.label}. Pacing: ${preset.pacing}
- Accuracy level: ${series.accuracy_level}. ${ACCURACY_GUIDE[series.accuracy_level] ?? ""}
- ${shortsRule}
- Exactly ${sceneCount} scenes, each roughly ${perScene} seconds (~${Math.max(8, Math.round(perScene * 2.6))} words).
- recap: one short sentence catching up returning viewers (empty string for episode 1).
- cliffhanger: one sentence teasing the next episode, also spoken in the final scene.
- visual_prompt must be in ENGLISH and must reuse the bible's exact character/clothing/location wording so art matches
  across episodes: subject, period-accurate clothing, setting, lighting, camera framing.
- is_dramatized = true when the scene invents dialogue, interiority or speculative reconstruction.
- sources: 3-6 reliable references with a one-line note each.

Return JSON exactly as:
{"title":string,"hook":string,"summary":string,"recap":string,"cliffhanger":string,
"sources":[{"title":string,"note":string}],
"scenes":[{"narration":string,"visual_prompt":string,"on_screen_text":string,"is_dramatized":boolean,"source_note":string}]}`,
    () => mockEpisode(series, ep, sceneCount),
  );

  if (!script?.scenes?.length) throw new Error("The AI did not return any scenes. Try again.");

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .insert({
      title: script.title || `${series.title} — Episode ${number}`,
      topic: series.topic,
      language: series.language,
      duration_seconds: series.episode_seconds,
      story_style: series.story_style,
      art_style: series.art_style,
      accuracy_level: series.accuracy_level,
      voice: series.voice,
      aspect_ratio: series.aspect_ratio,
      hook: script.hook ?? null,
      summary: script.summary ?? null,
      sources: (script.sources ?? []) as never,
      status: "scripted",
      user_id: series.user_id,
      series_id: series.id,
      episode_number: number,
      platform: series.platform,
      cliffhanger: script.cliffhanger ?? null,
      recap: script.recap ?? null,
    })
    .select("id")
    .single();
  if (error || !project) throw new Error(error?.message ?? "Could not save the episode.");

  const rows = script.scenes.map((s, i) => ({
    project_id: project.id,
    idx: i,
    narration: s.narration ?? "",
    visual_prompt: s.visual_prompt ?? "",
    on_screen_text: s.on_screen_text ?? null,
    is_dramatized: Boolean(s.is_dramatized),
    source_note: s.source_note ?? null,
    duration_seconds: perScene,
  }));
  const { error: sceneError } = await supabaseAdmin.from("scenes").insert(rows);
  if (sceneError) throw new Error(sceneError.message);

  return project.id;
}

/** Generates the next episode of a series, preserving continuity. Returns the new project id. */
export async function generateNextEpisode(
  seriesId: string,
  userId: string,
): Promise<{ projectId: string; number: number }> {
  const series = await ownedSeries(seriesId, userId);
  const { data: existing } = await supabaseAdmin
    .from("projects")
    .select("episode_number")
    .eq("series_id", seriesId)
    .order("episode_number", { ascending: false })
    .limit(1);
  const last = existing?.[0]?.episode_number ?? 0;
  const next = last + 1;
  if (next > series.episode_count) throw new Error("This series is complete — every planned episode exists.");
  const projectId = await writeEpisode(series, next);
  return { projectId, number: next };
}

export async function listSeries(userId: string): Promise<Series[]> {
  const { data, error } = await supabaseAdmin
    .from("series")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Series[];
}

export async function getSeries(id: string, userId: string): Promise<SeriesWithEpisodes> {
  const series = await ownedSeries(id, userId);
  const { data: episodes } = await supabaseAdmin
    .from("projects")
    .select("id, title, episode_number, status, cliffhanger, summary")
    .eq("series_id", id)
    .order("episode_number", { ascending: true });
  return {
    series: series as unknown as Series,
    episodes: (episodes ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      episode_number: e.episode_number ?? 0,
      status: e.status,
      cliffhanger: e.cliffhanger,
      summary: e.summary,
    })),
  };
}

export async function deleteSeries(id: string, userId: string): Promise<void> {
  await ownedSeries(id, userId);
  const { error } = await supabaseAdmin.from("series").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function setAutoContinue(id: string, userId: string, value: boolean): Promise<void> {
  await ownedSeries(id, userId);
  const { error } = await supabaseAdmin.from("series").update({ auto_continue: value }).eq("id", id);
  if (error) throw new Error(error.message);
}

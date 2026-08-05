// Server-only implementation for History Studio AI.
import { chatJson, generateImageBytes, generateSpeechBytes } from "./ai.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sceneCountFor } from "./studio-options";
import type { Project, ProjectWithScenes, Scene } from "./studio-types";

const SIGNED_TTL = 60 * 60 * 24 * 365;

async function signPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabaseAdmin.storage.from("media").createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

async function upload(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from("media")
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

const ACCURACY_GUIDE: Record<string, string> = {
  Beginner: "Simple language, no jargon, focus on the memorable story. Assume no prior knowledge.",
  Student: "Clear explanations with key names, dates and cause-and-effect. High-school level.",
  College: "Nuanced, includes historiographical context, competing interpretations and specifics.",
  Historian: "Rigorous and precise: exact dates, primary-source framing, scholarly caveats and debates.",
};

type ScriptResult = {
  title: string;
  hook: string;
  summary: string;
  sources: { title: string; note: string }[];
  scenes: {
    narration: string;
    visual_prompt: string;
    on_screen_text?: string;
    is_dramatized?: boolean;
    source_note?: string;
  }[];
};

export async function createProject(input: {
  topic: string;
  language: string;
  durationSeconds: number;
  storyStyle: string;
  artStyle: string;
  accuracyLevel: string;
  voice: string;
  aspectRatio: string;
  userId: string;
}): Promise<string> {
  const count = sceneCountFor(input.durationSeconds);
  const perScene = Math.round((input.durationSeconds / count) * 10) / 10;

  const system = `You are a rigorous history researcher and short-form video scriptwriter.
You only state facts supported by mainstream historical scholarship. When you invent dialogue, inner thoughts,
or sensory detail for drama, you MUST mark that scene as dramatized. Never present speculation as documented fact.
Respond with JSON only.`;

  const user = `Write a ${input.durationSeconds}-second history video script about: "${input.topic}".

Requirements:
- Language of ALL narration and on-screen text: ${input.language} (natural, native-sounding, not translated-sounding).
- Storytelling style: ${input.storyStyle}.
- Historical accuracy level: ${input.accuracyLevel}. ${ACCURACY_GUIDE[input.accuracyLevel] ?? ""}
- Exactly ${count} scenes, each roughly ${perScene} seconds of spoken narration (~${Math.max(8, Math.round(perScene * 2.6))} words).
- Scene 1 must be a scroll-stopping hook.
- visual_prompt must be in ENGLISH, describing one vivid still image: subject, period-accurate clothing/architecture,
  setting, lighting, camera framing. Keep recurring characters described identically across scenes for consistency.
- is_dramatized = true when the scene contains invented dialogue, imagined interiority or speculative reconstruction.
- source_note: short pointer to the kind of evidence (e.g. "Tacitus, Annals XV" or "archaeological record at Pompeii").
- sources: 3-6 reliable references (books, primary sources, museums) with a one-line note each.

Return JSON exactly as:
{"title":string,"hook":string,"summary":string,"sources":[{"title":string,"note":string}],
"scenes":[{"narration":string,"visual_prompt":string,"on_screen_text":string,"is_dramatized":boolean,"source_note":string}]}`;

  const result = await chatJson<ScriptResult>(system, user);
  if (!result?.scenes?.length) throw new Error("The AI did not return any scenes. Try again.");

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .insert({
      title: result.title || input.topic.slice(0, 80),
      topic: input.topic,
      language: input.language,
      duration_seconds: input.durationSeconds,
      story_style: input.storyStyle,
      art_style: input.artStyle,
      accuracy_level: input.accuracyLevel,
      voice: input.voice,
      aspect_ratio: input.aspectRatio,
      hook: result.hook ?? null,
      summary: result.summary ?? null,
      sources: result.sources ?? [],
      status: "scripted",
      user_id: input.userId,
    })
    .select("id")
    .single();
  if (error || !project) throw new Error(error?.message ?? "Could not save the project.");

  const rows = result.scenes.map((s, i) => ({
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

export async function listProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Project[];
}

/** Loads a project only when it belongs to the caller. Throws otherwise. */
async function ownedProject(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Project not found.");
  return data;
}

/** Loads a scene plus its project only when the project belongs to the caller. */
async function ownedScene(sceneId: string, userId: string) {
  const { data: scene, error } = await supabaseAdmin
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!scene) throw new Error("Scene not found.");
  const project = await ownedProject(scene.project_id, userId);
  return { scene, project };
}

export async function getProject(id: string, userId: string): Promise<ProjectWithScenes> {
  const project = await ownedProject(id, userId);
  const { data: scenes } = await supabaseAdmin
    .from("scenes")
    .select("*")
    .eq("project_id", id)
    .order("idx", { ascending: true });

  const signed = await Promise.all(
    ((scenes ?? []) as unknown as Scene[]).map(async (s) => ({
      ...s,
      image_url: await signPath(s.image_url),
      audio_url: await signPath(s.audio_url),
    })),
  );
  return { project: project as unknown as Project, scenes: signed };
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  await ownedProject(id, userId);
  const { error } = await supabaseAdmin.from("projects").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

const ART_PROMPT: Record<string, string> = {
  "Animated Cartoon":
    "frame from a modern animated feature film, bold clean outlines, flat cel-shaded colour, exaggerated expressive character acting, dynamic action pose mid-motion, cinematic staging",
  "Storybook Cartoon":
    "charming hand-drawn storybook cartoon illustration, warm gouache textures, rounded friendly characters, playful staging",
  Anime: "modern anime key visual, cel shading, expressive linework, dramatic lighting",
  "Pixar-like": "stylized 3D animated film still, soft global illumination, appealing character design",
  Realistic: "photorealistic cinematic still, 50mm lens, natural light, fine detail",
  "Comic Book": "graphic novel panel, bold inks, halftone shading, high contrast",
  Watercolor: "loose watercolor illustration, soft washes, paper texture, muted palette",
  "3D": "high-end 3D render, volumetric light, physically based materials",
  "Medieval Painting": "illuminated manuscript / medieval panel painting, gold leaf, flattened perspective",
  Manga: "black and white manga panel, screentone, dynamic ink linework",
};


export async function generateSceneImage(sceneId: string): Promise<string> {
  const { data: scene } = await supabaseAdmin.from("scenes").select("*").eq("id", sceneId).single();
  if (!scene) throw new Error("Scene not found.");
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", scene.project_id)
    .single();
  if (!project) throw new Error("Project not found.");

  const orientation =
    project.aspect_ratio === "16:9"
      ? "wide horizontal 16:9 cinematic framing"
      : "tall vertical 9:16 framing for mobile video";

  const prompt = `${scene.visual_prompt}

Art style: ${ART_PROMPT[project.art_style] ?? project.art_style}.
Dramatize the moment: characters caught mid-action with clear emotion and body language, cinematic camera angle,
strong depth so the still reads as a frame lifted from an animated film sequence.
Historical setting must be period-accurate for: ${project.topic}.
Composition: ${orientation}. No text, no captions, no watermarks, no modern objects.`;


  const bytes = await generateImageBytes(prompt);
  const path = await upload(`${project.id}/scene-${scene.idx}.png`, bytes, "image/png");
  await supabaseAdmin.from("scenes").update({ image_url: path }).eq("id", sceneId);
  return (await signPath(path))!;
}

export async function generateSceneAudio(sceneId: string): Promise<string> {
  const { data: scene } = await supabaseAdmin.from("scenes").select("*").eq("id", sceneId).single();
  if (!scene) throw new Error("Scene not found.");
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", scene.project_id)
    .single();
  if (!project) throw new Error("Project not found.");

  const bytes = await generateSpeechBytes(scene.narration, project.voice, project.story_style, project.language);
  const path = await upload(`${project.id}/scene-${scene.idx}.mp3`, bytes, "audio/mpeg");
  await supabaseAdmin.from("scenes").update({ audio_url: path }).eq("id", sceneId);
  return (await signPath(path))!;
}

export async function updateScene(
  sceneId: string,
  patch: { narration?: string; duration_seconds?: number },
): Promise<void> {
  const update: { narration?: string; audio_url?: string | null; duration_seconds?: number } = {};
  if (patch.narration !== undefined) {
    update.narration = patch.narration;
    update.audio_url = null;
  }
  if (patch.duration_seconds !== undefined) update.duration_seconds = patch.duration_seconds;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabaseAdmin.from("scenes").update(update).eq("id", sceneId);
  if (error) throw new Error(error.message);
}

export async function translateProject(projectId: string, targetLanguage: string): Promise<string> {
  const { data: project } = await supabaseAdmin.from("projects").select("*").eq("id", projectId).single();
  if (!project) throw new Error("Project not found.");
  const { data: scenes } = await supabaseAdmin
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("idx", { ascending: true });
  const list = (scenes ?? []) as unknown as Scene[];

  const translated = await chatJson<{ title: string; scenes: { narration: string; on_screen_text: string }[] }>(
    `You are a professional localization writer for historical documentaries. Translate faithfully into natural,
native-sounding speech for voice-over. Preserve every historical fact, name, date and nuance exactly.
Keep each line close to the original spoken length. Respond with JSON only.`,
    `Target language: ${targetLanguage}. Title: "${project.title}".
Lines:
${list.map((s, i) => `${i}. ${s.narration} || on-screen: ${s.on_screen_text ?? ""}`).join("\n")}

Return JSON: {"title":string,"scenes":[{"narration":string,"on_screen_text":string}]}`,
  );

  const { data: copy, error } = await supabaseAdmin
    .from("projects")
    .insert({
      title: translated.title || `${project.title} (${targetLanguage})`,
      topic: project.topic,
      language: targetLanguage,
      duration_seconds: project.duration_seconds,
      story_style: project.story_style,
      art_style: project.art_style,
      accuracy_level: project.accuracy_level,
      voice: project.voice,
      aspect_ratio: project.aspect_ratio,
      hook: project.hook,
      summary: project.summary,
      sources: project.sources,
      status: "scripted",
    })
    .select("id")
    .single();
  if (error || !copy) throw new Error(error?.message ?? "Could not create the translated project.");

  const rows = list.map((s, i) => ({
    project_id: copy.id,
    idx: i,
    narration: translated.scenes?.[i]?.narration ?? s.narration,
    visual_prompt: s.visual_prompt,
    on_screen_text: translated.scenes?.[i]?.on_screen_text ?? s.on_screen_text,
    is_dramatized: s.is_dramatized,
    source_note: s.source_note,
    duration_seconds: s.duration_seconds,
    image_url: s.image_url,
  }));
  await supabaseAdmin.from("scenes").insert(rows);
  return copy.id;
}

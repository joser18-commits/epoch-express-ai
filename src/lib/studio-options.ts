// Shared, client-safe option catalogs for History Studio AI.

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Chinese (Mandarin)",
  "Arabic",
  "Hindi",
  "Russian",
  "Turkish",
  "Dutch",
  "Polish",
  "Indonesian",
  "Vietnamese",
  "Swedish",
] as const;

export const DURATIONS = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
] as const;

export const STORY_STYLES = [
  "Documentary",
  "Epic Anime",
  "Dramatic",
  "Emotional",
  "Funny",
  "Kid-Friendly",
  "Movie Trailer",
  "Podcast",
] as const;

export const ART_STYLES = [
  "Animated Cartoon",
  "Anime",
  "Pixar-like",
  "Storybook Cartoon",
  "Realistic",
  "Comic Book",
  "Watercolor",
  "3D",
  "Medieval Painting",
  "Manga",
] as const;


export const ACCURACY_LEVELS = ["Beginner", "Student", "College", "Historian"] as const;

export const ASPECT_RATIOS = [
  { value: "9:16", label: "Vertical 9:16" },
  { value: "16:9", label: "Horizontal 16:9" },
] as const;

export type VoiceId =
  | "adult_male"
  | "adult_female"
  | "young_man"
  | "young_woman"
  | "child"
  | "elderly_storyteller";

export const VOICES: { id: VoiceId; label: string; hint: string }[] = [
  { id: "adult_male", label: "Adult male", hint: "Warm, grounded narrator" },
  { id: "adult_female", label: "Adult female", hint: "Clear, confident narrator" },
  { id: "young_man", label: "Young man", hint: "Bright, energetic" },
  { id: "young_woman", label: "Young woman", hint: "Light, expressive" },
  { id: "child", label: "Child", hint: "Playful, kid-friendly" },
  { id: "elderly_storyteller", label: "Elderly storyteller", hint: "Slow, weathered, wise" },
];

export function sceneCountFor(durationSeconds: number): number {
  if (durationSeconds <= 30) return 6;
  if (durationSeconds <= 60) return 10;
  if (durationSeconds <= 300) return 22;
  return 30;
}

export type PlatformId = "tiktok" | "reels" | "youtube_shorts" | "youtube" | "all";

/** Target platform presets — the AI uses these to pick pacing and episode length. */
export const PLATFORMS: {
  id: PlatformId;
  label: string;
  hint: string;
  episodeSeconds: number;
  aspectRatio: string;
  shorts: boolean;
  pacing: string;
}[] = [
  {
    id: "tiktok",
    label: "TikTok",
    hint: "45–60s, hook-first, cliffhanger",
    episodeSeconds: 55,
    aspectRatio: "9:16",
    shorts: true,
    pacing:
      "Very fast pacing, punchy sentences, a scroll-stopping hook in the first 2 seconds, constant forward momentum.",
  },
  {
    id: "reels",
    label: "Instagram Reels",
    hint: "45–60s, cinematic and snappy",
    episodeSeconds: 55,
    aspectRatio: "9:16",
    shorts: true,
    pacing:
      "Fast, cinematic pacing with a striking visual hook in the first 2 seconds and tight, quotable lines.",
  },
  {
    id: "youtube_shorts",
    label: "YouTube Shorts",
    hint: "45–60s, curiosity-gap hook",
    episodeSeconds: 58,
    aspectRatio: "9:16",
    shorts: true,
    pacing:
      "Fast pacing built on a curiosity gap: open with an unanswered question, resolve part of it, leave the rest hanging.",
  },
  {
    id: "youtube",
    label: "YouTube (long-form)",
    hint: "~8 min episodes, deeper storytelling",
    episodeSeconds: 480,
    aspectRatio: "16:9",
    shorts: false,
    pacing:
      "Measured documentary pacing with room for context, chapters and reflection, but a compelling cold open.",
  },
  {
    id: "all",
    label: "All platforms",
    hint: "60s vertical, works everywhere",
    episodeSeconds: 60,
    aspectRatio: "9:16",
    shorts: true,
    pacing:
      "Fast but not frantic pacing that reads well on every short-form platform; strong hook, clean payoff, clear cliffhanger.",
  },
];

export function platformPreset(id: string) {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[2]!;
}

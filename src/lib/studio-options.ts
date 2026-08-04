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

export type Scene = {
  id: string;
  project_id: string;
  idx: number;
  narration: string;
  visual_prompt: string;
  on_screen_text: string | null;
  is_dramatized: boolean;
  source_note: string | null;
  duration_seconds: number;
  image_url: string | null;
  audio_url: string | null;
};

export type Project = {
  id: string;
  title: string;
  topic: string;
  language: string;
  duration_seconds: number;
  story_style: string;
  art_style: string;
  accuracy_level: string;
  voice: string;
  aspect_ratio: string;
  hook: string | null;
  summary: string | null;
  sources: { title: string; note: string }[];
  status: string;
  created_at: string;
};

export type ProjectWithScenes = { project: Project; scenes: Scene[] };

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
  series_id?: string | null;
  episode_number?: number | null;
  platform?: string;
  cliffhanger?: string | null;
  recap?: string | null;
};

export type ProjectWithScenes = { project: Project; scenes: Scene[] };

export type SeriesBible = {
  narrator?: string;
  visual_style?: string;
  characters?: { name: string; description: string }[];
  locations?: { name: string; description: string }[];
  timeline?: string[];
  recurring_motifs?: string[];
};

export type EpisodePlanItem = {
  number: number;
  title: string;
  focus: string;
  cliffhanger: string;
};

export type Series = {
  id: string;
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

export type SeriesEpisode = {
  id: string;
  title: string;
  episode_number: number;
  status: string;
  cliffhanger: string | null;
  summary: string | null;
};

export type SeriesWithEpisodes = { series: Series; episodes: SeriesEpisode[] };

/** Series fields present on episode projects (null for standalone videos). */
export type ProjectSeriesFields = {
  series_id: string | null;
  episode_number: number | null;
  platform: string;
  cliffhanger: string | null;
  recap: string | null;
};

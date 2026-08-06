CREATE TABLE public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled series',
  topic text NOT NULL,
  language text NOT NULL DEFAULT 'English',
  platform text NOT NULL DEFAULT 'youtube_shorts',
  episode_seconds integer NOT NULL DEFAULT 60,
  episode_count integer NOT NULL DEFAULT 5,
  story_style text NOT NULL DEFAULT 'Documentary',
  art_style text NOT NULL DEFAULT 'Realistic',
  accuracy_level text NOT NULL DEFAULT 'Student',
  voice text NOT NULL DEFAULT 'adult_male',
  aspect_ratio text NOT NULL DEFAULT '9:16',
  overview text,
  bible jsonb NOT NULL DEFAULT '{}'::jsonb,
  episode_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_continue boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.series TO authenticated;
GRANT ALL ON public.series TO service_role;

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their series" ON public.series
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER series_updated_at BEFORE UPDATE ON public.series
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects
  ADD COLUMN series_id uuid REFERENCES public.series(id) ON DELETE CASCADE,
  ADD COLUMN episode_number integer,
  ADD COLUMN platform text NOT NULL DEFAULT 'youtube_shorts',
  ADD COLUMN cliffhanger text,
  ADD COLUMN recap text;

CREATE INDEX projects_series_idx ON public.projects (series_id, episode_number);
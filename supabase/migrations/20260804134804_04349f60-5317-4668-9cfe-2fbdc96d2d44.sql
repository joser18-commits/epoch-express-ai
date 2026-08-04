CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  topic TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  story_style TEXT NOT NULL DEFAULT 'Documentary',
  art_style TEXT NOT NULL DEFAULT 'Realistic',
  accuracy_level TEXT NOT NULL DEFAULT 'Student',
  voice TEXT NOT NULL DEFAULT 'adult_male',
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  hook TEXT,
  summary TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  narration TEXT NOT NULL,
  visual_prompt TEXT NOT NULL DEFAULT '',
  on_screen_text TEXT,
  is_dramatized BOOLEAN NOT NULL DEFAULT false,
  source_note TEXT,
  duration_seconds NUMERIC NOT NULL DEFAULT 5,
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scenes_project_idx ON public.scenes(project_id, idx);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO anon, authenticated;
GRANT ALL ON public.scenes TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access to scenes" ON public.scenes FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
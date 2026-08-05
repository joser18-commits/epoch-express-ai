-- Remove ownerless legacy rows before enforcing ownership
DELETE FROM public.projects;

ALTER TABLE public.projects
  ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX projects_user_id_idx ON public.projects(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO authenticated;
GRANT ALL ON public.scenes TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their projects" ON public.projects;
CREATE POLICY "Owners manage their projects"
ON public.projects FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners manage scenes of their projects" ON public.scenes;
CREATE POLICY "Owners manage scenes of their projects"
ON public.scenes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scenes.project_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scenes.project_id AND p.user_id = auth.uid()));
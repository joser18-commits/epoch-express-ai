DROP POLICY IF EXISTS "Open access to projects" ON public.projects;
DROP POLICY IF EXISTS "Open access to scenes" ON public.scenes;
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.scenes FROM anon;
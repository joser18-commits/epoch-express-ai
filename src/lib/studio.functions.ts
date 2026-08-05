import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateInput = z.object({
  topic: z.string().min(3).max(500),
  language: z.string().min(2).max(40),
  durationSeconds: z.number().int().min(15).max(900),
  storyStyle: z.string().min(2).max(40),
  artStyle: z.string().min(2).max(40),
  accuracyLevel: z.string().min(2).max(40),
  voice: z.string().min(2).max(40),
  aspectRatio: z.string().min(3).max(10),
});

export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { createProject } = await import("./studio.server");
    return { id: await createProject({ ...data, userId: context.userId }) };
  });

export const listProjectsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listProjects } = await import("./studio.server");
    return await listProjects(context.userId);
  });

export const getProjectFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getProject } = await import("./studio.server");
    return await getProject(data.id, context.userId);
  });

export const deleteProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { deleteProject } = await import("./studio.server");
    await deleteProject(data.id, context.userId);
    return { ok: true };
  });

export const generateSceneImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sceneId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateSceneImage } = await import("./studio.server");
    return { url: await generateSceneImage(data.sceneId, context.userId) };
  });

export const generateSceneAudioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sceneId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateSceneAudio } = await import("./studio.server");
    return { url: await generateSceneAudio(data.sceneId, context.userId) };
  });

export const updateSceneFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sceneId: z.string().uuid(),
        narration: z.string().max(4000).optional(),
        durationSeconds: z.number().min(0.5).max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { updateScene } = await import("./studio.server");
    await updateScene(data.sceneId, context.userId, {
      ...(data.narration !== undefined ? { narration: data.narration } : {}),
      ...(data.durationSeconds !== undefined ? { duration_seconds: data.durationSeconds } : {}),
    });
    return { ok: true };
  });

export const translateProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), targetLanguage: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { translateProject } = await import("./studio.server");
    return { id: await translateProject(data.projectId, data.targetLanguage, context.userId) };
  });

/** Reports whether generation is currently mocked (development) or hitting real AI. */
export const aiModeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { isMockAi } = await import("./ai-mock.server");
    return { mock: isMockAi() };
  });

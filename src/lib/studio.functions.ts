import { createServerFn } from "@tanstack/react-start";
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
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data }) => {
    const { createProject } = await import("./studio.server");
    return { id: await createProject(data) };
  });

export const listProjectsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listProjects } = await import("./studio.server");
  return await listProjects();
});

export const getProjectFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getProject } = await import("./studio.server");
    return await getProject(data.id);
  });

export const deleteProjectFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { deleteProject } = await import("./studio.server");
    await deleteProject(data.id);
    return { ok: true };
  });

export const generateSceneImageFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ sceneId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { generateSceneImage } = await import("./studio.server");
    return { url: await generateSceneImage(data.sceneId) };
  });

export const generateSceneAudioFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ sceneId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { generateSceneAudio } = await import("./studio.server");
    return { url: await generateSceneAudio(data.sceneId) };
  });

export const updateSceneFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        sceneId: z.string().uuid(),
        narration: z.string().max(4000).optional(),
        durationSeconds: z.number().min(0.5).max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { updateScene } = await import("./studio.server");
    await updateScene(data.sceneId, {
      ...(data.narration !== undefined ? { narration: data.narration } : {}),
      ...(data.durationSeconds !== undefined ? { duration_seconds: data.durationSeconds } : {}),
    });
    return { ok: true };
  });

export const translateProjectFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), targetLanguage: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { translateProject } = await import("./studio.server");
    return { id: await translateProject(data.projectId, data.targetLanguage) };
  });

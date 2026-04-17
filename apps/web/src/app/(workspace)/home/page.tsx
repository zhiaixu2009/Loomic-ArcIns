"use client";

import type {
  ImageGenerationPreference,
  ProjectSummary,
  VideoGenerationPreference,
} from "@loomic/shared";
import type { ReadyAttachment } from "@/hooks/use-image-attachments";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { HomeExampleBrowser } from "@/components/home-example-browser";
import { HomePrompt, type HomePromptHandle } from "@/components/home-prompt";
import { LoadingScreen } from "@/components/loading-screen";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { HomeProjectsSkeleton } from "@/components/skeletons/home-skeleton";
import { useCreateProject } from "@/hooks/use-create-project";
import { useDeleteProject } from "@/hooks/use-delete-project";
import { useImageAttachments } from "@/hooks/use-image-attachments";
import { useAuth } from "@/lib/auth-context";
import { loadHomeExampleCategories } from "@/lib/home-example-library";
import {
  homeExampleSeedCategories,
  type HomeExampleSelection,
} from "@/lib/home-example-seeds";
import { ApiAuthError, fetchProjects } from "@/lib/server-api";
import { buildCanvasUrl } from "@/lib/studio-routes";
import { formatDate } from "@/lib/utils";

const RECENT_PROJECTS_LIMIT = 4;

export default function HomePage() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const { create: createNewProject, creating } = useCreateProject();
  const handleDeleted = useCallback((id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  }, []);
  const { pendingId, deleting, requestDelete, confirmDelete, cancelDelete } =
    useDeleteProject({ onDeleted: handleDeleted });

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [homeExampleCategories, setHomeExampleCategories] = useState(
    homeExampleSeedCategories,
  );
  const [selectedExample, setSelectedExample] =
    useState<HomeExampleSelection | null>(null);

  const promptRef = useRef<HomePromptHandle>(null);

  const accessTokenRef = useRef(session?.access_token);
  accessTokenRef.current = session?.access_token;

  const {
    attachments: imageAttachments,
    addFiles,
    removeAttachment,
    clearAll: clearAttachments,
    isUploading,
    readyAttachments,
  } = useImageAttachments(session?.access_token ?? "");

  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const routerRef = useRef(router);
  routerRef.current = router;
  const hasInitialized = useRef(false);

  const getToken = useCallback(() => accessTokenRef.current, []);

  const loadProjects = useCallback(async () => {
    const token = getToken();
    if (!token) {
      return;
    }

    setProjectsLoading(true);
    try {
      const data = await fetchProjects(token);
      setProjects(data.projects.slice(0, RECENT_PROJECTS_LIMIT));
    } catch (error) {
      if (error instanceof ApiAuthError) {
        await signOutRef.current();
        routerRef.current.replace("/login");
        return;
      }

      console.warn("[home] failed to load recent projects", error);
    } finally {
      setProjectsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    void loadHomeExampleCategories()
      .then((exampleCategories) => {
        if (cancelled) {
          return;
        }

        setHomeExampleCategories(exampleCategories);
      })
      .catch((error) => {
        console.warn("[home] failed to load example seed content", error);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handlePromptSubmit = useCallback(
    (
      prompt: string,
      attachments?: ReadyAttachment[],
      imageGenerationPreference?: ImageGenerationPreference,
      videoGenerationPreference?: VideoGenerationPreference,
      model?: string,
    ) => {
      setSelectedExample(null);
      clearAttachments();
      createNewProject({
        prompt,
        studioMode: "architecture",
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
        ...(imageGenerationPreference ? { imageGenerationPreference } : {}),
        ...(videoGenerationPreference ? { videoGenerationPreference } : {}),
        ...(model ? { model } : {}),
      });
    },
    [clearAttachments, createNewProject],
  );

  const handleExampleSelect = useCallback((selection: HomeExampleSelection) => {
    setSelectedExample(selection);
    promptRef.current?.fill(selection.prompt);
  }, []);

  const handleExampleClear = useCallback(() => {
    setSelectedExample(null);
  }, []);

  const handleCreateProject = useCallback(() => {
    console.info("[home] opening new project dialog from home card");
    setNewProjectDialogOpen(true);
  }, []);

  const handleNewProjectCancel = useCallback(() => {
    console.info("[home] closing new project dialog without creating");
    setNewProjectDialogOpen(false);
  }, []);

  const handleNewProjectConfirm = useCallback(
    async ({ name }: { name?: string; projectFile?: File }) => {
      console.info("[home] confirming new project dialog", {
        hasCustomName: Boolean(name?.trim()),
      });
      setNewProjectDialogOpen(false);
      await createNewProject({
        ...(name?.trim() ? { name: name.trim() } : {}),
        studioMode: "architecture",
      });
    },
    [createNewProject],
  );

  if (creating) {
    return <LoadingScreen />;
  }

  return (
    <div
      data-testid="home-page-shell"
      data-theme="light-architecture"
      className="min-h-full bg-white text-slate-900"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="pt-3">
          <div className="mx-auto max-w-[900px] text-center">
            <p className="text-sm font-medium tracking-[0.08em] text-slate-500">
              AI创作无限画布Agent
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              让设计灵感来的更快一些！
            </h1>
          </div>

          <div className="mx-auto mt-6 max-w-[920px]">
            <HomePrompt
              ref={promptRef}
              onSubmit={handlePromptSubmit}
              disabled={creating}
              attachments={imageAttachments}
              onAddFiles={addFiles}
              onRemoveAttachment={removeAttachment}
              isUploading={isUploading}
              readyAttachments={readyAttachments}
              selectedSeed={selectedExample}
              onClearSelectedSeed={handleExampleClear}
            />
          </div>

          <div className="mt-5 flex justify-center">
            <a
              href="https://www.bilibili.com/video/BV1jVQZBnE5h/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-slate-50"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-600">
                ▶
              </span>
              <span>视频教程</span>
            </a>
          </div>
        </section>

        <section className="rounded-[10px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">最近项目</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_repeat(3,minmax(0,1fr))]">
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateProject}
              className="flex min-h-[188px] flex-col justify-between rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-left transition-colors hover:bg-slate-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-slate-100 text-2xl text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
                +
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">新建项目</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  从一句需求或一张参考图开始新的无限画布创作。
                </p>
              </div>
            </button>

            {projectsLoading ? (
              <HomeProjectsSkeleton
                includeNewProjectPlaceholder={false}
                projectCount={RECENT_PROJECTS_LIMIT - 1}
              />
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  className="group relative flex min-h-[188px] cursor-pointer flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                  onClick={() =>
                    router.push(
                      buildCanvasUrl(project.primaryCanvas.id, {
                        studio: "architecture",
                      }),
                    )
                  }
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      requestDelete(project.id);
                    }}
                    aria-label={`删除 ${project.name}`}
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 opacity-0 transition-all hover:bg-white group-hover:opacity-100"
                  >
                    ×
                  </button>

                  <div className="flex h-[112px] items-end bg-[linear-gradient(135deg,#ffffff,#f3f4f6)] px-5 py-4 text-sm text-slate-500">
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(event) => {
                          (event.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      "继续当前画布里的参考整理、生成结果和评审记录。"
                    )}
                  </div>

                  <div className="flex flex-1 items-end justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {project.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        更新于：{formatDate(project.updatedAt)}
                      </p>
                    </div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors group-hover:bg-slate-100">
                      →
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[10px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">参考案例</h2>
            <p className="mt-1 text-sm text-slate-500">
              直接从案例卡片进入无限画布，再继续延展你的方案方向。
            </p>
          </div>

          <HomeExampleBrowser
            categories={homeExampleCategories}
            selectedExample={selectedExample}
            onExampleSelect={handleExampleSelect}
          />
        </section>
      </div>

      <DeleteProjectDialog
        open={pendingId !== null}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <NewProjectDialog
        open={newProjectDialogOpen}
        creating={creating}
        onCancel={handleNewProjectCancel}
        onConfirm={handleNewProjectConfirm}
      />
    </div>
  );
}

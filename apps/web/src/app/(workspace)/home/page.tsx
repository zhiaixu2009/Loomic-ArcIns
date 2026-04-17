"use client";

import type {
  ImageGenerationPreference,
  ProjectSummary,
  VideoGenerationPreference,
} from "@loomic/shared";
import type { ReadyAttachment } from "@/hooks/use-image-attachments";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const HOME_NAV_ITEMS = [
  "首页",
  "AI工具",
  "AI绘图",
  "AI画布Agent",
  "Banana智能体",
  "课程",
  "资源",
  "图库",
] as const;

export default function HomePage() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const { create: createNewProject, creating } = useCreateProject();
  const handleDeleted = useCallback((id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  }, []);
  const { pendingId, deleting, confirmDelete, cancelDelete } =
    useDeleteProject({ onDeleted: handleDeleted });

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [referenceCaseDialogOpen, setReferenceCaseDialogOpen] = useState(false);
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
    setReferenceCaseDialogOpen(false);
    promptRef.current?.fill(selection.prompt);
  }, []);

  const handleExampleClear = useCallback(() => {
    setSelectedExample(null);
  }, []);

  const handleOpenReferenceCases = useCallback(() => {
    setReferenceCaseDialogOpen(true);
  }, []);

  const handleCloseReferenceCases = useCallback(() => {
    setReferenceCaseDialogOpen(false);
  }, []);

  const featuredReferenceCase = useMemo(
    () =>
      homeExampleCategories.flatMap((category) =>
        category.examples.slice(0, 1).map((example) => ({
          categoryLabel: category.label,
          title: example.title,
          previewImages: example.previewImages.slice(0, 3),
        })),
      )[0] ?? null,
    [homeExampleCategories],
  );

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
        <nav
          aria-label="建筑学长站点导航"
          className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {HOME_NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-[8px] px-3 py-1.5 transition-colors ${
                  item === "AI画布Agent"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            开通会员
          </button>
        </nav>

        <section className="pt-3">
          <div className="mx-auto max-w-[900px] text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              AI创作无限画布Agent
            </h1>
            <p className="mt-3 text-base text-slate-500">
              让设计灵感来的更快一些！
            </p>
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
              通过单一入口打开案例库，再把参考流程带回当前创作上下文。
            </p>
          </div>

          <button
            type="button"
            aria-label="打开参考案例"
            onClick={handleOpenReferenceCases}
            className="group flex w-full items-center justify-between gap-5 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50 px-5 py-5 text-left transition-colors hover:bg-slate-100"
          >
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {featuredReferenceCase?.categoryLabel ?? "参考案例"}
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                打开参考案例
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {featuredReferenceCase
                  ? "查看建筑学长式案例入口，再挑选一个示例继续填充到首页输入框。"
                  : "打开案例库，选择一个示例继续延展你的方案方向。"}
              </p>
            </div>

            <div className="relative hidden h-[112px] w-[240px] shrink-0 md:block">
              {(featuredReferenceCase?.previewImages ?? []).map((image, index) => {
                const positionClasses = [
                  "left-[0%] top-[16%] w-[88px] -rotate-[10deg]",
                  "left-[68px] top-0 w-[96px] rotate-[4deg]",
                  "right-[0%] top-[12%] w-[88px] rotate-[12deg]",
                ];

                return (
                  <img
                    key={image}
                    src={image}
                    alt=""
                    aria-hidden="true"
                    className={`absolute aspect-[7/8] rounded-[8px] border border-slate-200 object-cover shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-transform duration-300 group-hover:-translate-y-1 ${positionClasses[index] ?? positionClasses[0]}`}
                  />
                );
              })}
              <div className="absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors group-hover:bg-slate-100">
                →
              </div>
            </div>
          </button>
        </section>
      </div>

      {referenceCaseDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/26 px-4 py-6"
          onClick={handleCloseReferenceCases}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="参考案例"
            className="flex h-[min(82vh,780px)] w-[min(1080px,calc(100vw-32px))] max-w-[1080px] flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">参考案例</h3>
                <p className="mt-1 text-sm text-slate-500">
                  选择一个案例，将提示词与参考结构回填到首页输入框。
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭参考案例"
                onClick={handleCloseReferenceCases}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <HomeExampleBrowser
                categories={homeExampleCategories}
                selectedExample={selectedExample}
                onExampleSelect={handleExampleSelect}
              />
            </div>
          </div>
        </div>
      ) : null}

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

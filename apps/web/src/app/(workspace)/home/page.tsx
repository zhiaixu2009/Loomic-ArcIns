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
import { HomePrompt } from "@/components/home-prompt";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { useProjectLibrary } from "@/components/project-library-provider";
import { HomeProjectsSkeleton } from "@/components/skeletons/home-skeleton";
import { useCreateProject } from "@/hooks/use-create-project";
import { useDeleteProject } from "@/hooks/use-delete-project";
import { useImageAttachments } from "@/hooks/use-image-attachments";
import { useAuth } from "@/lib/auth-context";
import { scheduleCanvasExperienceWarmup } from "@/lib/canvas-experience-warmup";
import { buildProjectThumbnailSrc } from "@/lib/project-thumbnail";
import { buildPromptTemplateAttachmentInputs } from "@/lib/prompt-template-attachments";
import { ApiAuthError, fetchProjects } from "@/lib/server-api";
import { buildCanvasUrl } from "@/lib/studio-routes";
import { formatDate } from "@/lib/utils";

const HOME_PROJECTS_LIMIT = 100;
const HOME_PROJECT_SKELETON_COUNT = 7;
const HOME_PROJECT_PREFETCH_LIMIT = 12;

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

function selectProjectsForHome(projects: ProjectSummary[]) {
  const withThumbnails = projects.filter((project) => Boolean(project.thumbnailUrl));
  const withoutThumbnails = projects.filter((project) => !project.thumbnailUrl);
  const selectedProjects = [...withThumbnails, ...withoutThumbnails].slice(
    0,
    HOME_PROJECTS_LIMIT,
  );

  console.info("[home] selected homepage projects", {
    limit: HOME_PROJECTS_LIMIT,
    selectedCount: selectedProjects.length,
    selectedWithThumbnails: selectedProjects.filter((project) =>
      Boolean(project.thumbnailUrl),
    ).length,
    totalProjects: projects.length,
    totalWithThumbnails: withThumbnails.length,
  });

  return selectedProjects;
}

export default function HomePage() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const { create: createNewProject, creating } = useCreateProject();
  const { openProjectLibrary } = useProjectLibrary();
  const [allProjects, setAllProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [totalProjectCount, setTotalProjectCount] = useState(0);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const accessTokenRef = useRef(session?.access_token);
  accessTokenRef.current = session?.access_token;
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const routerRef = useRef(router);
  routerRef.current = router;
  const hasInitializedRef = useRef(false);

  const projects = useMemo(() => selectProjectsForHome(allProjects), [allProjects]);

  const handleDeleted = useCallback((projectId: string) => {
    setAllProjects((prev) => prev.filter((project) => project.id !== projectId));
    setTotalProjectCount((prev) => Math.max(0, prev - 1));
  }, []);

  const { pendingId, deleting, requestDelete, confirmDelete, cancelDelete } =
    useDeleteProject({ onDeleted: handleDeleted });

  const {
    attachments: imageAttachments,
    addFiles,
    removeAttachment,
    replaceTemplateAttachments,
    clearAll: clearAttachments,
    isUploading,
    readyAttachments,
  } = useImageAttachments(session?.access_token ?? "");

  const projectLimitReached = totalProjectCount >= HOME_PROJECTS_LIMIT;

  const getToken = useCallback(() => accessTokenRef.current ?? null, []);
  const getProjectCanvasUrl = useCallback(
    (project: ProjectSummary) =>
      buildCanvasUrl(project.primaryCanvas.id, {
        studio: "architecture",
      }),
    [],
  );

  const loadProjects = useCallback(async () => {
    const token = getToken();
    if (!token) {
      return;
    }

    setProjectsLoading(true);
    try {
      const data = await fetchProjects(token);
      setTotalProjectCount(data.projects.length);
      setAllProjects(data.projects);
    } catch (error) {
      if (error instanceof ApiAuthError) {
        await signOutRef.current();
        routerRef.current.replace("/login");
        return;
      }

      console.warn("[home] failed to load homepage projects", error);
    } finally {
      setProjectsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => scheduleCanvasExperienceWarmup(router), [router]);

  useEffect(() => {
    const handleWindowFocus = () => {
      console.info("[home] refreshing projects after window focus");
      void loadProjects();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      console.info("[home] refreshing projects after bfcache restore");
      void loadProjects();
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length === 0) {
      return;
    }

    projects.slice(0, HOME_PROJECT_PREFETCH_LIMIT).forEach((project) => {
      router.prefetch?.(getProjectCanvasUrl(project));
    });

    console.info("[home] prefetched homepage project canvases", {
      count: Math.min(projects.length, HOME_PROJECT_PREFETCH_LIMIT),
    });
  }, [getProjectCanvasUrl, projects, router]);

  const handlePromptSubmit = useCallback(
    (
      prompt: string,
      attachments?: ReadyAttachment[],
      imageGenerationPreference?: ImageGenerationPreference,
      videoGenerationPreference?: VideoGenerationPreference,
      model?: string,
    ) => {
      if (creating || projectLimitReached) {
        return;
      }

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
    [clearAttachments, createNewProject, creating, projectLimitReached],
  );

  const handleCreateProject = useCallback(() => {
    if (creating || projectLimitReached) {
      return;
    }

    console.info("[home] opening new project dialog");
    setNewProjectDialogOpen(true);
  }, [creating, projectLimitReached]);

  const handleNewProjectCancel = useCallback(() => {
    console.info("[home] closing new project dialog");
    setNewProjectDialogOpen(false);
  }, []);

  const handleNewProjectConfirm = useCallback(
    async ({ name }: { name?: string; projectFile?: File }) => {
      if (projectLimitReached) {
        return;
      }

      console.info("[home] confirming new project dialog", {
        hasCustomName: Boolean(name?.trim()),
      });
      setNewProjectDialogOpen(false);
      await createNewProject({
        ...(name?.trim() ? { name: name.trim() } : {}),
        studioMode: "architecture",
      });
    },
    [createNewProject, projectLimitReached],
  );

  return (
    <div
      data-testid="home-page-shell"
      data-theme="light-architecture"
      className="min-h-[100dvh] overflow-x-hidden bg-white text-slate-900"
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1680px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
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

        <section className="pt-2">
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
              onSubmit={handlePromptSubmit}
              disabled={creating || projectLimitReached}
              attachments={imageAttachments}
              onAddFiles={addFiles}
              onRemoveAttachment={removeAttachment}
              onApplyTemplate={(template) =>
                replaceTemplateAttachments(
                  buildPromptTemplateAttachmentInputs(template),
                )
              }
              isUploading={isUploading}
              readyAttachments={readyAttachments}
            />
          </div>

          <div className="mt-4 flex justify-center">
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

        <section className="rounded-[10px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">最近项目</h2>
              <p className="mt-1 text-sm text-slate-500">
                首页最多展示 {HOME_PROJECTS_LIMIT} 个项目卡片，支持更宽布局以便一次看到更多项目。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openProjectLibrary}
                className="inline-flex h-10 items-center rounded-[10px] border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                项目库
              </button>
              <p className="text-sm text-slate-500">
                当前共 {totalProjectCount} 个项目
              </p>
            </div>
          </div>

          {projectLimitReached ? (
            <div
              data-testid="home-project-limit-warning"
              className="mb-4 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              当前项目已达到 {HOME_PROJECTS_LIMIT} 个上限，请先删除不再需要的项目后继续创建。
            </div>
          ) : null}

          <div
            data-testid="home-project-grid"
            className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
          >
            <button
              type="button"
              aria-label="新建项目"
              disabled={creating || projectLimitReached}
              onClick={handleCreateProject}
              data-testid="home-new-project-card"
              className="flex aspect-square flex-col justify-between rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-left transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-slate-100 text-2xl text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
                +
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">新建项目</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                  从一句需求或一张参考图开始新的无限画布创作。
                </p>
              </div>
            </button>

            {projectsLoading ? (
              <HomeProjectsSkeleton
                includeNewProjectPlaceholder={false}
                projectCount={HOME_PROJECT_SKELETON_COUNT}
              />
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  data-testid={`recent-project-card-${project.id}`}
                  className="group relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                  onClick={() => router.push(getProjectCanvasUrl(project))}
                >
                  <button
                    type="button"
                    aria-label={`删除项目 ${project.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestDelete(project.id);
                    }}
                    className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/94 text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6" />
                      <path d="M18 6l-1 12.25A1.75 1.75 0 0 1 15.26 20H8.74A1.75 1.75 0 0 1 7 18.25L6 6" />
                      <path d="M10 10.5v5" />
                      <path d="M14 10.5v5" />
                    </svg>
                  </button>

                  <div
                    data-testid={`recent-project-card-media-${project.id}`}
                    className="relative flex min-h-0 flex-[0_0_56%] items-end overflow-hidden bg-[linear-gradient(135deg,#ffffff,#f3f4f6)] px-4 py-4 text-sm text-slate-500"
                  >
                    {project.thumbnailUrl ? (
                      <img
                        src={buildProjectThumbnailSrc(
                          project.thumbnailUrl,
                          project.updatedAt,
                        )}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="relative z-10 rounded-[10px] bg-white/88 px-3 py-2 text-xs font-medium text-slate-500 shadow-[0_10px_18px_rgba(15,23,42,0.04)]">
                        继续查看当前画布里的参考整理与最新结果
                      </div>
                    )}
                  </div>

                  <div
                    data-testid={`recent-project-card-footer-${project.id}`}
                    className="relative z-10 flex min-h-0 flex-1 items-end gap-2 px-4 pb-4 pt-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        data-testid={`recent-project-card-title-${project.id}`}
                        className="truncate whitespace-nowrap text-base font-semibold leading-6 text-slate-900"
                      >
                        {project.name}
                      </p>
                      <p className="mt-2 truncate text-[13px] leading-5 text-slate-500">
                        更新于：{formatDate(project.updatedAt)}
                      </p>
                    </div>
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 transition-colors group-hover:bg-slate-100">
                      →
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
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

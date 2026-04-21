"use client";

import type { ProjectSummary } from "@loomic/shared";
import {
  ArrowUpRight,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateProject } from "@/hooks/use-create-project";
import { useDeleteProject } from "@/hooks/use-delete-project";
import { useAuth } from "@/lib/auth-context";
import { buildProjectThumbnailSrc } from "@/lib/project-thumbnail";
import {
  ApiAuthError,
  fetchProjects,
} from "@/lib/server-api";
import { buildCanvasUrl } from "@/lib/studio-routes";
import { formatDate } from "@/lib/utils";

const FAVORITES_STORAGE_KEY_PREFIX = "loomic:project-library:favorites:";

type ProjectLibraryDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function getFavoritesStorageKey(userId: string | null) {
  return `${FAVORITES_STORAGE_KEY_PREFIX}${userId ?? "anonymous"}`;
}

function readFavoriteProjectIds(userId: string | null) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(getFavoritesStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function writeFavoriteProjectIds(userId: string | null, projectIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  // TODO: move favorites into a shared server-side preference store once the
  // product defines whether project-library favorites should sync across tabs/devices.
  window.localStorage.setItem(
    getFavoritesStorageKey(userId),
    JSON.stringify(projectIds),
  );
}

function sortProjectLibraryEntries(
  projects: ProjectSummary[],
  favoriteIds: Set<string>,
) {
  return [...projects].sort((left, right) => {
    const favoriteDelta =
      Number(favoriteIds.has(right.id)) - Number(favoriteIds.has(left.id));

    if (favoriteDelta !== 0) {
      return favoriteDelta;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

export function ProjectLibraryDialog({
  open,
  onOpenChange,
}: ProjectLibraryDialogProps) {
  const router = useRouter();
  const { create: createNewProject, creating } = useCreateProject();
  const { session, signOut, user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>([]);
  const favoriteProjectIdSet = useMemo(
    () => new Set(favoriteProjectIds),
    [favoriteProjectIds],
  );
  const userId = user?.id ?? null;

  const handleDeleted = useCallback((projectId: string) => {
    setProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
    setFavoriteProjectIds((current) =>
      current.filter((candidateId) => candidateId !== projectId),
    );
  }, []);

  const { pendingId, deleting, requestDelete, confirmDelete, cancelDelete } =
    useDeleteProject({
      onDeleted: handleDeleted,
    });

  useEffect(() => {
    if (!open) {
      return;
    }

    setFavoriteProjectIds(readFavoriteProjectIds(userId));
  }, [open, userId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    writeFavoriteProjectIds(userId, favoriteProjectIds);
  }, [favoriteProjectIds, open, userId]);

  const loadProjects = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      return;
    }

    setProjectsLoading(true);
    setLoadError(null);

    try {
      const data = await fetchProjects(accessToken);
      console.info("[project-library] loaded projects", {
        count: data.projects.length,
      });
      setProjects(data.projects);
    } catch (error) {
      if (error instanceof ApiAuthError) {
        await signOut();
        router.replace("/login");
        return;
      }

      console.warn("[project-library] failed to load projects", error);
      setLoadError("项目库加载失败，请重试。");
    } finally {
      setProjectsLoading(false);
    }
  }, [router, session?.access_token, signOut]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadProjects();
  }, [loadProjects, open]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    const sortedProjects = sortProjectLibraryEntries(
      projects,
      favoriteProjectIdSet,
    );

    return sortedProjects.filter((project) => {
      if (favoritesOnly && !favoriteProjectIdSet.has(project.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [project.name, project.description ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [favoriteProjectIdSet, favoritesOnly, projects, searchValue]);

  const favoriteCount = favoriteProjectIds.filter((projectId) =>
    projects.some((project) => project.id === projectId),
  ).length;

  const handleOpenProject = useCallback(
    (project: ProjectSummary) => {
      console.info("[project-library] opening project canvas", {
        canvasId: project.primaryCanvas.id,
        projectId: project.id,
      });
      onOpenChange(false);
      router.push(
        buildCanvasUrl(project.primaryCanvas.id, {
          studio: "architecture",
        }),
      );
    },
    [onOpenChange, router],
  );

  const handleCreateProject = useCallback(() => {
    onOpenChange(false);
    createNewProject({ studioMode: "architecture" });
  }, [createNewProject, onOpenChange]);

  const handleToggleFavorite = useCallback((projectId: string) => {
    setFavoriteProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((candidateId) => candidateId !== projectId)
        : [...current, projectId],
    );
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[min(1220px,calc(100vw-32px))] max-w-none overflow-hidden rounded-[10px] p-0 sm:max-w-none"
          showCloseButton={false}
        >
          <div className="flex h-[min(82vh,780px)] min-h-[560px] flex-col bg-white">
            <div className="border-b border-slate-200 px-6 py-5">
              <DialogHeader className="gap-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-[22px] font-semibold text-slate-900">
                      项目库
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                      集中查看全部项目，支持搜索和收藏，打开后直接进入对应画布。
                    </DialogDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadProjects()}
                      disabled={projectsLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          projectsLoading ? "animate-spin" : ""
                        }`}
                      />
                      刷新
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={creating}
                      className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      新建项目
                    </button>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-[420px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="搜索项目"
                    type="search"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="搜索项目名称或描述"
                    className="h-11 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={!favoritesOnly}
                    onClick={() => setFavoritesOnly(false)}
                    className={`inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-medium transition-colors ${
                      favoritesOnly
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    全部项目
                  </button>
                  <button
                    type="button"
                    aria-pressed={favoritesOnly}
                    onClick={() => setFavoritesOnly(true)}
                    className={`inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-medium transition-colors ${
                      favoritesOnly
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Star className="h-4 w-4" />
                    收藏
                    <span className="text-xs text-current/80">{favoriteCount}</span>
                  </button>
                  <div className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                    共 {projects.length} 个项目
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {loadError ? (
                <div className="flex h-full flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                  <p className="text-sm text-slate-600">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadProjects()}
                    className="mt-4 inline-flex h-10 items-center rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    重新加载
                  </button>
                </div>
              ) : projectsLoading ? (
                <div
                  data-testid="project-library-loading"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <div
                      key={`project-library-skeleton-${index}`}
                      className="h-[242px] rounded-[10px] border border-slate-200 bg-slate-50"
                    />
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                  <FolderOpen className="h-8 w-8 text-slate-400" />
                  <p className="mt-4 text-base font-medium text-slate-900">
                    {favoritesOnly ? "还没有收藏项目" : "没有找到匹配的项目"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {favoritesOnly
                      ? "点击卡片左上角星标即可把常用项目收进收藏。"
                      : "换个关键词再试试，或者直接新建一个项目。"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredProjects.map((project) => {
                    const isFavorite = favoriteProjectIdSet.has(project.id);

                    return (
                      <article
                        key={project.id}
                        className="group relative flex min-h-[242px] flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]"
                      >
                        <button
                          type="button"
                          aria-label={
                            isFavorite
                              ? `取消收藏项目 ${project.name}`
                              : `收藏项目 ${project.name}`
                          }
                          onClick={() => handleToggleFavorite(project.id)}
                          className={`absolute left-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 backdrop-blur transition-colors ${
                            isFavorite
                              ? "bg-slate-900 text-white"
                              : "bg-white/94 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Star
                            className="h-4 w-4"
                            fill={isFavorite ? "currentColor" : "none"}
                          />
                        </button>

                        <button
                          type="button"
                          aria-label={`删除项目 ${project.name}`}
                          onClick={() => requestDelete(project.id)}
                          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/94 text-slate-500 backdrop-blur transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          aria-label={`打开项目 ${project.name}`}
                          onClick={() => handleOpenProject(project)}
                          className="flex h-full flex-col text-left"
                        >
                          <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-[linear-gradient(135deg,#f8fafc,#eef2f7)] px-4 py-4">
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
                                继续查看当前项目的画布内容与最新修改
                              </div>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col justify-between px-4 pb-4 pt-3">
                            <div className="space-y-2">
                              <p className="truncate whitespace-nowrap text-base font-semibold text-slate-900">
                                {project.name}
                              </p>
                              <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                                {project.description?.trim() || "建筑画布项目"}
                              </p>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <p className="truncate text-sm text-slate-500">
                                更新于：{formatDate(project.updatedAt)}
                              </p>
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors group-hover:bg-slate-100">
                                <ArrowUpRight className="h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteProjectDialog
        open={pendingId !== null}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}

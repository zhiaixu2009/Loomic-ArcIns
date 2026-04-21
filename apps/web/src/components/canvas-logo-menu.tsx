"use client";

import {
  Copy,
  FolderOpen,
  Home,
  ImagePlus,
  Maximize2,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { LoomicLogo } from "@/components/icons/loomic-logo";
import { useProjectLibrary } from "@/components/project-library-provider";
import { useToast } from "@/components/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateProject } from "@/hooks/use-create-project";
import {
  createExcalidrawImageElement,
  getViewportCenter,
  scaleToFit,
} from "@/lib/canvas-elements";
import { duplicateSelectedCanvasElements } from "@/lib/canvas-context-actions";
import { deleteProject } from "@/lib/server-api";

interface CanvasLogoMenuProps {
  accessToken: string;
  projectId: string;
  canvasId: string;
  // biome-ignore lint/suspicious/noExplicitAny: Excalidraw API has no public type definition
  excalidrawApi: any | null;
  onBeforeNavigate?: () => Promise<void> | void;
}

const NAVIGATION_FLUSH_TIMEOUT_MS = 1_500;

function dispatchKeyToExcalidraw(
  key: string,
  opts: { metaKey?: boolean; shiftKey?: boolean } = {},
) {
  const element = document.querySelector(".excalidraw-container");
  if (!element) return;

  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: `Key${key.toUpperCase()}`,
      metaKey: opts.metaKey ?? false,
      ctrlKey: opts.metaKey ?? false,
      shiftKey: opts.shiftKey ?? false,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function generateFileId(): string {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  ).slice(0, 20);
}

export function CanvasLogoMenu({
  accessToken,
  projectId,
  canvasId,
  excalidrawApi,
  onBeforeNavigate,
}: CanvasLogoMenuProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const { create: createNewProject } = useCreateProject();
  const { openProjectLibrary } = useProjectLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDuplicateElements = useCallback(() => {
    if (!excalidrawApi) return;
    duplicateSelectedCanvasElements(excalidrawApi);
  }, [excalidrawApi]);

  const handleNavigateHome = useCallback(async () => {
    if (onBeforeNavigate) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const flushPromise = Promise.resolve()
        .then(() => onBeforeNavigate())
        .catch((error) => {
          console.warn(
            "[canvas-logo-menu] failed to flush canvas before navigation",
            {
              canvasId,
              error,
            },
          );
        });

      try {
        const flushResult = await Promise.race([
          flushPromise.then(() => "completed" as const),
          new Promise<"timed-out">((resolve) => {
            timeoutId = setTimeout(() => resolve("timed-out"), NAVIGATION_FLUSH_TIMEOUT_MS);
          }),
        ]);

        if (flushResult === "timed-out") {
          console.warn(
            "[canvas-logo-menu] canvas flush exceeded navigation deadline; continuing home navigation",
            {
              canvasId,
              timeoutMs: NAVIGATION_FLUSH_TIMEOUT_MS,
            },
          );
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    router.push("/home");
  }, [canvasId, onBeforeNavigate, router]);

  const handleDeleteProject = useCallback(async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    try {
      await deleteProject(accessToken, projectId);
      router.push("/home");
    } catch (error) {
      console.warn("[canvas-logo-menu] failed to delete project", error);
      toastError("项目删除失败");
    } finally {
      setConfirmingDelete(false);
    }
  }, [accessToken, confirmingDelete, projectId, router, toastError]);

  const handleFileImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !excalidrawApi) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataURL = reader.result as string;
        const image = new Image();
        image.onload = () => {
          const fileId = generateFileId();

          excalidrawApi.addFiles([
            {
              id: fileId,
              dataURL,
              mimeType: file.type || "image/png",
              created: Date.now(),
            },
          ]);

          const scaled = scaleToFit(image.width, image.height, 600);
          const center = getViewportCenter(excalidrawApi.getAppState());
          const x = center.x - scaled.width / 2;
          const y = center.y - scaled.height / 2;

          const insertedElement = createExcalidrawImageElement({
            fileId,
            x,
            y,
            width: scaled.width,
            height: scaled.height,
            title: file.name,
          });

          excalidrawApi.updateScene({
            elements: [...excalidrawApi.getSceneElements(), insertedElement],
            captureUpdate: "IMMEDIATELY",
          });
        };
        image.src = dataURL;
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [excalidrawApi],
  );

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingDelete(false);
          }
        }}
      >
        <DropdownMenuTrigger
          className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card/80 shadow-sm transition-colors hover:bg-card outline-none backdrop-blur-sm"
          aria-label="菜单"
        >
          <LoomicLogo className="size-5 text-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" sideOffset={6} className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => void handleNavigateHome()}>
              <Home className="size-4" />
              主页
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openProjectLibrary}>
              <FolderOpen className="size-4" />
              项目库
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => createNewProject({ studioMode: "architecture" })}
            >
              <Plus className="size-4" />
              新建项目
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDeleteProject}
            >
              <Trash2 className="size-4" />
              {confirmingDelete ? "确认删除?" : "删除当前项目"}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <ImagePlus className="size-4" />
              导入图片
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => dispatchKeyToExcalidraw("z", { metaKey: true })}
            >
              <Undo2 className="size-4" />
              撤销
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                dispatchKeyToExcalidraw("z", {
                  metaKey: true,
                  shiftKey: true,
                })
              }
            >
              <Redo2 className="size-4" />
              重做
              <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicateElements}>
              <Copy className="size-4" />
              复制对象
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => excalidrawApi?.scrollToContent()}>
              <Maximize2 className="size-4" />
              显示画布所有元素
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileImport}
      />
    </>
  );
}

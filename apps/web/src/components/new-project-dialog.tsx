"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewProjectDialogProps {
  open: boolean;
  creating: boolean;
  onCancel: () => void;
  onConfirm: (payload: { name?: string; projectFile?: File }) => Promise<void> | void;
}

export function NewProjectDialog({
  open,
  creating,
  onCancel,
  onConfirm,
}: NewProjectDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState("");
  const [projectFile, setProjectFile] = useState<File | undefined>();

  const selectedFileName = useMemo(() => projectFile?.name ?? "", [projectFile]);

  const resetForm = useCallback(() => {
    setProjectName("");
    setProjectFile(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
        onCancel();
      }
    },
    [onCancel, resetForm],
  );

  const handleProjectFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setProjectFile(file);

      console.info("[new-project-dialog] project file selection changed", {
        hasFile: Boolean(file),
        fileName: file?.name,
      });
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const trimmedName = projectName.trim();

    console.info("[new-project-dialog] confirming project creation", {
      hasCustomName: Boolean(trimmedName),
      hasProjectFile: Boolean(projectFile),
    });

    // TODO: wire selected project files into the canvas import handoff flow.
    await onConfirm({
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(projectFile ? { projectFile } : {}),
    });
    resetForm();
  }, [onConfirm, projectFile, projectName, resetForm]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="rounded-[10px] border border-slate-200 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>添加项目</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-project-name">项目名称</Label>
            <Input
              id="new-project-name"
              placeholder="例如：滨海综合体方案"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              disabled={creating}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-center rounded-[10px]"
              disabled={creating}
            >
              导入画布项目
            </Button>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                tabIndex={-1}
                onChange={handleProjectFileChange}
                aria-hidden="true"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-center rounded-[10px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={creating}
              >
                上传项目文件
              </Button>
              {selectedFileName ? (
                <p className="text-xs text-muted-foreground">{selectedFileName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="rounded-[10px]"
              onClick={handleOpenChange.bind(null, false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button
              type="button"
              className="rounded-[10px]"
              onClick={handleSubmit}
              disabled={creating}
            >
              确定
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

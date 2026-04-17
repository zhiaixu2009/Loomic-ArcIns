"use client";

import { Download, ExternalLink, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ArchitectureExportActionState = {
  status: "idle" | "pending" | "success" | "failure";
  message?: string;
};

type ArchitectureExportCardProps = {
  actionState: ArchitectureExportActionState;
  lastSnapshotUrl?: string | null;
  onDownloadExportManifest: () => void;
  onDownloadReviewPackage: () => void;
  onShareSnapshot: () => void;
};

function ExportActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: typeof Share2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors",
        "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function ArchitectureExportCard({
  actionState,
  lastSnapshotUrl,
  onDownloadExportManifest,
  onDownloadReviewPackage,
  onShareSnapshot,
}: ArchitectureExportCardProps) {
  const pending = actionState.status === "pending";

  return (
    <section
      className="mt-4 rounded-[22px] border border-border/60 bg-background/70 p-4 shadow-sm"
      data-testid="architecture-export-card"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Share2 className="h-4 w-4 text-muted-foreground" />
        Share &amp; export
      </div>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {actionState.message ??
          "Create a snapshot link, then download review data as JSON for offline sharing."}
      </p>

      <div className="mt-3 space-y-2">
        <ExportActionButton
          disabled={pending}
          icon={Share2}
          label="Share snapshot"
          onClick={onShareSnapshot}
        />
        <ExportActionButton
          disabled={pending}
          icon={Download}
          label="Download review package"
          onClick={onDownloadReviewPackage}
        />
        <ExportActionButton
          disabled={pending}
          icon={Download}
          label="Download manifest"
          onClick={onDownloadExportManifest}
        />
      </div>

      {lastSnapshotUrl ? (
        <a
          href={lastSnapshotUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4"
        >
          Latest snapshot
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </section>
  );
}

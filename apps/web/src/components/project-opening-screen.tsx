"use client";

export function ProjectOpeningScreen() {
  return (
    <div
      data-testid="project-opening-screen"
      className="fixed inset-0 z-[11000] grid place-items-center bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900"
    >
      <main
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-[18px] px-7 py-8 text-center"
      >
        <div className="grid h-[58px] w-[58px] place-items-center rounded-[18px] bg-[linear-gradient(135deg,#111827_0%,#334155_100%)] text-2xl font-bold tracking-[0.08em] text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
          L
        </div>
        <div className="text-[22px] font-bold tracking-[-0.02em]">
          正在打开项目
        </div>
        <div className="max-w-[320px] text-sm leading-7 text-slate-500">
          新的无限画布正在准备中，请稍候片刻。
        </div>
        <div className="inline-flex gap-2" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-slate-900/20 animate-loading-dot [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-slate-900/20 animate-loading-dot [animation-delay:160ms]" />
          <span className="h-2 w-2 rounded-full bg-slate-900/20 animate-loading-dot [animation-delay:320ms]" />
        </div>
      </main>
    </div>
  );
}

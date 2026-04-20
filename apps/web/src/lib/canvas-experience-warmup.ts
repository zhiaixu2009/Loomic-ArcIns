"use client";

type PrefetchCapableRouter = {
  prefetch?: (href: string) => void;
};

type IdleHandle = ReturnType<typeof setTimeout> | number;

let scheduledWarmupHandle: IdleHandle | null = null;
let canvasExperienceWarmupPromise: Promise<void> | null = null;

const requestIdle: (callback: IdleRequestCallback) => IdleHandle =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (callback) => window.requestIdleCallback(callback)
    : (callback) =>
        setTimeout(
          () =>
            callback({
              didTimeout: false,
              timeRemaining: () => 0,
            }),
          1,
        );

const cancelIdle: (handle: IdleHandle) => void =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? (handle) => window.cancelIdleCallback(handle as number)
    : (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>);

function prefetchCanvasRoute(router?: PrefetchCapableRouter) {
  router?.prefetch?.("/canvas");
}

export function warmCanvasExperience(router?: PrefetchCapableRouter) {
  prefetchCanvasRoute(router);

  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (canvasExperienceWarmupPromise) {
    return canvasExperienceWarmupPromise;
  }

  canvasExperienceWarmupPromise = Promise.allSettled([
    import("../components/chat-sidebar"),
    import("../components/canvas-editor"),
    import("@excalidraw/excalidraw"),
  ]).then(() => {
    console.info("[canvas-warmup] warmed canvas route dependencies");
  });

  return canvasExperienceWarmupPromise;
}

export function scheduleCanvasExperienceWarmup(
  router?: PrefetchCapableRouter,
) {
  prefetchCanvasRoute(router);

  if (typeof window === "undefined") {
    return () => {};
  }

  if (canvasExperienceWarmupPromise || scheduledWarmupHandle !== null) {
    return () => {};
  }

  scheduledWarmupHandle = requestIdle(() => {
    scheduledWarmupHandle = null;
    void warmCanvasExperience(router);
  });

  return () => {
    if (scheduledWarmupHandle === null) {
      return;
    }

    cancelIdle(scheduledWarmupHandle);
    scheduledWarmupHandle = null;
  };
}

"use client";

const PROJECT_LOADING_PREVIEW_PATH = "/loading-preview";

const PROJECT_LOADING_WINDOW_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Loomic</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(148, 163, 184, 0.16), transparent 36%),
          linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        color: #0f172a;
      }

      .shell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        padding: 32px 28px;
        text-align: center;
      }

      .badge {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #111827 0%, #334155 100%);
        color: #ffffff;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.08em;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
      }

      .headline {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .copy {
        max-width: 320px;
        font-size: 14px;
        line-height: 1.7;
        color: #64748b;
      }

      .dots {
        display: inline-flex;
        gap: 8px;
      }

      .dots span {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.2);
        animation: loomic-project-loading-dot 1.2s ease-in-out infinite;
      }

      .dots span:nth-child(2) {
        animation-delay: 0.16s;
      }

      .dots span:nth-child(3) {
        animation-delay: 0.32s;
      }

      @keyframes loomic-project-loading-dot {
        0%,
        80%,
        100% {
          transform: translateY(0);
          opacity: 0.28;
        }

        40% {
          transform: translateY(-4px);
          opacity: 1;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell" role="status" aria-live="polite">
      <div class="badge" aria-hidden="true">L</div>
      <div class="headline">正在打开项目</div>
      <div class="copy">新的无限画布正在准备中，请稍候片刻。</div>
      <div class="dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </main>
  </body>
</html>`;

export function openProjectLoadingWindow() {
  const newTab = window.open("", "_blank");
  if (!newTab) {
    return null;
  }

  try {
    newTab.document.write(PROJECT_LOADING_WINDOW_HTML);
    newTab.document.close();
    newTab.history.replaceState(null, "", PROJECT_LOADING_PREVIEW_PATH);
    console.info("[create-project] rendered synchronous loading shell in new tab");
  } catch (error) {
    console.warn("[create-project] failed to render synchronous loading shell", error);

    try {
      newTab.location.replace(PROJECT_LOADING_PREVIEW_PATH);
    } catch {
      // Leave the tab open as-is; later canvas navigation may still succeed.
    }
  }

  return newTab;
}

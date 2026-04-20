"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingScreen } from "../../components/loading-screen";
import { warmCanvasExperience } from "../../lib/canvas-experience-warmup";
import {
  CREATE_PROJECT_LAUNCH_ID_KEY,
  LOADING_PREVIEW_OPENED_AT_KEY,
} from "../../lib/project-creation-timing";

export default function LoadingPreviewPage() {
  const router = useRouter();

  useEffect(() => {
    const openedAt = Date.now();

    try {
      sessionStorage.setItem(LOADING_PREVIEW_OPENED_AT_KEY, String(openedAt));
    } catch {
      // sessionStorage write failure is non-fatal
    }

    void warmCanvasExperience(router);

    console.info("[loading-preview] prewarmed canvas route", {
      launchId: sessionStorage.getItem(CREATE_PROJECT_LAUNCH_ID_KEY),
      openedAt,
      route: "/canvas",
    });
  }, [router]);

  return <LoadingScreen />;
}

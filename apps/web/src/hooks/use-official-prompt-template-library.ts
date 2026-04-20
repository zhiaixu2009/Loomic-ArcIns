"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../lib/auth-context";
import {
  addPromptTemplateFavorite,
  loadOfficialPromptTemplateLibrary,
  loadPromptTemplateFavoriteIds,
  removePromptTemplateFavorite,
  type OfficialPromptTemplateLibrary,
} from "../lib/prompt-template-library";

type LoadStatus = "idle" | "loading" | "ready" | "error";

type PromptTemplateLibraryState = {
  status: LoadStatus;
  library: OfficialPromptTemplateLibrary | null;
  favoriteTemplateIds: Set<string>;
  favoritePendingIds: Set<string>;
  error: string | null;
};

const DEFAULT_STATE: PromptTemplateLibraryState = {
  status: "idle",
  library: null,
  favoriteTemplateIds: new Set<string>(),
  favoritePendingIds: new Set<string>(),
  error: null,
};

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "模板库暂时不可用，请稍后再试。";
}

export function useOfficialPromptTemplateLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<PromptTemplateLibraryState>(DEFAULT_STATE);

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setState({
        status: "error",
        library: null,
        favoriteTemplateIds: new Set<string>(),
        favoritePendingIds: new Set<string>(),
        error: "请先登录后再使用模板库。",
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: current.library ? "ready" : "loading",
      error: null,
    }));

    try {
      const [library, favoriteTemplateIds] = await Promise.all([
        loadOfficialPromptTemplateLibrary(),
        loadPromptTemplateFavoriteIds(user.id),
      ]);

      setState({
        status: "ready",
        library,
        favoriteTemplateIds,
        favoritePendingIds: new Set<string>(),
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        error: formatErrorMessage(error),
      }));
    }
  }, [authLoading, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFavorite = useCallback(
    async (templateId: string) => {
      if (!user) {
        setState((current) => ({
          ...current,
          error: "请先登录后再收藏模板。",
        }));
        return;
      }

      const isFavorite = state.favoriteTemplateIds.has(templateId);

      setState((current) => {
        const nextFavoriteIds = new Set(current.favoriteTemplateIds);
        const nextPendingIds = new Set(current.favoritePendingIds);

        if (isFavorite) {
          nextFavoriteIds.delete(templateId);
        } else {
          nextFavoriteIds.add(templateId);
        }
        nextPendingIds.add(templateId);

        return {
          ...current,
          favoriteTemplateIds: nextFavoriteIds,
          favoritePendingIds: nextPendingIds,
          error: null,
        };
      });

      try {
        if (isFavorite) {
          await removePromptTemplateFavorite(user.id, templateId);
        } else {
          await addPromptTemplateFavorite(user.id, templateId);
        }

        setState((current) => {
          const nextPendingIds = new Set(current.favoritePendingIds);
          nextPendingIds.delete(templateId);

          return {
            ...current,
            favoritePendingIds: nextPendingIds,
          };
        });
      } catch (error) {
        setState((current) => {
          const nextFavoriteIds = new Set(current.favoriteTemplateIds);
          const nextPendingIds = new Set(current.favoritePendingIds);

          if (isFavorite) {
            nextFavoriteIds.add(templateId);
          } else {
            nextFavoriteIds.delete(templateId);
          }
          nextPendingIds.delete(templateId);

          return {
            ...current,
            favoriteTemplateIds: nextFavoriteIds,
            favoritePendingIds: nextPendingIds,
            error: formatErrorMessage(error),
          };
        });
      }
    },
    [state.favoriteTemplateIds, user],
  );

  return {
    ...state,
    refresh,
    toggleFavorite,
    isAuthenticated: Boolean(user),
    authLoading,
  };
}

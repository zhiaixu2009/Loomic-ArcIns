"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ProjectLibraryDialog } from "@/components/project-library-dialog";

type ProjectLibraryContextValue = {
  closeProjectLibrary: () => void;
  isProjectLibraryOpen: boolean;
  openProjectLibrary: () => void;
};

const ProjectLibraryContext = createContext<ProjectLibraryContextValue | null>(
  null,
);

export function ProjectLibraryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isProjectLibraryOpen, setProjectLibraryOpen] = useState(false);

  const openProjectLibrary = useCallback(() => {
    console.info("[project-library] opening standalone dialog");
    setProjectLibraryOpen(true);
  }, []);

  const closeProjectLibrary = useCallback(() => {
    setProjectLibraryOpen(false);
  }, []);

  const value = useMemo<ProjectLibraryContextValue>(
    () => ({
      closeProjectLibrary,
      isProjectLibraryOpen,
      openProjectLibrary,
    }),
    [closeProjectLibrary, isProjectLibraryOpen, openProjectLibrary],
  );

  return (
    <ProjectLibraryContext.Provider value={value}>
      {children}
      <ProjectLibraryDialog
        open={isProjectLibraryOpen}
        onOpenChange={setProjectLibraryOpen}
      />
    </ProjectLibraryContext.Provider>
  );
}

export function useProjectLibrary() {
  const context = useContext(ProjectLibraryContext);

  if (!context) {
    throw new Error(
      "useProjectLibrary must be used within a ProjectLibraryProvider.",
    );
  }

  return context;
}

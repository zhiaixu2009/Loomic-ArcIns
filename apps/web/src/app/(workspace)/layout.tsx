"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { CreditHeaderButton } from "@/components/credits/credit-header-button";
import { LoadingScreen } from "@/components/loading-screen";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/auth-context";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const immersiveChrome = pathname === "/home" || pathname === "/canvas";
  const letCanvasOwnLaunchOverlay = pathname === "/canvas";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading && !letCanvasOwnLaunchOverlay) {
    return <LoadingScreen />;
  }

  if (!user && !loading) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg"
      >
        跳到主内容
      </a>
      {immersiveChrome ? null : <AppSidebar />}
      <main
        id="main"
        className="relative flex-1 overflow-x-hidden overflow-y-auto pb-14 md:pb-0"
      >
        {immersiveChrome ? null : (
          <div className="absolute right-4 top-3 z-10">
            <CreditHeaderButton />
          </div>
        )}
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}

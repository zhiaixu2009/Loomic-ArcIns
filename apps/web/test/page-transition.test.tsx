// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: {
      div: ReactModule.forwardRef(function MotionDivStub(
        props: React.HTMLAttributes<HTMLDivElement>,
        ref: React.ForwardedRef<HTMLDivElement>,
      ) {
        const {
          children,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          ...rest
        } = props as React.HTMLAttributes<HTMLDivElement> & {
          initial?: unknown;
          animate?: unknown;
          exit?: unknown;
          transition?: unknown;
        };
        return (
          <div ref={ref} {...rest}>
            {children}
          </div>
        );
      }),
    },
  };
});

import { PageTransition } from "../src/components/page-transition";

describe("PageTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("reserves a stable scrollbar gutter on /home so classic scrollbars do not shift the layout on entry", () => {
    usePathnameMock.mockReturnValue("/home");

    const { container } = render(
      <PageTransition>
        <div>Home content</div>
      </PageTransition>,
    );

    expect(container.firstElementChild).toHaveStyle({
      scrollbarGutter: "stable",
    });
  });

  it("does not reserve a home-only scrollbar gutter on /canvas", () => {
    usePathnameMock.mockReturnValue("/canvas");

    const { container } = render(
      <PageTransition>
        <div>Canvas content</div>
      </PageTransition>,
    );

    expect(container.firstElementChild).not.toHaveStyle({
      scrollbarGutter: "stable",
    });
  });
});

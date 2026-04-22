"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const useStaticEnter = pathname === "/home" || pathname === "/canvas";
  const reserveHomeScrollbarGutter = pathname === "/home";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={useStaticEnter ? false : { opacity: 0, y: 8 }}
        animate={useStaticEnter ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={useStaticEnter ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{
          duration: useStaticEnter ? 0.12 : 0.2,
          ease: useStaticEnter ? "easeOut" : "easeInOut",
        }}
        style={
          reserveHomeScrollbarGutter
            ? {
                scrollbarGutter: "stable",
              }
            : {}
        }
        className="h-full overflow-x-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

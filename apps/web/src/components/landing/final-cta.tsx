"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/landing/motion";

// ---------------------------------------------------------------------------
// Background orbs
// ---------------------------------------------------------------------------

function BackgroundOrbs() {
  return (
    <>
      <style>{`
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-5%, 8%) scale(1.08); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(6%, -5%) scale(1.06); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-3%, -7%) scale(1.05); }
        }
      `}</style>

      {/* Orb 1 — top left */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl"
        style={{
          background: "oklch(0.90 0.17 115 / 0.20)",
          animation: "orbDrift1 14s ease-in-out infinite",
        }}
      />
      {/* Orb 2 — bottom right */}
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl"
        style={{
          background: "oklch(0.90 0.17 115 / 0.15)",
          animation: "orbDrift2 18s ease-in-out infinite",
        }}
      />
      {/* Orb 3 — center */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl"
        style={{
          background: "oklch(0.90 0.17 115 / 0.08)",
          animation: "orbDrift3 22s ease-in-out infinite",
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// FinalCTA
// ---------------------------------------------------------------------------

export function FinalCTA() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-4">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-20 md:py-28 flex flex-col items-center text-center"
          style={{
            background: "oklch(0.13 0 0)",
          }}
        >
          {/* Background orbs */}
          <BackgroundOrbs />

          {/* Headline */}
          <FadeUp>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight max-w-3xl text-white">
              准备好让 AI 改变你的设计流程了吗？
            </h2>
          </FadeUp>

          {/* Subtitle */}
          <FadeUp>
            <p
              className="mt-4 text-lg max-w-xl"
              style={{ color: "oklch(1 0 0 / 0.55)" }}
            >
              加入 10,000+ 创作者，开启你的 AI 设计之旅
            </p>
          </FadeUp>

          {/* CTA button */}
          <FadeUp>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center px-10 py-4 rounded-full text-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "oklch(0.90 0.17 115)",
                color: "oklch(0.18 0 0)",
                boxShadow: "0 0 0 0 oklch(0.90 0.17 115 / 0)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 32px 8px oklch(0.90 0.17 115 / 0.30)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 0 0 oklch(0.90 0.17 115 / 0)";
              }}
            >
              免费开始创作
            </Link>
          </FadeUp>

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-4 text-sm"
            style={{ color: "oklch(1 0 0 / 0.35)" }}
          >
            无需信用卡 · 永久免费版可用
          </motion.p>
        </div>
      </div>
    </section>
  );
}

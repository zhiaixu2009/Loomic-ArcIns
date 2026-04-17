"use client";

import type { ChatSessionSummary } from "@loomic/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeChatSessionTitle } from "@/lib/canvas-localization";

type SessionSelectorProps = {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDelete: (sessionId: string) => void;
};

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function NewChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillOpacity={0.9}
        d="M18.25 3A3.75 3.75 0 0 1 22 6.75v9a3.75 3.75 0 0 1-3.75 3.75h-2.874a.25.25 0 0 0-.16.058l-2.098 1.738a1.75 1.75 0 0 1-2.24-.007l-2.065-1.73a.25.25 0 0 0-.162-.059H5.75A3.75 3.75 0 0 1 2 15.75v-9A3.75 3.75 0 0 1 5.75 3zM5.75 4.5A2.25 2.25 0 0 0 3.5 6.75v9A2.25 2.25 0 0 0 5.75 18h2.901c.412 0 .81.145 1.125.41l2.065 1.73a.25.25 0 0 0 .32 0l2.099-1.738A1.75 1.75 0 0 1 15.376 18h2.874a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25zm6.25 3a.75.75 0 0 1 .75.75v2.25H15a.75.75 0 0 1 0 1.5h-2.25v2.25a.75.75 0 0 1-1.5 0V12H9a.75.75 0 0 1 0-1.5h2.25V8.25A.75.75 0 0 1 12 7.5"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.75 2.5a.75.75 0 0 0-.75.75V4H2.5a.5.5 0 0 0 0 1h.614l.573 7.454A1.75 1.75 0 0 0 5.435 14h5.13a1.75 1.75 0 0 0 1.748-1.546L12.886 5h.614a.5.5 0 0 0 0-1H11v-.75a.75.75 0 0 0-.75-.75h-4.5ZM10 4H6v-.75a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25V4Z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

export function SessionSelector({
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  onDelete,
}: SessionSelectorProps) {
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const [open, setOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? sessions.filter((session) =>
        normalizeChatSessionTitle(session.title).toLowerCase().includes(search.toLowerCase()),
      )
    : sessions;

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
        setConfirmingId(null);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      onSelect(sessionId);
      setOpen(false);
      setConfirmingId(null);
      setSearch("");
    },
    [onSelect],
  );

  const handleDelete = useCallback(
    (sessionId: string) => {
      onDelete(sessionId);
      setConfirmingId(null);
    },
    [onDelete],
  );

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setConfirmingId(null);
            setSearch("");
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors cursor-pointer outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <HistoryIcon className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">
            {activeSession
              ? normalizeChatSessionTitle(activeSession.title)
              : "\u5bf9\u8bdd\u5386\u53f2"}
          </span>
          <svg
            className={`h-3 w-3 opacity-50 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-[260px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            <div className="px-3 pb-2 pt-3">
              <p className="mb-2 text-xs font-medium text-foreground">
                {"\u5386\u53f2\u5bf9\u8bdd"}
              </p>
              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="\u8bf7\u8f93\u5165\u641c\u7d22\u5173\u952e\u8bcd"
                  className="w-full rounded-md border border-input bg-muted py-1.5 pl-7 pr-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-input-border focus:bg-background"
                />
              </div>
            </div>

            <div className="max-h-[240px] overflow-y-auto px-1 pb-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground/70">
                  {search
                    ? "\u65e0\u5339\u914d\u7ed3\u679c"
                    : "\u6682\u65e0\u5bf9\u8bdd"}
                </p>
              ) : null}

              {filtered.map((session) => (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  className={`group flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-xs cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                    session.id === activeSessionId
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => {
                    if (confirmingId !== session.id) {
                      handleSelect(session.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "Enter" || event.key === " ") &&
                      confirmingId !== session.id
                    ) {
                      event.preventDefault();
                      handleSelect(session.id);
                    }
                  }}
                >
                  {confirmingId === session.id ? (
                    <>
                      <span className="flex-1 truncate">
                        {normalizeChatSessionTitle(session.title)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmingId(null);
                          }}
                        >
                          {"\u53d6\u6d88"}
                        </button>
                        <button
                          type="button"
                          className="rounded bg-destructive px-2 py-0.5 text-xs text-destructive-foreground transition-colors outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(session.id);
                          }}
                        >
                          {"\u5220\u9664"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate">
                        {normalizeChatSessionTitle(session.title)}
                      </span>
                      <button
                        type="button"
                        aria-label={`\u5220\u9664 ${normalizeChatSessionTitle(session.title)}`}
                        className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors outline-none group-hover:flex hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmingId(session.id);
                        }}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        title="\u65b0\u5efa\u5bf9\u8bdd"
      >
        <NewChatIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

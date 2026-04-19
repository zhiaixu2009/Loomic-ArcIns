"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { getServerBaseUrl } from "@/lib/env";

type AcceptedRunResponse = {
  runId: string;
  sessionId?: string;
  conversationId?: string;
  status?: string;
};

type ToolActivityEntry = {
  toolCallId: string;
  toolName: string;
  status: string;
  outputSummary?: string;
};

function buildStreamUrl(runId: string) {
  return `${getServerBaseUrl()}/api/agent/runs/${runId}/events`;
}

export function ChatWorkbench() {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState("");
  const [timeline, setTimeline] = useState<string[]>([]);
  const [toolActivity, setToolActivity] = useState<ToolActivityEntry[]>([]);
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    streamRef.current?.close();
    setError(null);
    setStatus("starting");
    setAssistantResponse("");
    setTimeline([]);
    setToolActivity([]);

    const response = await fetch(`${getServerBaseUrl()}/api/agent/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: draft || "Start a Loomic run",
      }),
    });

    if (!response.ok) {
      setStatus("failed");
      setError("Failed to start run.");
      return;
    }

    const accepted = (await response.json()) as AcceptedRunResponse;
    setStatus(accepted.status ?? "accepted");

    const stream = new EventSource(buildStreamUrl(accepted.runId));
    streamRef.current = stream;
    stream.onerror = () => {
      setStatus("failed");
      setError("Failed to stream run events.");
      stream.close();
    };
    stream.onmessage = (messageEvent) => {
      const payload = JSON.parse(messageEvent.data) as Record<string, unknown>;
      const eventType = String(payload.type ?? "unknown");

      setTimeline((currentTimeline) => [...currentTimeline, eventType]);

      if (eventType === "run.started") {
        setStatus("running");
        return;
      }

      if (eventType === "tool.started") {
        setToolActivity((current) => [
          ...current.filter(
            (entry) => entry.toolCallId !== String(payload.toolCallId ?? ""),
          ),
          {
            toolCallId: String(payload.toolCallId ?? ""),
            toolName: String(payload.toolName ?? "unknown_tool"),
            status: "running",
          },
        ]);
        return;
      }

      if (eventType === "tool.completed") {
        setToolActivity((current) => [
          ...current.filter(
            (entry) => entry.toolCallId !== String(payload.toolCallId ?? ""),
          ),
          {
            toolCallId: String(payload.toolCallId ?? ""),
            toolName: String(payload.toolName ?? "unknown_tool"),
            status: "completed",
            ...(typeof payload.outputSummary === "string"
              ? { outputSummary: payload.outputSummary }
              : {}),
          },
        ]);
        return;
      }

      if (eventType === "message.delta") {
        setAssistantResponse((current) => current + String(payload.delta ?? ""));
        return;
      }

      if (eventType === "run.completed") {
        setStatus("completed");
        stream.close();
        return;
      }

      if (eventType === "run.canceled") {
        setStatus("canceled");
        stream.close();
      }
    };
  }

  return (
    <div className="space-y-4">
      <form
        aria-label="Chat composer"
        className="space-y-2"
        onSubmit={handleSubmit}
      >
        <textarea
          aria-label="Chat input"
          className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900"
          type="submit"
        >
          Start run
        </button>
      </form>

      <div role="status" aria-live="polite">
        {status}
      </div>

      {error ? <div role="alert">{error}</div> : null}

      <section aria-label="Assistant response" className="rounded-lg border border-slate-200 p-3">
        {assistantResponse || "No assistant response yet."}
      </section>

      <section aria-label="Tool activity" className="rounded-lg border border-slate-200 p-3">
        {toolActivity.length === 0 ? (
          <p>No tool activity yet.</p>
        ) : (
          toolActivity.map((entry) => (
            <article key={entry.toolCallId} className="space-y-1">
              <div>{entry.toolName}</div>
              <div>{entry.status}</div>
              {entry.outputSummary ? <div>{entry.outputSummary}</div> : null}
            </article>
          ))
        )}
      </section>

      <section aria-label="Stream timeline" className="rounded-lg border border-slate-200 p-3">
        {timeline.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          <ul>
            {timeline.map((eventType, index) => (
              <li key={`${eventType}-${index}`}>{eventType}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

# Loomic Request Lifecycle Architecture

## Full Request Flow

```
USER types message
  ↓
FRONTEND (Vercel)
  ├── ChatSidebar.handleSend()
  ├── Build ContentBlocks (text + attachments + mentions)
  ├── Optimistic state update
  └── ws.startRun(RunCreateRequest)
        ↓
WEBSOCKET (wss://api-production-*.up.railway.app/api/ws)
  ├── Token in query param: ?token=JWT&connectionId=UUID
  ├── Heartbeat: 30s ping, 60s pong timeout
  └── Reconnect: exponential backoff, max 30s
        ↓
API SERVER (Railway: "api" service)
  ├── handler.ts: authenticateAndBind()
  ├── handleRunCommand()
  │   ├── Resolve threadId + model (parallel)
  │   ├── agentRuns.createRun() → runId
  │   ├── connectionManager.bindCanvas(connectionId, canvasId)
  │   ├── Send ACK (with retry)
  │   └── for await (event of streamRun(runId)):
  │       ├── eventBuffer.push(canvasId, event)  ← for reconnect replay
  │       └── pushToCanvas(canvasId, event)       ← broadcast to viewers
  │
  ├── runtime.ts: streamRun()
  │   ├── createLoomicDeepAgent() with tools
  │   ├── LLM decides to call generate_image tool
  │   └── submitImageJob closure:
  │       ├── Tier guard + credit checks
  │       ├── Balance pre-check
  │       ├── jobService.createJob() → DB insert
  │       ├── creditService.deductCredits()
  │       └── Poll every 2s, max 4min (image) / 5min (video)
  │
  └── stream-adapter.ts: adaptDeepAgentStream()
      ├── on_chat_model_stream → message.delta
      ├── on_tool_start → tool.started
      ├── on_tool_end → tool.completed + extractArtifacts()
      └── stream end → run.completed
              ↓
PGMQ (PostgreSQL Message Queue)
  ├── Queue: image_generation_jobs / video_generation_jobs
  ├── Message: { job_id, job_type, workspace_id, canvas_id?, session_id? }
  └── Visibility Timeout: 120s (image) / 300s (video)
              ↓
WORKER (Railway: "worker" service)
  ├── worker.ts: poll loop per queue
  ├── processMessage() → executor dispatch
  │
  ├── image-generation.ts executor:
  │   ├── Fetch full job row from background_jobs
  │   ├── resolveImageProviderName(model)
  │   ├── generateImage(provider, params) → Replicate/Vertex API
  │   ├── Download image from provider CDN
  │   ├── Apply watermark (free-tier only)
  │   ├── Upload to Supabase Storage
  │   ├── Create asset_objects record
  │   ├── Generate public URL
  │   └── Return result → markSucceeded(jobId, result)
  │
  └── video-generation.ts executor: (similar flow)
              ↓
RESULT flows back:
  Worker marks job "succeeded" in DB
  → API server poll detects status change
  → submitImageJob returns { jobId, imageUrl, width, height }
  → Tool returns ImageGenerateResult to agent
  → stream-adapter extracts artifact from tool output
  → handler pushes tool.completed event via WebSocket
  → Frontend receives event, calls onImageGenerated()
  → insertImageOnCanvas() adds image to Excalidraw
```

## Key Services & Ports

| Service | Platform | URL Pattern |
|---------|----------|-------------|
| Frontend | Vercel | `https://loomic-one.vercel.app` |
| API Server | Railway ("api") | `https://api-production-*.up.railway.app` |
| Worker | Railway ("worker") | No public URL (internal only) |
| Database | Supabase | PostgreSQL + PGMQ extension |
| Storage | Supabase Storage | `project-assets` bucket |
| Image/Video API | Replicate / Google Vertex | Various model endpoints |

## Key Tables

| Table | Purpose |
|-------|---------|
| `background_jobs` | Job lifecycle tracking (status, payload, result, credits) |
| `asset_objects` | Generated image/video metadata |
| `chat_sessions` | Conversation sessions per canvas |
| `chat_messages` | Persisted messages (user + assistant) |
| `agent_runs` | Agent run metadata |

## Log Sources

| Source | Service | How to access |
|--------|---------|--------------|
| Agent runtime | api | `railway logs --service api` |
| WebSocket events | api | `railway logs --service api` (grep `ws.`) |
| Job submission | api | `railway logs --service api` (grep `submitImageJob`) |
| Job execution | worker | `railway logs --service worker` |
| Worker lifecycle | worker | `railway logs --service worker` (grep `[worker:`) |
| Frontend errors | Vercel/Browser | `vercel logs` or browser DevTools |
| DB state | Supabase | Direct SQL query on `background_jobs` |

---
name: production-debugger
description: >
  Debug production issues in Loomic by systematically tracing request flows across
  frontend (Vercel), API server, job queue (PGMQ), and worker (Railway).
  Use this skill whenever the user reports a production bug, mentions something
  "not working" on the live site, asks to check logs, or shares a canvas/session URL.
  Also trigger when the user mentions Railway logs, Vercel logs, job stuck,
  generation not completing, WebSocket issues, or any live environment troubleshooting.
---

# Production Debugger

When a user reports a production issue, follow this systematic approach to trace the
problem through the full request lifecycle. Resist guessing — let the data lead you.

## Step 0: Extract Context from the User

Before touching any tool, get these identifiers:

| What | Where to find | Example |
|------|--------------|---------|
| **Canvas ID** | URL param `?id=` | `e15cf18c-5d2d-4b0f-905c-be98ac6d19ba` |
| **Session ID** | URL param `&session=` | `8aaa8bfd-b76c-4cb2-9b91-99056ed89abb` |
| **Symptom** | User description | "image generation stuck for 10 min" |
| **Time window** | When it happened | "about 30 minutes ago" |
| **User account** | Email or user ID | `ultra@test.loomic.com` |

If the user gives you a URL like `https://loomic-one.vercel.app/canvas?id=XXX&session=YYY`,
parse both IDs directly.

## Step 1: Understand the Architecture

Read `references/architecture.md` for the full request lifecycle diagram.
The key insight: a single user action flows through 4 separate systems with different
log sources. You need to check all of them.

```
Frontend (Vercel) → WebSocket → API Server (Railway:api) → PGMQ → Worker (Railway:worker)
```

## Step 2: Collect Logs in Parallel

Pull logs from BOTH Railway services simultaneously. The CLI links to one service
at a time, but `--service` flag lets you query any:

```bash
# API server — handles WebSocket, agent runtime, job submission
railway logs --service api --lines 1000 --json --since 1h

# Worker — processes image/video generation jobs
railway logs --service worker --lines 1000 --json --since 1h
```

### Search Strategy

1. **Start with identifiers**: grep for canvas ID, session ID (first 8 chars)
2. **If no matches**: widen the time window (`--since 2h`, `--since 3h`)
3. **If still nothing**: the request may not have reached the backend — check frontend

```bash
# Search by session (after observability fix, session shows in worker logs too)
railway logs --service api --lines 2000 --json --since 2h | grep "SESSION_ID_HERE"
railway logs --service worker --lines 2000 --json --since 2h | grep "session:SESSION_SHORT"

# Search by canvas
railway logs --service api --lines 2000 --json --since 2h | grep "CANVAS_ID_HERE"

# Search for errors only
railway logs --service api --lines 2000 --json --since 2h | grep -i "error\|fail\|warn"
```

## Step 3: Trace the Request Lifecycle

For each step, look for the corresponding log entry. A missing entry tells you
exactly where the chain broke.

### 3a. Agent Run (API service)

| Log pattern | What it means |
|-------------|--------------|
| `agent.run.started prompt=...` | User message received, agent spawned |
| `agent.run.resolve threadId=... model=...` | Thread and model resolved |
| `agent.run.run_created runId=...` | Run record created |
| `agent.run.ack_sent ... delivered=true` | WebSocket ACK sent to frontend |
| `agent.run.first_token` | LLM started responding |
| `agent.run.stream_done elapsed_ms=...` | Agent finished processing |
| `agent.run.assistant_message_persisted` | Message saved to DB |

**If `agent.run.started` is missing**: request never reached the backend.
Check WebSocket connection, auth token, Vercel deployment.

**If `ack_sent delivered=false`**: WebSocket disconnected between request and response.

### 3b. Job Submission (API service)

| Log pattern | What it means |
|-------------|--------------|
| `[generate_image] job_submit ... {"model":"..."}` | Tool called by agent |
| `[submitImageJob] job_created ... {"jobId":"...","creditsCost":N,"sessionId":"...","runId":"..."}` | Job created in DB + enqueued to PGMQ |
| `[submitImageJob] job_poll_done ... {"pollCount":N,"status":"succeeded"}` | Polling detected completion |
| `[generate_image] job_complete ... {"jobId":"..."}` | Tool returned result to agent |

**If `job_submit` missing**: LLM decided not to call the tool. Check prompt/model.

**If `job_created` missing but `job_submit` present**: credit check or tier guard failed.
Look for `billing.error` events.

**If `job_poll_done` shows `status:"timeout"`**: worker didn't finish within 4min (image)
or 5min (video). Check worker logs.

### 3c. Worker Execution (Worker service)

| Log pattern | What it means |
|-------------|--------------|
| `[worker:W] Processing job JOBID (type) session:SESS` | Worker picked up the job |
| `[image-job:JOBID session:SESS] db_fetch` | Job row loaded from DB |
| `[image-job:JOBID session:SESS] replicate_call_start` | API call to provider started |
| `[image-job:JOBID session:SESS] replicate_call_done +Nms` | Provider returned result |
| `[image-job:JOBID session:SESS] image_download_done` | Image downloaded from CDN |
| `[image-job:JOBID session:SESS] storage_upload_done` | Uploaded to Supabase Storage |
| `[image-job:JOBID session:SESS] asset_record_done` | Asset record created in DB |
| `[worker:W] Job JOBID succeeded +Nms` | Job marked as succeeded |

**If `Processing job` missing**: PGMQ message wasn't consumed.
Check worker health, queue backlog, concurrency limits.

**If `replicate_call_done` takes >120s**: close to VT timeout.
Worker heartbeat may have failed, causing message to re-appear.

### 3d. WebSocket Event Delivery (API service → Frontend)

After the agent tool completes, the stream adapter extracts artifacts and pushes
`tool.completed` events via WebSocket to the frontend.

**Things that can go wrong here:**
- WebSocket disconnected during long generation (check for `ws.disconnected` logs)
- Artifact extraction failed (empty `imageUrl` in tool result)
- Frontend JavaScript error in canvas insertion

### 3e. Frontend (Vercel / Browser)

If backend looks clean, the issue is on the frontend:
- Open the canvas URL in browser, check browser console for errors
- Look at Network tab for failed WebSocket frames
- Check if Supabase Storage signed URLs are accessible

## Step 4: Common Failure Patterns

Read `references/failure-patterns.md` for known failure modes and their fixes.

## Step 5: Verify Fix

After identifying the root cause:
1. If it's a code fix: implement, test locally, push
2. If it's a transient issue (API timeout, quota): document and suggest retry
3. If it's a config issue: check env vars on Railway/Vercel

Always check that the fix addresses the root cause, not just the symptom.

## Tools Reference

```bash
# Railway CLI
railway logs --service api --lines N --json --since TIME
railway logs --service worker --lines N --json --since TIME
railway logs --service api --filter "keyword"

# Supabase DB (if you have access)
# Query background_jobs table for job status
SELECT id, status, session_id, canvas_id, error_message, created_at
FROM background_jobs
WHERE session_id = 'SESSION_ID'
ORDER BY created_at DESC;

# Check Vercel deployment
vercel ls
vercel logs DEPLOYMENT_URL
```

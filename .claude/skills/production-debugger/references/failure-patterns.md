# Known Failure Patterns

Common production failure modes in Loomic, organized by where in the request lifecycle
they occur.

## 1. Request Never Reaches Backend

**Symptom**: No `agent.run.started` log for the session/canvas.

**Possible causes**:
- **WebSocket not connected**: Token expired, Supabase auth issue, or network problem
- **Frontend JS error**: Check browser console for errors in `use-websocket.ts`
- **Vercel deployment issue**: Stale deployment, build failure, or route mismatch
- **CORS/proxy issue**: API URL misconfigured in frontend env vars

**Debug**:
```bash
# Check if any WebSocket connections exist for the user
railway logs --service api --lines 500 --json --since 1h | grep "ws.connected\|ws.disconnected"
```

## 2. Agent Doesn't Call Generate Tool

**Symptom**: `agent.run.started` present but no `[generate_image] job_submit`.

**Possible causes**:
- **LLM decision**: Model chose not to generate (ambiguous prompt)
- **Model error**: LLM API returned error (check for `run.failed` event)
- **Tool not registered**: Provider registry returned no models
- **Prompt too long**: Context exceeded model limits

**Debug**: Look for `run.failed` or `stream_error` in api logs near the `agent.run.started` timestamp.

## 3. Credit/Tier Check Failed

**Symptom**: `[generate_image] job_submit` present but no `job_created`.

**Possible causes**:
- **Insufficient credits**: Balance < cost
- **Tier restriction**: Free plan trying to use premium model
- **Concurrency limit**: Too many concurrent jobs for plan

**Debug**: Look for `billing.error` events in the same time window.
The `pushBillingErrorAndAbort` function sends these via WebSocket.

## 4. Job Created But Worker Never Picks Up

**Symptom**: `[submitImageJob] job_created` in api logs, but no `Processing job` in worker logs.

**Possible causes**:
- **Worker crashed/restarting**: Check Railway deployment status
- **PGMQ queue issue**: Message stuck or queue not created
- **Concurrency full**: All worker slots busy with other jobs
- **VT expired before processing**: Message became invisible

**Debug**:
```bash
# Check worker health
railway logs --service worker --lines 100 --since 30m | grep "Started\|Shutdown\|Error polling"

# Check PGMQ queue depth (via Supabase SQL)
SELECT * FROM pgmq.metrics('image_generation_jobs');
```

## 5. Provider API Timeout/Error

**Symptom**: `replicate_call_start` present but `replicate_call_done` missing or very slow.

**Possible causes**:
- **Replicate cold start**: Model not loaded, first request takes 60-120s
- **API rate limit**: Too many concurrent requests to provider
- **Model-specific issue**: Some models have known reliability issues
- **Network timeout**: 120s guard timeout in replicate provider

**Debug**:
```bash
# Check how long the API call took
railway logs --service worker --lines 500 --json --since 1h | grep "replicate_call"
```

**Common timing expectations**:
- Fast models (Flux Kontext): 5-15s
- Medium models (GPT Image, Recraft): 15-45s
- Slow models (Google Vertex image): 30-120s
- Video generation: 60-300s

## 6. Storage Upload Failed

**Symptom**: `image_download_done` present but `storage_upload_done` missing.

**Possible causes**:
- **Supabase Storage quota**: Bucket full or file size limit
- **Network error**: Connection to Supabase lost
- **Permission**: Storage bucket policy issue

## 7. WebSocket Disconnected During Generation

**Symptom**: Backend shows job succeeded, but frontend shows stuck/generating.

**Possible causes**:
- **Network instability**: Mobile/WiFi switching, VPN reconnect
- **Pong timeout**: 60s no-pong → server terminates connection
- **Tab backgrounded**: Browser throttles WebSocket in background tabs

**Debug**:
```bash
# Check for disconnect events during the run
railway logs --service api --lines 1000 --json --since 1h | grep "disconnected\|pong_timeout"
```

**Frontend recovery**: On reconnect, frontend sends `canvas.resume` command.
Server replays missed events from the event buffer. If events weren't buffered
(buffer overflow or server restart), they're lost.

## 8. Artifact Extraction Failed

**Symptom**: `tool.completed` event sent but no image appears on canvas.

**Possible causes**:
- **Empty imageUrl**: `signed_url` missing from job result → `imageUrl` becomes `""`
- **Schema validation**: `imageArtifactSchema.safeParse` rejected the candidate
- **Missing dimensions**: `width`/`height` null in tool result

**Debug**: Check the tool output format. The stream adapter's `extractArtifacts()`
looks for `record.imageUrl` (string) and validates with zod schema.

## 9. Concurrent Runs Interference

**Symptom**: Multiple runs on same canvas, some results missing.

**Possible causes**:
- **ActiveRun overwrite**: `setActiveRun(canvasId, runId)` only tracks ONE run.
  Second run overwrites tracking, but events from both still push.
- **Frontend state confusion**: Assistant message placeholder from Run 1 may be
  replaced by Run 2's messages, hiding Run 1's tool.completed artifacts.

**Debug**: Look for multiple `agent.run.started` logs within seconds of each other
on the same canvas. Check if both have `stream_done`.

## 10. Google Vertex / Gemini 400 Error

**Symptom**: `MiddlewareError: Google request failed with status code 400`

**Possible causes**:
- **Invalid tool call format**: Gemini model generated malformed tool_call args
- **Context too long**: Conversation history exceeded model's context window
- **Unsupported content**: Image/attachment format not supported by Gemini
- **Rate limit**: Google API quota exceeded (returns 400 not 429 sometimes)

**This is the agent LLM failing, not the image generation provider.**
The error occurs in `AgentNode.#invokeModel`, meaning the Gemini chat model
(used for agent reasoning) failed, not the image generation API.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, "..");

async function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function readText(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return readFile(filePath, "utf8");
}

test("root manifest exposes dev, build, test, and lint scripts", async () => {
  const manifest = await readJson("package.json");

  assert.equal(typeof manifest.scripts?.dev, "string");
  assert.equal(typeof manifest.scripts?.build, "string");
  assert.equal(typeof manifest.scripts?.test, "string");
  assert.equal(typeof manifest.scripts?.lint, "string");
});

test("workspace includes apps and packages globs", async () => {
  const workspace = await readText("pnpm-workspace.yaml");

  assert.match(workspace, /apps\/\*/);
  assert.match(workspace, /packages\/\*/);
});

test("root test command wires node:test and turbo package tests", async () => {
  const manifest = await readJson("package.json");

  assert.match(manifest.scripts["test:workspace"], /node --test/);
  assert.match(manifest.scripts["test:packages"], /turbo run test/);
  assert.match(manifest.scripts.test, /test:workspace/);
  assert.match(manifest.scripts.test, /test:packages/);
});

test("vitest workspace config exists for later package-level adoption", async () => {
  const workspaceConfig = await readText("vitest.workspace.ts");

  assert.match(workspaceConfig, /defineWorkspace/);
  assert.match(workspaceConfig, /tests\/\*\*\/\*\.test\.mjs/);
});

for (const appName of ["web", "server"]) {
  test(`${appName} app scripts perform real validation instead of placeholder logs`, async () => {
    const manifest = await readJson(`apps/${appName}/package.json`);

    assert.equal(typeof manifest.scripts?.build, "string");
    assert.equal(typeof manifest.scripts?.test, "string");
    assert.equal(typeof manifest.scripts?.typecheck, "string");
    assert.doesNotMatch(manifest.scripts.build, /placeholder/i);
    assert.doesNotMatch(manifest.scripts.build, /console\.log/);
    assert.doesNotMatch(manifest.scripts.test, /placeholder/i);
    assert.doesNotMatch(manifest.scripts.test, /console\.log/);
    assert.doesNotMatch(manifest.scripts.typecheck, /placeholder/i);
    assert.doesNotMatch(manifest.scripts.typecheck, /console\.log/);
  });
}

test("@loomic/config exports a single low-drift package contract", async () => {
  const source = await readText("packages/config/src/index.ts");

  assert.doesNotMatch(source, /apps\/\*/);
  assert.doesNotMatch(source, /packages\/\*/);
});

test("shared package placeholder exists for the upcoming contract task", async () => {
  const manifest = await readJson("packages/shared/package.json");

  assert.equal(manifest.name, "@loomic/shared");
  assert.equal(manifest.type, "module");
});

test("root lint baseline is wired through Biome", async () => {
  const manifest = await readJson("package.json");
  const biomeConfig = await readJson("biome.json");

  assert.equal(typeof manifest.devDependencies["@biomejs/biome"], "string");
  assert.match(manifest.scripts.lint, /biome/);
  assert.match(biomeConfig.$schema, /biome/);
  assert.equal(biomeConfig.formatter.enabled, true);
  assert.equal(biomeConfig.linter.enabled, true);
});

test("WSL runtime helper exists to generate canonical Supabase env for docker compose", async () => {
  const runtimeHelper = await readText("scripts/wsl/write-local-docker-env.sh");

  assert.match(runtimeHelper, /supabase status -o env/);
  assert.match(runtimeHelper, /LOOMIC_ENV_FILE=/);
  assert.match(runtimeHelper, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(runtimeHelper, /SUPABASE_URL=/);
  assert.match(runtimeHelper, /SUPABASE_DB_URL=/);
  assert.match(runtimeHelper, /SUPABASE_SERVICE_ROLE_KEY=/);
});

test("docker dev workflow provides a hot-reload web override without rebuilding the production image", async () => {
  const rootManifest = await readJson("package.json");
  const webManifest = await readJson("apps/web/package.json");
  const composeOverride = await readText("docker-compose.dev.yml");
  const dockerfile = await readText("apps/web/Dockerfile.dev");

  assert.match(rootManifest.scripts["docker:dev:web"], /docker-compose\.dev\.yml/);
  assert.match(webManifest.scripts["dev:docker"], /next dev/);
  assert.match(webManifest.scripts["dev:docker"], /0\.0\.0\.0/);
  assert.match(composeOverride, /services:\s*(?:.|\r?\n)*\n\s+web:/);
  assert.match(composeOverride, /dockerfile:\s+apps\/web\/Dockerfile\.dev/);
  assert.match(composeOverride, /CHOKIDAR_USEPOLLING:\s*"true"/);
  assert.match(composeOverride, /WATCHPACK_POLLING:\s*"true"/);
  assert.match(composeOverride, /-\s+\.:\/app/);
  assert.match(composeOverride, /loomic-root-node-modules:\/app\/node_modules/);
  assert.match(composeOverride, /loomic-web-next-cache:\/app\/apps\/web\/\.next/);
  assert.match(dockerfile, /COPY package\.json pnpm-lock\.yaml pnpm-workspace\.yaml turbo\.json tsconfig\.base\.json \.\//);
  assert.match(dockerfile, /RUN pnpm install --frozen-lockfile --ignore-scripts/);
  assert.match(dockerfile, /WEB_PID=\$!/);
  assert.match(dockerfile, /wait .*WEB_PID/);
});

test("docker dev workflow falls back to published bridge networking for Windows localhost access", async () => {
  const composeOverride = await readText("docker-compose.dev.yml");

  assert.match(composeOverride, /web:\s*(?:.|\r?\n)*network_mode:\s*bridge/);
  assert.match(composeOverride, /web:\s*(?:.|\r?\n)*ports:\s*(?:.|\r?\n)*3000:3000/);
  assert.match(composeOverride, /web:\s*(?:.|\r?\n)*extra_hosts:\s*(?:.|\r?\n)*host\.docker\.internal:host-gateway/);
  assert.match(composeOverride, /server:\s*(?:.|\r?\n)*network_mode:\s*bridge/);
  assert.match(composeOverride, /server:\s*(?:.|\r?\n)*ports:\s*(?:.|\r?\n)*3001:3001/);
  assert.match(composeOverride, /server:\s*(?:.|\r?\n)*SUPABASE_URL:\s*\$\{SUPABASE_INTERNAL_URL:-http:\/\/host\.docker\.internal:54321\}/);
  assert.match(composeOverride, /server:\s*(?:.|\r?\n)*SUPABASE_DB_URL:\s*\$\{SUPABASE_INTERNAL_DB_URL:-postgresql:\/\/postgres:postgres@host\.docker\.internal:54322\/postgres\}/);
  assert.match(composeOverride, /worker:\s*(?:.|\r?\n)*network_mode:\s*bridge/);
  assert.match(composeOverride, /worker:\s*(?:.|\r?\n)*extra_hosts:\s*(?:.|\r?\n)*host\.docker\.internal:host-gateway/);
});

test("WSL runtime helper exposes container-safe Supabase endpoints alongside browser-safe URLs", async () => {
  const runtimeHelper = await readText("scripts/wsl/write-local-docker-env.sh");

  assert.match(runtimeHelper, /SUPABASE_INTERNAL_URL=/);
  assert.match(runtimeHelper, /SUPABASE_INTERNAL_DB_URL=/);
  assert.match(runtimeHelper, /host\.docker\.internal/);
});

test("windows runtime launcher scripts keep WSL alive while the local stack is serving localhost", async () => {
  const rootManifest = await readJson("package.json");
  const startScript = await readText("scripts/windows/start-local-runtime.ps1");
  const stopScript = await readText("scripts/windows/stop-local-runtime.ps1");
  const statusScript = await readText("scripts/windows/status-local-runtime.ps1");
  const startRuntimeScript = await readText("scripts/wsl/start-local-runtime.sh");
  const stopRuntimeScript = await readText("scripts/wsl/stop-local-runtime.sh");
  const keepaliveScript = await readText("scripts/wsl/start-keepalive.sh");

  assert.equal(typeof rootManifest.scripts["runtime:start"], "string");
  assert.equal(typeof rootManifest.scripts["runtime:stop"], "string");
  assert.equal(typeof rootManifest.scripts["runtime:status"], "string");
  assert.match(rootManifest.scripts["runtime:start"], /start-local-runtime\.ps1/);
  assert.match(rootManifest.scripts["runtime:stop"], /stop-local-runtime\.ps1/);
  assert.match(rootManifest.scripts["runtime:status"], /status-local-runtime\.ps1/);

  assert.match(startScript, /wsl\.exe -u root/);
  assert.match(startScript, /systemctl start docker/);
  assert.match(startScript, /Invoke-WebRequest/);
  assert.match(startScript, /scripts\/wsl\/start-local-runtime\.sh/);

  assert.match(stopScript, /scripts\/wsl\/stop-local-runtime\.sh/);
  assert.match(stopScript, /wsl\.exe -u root/);

  assert.match(statusScript, /Test-NetConnection/);
  assert.match(statusScript, /127\.0\.0\.1:3000/);
  assert.match(statusScript, /127\.0\.0\.1:3001/);

  assert.match(startRuntimeScript, /supabase start/);
  assert.match(startRuntimeScript, /write-local-docker-env\.sh/);
  assert.match(startRuntimeScript, /docker compose -f docker-compose\.local\.yml -f docker-compose\.dev\.yml/);
  assert.match(startRuntimeScript, /up -d server worker web/);
  assert.match(startRuntimeScript, /start-keepalive\.sh/);

  assert.match(stopRuntimeScript, /docker compose -f docker-compose\.local\.yml -f docker-compose\.dev\.yml/);
  assert.match(stopRuntimeScript, /stop web server worker/);
  assert.match(stopRuntimeScript, /supabase stop/);

  assert.match(keepaliveScript, /loomic-runtime-keepalive/);
  assert.match(keepaliveScript, /nohup/);
  assert.match(keepaliveScript, /sleep 600/);
});

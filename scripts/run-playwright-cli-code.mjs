import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {
    headed: false,
    session: "default",
    url: null,
    codeFile: null,
    cwd: process.cwd(),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token === "--headed") {
      args.headed = true;
      continue;
    }

    if (token.startsWith("--session=")) {
      args.session = token.slice("--session=".length);
      continue;
    }

    if (token === "--session") {
      args.session = argv[index + 1] ?? args.session;
      index += 1;
      continue;
    }

    if (token.startsWith("--url=")) {
      args.url = token.slice("--url=".length);
      continue;
    }

    if (token === "--url") {
      args.url = argv[index + 1] ?? args.url;
      index += 1;
      continue;
    }

    if (token.startsWith("--code-file=")) {
      args.codeFile = token.slice("--code-file=".length);
      continue;
    }

    if (token === "--code-file") {
      args.codeFile = argv[index + 1] ?? args.codeFile;
      index += 1;
      continue;
    }

    if (token.startsWith("--cwd=")) {
      args.cwd = token.slice("--cwd=".length);
      continue;
    }

    if (token === "--cwd") {
      args.cwd = argv[index + 1] ?? args.cwd;
      index += 1;
    }
  }

  return args;
}

function toWslPath(inputPath) {
  const normalized = path.resolve(inputPath).replace(/\\/g, "/");
  const match = normalized.match(/^([A-Za-z]):\/(.*)$/);

  if (!match) {
    return normalized;
  }

  const [, drive, tail] = match;
  return `/mnt/${drive.toLowerCase()}/${tail}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }

      const error = new Error(`Command failed with exit code ${code}`);
      error.code = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

async function runPlaywrightCli(cwdPath, session, cliArgs) {
  const repoWslPath = toWslPath(cwdPath);
  const wrapperPath = "/mnt/c/Users/admin/.codex/skills/playwright/scripts/playwright_cli.sh";

  return run("wsl", [
    "--cd",
    repoWslPath,
    "bash",
    wrapperPath,
    `-s=${session}`,
    ...cliArgs,
  ]);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.codeFile) {
    throw new Error("Missing required --code-file");
  }

  if (args.url) {
    const openArgs = ["open", args.url];
    if (args.headed) {
      openArgs.push("--headed");
    }
    await runPlaywrightCli(args.cwd, args.session, openArgs);
  }

  const code = await readFile(path.resolve(args.codeFile), "utf8");
  await runPlaywrightCli(args.cwd, args.session, ["run-code", code]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_SESSION = "jzxz-scrape";
const OUTPUT_DIR = path.resolve(".tmp/jzxz-scrape");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "jzxz-template-library.raw.json");
const CATALOG_FILE = path.resolve("data/jzxz-template-catalogs.json");
const WRAPPER_PATH =
  "/mnt/c/Users/admin/.codex/skills/playwright/scripts/playwright_cli.sh";

function parseArgs(argv) {
  let session = DEFAULT_SESSION;
  let limit = null;
  let startIndex = 0;
  let outputFile = OUTPUT_FILE;
  let templateLimit = null;

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token.startsWith("--session=")) {
      session = token.slice("--session=".length);
      continue;
    }

    if (token === "--session") {
      session = argv[index + 1] ?? session;
      index += 1;
      continue;
    }

    if (token.startsWith("--limit=")) {
      const value = Number.parseInt(token.slice("--limit=".length), 10);
      limit = Number.isFinite(value) && value > 0 ? value : limit;
      continue;
    }

    if (token === "--limit") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      limit = Number.isFinite(value) && value > 0 ? value : limit;
      index += 1;
      continue;
    }

    if (token.startsWith("--batch-size=")) {
      continue;
    }

    if (token.startsWith("--start-index=")) {
      const value = Number.parseInt(token.slice("--start-index=".length), 10);
      startIndex = Number.isFinite(value) && value >= 0 ? value : startIndex;
      continue;
    }

    if (token === "--start-index") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      startIndex = Number.isFinite(value) && value >= 0 ? value : startIndex;
      index += 1;
      continue;
    }

    if (token.startsWith("--output-file=")) {
      outputFile = path.resolve(token.slice("--output-file=".length));
      continue;
    }

    if (token === "--output-file") {
      outputFile = path.resolve(argv[index + 1] ?? outputFile);
      index += 1;
      continue;
    }

    if (token.startsWith("--template-limit=")) {
      const value = Number.parseInt(token.slice("--template-limit=".length), 10);
      templateLimit = Number.isFinite(value) && value > 0 ? value : templateLimit;
      continue;
    }

    if (token === "--template-limit") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      templateLimit = Number.isFinite(value) && value > 0 ? value : templateLimit;
      index += 1;
    }
  }

  return { session, limit, startIndex, outputFile, templateLimit };
}

function toWslPath(inputPath) {
  const normalized = path.resolve(inputPath).replace(/\\/g, "/");
  const match = normalized.match(/^([A-Za-z]):\/(.*)$/);

  if (!match) {
    return normalized;
  }

  const [, drive, tail] = match;
  return "/mnt/" + drive.toLowerCase() + "/" + tail;
}

function run(command, args, { cwd, stream = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (stream) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (stream) {
        process.stderr.write(text);
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }

      const error = new Error("Command failed with exit code " + code);
      error.code = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

async function runPlaywrightCli(session, args, options = {}) {
  return run(
    "wsl",
    ["--cd", toWslPath(process.cwd()), "bash", WRAPPER_PATH, "-s=" + session, ...args],
    { cwd: process.cwd(), ...options },
  );
}

function flattenCatalogLeaves(catalogs) {
  return catalogs.flatMap((top) => {
    if (Array.isArray(top.children) && top.children.length > 0) {
      return top.children.map((child) => ({
        topName: top.name,
        topCatalogId: top.catalogId,
        topPosition: top.position,
        leafName: child.name,
        leafCatalogId: child.catalogId,
        leafPosition: child.position,
        hasChildren: true,
      }));
    }

    return [
      {
        topName: top.name,
        topCatalogId: top.catalogId,
        topPosition: top.position,
        leafName: top.name,
        leafCatalogId: top.catalogId,
        leafPosition: top.position,
        hasChildren: false,
      },
    ];
  });
}

function buildListRunCode(leaf) {
  return [
    "async (page) => {",
    "  page.setDefaultTimeout(30000);",
    "  const topName = " + JSON.stringify(leaf.topName.trim()) + ";",
    "  const topCatalogId = " + JSON.stringify(leaf.topCatalogId) + ";",
    "  const leafName = " + JSON.stringify(leaf.leafName.trim()) + ";",
    "  const leafCatalogId = " + JSON.stringify(leaf.leafCatalogId) + ";",
    "  const hasChildren = " + JSON.stringify(leaf.hasChildren) + ";",
    "  const clickVisibleExactText = async (selector, text) => {",
    "    const clicked = await page.evaluate(({ selector, text }) => {",
    "      const nodes = Array.from(document.querySelectorAll(selector));",
    "      const target = nodes.find((node) => {",
    "        const value = node.textContent?.trim() ?? '';",
    "        const rect = node.getBoundingClientRect();",
    "        const style = window.getComputedStyle(node);",
    "        return (",
    "          value === text &&",
    "          rect.width > 0 &&",
    "          rect.height > 0 &&",
    "          style.display !== 'none' &&",
    "          style.visibility !== 'hidden' &&",
    "          style.opacity !== '0'",
    "        );",
    "      });",
    "      if (!target) {",
    "        return false;",
    "      }",
    "      target.scrollIntoView({ block: 'center', inline: 'center' });",
    "      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));",
    "      return true;",
    "    }, { selector, text });",
    "    if (!clicked) {",
    "      throw new Error('VISIBLE_TARGET_NOT_FOUND:' + text);",
    "    }",
    "    await page.waitForTimeout(250);",
    "  };",
    "  const tooltip = page.locator('[role=\"tooltip\"]');",
    "  if (!(await tooltip.isVisible().catch(() => false))) {",
    "    await page.getByText(\"模版\", { exact: true }).first().click();",
    "    await page.waitForTimeout(500);",
    "  }",
    "  if (hasChildren) {",
    "    await clickVisibleExactText('div.first_level_eJSoJ1.jzxz', topName);",
    "  }",
    "  const listResponsePromise = page.waitForResponse((response) => {",
    "    return (",
      "      response.request().method() === 'GET' &&",
      "      response.status() === 200 &&",
      "      response.url().includes('/cykj_community/templates?') &&",
      "      response.url().includes('catalogId=' + leafCatalogId)",
    "    );",
    "  });",
    "  if (hasChildren) {",
    "    await clickVisibleExactText('div.second_GDKSG2.jzxz', leafName);",
    "  } else {",
    "    await clickVisibleExactText('div.first_level_eJSoJ1.jzxz', topName);",
    "  }",
    "  const rawList = await (await listResponsePromise).json();",
    "  const templates = Array.isArray(rawList)",
    "    ? rawList",
    "    : Array.isArray(rawList?.data)",
    "      ? rawList.data",
    "      : Array.isArray(rawList?.list)",
    "        ? rawList.list",
    "        : [];",
    "  return {",
    "    topName,",
    "    topCatalogId,",
    "    leafName,",
    "    leafCatalogId,",
    "    templates: templates.map((template, index) => ({",
    "      sortOrder: index + 1,",
    "      title: template?.title ?? null,",
    "      templateId: template?.templateId ?? null,",
    "      coverUrl: template?.coverUrl ?? null,",
    "      width: template?.width ?? null,",
    "      height: template?.height ?? null,",
    "      useCount: template?.useCount ?? 0,",
    "      viewCount: template?.viewCount ?? 0,",
    "      collectCount: template?.collectCount ?? 0,",
    "      createdDate: template?.createdDate ?? null",
    "    }))",
    "  };",
    "}",
  ].join("\n");
}

function buildDetailRunCode(leaf, template) {
  return [
    "async (page) => {",
    "  page.setDefaultTimeout(30000);",
    "  const topName = " + JSON.stringify(leaf.topName.trim()) + ";",
    "  const topCatalogId = " + JSON.stringify(leaf.topCatalogId) + ";",
    "  const leafName = " + JSON.stringify(leaf.leafName.trim()) + ";",
    "  const leafCatalogId = " + JSON.stringify(leaf.leafCatalogId) + ";",
    "  const hasChildren = " + JSON.stringify(leaf.hasChildren) + ";",
    "  const target = " + JSON.stringify(template) + ";",
    "  const clickVisibleExactText = async (selector, text) => {",
    "    const clicked = await page.evaluate(({ selector, text }) => {",
    "      const nodes = Array.from(document.querySelectorAll(selector));",
    "      const targetNode = nodes.find((node) => {",
    "        const value = node.textContent?.trim() ?? '';",
    "        const rect = node.getBoundingClientRect();",
    "        const style = window.getComputedStyle(node);",
    "        return (",
    "          value === text &&",
    "          rect.width > 0 &&",
    "          rect.height > 0 &&",
    "          style.display !== 'none' &&",
    "          style.visibility !== 'hidden' &&",
    "          style.opacity !== '0'",
    "        );",
    "      });",
    "      if (!targetNode) {",
    "        return false;",
    "      }",
    "      targetNode.scrollIntoView({ block: 'center', inline: 'center' });",
    "      targetNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));",
    "      return true;",
    "    }, { selector, text });",
    "    if (!clicked) {",
    "      throw new Error('VISIBLE_TARGET_NOT_FOUND:' + text);",
    "    }",
    "    await page.waitForTimeout(250);",
    "  };",
    "  const isVisibleTemplatePresent = async (text) => {",
    "    return page.evaluate((text) => {",
    "      return Array.from(document.querySelectorAll('div.subject_ttc0Lf.jzxz')).some((node) => {",
    "        const value = node.textContent?.trim() ?? '';",
    "        const rect = node.getBoundingClientRect();",
    "        const style = window.getComputedStyle(node);",
    "        return (",
    "          value === text &&",
    "          rect.width > 0 &&",
    "          rect.height > 0 &&",
    "          style.display !== 'none' &&",
    "          style.visibility !== 'hidden' &&",
    "          style.opacity !== '0'",
    "        );",
    "      });",
    "    }, text);",
    "  };",
    "  const waitForVisibleTemplate = async (text) => {",
    "    await page.waitForFunction((text) => {",
    "      return Array.from(document.querySelectorAll('div.subject_ttc0Lf.jzxz')).some((node) => {",
    "        const value = node.textContent?.trim() ?? '';",
    "        const rect = node.getBoundingClientRect();",
    "        const style = window.getComputedStyle(node);",
    "        return (",
    "          value === text &&",
    "          rect.width > 0 &&",
    "          rect.height > 0 &&",
    "          style.display !== 'none' &&",
    "          style.visibility !== 'hidden' &&",
    "          style.opacity !== '0'",
    "        );",
    "      });",
    "    }, text, { timeout: 30000 });",
    "  };",
    "  const isTopCategoryActive = async (text) => {",
    "    return page.evaluate((text) => {",
    "      const nodes = Array.from(document.querySelectorAll('div.first_level_eJSoJ1.jzxz'));",
    "      const targetNode = nodes.find((node) => {",
    "        const value = node.textContent?.trim() ?? '';",
    "        const rect = node.getBoundingClientRect();",
    "        const style = window.getComputedStyle(node);",
    "        return (",
    "          value === text &&",
    "          rect.width > 0 &&",
    "          rect.height > 0 &&",
    "          style.display !== 'none' &&",
    "          style.visibility !== 'hidden' &&",
    "          style.opacity !== '0'",
    "        );",
    "      });",
    "      return Boolean(targetNode && targetNode.className.includes('active_'));",
    "    }, text);",
    "  };",
    "  const tooltip = page.locator('[role=\"tooltip\"]');",
    "  if (!(await tooltip.isVisible().catch(() => false))) {",
    "    await page.getByText(\"模版\", { exact: true }).first().click();",
    "    await page.waitForTimeout(500);",
    "  }",
    "  if (!(await isVisibleTemplatePresent(target.title))) {",
    "    if (hasChildren) {",
    "      await clickVisibleExactText('div.first_level_eJSoJ1.jzxz', topName);",
    "      const listResponsePromise = page.waitForResponse((response) => {",
    "        return (",
    "          response.request().method() === 'GET' &&",
    "          response.status() === 200 &&",
    "          response.url().includes('/cykj_community/templates?') &&",
    "          response.url().includes('catalogId=' + leafCatalogId)",
    "        );",
    "      });",
    "      await clickVisibleExactText('div.second_GDKSG2.jzxz', leafName);",
    "      await listResponsePromise;",
    "    } else {",
    "      const active = await isTopCategoryActive(topName);",
    "      if (!active) {",
    "        await clickVisibleExactText('div.first_level_eJSoJ1.jzxz', topName);",
    "      }",
    "    }",
    "    await waitForVisibleTemplate(target.title);",
    "  }",
    "  const detailResponsePromise = page.waitForResponse((response) => {",
    "    return (",
      "      response.request().method() === 'GET' &&",
      "      response.status() === 200 &&",
    "      response.url().includes('/cykj_community/templates/' + target.templateId)",
    "    );",
    "  });",
    "  await clickVisibleExactText('div.subject_ttc0Lf.jzxz', target.title);",
    "  const detail = await (await detailResponsePromise).json();",
    "  return {",
    "    topName,",
    "    topCatalogId,",
    "    leafName,",
    "    leafCatalogId,",
    "    template: {",
    "      sortOrder: target.sortOrder ?? null,",
    "      title: detail?.title ?? target.title ?? null,",
    "      templateId: detail?.templateId ?? target.templateId ?? null,",
    "      coverUrl: detail?.coverUrl ?? target.coverUrl ?? null,",
    "      width: detail?.width ?? target.width ?? null,",
    "      height: detail?.height ?? target.height ?? null,",
    "      useCount: detail?.useCount ?? target.useCount ?? 0,",
    "      viewCount: detail?.viewCount ?? target.viewCount ?? 0,",
    "      collectCount: detail?.collectCount ?? target.collectCount ?? 0,",
    "      createdDate: target.createdDate ?? null,",
    "      updatedAt: detail?.updatedAt ?? null,",
    "      lastModifiedDate: detail?.lastModifiedDate ?? null,",
    "      catalogs: Array.isArray(detail?.catalogs) ? detail.catalogs : [],",
    "      prompt: detail?.content?.prompt ?? null,",
    "      versionType: detail?.content?.versionType ?? null,",
    "      resolution: detail?.content?.resolution ?? null,",
    "      aspectRatio: detail?.content?.aspectRatio ?? null,",
    "      baseImageList: Array.isArray(detail?.content?.baseImageList) ? detail.content.baseImageList : [],",
    "      generateImage: detail?.content?.generateImage ?? null",
    "    }",
    "  };",
    "}",
  ].join("\n");
}

function parsePlaywrightResult(stdout) {
  const match = stdout.match(/### Result\r?\n([\s\S]*?)\r?\n### Ran Playwright code/);
  if (!match || !match[1]) {
    const error = new Error("Failed to parse Playwright result payload");
    error.stdout = stdout;
    throw error;
  }

  return JSON.parse(match[1]);
}

async function loadExistingOutput(outputFile) {
  try {
    const raw = await readFile(outputFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveOutput(outputFile, payload) {
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const { session, limit, startIndex, outputFile, templateLimit } = parseArgs(process.argv);
  const catalogs = JSON.parse(await readFile(CATALOG_FILE, "utf8"));
  const leaves = flattenCatalogLeaves(catalogs);
  const slicedLeaves = leaves.slice(startIndex);
  const targetLeaves = limit ? slicedLeaves.slice(0, limit) : slicedLeaves;

  await runPlaywrightCli(
    session,
    ["open", "https://www.jianzhuxuezhang.com/canvas/home", "--headed"],
    { stream: true },
  );

  const existing = await loadExistingOutput(outputFile);
  const completed = new Set(
    Array.isArray(existing?.leaves)
      ? existing.leaves.map((leaf) => leaf?.leafCatalogId).filter(Boolean)
      : [],
  );

  const output = existing ?? {
    generatedAt: new Date().toISOString(),
    source: "建筑学长",
    session,
    catalogs,
    leaves: [],
  };

  for (const leaf of targetLeaves) {
    if (completed.has(leaf.leafCatalogId)) {
      console.log("Skipping already scraped leaf:", leaf.leafName);
      continue;
    }

    console.log("Scraping leaf:", leaf.topName, ">", leaf.leafName);

    const { stdout: listStdout } = await runPlaywrightCli(
      session,
      ["run-code", buildListRunCode(leaf)],
      { stream: false },
    );
    const listResult = parsePlaywrightResult(listStdout);
    const templates = Array.isArray(listResult.templates)
      ? templateLimit
        ? listResult.templates.slice(0, templateLimit)
        : listResult.templates
      : [];
    const details = [];

    for (const template of templates) {
      console.log("  Detail:", template.sortOrder, template.title);
      const { stdout: detailStdout } = await runPlaywrightCli(
        session,
        ["run-code", buildDetailRunCode(leaf, template)],
        { stream: false },
      );
      const detailResult = parsePlaywrightResult(detailStdout);
      if (detailResult.template) {
        details.push(detailResult.template);
      }
    }

    const result = {
      topName: listResult.topName ?? leaf.topName,
      topCatalogId: listResult.topCatalogId ?? leaf.topCatalogId,
      leafName: listResult.leafName ?? leaf.leafName,
      leafCatalogId: listResult.leafCatalogId ?? leaf.leafCatalogId,
      templateCount: details.length,
      templates: details.sort(
        (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
      ),
    };

    output.leaves.push(result);
    output.generatedAt = new Date().toISOString();
    await saveOutput(outputFile, output);

    console.log(
      "Saved leaf:",
      result.leafName,
      "- templates:",
      result.templateCount,
      "- total leaves:",
      output.leaves.length,
      "/",
      targetLeaves.length,
    );
  }

  const totalTemplates = output.leaves.reduce(
    (sum, leaf) => sum + (Array.isArray(leaf.templates) ? leaf.templates.length : 0),
    0,
  );

  console.log(
    "Completed template scrape.",
    "Leaves:",
    output.leaves.length,
    "Templates:",
    totalTemplates,
    "Output:",
    outputFile,
  );
}

main().catch((error) => {
  if (error && typeof error === "object") {
    if ("stdout" in error && typeof error.stdout === "string" && error.stdout) {
      console.error("Captured stdout:");
      console.error(error.stdout);
    }
    if ("stderr" in error && typeof error.stderr === "string" && error.stderr) {
      console.error("Captured stderr:");
      console.error(error.stderr);
    }
  }
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});

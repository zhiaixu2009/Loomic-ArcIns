import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "merge-jzxz-template-shards.mjs");

function runNode(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test("merge script keeps singleton top-level categories without self-parent leaf duplicates", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "jzxz-merge-test-"));
  const outputFile = path.join(tempDir, "library.json");

  try {
    const result = await runNode([SCRIPT_PATH, "--output-file", outputFile]);

    assert.equal(
      result.code,
      0,
      `merge script exited with ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );

    const merged = JSON.parse(await readFile(outputFile, "utf8"));
    const singletonTopKeys = [
      "jiufanggaizao-fd8c",
      "shineizhuangxiu-jw4w",
      "jubuxiugai-574f",
      "fenjingtu-j453",
    ];

    assert.deepEqual(
      merged.categories.filter((category) => category.parentKey === category.key),
      [],
      "singleton top-level categories should not create depth-2 self-parent rows",
    );

    for (const key of singletonTopKeys) {
      const categoryRows = merged.categories.filter((category) => category.key === key);
      assert.equal(
        categoryRows.length,
        1,
        `expected exactly one category row for singleton top category ${key}`,
      );
      assert.equal(categoryRows[0].depth, 1);

      const topCategory = merged.topCategories.find((category) => category.key === key);
      assert.ok(topCategory, `missing top category ${key}`);
      assert.deepEqual(
        topCategory.children,
        [],
        `singleton top category ${key} should not emit a synthetic child`,
      );
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

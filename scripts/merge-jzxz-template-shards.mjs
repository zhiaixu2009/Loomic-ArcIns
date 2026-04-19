import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();
const CATALOG_FILE = path.join(REPO_ROOT, "data", "jzxz-template-catalogs.json");
const DEFAULT_PART_FILES = [
  path.join(REPO_ROOT, ".tmp", "jzxz-scrape", "part-a.json"),
  path.join(REPO_ROOT, ".tmp", "jzxz-scrape", "part-b.json"),
  path.join(REPO_ROOT, ".tmp", "jzxz-scrape", "part-c.json"),
  path.join(REPO_ROOT, ".tmp", "jzxz-scrape", "part-d.json"),
];
const OUTPUT_FILE = path.join(REPO_ROOT, "data", "jzxz-template-library.json");

function parseArgs(argv) {
  let outputFile = OUTPUT_FILE;
  const partFiles = [];

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token.startsWith("--output-file=")) {
      outputFile = path.resolve(token.slice("--output-file=".length));
      continue;
    }

    if (token === "--output-file") {
      outputFile = path.resolve(argv[index + 1] ?? outputFile);
      index += 1;
      continue;
    }

    if (token.startsWith("--part-file=")) {
      partFiles.push(path.resolve(token.slice("--part-file=".length)));
      continue;
    }

    if (token === "--part-file") {
      partFiles.push(path.resolve(argv[index + 1] ?? ""));
      index += 1;
    }
  }

  return {
    outputFile,
    partFiles: partFiles.length > 0 ? partFiles : DEFAULT_PART_FILES,
  };
}

function dedupeText(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function flattenCatalogLeaves(catalogs) {
  return catalogs.flatMap((top) => {
    if (Array.isArray(top.children) && top.children.length > 0) {
      return top.children.map((child) => ({
        topCatalogId: top.catalogId,
        topName: top.name.trim(),
        topPosition: top.position,
        leafCatalogId: child.catalogId,
        leafName: child.name.trim(),
        leafPosition: child.position,
        isTopLevelLeaf: false,
      }));
    }

    return [
      {
        topCatalogId: top.catalogId,
        topName: top.name.trim(),
        topPosition: top.position,
        leafCatalogId: top.catalogId,
        leafName: top.name.trim(),
        leafPosition: top.position,
        isTopLevelLeaf: true,
      },
    ];
  });
}

function toIsoOrNull(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value).toISOString();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  const { outputFile, partFiles } = parseArgs(process.argv);
  const catalogs = await readJson(CATALOG_FILE);
  const catalogLeaves = flattenCatalogLeaves(catalogs);
  const partPayloads = await Promise.all(partFiles.map((filePath) => readJson(filePath)));

  const leafMap = new Map();
  for (const payload of partPayloads) {
    for (const leaf of payload.leaves ?? []) {
      leafMap.set(leaf.leafCatalogId, leaf);
    }
  }

  const missingLeaves = catalogLeaves.filter((leaf) => !leafMap.has(leaf.leafCatalogId));
  if (missingLeaves.length > 0) {
    throw new Error(
      `Missing ${missingLeaves.length} leaves: ${missingLeaves
        .map((leaf) => `${leaf.topName} > ${leaf.leafName}`)
        .join(", ")}`,
    );
  }

  const categoryEntries = [];
  const leafEntries = [];
  const templates = [];

  for (const top of catalogs) {
    categoryEntries.push({
      key: top.catalogId,
      sourceCatalogId: top.catalogId,
      parentKey: null,
      name: top.name.trim(),
      depth: 1,
      sortOrder: top.position,
      templateCount: 0,
    });
  }

  for (const leafMeta of catalogLeaves) {
    const leaf = leafMap.get(leafMeta.leafCatalogId);
    const templateItems = Array.isArray(leaf?.templates) ? leaf.templates : [];

    if (!leafMeta.isTopLevelLeaf) {
      leafEntries.push({
        key: leafMeta.leafCatalogId,
        sourceCatalogId: leafMeta.leafCatalogId,
        parentKey: leafMeta.topCatalogId,
        name: leafMeta.leafName,
        depth: 2,
        sortOrder: leafMeta.leafPosition,
        templateCount: templateItems.length,
      });
    }

    const topCategory = categoryEntries.find((item) => item.key === leafMeta.topCatalogId);
    if (topCategory) {
      topCategory.templateCount += templateItems.length;
    }

    for (const template of templateItems) {
      const previewImageUrls = dedupeText([
        template.coverUrl,
        template.generateImage,
        ...(Array.isArray(template.baseImageList) ? template.baseImageList : []),
      ]);

      templates.push({
        id: template.templateId,
        sourceTemplateId: template.templateId,
        title: template.title,
        promptText: template.prompt,
        coverImageUrl: template.coverUrl,
        outputImageUrl: template.generateImage ?? null,
        previewImageUrls,
        referenceImageUrls: dedupeText(
          Array.isArray(template.baseImageList) ? template.baseImageList : [],
        ),
        topCategoryKey: leafMeta.topCatalogId,
        topCategoryName: leafMeta.topName,
        leafCategoryKey: leafMeta.isTopLevelLeaf
          ? leafMeta.topCatalogId
          : leafMeta.leafCatalogId,
        leafCategoryName: leafMeta.leafName,
        sortOrder: template.sortOrder ?? 0,
        width: template.width ?? null,
        height: template.height ?? null,
        useCount: template.useCount ?? 0,
        viewCount: template.viewCount ?? 0,
        collectCount: template.collectCount ?? 0,
        versionType: template.versionType ?? null,
        resolution: template.resolution ?? null,
        aspectRatio: template.aspectRatio ?? null,
        sourceCatalogPaths: Array.isArray(template.catalogs) ? template.catalogs : [],
        sourceCreatedAtMs: template.createdDate ?? null,
        sourceUpdatedAtMs: template.updatedAt ?? null,
        sourceLastModifiedAtMs: template.lastModifiedDate ?? null,
        sourceCreatedAt: toIsoOrNull(template.createdDate),
        sourceUpdatedAt: toIsoOrNull(template.updatedAt),
        sourceLastModifiedAt: toIsoOrNull(template.lastModifiedDate),
      });
    }
  }

  const normalized = {
    source: "建筑学长",
    generatedAt: new Date().toISOString(),
    catalogCount: categoryEntries.length + leafEntries.length,
    topCategoryCount: categoryEntries.length,
    leafCategoryCount: leafEntries.length,
    templateCount: templates.length,
    categories: [...categoryEntries, ...leafEntries],
    topCategories: catalogs.map((top) => ({
      key: top.catalogId,
      name: top.name.trim(),
      sortOrder: top.position,
      templateCount:
        categoryEntries.find((item) => item.key === top.catalogId)?.templateCount ?? 0,
      children: catalogLeaves
        .filter((leaf) => leaf.topCatalogId === top.catalogId && !leaf.isTopLevelLeaf)
        .map((leaf) => ({
          key: leaf.leafCatalogId,
          name: leaf.leafName,
          sortOrder: leaf.leafPosition,
          templateCount:
            leafEntries.find((item) => item.key === leaf.leafCatalogId)?.templateCount ?? 0,
        })),
    })),
    templates: templates.sort((left, right) => {
      if (left.topCategoryKey !== right.topCategoryKey) {
        const leftTop =
          categoryEntries.find((item) => item.key === left.topCategoryKey)?.sortOrder ?? 0;
        const rightTop =
          categoryEntries.find((item) => item.key === right.topCategoryKey)?.sortOrder ?? 0;
        return leftTop - rightTop;
      }

      if (left.leafCategoryKey !== right.leafCategoryKey) {
        const leftLeaf =
          leafEntries.find((item) => item.key === left.leafCategoryKey)?.sortOrder ?? 0;
        const rightLeaf =
          leafEntries.find((item) => item.key === right.leafCategoryKey)?.sortOrder ?? 0;
        return leftLeaf - rightLeaf;
      }

      return left.sortOrder - right.sortOrder;
    }),
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  console.log(
    `Merged ${partFiles.length} shards into ${outputFile}. ` +
      `Top categories: ${normalized.topCategoryCount}. ` +
      `Leaf categories: ${normalized.leafCategoryCount}. ` +
      `Templates: ${normalized.templateCount}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});

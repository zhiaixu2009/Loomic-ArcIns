/**
 * Marketplace Service for skills.sh
 *
 * Proxies the npm registry to search, inspect, and install skills from the
 * skills.sh marketplace. Skills are standard npm packages tagged with the
 * "agent-skill" keyword and containing a SKILL.md manifest.
 *
 * npm registry endpoints used:
 * - Search:  GET https://registry.npmjs.org/-/v1/search?text=...
 * - Detail:  GET https://registry.npmjs.org/{packageName}
 * - Tarball: via dist.tarball URL in version metadata
 *
 * @module marketplace-service
 */

import {
  importFromTarballUrl,
  type ImportedSkill,
} from "./skill-import-service.js";

// ── Constants ──────────────────────────────────────────────────────────────

const NPM_REGISTRY_BASE = "https://registry.npmjs.org";

/** Keyword used to scope npm search results to skills.sh packages */
const SKILL_KEYWORD = "agent-skill";

const USER_AGENT = "Loomic-Marketplace/1.0";

/** Maximum page size to prevent abuse */
const MAX_PAGE_SIZE = 100;

/** Request timeout for npm registry calls (15 seconds) */
const REGISTRY_TIMEOUT_MS = 15_000;

// ── Types ──────────────────────────────────────────────────────────────────

/** Summary info for a marketplace skill (search result item) */
export interface MarketplaceSkill {
  packageName: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  keywords: string[];
  homepage?: string;
  repository?: string;
  license?: string;
}

/** Paginated search result */
export interface MarketplaceSearchResult {
  skills: MarketplaceSkill[];
  total: number;
}

/** Full detail for a single marketplace skill */
export interface MarketplaceSkillDetail extends MarketplaceSkill {
  readme: string;
  versions: string[];
  tarballUrl: string;
}

/** Result of installing a skill from the marketplace */
export interface MarketplaceInstallResult {
  imported: ImportedSkill;
  packageName: string;
  tarballUrl: string;
}

// ── Error Type ─────────────────────────────────────────────────────────────

export type MarketplaceErrorCode =
  | "search_failed"
  | "package_not_found"
  | "install_failed";

export class MarketplaceError extends Error {
  readonly code: MarketplaceErrorCode;

  constructor(code: MarketplaceErrorCode, message: string) {
    super(message);
    this.name = "MarketplaceError";
    this.code = code;
  }
}

// ── Internal: npm registry response shapes ─────────────────────────────────

/** Shape of an item in the npm search response `objects` array */
interface NpmSearchObject {
  package: {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    author?: { name?: string; username?: string } | string;
    links?: {
      npm?: string;
      homepage?: string;
      repository?: string;
    };
    publisher?: { username?: string };
  };
  score?: {
    detail?: {
      popularity?: number;
    };
  };
}

/** Shape of the npm search endpoint response */
interface NpmSearchResponse {
  objects: NpmSearchObject[];
  total: number;
}

/** Shape of the full npm package metadata response */
interface NpmPackageResponse {
  name: string;
  description?: string;
  readme?: string;
  license?: string;
  keywords?: string[];
  homepage?: string;
  repository?: { url?: string } | string;
  author?: { name?: string } | string;
  "dist-tags"?: { latest?: string };
  versions?: Record<
    string,
    {
      version: string;
      dist?: { tarball?: string };
    }
  >;
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Encode an npm package name for use in registry URLs.
 * Scoped packages like `@scope/name` must be encoded as `%40scope%2Fname`.
 */
function encodePackageName(packageName: string): string {
  return packageName.replace("/", "%2f").replace("@", "%40");
}

/**
 * Fetch a URL from the npm registry with timeout and standard headers.
 * Returns the parsed JSON body.
 *
 * @throws MarketplaceError on network or HTTP errors
 */
async function registryFetch<T>(
  url: string,
  errorCode: MarketplaceErrorCode,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[marketplace] Network error fetching ${url}: ${message}`,
    );
    throw new MarketplaceError(
      errorCode,
      `Failed to connect to npm registry: ${message}`,
    );
  }

  if (response.status === 404) {
    throw new MarketplaceError(
      "package_not_found",
      `Package not found on npm registry: ${url}`,
    );
  }

  if (!response.ok) {
    console.error(
      `[marketplace] HTTP ${response.status} ${response.statusText} for ${url}`,
    );
    throw new MarketplaceError(
      errorCode,
      `npm registry returned HTTP ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Extract the author display name from various npm author field shapes.
 * npm packages represent author as either a string or `{ name, username }`.
 */
function extractAuthor(
  author: NpmSearchObject["package"]["author"],
  publisher: NpmSearchObject["package"]["publisher"],
): string {
  if (!author && !publisher) return "unknown";

  if (typeof author === "string") return author;
  if (author?.name) return author.name;
  if (author?.username) return author.username;
  if (publisher?.username) return publisher.username;

  return "unknown";
}

/**
 * Extract repository URL from the npm repository field, which can be
 * either a string or `{ url }` object.
 */
function extractRepositoryUrl(
  repository: NpmPackageResponse["repository"],
): string | undefined {
  if (!repository) return undefined;
  if (typeof repository === "string") return repository;
  // Clean up git+https:// or git+ssh:// prefixes that npm uses
  const url = repository.url;
  if (!url) return undefined;
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Search the skills.sh marketplace (backed by npm registry).
 *
 * Filters results by the "agent-skill" keyword to scope to skill packages.
 * Supports pagination via `page` (1-indexed) and `limit`.
 *
 * @param query   Free-text search query (combined with "keywords:agent-skill")
 * @param page    Page number, 1-indexed (default 1)
 * @param limit   Results per page (default 20, max 100)
 * @returns Paginated list of marketplace skills
 *
 * @throws MarketplaceError with code "search_failed" on network/registry errors
 */
export async function searchMarketplace(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<MarketplaceSearchResult> {
  // Clamp inputs to reasonable bounds
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)));
  const offset = (safePage - 1) * safeLimit;

  // Build the search text: keyword filter + user query
  const searchText = query.trim()
    ? `keywords:${SKILL_KEYWORD} ${query.trim()}`
    : `keywords:${SKILL_KEYWORD}`;

  const searchUrl = new URL("/-/v1/search", NPM_REGISTRY_BASE);
  searchUrl.searchParams.set("text", searchText);
  searchUrl.searchParams.set("size", String(safeLimit));
  searchUrl.searchParams.set("from", String(offset));

  console.log(
    `[marketplace] Searching: query="${query}" page=${safePage} limit=${safeLimit} offset=${offset}`,
  );

  const data = await registryFetch<NpmSearchResponse>(
    searchUrl.toString(),
    "search_failed",
  );

  const skills: MarketplaceSkill[] = data.objects.map((obj) => {
    const pkg = obj.package;

    const skill: MarketplaceSkill = {
      packageName: pkg.name,
      name: pkg.name,
      description: pkg.description ?? "",
      author: extractAuthor(pkg.author, pkg.publisher),
      version: pkg.version,
      // npm search score popularity ranges 0-1; approximate weekly downloads
      downloads: Math.round((obj.score?.detail?.popularity ?? 0) * 10_000),
      keywords: pkg.keywords ?? [],
    };

    // Assign optional fields only when present (exactOptionalPropertyTypes)
    if (pkg.links?.homepage) skill.homepage = pkg.links.homepage;
    if (pkg.links?.repository) skill.repository = pkg.links.repository;

    return skill;
  });

  console.log(
    `[marketplace] Search returned ${skills.length} results (total: ${data.total})`,
  );

  return { skills, total: data.total };
}

/**
 * Get detailed metadata for a single marketplace skill package.
 *
 * Fetches the full npm package document including README, all versions,
 * and the tarball download URL for the latest version.
 *
 * @param packageName  npm package name (e.g. "@skills-sh/deep-research")
 * @returns Full skill detail including readme, versions, and tarball URL
 *
 * @throws MarketplaceError with code "package_not_found" if the package does not exist
 * @throws MarketplaceError with code "search_failed" on other registry errors
 */
export async function getMarketplaceDetail(
  packageName: string,
): Promise<MarketplaceSkillDetail> {
  const encoded = encodePackageName(packageName);
  const detailUrl = `${NPM_REGISTRY_BASE}/${encoded}`;

  console.log(`[marketplace] Fetching detail for package: ${packageName}`);

  const data = await registryFetch<NpmPackageResponse>(
    detailUrl,
    "search_failed",
  );

  // Determine the latest version
  const latestTag = data["dist-tags"]?.latest;
  if (!latestTag) {
    throw new MarketplaceError(
      "package_not_found",
      `Package "${packageName}" has no published versions (missing dist-tags.latest)`,
    );
  }

  // Extract all version strings, sorted by semver descending for display
  const allVersions = data.versions ? Object.keys(data.versions) : [];
  if (allVersions.length === 0) {
    throw new MarketplaceError(
      "package_not_found",
      `Package "${packageName}" has no versions in the registry`,
    );
  }

  // Get the tarball URL for the latest version
  const latestVersionMeta = data.versions?.[latestTag];
  const tarballUrl = latestVersionMeta?.dist?.tarball;
  if (!tarballUrl) {
    throw new MarketplaceError(
      "package_not_found",
      `Package "${packageName}@${latestTag}" is missing tarball URL in dist metadata`,
    );
  }

  // Extract author from the top-level package metadata
  let author = "unknown";
  if (typeof data.author === "string") {
    author = data.author;
  } else if (data.author?.name) {
    author = data.author.name;
  }

  const detail: MarketplaceSkillDetail = {
    packageName: data.name,
    name: data.name,
    description: data.description ?? "",
    author,
    version: latestTag,
    downloads: 0, // Not available from the detail endpoint; populated in search results
    keywords: data.keywords ?? [],
    readme: data.readme ?? "",
    versions: allVersions,
    tarballUrl,
  };

  // Assign optional fields only when present (exactOptionalPropertyTypes)
  if (data.homepage) detail.homepage = data.homepage;
  const repoUrl = extractRepositoryUrl(data.repository);
  if (repoUrl) detail.repository = repoUrl;
  if (data.license) detail.license = data.license;

  console.log(
    `[marketplace] Detail fetched: ${packageName}@${latestTag} (${allVersions.length} versions, tarball=${tarballUrl})`,
  );

  return detail;
}

/**
 * Install a skill from the marketplace by downloading its npm tarball
 * and parsing the SKILL.md manifest + associated files.
 *
 * This combines getMarketplaceDetail (to resolve the tarball URL) with
 * importFromTarballUrl (to extract and parse the skill contents).
 *
 * @param packageName  npm package name to install
 * @returns The imported skill data, package name, and tarball URL
 *
 * @throws MarketplaceError with code "package_not_found" if the package does not exist
 * @throws MarketplaceError with code "install_failed" if download or parsing fails
 */
export async function installFromMarketplace(
  packageName: string,
): Promise<MarketplaceInstallResult> {
  console.log(`[marketplace] Installing skill from package: ${packageName}`);

  let detail: MarketplaceSkillDetail;
  try {
    detail = await getMarketplaceDetail(packageName);
  } catch (err) {
    // Re-throw MarketplaceErrors as-is (package_not_found, etc.)
    if (err instanceof MarketplaceError) throw err;

    const message = err instanceof Error ? err.message : String(err);
    throw new MarketplaceError(
      "install_failed",
      `Failed to fetch package detail for "${packageName}": ${message}`,
    );
  }

  let imported: ImportedSkill;
  try {
    imported = await importFromTarballUrl(detail.tarballUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[marketplace] Tarball import failed for ${packageName}: ${message}`,
    );
    throw new MarketplaceError(
      "install_failed",
      `Failed to extract skill from "${packageName}" tarball: ${message}`,
    );
  }

  // Override sourceUrl to point to the npm package page for traceability
  imported.sourceUrl = `https://www.npmjs.com/package/${packageName}`;

  console.log(
    `[marketplace] Installed skill "${imported.manifest.name}" from ${packageName} (${imported.files.length} files)`,
  );

  return {
    imported,
    packageName,
    tarballUrl: detail.tarballUrl,
  };
}

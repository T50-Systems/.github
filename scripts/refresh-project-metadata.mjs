import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateManifest, validateMetadata } from "./project-directory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "data", "public-projects.json");
const METADATA_PATH = path.join(ROOT, "data", "public-project-metadata.json");

export function normalizePublicRepository(payload, organization, approvedName) {
  const expectedFullName = `${organization}/${approvedName}`;
  if (!payload || payload.name !== approvedName || payload.full_name !== expectedFullName || payload.owner?.login !== organization) {
    throw new Error(`${approvedName}: GitHub returned mismatched repository identity`);
  }
  if (payload.private !== false || payload.visibility !== "public") {
    throw new Error(`${approvedName}: refusing metadata that is not explicitly public`);
  }
  return {
    name: approvedName,
    visibility: "public",
    private: false,
    description: typeof payload.description === "string" ? payload.description.trim() || null : null,
    topics: Array.isArray(payload.topics) ? [...new Set(payload.topics)].sort() : [],
  };
}

async function fetchApprovedRepository(organization, entry, token, fetchImplementation) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "t50-public-project-directory-refresh",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(organization)}/${encodeURIComponent(entry.name)}`;
  const response = await fetchImplementation(endpoint, { headers });
  if (!response.ok) throw new Error(`${entry.name}: GitHub metadata request failed with HTTP ${response.status}`);
  return normalizePublicRepository(await response.json(), organization, entry.name);
}

export async function refreshProjectMetadata({
  manifestPath = MANIFEST_PATH,
  metadataPath = METADATA_PATH,
  token = process.env.GITHUB_TOKEN,
  fetchImplementation = fetch,
  dryRun = false,
} = {}) {
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  const repositories = [];
  for (const entry of manifest.repositories) {
    repositories.push(await fetchApprovedRepository(manifest.organization, entry, token, fetchImplementation));
  }
  const metadata = validateMetadata({ version: 1, repositories }, manifest);
  const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
  if (dryRun) process.stdout.write(serialized);
  else await writeFile(metadataPath, serialized, "utf8");
  return metadata;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arguments_ = process.argv.slice(2);
  const unsupported = arguments_.filter((argument) => argument !== "--dry-run");
  if (unsupported.length) {
    console.error(`unknown argument: ${unsupported[0]}`);
    process.exitCode = 1;
  } else {
    await refreshProjectMetadata({ dryRun: arguments_.includes("--dry-run") }).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

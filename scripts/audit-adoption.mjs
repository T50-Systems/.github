import { appendFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const ORG = process.env.T50_ORG ?? "T50-Systems";
const TOKEN = process.env.ORG_AUDIT_TOKEN || process.env.GITHUB_TOKEN;
const CATEGORIES = ["code_of_conduct", "contributing", "issue_template", "pull_request_template", "license", "readme"];

export function classifyCommunityFile(file, consumerRepo) {
  if (!file?.html_url) return "missing";
  const match = file.html_url.match(/github\.com\/([^/]+\/[^/]+)\/blob\//i);
  if (!match) return "unknown";
  return match[1].toLowerCase() === consumerRepo.toLowerCase() ? "override" : "inherited";
}

async function request(path) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN or ORG_AUDIT_TOKEN is required");
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "t50-community-adoption-audit",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.json();
}

async function listPublicRepositories() {
  const repositories = [];
  for (let page = 1; ; page += 1) {
    const batch = await request(`/orgs/${ORG}/repos?type=public&per_page=100&page=${page}`);
    repositories.push(...batch.filter((repo) => !repo.archived));
    if (batch.length < 100) return repositories;
  }
}

export async function runAudit() {
  const repositories = await listPublicRepositories();
  const results = [];
  for (const repository of repositories) {
    const profile = await request(`/repos/${ORG}/${repository.name}/community/profile`);
    const states = Object.fromEntries(CATEGORIES.map((category) => [category, classifyCommunityFile(profile.files?.[category], `${ORG}/${repository.name}`)]));
    results.push({ repository: repository.name, health: profile.health_percentage, states });
  }
  return results;
}

function render(results) {
  const totals = { inherited: 0, override: 0, missing: 0, unknown: 0 };
  for (const result of results) for (const state of Object.values(result.states)) totals[state] += 1;
  const lines = [
    "# Community adoption audit",
    "",
    `Public active repositories: ${results.length}`,
    `Inherited files: ${totals.inherited}`,
    `Repository overrides: ${totals.override}`,
    `Missing files: ${totals.missing}`,
    `Unknown sources: ${totals.unknown}`,
    "",
    "| Repository | Health | Missing categories |",
    "|---|---:|---|",
  ];
  for (const result of results) {
    const missing = Object.entries(result.states).filter(([, state]) => state === "missing").map(([category]) => category).join(", ") || "—";
    lines.push(`| \`${result.repository}\` | ${result.health}% | ${missing} |`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const results = await runAudit();
  const markdown = render(results);
  await writeFile("community-adoption-report.md", markdown, "utf8");
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  console.log(markdown);
  if (results.some((result) => Object.values(result.states).includes("missing"))) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { generateProjectDirectory } from "../scripts/generate-project-directory.mjs";
import { escapeMarkdownTableCell, renderProjectDirectory, validateManifest } from "../scripts/project-directory.mjs";
import { normalizePublicRepository, refreshProjectMetadata } from "../scripts/refresh-project-metadata.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ROOT = path.join(ROOT, "tests", "fixtures", "project-directory");

async function fixture(name) {
  return JSON.parse(await readFile(path.join(FIXTURE_ROOT, name), "utf8"));
}

function publicPayload(organization, name, overrides = {}) {
  return {
    name,
    full_name: `${organization}/${name}`,
    owner: { login: organization },
    private: false,
    visibility: "public",
    description: `${name} description`,
    topics: ["tooling"],
    ...overrides,
  };
}

test("renderer is deterministic, sorted, escaped, and snapshot-stable", async () => {
  const rendered = renderProjectDirectory(await fixture("manifest.json"), await fixture("metadata.json"));
  const snapshot = await readFile(path.join(FIXTURE_ROOT, "PROFILE.README.snapshot.md"), "utf8");
  assert.equal(rendered, snapshot);
  assert.ok(rendered.indexOf("alpha-tool") < rendered.indexOf("zeta-tool"));
  assert.match(rendered, /First line<br>second line/);
  assert.match(rendered, /Preview \\| opt-in/);
  assert.equal(escapeMarkdownTableCell("a\\b|c\nd"), "a\\\\b\\|c<br>d");
});

test("manifest requires explicit approval and editorial metadata", () => {
  assert.throws(() => validateManifest({
    version: 1,
    organization: "Example-Org",
    repositories: [{ name: "tool", approved: false, status: "Active", intendedUsers: "Users" }],
  }), /approved must be explicitly true/);
  assert.throws(() => validateManifest({
    version: 1,
    organization: "Example-Org",
    repositories: [{ name: "tool", approved: true, status: "", intendedUsers: "Users" }],
  }), /status must be a non-empty string/);
});

test("renderer rejects private, missing, and unapproved repository metadata", () => {
  const manifest = {
    version: 1,
    organization: "Example-Org",
    repositories: [{ name: "tool", approved: true, status: "Active", intendedUsers: "Users" }],
  };
  assert.throws(() => renderProjectDirectory(manifest, {
    version: 1,
    repositories: [{ name: "tool", private: true, visibility: "private", description: "secret", topics: [] }],
  }), /not verified public/);
  assert.throws(() => renderProjectDirectory(manifest, { version: 1, repositories: [] }), /missing approved repository tool/);
  assert.throws(() => renderProjectDirectory(manifest, {
    version: 1,
    repositories: [
      { name: "tool", private: false, visibility: "public", description: "ok", topics: [] },
      { name: "other", private: false, visibility: "public", description: "no", topics: [] },
    ],
  }), /unapproved repository other/);
});

test("remote normalization rejects private or identity-mismatched responses", () => {
  assert.throws(
    () => normalizePublicRepository(publicPayload("Example-Org", "tool", { private: true, visibility: "private" }), "Example-Org", "tool"),
    /not explicitly public/,
  );
  assert.throws(
    () => normalizePublicRepository(publicPayload("Other-Org", "tool"), "Example-Org", "tool"),
    /mismatched repository identity/,
  );
});

test("refresh requests only explicitly allowlisted repository endpoints", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "project-directory-refresh-"));
  const manifestPath = path.join(root, "manifest.json");
  const metadataPath = path.join(root, "metadata.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    organization: "Example-Org",
    repositories: [
      { name: "zeta", approved: true, status: "Active", intendedUsers: "Users" },
      { name: "alpha", approved: true, status: "Active", intendedUsers: "Users" },
    ],
  }), "utf8");
  const requested = [];
  const fakeFetch = async (url) => {
    requested.push(url);
    const name = new URL(url).pathname.split("/").at(-1);
    return { ok: true, json: async () => publicPayload("Example-Org", name) };
  };

  await refreshProjectMetadata({ manifestPath, metadataPath, fetchImplementation: fakeFetch, token: "test-token" });
  assert.deepEqual(requested, [
    "https://api.github.com/repos/Example-Org/alpha",
    "https://api.github.com/repos/Example-Org/zeta",
  ]);
  assert.ok(requested.every((url) => url.includes("/repos/Example-Org/")));
  const stored = JSON.parse(await readFile(metadataPath, "utf8"));
  assert.deepEqual(stored.repositories.map(({ name }) => name), ["alpha", "zeta"]);
});

test("refresh workflow opens a draft PR with bounded generated paths", async () => {
  const workflowText = await readFile(path.join(ROOT, ".github", "workflows", "refresh-project-directory.yml"), "utf8");
  const workflow = YAML.parse(workflowText);
  assert.equal(workflow.permissions.contents, "read");
  assert.deepEqual(workflow.jobs.refresh.permissions, { contents: "write", "pull-requests": "write" });
  const pullRequestStep = workflow.jobs.refresh.steps.find((step) => step.name === "Open review pull request");
  assert.equal(pullRequestStep.with.draft, "always-true");
  assert.equal(pullRequestStep.with.branch, "automation/refresh-public-project-directory");
  assert.deepEqual(pullRequestStep.with["add-paths"].trim().split(/\r?\n/), [
    "data/public-project-metadata.json",
    "PROFILE/README.md",
  ]);
  assert.doesNotMatch(workflowText, /git push|auto-merge|gh pr merge/i);
});

test("--check detects generated profile drift", async () => {
  const output = path.join(await mkdtemp(path.join(os.tmpdir(), "project-directory-check-")), "README.md");
  const arguments_ = [
    "--manifest", path.join(FIXTURE_ROOT, "manifest.json"),
    "--metadata", path.join(FIXTURE_ROOT, "metadata.json"),
    "--output", output,
  ];
  await generateProjectDirectory(arguments_);
  await generateProjectDirectory([...arguments_, "--check"]);
  await writeFile(output, "drift\n", "utf8");
  await assert.rejects(() => generateProjectDirectory([...arguments_, "--check"]), /has drifted/);
});

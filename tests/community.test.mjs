import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { classifyCommunityFile } from "../scripts/audit-adoption.mjs";
import { validateIssueForm, validateMarkdownLinks } from "../scripts/validate-community.mjs";

test("issue forms reject repository-local default labels", () => {
  const errors = validateIssueForm({
    name: "Bug",
    description: "Report a bug",
    labels: ["bug"],
    body: [{ type: "textarea", id: "summary", attributes: { label: "Summary" } }],
  });
  assert.match(errors.join("\n"), /cannot require repository-local labels/);
});

test("issue forms accept portable required fields", () => {
  const errors = validateIssueForm({
    name: "Bug",
    description: "Report a bug",
    body: [{ type: "textarea", id: "summary", attributes: { label: "Summary" } }],
  });
  assert.deepEqual(errors, []);
});

test("markdown validation catches missing local links and insecure URLs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "community-validation-"));
  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "docs", "exists.md"), "ok", "utf8");
  const errors = await validateMarkdownLinks("README.md", "[ok](docs/exists.md) [missing](docs/nope.md) [http](http://example.com)", root);
  assert.equal(errors.length, 2);
  assert.match(errors.join("\n"), /missing local link/);
  assert.match(errors.join("\n"), /must use HTTPS/);
});

test("community profile sources distinguish inherited and overridden files", () => {
  assert.equal(classifyCommunityFile({ html_url: "https://github.com/T50-Systems/.github/blob/main/CONTRIBUTING.md" }, "T50-Systems/pi-thread-goal"), "inherited");
  assert.equal(classifyCommunityFile({ html_url: "https://github.com/T50-Systems/pi-thread-goal/blob/main/README.md" }, "T50-Systems/pi-thread-goal"), "override");
  assert.equal(classifyCommunityFile(null, "T50-Systems/pi-thread-goal"), "missing");
});

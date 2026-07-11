import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_FORM_TYPES = new Set(["markdown", "input", "textarea", "dropdown", "checkboxes"]);

export function validateIssueForm(document, file = "issue form") {
  const errors = [];
  if (!document || typeof document !== "object") return [`${file}: expected an object`];
  for (const field of ["name", "description", "body"]) {
    if (!(field in document)) errors.push(`${file}: missing ${field}`);
  }
  if (document.labels?.length) {
    errors.push(`${file}: default forms cannot require repository-local labels`);
  }
  if (!Array.isArray(document.body)) return [...errors, `${file}: body must be an array`];
  const ids = new Set();
  for (const [index, block] of document.body.entries()) {
    if (!block || !ALLOWED_FORM_TYPES.has(block.type)) {
      errors.push(`${file}: body[${index}] has unsupported type ${block?.type}`);
      continue;
    }
    if (block.id) {
      if (ids.has(block.id)) errors.push(`${file}: duplicate id ${block.id}`);
      ids.add(block.id);
    }
    if (block.type !== "markdown" && !block.attributes?.label) {
      errors.push(`${file}: body[${index}] is missing attributes.label`);
    }
    if (block.type === "markdown" && !block.attributes?.value) {
      errors.push(`${file}: markdown block ${index} is missing attributes.value`);
    }
  }
  return errors;
}

export async function validateMarkdownLinks(file, text, root = ROOT) {
  const errors = [];
  const expression = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(expression)) {
    const target = match[1].trim();
    if (!target || target.startsWith("#") || target.startsWith("mailto:")) continue;
    if (/^https?:\/\//i.test(target)) {
      if (!target.startsWith("https://")) errors.push(`${file}: external links must use HTTPS: ${target}`);
      try { new URL(target); } catch { errors.push(`${file}: invalid URL ${target}`); }
      continue;
    }
    const relative = decodeURIComponent(target.split("#", 1)[0]);
    const resolved = path.resolve(path.dirname(path.resolve(root, file)), relative);
    try { await access(resolved); } catch { errors.push(`${file}: missing local link target ${target}`); }
  }
  return errors;
}

async function markdownFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(absolute, relative));
    else if (entry.name.endsWith(".md")) files.push(relative);
  }
  return files;
}

export async function validateRepository(root = ROOT) {
  const errors = [];
  const issueDirectory = path.join(root, ".github", "ISSUE_TEMPLATE");
  for (const name of await readdir(issueDirectory)) {
    if (!name.endsWith(".yml") || name === "config.yml") continue;
    const relative = path.join(".github", "ISSUE_TEMPLATE", name);
    const document = YAML.parse(await readFile(path.join(root, relative), "utf8"));
    errors.push(...validateIssueForm(document, relative));
  }
  const configPath = path.join(issueDirectory, "config.yml");
  const config = YAML.parse(await readFile(configPath, "utf8"));
  for (const [index, link] of (config.contact_links ?? []).entries()) {
    if (!String(link.url ?? "").startsWith("https://")) errors.push(`config.yml: contact_links[${index}] must use HTTPS`);
  }
  const securityLink = (config.contact_links ?? []).find((link) => link.name === "Security report");
  if (!securityLink?.url?.endsWith("/security/advisories/new")) {
    errors.push("config.yml: Security report must link directly to private vulnerability reporting");
  }
  const rootSecurity = await readFile(path.join(root, "SECURITY.md"), "utf8");
  const defaultSecurity = await readFile(path.join(root, ".github", "SECURITY.md"), "utf8");
  if (rootSecurity !== defaultSecurity) errors.push("SECURITY.md and .github/SECURITY.md have drifted");
  for (const relative of await markdownFiles(root)) {
    const text = await readFile(path.join(root, relative), "utf8");
    errors.push(...await validateMarkdownLinks(relative, text, root));
  }
  return errors;
}

async function main() {
  const errors = await validateRepository();
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("community validation ok");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

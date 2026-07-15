const ORGANIZATION_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_NAME = /^[A-Za-z0-9._-]+$/;
const TOPIC = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

function compareNames(left, right) {
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

function nonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

export function validateManifest(manifest) {
  if (!manifest || manifest.version !== 1) throw new Error("manifest.version must be 1");
  const organization = nonEmptyString(manifest.organization, "manifest.organization");
  if (!ORGANIZATION_NAME.test(organization)) throw new Error("manifest.organization is invalid");
  if (!Array.isArray(manifest.repositories) || manifest.repositories.length === 0) {
    throw new Error("manifest.repositories must be a non-empty array");
  }

  const names = new Set();
  const repositories = manifest.repositories.map((entry, index) => {
    const prefix = `manifest.repositories[${index}]`;
    const name = nonEmptyString(entry?.name, `${prefix}.name`);
    if (!REPOSITORY_NAME.test(name)) throw new Error(`${prefix}.name is invalid`);
    if (names.has(name)) throw new Error(`manifest contains duplicate repository ${name}`);
    names.add(name);
    if (entry.approved !== true) throw new Error(`${prefix}.approved must be explicitly true`);
    return {
      name,
      approved: true,
      status: nonEmptyString(entry.status, `${prefix}.status`),
      intendedUsers: nonEmptyString(entry.intendedUsers, `${prefix}.intendedUsers`),
    };
  });

  return { version: 1, organization, repositories: repositories.sort(compareNames) };
}

export function validateMetadata(metadata, approvedManifest) {
  if (!metadata || metadata.version !== 1) throw new Error("metadata.version must be 1");
  if (!Array.isArray(metadata.repositories)) throw new Error("metadata.repositories must be an array");

  const approvedNames = new Set(approvedManifest.repositories.map(({ name }) => name));
  const seen = new Set();
  const repositories = metadata.repositories.map((entry, index) => {
    const prefix = `metadata.repositories[${index}]`;
    const name = nonEmptyString(entry?.name, `${prefix}.name`);
    if (!approvedNames.has(name)) throw new Error(`metadata contains unapproved repository ${name}`);
    if (seen.has(name)) throw new Error(`metadata contains duplicate repository ${name}`);
    seen.add(name);
    if (entry.private !== false || entry.visibility !== "public") {
      throw new Error(`${name} is not verified public metadata`);
    }
    if (entry.description !== null && typeof entry.description !== "string") {
      throw new Error(`${prefix}.description must be a string or null`);
    }
    if (!Array.isArray(entry.topics) || entry.topics.some((topic) => typeof topic !== "string" || !TOPIC.test(topic))) {
      throw new Error(`${prefix}.topics contains an invalid GitHub topic`);
    }
    return {
      name,
      visibility: "public",
      private: false,
      description: entry.description?.trim() || null,
      topics: [...new Set(entry.topics)].sort(),
    };
  });

  for (const name of approvedNames) {
    if (!seen.has(name)) throw new Error(`metadata is missing approved repository ${name}`);
  }
  return { version: 1, repositories: repositories.sort(compareNames) };
}

export function escapeMarkdownTableCell(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/\r?\n|\r/g, "<br>");
}

export function renderProjectDirectory(manifest, metadata) {
  const approvedManifest = validateManifest(manifest);
  const approvedMetadata = validateMetadata(metadata, approvedManifest);
  const metadataByName = new Map(approvedMetadata.repositories.map((entry) => [entry.name, entry]));
  const rows = approvedManifest.repositories.map((entry) => {
    const remote = metadataByName.get(entry.name);
    const description = remote.description ?? "No public description provided.";
    const topics = remote.topics.length ? remote.topics.map((topic) => `\`${topic}\``).join(", ") : "—";
    const url = `https://github.com/${approvedManifest.organization}/${entry.name}`;
    return `| [\`${entry.name}\`](${url}) | ${escapeMarkdownTableCell(description)} | ${topics} | ${escapeMarkdownTableCell(entry.intendedUsers)} | ${escapeMarkdownTableCell(entry.status)} |`;
  });

  return [
    "# T50-Systems",
    "",
    "T50-Systems builds focused software products, AI-oriented developer tooling, and operational automation. Visit [t50.systems](https://t50.systems) for the canonical public website.",
    "",
    "## Public projects",
    "",
    "| Project | Purpose | Topics | Intended users | Status |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "Private product and research repositories are intentionally omitted from the public directory.",
    "",
    "## Participate",
    "",
    "- Read the target repository README and contribution guidance before starting.",
    "- Use its issue forms for bugs, features, and maintenance requests.",
    "- Follow the organization [Code of Conduct](https://github.com/T50-Systems/.github/blob/main/CODE_OF_CONDUCT.md).",
    "- Ask support questions through the repository's documented channel.",
    "",
    "## Security",
    "",
    "Report vulnerabilities privately through the affected repository's Security tab. If that is unavailable, use [organization-default private vulnerability reporting](https://github.com/T50-Systems/.github/security/advisories/new). Never disclose exploit details, credentials, customer data, or private session files in public issues.",
    "",
    "## Profile maintenance",
    "",
    "The community policy maintainer reviews the approved manifest and generated directory quarterly and after public repository launches, archives, or renames. Repository descriptions and topics are refreshed from public GitHub metadata through a review-only pull request.",
    "",
  ].join("\n");
}

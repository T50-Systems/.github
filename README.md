# T50-Systems community defaults

This repository defines organization-wide community health files for T50-Systems repositories. GitHub applies these defaults when a repository does not provide a project-specific override.

## Included defaults

- `CODE_OF_CONDUCT.md` — behavior and enforcement baseline.
- `CONTRIBUTING.md` — contribution workflow and PR expectations.
- `SECURITY.md` — canonical private vulnerability reporting policy.
- `SUPPORT.md` — support routing for bugs, features, questions, and security.
- `.github/ISSUE_TEMPLATE/*.yml` — portable bug, feature, and task forms.
- `.github/pull_request_template.md` — default pull request checklist.
- `PROFILE/README.md` — maintained public organization/project directory.

See [`docs/INHERITANCE.md`](docs/INHERITANCE.md) for recognized paths, override precedence, preview instructions, and GitHub limitations. See [`docs/GOVERNANCE.md`](docs/GOVERNANCE.md) for ownership, review continuity, and change control.

## Local validation

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run validate
pnpm run directory:dry-run
```

The same test and validation commands run on pull requests. Validation parses issue forms, rejects nonportable default labels, checks required contact links, verifies local Markdown links, detects drift between the canonical and compatibility security policy copies, and fails when `PROFILE/README.md` differs from its approved inputs.

## Public project directory

The organization profile is rendered deterministically from a checked-in public-repository allowlist and normalized public metadata snapshot. See [`docs/PROJECT_DIRECTORY.md`](docs/PROJECT_DIRECTORY.md) for the editorial metadata contract, drift-check and dry-run commands, private-repository exclusion, and review-only refresh automation.

## Adoption audit

With a GitHub token that can read the target repositories:

```bash
GITHUB_TOKEN="..." pnpm run audit:adoption
```

The scheduled workflow audits active public repositories with read-only permissions and writes a bounded job summary. Private repositories are excluded from public workflow output unless a separately approved private audit channel is configured.

## Override policy

Project-specific files override these defaults when a project needs stricter or more detailed guidance. An override is expected, not drift, when it documents project-specific validation, support, security, or ownership.

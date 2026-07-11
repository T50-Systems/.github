# Community-file inheritance and overrides

GitHub uses this public `.github` repository as the organization default when a repository does not provide its own file. Repository-local files always take precedence.

| Capability | Canonical organization path | Repository override paths | Notes |
|---|---|---|---|
| Code of conduct | `/CODE_OF_CONDUCT.md` | root, `.github/`, or `docs/` | GitHub recognizes standard filenames. |
| Contributing | `/CONTRIBUTING.md` | root, `.github/`, or `docs/` | Repository guidance should describe project-specific validation. |
| Security policy | `/SECURITY.md` | root, `.github/`, or `docs/` | `/.github/SECURITY.md` is a byte-identical compatibility copy checked by CI. |
| Support | `/SUPPORT.md` | root or `.github/` | Project-specific support channels may override. |
| Issue forms | `/.github/ISSUE_TEMPLATE/` | repository `/.github/ISSUE_TEMPLATE/` | Labels are repository-local, so defaults do not assign labels automatically. |
| Pull request template | `/.github/pull_request_template.md` | root, `docs/`, or `.github/` | A repository may provide multiple templates in the supported directories. |
| Organization profile | `/PROFILE/README.md` | not inherited | Rendered only on the organization profile. |
| CODEOWNERS | `/.github/CODEOWNERS` | repository-local CODEOWNERS | Organization CODEOWNERS governs this repository only; it is not inherited. |

## Canonical source and duplication

`/SECURITY.md` is the canonical editable source. `/.github/SECURITY.md` exists for compatibility and must remain byte-identical; `npm run validate` detects drift.

## Preview checklist

1. Run `npm ci`, `npm test`, and `npm run validate` locally.
2. Inspect changed YAML with a renderer or a draft branch in this repository.
3. Open the repository's **Issues → New issue** page and verify form titles, fields, and contact links.
4. Open a draft pull request in a repository without a local template to verify inheritance.
5. Preview `PROFILE/README.md` as Markdown and verify every listed repository/status.
6. Check a consumer with `gh api repos/OWNER/REPO/community/profile` to distinguish inherited and overridden files.

## Known limitations

- Default issue-form labels are not portable; labels live in each consumer repository.
- Private vulnerability reporting must be enabled per repository and may not be inherited.
- Private repositories may require organization plans/features and a token with explicit access for auditing.
- GitHub community-profile percentages may lag immediately after file changes.
- A repository-local file can intentionally override a default; the adoption audit reports that as `override`, not failure.

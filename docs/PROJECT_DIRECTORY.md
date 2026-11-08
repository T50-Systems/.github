# Public project directory generation

`PROFILE/README.md` is generated from two reviewed inputs:

- `data/public-projects.json` is the authoritative allowlist. Every entry must be explicitly approved and carry human-edited `status` and `intendedUsers` fields.
- `data/public-project-metadata.json` is a normalized snapshot containing only public GitHub descriptions and topics for those approved repositories.

The renderer never queries GitHub. It validates both inputs, rejects private or unapproved metadata, sorts repository names deterministically, escapes Markdown table cells, and produces the complete profile file.

## Maintainer commands

```bash
pnpm run directory:generate  # write PROFILE/README.md from checked-in inputs
pnpm run directory:check     # fail if the generated profile has drifted
pnpm run directory:dry-run   # print the generated profile without writing
pnpm run directory:refresh   # query approved public repos, refresh metadata, then render
```

`directory:refresh` is the only networked operation. It requests the GitHub repository endpoint for each exact allowlisted name; it never enumerates organization repositories. A response is rejected unless its owner/name match and GitHub marks it explicitly public. Adding, removing, or changing status/intended-user metadata always requires a reviewed manifest edit.

## Automation and review boundary

`.github/workflows/refresh-project-directory.yml` periodically refreshes the public metadata snapshot and generated profile. It can write only to a dedicated automation branch and opens or updates a draft pull request for human review; it never pushes generated changes to `main` and never merges them.

Independent-review enforcement is tracked separately in [issue #10](https://github.com/T50-Systems/.github/issues/10). Until that dependency is resolved, the refresh pull request requires manual maintainer review by process, but this issue does not alter CODEOWNERS, reviewer teams, or branch-protection settings.

Private repositories must never be added to the manifest, metadata snapshot, fixtures, workflow output, or generated profile.

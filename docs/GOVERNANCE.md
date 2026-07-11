# Governance and ownership

## Roles

Two continuity roles cover organization defaults even when one person currently fills both:

- **Organization owner:** approves repository settings, private reporting, and enforcement changes.
- **Community policy maintainer:** reviews templates, conduct/contribution policy, profile accuracy, and validation failures.

The organization owner must designate a backup account or team before enabling mandatory CODEOWNERS approval. Until then, `CODEOWNERS` provides routing and the protected-branch PR requirement provides an auditable review boundary without creating a self-approval deadlock.

## Change control

- All changes go through a pull request with the `validate` check passing.
- Changes to `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, or issue/PR templates require explicit policy review recorded in the PR conversation.
- Material changes are summarized in the PR and in `CHANGELOG.md`.
- Emergency security-routing fixes may use an administrator merge only after the validation check passes and must include a follow-up review.

## Continuity

- Review CODEOWNERS and role assignments quarterly.
- Assign a backup account/team before enforcing one-review CODEOWNERS protection.
- Remove or replace inactive owners within 10 business days of an ownership change.
- Announce breaking template/policy changes in the repository release notes or a pinned organization discussion when available.

## Deprecation

Defaults are deprecated in two steps: document the replacement and migration path, then remove the old file no earlier than 30 days later unless it creates an active security or privacy risk.

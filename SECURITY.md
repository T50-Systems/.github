# Security Policy

Security issues must be reported privately. Do not open a public issue containing exploit details, credentials, customer data, personal information, or sensitive operational information.

## Private reporting

Use GitHub private vulnerability reporting for the affected repository whenever it is available:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include the affected version/commit, impact, reproduction steps, and a suggested mitigation when available.

For organization-default policy concerns, report directly through [T50-Systems/.github private vulnerability reporting](https://github.com/T50-Systems/.github/security/advisories/new).

If an affected repository does not expose private reporting, use the organization-default private reporting link above and name the affected repository. **Do not create a public placeholder issue.**

## Response targets

These are coordination targets, not a guarantee of remediation time:

- acknowledgement: within 3 business days;
- initial severity and scope triage: within 7 business days;
- critical/high status updates: at least weekly until resolution or mitigation;
- medium/low status updates: at least monthly while actively tracked;
- coordinated disclosure: after a fix or mitigation is available, unless immediate disclosure is required to protect users.

Repository-specific security policies may define stricter targets.

## What to include

When safe to share privately, include:

- affected repository, package, version, commit, or deployment;
- concise vulnerability description and expected impact;
- reproduction steps or proof of concept;
- affected configurations and prerequisites;
- suggested mitigation or patch;
- preferred credit name, or a request to remain anonymous.

## Supported versions

Unless a repository states otherwise, fixes target the default branch and latest released version. Older versions may receive fixes at maintainer discretion based on severity, exploitability, and upgrade feasibility.

## Coordinated disclosure and safe handling

Give maintainers a reasonable opportunity to investigate and release a fix before public disclosure. Reports are shared only with people needed to triage and remediate the issue. Retaliation against good-faith security researchers is not tolerated.

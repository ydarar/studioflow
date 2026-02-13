# Security Policy

## Supported versions

Security fixes are applied to the latest code on `main`.

## Reporting a vulnerability

Do not disclose vulnerabilities in public issues.

Preferred process:

1. Open a private GitHub security advisory for this repository.
2. Provide:
   - vulnerability type and impact
   - affected components/files
   - reproduction steps or proof of concept
   - suggested remediation (if available)
3. Wait for maintainer guidance before public disclosure.

## Response targets

- Initial acknowledgement target: within 5 business days.
- Maintainers will triage severity, define remediation, and coordinate disclosure timing.

## In-scope examples

- privilege escalation or unintended command execution
- unsafe automation assumptions in desktop/browser control
- credential or secret exposure
- bypass of intended safety gates in flow execution/promotion

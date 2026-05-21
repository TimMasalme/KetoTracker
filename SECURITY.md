# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 2.x (current) | ✅ |
| < 2.0 | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue in KetoTrack, report it privately by:

1. Going to the [GitHub Security Advisories](https://github.com/TimMasalme/KetoTrack/security/advisories/new) page and submitting a private advisory, **or**
2. Contacting the author directly via GitHub profile: [github.com/TimMasalme](https://github.com/TimMasalme)

Please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You can expect an initial response within **7 days**. Please allow reasonable time for the issue to be investigated and patched before any public disclosure.

## Scope

KetoTrack stores all data locally on the user's device. There is no backend, no API, and no network communication. The primary security surface is therefore:

- The Electron main process (desktop)
- Capacitor WebView security (Android)
- localStorage data integrity

Thank you for helping keep KetoTrack secure.

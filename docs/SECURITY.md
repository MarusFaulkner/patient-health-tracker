# Security & Privacy Notes

## Scope

This repository is a **front-end educational demonstration**. It must not be used to store real patient data, protected health information (PHI), or other sensitive personal information.

## Improvements in V2

The original prototype built several UI sections with `innerHTML`. In V2, user-controlled patient values are displayed with DOM APIs and `textContent`. This reduces exposure to straightforward DOM-based HTML/script injection through those fields.

Additional controls include:

- input length limits;
- numeric range validation;
- a restricted demo-ID format;
- unique demo-ID validation;
- explicit synthetic-data labeling;
- no external transmission of patient records by application code.

## Improvements in V2.1

- **Content Security Policy** (`script-src 'self'`, `style-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `form-action 'none'`).
- **No third-party JavaScript.** Chart.js was removed; the trend chart is drawn with SVG by the project's own code.
- **Validated storage reads.** Records loaded from `localStorage` are type- and range-checked; invalid records are dropped and demo flags are recomputed rather than trusted.
- **Delete with confirmation** supports data minimization for the demo dataset.
- **FHIR export labeling.** Exported resources carry the `HTEST` (test health data) security label.

## Known Limitations

`localStorage` is readable by JavaScript running in the same origin and provides no application-level encryption, user authentication, authorization, audit trail, or server-side access control. It is used here only because it makes the educational demo easy to run.

The application loads no third-party code. A production design would still need a dependency-management and integrity strategy for any libraries it adopts.

## Simplified Threat Model

| Risk | Current Demo Treatment | Production Direction |
|---|---|---|
| Script/HTML injection | Text-node rendering + Content Security Policy | Output encoding, CSP, framework controls, testing |
| Unauthorized access | Not addressed; single-browser demo | Authentication + RBAC/ABAC |
| Sensitive data exposure | Synthetic-data-only rule | Encryption, secure storage, data minimization |
| Data tampering | Input validation + validation of stored records; flags recomputed | Server validation, authorization, integrity controls |
| Accountability | No audit log | Immutable/security-reviewed audit logging |
| Dependency risk | No third-party scripts | Locked dependencies, SRI/build pipeline, monitoring |
| Availability | Static GitHub Pages | Resilient hosted architecture, backup/recovery |

## Production Healthcare Considerations

A real healthcare system would require requirements and controls appropriate to its jurisdiction and intended use. Examples may include:

- identity and access management;
- least privilege;
- encrypted transport and storage;
- secure secrets management;
- audit logging and monitoring;
- vulnerability management;
- backup and recovery;
- retention/deletion controls;
- privacy and security risk assessments;
- incident-response procedures;
- vendor/dependency review;
- legal, regulatory, and clinical review.

This project does **not** claim HIPAA compliance, regulatory clearance, medical-device status, or fitness for clinical use.

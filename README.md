# Patient Health Monitoring Dashboard

A redesigned healthcare information-systems portfolio project demonstrating **synthetic patient record management, vital-sign data capture, dashboard analytics, rule-based alerts, front-end data visualization, and security-aware application design**.

**Live demo:** `https://marusfaulkner.github.io/patient-health-tracker/`

> **Important:** This is an educational portfolio project using fictional/synthetic data. It is **not** a medical device, electronic health record, diagnostic system, or clinical decision-support tool. Do not enter real patient or protected health information (PHI).

## Why I rebuilt this project

The original version proved the core concept: patient records, vital-sign entry, Chart.js visualization, browser storage, and alert logic. Version 2 refactors that idea into a cleaner information-systems project with stronger documentation and more explicit security/privacy boundaries.

### V2 improvements

- Modern healthcare operations dashboard
- Responsive desktop/mobile interface
- Separated HTML, CSS, and JavaScript
- Synthetic demo dataset
- Searchable patient records
- Vital-sign observation workflow
- Chart.js trend visualization
- Rule-based demonstration flags
- Safer DOM rendering for user-entered patient data
- Clear localStorage limitations
- Security/privacy documentation and threat-model notes
- No claims of HIPAA compliance, medical-grade operation, or clinical suitability

## Information Systems Concepts Demonstrated

| Area | Demonstration |
|---|---|
| Data capture | Structured patient and observation forms |
| Data management | Client-side record persistence and relationships |
| Validation | Required fields, input ranges, unique demo IDs |
| Analytics | Counts, averages, recent flags, time-series chart |
| Workflow | Patient → observation → dashboard feedback |
| UI/UX | Responsive navigation, dashboard cards, forms, status states |
| Security awareness | Synthetic data boundary, safer rendering, documented production controls |

## Security-Conscious Refactor

The original application rendered several dynamic values by building HTML strings. V2 uses DOM APIs and `textContent` for user-controlled patient values to reduce the risk of client-side HTML/script injection.

This does **not** make the application suitable for sensitive health information. The current version intentionally uses browser `localStorage` for a simple portfolio demo. A production healthcare application would need a secure backend, authentication, authorization, encryption, audit logging, session controls, secure APIs, data-governance policies, testing, and formal legal/compliance review.

See [`docs/SECURITY.md`](docs/SECURITY.md).

## Demo Alert Logic

The application contains intentionally simplified thresholds to demonstrate conditional logic and UI alert states. They are **not medical guidance** and should not be used for diagnosis, treatment, triage, or clinical decision-making.

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Chart.js 4
- Browser Web Storage (`localStorage`)
- GitHub Pages

## Project Structure

```text
patient-health-tracker/
├── index.html
├── assets/
│   ├── app.js
│   └── styles.css
├── docs/
│   ├── ARCHITECTURE.md
│   └── SECURITY.md
├── PROJECT-INFO.md
├── README.md
├── LICENSE
└── .gitignore
```

## Run Locally

No build process is required.

1. Clone or download the repository.
2. Open `index.html` in a modern browser.
3. Use the included synthetic records or add fictional demo records.
4. Record synthetic observations and review dashboard updates.

An internet connection is required to load Chart.js from the CDN.

## Portfolio Positioning

This project connects three areas of professional interest:

**Healthcare / Medical Device Experience + Information Systems + Cybersecurity Awareness**

It is intended to demonstrate how operational data can be captured, organized, visualized, and reviewed while recognizing the security and privacy requirements that would be necessary in a real healthcare environment.

## Future Roadmap

- Backend API and database
- Role-based access control
- Authentication and secure session management
- Audit logging
- Automated tests
- Content Security Policy
- Dependency integrity controls
- Standards-based interoperability research (e.g., FHIR)
- Accessibility testing
- Exportable synthetic reports

## Author

**Marcus Faulkner**  
Information Systems / Cybersecurity & Quality Professional  
Portfolio: `https://marusfaulkner.github.io/marcus-faulkner.github.io/`

## License

MIT License. See [`LICENSE`](LICENSE).

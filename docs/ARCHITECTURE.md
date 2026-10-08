# Architecture

## Current V2 Architecture

```text
┌───────────────────────────────┐
│          Browser UI           │
│ HTML + responsive CSS         │
└───────────────┬───────────────┘
                │
                v
┌───────────────────────────────┐
│     JavaScript Application    │
│ validation • workflow • DOM   │
└───────────────┬───────────────┘
                │
       ┌────────┴────────┐
       v                 v
┌──────────────┐  ┌──────────────┐
│ localStorage │  │   Chart.js   │
│ demo records │  │ visualization│
└──────────────┘  └──────────────┘
```

## Data Model

### Patient

- `id`
- `demoId`
- `firstName`
- `lastName`
- `dob`
- `notes`

### Observation

- `id`
- `patientId`
- `date`
- `time`
- `heartRate`
- `systolic`
- `diastolic`
- `temperature`
- `notes`
- `flags`

`patientId` creates the relationship between a patient record and its observations.

## Production Evolution

A production-style architecture would move sensitive processing and persistence away from browser-only storage:

```text
Client UI
   ↓ HTTPS
Authenticated API
   ↓
Authorization + validation + audit
   ↓
Encrypted database
   ↓
Analytics / reporting services
```

Security, privacy, clinical safety, interoperability, availability, and regulatory requirements would need to be designed and verified rather than inferred from this demo.

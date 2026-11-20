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
       ┌────────────────┼────────────────┐
       v                v                v
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ localStorage │ │  SVG chart   │ │ FHIR R4      │
│ demo records │ │ (no library) │ │ JSON export  │
└──────────────┘ └──────────────┘ └──────────────┘
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

`date` is the local calendar date (`YYYY-MM-DD`) and `time` is local 24-hour `HH:MM`, so `date + time` sorts chronologically. `flags` are always recomputed from the vital-sign values.

## FHIR Mapping

| App field | FHIR R4 |
|---|---|
| Patient `demoId`, name, `dob` | `Patient.identifier`, `Patient.name`, `Patient.birthDate` |
| `heartRate` | `Observation` LOINC 8867-4, `valueQuantity` UCUM `/min` |
| `temperature` | `Observation` LOINC 8310-5, `valueQuantity` UCUM `[degF]` |
| `systolic` / `diastolic` | `Observation` LOINC 85354-9, components 8480-6 / 8462-4, UCUM `mm[Hg]` |
| `date` + `time` | `Observation.effectiveDateTime` with the local UTC offset |
| `notes` | `Observation.note` |

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

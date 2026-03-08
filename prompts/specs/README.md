# Spec prompts for AutoDesk DMS

This folder contains **spec prompts** for each feature slice of the Dealer Management System. Each file is written for use with the [Spec Kit](https://github.com/github/spec-kit) **`/speckit.specify`** command.

## How to use

1. Open the `.md` file for the feature you want to spec (e.g. `001-vehicle-inventory.md`).
2. Copy the **body of the prompt** (the text under the first horizontal rule, not the title/header).
3. In your AI agent (Cursor, Copilot, etc.), run **`/speckit.specify`** and paste that content as the prompt.

The agent will create a feature branch (e.g. `001-vehicle-inventory`) and a spec under `.specify/specs/001-vehicle-inventory/spec.md` (or your spec-kit equivalent). You can then use `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` for that feature.

## Feature list (implementation order)

| File | Feature | Depends on |
|------|---------|------------|
| `001-vehicle-inventory.md` | Vehicle inventory + auth foundation | — |
| `002-crm.md` | Customer & lead management | 001 |
| `003-sales-deal-management.md` | Deals, desking, trade-in, documents | 001, 002 |
| `004-finance-insurance.md` | Credit app, lenders, F&I products | 003 |
| `005-service-repair-orders.md` | Appointments, ROs, technicians, history | 001, 002 |
| `006-parts-inventory.md` | Parts catalog, PO, receiving, RO usage | 005 |
| `007-accounting-reporting.md` | GL, AP, AR, posting, dashboards | 003, 004, 005, 006 |
| `008-oem-integration.md` | Warranty claims, recalls, incentives, reporting | 001, 003, 005 |
| `009-ai-powered-features.md` | Smart search, descriptions, OCR, lead score, copilot, pricing | 001, 002, 003, 005 |

## Reference

- **Domain guide:** `dealer-management-system-guide.md` (project root) — terminology, entities, APIs, roadmap.
- **Constitution:** `.specify/memory/constitution.md` — governing principles (modular architecture, type safety, test-first, responsible AI, clean code, etc.).

These prompts focus on **what** and **why**; tech stack and architecture are specified later via `/speckit.plan`.

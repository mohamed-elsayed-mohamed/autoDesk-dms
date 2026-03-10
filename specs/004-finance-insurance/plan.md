# Implementation Plan: Finance & Insurance (F&I) Office Workflow

**Branch**: `004-finance-insurance` | **Date**: 2026-03-10 | **Spec**: [specs/004-finance-insurance/spec.md](spec.md)
**Input**: Feature specification from `/specs/004-finance-insurance/spec.md`

---

## Summary

Build the F&I office workflow module for AutoDesk DMS. The module covers five user stories: secure credit application capture (SSN encrypted at rest), simulated lender submission and decision comparison, buy-rate/sell-rate markup with live deal financing term updates, a configurable F&I product menu with real-time back-end gross tracking, chargeback recording with dual-window performance reporting, and jurisdiction-configurable compliance disclosures backed by an immutable audit log. The module introduces a new `fi` NestJS domain and reuses `auth`, `deals` (003), `customers` (002), and `vehicles` (001) without modifying them.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5, fast-csv, AWS SDK v3 (S3 — not used in this module), PostgreSQL 15
**Storage**: PostgreSQL 15 (existing RDS instance); no S3 required (no document generation in this module)
**Testing**: Jest (unit + integration), Cypress (E2E)
**Target Platform**: Linux server (ECS/Docker, same deployment as 001/002/003)
**Project Type**: Web service (REST API) + React SPA
**Performance Goals**: F&I gross recalculation ≤ 1s; lender simulation response ≤ 2s; performance report ≤ 5s; deal APR/payment update after lender selection ≤ 1s
**Constraints**: SSN encrypted at rest (AES-256-GCM, key from env); DECIMAL arithmetic on all monetary values; FIAuditLog and DisclosureConfirmation are insert-only; chargeback write access is deal-status-agnostic; dual independent date filters on chargeback report
**Scale/Scope**: Single dealership; ~50 concurrent users; F&I products ~3–5 per deal; lenders ~5–15 in catalog

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Modular Domain Architecture | ✅ Pass | `fi` module is self-contained; reads Deal status and writes APR/term/monthlyPayment/backEndGross via the deals module interface only |
| II. Type Safety End-to-End | ✅ Pass | Strict TS; shared types for `CreditApplication`, `Lender`, `LenderSubmission`, `SelectedLenderDecision`, `FIProduct`, `DisclosureConfirmation`, `FIAuditLog` |
| III. Test-First Business Logic | ✅ Pass | `FiCalculationService` (sell rate, monthly payment, F&I gross) and `LenderSimulatorService` (determinism) unit tests written before implementation |
| IV. Responsible AI | N/A | No AI features |
| V. Data Integrity & Financial Accuracy | ⚠️ Justified exception (see Complexity Tracking) | DECIMAL types ✅; immutable FIAuditLog + DisclosureConfirmation ✅; DB transactions for product + backEndGross ✅; no soft-delete on FIAuditLog/DisclosureConfirmation (justified) |
| VI. Security & Compliance | ✅ Pass | JWT RBAC; SSN encrypted at rest per constitution VI; API-level guards; FIAuditLog covers all auditable F&I actions |
| VII. API-First Design | ✅ Pass | Full REST contracts defined before any UI; pagination on all list endpoints |
| VIII. Performance & Scalability | ✅ Pass | DB indexes; no Redis needed (transactional financial data, see Complexity Tracking); synchronous lender simulation (justified); synchronous report (same justification as 003) |
| IX. Clean Code | ✅ Pass | Named enums; descriptive function names (`calculateSellRate`, `calculateFiGross`, `maskSsn`, `simulateLenderDecision`) |
| X. Clean Architecture | ✅ Pass | controller → service → repository; pure calculation services with no DB dependency; SSN encryption service is a pure utility |
| XI. Modern UI/UX | ✅ Pass | Skeleton screens on all panels, color-coded decision badges (green/amber/red), product status badges, inline form validation, 8px grid, design tokens |

**Post-Phase 1 re-check**: All gates remain passing. Data model confirms DECIMAL types on all monetary fields, insert-only patterns on FIAuditLog and DisclosureConfirmation, and chargeback write access enforced at service layer (not status-gated).

---

## Project Structure

### Documentation (this feature)

```text
specs/004-finance-insurance/
├── plan.md              # This file
├── research.md          # Phase 0: SSN encryption, lender simulation, dual-window report, CSV
├── data-model.md        # Phase 1: Prisma schema, state transitions, indexes, constraints
├── quickstart.md        # Phase 1: Local dev setup for this module
├── contracts/
│   └── api.md           # Phase 1: Full REST API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       ├── fi/                                     # NEW — this feature
│       │   ├── fi.module.ts
│       │   ├── lenders/
│       │   │   ├── lenders.controller.ts
│       │   │   ├── lenders.service.ts
│       │   │   ├── lenders.repository.ts
│       │   │   └── dto/
│       │   │       ├── create-lender.dto.ts
│       │   │       └── update-lender.dto.ts
│       │   ├── credit-applications/
│       │   │   ├── credit-applications.controller.ts
│       │   │   ├── credit-applications.service.ts
│       │   │   ├── credit-applications.repository.ts
│       │   │   └── dto/
│       │   │       ├── upsert-credit-application.dto.ts
│       │   │       └── submit-credit-application.dto.ts
│       │   ├── lender-submissions/
│       │   │   ├── lender-submissions.controller.ts
│       │   │   ├── lender-submissions.service.ts
│       │   │   ├── lender-submissions.repository.ts
│       │   │   ├── lender-simulator.service.ts     # Pure deterministic mock
│       │   │   └── dto/
│       │   │       ├── submit-to-lenders.dto.ts
│       │   │       └── select-lender-decision.dto.ts
│       │   ├── fi-products/
│       │   │   ├── fi-products.controller.ts
│       │   │   ├── fi-products.service.ts
│       │   │   ├── fi-products.repository.ts
│       │   │   └── dto/
│       │   │       ├── create-fi-product.dto.ts
│       │   │       └── update-fi-product.dto.ts
│       │   ├── chargebacks/
│       │   │   ├── chargebacks.controller.ts
│       │   │   ├── chargebacks.service.ts
│       │   │   └── dto/
│       │   │       └── record-chargeback.dto.ts
│       │   ├── product-catalog/
│       │   │   ├── product-catalog.controller.ts
│       │   │   ├── product-catalog.service.ts
│       │   │   └── dto/
│       │   │       └── upsert-catalog-item.dto.ts
│       │   ├── disclosures/
│       │   │   ├── disclosures.controller.ts
│       │   │   ├── disclosures.service.ts
│       │   │   └── dto/
│       │   │       └── confirm-disclosure.dto.ts
│       │   ├── performance-report/
│       │   │   ├── performance-report.controller.ts
│       │   │   └── performance-report.service.ts
│       │   ├── audit/
│       │   │   └── fi-audit.service.ts             # Insert-only; called within transactions
│       │   └── calculation/
│       │       ├── fi-calculation.service.ts       # Pure: sell rate, payment, F&I gross
│       │       └── ssn-encryption.service.ts       # Pure: encrypt/decrypt/mask SSN
│       ├── deals/                                  # Existing (003) — no changes
│       ├── auth/                                   # Existing (001) — no changes
│       ├── crm/                                    # Existing (002) — no changes
│       └── inventory/                              # Existing (001) — no changes
│
└── tests/
    ├── unit/
    │   └── fi/
    │       ├── fi-calculation.service.spec.ts
    │       ├── lender-simulator.service.spec.ts
    │       └── ssn-encryption.service.spec.ts
    ├── integration/
    │   └── fi/
    │       ├── credit-applications.integration.spec.ts
    │       ├── lender-submissions.integration.spec.ts
    │       ├── fi-products.integration.spec.ts
    │       ├── chargebacks.integration.spec.ts
    │       ├── disclosures.integration.spec.ts
    │       ├── performance-report.integration.spec.ts
    │       └── fi-audit.integration.spec.ts
    └── e2e/
        └── fi/
            ├── credit-app-and-lender-flow.cy.ts
            ├── fi-product-menu.cy.ts
            ├── chargeback-and-report.cy.ts
            └── disclosures.cy.ts

frontend/
└── src/
    └── modules/
        └── fi/                                     # NEW
            ├── pages/
            │   ├── CreditApplicationPage.tsx
            │   ├── LenderSubmissionPage.tsx
            │   ├── FiProductMenuPage.tsx
            │   ├── FiPerformanceReportPage.tsx
            │   └── DisclosureChecklistPage.tsx
            ├── components/
            │   ├── CreditApplicationForm.tsx
            │   ├── LenderComparisonTable.tsx
            │   ├── RateMarkupInput.tsx
            │   ├── FiProductTable.tsx
            │   ├── FiProductForm.tsx
            │   ├── ChargebackForm.tsx
            │   ├── FiGrossSummary.tsx
            │   ├── DisclosureChecklist.tsx
            │   └── FiProductStatusBadge.tsx
            ├── hooks/
            │   ├── useCreditApplication.ts
            │   ├── useLenderSubmissions.ts
            │   ├── useFiProducts.ts
            │   ├── useDisclosures.ts
            │   └── useFiPerformanceReport.ts
            └── types/
                └── fi.types.ts
```

**Structure Decision**: Option 2 (Web Application) — existing layout from 001/002/003. New `fi` domain added to `backend/src/modules/` and `frontend/src/modules/` following the established module pattern.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| No soft-delete (`deletedAt`) on `FIAuditLog` and `DisclosureConfirmation` (Constitution V requires soft-delete for all business entities) | Both entities are insert-only immutable audit records. A `deletedAt` column would imply a deletion path exists, contradicting the regulatory requirement for an unbroken audit trail. No user role may logically "delete" an audit entry. | Soft-delete still creates a code path that could mark audit records as logically removed, which violates the spec's immutability guarantee (FR-024, FR-025). Insert-only with no delete endpoint is clearer and stricter. |
| No Redis caching in this module (Constitution VIII: Redis MUST be used for frequently accessed reference data) | F&I data is transactional and mutable (credit application status, product prices, lender decisions). Caching these would risk serving stale financial figures to the F&I Manager mid-workflow. | Constitution VIII's Redis mandate targets stable reference data (OEM programs, parts catalog lookups). The lender catalog and product catalog are low-volume and queried infrequently enough that a DB read is acceptable. Re-evaluate if multi-dealership scale is added. |
| Synchronous lender simulation (Constitution VIII: background jobs via SQS) | The lender integration is a deterministic in-process mock with no I/O; it completes in microseconds. There is no external HTTP call, no queue, no wait. | Wrapping a pure in-memory function in SQS + polling would add architectural complexity with zero benefit. If/when real lender integration (RouteOne/DealerTrack) is added, async processing should be re-evaluated at that time. |
| Synchronous performance report (Constitution VIII: background jobs via SQS) | Single-dealership scale (~500 deals/month) keeps historical report queries well under the 5s SC-005 target with proper DB indexes. | Same rationale as 003-sales-deal-management. Async SQS + polling is unnecessary overhead for a query that completes in <1s at current scale. |

---

## Phase 0: Research Summary

All decisions resolved. See [research.md](research.md) for full rationale and alternatives.

| Topic | Decision |
|---|---|
| SSN encryption | AES-256-GCM; per-record IV stored alongside ciphertext; key from `SSN_ENCRYPTION_KEY` env var; mask function returns `XXX-XX-####` from last 4 plaintext digits |
| Lender simulation | `LenderSimulatorService`: deterministic hash of `(dealId + lenderId)` using djb2, mod 3 → Approved / Conditional / Declined. Buy rate derived from same hash, range 4.50–8.90%. No randomness; tests are fully reproducible. |
| Rate markup calculation | Pure function: `sellRate = buyRate + rateMarkup`. Monthly payment uses standard amortization (same formula as 003) on `approvedAmount` at `sellRate`. Warning returned in `warnings[]` when `rateMarkup > lender.maxMarkupCap`. |
| F&I gross calculation | Pure function: `fiGross = Σ (sellingPrice − cost) for Active products`. Computed in-memory from product list; written to `Deal.backEndGross` atomically in Prisma transaction with the triggering product mutation. |
| Chargeback report dual-window | Two independent Prisma queries: (1) `Deal.fundedAt BETWEEN from AND to` for revenue + funded count; (2) `FIProduct.chargebackDate BETWEEN from AND to` for chargeback totals. Merged in service layer. |
| CSV export | `fast-csv` (already a project dependency from 003); NestJS `StreamableFile` with `Content-Disposition: attachment; filename="fi-performance-{from}-{to}.csv"` |
| Audit log write pattern | `FiAuditService.log(params)` called within the same Prisma `$transaction` as the triggering mutation. On transaction rollback, the audit entry is also rolled back — no orphaned audit records. |
| SSN access for lender submission | For the simulated integration, SSN is not transmitted. `SsnEncryptionService.decrypt()` is implemented and available to the `LenderSimulatorService` but deliberately unused (simulation does not need it). Decryption is available for future real lender integration with explicit audit log requirement. |

---

## Phase 1: Design

### Data Model

See [data-model.md](data-model.md) for the full Prisma schema.

**New models**: `Lender`, `CreditApplication`, `LenderSubmission`, `SelectedLenderDecision`, `FIProduct`, `ProductCatalogItem`, `DisclosureRequirement`, `DisclosureConfirmation`, `FIAuditLog`

**Key constraints**:
- All monetary fields use `Decimal` (never `Float`)
- `FIAuditLog` and `DisclosureConfirmation` are insert-only; no update or delete endpoints exposed
- `FIProduct` uses `deletedAt` for removals (soft delete, constitution V compliance), separate from the `status` field (Active / Cancelled / Charged Back)
- `Deal.backEndGross` updated atomically with every product mutation via Prisma `$transaction`
- `SelectedLenderDecision` is upserted per deal (unique on `dealId`); prior selection is overwritten and the change is captured in `FIAuditLog`

**Calculation engine** (`FiCalculationService` — pure, no DB):
```
sellRate         = buyRate + rateMarkup
monthlyPayment   = sellRate > 0
                   ? approvedAmount × [r(1+r)^n] / [(1+r)^n − 1]   where r = sellRate/12/100, n = selectedTerm
                   : approvedAmount / selectedTerm
fiGross          = Σ (sellingPrice − cost) for products where status = ACTIVE and deletedAt = null
```

### API Contracts

See [contracts/api.md](contracts/api.md) for full request/response shapes and error codes.

**Endpoints summary**:

| Method | Path | Role(s) | Purpose |
|---|---|---|---|
| `GET` | `/api/fi/lenders` | All | List lenders (paginated, optional `active` filter) |
| `POST` | `/api/fi/lenders` | Admin | Create lender |
| `GET` | `/api/fi/lenders/:id` | All | Get lender |
| `PATCH` | `/api/fi/lenders/:id` | Admin | Update lender (name, maxMarkupCap, isActive) |
| `GET` | `/api/deals/:dealId/credit-application` | FI Manager, Sales Manager | Get active credit application |
| `POST` | `/api/deals/:dealId/credit-application` | FI Manager | Create or supersede credit application |
| `PATCH` | `/api/deals/:dealId/credit-application` | FI Manager | Update draft credit application |
| `POST` | `/api/deals/:dealId/credit-application/submit` | FI Manager | Submit credit application |
| `GET` | `/api/deals/:dealId/lender-submissions` | FI Manager, Sales Manager | List lender submissions and decisions |
| `POST` | `/api/deals/:dealId/lender-submissions` | FI Manager | Submit to one or more lenders |
| `POST` | `/api/deals/:dealId/lender-submissions/select` | FI Manager | Select decision + apply markup |
| `GET` | `/api/fi/product-catalog` | FI Manager, Admin | List active catalog items |
| `POST` | `/api/fi/product-catalog` | Admin | Create catalog item |
| `PATCH` | `/api/fi/product-catalog/:id` | Admin | Update catalog item |
| `GET` | `/api/deals/:dealId/fi-products` | FI Manager, Sales Manager | List products on deal |
| `POST` | `/api/deals/:dealId/fi-products` | FI Manager | Add product to deal |
| `PATCH` | `/api/deals/:dealId/fi-products/:productId` | FI Manager | Edit product |
| `DELETE` | `/api/deals/:dealId/fi-products/:productId` | FI Manager | Remove product (soft delete) |
| `POST` | `/api/deals/:dealId/fi-products/:productId/chargeback` | FI Manager, Controller | Record chargeback |
| `GET` | `/api/fi/disclosure-requirements` | FI Manager, Sales Manager | List requirements for jurisdiction |
| `GET` | `/api/deals/:dealId/disclosures` | FI Manager, Sales Manager | List confirmations for deal |
| `POST` | `/api/deals/:dealId/disclosures/confirm` | FI Manager | Confirm a disclosure |
| `GET` | `/api/fi/performance-report` | FI Manager, Controller | Aggregate F&I report |
| `GET` | `/api/fi/performance-report/export` | FI Manager, Controller | CSV export |
| `GET` | `/api/deals/:dealId/fi-audit-log` | FI Manager, Controller, Sales Manager | Audit log for deal |

### Implementation Sequence

Per constitution: **test-first for business logic, API-first before UI**.

```
1.  Prisma schema + migrations (all 9 new models)
2.  SsnEncryptionService unit tests → SsnEncryptionService implementation
3.  FiCalculationService unit tests (sell rate, payment, fiGross) → FiCalculationService implementation
4.  LenderSimulatorService unit tests (determinism, decision distribution) → LenderSimulatorService implementation
5.  FiAuditService (insert-only, called within transactions)
6.  LendersRepository + LendersService + LendersController + integration tests
7.  CreditApplicationsRepository + CreditApplicationsService + CreditApplicationsController + integration tests
8.  LenderSubmissionsRepository + LenderSubmissionsService + LenderSubmissionsController + integration tests (simulation + select + markup)
9.  FiProductsRepository + FiProductsService + FiProductsController + integration tests (add/edit/remove + backEndGross sync)
10. ChargebacksService + ChargebacksController + integration tests (any deal status)
11. ProductCatalogService + ProductCatalogController + integration tests
12. DisclosuresService + DisclosuresController + integration tests (immutability check)
13. PerformanceReportService + PerformanceReportController + integration tests (dual-window + CSV)
14. Audit log integration tests (one per auditable action, verify FIAuditLog entry written)
15. Frontend: shared fi.types.ts, API client hooks
16. Frontend: CreditApplicationPage, LenderSubmissionPage (with comparison table)
17. Frontend: FiProductMenuPage (with live gross display), ChargebackForm
18. Frontend: FiPerformanceReportPage (with CSV export), DisclosureChecklistPage
19. Cypress E2E tests
20. UI polish (skeleton screens, decision badges, product status badges, design tokens)
```

### Key Design Decisions

**SSN encryption**: Each `CreditApplication` stores `ssnEncrypted` (AES-256-GCM ciphertext, base64) and `ssnIv` (12-byte IV, base64). The last 4 digits of the plaintext are also stored in `ssnLastFour` (non-sensitive) to support masking without decryption on every read. All API responses return `ssnMasked: "XXX-XX-####"` derived from `ssnLastFour`.

**Chargeback status-agnostic access**: `ChargebacksService.recordChargeback()` queries the deal by ID without a status restriction — the deal-status guard applied to other F&I actions is explicitly skipped for this endpoint. The NestJS guard is parameterized to conditionally skip status enforcement.

**Dual-window performance report**: `PerformanceReportService.getReport(from, to)` executes two Prisma queries: revenue query filters `Deal.fundedAt BETWEEN from AND to`; chargeback query filters `FIProduct.chargebackDate BETWEEN from AND to`. Results are combined in the service and never in SQL, keeping the logic clear and independently testable.

**FIProduct removal**: Soft-deleted via `deletedAt` per constitution V. The `status` field (Active / Cancelled / Charged Back) is the F&I lifecycle state; `deletedAt` indicates the record was removed from the deal by the manager before delivery. `fiGross` calculation filters on `deletedAt IS NULL AND status = ACTIVE`.

**Audit log within transactions**: `FiAuditService.log()` accepts a Prisma `TransactionClient` parameter and executes the insert inside the caller's transaction. On rollback, no orphaned audit record is left. Services that do not have a natural transaction wrap their mutation + audit in `prisma.$transaction([...])`.

**SelectedLenderDecision upsert**: When a new lender decision is selected, `SelectedLenderDecision` is upserted using `prisma.selectedLenderDecision.upsert({ where: { dealId } })`. The prior values are captured in `FIAuditLog.beforeSnapshot` before the upsert.

---

## Artifacts

| File | Status |
|---|---|
| [specs/004-finance-insurance/plan.md](plan.md) | ✅ This file |
| [specs/004-finance-insurance/research.md](research.md) | ✅ Generated |
| [specs/004-finance-insurance/data-model.md](data-model.md) | ✅ Generated |
| [specs/004-finance-insurance/contracts/api.md](contracts/api.md) | ✅ Generated |
| [specs/004-finance-insurance/tasks.md](tasks.md) | ⏳ Pending (`/speckit.tasks`) |

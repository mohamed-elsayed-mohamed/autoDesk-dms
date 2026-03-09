# Implementation Plan: Sales Deal Management

**Branch**: `003-sales-deal-management` | **Date**: 2026-03-09 | **Spec**: [specs/003-sales-deal-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/003-sales-deal-management/spec.md`

---

## Summary

Build the vehicle sales deal management module for AutoDesk DMS. The module covers the full sales lifecycle: deal creation with customer and vehicle linking, live-recalculating desking (amortization, tax, fees, trade-in), a role-enforced status pipeline (Pending → Desking → F&I → Contracts Signed → Delivered → Funded), deal jacket with immutable status history, PDF document generation (buyer's order / bill of sale) stored on S3, and a sales summary report with CSV export. The module introduces a new `deals` NestJS domain and reuses `auth`, `customers` (002-crm), and `vehicles` (001-vehicle-inventory) without modifying them.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5, Puppeteer (HTML → PDF), AWS SDK v3 (S3), fast-csv, PostgreSQL 15
**Storage**: PostgreSQL 15 (existing RDS instance); AWS S3 (existing bucket — documents sub-path)
**Testing**: Jest (unit + integration), Cypress (E2E)
**Target Platform**: Linux server (ECS/Docker, same deployment as 001/002)
**Project Type**: Web service (REST API) + React SPA
**Performance Goals**: Desking recalculation ≤ 1s end-to-end; sales report ≤ 5s; document generation ≤ 10s (Puppeteer startup acceptable for user-triggered action)
**Constraints**: 7-year document + deal retention (no delete); DECIMAL arithmetic throughout; optimistic concurrency on deal edits
**Scale/Scope**: Single dealership; ~50 concurrent users; deal volume ~200–500/month

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Modular Domain Architecture | ✅ Pass | `deals` module is self-contained; reads Customer/Vehicle via module interface only |
| II. Type Safety End-to-End | ✅ Pass | Strict TS; shared types for `Deal`, `DealFee`, `TradeIn`, `DealStatusHistory`, `GeneratedDocument` |
| III. Test-First Business Logic | ✅ Pass | Calculation engine and FSM transition validator: unit tests written before implementation |
| IV. Responsible AI | N/A | No AI features |
| V. Data Integrity & Financial Accuracy | ⚠️ Justified exception (see Complexity Tracking) | DECIMAL types ✅; immutable history ✅; DB transactions ✅; soft-delete exception justified by regulatory retention |
| VI. Security & Compliance | ✅ Pass | JWT RBAC; API-level guards; all transitions audit-logged in DealStatusHistory |
| VII. API-First Design | ✅ Pass | Full REST contracts defined before any UI; pagination on all lists |
| VIII. Performance & Scalability | ✅ Pass | DB indexes; cursor pagination; S3 for documents; PDF generation synchronous (justified) |
| IX. Clean Code | ✅ Pass | Named enums, descriptive function names (`calculateMonthlyPayment`, `validateStatusTransition`) |
| X. Clean Architecture | ✅ Pass | controller → service → repository; no business logic in controllers |
| XI. Modern UI/UX | ✅ Pass | Skeleton screens, color-coded status badges, inline form validation, 8px grid, design tokens |

**Post-Phase 1 re-check**: All gates remain passing. Data model confirms DECIMAL types, insert-only history, and no deletedAt on Deal/GeneratedDocument.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-sales-deal-management/
├── plan.md              # This file
├── research.md          # Phase 0: PDF library, S3 pattern, deal number, OCC, CSV, FSM
├── data-model.md        # Phase 1: Prisma schema, state machine, indexes, constraints
├── quickstart.md        # Phase 1: Local dev setup for this module
├── contracts/
│   └── api.md           # Phase 1: Full REST API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── deals/                          # NEW — this feature
│   │   ├── deals.module.ts
│   │   ├── deals.controller.ts
│   │   ├── deals.service.ts
│   │   ├── deals.repository.ts
│   │   ├── deal-fees.controller.ts
│   │   ├── deal-fees.service.ts
│   │   ├── trade-in.controller.ts
│   │   ├── trade-in.service.ts
│   │   ├── deal-status.controller.ts
│   │   ├── deal-status.service.ts
│   │   ├── deal-documents.controller.ts
│   │   ├── deal-documents.service.ts
│   │   ├── reports/
│   │   │   ├── sales-report.controller.ts
│   │   │   └── sales-report.service.ts
│   │   ├── calculation/
│   │   │   └── deal-calculation.service.ts  # Pure functions, no DB dependency
│   │   ├── templates/
│   │   │   ├── buyers-order.template.html
│   │   │   └── bill-of-sale.template.html
│   │   ├── dto/
│   │   │   ├── create-deal.dto.ts
│   │   │   ├── update-deal.dto.ts
│   │   │   ├── create-deal-fee.dto.ts
│   │   │   ├── update-deal-fee.dto.ts
│   │   │   ├── upsert-trade-in.dto.ts
│   │   │   ├── transition-status.dto.ts
│   │   │   ├── generate-document.dto.ts
│   │   │   └── sales-report-query.dto.ts
│   │   └── constants/
│   │       └── deal-status-transitions.constants.ts
│   ├── config/                         # NEW — DealershipConfig endpoint
│   │   ├── config.controller.ts
│   │   └── config.service.ts
│   ├── auth/                           # Existing (001) — no changes
│   ├── vehicles/                       # Existing (001) — no changes
│   └── customers/                      # Existing (002) — no changes
│
└── tests/
    ├── unit/
    │   └── deals/
    │       ├── deal-calculation.service.spec.ts
    │       └── deal-status-transitions.spec.ts
    ├── integration/
    │   └── deals/
    │       ├── deals.integration.spec.ts
    │       ├── deal-fees.integration.spec.ts
    │       ├── trade-in.integration.spec.ts
    │       ├── deal-status.integration.spec.ts
    │       ├── deal-documents.integration.spec.ts
    │       └── sales-report.integration.spec.ts
    └── e2e/
        └── deals/
            ├── desking-flow.cy.ts
            ├── manager-approval.cy.ts
            ├── pipeline-to-funded.cy.ts
            └── sales-report.cy.ts

frontend/
└── src/
    ├── deals/                          # NEW
    │   ├── pages/
    │   │   ├── DealListPage.tsx
    │   │   ├── DealCreatePage.tsx
    │   │   ├── DeskingPage.tsx
    │   │   ├── DealJacketPage.tsx
    │   │   ├── ManagerApprovalQueuePage.tsx
    │   │   └── SalesReportPage.tsx
    │   ├── components/
    │   │   ├── DealTable.tsx
    │   │   ├── DeskingPanel.tsx
    │   │   ├── FeeTable.tsx
    │   │   ├── TradeInForm.tsx
    │   │   ├── DealJacket.tsx
    │   │   ├── StatusHistoryTimeline.tsx
    │   │   ├── DocumentsList.tsx
    │   │   ├── StatusBadge.tsx
    │   │   └── SalesReportTable.tsx
    │   ├── hooks/
    │   │   ├── useDeals.ts
    │   │   ├── useDeal.ts
    │   │   ├── useDealCalculation.ts    # Debounced desking recalculation
    │   │   └── useSalesReport.ts
    │   └── types/
    │       └── deal.types.ts           # Shared types (Deal, DealFee, TradeIn, etc.)
    └── shared/
        └── types/                      # Cross-feature types (also export deal.types.ts here)
```

**Structure Decision**: Option 2 (Web Application) — existing layout from 001/002. New `deals` domain added to backend `src/` and frontend `src/` following the established module pattern.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| No soft-delete on `Deal` and `GeneratedDocument` (Constitution V requires soft-delete for all entities) | US automotive regulatory requirement: deal records and documents must be retained for a minimum 7 years; no user role may delete them. A `deletedAt` field would imply a deletion pathway exists, which is explicitly prohibited by the spec. | Soft-delete still permits logical removal patterns and could create confusion about whether "deleted" records satisfy retention requirements. No-delete-at-all is stricter and clearer. |
| Synchronous PDF generation via Puppeteer (Constitution VIII suggests background jobs via SQS for report generation) | Document generation is user-triggered, one-at-a-time, within a synchronous UX flow (user clicks "Generate Buyer's Order" and expects to download immediately). Total time ≤ 10s is acceptable. | Async SQS + polling adds significant UX complexity (polling for completion, "document ready" notification) for a single-user-triggered, low-frequency action. Deferred to a future optimization if volume grows. |
| Synchronous sales report aggregation (Constitution VIII: background jobs via SQS) | Single-dealership scale (~500 deals/month) keeps all historical report queries well under the SC-005 5-second target. Inline Prisma query with proper indexes is sufficient. | Async SQS dispatch + polling/webhook for a report that completes in <1s is unnecessary overhead. Re-evaluate if multi-dealership or 5+ year historical queries are added. |
| No Redis caching in this module (Constitution VIII: Redis MUST be used for frequently accessed reference data) | Deal data is transactional and must always reflect the latest state. Caching deal records or report aggregates would introduce stale-data risk for financial figures. | Constitution VIII's Redis mandate targets stable reference data (OEM programs, parts catalog). Financial deal records are mutable and must not be served stale. |

---

## Phase 0: Research Summary

All NEEDS CLARIFICATION items resolved. See [research.md](research.md) for full details.

| Topic | Decision |
|---|---|
| PDF generation library | **Puppeteer** — HTML template → headless Chrome → PDF buffer |
| S3 document storage | Server-side `PutObjectCommand`; pre-signed GET URLs (1hr) for download |
| Atomic deal number | PostgreSQL sequence (`deal_number_seq`) via `prisma.$queryRaw` |
| Concurrent edit detection | `updatedAt` optimistic locking; HTTP 409 with latest deal payload |
| CSV export | `fast-csv` in-memory; NestJS `StreamableFile` with `Content-Disposition: attachment` |
| Status FSM implementation | Explicit transition map constant (`DEAL_STATUS_TRANSITIONS`) — no FSM library needed |
| Document templates | HTML files on disk with `{{placeholder}}` tokens; pure `renderTemplate()` function |

---

## Phase 1: Design

### Data Model

See [data-model.md](data-model.md) for the full Prisma schema.

**New models**: `Deal`, `DealFee`, `TradeIn`, `DealStatusHistory`, `GeneratedDocument`, `DealershipConfig`
**Key constraints**: No deletedAt on Deal or GeneratedDocument; DECIMAL for all monetary fields; DealStatusHistory is insert-only; vehicle double-commitment enforced at application layer.

**Calculation engine** (`DealCalculationService` — pure, no DB):
```
netTrade        = tradeIn.allowance − tradeIn.payoff
totalTax        = (salePrice + Σ taxable fees) × taxRate
amountFinanced  = salePrice + Σ all fees + totalTax − downPayment − netTrade − rebates
monthlyPayment  = APR > 0 ? P × [r(1+r)^n] / [(1+r)^n − 1] : P ÷ n
                = 0 if dealType === CASH
frontEndGross   = salePrice − vehicle.cost
```

### API Contracts

See [contracts/api.md](contracts/api.md) for full request/response shapes and error codes.

**Endpoints summary**:

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/deals` | Sales Consultant | Create deal |
| `GET` | `/api/deals` | All | List deals (role-filtered) |
| `GET` | `/api/deals/:id` | All | Get deal jacket |
| `PATCH` | `/api/deals/:id` | Sales Consultant | Update desking fields |
| `POST` | `/api/deals/:id/fees` | Sales Consultant | Add fee |
| `PATCH` | `/api/deals/:id/fees/:feeId` | Sales Consultant | Update fee |
| `DELETE` | `/api/deals/:id/fees/:feeId` | Sales Consultant | Remove fee |
| `POST` | `/api/deals/:id/trade-in` | Sales Consultant | Add/replace trade-in |
| `PATCH` | `/api/deals/:id/trade-in` | Sales Consultant | Update trade-in |
| `DELETE` | `/api/deals/:id/trade-in` | Sales Consultant | Remove trade-in |
| `POST` | `/api/deals/:id/status` | Varies by transition | Advance/change status |
| `POST` | `/api/deals/:id/documents` | SC, F&I Manager | Generate document |
| `GET` | `/api/deals/:id/documents` | All | List documents |
| `GET` | `/api/deals/:id/documents/:docId/download` | All | Pre-signed download URL |
| `GET` | `/api/reports/sales` | SM, GM | Sales summary report |
| `GET` | `/api/reports/sales/export` | SM, GM | CSV export |
| `GET` | `/api/config/dealership` | Admin, GM | Get config |
| `PATCH` | `/api/config/dealership` | Admin | Update deal number offset |

### Implementation Sequence

Per constitution: **test-first for business logic, API-first before UI**.

```
1. Prisma schema + migrations (Deal, DealFee, TradeIn, DealStatusHistory, GeneratedDocument, DealershipConfig)
2. DealCalculationService unit tests → DealCalculationService implementation
3. Status transition map constants + unit tests → DealStatusService implementation
4. DealRepository (CRUD + atomic deal number + vehicle guard)
5. DealsController + integration tests (deal CRUD, desking, concurrency)
6. DealFeesController + integration tests
7. TradeInController + integration tests
8. DealStatusController + integration tests (full pipeline)
9. DealDocumentsController (PDF + S3) + integration tests
10. SalesReportController + integration tests (aggregations + CSV)
11. ConfigController + integration tests
12. Frontend: shared types, API client hooks
13. Frontend: DealListPage, DealCreatePage, DeskingPage, DealJacketPage
14. Frontend: ManagerApprovalQueuePage, SalesReportPage
15. Cypress E2E tests
16. UI polish (skeleton screens, status badges, empty states, design tokens)
```

### Key Design Decisions

**Calculation on every mutating request**: All desking mutations (PATCH deal, add/edit/remove fee, add/edit/remove trade-in) call `DealCalculationService.recalculate(deal, fees, tradeIn, vehicle)` and persist the result in a single `prisma.$transaction`. This ensures the DB never holds stale computed values and every read returns accurate financials.

**Concurrency**: The `PATCH /api/deals/:id` endpoint compares the client-supplied `updatedAt` with the current DB value before applying any changes. HTTP 409 is returned with the full current deal so the frontend can show a diff-aware conflict warning.

**Role-based query scoping**: `DealsRepository.findAll()` accepts a `scopedToUserId` parameter. When set (Sales Consultant role), it appends `WHERE createdById = :userId` to all queries. No business logic in the controller.

**Document immutability**: `GeneratedDocument` records have no PUT/PATCH/DELETE endpoint. Once generated, a document is permanent. Download is always via a fresh pre-signed URL (never stored URL, which would expire).

**Status history denormalization**: `actorName` and `actorRole` are stored as strings at transition time, not as foreign key references to the User table. This ensures history is accurate even if a user's name or role changes later.

---

## Artifacts

| File | Status |
|---|---|
| [specs/003-sales-deal-management/plan.md](plan.md) | ✅ This file |
| [specs/003-sales-deal-management/research.md](research.md) | ✅ Generated |
| [specs/003-sales-deal-management/data-model.md](data-model.md) | ✅ Generated |
| [specs/003-sales-deal-management/contracts/api.md](contracts/api.md) | ✅ Generated |
| [specs/003-sales-deal-management/tasks.md](tasks.md) | ✅ Generated (76 tasks + 2 added post-analysis) |

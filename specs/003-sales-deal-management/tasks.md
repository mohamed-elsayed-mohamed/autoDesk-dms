# Tasks: Sales Deal Management

**Input**: Design documents from `/specs/003-sales-deal-management/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: Required per constitution (Principle III: test-first for all financial calculations and state machine transitions is NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, scaffold the `deals` module folder structure, define the Prisma schema, and run migrations. All foundational work that must exist before any code is written.

- [x] T001 Add `puppeteer` and `fast-csv` to backend package.json dependencies in `backend/package.json`
- [x] T002 Scaffold NestJS `deals` module folder structure as defined in plan.md under `backend/src/deals/` (module file, sub-folders: calculation/, constants/, dto/, reports/, templates/)
- [x] T003 [P] Create `ConfigModule` folder scaffold for dealership config endpoint in `backend/src/config/`
- [x] T004 Add all new Prisma enums (`DealType`, `DealStatus`, `TradeInCondition`, `DocumentType`) and models (`Deal`, `DealFee`, `TradeIn`, `DealStatusHistory`, `GeneratedDocument`, `DealershipConfig`) to `backend/prisma/schema.prisma` per data-model.md
- [x] T005 Create and run Prisma migration for the schema additions: `npx prisma migrate dev --name add-deals-module` from `backend/`
- [x] T006 Add SQL to migration to create PostgreSQL sequence `deal_number_seq` with starting value from `DealershipConfig.dealNumberOffset` (default 1001) in `backend/prisma/migrations/<timestamp>_add-deals-module/migration.sql`
- [x] T007 Seed `DealershipConfig` table with a single default row (`dealNumberOffset: 1001`) in `backend/prisma/seed.ts`

**Checkpoint**: Schema migrated, module scaffolded, dependencies installed. No application code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure-function calculation engine and status transition FSM. These are the core business logic components — every user story depends on them. Per constitution, **unit tests MUST be written and confirmed failing BEFORE implementation**.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests — Write First, Confirm Failing

- [x] T008 [P] Write unit tests for `DealCalculationService` covering: amortization (Finance/Lease normal case), APR = 0 fallback (`P ÷ n`), taxable-only fee inclusion in tax base, net trade negative equity (payoff > allowance), front-end gross negative (sale below invoice), Cash deal yields `$0` monthly payment in `backend/tests/unit/deals/deal-calculation.service.spec.ts`
- [x] T009 [P] Write unit tests for `validateStatusTransition` covering: all valid transitions (with correct role), all invalid transitions (wrong role, wrong fromStatus), UNWOUND and send-back requiring a note, terminal states (FUNDED, UNWOUND) rejecting all transitions in `backend/tests/unit/deals/deal-status-transitions.spec.ts`

### Implementation — After Tests Fail

- [x] T010 Implement `DealCalculationService` (pure functions, zero DB dependency) with `calculateMonthlyPayment`, `calculateAmountFinanced`, `calculateTotalTax`, `calculateNetTrade`, `calculateFrontEndGross`, `recalculate` orchestrator in `backend/src/deals/calculation/deal-calculation.service.ts` (depends on T008)
- [x] T011 Implement `DEAL_STATUS_TRANSITIONS` constant map and `validateStatusTransition(from, to, role)` function in `backend/src/deals/constants/deal-status-transitions.constants.ts` (depends on T009)
- [x] T012 Implement `DealsRepository` with: `create`, `findAll` (with role-scoped filter), `findOneById`, `updateDesking`, `atomicCreateWithDealNumber` (PostgreSQL sequence via `$queryRaw`), `checkVehicleCommitment` in `backend/src/deals/deals.repository.ts` (depends on T004, T005)
- [x] T013 [P] Create shared TypeScript types for `Deal`, `DealFee`, `TradeIn`, `DealStatusHistory`, `GeneratedDocument`, `DealSummary`, `DealDetail` in `frontend/src/deals/types/deal.types.ts`; re-export all types from `frontend/src/shared/types/index.ts` so both layers consume from the canonical shared package (constitution II)
- [x] T014 Register `DealsModule` with its imports (`PrismaModule`, `AuthModule`; reference to `VehiclesModule` for vehicle cost read) in `backend/src/deals/deals.module.ts` and wire into `AppModule` in `backend/src/app.module.ts`

**Checkpoint**: Calculation engine passing all unit tests. FSM validator passing all unit tests. Repository scaffolded. Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Create Deal and Desking (Priority: P1) 🎯 MVP

**Goal**: Sales Consultant can create a deal linked to a CRM customer and inventory vehicle, enter desking inputs (sale price, down payment, APR, term, tax rate, rebates, fees), and see instantly recalculated amount financed and monthly payment. Front-end gross is always visible. Deals are role-filtered in the list view.

**Independent Test**: Create a Finance deal with `salePrice: $30,000`, doc fee `$799` (taxable), title fee `$150` (non-taxable), `taxRate: 8%`, `APR: 6.9%`, `term: 60`, `downPayment: $3,000`. Verify: `taxable base = $30,799`, `tax = $2,463.92`, `amountFinanced = $30,412.92`, and monthly payment matches standard amortization. Confirm a second deal creation attempt using the same vehicle returns HTTP 409.

### Tests for User Story 1 ⚠️ Write First, Confirm Failing

- [x] T015 [P] [US1] Write integration tests for deal CRUD: create deal (success + vehicle double-commitment 409), read deal jacket, update desking fields (with recalculation verification against acceptance scenario 2 values), optimistic concurrency conflict (stale `updatedAt` returns 409 with current deal) in `backend/tests/integration/deals/deals.integration.spec.ts`
- [x] T016 [P] [US1] Write integration tests for deal fees: add fee (triggers recalc), update fee amount and taxable flag (triggers recalc), remove fee (triggers recalc), verify fee list is empty after all removed in `backend/tests/integration/deals/deal-fees.integration.spec.ts`

### Implementation for User Story 1

- [x] T017 [P] [US1] Create `CreateDealDto` (customerId, vehicleId, dealType) with class-validator decorators in `backend/src/deals/dto/create-deal.dto.ts`
- [x] T018 [P] [US1] Create `UpdateDealDto` (salePrice, downPayment, rebates, apr, term, taxRate, backEndGross, dealType, updatedAt — all optional) in `backend/src/deals/dto/update-deal.dto.ts`
- [x] T019 [P] [US1] Create `CreateDealFeeDto` (name, amount, taxable) and `UpdateDealFeeDto` (all optional) in `backend/src/deals/dto/create-deal-fee.dto.ts` and `backend/src/deals/dto/update-deal-fee.dto.ts`
- [x] T020 [US1] Implement `DealsService`: `createDeal` (vehicle commitment guard + atomic deal number + initial history entry), `findAllForUser` (role-scoped), `findOneOrFail`, `updateDesking` (OCC check + recalculate + persist), all wrapped in `prisma.$transaction` where multi-table in `backend/src/deals/deals.service.ts` (depends on T010, T011, T012)
- [x] T021 [US1] Implement `DealFeesService`: `addFee`, `updateFee`, `removeFee` — each calls `DealCalculationService.recalculate` and persists updated deal totals in `backend/src/deals/deal-fees.service.ts` (depends on T020)
- [x] T022 [US1] Implement `DealsController`: `POST /api/deals`, `GET /api/deals`, `GET /api/deals/:id`, `PATCH /api/deals/:id` with `@UseGuards(JwtAuthGuard, RolesGuard)` decorators in `backend/src/deals/deals.controller.ts`
- [x] T023 [US1] Implement `DealFeesController`: `POST /api/deals/:id/fees`, `PATCH /api/deals/:id/fees/:feeId`, `DELETE /api/deals/:id/fees/:feeId` in `backend/src/deals/deal-fees.controller.ts`
- [x] T024 [P] [US1] Create `StatusBadge` component (color-coded chip per `DealStatus` using semantic palette) in `frontend/src/deals/components/StatusBadge.tsx`
- [x] T025 [P] [US1] Create `DealTable` component with sortable columns, status badge, pagination (default 25), filterable by status/date/salesperson in `frontend/src/deals/components/DealTable.tsx`
- [x] T026 [P] [US1] Create `useDeals` hook (list with filters) and `useDeal` hook (single deal by id) in `frontend/src/deals/hooks/useDeals.ts` and `frontend/src/deals/hooks/useDeal.ts`
- [x] T027 [P] [US1] Create `FeeTable` component (inline add/edit/remove rows, taxable checkbox, live total) in `frontend/src/deals/components/FeeTable.tsx`
- [x] T028 [US1] Create `useDealCalculation` hook — debounced (300ms), calls `PATCH /api/deals/:id`, updates displayed totals within ≤1s in `frontend/src/deals/hooks/useDealCalculation.ts` (depends on T026)
- [x] T029 [P] [US1] Create `DeskingPanel` component — live-recalculating financial summary, field visibility toggled by dealType (hides APR/term/amountFinanced/monthlyPayment for CASH), prominent frontEndGross display in `frontend/src/deals/components/DeskingPanel.tsx`
- [x] T030 [US1] Create `DealListPage` with `DealTable`, role-filtered data, loading skeleton, empty state ("No deals yet — Create your first deal") in `frontend/src/deals/pages/DealListPage.tsx`
- [x] T031 [P] [US1] Create `DealCreatePage` with customer search picker (queries `/api/customers`), available-inventory vehicle picker (queries `/api/vehicles?status=AVAILABLE`), deal type selector in `frontend/src/deals/pages/DealCreatePage.tsx`
- [x] T032 [US1] Create `DeskingPage` composing `DeskingPanel` + `FeeTable` + header with deal number, status badge, and customer/vehicle summary in `frontend/src/deals/pages/DeskingPage.tsx` (depends on T028, T029, T027)
- [x] T033 [US1] Add `/deals`, `/deals/new`, `/deals/:id` routes to frontend router in `frontend/src/App.tsx` (or router config file)

**Checkpoint**: Sales Consultant can create a Finance deal, add fees, and verify the monthly payment calculation matches acceptance scenario 2. Vehicle double-commitment and OCC conflict both return correct errors.

---

## Phase 4: User Story 2 — Trade-In Appraisal (Priority: P2)

**Goal**: Sales Consultant can add a trade-in (VIN optional, ACV, allowance, payoff, lender) to any open deal not yet Delivered. Net trade (allowance − payoff, possibly negative) flows into the amount financed recalculation automatically. Trade-in is editable and removable before Delivered.

**Independent Test**: Add trade-in with `ACV: $8,000`, `allowance: $10,000`, `payoff: $4,500` to an existing Finance deal. Verify `netTrade = $5,500` and `amountFinanced` decreases by $5,500. Remove the trade-in and verify deal recalculates without it. Then add a trade-in where `payoff: $12,000` > `allowance: $10,000` and confirm `netTrade = −$2,000` (amount financed increases).

### Tests for User Story 2 ⚠️ Write First, Confirm Failing

- [x] T034 [P] [US2] Write integration tests for trade-in: add trade-in to Finance deal (verify netTrade and amountFinanced recalculation), update payoff to create negative equity (verify negative netTrade), remove trade-in (verify recalc without net trade), add trade-in with allowance=$0 and payoff=$0 (verify netTrade=$0 and deal totals unchanged — EC-004), attempt to edit trade-in on a DELIVERED deal (expect 403) in `backend/tests/integration/deals/trade-in.integration.spec.ts`

### Implementation for User Story 2

- [x] T035 [P] [US2] Create `UpsertTradeInDto` (vin optional, year, make, model, mileage, condition enum, acv, allowance, payoff, lenderName optional) in `backend/src/deals/dto/upsert-trade-in.dto.ts`
- [x] T036 [US2] Implement `TradeInService`: `upsertTradeIn` (add or replace), `updateTradeIn`, `removeTradeIn` — each enforces status < DELIVERED guard and calls `DealCalculationService.recalculate` in `backend/src/deals/trade-in.service.ts` (depends on T010, T020)
- [x] T037 [US2] Implement `TradeInController`: `POST /api/deals/:id/trade-in`, `PATCH /api/deals/:id/trade-in`, `DELETE /api/deals/:id/trade-in` in `backend/src/deals/trade-in.controller.ts`
- [x] T038 [P] [US2] Create `TradeInForm` component — collapsible section with all trade-in fields, condition dropdown, payoff/lender conditional display, `netTrade` computed display in `frontend/src/deals/components/TradeInForm.tsx`
- [x] T039 [US2] Integrate `TradeInForm` into `DeskingPage` as a collapsible "Trade-In" section; disabled when deal status is DELIVERED or beyond in `frontend/src/deals/pages/DeskingPage.tsx`

**Checkpoint**: Sales Consultant can add/edit/remove a trade-in and see all deal totals (including negative equity) recalculate correctly. Editing is blocked once deal reaches DELIVERED.

---

## Phase 5: User Story 3 — Deal Pipeline and Approval (Priority: P3)

**Goal**: Enforce the complete status pipeline. Sales Manager reviews and approves/sends-back Desking deals. Sales Consultant advances F&I → Contracts Signed → Delivered → Funded, or marks Unwound with a reason. All transitions are recorded immutably in status history. Deal jacket shows full history with actor and timestamp.

**Independent Test**: Take a Desking deal through: Sales Manager approves (→ F&I, history entry with manager name/role/timestamp "Approved"), Sales Manager sends back (→ Desking, note visible to consultant), Sales Consultant advances to Contracts Signed → Delivered → Funded. Verify 5 history entries in correct chronological order. Confirm direct Desking → Delivered attempt returns 409 with valid transitions listed.

### Tests for User Story 3 ⚠️ Write First, Confirm Failing

- [x] T040 [P] [US3] Write integration tests for status pipeline: full valid pipeline sequence (PENDING → DESKING → FNI → CONTRACTS_SIGNED → DELIVERED → FUNDED), invalid transition attempt (409 with validTransitions), send-back flow (FNI → DESKING with note), UNWOUND from each eligible status (with mandatory note), attempt UNWOUND from FUNDED (expect 409), attempt status change by wrong role (expect 403), verify history entries per transition; also test Sales Manager approve on deal with taxRate=0 (expect 422 MISSING_TAX_RATE — EC-006) in `backend/tests/integration/deals/deal-status.integration.spec.ts`

### Implementation for User Story 3

- [x] T041 [P] [US3] Create `TransitionStatusDto` (newStatus: DealStatus, note: string optional — validated required for UNWOUND and FNI → DESKING) in `backend/src/deals/dto/transition-status.dto.ts`
- [x] T042 [US3] Implement `DealStatusService`: `transitionStatus` — validates transition via `validateStatusTransition`, inserts `DealStatusHistory` record with denormalized actorName/actorRole, updates deal status, all in `prisma.$transaction` in `backend/src/deals/deal-status.service.ts` (depends on T011)
- [x] T043 [US3] Implement `DealStatusController`: `POST /api/deals/:id/status` with role guard in `backend/src/deals/deal-status.controller.ts`
- [x] T044 [P] [US3] Create `StatusHistoryTimeline` component — chronological list of history entries, actor name + role badge, timestamp, note (if any) in `frontend/src/deals/components/StatusHistoryTimeline.tsx`
- [x] T045 [US3] Create `DealJacketPage` — read-only view: customer info, vehicle info, full financial breakdown (all line items + totals), trade-in detail, `StatusHistoryTimeline`, documents list placeholder (filled in US4) in `frontend/src/deals/pages/DealJacketPage.tsx`
- [x] T046 [US3] Add pipeline action controls to `DealJacketPage`: contextual action buttons based on current status and caller role (Approve / Send Back / Advance / Unwind), confirmation dialog for Unwind with mandatory note input in `frontend/src/deals/pages/DealJacketPage.tsx` (depends on T045)
- [x] T047 [P] [US3] Create `ManagerApprovalQueuePage` — list of DESKING-status deals filterable by date/salesperson, inline "Approve" and "Send Back" actions with note modal in `frontend/src/deals/pages/ManagerApprovalQueuePage.tsx`
- [x] T048 [US3] Add `/deals/:id/jacket` and `/deals/approval-queue` routes to frontend router in `frontend/src/App.tsx`

**Checkpoint**: Full pipeline is functional. Manager can approve/send-back from queue. Consultant can advance through all stages. Every transition logged with actor and timestamp. Invalid transitions and role violations rejected correctly.

---

## Phase 6: User Story 4 — Document Generation (Priority: P4)

**Goal**: Sales Consultant or F&I Manager generates a buyer's order or bill of sale from any deal with required fields populated. System renders HTML template with deal data → PDF → uploads to S3. Generated documents are permanently stored and downloadable from the deal jacket.

**Independent Test**: Generate a buyer's order from a complete Finance deal. Verify the downloaded PDF contains: customer name, vehicle VIN/stock number, sale price, each fee itemized, total tax, down payment, net trade (with allowance and payoff), rebates, amount financed, APR, term, monthly payment, and current date. For a Cash deal, verify APR/term/amountFinanced/monthlyPayment are absent. Generate two documents for the same deal; verify both appear in the documents list, newest first.

### Tests for User Story 4 ⚠️ Write First, Confirm Failing

- [x] T049 [P] [US4] Write integration tests for document generation: generate BUYERS_ORDER (verify S3 upload called, GeneratedDocument record created), generate BILL_OF_SALE, list documents (newest first), get download URL (pre-signed), attempt generation with taxRate = 0 (expect 422), verify document count grows with repeated generation in `backend/tests/integration/deals/deal-documents.integration.spec.ts`

### Implementation for User Story 4

- [x] T050 [P] [US4] Create `buyers-order.template.html` — full buyer's order layout with all placeholders from contracts/api.md FR-019 list (`{{customer_name}}`, `{{vehicle_vin}}`, `{{sale_price}}`, `{{fee_rows}}`, `{{total_tax}}`, `{{down_payment}}`, `{{net_trade}}`, `{{amount_financed}}`, `{{apr}}`, `{{term}}`, `{{monthly_payment}}`, `{{deal_number}}`, `{{date}}`, etc.) in `backend/src/deals/templates/buyers-order.template.html`
- [x] T051 [P] [US4] Create `bill-of-sale.template.html` — simplified sale document with customer, vehicle, sale price, deal number, and date in `backend/src/deals/templates/bill-of-sale.template.html`
- [x] T052 [P] [US4] Create `GenerateDocumentDto` (documentType: DocumentType) in `backend/src/deals/dto/generate-document.dto.ts`
- [x] T053 [US4] Implement `DealDocumentsService`: `renderTemplate(templatePath, data)` (pure `{{token}}` substitution), `generatePdf(html): Buffer` (Puppeteer headless), `uploadToS3(buffer, key): string` (AWS SDK `PutObjectCommand`, key pattern `deals/{dealId}/documents/{type}-{timestamp}.pdf`), `getPresignedDownloadUrl(key): string` (1-hour expiry), `generateDocument(dealId, type, actor)` orchestrator in `backend/src/deals/deal-documents.service.ts`
- [x] T054 [US4] Implement `DealDocumentsController`: `POST /api/deals/:id/documents`, `GET /api/deals/:id/documents`, `GET /api/deals/:id/documents/:documentId/download` in `backend/src/deals/deal-documents.controller.ts`
- [x] T055 [P] [US4] Create `DocumentsList` component — table of generated documents with type label, formatted timestamp, download button (opens pre-signed URL), newest first in `frontend/src/deals/components/DocumentsList.tsx`
- [x] T056 [US4] Integrate `DocumentsList` into `DealJacketPage` replacing the placeholder from US3; add "Generate Document" button (type dropdown: Buyer's Order / Bill of Sale) in `frontend/src/deals/pages/DealJacketPage.tsx`

**Checkpoint**: Buyer's order and bill of sale generate correctly. All field values from the deal appear verbatim in the PDF. Documents are listed in the deal jacket and are downloadable.

---

## Phase 7: User Story 5 — Sales Reporting (Priority: P5)

**Goal**: Sales Manager and General Manager view a summary sales report filtered by date range showing total units sold, total/average front-end gross, total/average back-end gross — overall and by salesperson. Only Funded deals with `fundedAt` in range are included. Report is exportable as CSV.

**Independent Test**: Fund 3 deals: Consultant A with `frontEndGross: $1,200` and `$800`, Consultant B with `frontEndGross: $2,000`. Query report for their date range. Verify: `totalUnits = 3`, `totalFrontEndGross = $4,000`, `avgFrontEndGross = $1,333.33`, Consultant A breakdown: 2 units / $2,000, Consultant B: 1 unit / $2,000. Fund a 4th deal outside the range and confirm it is excluded. Download CSV and verify it contains the same values.

### Tests for User Story 5 ⚠️ Write First, Confirm Failing

- [x] T057 [P] [US5] Write integration tests for sales report: funded deals in range (verify totals and per-salesperson breakdown match manual calculation), non-funded deals excluded (DELIVERED status excluded), deals outside date range excluded, empty range returns zeros with message, back-end gross null treated as $0, CSV export returns correct content with `Content-Disposition: attachment` header in `backend/tests/integration/deals/sales-report.integration.spec.ts`

### Implementation for User Story 5

- [x] T058 [P] [US5] Create `SalesReportQueryDto` (startDate: string ISO date, endDate: string ISO date — both required, validated as valid dates) in `backend/src/deals/dto/sales-report-query.dto.ts`
- [x] T059 [US5] Implement `SalesReportService`: `aggregateReport(startDate, endDate)` — queries Prisma for FUNDED deals where `fundedAt` in range, groups by `createdById`, calculates totals and averages using Decimal arithmetic; `generateCsv(reportData)` — uses `fast-csv` to produce CSV buffer in `backend/src/deals/reports/sales-report.service.ts`
- [x] T060 [US5] Implement `SalesReportController`: `GET /api/reports/sales` (JSON response), `GET /api/reports/sales/export` (StreamableFile with `Content-Type: text/csv` and `Content-Disposition: attachment` headers) restricted to SALES_MANAGER and GENERAL_MANAGER roles in `backend/src/deals/reports/sales-report.controller.ts`
- [x] T061 [P] [US5] Implement `ConfigService` (`getConfig`, `updateDealNumberOffset` with guard: new offset must exceed current max deal number in DB) and `ConfigController` (`GET /api/config/dealership`, `PATCH /api/config/dealership`) in `backend/src/config/config.service.ts` and `backend/src/config/config.controller.ts`; note: `dealNumberOffset` configures the *initial* PostgreSQL sequence starting value only (set once at migration time via T006) — changing the field post-deploy updates the stored reference value for display and validation but does NOT re-seed the sequence; document this behavior with a code comment in `ConfigService`
- [x] T062 [P] [US5] Create `useSalesReport` hook (fetch report JSON, trigger CSV download via blob URL) in `frontend/src/deals/hooks/useSalesReport.ts`
- [x] T063 [P] [US5] Create `SalesReportTable` component — summary row + per-salesperson rows, currency-formatted Decimal values, "No funded deals in this period" empty state in `frontend/src/deals/components/SalesReportTable.tsx`
- [x] T064 [US5] Create `SalesReportPage` with date-range picker, `SalesReportTable`, "Export CSV" button, loading skeleton, error state in `frontend/src/deals/pages/SalesReportPage.tsx` (depends on T062, T063)
- [x] T065 [US5] Add `/reports/sales` route to frontend router and navigation menu (visible to SALES_MANAGER and GENERAL_MANAGER only) in `frontend/src/App.tsx`

**Checkpoint**: Sales Manager can view report for any date range and download CSV. Only Funded deals within range contribute to totals. Per-salesperson breakdown is accurate.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, UI polish (skeleton screens, empty states, design tokens), accessibility, error boundaries, and final AppModule wiring.

- [x] T066 [P] Cypress E2E — desking flow: Sales Consultant logs in → creates Finance deal → adds trade-in + 2 fees → verifies monthly payment → generates buyer's order → downloads PDF in `frontend/cypress/e2e/deals/desking-flow.cy.ts`
- [x] T067 [P] Cypress E2E — manager approval: Sales Manager views approval queue → sends deal back with note (consultant sees note) → approves deal → deal advances to F&I in `frontend/cypress/e2e/deals/manager-approval.cy.ts`
- [x] T068 [P] Cypress E2E — full pipeline: create deal → desk → approve → contracts signed → delivered → funded; verify 5 history entries with correct actors in `frontend/cypress/e2e/deals/pipeline-to-funded.cy.ts`
- [x] T069 [P] Cypress E2E — sales report: fund 3 deals for 2 consultants → open report → verify totals → click "Export CSV" → verify CSV download initiates in `frontend/cypress/e2e/deals/sales-report.cy.ts`
- [x] T070 [P] Add skeleton screens (matching content shape) to all 6 deal pages: `DealListPage`, `DealCreatePage`, `DeskingPage`, `DealJacketPage`, `ManagerApprovalQueuePage`, `SalesReportPage` in `frontend/src/deals/pages/`
- [x] T071 [P] Add empty state components (illustrative icon + heading + CTA) to `DealListPage` ("No deals yet — Create your first deal") and `SalesReportPage` ("No funded deals in this period") in `frontend/src/deals/pages/`
- [x] T072 [P] Define design tokens for deal status badge colors (PENDING: amber, DESKING: blue, FNI: blue, CONTRACTS_SIGNED: teal, DELIVERED: green, FUNDED: green, UNWOUND: red) in `frontend/src/deals/components/StatusBadge.tsx` and theme config
- [x] T073 Add React error boundaries to all 6 deal pages (friendly retry message, no raw stack traces) in `frontend/src/deals/pages/`
- [ ] T074 [P] Audit all deal forms for WCAG AA compliance: input labels, ARIA attributes, keyboard navigation, color contrast check for status badges in `frontend/src/deals/`
- [x] T075 Wire `SalesReportController` and `SalesReportService` into `DealsModule`'s `controllers` and `providers` arrays (they live in `backend/src/deals/reports/` — no separate `SalesReportModule`); register `DealsModule` and `ConfigModule` in `AppModule`; verify no circular dependency warnings in `backend/src/app.module.ts` and `backend/src/deals/deals.module.ts`
- [x] T077 [P] Write integration tests asserting that no delete endpoints exist for deals or documents: `DELETE /api/deals/:id` → 404 or 405, `DELETE /api/deals/:id/documents/:docId` → 404 or 405 — guards FR-021 and FR-028 (7-year no-delete retention) against future accidental route additions in `backend/tests/integration/deals/no-delete-constraints.integration.spec.ts`
- [x] T078 [P] Write integration tests for F&I Manager role boundaries: (a) CAN `POST /api/deals/:id/documents` → 201, (b) CAN transition to `CONTRACTS_SIGNED` → 200, (c) CANNOT `PATCH /api/deals/:id` financial fields → 403, (d) CANNOT approve deal (DESKING → FNI) → 403, (e) CANNOT fund deal → 403 in `backend/tests/integration/deals/fni-manager-access.integration.spec.ts`
- [ ] T076 Run end-to-end validation: confirm full desking session (create deal → add trade-in → add fees → generate buyer's order → download PDF) completes successfully on local dev environment; manual QA gate for SC-006 (verify 20 representative deals have zero discrepancies in generated buyer's order fields)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **US1 — Desking (Phase 3)**: Depends on Phase 2 — no other user story dependency
- **US2 — Trade-In (Phase 4)**: Depends on Phase 2 — integrates with US1 deal record but independently testable
- **US3 — Pipeline (Phase 5)**: Depends on Phase 2 — integrates with US1 deal record; independently testable
- **US4 — Documents (Phase 6)**: Depends on Phase 2 + US3 (deal jacket integration)
- **US5 — Reporting (Phase 7)**: Depends on Phase 2 + US3 (funded status must exist)
- **Polish (Phase 8)**: Depends on all user story phases being complete — T077 and T078 can run as soon as Phase 3 (US1) backend is wired

### User Story Dependencies

| Story | Hard Dependency | Can Start After |
|---|---|---|
| US1 — Desking | Phase 2 complete | T014 |
| US2 — Trade-In | Phase 2 complete | T014 (can run in parallel with US1 backend) |
| US3 — Pipeline | Phase 2 + US1 deal model | T022 |
| US4 — Documents | Phase 2 + US3 deal jacket | T045 |
| US5 — Reporting | Phase 2 + US3 funded status | T042 |

### Within Each Phase

1. Tests MUST be written and confirmed failing before any implementation in that phase
2. DTOs/constants before services
3. Services before controllers
4. Backend API before frontend pages (API-first per constitution)
5. Hooks before pages (pages depend on hooks)

---

## Parallel Execution Examples

### Phase 2 — Foundational
```
Parallel group A (write tests first):
  T008: Write DealCalculationService unit tests
  T009: Write status transition unit tests
  T013: Create frontend shared types

Sequential after A:
  T010: Implement DealCalculationService     (depends T008)
  T011: Implement status transition constants (depends T009)
  T012: Implement DealsRepository            (depends T010, T011)
```

### Phase 3 — User Story 1
```
Parallel group A (write tests first):
  T015: Integration tests for deal CRUD + desking
  T016: Integration tests for fees

Parallel group B (DTOs — no dependencies):
  T017: CreateDealDto
  T018: UpdateDealDto
  T019: DealFee DTOs

Sequential after A + B:
  T020: DealsService (depends T010, T012, T017, T018)
  T021: DealFeesService (depends T019, T020)
  T022: DealsController (depends T020)
  T023: DealFeesController (depends T021)

Parallel frontend group (after T013):
  T024: StatusBadge component
  T025: DealTable component
  T026: useDeals + useDeal hooks
  T027: FeeTable component
  T029: DeskingPanel component
  T031: DealCreatePage
```

### Phase 5 — User Story 3 (can overlap with US2 Phase 4)
```
T040: Write pipeline integration tests (parallel with US2 T034)
T041: TransitionStatusDto
T042: DealStatusService (after T041)
T043: DealStatusController (after T042)

Parallel frontend (after T044 StatusHistoryTimeline):
  T044: StatusHistoryTimeline
  T047: ManagerApprovalQueuePage
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything — do not skip)
3. Complete Phase 3: User Story 1 (desking + fees + deal list)
4. **STOP and VALIDATE**: Create a Finance deal with fees, verify monthly payment math matches acceptance scenario 2 exactly
5. Deploy/demo — this is a functional desking tool

### Incremental Delivery

| Milestone | Phases Complete | What Works |
|---|---|---|
| MVP | 1, 2, 3 | Deal creation, desking, fee management, deal list |
| Trade-In | + 4 | Full desking with trade-in (covers most real-world deals) |
| Pipeline | + 5 | Manager approval queue, deal jacket, full status lifecycle |
| Documents | + 6 | Buyer's order + bill of sale PDF generation |
| Reporting | + 7 | Sales summary report + CSV export |
| Production-ready | + 8 | E2E tests, polish, accessibility |

### Parallel Team Strategy

With 2 developers after Foundational phase is complete:
- **Dev A**: US1 backend (T020–T023) → US2 backend (T036–T037) → US3 backend (T042–T043)
- **Dev B**: US1 frontend (T024–T033) → US2 frontend (T038–T039) → US3 frontend (T044–T048)

With 3 developers after Foundational:
- **Dev A**: US1 backend + US2 backend
- **Dev B**: US3 backend + US4 backend
- **Dev C**: All frontend (US1 → US2 → US3 → US4) in parallel

---

## Notes

- `[P]` tasks operate on different files with no incomplete-task dependencies — safe to parallelize
- Constitution Principle III is NON-NEGOTIABLE: every test task must be written and confirmed **FAILING** before the corresponding implementation task begins
- All monetary values: `Decimal` (Prisma) / string in API / `parseFloat` only in display formatting — never native JS `number` for financial calculations
- `DealStatusHistory` and `GeneratedDocument`: no delete endpoints, no `deletedAt` — omit from any "soft delete all entities" sweeps
- Commit after each logical group (e.g., after each checkpoint) with Conventional Commits format: `feat(deals):`, `test(deals):`, etc.
- Stop at any **Checkpoint** to validate the user story independently before proceeding to the next

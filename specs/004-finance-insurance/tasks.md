# Tasks: Finance & Insurance (F&I) Office Workflow

**Input**: Design documents from `/specs/004-finance-insurance/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: Required per constitution (Principle III: test-first for all financial calculations is NON-NEGOTIABLE). Unit tests for pure calculation services must be written and confirmed failing before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the `fi` module folder structure, add all Prisma models, run migrations, and seed reference data. All structural work before any logic is written.

- [X] T001 Scaffold `fi` module folder structure as defined in plan.md: create sub-folders `lenders/`, `credit-applications/`, `lender-submissions/`, `fi-products/`, `chargebacks/`, `product-catalog/`, `disclosures/`, `performance-report/`, `audit/`, `calculation/` each with `dto/` sub-folders under `backend/src/modules/fi/`
- [X] T002 Add all new Prisma enums (`HousingType`, `CreditApplicationStatus`, `LenderDecision`, `FiProductType`, `FiProductStatus`, `FiAuditActionType`) and models (`Lender`, `CreditApplication`, `LenderSubmission`, `SelectedLenderDecision`, `FIProduct`, `ProductCatalogItem`, `DisclosureRequirement`, `DisclosureConfirmation`, `FIAuditLog`) to `backend/prisma/schema.prisma` per data-model.md
- [X] T003 Create and run Prisma migration: `npx prisma migrate dev --name add-fi-module` from `backend/`; confirm all 9 new tables created with correct columns and indexes
- [X] T004 Seed reference data in `backend/prisma/seed.ts`: 5 lenders (Ally Financial cap 2.00%, Chase Auto cap 1.75%, Capital One Auto no cap, TD Auto Finance no cap, Westlake Financial cap 2.50%), 8 active `ProductCatalogItem` records (2 VSC, 2 GAP, 1 TIRE_WHEEL, 1 PAINT_PROTECTION, 1 MAINTENANCE_PLAN, 1 OTHER), 3 `DisclosureRequirement` records for jurisdiction `"US-DEFAULT"`
- [X] T005 Create `FiModule` with imports (`PrismaModule`, `AuthModule`) and register all sub-module providers in `backend/src/modules/fi/fi.module.ts`; import `FiModule` into `AppModule` in `backend/src/app.module.ts`

**Checkpoint**: Schema migrated, module scaffolded, seed data ready. No application logic yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure-function services (SSN encryption, F&I calculations) and the cross-cutting audit log service. Every user story depends on these. Per constitution, **unit tests MUST be written and confirmed failing BEFORE implementation**.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

### Tests — Write First, Confirm Failing

- [X] T006 [P] Write unit tests for `SsnEncryptionService` covering: encrypt produces different ciphertext each call (random IV), decrypt(encrypt(ssn)) round-trip returns original, mask returns `XXX-XX-1234` format, mask uses `ssnLastFour` not full SSN, invalid IV throws error in `backend/tests/unit/fi/ssn-encryption.service.spec.ts`
- [X] T007 [P] Write unit tests for `FiCalculationService` covering: `calculateSellRate` (buyRate + markup = sellRate), `calculateMonthlyPayment` at sell rate using standard amortization, `calculateMonthlyPayment` when sellRate = 0 returns `approvedAmount / term`, `calculateFiGross` with mix of ACTIVE/CANCELLED/CHARGED_BACK products (only ACTIVE counted), `calculateFiGross` with negative gross product (cost > sellingPrice), `calculateFiGross` returns zero when all products removed or cancelled, `checkMarkupCapWarning` returns warning string when markup > cap, returns empty array when cap is null in `backend/tests/unit/fi/fi-calculation.service.spec.ts`
- [X] T008 [P] Write unit tests for `LenderSimulatorService` covering: same `(dealId, lenderId)` always returns identical decision (determinism), across 15 unique lender IDs for same deal the distribution covers at least 2 of 3 decision types (Approved/Conditional/Declined), Approved responses have non-null `buyRate` in range 4.50–8.90%, Declined responses have null `buyRate`/`approvedAmount`/`maxTerm` in `backend/tests/unit/fi/lender-simulator.service.spec.ts`

### Implementation — After Tests Fail

- [X] T009 Implement `SsnEncryptionService` with `encrypt(ssn): { ciphertext, iv, lastFour }`, `decrypt(ciphertext, iv): string`, `mask(lastFour): string` using Node.js `crypto` AES-256-GCM; key from `process.env.SSN_ENCRYPTION_KEY` in `backend/src/modules/fi/calculation/ssn-encryption.service.ts` (depends on T006)
- [X] T010 Implement `FiCalculationService` with `calculateSellRate`, `calculateMonthlyPayment`, `calculateFiGross`, `checkMarkupCapWarning` as pure functions with no DB dependency in `backend/src/modules/fi/calculation/fi-calculation.service.ts` (depends on T007)
- [X] T011 Implement `LenderSimulatorService` with `simulateDecision(dealId, lenderId, amountFinanced)` using djb2 hash determinism as documented in research.md in `backend/src/modules/fi/lender-submissions/lender-simulator.service.ts` (depends on T008)
- [X] T012 Implement `FiAuditService` with `log(params: FiAuditLogParams, tx: Prisma.TransactionClient): Promise<void>` — insert-only, always called within caller's transaction. No read endpoint. No update or delete methods in `backend/src/modules/fi/audit/fi-audit.service.ts`
- [X] T013 [P] Create shared TypeScript types for `CreditApplication`, `Lender`, `LenderSubmission`, `SelectedLenderDecision`, `FIProduct`, `FiPerformanceReport`, `DisclosureRequirement`, `DisclosureConfirmation`, `FIAuditLog` in `frontend/src/modules/fi/types/fi.types.ts`

**Checkpoint**: All pure-function unit tests passing. `FiAuditService` and shared types ready. User story implementation can now begin.

---

## Phase 3: User Story 1 — Credit Application (Priority: P1) 🎯 MVP

**Goal**: F&I Manager can create a credit application on an F&I-status deal, capture all required financial fields with SSN encrypted and masked, save as draft or submit, and have one active application enforced per deal.

**Independent Test**: Create a credit application on an F&I-status deal; save as Draft and verify SSN is returned as `XXX-XX-####`; submit and confirm `status = SUBMITTED` with timestamp; attempt to create a second application without `supersede: true` and confirm `409`; supersede with confirmation and confirm original is `ARCHIVED`.

### Tests for User Story 1 ⚠️ Write First, Confirm Failing

- [X] T014 [P] [US1] Write integration tests for credit application lifecycle: create draft (verify SSN never in plain text in response), update draft fields, submit draft (verify status → SUBMITTED + audit log entry CREDIT_APP_CREATED and CREDIT_APP_SUBMITTED), attempt to create second app without supersede → 409, supersede existing submitted app → original ARCHIVED + new DRAFT created + audit log CREDIT_APP_SUPERSEDED, SSN round-trip (API response `ssnMasked` format), Sales Manager read-only access, FI Manager write on non-FNI deal → 422 in `backend/tests/integration/fi/credit-applications.integration.spec.ts`

### Implementation for User Story 1

- [X] T015 [P] [US1] Create `UpsertCreditApplicationDto` (annualIncome, employerName, employmentLengthMonths, housingType, monthlyHousingPayment, ssn, dateOfBirth, supersede) with class-validator decorators in `backend/src/modules/fi/credit-applications/dto/upsert-credit-application.dto.ts`
- [X] T016 [P] [US1] Create `UpdateCreditApplicationDto` (all fields from upsert except ssn and supersede, all optional) in `backend/src/modules/fi/credit-applications/dto/update-credit-application.dto.ts`
- [X] T017 [US1] Implement `CreditApplicationsRepository` with `findActiveByDealId`, `create`, `update`, `archiveById` methods in `backend/src/modules/fi/credit-applications/credit-applications.repository.ts` (depends on T003)
- [X] T018 [US1] Implement `CreditApplicationsService` with: `createOrSupersede` (deal-status guard FNI, one-active enforcement, SSN encrypt via `SsnEncryptionService`, archive prior if supersede, audit log in transaction), `updateDraft` (guard: status must be DRAFT), `submit` (status DRAFT → SUBMITTED, audit log); all multi-table writes in `prisma.$transaction` in `backend/src/modules/fi/credit-applications/credit-applications.service.ts` (depends on T009, T012, T017)
- [X] T019 [US1] Implement `CreditApplicationsController`: `GET /api/deals/:dealId/credit-application`, `POST /api/deals/:dealId/credit-application`, `PATCH /api/deals/:dealId/credit-application`, `POST /api/deals/:dealId/credit-application/submit` with `@UseGuards(JwtAuthGuard, RolesGuard)` and role decorators in `backend/src/modules/fi/credit-applications/credit-applications.controller.ts` (depends on T018)
- [X] T020 [P] [US1] Create `CreditApplicationForm` React component: all required fields with inline validation, SSN input as `type="password"` shown masked after save, draft save button + submit button, supersede warning modal (shows when existing submitted app detected), skeleton loading state in `frontend/src/modules/fi/components/CreditApplicationForm.tsx`
- [X] T021 [P] [US1] Create `useCreditApplication` hook: `getCreditApplication(dealId)`, `saveDraft(dealId, data)`, `submitApplication(dealId)`, `supersede(dealId, data)` with optimistic loading in `frontend/src/modules/fi/hooks/useCreditApplication.ts`
- [X] T022 [US1] Create `CreditApplicationPage` with deal-status awareness (shows read-only view for Sales Manager, full form for F&I Manager), error boundary, empty state "No credit application yet — Start application" in `frontend/src/modules/fi/pages/CreditApplicationPage.tsx` (depends on T020, T021)

**Checkpoint**: F&I Manager can complete and submit a credit application end-to-end. SSN is masked throughout. One active application per deal enforced.

---

## Phase 4: User Story 2 — Lender Submission and Decisions (Priority: P2)

**Goal**: F&I Manager can submit the deal's credit application to one or more lenders (simulated), view decisions in a side-by-side comparison, select an Approved or Conditional decision, enter a rate markup to set the sell rate, and have the deal's APR/term/monthly payment update automatically.

**Independent Test**: Submit a credit application to two lenders; confirm both decisions returned (at least one Approved); select the Approved decision with buy rate 5.90% and markup 1.50%; verify sell rate = 7.40%, deal APR = 7.40%, monthly payment recalculated from approved amount at sell rate; confirm Declined decision cannot be selected; verify audit log entry `LENDER_DECISION_SELECTED` with buy rate, markup, sell rate snapshot.

### Tests for User Story 2 ⚠️ Write First, Confirm Failing

- [X] T023 [P] [US2] Write integration tests for lender submissions: list active lenders from catalog, submit to two lenders → two LenderSubmission records created with simulated decisions + audit entries, Declined decision → cannot select (422), select Approved with 1.50% markup → SelectedLenderDecision created, deal APR = sellRate, monthly payment recalculated, markup warning returned when markup > lender.maxMarkupCap, re-select different decision → prior selection overwritten + LENDER_DECISION_SELECTED audit entry with beforeSnapshot, Sales Manager read-only → no submission or selection allowed in `backend/tests/integration/fi/lender-submissions.integration.spec.ts`

### Implementation for User Story 2

- [X] T024 [P] [US2] Create `CreateLenderDto` (name, isActive, maxMarkupCap optional) and `UpdateLenderDto` (all optional) in `backend/src/modules/fi/lenders/dto/`
- [X] T025 [P] [US2] Create `SubmitToLendersDto` (lenderIds: string[]) and `SelectLenderDecisionDto` (lenderSubmissionId, rateMarkup, selectedTerm) in `backend/src/modules/fi/lender-submissions/dto/`
- [X] T026 [P] [US2] Implement `LendersRepository` with `findAll` (active filter + pagination), `findById`, `create`, `update` in `backend/src/modules/fi/lenders/lenders.repository.ts`
- [X] T027 [US2] Implement `LendersService` with `findAll`, `findActiveById`, `create`, `update` in `backend/src/modules/fi/lenders/lenders.service.ts` (depends on T026)
- [X] T028 [US2] Implement `LendersController`: `GET /api/fi/lenders`, `POST /api/fi/lenders` (Admin only), `GET /api/fi/lenders/:id`, `PATCH /api/fi/lenders/:id` (Admin only) in `backend/src/modules/fi/lenders/lenders.controller.ts` (depends on T027)
- [X] T029 [P] [US2] Implement `LenderSubmissionsRepository` with `createMany`, `findByDealId`, `findById`, `getSelectedDecision`, `upsertSelectedDecision` in `backend/src/modules/fi/lender-submissions/lender-submissions.repository.ts`
- [X] T030 [US2] Implement `LenderSubmissionsService` with: `submitToLenders` (deal-status guard FNI, verify submitted credit app exists, call `LenderSimulatorService` per lender, persist `LenderSubmission` records, audit log `LENDER_SUBMITTED`), `selectDecision` (validate decision is not DECLINED, calculate sellRate via `FiCalculationService.calculateSellRate`, calculate monthlyPayment, upsert `SelectedLenderDecision`, update `Deal.apr/term/monthlyPayment`, capture beforeSnapshot in audit log `LENDER_DECISION_SELECTED`, check markup cap warning, return `warnings[]`); all in `prisma.$transaction` in `backend/src/modules/fi/lender-submissions/lender-submissions.service.ts` (depends on T010, T011, T012, T027, T029)
- [X] T031 [US2] Implement `LenderSubmissionsController`: `GET /api/deals/:dealId/lender-submissions`, `POST /api/deals/:dealId/lender-submissions`, `POST /api/deals/:dealId/lender-submissions/select` with role guards in `backend/src/modules/fi/lender-submissions/lender-submissions.controller.ts` (depends on T030)
- [X] T032 [P] [US2] Create `LenderComparisonTable` component: decision rows with color-coded badges (green = APPROVED, amber = CONDITIONAL, red = DECLINED), approved amount, buy rate, max term, stipulations columns, select action disabled for DECLINED in `frontend/src/modules/fi/components/LenderComparisonTable.tsx`
- [X] T033 [P] [US2] Create `RateMarkupInput` component: numeric input for markup, live sell rate preview (`sellRate = buyRate + markup`), amber warning banner when markup exceeds lender cap, confirm selection button in `frontend/src/modules/fi/components/RateMarkupInput.tsx`
- [X] T034 [P] [US2] Create `useLenderSubmissions` hook: `getSubmissions(dealId)`, `submitToLenders(dealId, lenderIds)`, `selectDecision(dealId, params)` in `frontend/src/modules/fi/hooks/useLenderSubmissions.ts`
- [X] T035 [US2] Create `LenderSubmissionPage` with: multi-select lender list (active only), submit button, `LenderComparisonTable` after response, `RateMarkupInput` on decision select, skeleton loading, empty state "No lender submissions yet", error boundary in `frontend/src/modules/fi/pages/LenderSubmissionPage.tsx` (depends on T032, T033, T034)

**Checkpoint**: F&I Manager can submit to lenders and select a decision. Deal APR and monthly payment update automatically. Markup cap warning displayed when applicable.

---

## Phase 5: User Story 3 — F&I Product Menu (Priority: P3)

**Goal**: F&I Manager can add products from a configurable catalog to the deal, specifying cost and selling price per product. Total F&I gross updates live. Deal back-end gross stays in sync. Products can be edited or removed before delivery.

**Independent Test**: Add a VSC (cost $800, selling price $1,500) and GAP (cost $200, selling price $695) to a deal; verify total F&I gross = $1,195 and deal `backEndGross = $1,195`; edit VSC selling price to $1,400 and verify gross = $1,095; remove GAP and verify gross = $600; attempt add on a DELIVERED deal → 422.

### Tests for User Story 3 ⚠️ Write First, Confirm Failing

- [X] T036 [P] [US3] Write integration tests for F&I products: add VSC + GAP → verify totalFiGross and deal backEndGross, edit product sellingPrice → backEndGross updates atomically, remove product (soft delete) → product gone from list, backEndGross decreases, set product status CANCELLED → excluded from gross, negative gross product allowed (cost > sellingPrice), add on DELIVERED deal → 422, audit log entries for PRODUCT_ADDED / PRODUCT_EDITED / PRODUCT_REMOVED / PRODUCT_STATUS_CHANGED in `backend/tests/integration/fi/fi-products.integration.spec.ts`

### Implementation for User Story 3

- [X] T037 [P] [US3] Create `UpsertCatalogItemDto` (productType, providerName, isActive) in `backend/src/modules/fi/product-catalog/dto/upsert-catalog-item.dto.ts`
- [X] T038 [P] [US3] Implement `ProductCatalogService` with `findAll` (active filter, paginated), `create`, `update` and `ProductCatalogController` with `GET /api/fi/product-catalog`, `POST /api/fi/product-catalog` (Admin), `PATCH /api/fi/product-catalog/:id` (Admin) in `backend/src/modules/fi/product-catalog/product-catalog.service.ts` and `product-catalog.controller.ts`
- [X] T039 [P] [US3] Create `CreateFiProductDto` (productType, providerName, cost, sellingPrice, termMonths, deductible optional, contractNumber optional) and `UpdateFiProductDto` (all optional, status limited to ACTIVE/CANCELLED) in `backend/src/modules/fi/fi-products/dto/`
- [X] T040 [P] [US3] Implement `FiProductsRepository` with `findByDealId` (exclude soft-deleted), `create`, `update`, `softDelete` (sets `deletedAt`), `computeGross` (calls `FiCalculationService.calculateFiGross` in-memory from product list) in `backend/src/modules/fi/fi-products/fi-products.repository.ts`
- [X] T041 [US3] Implement `FiProductsService` with: `addProduct` (deal-status guard FNI or CONTRACTS_SIGNED, create product + recalculate `fiGross` + update `Deal.backEndGross` in `prisma.$transaction` + audit log `PRODUCT_ADDED`), `editProduct` (capture before snapshot, update + recalculate + update Deal + audit log `PRODUCT_EDITED`), `removeProduct` (soft delete + recalculate + update Deal + audit log `PRODUCT_REMOVED`, guard: deal not DELIVERED+), `changeStatus` (guard: cannot set CHARGED_BACK via this method, recalculate + update Deal + audit log `PRODUCT_STATUS_CHANGED`) in `backend/src/modules/fi/fi-products/fi-products.service.ts` (depends on T010, T012, T040)
- [X] T042 [US3] Implement `FiProductsController`: `GET /api/deals/:dealId/fi-products`, `POST /api/deals/:dealId/fi-products`, `PATCH /api/deals/:dealId/fi-products/:productId`, `DELETE /api/deals/:dealId/fi-products/:productId` with role guards in `backend/src/modules/fi/fi-products/fi-products.controller.ts` (depends on T041)
- [X] T043 [P] [US3] Create `FiProductStatusBadge` component: color-coded chip — green (ACTIVE), amber (CANCELLED), red (CHARGED_BACK) using semantic palette in `frontend/src/modules/fi/components/FiProductStatusBadge.tsx`
- [X] T044 [P] [US3] Create `FiProductForm` component: product type selector (from catalog), provider name, cost and selling price inputs (Decimal), term months, deductible (optional), contract number (optional), inline validation in `frontend/src/modules/fi/components/FiProductForm.tsx`
- [X] T045 [P] [US3] Create `FiGrossSummary` component: displays total F&I gross (bold, prominent), individual product gross (selling price − cost per row), negative gross shown in red, updates within 1 second of any change in `frontend/src/modules/fi/components/FiGrossSummary.tsx`
- [X] T046 [P] [US3] Create `FiProductTable` component: product rows with status badge, cost, selling price, gross columns; edit and remove actions (disabled when deal is DELIVERED+); empty state "No F&I products added yet" in `frontend/src/modules/fi/components/FiProductTable.tsx`
- [X] T047 [P] [US3] Create `useFiProducts` hook: `getProducts(dealId)`, `addProduct(dealId, data)`, `editProduct(dealId, productId, data)`, `removeProduct(dealId, productId)` with optimistic gross update in `frontend/src/modules/fi/hooks/useFiProducts.ts`
- [X] T048 [US3] Create `FiProductMenuPage` with `FiProductTable`, `FiProductForm` (add product flow), `FiGrossSummary`, skeleton loading, error boundary, integrates with deal jacket navigation in `frontend/src/modules/fi/pages/FiProductMenuPage.tsx` (depends on T043, T044, T045, T046, T047)

**Checkpoint**: F&I Manager can build the product menu. Total F&I gross and deal back-end gross update in real time. Product lifecycle (add/edit/remove/cancel) fully functional.

---

## Phase 6: User Story 4 — Chargeback Tracking (Priority: P4)

**Goal**: Controllers and F&I Managers can mark a product as charged back on any deal regardless of pipeline status. The F&I performance report shows revenue and chargebacks via independent date filters, with CSV export.

**Independent Test**: Mark a funded deal's VSC as charged back ($600, date 2026-04-01); run performance report for April 2026; verify revenue total reflects March-funded deal if funded before April, chargeback total reflects April chargeback date; export CSV and verify row content; confirm chargeback recording allowed on funded deal by both Controller and F&I Manager roles.

### Tests for User Story 4 ⚠️ Write First, Confirm Failing

- [X] T049 [P] [US4] Write integration tests for chargebacks: record chargeback on ACTIVE product on FUNDED deal (Controller role), record chargeback on ACTIVE product on FUNDED deal (FI Manager role), attempt chargeback on CANCELLED product → 422, verify product status → CHARGED_BACK + chargebackAmount/chargebackDate stored + audit log `CHARGEBACK_RECORDED`, verify `Deal.backEndGross` decreases by the charged-back product's gross contribution (CHARGED_BACK products excluded from `calculateFiGross` per FR-016 + research.md §4) in `backend/tests/integration/fi/chargebacks.integration.spec.ts`
- [X] T050 [P] [US4] Write integration tests for performance report: report with 3 funded deals and 1 chargeback in range shows correct totalFiRevenue/totalChargebacks/netFiRevenue/PVR, chargeback outside date range excluded from chargebacks total, deal funded outside date range excluded from revenue total (dual-window independence verified), zero funded deals → PVR null, CSV export response has correct headers and Content-Disposition in `backend/tests/integration/fi/performance-report.integration.spec.ts`

### Implementation for User Story 4

- [X] T051 [P] [US4] Create `RecordChargebackDto` (chargebackAmount, chargebackDate) with class-validator in `backend/src/modules/fi/chargebacks/dto/record-chargeback.dto.ts`
- [X] T052 [US4] Implement `ChargebacksService` with `recordChargeback(dealId, productId, dto, actor)`: no deal-status guard (chargeback allowed on any status), product status must be ACTIVE, set `status = CHARGED_BACK`, store `chargebackAmount`, `chargebackDate`, `chargebackRecordedById`; recalculate `fiGross` and update `Deal.backEndGross`; audit log `CHARGEBACK_RECORDED` — all in `prisma.$transaction` in `backend/src/modules/fi/chargebacks/chargebacks.service.ts` (depends on T010, T012)
- [X] T053 [US4] Implement `ChargebacksController`: `POST /api/deals/:dealId/fi-products/:productId/chargeback` with role guard (FI Manager, Controller) — **explicitly no deal status restriction** in `backend/src/modules/fi/chargebacks/chargebacks.controller.ts` (depends on T052)
- [X] T054 [US4] Implement `PerformanceReportService` with `getReport(from, to)`: (1) revenue query `Deal.fundedAt BETWEEN from AND to`, include products filtered to `deletedAt: null` AND `status IN (ACTIVE, CANCELLED)` (CHARGED_BACK excluded from revenue — tracked in chargeback total); (2) chargeback query `FIProduct.chargebackDate BETWEEN from AND to AND status = CHARGED_BACK AND deletedAt IS NULL`; merge in service layer; compute PVR = `netFiRevenue / fundedUnits` (null if 0 units) in `backend/src/modules/fi/performance-report/performance-report.service.ts` (depends on T003)
- [X] T055 [US4] Implement `PerformanceReportController`: `GET /api/fi/performance-report?from=&to=` (JSON), `GET /api/fi/performance-report/export?from=&to=` (CSV stream via `fast-csv` + `StreamableFile`, `Content-Disposition: attachment`) with role guard (FI Manager, Controller) in `backend/src/modules/fi/performance-report/performance-report.controller.ts` (depends on T054)
- [X] T056 [P] [US4] Create `ChargebackForm` component: modal triggered from product row, chargeback amount input (Decimal), chargeback date picker, confirmation step with "This action cannot be undone" warning, destructive confirm button in `frontend/src/modules/fi/components/ChargebackForm.tsx`
- [X] T057 [P] [US4] Create `useFiPerformanceReport` hook: `getReport(from, to)`, `exportCsv(from, to)` (triggers file download) in `frontend/src/modules/fi/hooks/useFiPerformanceReport.ts`
- [X] T058 [US4] Create `FiPerformanceReportPage` with date-range picker, summary KPI row (total revenue, chargebacks, net revenue, PVR, funded units — large bold numbers), per-deal breakdown table (sortable, with chargeback detail), CSV export button, skeleton loading, empty state "No funded deals in this period" in `frontend/src/modules/fi/pages/FiPerformanceReportPage.tsx` (depends on T056, T057)

**Checkpoint**: Chargebacks recordable on deals in any status. Performance report reflects dual-window date logic. CSV export functional.

---

## Phase 7: User Story 5 — Compliance and Disclosures (Priority: P5)

**Goal**: F&I Manager can confirm each required disclosure for the deal's jurisdiction. System records confirmation with timestamp and actor identity. Disclosure completion status is visible. All auditable F&I actions appear in the deal's audit log.

**Independent Test**: Configure 2 disclosures for jurisdiction "US-DEFAULT"; open a deal; confirm the first disclosure; verify confirmation record created with correct actor name/role/date; confirm second disclosure; verify deal shows "2 of 2 disclosures confirmed"; attempt to delete a confirmation → 405; retrieve audit log for deal and verify all prior session's actions appear as immutable entries.

### Tests for User Story 5 ⚠️ Write First, Confirm Failing

- [X] T059 [P] [US5] Write integration tests for disclosures: list requirements for jurisdiction, confirm first disclosure → record created (disclosureName snapshot, confirmedByName/Role snapshot, confirmedAt date), confirm same disclosure again → idempotent (200 with existing record, no duplicate), confirm second → isComplete = true, attempt DELETE on confirmation → 405 (no endpoint), Sales Manager can view confirmations read-only in `backend/tests/integration/fi/disclosures.integration.spec.ts`
- [X] T060 [P] [US5] Write integration tests for the audit log endpoint: GET `/api/deals/:dealId/fi-audit-log` returns paginated entries ordered by `createdAt DESC`, entries include actionType/actorName/actorRole/entityType/entityId/timestamps, no POST/PATCH/DELETE endpoints respond (all 404 or 405), test across 5 different action types in `backend/tests/integration/fi/fi-audit.integration.spec.ts`

### Implementation for User Story 5

- [X] T061 [P] [US5] Create `ConfirmDisclosureDto` (disclosureRequirementId) with class-validator in `backend/src/modules/fi/disclosures/dto/confirm-disclosure.dto.ts`
- [X] T062 [US5] Implement `DisclosuresService` with: `getRequirements(jurisdiction)` (list active `DisclosureRequirement` records), `getConfirmations(dealId)` (list + compute required/confirmed/pending + isComplete), `confirmDisclosure(dealId, requirementId, actor)` (idempotent: return existing if already confirmed; else create `DisclosureConfirmation` with name/role snapshots + audit log `DISCLOSURE_CONFIRMED` in `prisma.$transaction`) in `backend/src/modules/fi/disclosures/disclosures.service.ts` (depends on T012)
- [X] T063 [US5] Implement `DisclosuresController`: `GET /api/fi/disclosure-requirements`, `GET /api/deals/:dealId/disclosures`, `POST /api/deals/:dealId/disclosures/confirm` with role guards (F&I Manager write, Sales Manager read) in `backend/src/modules/fi/disclosures/disclosures.controller.ts` (depends on T062)
- [X] T064 [US5] Implement audit log read endpoint: `GET /api/deals/:dealId/fi-audit-log` (paginated, ordered `createdAt DESC`) — read-only, no write endpoints — in a lightweight `FiAuditLogController` that delegates to `FiAuditService.findByDeal(dealId, page, limit)` method added to the audit service in `backend/src/modules/fi/audit/fi-audit.service.ts` and a new `fi-audit-log.controller.ts`
- [X] T065 [P] [US5] Create `DisclosureChecklist` component: renders list of required disclosures from jurisdiction config; unchecked items show checkbox (F&I Manager) or lock icon (Sales Manager read-only); confirmed items show confirming user, role, and date; completion status indicator "N of M disclosures confirmed" with green chip when complete; empty state "No disclosures required for this jurisdiction" in `frontend/src/modules/fi/components/DisclosureChecklist.tsx`
- [X] T066 [P] [US5] Create `useDisclosures` hook: `getRequirements()`, `getConfirmations(dealId)`, `confirmDisclosure(dealId, requirementId)` in `frontend/src/modules/fi/hooks/useDisclosures.ts`
- [X] T067 [US5] Create `DisclosureChecklistPage` with `DisclosureChecklist`, skeleton loading, error boundary, accessible from deal jacket F&I tab in `frontend/src/modules/fi/pages/DisclosureChecklistPage.tsx` (depends on T065, T066)

**Checkpoint**: All 5 user stories independently functional. Disclosures confirmed and immutable. Audit log readable for all deals.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E test coverage, UI polish per constitution XI, security validation, and final quality checks.

- [X] T068 [P] Write Cypress E2E test: F&I Manager opens F&I-status deal → fills and submits credit application → submits to two lenders → views comparison → selects Approved decision with 1.5% markup → verifies sell rate = buy rate + 1.5% and monthly payment updates in deal jacket in `backend/tests/e2e/fi/credit-app-and-lender-flow.cy.ts`
- [X] T069 [P] Write Cypress E2E test: F&I Manager adds VSC ($800 cost / $1,500 selling price) and GAP ($200 / $695) → verifies total F&I gross = $1,195 displayed within 1 second → marks VSC as charged back → verifies product status badge changes to CHARGED_BACK in `backend/tests/e2e/fi/fi-product-menu.cy.ts`
- [X] T070 [P] Write Cypress E2E test: Controller opens performance report → selects date range → verifies summary row totals and per-deal breakdown → clicks CSV export → confirms file download initiated; verify chargeback from prior test appears under correct date-range filter in `backend/tests/e2e/fi/chargeback-and-report.cy.ts`
- [X] T071 [P] Write Cypress E2E test: F&I Manager confirms two disclosures on a deal → verifies "2 of 2 disclosures confirmed" indicator turns green → Sales Manager views same deal in read-only mode → confirms checkbox is disabled in `backend/tests/e2e/fi/disclosures.cy.ts`
- [X] T072 Apply skeleton screen loading states (matching content shape per constitution XI) on all five F&I pages: `CreditApplicationPage`, `LenderSubmissionPage`, `FiProductMenuPage`, `FiPerformanceReportPage`, `DisclosureChecklistPage` in `frontend/src/modules/fi/pages/`
- [X] T073 Add empty states with illustrative icon + descriptive heading + CTA (where applicable) to: product menu ("No products added yet — Add your first product"), lender panel ("No submissions yet — Submit to lenders"), disclosure checklist uses jurisdiction-aware message already in T065; all in relevant page components in `frontend/src/modules/fi/pages/`
- [X] T074 [P] Add error boundaries to all five F&I pages; each boundary shows a user-friendly message with retry action and never a raw stack trace; implement using React error boundary HOC pattern in `frontend/src/modules/fi/pages/`
- [X] T075 Verify SSN security: run integration test asserting that no API endpoint in `fi` module returns `ssnEncrypted`, `ssnIv`, or any unmasked SSN value; check API response shapes for all credit-application endpoints; add test to `backend/tests/integration/fi/credit-applications.integration.spec.ts`
- [X] T076 [P] Apply design token consistency across F&I module: decision badge colors (green/amber/red), product status badge colors, 8px grid spacing, rounded corners (8–12px) on F&I-specific cards and panels — defined via existing theme config or CSS variables; verify no arbitrary pixel values in `frontend/src/modules/fi/`
- [X] T077 Run `npm test && npm run lint` from `backend/`; fix all failing tests and lint errors
- [X] T078 Run `npm run build` from `frontend/`; fix all TypeScript strict-mode errors in F&I module files
- [X] T079 [P] Write integration tests for lender admin CRUD (constitution III: every endpoint needs integration coverage): create lender (Admin role) → 201 with id, update lender name → 200, set `isActive = false` → lender excluded from `/api/fi/lenders` active list but returned if `includeInactive=true`, update `maxMarkupCap` → cap warning fires correctly on next submission, non-Admin role attempts create → 403 in `backend/tests/integration/fi/lenders-admin.integration.spec.ts` (depends on T003)
- [X] T080 [P] Implement admin `DisclosureRequirement` CRUD endpoints: `POST /api/fi/disclosure-requirements` (Admin only — create requirement with jurisdiction + disclosureName), `PATCH /api/fi/disclosure-requirements/:id` (Admin only — update disclosureName or isActive) in `backend/src/modules/fi/disclosures/disclosures.controller.ts` and `disclosures.service.ts` (depends on T062, T063; adds to existing `DisclosuresService.createRequirement` and `updateRequirement` methods)
- [X] T081 [P] Write integration tests for disclosure requirement admin CRUD: create requirement (Admin role) → 201, update `isActive = false` → requirement excluded from `GET /api/fi/disclosure-requirements` active list, non-Admin role attempts create → 403, verify existing confirmations are preserved when requirement deactivated in `backend/tests/integration/fi/disclosure-requirements-admin.integration.spec.ts` (depends on T003)

> **Performance criteria note (SC-003, SC-005)**: SC-003 (F&I gross ≤1s) is validated by the Cypress E2E test T069 (FiGrossSummary update timing). SC-005 (performance report ≤5s) is validated by T070. If timing assertions are needed in integration tests, add them to T036 and T050 respectively.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema must exist for repository tests) — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — can start as soon as Foundation is complete
- **US2 (Phase 4)**: Depends on Phase 2; lightly integrates with US1 (must have a submitted credit application to test submission), but is independently testable with test fixtures
- **US3 (Phase 5)**: Depends on Phase 2; can run in parallel with US1 and US2 after Foundation
- **US4 (Phase 6)**: Depends on Phase 2 and Phase 5 (chargebacks are on FIProduct records, which Phase 5 creates); partially depends on 003-sales-deal-management for funded deals in report
- **US5 (Phase 7)**: Depends on Phase 2 only; fully independent of US1–US4
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Only depends on Foundation — no other story dependency
- **US2 (P2)**: Only depends on Foundation; uses a credit application as test fixture (create one in test setup)
- **US3 (P3)**: Only depends on Foundation — fully independent
- **US4 (P4)**: Depends on Foundation + US3 (uses FIProduct records for chargebacks); performance report needs funded deals from 003
- **US5 (P5)**: Only depends on Foundation — fully independent

### Within Each User Story

- Unit tests (pure function) → WRITE AND FAIL → implement pure service → integration tests → WRITE AND FAIL → implement repository → service → controller → frontend types/hooks → frontend components → page

### Parallel Opportunities

- T006, T007, T008 (unit tests) — all run in parallel in Phase 2
- T009, T010 (pure service implementations) — parallel after their respective tests fail
- T015, T016, T020, T021 (US1 DTOs and frontend) — parallel within Phase 3
- T024, T025, T026, T029 (US2 DTOs and repositories) — parallel within Phase 4
- T032, T033, T034 (US2 frontend components/hooks) — parallel within Phase 4
- T037, T039, T040 (US3 DTOs and repositories) — parallel within Phase 5
- T043, T044, T045, T046, T047 (US3 frontend) — parallel within Phase 5
- T051, T056, T057 (US4 DTOs and frontend) — parallel within Phase 6
- T059, T060 (US5 integration tests) — parallel within Phase 7
- T061, T065, T066 (US5 DTO and frontend) — parallel within Phase 7
- T068, T069, T070, T071 (E2E tests) — parallel within Phase 8
- T072, T073, T074, T076 (UI polish tasks) — parallel within Phase 8

---

## Parallel Example: User Story 3 (F&I Product Menu)

```bash
# After Foundation complete, launch US3 tests in parallel:
Task T036: "Write integration tests for fi-products"

# Then implement in parallel streams:
Stream A — Backend:
  T037: Create DTOs (product-catalog)
  T038: Implement ProductCatalogService + Controller
  T039: Create FiProduct DTOs
  T040: Implement FiProductsRepository
  T041: Implement FiProductsService (sequential after T040)
  T042: Implement FiProductsController (sequential after T041)

Stream B — Frontend (can start after T013 types ready):
  T043: FiProductStatusBadge
  T044: FiProductForm
  T045: FiGrossSummary
  T046: FiProductTable
  T047: useFiProducts hook
  T048: FiProductMenuPage (sequential after above)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Credit Application)
4. **STOP and VALIDATE**: F&I Manager can create, draft, submit, and supersede a credit application. SSN is masked throughout. One active application per deal enforced.
5. Demo / deploy if ready

### Incremental Delivery

1. Setup + Foundation → Infrastructure ready
2. Add US1 (Credit Application) → Test independently → Demo (MVP)
3. Add US2 (Lender Submission) → Test independently → Demo (F&I can get financing)
4. Add US3 (F&I Product Menu) → Test independently → Demo (back-end gross tracking live)
5. Add US4 (Chargebacks + Report) → Test independently → Demo (net F&I performance visible)
6. Add US5 (Compliance) → Test independently → Demo (compliance workflow complete)
7. Polish phase → Production-ready

### Parallel Team Strategy

With multiple developers (after Foundation complete):
- Developer A: US1 (Credit Application) + US2 (Lender Submission)
- Developer B: US3 (F&I Product Menu)
- Developer C: US5 (Compliance/Disclosures) — fully independent

US4 (Chargebacks) can follow US3 completion on Developer B.

---

## Notes

- [P] tasks = different files, no shared dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after Foundation
- Unit tests MUST fail before implementing pure services (constitution III non-negotiable)
- Integration tests MUST fail before implementing service/controller layer
- `FiAuditService.log()` is always called inside the triggering mutation's `$transaction` — never as a fire-and-forget call
- SSN is never returned unmasked; verify with dedicated security integration test (T075)
- Commit after each completed task or logical group
- Stop at any checkpoint to validate the user story independently

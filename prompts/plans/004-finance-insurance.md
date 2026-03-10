# Plan prompt: 004 Finance & Insurance (F&I) Office Workflow

**Use with:** `/speckit.plan` — paste the content below into the command.

**Spec:** [specs/004-finance-insurance/spec.md](../../specs/004-finance-insurance/spec.md)

---

Create the technical implementation plan for the **004-finance-insurance** feature. Follow the project constitution (`.specify/memory/constitution.md`) and this tech stack:

**Backend**
- Node.js with NestJS and TypeScript. New module: `fi`. Clean Architecture: controller → service → repository. Use Prisma as the ORM with PostgreSQL. REST API under `/api/fi` with sub-routes:
  - `/api/fi/lenders` — lender catalog CRUD (admin only)
  - `/api/fi/credit-applications` — create, update, submit; scoped to a deal via query param or `/api/deals/:id/credit-application`
  - `/api/fi/lender-submissions` — submit to lenders, list decisions, select decision; scoped to a deal
  - `/api/fi/products` — add, edit, remove F&I products; scoped to a deal
  - `/api/fi/chargebacks` — record chargeback on a product
  - `/api/fi/disclosures` — list requirements, confirm a disclosure; scoped to a deal
  - `/api/fi/performance-report` — aggregate F&I report with CSV export
- Reuse existing `auth`, `deals` (003-sales-deal-management), `customers` (002-crm), and `vehicles` (001-vehicle-inventory) modules — do not redefine them. The `fi` module reads deal status and writes back APR, term, monthly payment, and back-end gross to the `Deal` record.
- **SSN encryption**: SSN must be encrypted at the application layer before persistence (AES-256-GCM or equivalent). The encryption key is loaded from environment configuration, never hard-coded. In all API responses, SSN is returned as a masked string (`XXX-XX-####`) regardless of caller role. Unmasked SSN is never returned through any standard API endpoint; retrieval for backend lender transmission goes through a dedicated internal service method with explicit audit logging.
- **Rate markup calculation**: Implement as a pure, unit-testable service function. sell rate = buy rate + rate markup (both in percentage points, e.g. 5.90 + 1.50 = 7.40). Monthly payment recalculates using the same amortization formula as 003 (`M = P × [r(1+r)^n] / [(1+r)^n − 1]`; when sell rate = 0 use `M = P ÷ n`), applied to the lender-approved amount. Warn (HTTP 200 + `warnings[]`) when entered markup exceeds the lender's configured max markup cap; do not block the save.
- **Simulated lender integration**: Implement a `LenderSimulatorService` that, given a credit application, deterministically returns a decision per lender (use a simple hash of `dealId + lenderId` modulo 3 to distribute Approved / Conditional / Declined evenly and reproducibly across tests). Approved responses include a buy rate between 4.5% and 8.9% (derived from hash), approved amount matching the deal's amount financed, and max term 72 months. Conditional responses include stipulations. Declined responses have null buy rate, approved amount, and max term.
- **F&I gross calculation**: Implement as a pure service function (unit-testable, no DB dependency). Total F&I gross = sum of (selling price − cost) for all products with status Active on the deal. On any product add, edit, remove, or status change, recalculate and write `backEndGross` on the `Deal` record. Use a Prisma transaction to ensure the product mutation and deal back-end gross update are atomic.
- **Chargeback reporting**: F&I performance report queries two independent date windows: (1) `Deal.fundedAt` within range for revenue totals and funded unit count; (2) `FIProduct.chargebackDate` (user-entered) within range for chargeback totals. Return aggregated totals plus a per-deal breakdown. PVR = net F&I revenue ÷ funded unit count (return null if unit count = 0). Support CSV export via streaming response (`Content-Disposition: attachment; filename="fi-performance-[from]-[to].csv"`). Both F&I Managers and Controllers may access this report.
- **Audit log**: Insert-only `FIAuditLog` table. Write an audit entry (transactionally, within the same Prisma transaction as the triggering mutation) for: credit application created, credit application submitted, lender submission sent, lender decision selected (capture buy rate, markup, sell rate as snapshot fields), F&I product added, F&I product edited (capture before/after selling price and cost), F&I product removed, F&I product status changed (including chargeback), disclosure confirmed. No update or delete endpoint is exposed for audit entries.
- **Immutable records**: `DisclosureConfirmation` and `FIAuditLog` rows are insert-only. Expose no update or delete endpoints for these entities.
- **Deal status guard**: The `fi` module must verify deal status before allowing write operations. Credit application, lender submission, product add/edit/remove, and disclosure confirmation require deal status = F&I (or Contracts Signed for product add per FR-013). Chargeback recording is exempt from status restriction — permitted on deals in any pipeline status.

**Frontend**
- React with TypeScript. Reuse existing component library (Material UI or Ant Design), layout shell, auth context, and role-based routing from 001/002/003. New pages/views, accessible from the deal jacket:
  - **Credit application form**: all required fields; SSN input rendered as password-type field, displayed masked after save; draft save vs. submit actions; warning modal when superseding an existing submitted application.
  - **Lender submission panel**: multi-select lender list (active lenders only); submit button; decision comparison table (lender name, decision badge, approved amount, buy rate, max term, stipulations); select-decision action; rate markup input with sell rate preview and optional cap-exceeded warning; confirm selection button.
  - **F&I product menu**: product list sourced from catalog (filtered to active items); add-product form (type, provider, cost, selling price, term, deductible, contract number); live total F&I gross display updating within 1 second of any change; edit/remove actions (disabled once deal is Delivered); product status badge (Active / Cancelled / Charged Back).
  - **Chargeback form**: modal or inline on the product row; chargeback amount and date inputs; confirmation step.
  - **F&I performance report**: date-range picker; summary row (total revenue, total chargebacks, net revenue, PVR, funded units); per-deal breakdown table; CSV export button (streams download).
  - **Disclosure checklist**: list of required disclosures for the dealership's jurisdiction; checkbox per item (confirm action); confirmed items show confirming user and date; completion status indicator ("N of M confirmed").
- Empty, loading, and error states on all views. Shared TypeScript types for `CreditApplication`, `Lender`, `LenderSubmission`, `SelectedLenderDecision`, `FIProduct`, `DisclosureConfirmation`, `FIAuditLog`.

**Auth & Roles**
- Leverage existing JWT auth and role guards from 001. Roles relevant to this feature and their permission boundaries:
  - **F&I Manager**: full read-write on credit application, lender submission, product menu, disclosures on deals in F&I status; chargeback recording on deals in any status; view F&I performance report and export CSV.
  - **Sales Manager**: read-only access to credit applications (SSN masked), lender decisions, F&I products, and disclosure status on any deal. No write actions.
  - **Controller**: read access to all F&I data; chargeback recording on deals in any status; view and export F&I performance report.
  - **Administrator**: lender catalog CRUD (add, edit, deactivate lenders); disclosure requirement configuration; no deal-level F&I write access beyond standard role.
- Enforce all boundaries at the API level via NestJS guards and decorators; do not rely on UI-only gating.

**Database**
- PostgreSQL via Prisma. New models to add to the existing schema:
  - `Lender`: id, name (unique), isActive (Boolean, default true), maxMarkupCap (Decimal, nullable — max rate markup in percentage points), createdAt, updatedAt.
  - `CreditApplication`: id, dealId (FK → Deal, unique — one active per deal enforced at app layer with status), customerId (FK → Customer), annualIncome (Decimal), employerName, employmentLengthMonths (Int), housingType (enum: OWN / RENT / OTHER), monthlyHousingPayment (Decimal), ssnEncrypted (String — AES-256-GCM ciphertext), ssnIv (String — initialization vector), dateOfBirth (Date), status (enum: DRAFT / SUBMITTED / ARCHIVED), createdBy (FK → User), submittedBy (FK → User, nullable), submittedAt (timestamp, nullable), createdAt, updatedAt.
  - `LenderSubmission`: id, dealId (FK → Deal), creditApplicationId (FK → CreditApplication), lenderId (FK → Lender), submittedAt, decision (enum: APPROVED / CONDITIONAL / DECLINED), approvedAmount (Decimal, nullable), buyRate (Decimal, nullable), maxTerm (Int, nullable), stipulations (String, nullable), isSelected (Boolean, default false), createdAt.
  - `SelectedLenderDecision`: id, dealId (FK → Deal, unique — one selected decision per deal), lenderSubmissionId (FK → LenderSubmission), buyRate (Decimal), rateMarkup (Decimal), sellRate (Decimal), selectedTerm (Int), selectedBy (FK → User), selectedAt, createdAt.
  - `FIProduct`: id, dealId (FK → Deal), productType (enum: VSC / GAP / TIRE_WHEEL / PAINT_PROTECTION / MAINTENANCE_PLAN / OTHER), providerName, cost (Decimal), sellingPrice (Decimal), termMonths (Int), deductible (Decimal, nullable), contractNumber (String, nullable), status (enum: ACTIVE / CANCELLED / CHARGED_BACK), chargebackAmount (Decimal, nullable), chargebackDate (Date, nullable), chargebackRecordedBy (FK → User, nullable), createdAt, updatedAt.
  - `ProductCatalogItem`: id, productType (enum — same as FIProduct), providerName, isActive (Boolean, default true), createdAt, updatedAt.
  - `DisclosureRequirement`: id, jurisdiction (String), disclosureName, isActive (Boolean, default true), createdAt, updatedAt.
  - `DisclosureConfirmation`: id, dealId (FK → Deal), disclosureName (String — snapshot at time of confirmation), confirmedBy (FK → User), confirmedByName (String — snapshot), confirmedByRole (String — snapshot), confirmedAt (Date), createdAt. Insert-only; no update/delete endpoint.
  - `FIAuditLog`: id, dealId (FK → Deal), actionType (enum: CREDIT_APP_CREATED / CREDIT_APP_SUBMITTED / LENDER_SUBMITTED / LENDER_DECISION_SELECTED / PRODUCT_ADDED / PRODUCT_EDITED / PRODUCT_REMOVED / PRODUCT_STATUS_CHANGED / DISCLOSURE_CONFIRMED), actorId (FK → User), actorName (String — snapshot), actorRole (String — snapshot), entityType (String), entityId (String), beforeSnapshot (JSON, nullable), afterSnapshot (JSON, nullable), createdAt. Insert-only; no update/delete endpoint.
- Extend `Deal` model (from 003): no new columns needed — `apr`, `term`, `monthlyPayment`, and `backEndGross` already exist and are updated by this module.
- Indexes: `creditApplications(dealId, status)`, `lenderSubmissions(dealId)`, `lenderSubmissions(lenderId)`, `fiProducts(dealId, status)`, `fiProducts(chargebackDate)`, `disclosureConfirmations(dealId)`, `fiAuditLog(dealId, createdAt)`, `deals(fundedAt)` (already from 003).
- Use Prisma migrations. Do not modify `User`, `Vehicle`, `Customer`, or existing `Deal` columns.

**Quality**
- Unit tests (pure functions, no DB): sell rate calculation (buy rate + markup), monthly payment recalculation at sell rate, sell rate = 0 fallback (equal principal), total F&I gross aggregation (multiple active products, mix of active/cancelled, negative gross), back-end gross sync after product removal, markup cap warning threshold (cap set vs. null), lender simulator determinism (same inputs → same decision), SSN mask output format.
- Integration tests: credit application create/draft/submit lifecycle; supersede existing submitted application with confirmation; lender submission to two lenders → decision comparison → select with markup → verify deal APR and monthly payment updated; F&I product add/edit/remove with back-end gross sync; chargeback recording on funded deal by both F&I Manager and Controller; F&I performance report aggregation (independent date filters for revenue and chargebacks); CSV export content correctness; disclosure confirmation immutability (attempt to delete → 405); audit log entry written for each auditable action; SSN never returned unmasked in API responses.
- E2E (Cypress): F&I Manager opens F&I-status deal → completes and submits credit application → submits to two lenders → views comparison → selects Approved decision with 1.5% markup → verifies sell rate and monthly payment update in deal jacket; adds VSC and GAP products → verifies total F&I gross and back-end gross; Controller marks VSC as charged back → verifies F&I performance report reflects chargeback under correct date filter; F&I Manager confirms two disclosures → disclosure status shows "2 of 2 confirmed."
- Follow constitution: test-first for all calculation and transition business logic, API-first (implement and verify API before building UI screens).

**Out of scope for this plan**
- Actual RouteOne or DealerTrack API integration — lender submission is simulated only.
- Contract printing and generation of F&I product contracts or RISC documents.
- E-signature for F&I contracts or disclosures.
- Accounting journal entries or GL posting for F&I revenue and chargebacks.
- Reserve / dealer participation calculation beyond sell rate = buy rate + markup.
- Credit bureau pulls or soft/hard credit inquiry tracking.
- Automated chargeback notifications from providers.
- Multi-jurisdiction disclosure management within a single dealership.
- Modules from 001-vehicle-inventory, 002-crm, and 003-sales-deal-management are reused as dependencies but not redefined or extended here.

Produce the implementation plan (plan.md), a data-model.md with the full Prisma schema additions, and API contracts for all F&I endpoints. Align with the spec's user stories (P1 credit application, P2 lender submission and decisions, P3 F&I product menu, P4 chargeback tracking, P5 compliance and disclosures) and all clarifications (chargeback access on any deal status, chargeback date as independent filter axis, configurable Lender entity with max markup cap, CSV export for F&I performance report).

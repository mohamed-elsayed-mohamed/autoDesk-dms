# Plan prompt: 003 Sales Deal Management

**Use with:** `/speckit.plan` — paste the content below into the command.

**Spec:** [specs/003-sales-deal-management/spec.md](../../specs/003-sales-deal-management/spec.md)

---

Create the technical implementation plan for the **003-sales-deal-management** feature. Follow the project constitution (`.specify/memory/constitution.md`) and this tech stack:

**Backend**
- Node.js with NestJS and TypeScript. New module: `deals`. Clean Architecture: controller → service → repository. Use Prisma as the ORM with PostgreSQL. REST API under `/api/deals` (plus sub-routes `/api/deals/:id/fees`, `/api/deals/:id/trade-in`, `/api/deals/:id/status`, `/api/deals/:id/documents`, `/api/reports/sales`). Reuse existing `auth`, `customers` (002-crm), and `vehicles` (001-vehicle-inventory) modules — do not redefine them.
- **Calculation engine**: Implement as a pure service function (unit-testable with no DB dependency). Amortization: `M = P × [r(1+r)^n] / [(1+r)^n − 1]`; when APR = 0 use `M = P ÷ n`. Total tax = (sale price + sum of taxable fees) × tax rate. Amount financed = sale price + total fees + total tax − down payment − net trade − rebates. Net trade = allowance − payoff (may be negative). Front-end gross = sale price − vehicle cost/invoice (read from inventory record). Recalculate all derived fields on every mutating request; never store stale computed values.
- **Concurrency**: Record `updatedAt` on Deal. On any save, compare client-provided `updatedAt` against the DB value; if mismatched, return HTTP 409 with the latest deal payload so the client can warn the user ("deal was modified since you opened it").
- **Deal number**: Auto-incrementing integer. Store configurable starting offset in a `DealershipConfig` table (single row). Assign deal number atomically on creation using a DB sequence or locked counter.
- **Vehicle double-commitment guard**: Before linking a vehicle to a new deal, query for any existing non-Unwound deal with the same `vehicleId`; reject with HTTP 409 if found.
- **Status pipeline**: Enforce transitions server-side. Valid transitions: Pending → Desking (automatic on first desking edit), Desking → F&I (Sales Manager approve), F&I → Desking (Sales Manager send-back with note), F&I → Contracts Signed (Sales Consultant or F&I Manager), Contracts Signed → Delivered (Sales Consultant), Delivered → Funded (Sales Consultant), Desking/F&I/Contracts Signed/Delivered → Unwound (Sales Consultant, mandatory reason note). Reject all other transitions with HTTP 422 and enumerate valid next steps.
- **Immutable history**: Every status transition must insert a `DealStatusHistory` record (previousStatus, newStatus, actorId, actorName, actorRole, UTC timestamp, optional note). History rows are insert-only; no update or delete endpoint is exposed.
- **Retention**: Deal records and `GeneratedDocument` rows must never be deleted. Expose no delete endpoint for these entities. Soft-delete is also disallowed. Retention floor is 7 years from deal creation.
- **Document generation**: Render buyer's order and bill of sale by substituting named placeholders (e.g. `{{customer_name}}`, `{{sale_price}}`) in stored templates and converting to PDF (use a lightweight HTML-to-PDF library such as Puppeteer or pdfkit). Store the resulting file in AWS S3 (same bucket pattern as 001-vehicle-inventory photos). Persist a `GeneratedDocument` record with S3 URL and generation timestamp.
- **Sales report**: Query Funded deals where `fundedAt` falls within the requested date range. Aggregate total units, total front-end gross, total back-end gross, average front-end gross per unit, average back-end gross per unit — overall and per Sales Consultant. Support CSV export (stream response with `Content-Disposition: attachment`).

**Frontend**
- React with TypeScript. Reuse existing component library (Material UI or Ant Design), layout shell, auth context, and role-based routing from 001/002. New pages/views:
  - **Deal list**: role-filtered (Sales Consultants see only their own deals; Sales Managers, F&I Managers, and General Managers see all); filterable by status, date range, and salesperson; paginated (default 25).
  - **Deal create form**: customer picker (search existing CRM customers), vehicle picker (available inventory only), deal type selector (Cash / Finance / Lease).
  - **Desking view**: live-recalculating financial panel (debounced on input change, ≤1 s display update); field visibility toggled by deal type (hide APR/term/amount financed/monthly payment for Cash); prominent front-end gross display; inline fee table (add/edit/remove rows); trade-in section (collapsible, add/edit/remove).
  - **Deal jacket**: read-only view with customer info, vehicle info, full financial breakdown, fee itemization, trade-in detail, and chronological status history with actor and timestamp; documents list (download links, newest first).
  - **Manager approval queue**: filterable list of Desking-status deals; inline approve / send-back actions with note entry.
  - **Sales report**: date-range picker, summary totals, per-salesperson breakdown table, CSV export button.
- Empty, loading, and error states on all views. Shared TypeScript types for `Deal`, `DealFee`, `TradeIn`, `DealStatusHistory`, `GeneratedDocument`.

**Auth & Roles**
- Leverage existing JWT auth and role guards from 001. Roles relevant to this feature and their permission boundaries:
  - **Sales Consultant**: create deals (own only); desk (edit financial fields, fees, trade-in) on own deals not yet Delivered; advance pipeline: F&I → Contracts Signed, Contracts Signed → Delivered, Delivered → Funded, any eligible status → Unwound (with note); generate documents; view own deal list and deal jackets.
  - **Sales Manager**: view all deals; approve (Desking → F&I) and send back (F&I → Desking) with note; view manager approval queue; view and export sales report.
  - **F&I Manager**: read-only deal jacket; generate documents; advance F&I → Contracts Signed only.
  - **General Manager**: view all deals; view and export sales report. No pipeline or financial edit actions.
- Enforce all boundaries at the API level via NestJS guards and decorators; do not rely on UI-only gating.

**Database**
- PostgreSQL via Prisma. New models:
  - `Deal`: id, dealNumber (unique integer), customerId (FK → Customer), vehicleId (FK → Vehicle, unique across non-Unwound deals enforced at app layer), dealType (enum: CASH / FINANCE / LEASE), status (enum: PENDING / DESKING / FNI / CONTRACTS_SIGNED / DELIVERED / FUNDED / UNWOUND), salePrice, downPayment, rebates, apr, term, taxRate, totalTax, amountFinanced, monthlyPayment, frontEndGross, backEndGross (nullable, manual entry), createdBy (FK → User), fundedAt (nullable timestamp), createdAt, updatedAt. No `deletedAt` — records must never be soft- or hard-deleted.
  - `DealFee`: id, dealId (FK), name, amount (Decimal), taxable (Boolean), createdAt.
  - `TradeIn`: id, dealId (FK, unique — one trade per deal), vin (nullable), year, make, model, mileage, condition (enum: EXCELLENT / GOOD / FAIR / POOR), acv, allowance, payoff, lenderName (nullable), createdAt, updatedAt.
  - `DealStatusHistory`: id, dealId (FK), previousStatus (nullable — null for initial Pending), newStatus, actorId (FK → User), actorName, actorRole, note (nullable), createdAt. Insert-only; no update/delete.
  - `GeneratedDocument`: id, dealId (FK), documentType (enum: BUYERS_ORDER / BILL_OF_SALE), fileUrl, generatedAt. No delete endpoint.
  - `DealershipConfig`: id, dealNumberOffset (integer, default 1001), updatedAt. Single-row table for configurable deal number starting point.
- Indexes: `deals(status)`, `deals(createdBy)`, `deals(vehicleId)`, `deals(fundedAt)`, `deals(dealNumber)` (unique), `dealStatusHistory(dealId, createdAt)`, `dealFees(dealId)`.
- Use Prisma migrations. Extend existing schema — do not modify `User`, `Vehicle`, or `Customer` models.

**Quality**
- Unit tests (pure functions, no DB): amortization formula (Finance/Lease normal case), APR = 0 fallback (equal principal payments), taxable-only fee inclusion in tax base, net trade negative equity, front-end gross negative (below-invoice deal), status transition validator (valid and invalid paths), deal number allocation logic, concurrent edit conflict detection (updatedAt comparison).
- Integration tests: deal CRUD + vehicle double-commitment guard, full status pipeline sequence, fee add/edit/remove with recalculation verification, trade-in add/edit/remove with recalculation, document generation and S3 storage, sales report aggregation (funded-only filter, per-salesperson breakdown, zero-result empty state), CSV export content correctness.
- E2E (Cypress): Sales Consultant creates Finance deal with trade-in and fees → generates buyer's order → verifies all financial fields in document; Sales Manager views approval queue → approves deal → deal advances to F&I; full pipeline walkthrough from creation to Funded; General Manager views sales report and downloads CSV.
- Follow constitution: test-first for all calculation and transition business logic, API-first (implement and verify API before building UI screens).

**Out of scope for this plan**
- Credit applications and lender submission portals. F&I product menu and back-end product pricing/rate management. Accounting ledger posting and journal entries. OEM incentive lookup and application. E-signature integration for contract execution. Automated lender funding confirmation integrations. Automated tax rate lookup by zip code or jurisdiction.
- Modules from 001-vehicle-inventory (auth, vehicle CRUD, inventory) and 002-crm (customers, leads, activities, tasks) are reused as dependencies but not redefined or extended here.

Produce the implementation plan (plan.md), research.md if needed (e.g. PDF generation library selection, S3 streaming for documents), data-model.md with the full Prisma schema additions, and API contracts for all deal endpoints. Align with the spec's user stories (P1 desking, P2 trade-in, P3 pipeline/approval, P4 document generation, P5 sales reporting) and clarifications (visibility rules, last-write-wins concurrency, auto-incrementing deal number, CSV export, 7-year retention).

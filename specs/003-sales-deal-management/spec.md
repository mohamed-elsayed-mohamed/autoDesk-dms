# Feature Specification: Sales Deal Management

**Feature Branch**: `003-sales-deal-management`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Build AutoDesk DMS — 003-sales-deal-management: the vehicle sales process from desking (structuring the deal) through delivery and funding."

## Clarifications

### Session 2026-03-09

- Q: What is the deal list visibility rule for Sales Consultants? → A: Sales Consultants see only deals they created; Sales Managers, F&I Managers, and General Managers see all deals.
- Q: How should the system handle concurrent edits to the same deal? → A: Last write wins; user is warned if the deal was modified since they opened it.
- Q: Should deals have a human-readable deal number, and what format? → A: Auto-incrementing integer with a configurable starting offset (e.g., 1001, 1002...).
- Q: Should the sales summary report be exportable? → A: CSV export only.
- Q: How long must deal records and generated documents be retained? → A: Minimum 7 years; deal records and documents cannot be deleted by any user role.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Deal and Desking (Priority: P1)

A Sales Consultant creates a new deal by selecting an existing customer from the CRM and a vehicle from inventory. They set the deal type (Cash, Finance, or Lease) and enter sale price, down payment, rebates, APR, and term. They add line-item fees (doc fee, title fee, etc.) with taxable flags. The system instantly recalculates amount financed and monthly payment as they adjust any input. The front-end gross (sale price minus vehicle cost/invoice) is always visible. The deal starts at Pending status and moves to Desking as it is worked.

**Why this priority**: Without a working desking tool, no deal can be structured or tracked. This is the foundational capability all other stories build on. Managers and consultants cannot approve, fund, or report on deals that don't exist in the system.

**Independent Test**: Can be fully tested by creating a Finance deal with fees, verifying monthly payment math matches the standard amortization formula, and confirming deal status transitions from Pending to Desking.

**Acceptance Scenarios**:

1. **Given** a Sales Consultant is logged in with access to CRM and inventory, **When** they create a new deal selecting an existing customer and an available vehicle, **Then** a deal record is created with status Pending and all financial fields initialized to zero.
2. **Given** a Finance deal with sale price $30,000, doc fee $799 (taxable), title fee $150 (non-taxable), tax rate 8%, APR 6.9%, term 60 months, down payment $3,000, no trade or rebates, **When** the system calculates, **Then** taxable base = $30,000 + $799 = $30,799, tax = $30,799 × 0.08 = $2,463.92, amount financed = $30,000 + $799 + $150 + $2,463.92 − $3,000 = $30,412.92, and monthly payment is calculated from that amount using standard amortization.
3. **Given** a deal in Pending status, **When** the consultant edits any desking field, **Then** the deal status automatically changes to Desking.
4. **Given** a Cash deal type is selected, **When** the consultant views the desking screen, **Then** APR, term, amount financed, and monthly payment fields are not displayed.
5. **Given** a Finance deal in Desking, **When** the consultant views the deal, **Then** front-end gross = sale price minus the vehicle's cost/invoice from inventory is prominently displayed.
6. **Given** a fee is added with the taxable flag checked, **When** the deal recalculates, **Then** that fee's amount is included in the taxable base before applying the tax rate.

---

### User Story 2 - Trade-In Appraisal (Priority: P2)

A Sales Consultant adds a trade-in vehicle to an open deal. They enter VIN (optional), year, make, model, mileage, condition (Excellent/Good/Fair/Poor), ACV (actual cash value — what the vehicle is worth to the dealership), allowance (the figure shown to the customer), and payoff amount with lender name if the trade has an outstanding loan. The system uses net trade (allowance minus payoff) in all deal calculations. The consultant can edit or remove the trade-in at any time before the deal reaches Delivered status.

**Why this priority**: Trade-ins are present in the majority of vehicle deals. Without trade-in support the desking math is incomplete and most real-world deals cannot be accurately structured.

**Independent Test**: Can be tested by adding a trade-in with a payoff to an existing Finance deal and verifying that net trade correctly reduces amount financed and recalculates monthly payment.

**Acceptance Scenarios**:

1. **Given** a deal in Desking status, **When** the consultant adds a trade-in with ACV $8,000, allowance $10,000, and payoff $4,500, **Then** net trade = $10,000 − $4,500 = $5,500 and amount financed decreases by $5,500 compared to the no-trade calculation.
2. **Given** a trade-in with no outstanding loan, **When** the consultant enters the trade (payoff = $0), **Then** net trade equals allowance.
3. **Given** a trade-in exists on a deal, **When** the consultant removes it, **Then** the deal recalculates without any net trade and the trade-in record is deleted.
4. **Given** a deal has reached Delivered status, **When** the consultant attempts to edit or remove the trade-in, **Then** the system prevents the change and displays an explanatory message.
5. **Given** a trade-in with payoff ($12,000) exceeding allowance ($10,000), **When** the system calculates net trade, **Then** net trade = −$2,000 (negative equity) and amount financed increases by $2,000.

---

### User Story 3 - Deal Pipeline and Approval (Priority: P3)

A Sales Manager reviews deals in Desking status and either approves them (moving the deal to F&I) or sends them back for revision with a note. A Sales Consultant can advance an F&I deal to Contracts Signed once paperwork is complete, then to Delivered when the customer takes the vehicle, and finally to Funded when the lender funds the deal — or mark it Unwound if the deal falls through at any stage. All users with access can view the deal jacket: customer info, vehicle info, financial breakdown, trade-in detail, fee itemization, and a complete chronological status history with actor names and timestamps.

**Why this priority**: Deal approval and status tracking enforce the dealership's compliance and financial controls. Without this, deals could be delivered without manager sign-off, creating financial and legal risk.

**Independent Test**: Can be tested by taking a Desking deal through manager approval to F&I, then advancing to Contracts Signed, Delivered, and Funded, verifying each status transition appears in history with the correct actor and timestamp.

**Acceptance Scenarios**:

1. **Given** a deal in Desking status, **When** the Sales Manager approves it, **Then** deal status changes to F&I and a history entry records the manager's name, role, timestamp, and action "Approved."
2. **Given** a deal in Desking status, **When** the Sales Manager sends it back for revision with a note, **Then** deal status remains Desking, the revision note is visible to the Sales Consultant, and a history entry is recorded.
3. **Given** a deal in F&I status, **When** the Sales Consultant marks it Contracts Signed, **Then** status changes to Contracts Signed and a history entry is recorded.
4. **Given** a deal in Contracts Signed status, **When** the Sales Consultant marks it Delivered, **Then** status changes to Delivered and a history entry is recorded.
5. **Given** a deal in Delivered status, **When** the Sales Consultant marks it Funded, **Then** status changes to Funded and a history entry is recorded.
6. **Given** a deal in any status before Funded or Delivered, **When** the consultant marks it Unwound with a reason note, **Then** status changes to Unwound and the reason note is stored in the history entry.
7. **Given** a user views the deal jacket, **Then** they see: customer name and contact info, vehicle year/make/model/VIN/stock number, complete financial breakdown (sale price, all fees, total tax, down payment, trade-in allowance, payoff, net trade, rebates, amount financed, APR, term, monthly payment), front-end gross, and all status history entries in chronological order.
8. **Given** an F&I Manager is logged in, **When** they view deals, **Then** they can read deal jackets and generate documents but cannot edit financial fields, approve deals, or trigger pipeline transitions (except advancing Contracts Signed).

---

### User Story 4 - Document Generation (Priority: P4)

A Sales Consultant or F&I Manager generates a buyer's order or bill of sale from a deal. The system populates the appropriate template with all deal data (customer, vehicle, financial terms, date) and stores the resulting document attached to the deal. Previously generated documents remain accessible from the deal jacket.

**Why this priority**: Printed deal paperwork is required for legal and compliance purposes before delivery. This story automates what is otherwise a manual, error-prone process.

**Independent Test**: Can be tested by generating a buyer's order from a complete Finance deal and verifying all fields — customer name, vehicle VIN, sale price, fees, tax, monthly payment, APR, term — appear correctly in the output.

**Acceptance Scenarios**:

1. **Given** a Finance deal with all required fields populated, **When** the user generates a buyer's order, **Then** the document contains: customer name and contact info, vehicle year/make/model/VIN/stock number, sale price, each fee itemized by name and amount, total tax, down payment, trade-in allowance and payoff (if applicable), net trade, rebates, amount financed, APR, term, monthly payment, and the current date.
2. **Given** a document has been generated, **When** the user views the deal jacket, **Then** the document appears in a documents list with its type label and generation timestamp and can be downloaded.
3. **Given** multiple documents have been generated for the same deal, **When** the user views the deal jacket, **Then** all documents are listed, newest first.
4. **Given** a Cash deal, **When** a buyer's order is generated, **Then** APR, term, amount financed, and monthly payment fields are omitted from the document.

---

### User Story 5 - Sales Reporting (Priority: P5)

A Sales Manager or General Manager views a summary sales report filtered by date range. The report shows total units sold, total gross profit (front-end plus back-end combined), average front-end gross per unit, average back-end gross per unit, and all of those figures broken down by salesperson. Only deals in Funded status with a funded date within the selected range are included.

**Why this priority**: Management needs accurate performance data to compensate salespeople, track profitability, and make business decisions. This is purely downstream and requires Funded deals to exist first.

**Independent Test**: Can be tested by funding deals across multiple salespeople in known date ranges, then verifying report totals and per-salesperson figures match manual calculations.

**Acceptance Scenarios**:

1. **Given** three Funded deals in the selected date range (two by Consultant A with front-end gross $1,200 and $800, one by Consultant B with front-end gross $2,000), **When** the Sales Manager views the report, **Then** units sold = 3, total front-end gross = $4,000, average front-end gross = $1,333, and the salesperson breakdown shows Consultant A: 2 units / $2,000 and Consultant B: 1 unit / $2,000.
2. **Given** a deal in Delivered (not Funded) status, **When** the manager views the report, **Then** that deal is excluded from all totals.
3. **Given** a selected date range with no Funded deals, **When** the report loads, **Then** all figures display as zero and a "No funded deals in this period" message is shown.
4. **Given** a Funded deal where back-end gross has not been entered, **When** the report calculates totals, **Then** back-end gross for that deal is treated as $0.

---

### Edge Cases

- What happens when a vehicle selected for a deal is already linked to another active deal? System must prevent double-commitment of the same vehicle to two non-Unwound deals.
- How does the system handle a negative front-end gross (deal sold below invoice)? Must display clearly as a negative value without blocking the deal.
- What happens when APR is 0%? Monthly payment formula must handle zero-interest correctly (equal principal payments; standard formula divides by zero and must use `P / n` fallback).
- What happens when a trade-in has allowance and payoff both equal to $0? Allowed; net trade = $0 and deal math is unaffected.
- What happens if the consultant attempts to advance deal status out of the permitted sequence (e.g., jump from Desking to Delivered)? System must reject the transition and explain valid next steps.
- What happens when tax rate is not set on a deal? System must surface a validation error and prevent finalizing desking calculations until a tax rate is provided.
- What happens when two users edit the same deal simultaneously? The last save wins; the user whose save completes second is shown a warning indicating the deal was modified since they opened it, with an option to reload the latest version.

## Requirements *(mandatory)*

### Functional Requirements

**Deal Creation & Linking**

- **FR-001**: Sales Consultants MUST be able to create a deal by selecting an existing CRM customer and an available inventory vehicle.
- **FR-002**: System MUST prevent the same vehicle from being linked to more than one non-Unwound deal simultaneously.
- **FR-003**: System MUST support three deal types: Cash, Finance, and Lease.
- **FR-024**: Sales Consultants MUST only see deals they personally created. Sales Managers, F&I Managers, and General Managers MUST be able to see all deals in the system.
- **FR-025**: When a user saves a deal that was modified by another user since the current user opened it, the system MUST display a warning and offer to reload the latest version; the save is still applied (last write wins).
- **FR-026**: System MUST assign each deal a unique, auto-incrementing deal number upon creation. The starting number MUST be configurable per dealership. The deal number MUST appear on all generated documents (buyer's order, bill of sale).

**Desking & Calculations**

- **FR-004**: For Finance and Lease deals, system MUST calculate monthly payment using the standard loan amortization formula: `M = P × [r(1+r)^n] / [(1+r)^n − 1]` where P = amount financed, r = monthly interest rate (APR ÷ 12), n = term in months. When APR = 0, monthly payment = P ÷ n.
- **FR-005**: System MUST calculate amount financed as: sale price + total fees + total tax − down payment − net trade − rebates.
- **FR-006**: System MUST calculate total tax as: (sale price + sum of taxable fees) × tax rate.
- **FR-007**: System MUST recalculate all financial totals immediately whenever any desking input changes (sale price, down payment, APR, term, rebates, tax rate, fees, or trade-in values).
- **FR-008**: System MUST display front-end gross (sale price minus vehicle cost/invoice from inventory) prominently on the desking view.
- **FR-009**: Sales Consultants MUST be able to add, edit, and remove line-item fees on any deal not yet in Delivered status; each fee requires a name, dollar amount, and taxable flag.
- **FR-010**: For Cash deals, system MUST not display or calculate APR, term, amount financed, or monthly payment.

**Trade-In**

- **FR-011**: Sales Consultants MUST be able to add a trade-in to any deal not yet in Delivered status, capturing: VIN (optional), year, make, model, mileage, condition (Excellent / Good / Fair / Poor), ACV, customer allowance, payoff amount, and lender name.
- **FR-012**: System MUST calculate net trade = allowance − payoff and apply net trade in the amount financed calculation; net trade may be negative (negative equity).
- **FR-013**: Sales Consultants MUST be able to edit or remove the trade-in on any deal not yet in Delivered status.

**Status Pipeline**

- **FR-014**: System MUST enforce the following status transitions and reject all others:
  - Pending → Desking (on first desking edit, automatic)
  - Desking → F&I (Sales Manager approval action)
  - F&I → Contracts Signed (Sales Consultant or F&I Manager)
  - Contracts Signed → Delivered (Sales Consultant)
  - Delivered → Funded (Sales Consultant)
  - Desking/F&I/Contracts Signed/Delivered → Unwound (Sales Consultant, with mandatory reason note)
  - F&I → Desking (Sales Manager send-back with note)
- **FR-015**: Every status transition MUST be recorded in the deal's status history with: previous status, new status, actor name and role, UTC timestamp, and optional note.
- **FR-016**: Sales Managers MUST be able to view a list of all Desking-status deals and perform approve or send-back actions from that view.

**Deal Jacket**

- **FR-017**: All users with deal access MUST be able to view a deal jacket containing: customer information, vehicle information, complete financial breakdown (all line items, fees, trade-in, totals), and full chronological status history.
- **FR-018**: F&I Managers MUST have read-only access to deals except for document generation and the Contracts Signed status advancement.

**Document Generation**

- **FR-019**: Sales Consultants and F&I Managers MUST be able to generate a buyer's order from any deal with all required financial fields populated; the document must include all data listed in US-4 scenario 1.
- **FR-020**: Sales Consultants and F&I Managers MUST be able to generate a bill of sale from any deal.
- **FR-021**: All generated documents MUST be stored and remain retrievable from the deal jacket for a minimum of 7 years from the deal creation date. No user role may delete a generated document.
- **FR-028**: Deal records (including all fees, trade-in data, status history, and financial terms) MUST be retained for a minimum of 7 years from the deal creation date. No user role may delete a deal record.

**Sales Reporting**

- **FR-022**: Sales Managers and General Managers MUST be able to view a sales summary report filtered by a start and end date showing: total units sold, total gross profit (front-end + back-end), average front-end gross per unit, average back-end gross per unit, and all metrics broken down by salesperson.
- **FR-023**: Sales reports MUST include only deals in Funded status where the funded date falls within the selected date range.
- **FR-027**: Sales Managers and General Managers MUST be able to export the sales summary report as a CSV file containing all report rows (summary totals and per-salesperson breakdown) for the selected date range.

### Key Entities

- **Deal**: Central record linking customer, vehicle, and all financial terms. Attributes: deal number (auto-incrementing integer, configurable starting offset), deal type (Cash/Finance/Lease), status, sale price, down payment, rebates, APR, term, tax rate, amount financed, monthly payment, front-end gross, back-end gross, created-by (salesperson reference), funded date, timestamps.
- **Deal Fee**: Line item on a deal. Attributes: name, dollar amount, taxable flag, linked deal.
- **Trade-In**: Vehicle being traded by the customer. Attributes: VIN (optional), year, make, model, mileage, condition (Excellent/Good/Fair/Poor), ACV, allowance, payoff, lender name, linked deal.
- **Deal Status History**: Immutable log entry per status transition. Attributes: deal reference, previous status, new status, actor name, actor role, UTC timestamp, note.
- **Generated Document**: A document produced from a template. Attributes: document type (buyer's order / bill of sale), generation timestamp, stored file reference, linked deal.
- **Customer** (from 002-crm): Referenced by deal; not owned or modified by this module.
- **Vehicle** (from 001-vehicle-inventory): Referenced by deal; cost/invoice read for front-end gross calculation; not modified by this module.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Sales Consultant can complete a full desking session — creating a deal, adding a trade-in, adding fees, and generating a buyer's order — in under 10 minutes from deal creation to document download.
- **SC-002**: Monthly payment and amount financed recalculate and display updated values within 1 second of any desking input change, with no user-initiated save action required.
- **SC-003**: 100% of deals that reach Funded status passed through Delivered status first; no pipeline-sequence violations exist in the system.
- **SC-004**: A Sales Manager can view the Desking deal queue and approve or send back a deal in under 2 minutes.
- **SC-005**: The sales summary report for any date range loads and displays complete results in under 5 seconds regardless of the number of funded deals in the system.
- **SC-006**: Generated buyer's order documents contain zero discrepancies in customer name, vehicle VIN, or any financial total compared to the deal record, as verified by QA review across 20 representative test deals.
- **SC-007**: Every status change on every deal is captured in the status history with actor identity and timestamp — 100% of transitions, no exceptions.

## Assumptions

- Tax rate is entered manually per deal. A future feature may add a dealership-wide tax rate configuration table; that is out of scope here.
- Back-end gross (F&I product profit) is a manually entered dollar field on the deal for reporting purposes. F&I product menu and rate management are out of scope.
- "Contracts Signed" status is set manually by the consultant or F&I manager when physical paperwork is signed; no e-signature integration is required.
- Vehicle cost/invoice is stored on the inventory vehicle record (from 001-vehicle-inventory) and is readable by this module.
- Lease deal type uses APR and term as a simplified monthly payment approximation. Residual value and money factor calculations are out of scope for this feature.
- Document templates use named placeholders (e.g., `{{customer_name}}`, `{{sale_price}}`). The rendering mechanism (HTML-to-PDF or equivalent) is a platform capability outside this spec's scope.
- The General Manager role exists in the platform's role/permission system alongside Sales Consultant, Sales Manager, and F&I Manager.
- Salesperson attribution on a deal is the Sales Consultant who created it. Re-attribution is out of scope.
- Deal records and generated documents must be retained for a minimum of 7 years, consistent with US automotive retail regulatory requirements (IRS and state DMV). No deletion is permitted by any user role within this system.

## Out of Scope

- Credit applications and lender submission portals
- F&I product menu and back-end product pricing/rate management
- Accounting ledger posting and journal entries
- OEM incentive lookup and application
- E-signature integration for contract execution
- Automated lender funding confirmation integrations
- Automated tax rate lookup by zip code or jurisdiction

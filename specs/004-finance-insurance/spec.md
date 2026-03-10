# Feature Specification: Finance & Insurance (F&I) Office Workflow

**Feature Branch**: `004-finance-insurance`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Build AutoDesk DMS — 004-finance-insurance: the F&I office workflow — credit application, lender submission, rate markup, and F&I product menu (extended warranty, GAP, tire/wheel, etc.)."

## Clarifications

### Session 2026-03-10

- Q: Should F&I Managers retain chargeback write access on funded/delivered deals, or does their write access end when the deal leaves F&I status? → A: Both F&I Managers and Controllers can record chargebacks on deals in any status, regardless of pipeline stage. FR-027's F&I status scope applies only to non-chargeback F&I actions.
- Q: When filtering chargebacks by date range in the F&I performance report, which date determines inclusion? → A: The user-entered chargeback date (the date the dealership received the chargeback), not the system entry date or the deal's funded date.
- Q: Should the lender list be a configurable entity or fixed mock entries? → A: Configurable Lender entity — admins manage lender records with name, active flag, and optional max markup cap (in percentage points).
- Q: Should the F&I performance report be exportable? → A: Yes, CSV export — consistent with the 003 sales report pattern.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Credit Application (Priority: P1)

An F&I Manager opens a deal that has been moved to F&I status by the Sales Manager. They complete a credit application for the deal's customer by entering income details, employer name, length of employment, housing type (Own / Rent / Other), and monthly housing payment. Sensitive fields — Social Security Number (SSN) and date of birth (DOB) — are captured and stored with appropriate security controls; SSN is displayed masked (last four digits only) after initial entry. The manager can save the application as a draft to return later, or mark it as submitted. Only one credit application can be active per deal at a time; creating a new application on a deal that already has one replaces the prior draft or requires the existing submitted application to be explicitly superseded.

**Why this priority**: A complete credit application is the prerequisite for all lender submission activity. Without it, the F&I process cannot begin. This is the foundational data-collection step for the most profitable area of the dealership.

**Independent Test**: Can be fully tested by creating a credit application on an F&I-status deal, saving as draft, then completing and submitting — verifying that all fields are captured, SSN is masked after entry, and only one active application exists per deal.

**Acceptance Scenarios**:

1. **Given** a deal in F&I status, **When** the F&I Manager opens the credit application form and enters all required fields (income, employer, length of employment, housing type, monthly housing payment, SSN, DOB) and saves as draft, **Then** the application is stored with status Draft and all field values are preserved; SSN is displayed as `XXX-XX-####` (last four digits only).
2. **Given** a draft credit application on a deal, **When** the F&I Manager returns and submits the application, **Then** application status changes to Submitted and the submission is recorded with the submitting user's identity and a UTC timestamp.
3. **Given** a deal already has a Submitted credit application, **When** the F&I Manager attempts to create a new application, **Then** the system warns that an active application exists and requires explicit confirmation before allowing the new application to supersede it; upon confirmation, the previous application is archived and the new one becomes the active application.
4. **Given** an F&I Manager is viewing a credit application, **When** they view the SSN field after initial save, **Then** only the last four digits are visible; the full SSN is not displayed in the UI at any point after entry.
5. **Given** a Sales Manager is logged in, **When** they view a deal in F&I status, **Then** they can see the credit application in read-only mode (with SSN masked) but cannot edit or submit it.

---

### User Story 2 - Lender Submission and Decisions (Priority: P2)

An F&I Manager submits a deal's Submitted credit application to one or more lenders. The system sends the application to each selected lender and receives back a decision (the integration is simulated with mock responses for this feature). Decisions are displayed in a side-by-side comparison view showing: lender name, decision (Approved / Conditional / Declined), approved amount, buy rate, maximum term, and any stipulations. The manager selects one approved or conditional decision to attach to the deal. They may optionally enter a rate markup (in percentage points) on top of the buy rate; the system records both the buy rate (the rate the lender charges the dealership) and the resulting sell rate (the rate presented to the customer: buy rate + markup). The deal's financing terms — APR (set to sell rate), term, and monthly payment — are automatically updated based on the selected decision and markup.

**Why this priority**: Securing financing is the next step after credit application and directly determines the deal's financing terms. Without lender decisions and the buy rate/sell rate spread, the dealership's F&I profit on rate cannot be tracked.

**Independent Test**: Can be tested by submitting a credit application to two simulated lenders, receiving decisions, selecting one with a markup, and verifying the deal's APR equals the sell rate and monthly payment recalculates correctly.

**Acceptance Scenarios**:

1. **Given** a deal with a Submitted credit application, **When** the F&I Manager submits to two lenders, **Then** both lender submissions are recorded and the system returns a simulated decision for each (at least one Approved, illustrating all three possible statuses across test runs); the comparison view shows all responses side by side.
2. **Given** a lender comparison view with decisions, **When** the F&I Manager selects an Approved decision with buy rate 5.9%, approved amount $28,000, max term 72 months, and enters a rate markup of 1.5 percentage points, **Then** the deal records buy rate = 5.9%, rate markup = 1.5%, sell rate = 7.4%, APR = 7.4%, approved amount = $28,000, term = the chosen term (≤72 months), and monthly payment recalculates using the sell rate.
3. **Given** a Declined lender decision, **When** the F&I Manager views the comparison, **Then** approved amount, buy rate, and max term fields are shown as "N/A" and the decision cannot be selected to attach to the deal.
4. **Given** a deal with a lender decision attached, **When** the F&I Manager selects a different lender decision and confirms, **Then** the deal's financing terms update to reflect the newly selected decision and the previous selection is recorded in the audit log.
5. **Given** an F&I Manager submits to a lender with a zero rate markup, **Then** sell rate equals buy rate and the deal's APR is updated accordingly.
6. **Given** a Sales Manager is logged in, **When** they view the lender submission section of a deal, **Then** they can see all submitted lender requests, decisions, and the selected decision in read-only mode.

---

### User Story 3 - F&I Product Menu (Priority: P3)

An F&I Manager presents the F&I product menu to the customer and records the products sold. The product list is configurable (administered separately). The manager selects products to add to the deal, choosing from available products of types including: Extended Warranty / VSC (Vehicle Service Contract), GAP (Guaranteed Asset Protection), Tire & Wheel, Paint Protection, and Maintenance Plan. For each product added, they record: provider name, cost (dealer's cost from the provider), selling price (what the customer pays), term in months, and optional deductible amount. A contract number and product status (Active / Cancelled) can also be recorded. The deal displays total F&I gross — the sum of (selling price minus cost) across all active products — which is reflected in the deal's back-end gross. The manager can edit or remove any product before the deal reaches Delivered status.

**Why this priority**: F&I products are the primary source of back-end gross profit. Accurate capture of cost and selling price is essential for profitability tracking and is a core dealership revenue function.

**Independent Test**: Can be tested by adding two F&I products (a VSC and GAP) to a deal, verifying total F&I gross = (VSC selling price − VSC cost) + (GAP selling price − GAP cost), and confirming the deal's back-end gross updates to match.

**Acceptance Scenarios**:

1. **Given** an F&I Manager is on a deal in F&I status, **When** they add a VSC with cost $800, selling price $1,500, term 48 months, and deductible $100, and then add GAP with cost $200, selling price $695, no deductible, **Then** total F&I gross = ($1,500 − $800) + ($695 − $200) = $700 + $495 = $1,195 and the deal's back-end gross updates to $1,195.
2. **Given** a product has been added to a deal in F&I status, **When** the F&I Manager edits the selling price of the VSC from $1,500 to $1,400, **Then** total F&I gross recalculates to $1,095 and back-end gross updates accordingly.
3. **Given** a product has been added to a deal, **When** the F&I Manager removes the GAP product, **Then** that product no longer appears in the deal's product list, total F&I gross decreases by the removed product's gross contribution, and back-end gross updates.
4. **Given** a deal has reached Delivered status, **When** the F&I Manager attempts to add, edit, or remove a product, **Then** the system prevents the change and displays an explanatory message.
5. **Given** a product is added to the deal, **When** the F&I Manager records the contract number and status as Active, **Then** those values are stored and displayed in the product list.
6. **Given** a product is listed as Active, **When** the F&I Manager sets its status to Cancelled (not a chargeback), **Then** the product status updates to Cancelled and that product's gross is excluded from total F&I gross and back-end gross.

---

### User Story 4 - Chargeback Tracking (Priority: P4)

A Controller or F&I Manager marks an F&I product that was previously sold as charged back — meaning the customer cancelled the product or the dealership must return the provider's commission. They record the chargeback amount and the date the chargeback occurred. The system maintains a net F&I performance view showing, for a selected date period: total F&I revenue (sum of all product selling prices from funded deals), total chargebacks (sum of recorded chargeback amounts), and net F&I revenue (revenue minus chargebacks). The same figures are viewable per individual deal. PVR (per vehicle retailed) is derived from net F&I revenue divided by funded units in the period.

**Why this priority**: Chargebacks directly reduce dealership income and must be tracked to accurately measure net F&I performance. Without chargeback recording, F&I gross is overstated and compensation calculations are incorrect.

**Independent Test**: Can be tested by marking two products on a funded deal as charged back, recording amounts, then verifying the period chargeback total and net F&I revenue reflect the correct deductions.

**Acceptance Scenarios**:

1. **Given** an Active F&I product on a funded deal, **When** the Controller records a chargeback with amount $600 and date 2026-04-01, **Then** a chargeback record is created linking to the product, and the product is marked as Charged Back.
2. **Given** a period report with two funded deals — Deal A (VSC selling price $1,500, GAP selling price $695) and Deal B (VSC selling price $1,200, chargeback recorded for $800) — **When** the Controller views the F&I period report, **Then** total F&I revenue = $3,395, total chargebacks = $800, net F&I revenue = $2,595.
3. **Given** the Controller views an individual deal's F&I summary, **Then** they see a breakdown of all products, each product's selling price, any chargeback amount, and net contribution for that deal.
4. **Given** a period with 10 funded deals and net F&I revenue of $11,950, **When** the report displays PVR, **Then** PVR = $11,950 ÷ 10 = $1,195.
5. **Given** an F&I Manager (not Controller) is logged in, **When** they attempt to record a chargeback, **Then** they are permitted to do so (both roles have chargeback access).

---

### User Story 5 - Compliance and Disclosures (Priority: P5)

An F&I Manager must confirm that all required disclosures for the deal's jurisdiction have been verbally or physically presented to the customer before the deal is finalized. The list of required disclosures is configurable per jurisdiction at the system level. For each required disclosure, the F&I Manager checks it off, and the system records the disclosure name, the date it was presented, and the identity of the F&I Manager who confirmed it. The system does not store the actual disclosure document content. A complete audit log captures: who completed the credit application, who submitted to each lender, who selected the lender decision, who added each F&I product, and who confirmed each disclosure.

**Why this priority**: Disclosure confirmation is a regulatory requirement and represents dealership compliance risk if not tracked. The audit log supports F&I compliance reviews and protects the dealership in the event of a dispute.

**Independent Test**: Can be tested by configuring two required disclosures for a jurisdiction, confirming both on a deal, and verifying the audit log records the F&I Manager's identity, disclosure name, and date for each.

**Acceptance Scenarios**:

1. **Given** a jurisdiction with two configured required disclosures ("RISC Notice" and "GAP Waiver Notice"), **When** the F&I Manager confirms "RISC Notice," **Then** the system records: disclosure name = "RISC Notice," confirmed by = F&I Manager's name, confirmed date = today's date, deal reference.
2. **Given** two required disclosures for the deal's jurisdiction, **When** the F&I Manager confirms both, **Then** both appear in the deal's disclosure log with individual timestamps and the deal is marked as disclosures complete.
3. **Given** a deal with incomplete disclosures (one of two confirmed), **When** a Sales Manager views the deal, **Then** the disclosure status shows "1 of 2 disclosures confirmed" and the unconfirmed item is listed.
4. **Given** any of the following actions occurs on a deal — credit application submitted, lender submission sent, lender decision selected, F&I product added or removed, or disclosure confirmed — **When** the action completes, **Then** an audit log entry is recorded with: action type, actor name and role, UTC timestamp, and relevant entity reference (credit app, lender submission, product, or disclosure).
5. **Given** an audit log entry has been created, **Then** no user role can edit or delete that entry.

---

### Edge Cases

- What happens when a deal is moved back from F&I to Desking status (Sales Manager send-back)? The credit application and any lender submissions remain stored and visible but cannot be edited. If the deal returns to F&I status, existing data is preserved.
- What happens when the sell rate produces a monthly payment that exceeds the lender's approved amount cap? The system must display a warning but does not block the F&I Manager from proceeding.
- What happens when a rate markup causes the sell rate to exceed the lender's maximum markup cap (stored on the Lender entity)? The system must surface a validation warning indicating the markup exceeds the lender's configured cap; the F&I Manager can acknowledge and proceed. If no cap is set on the lender record, no warning is shown.
- What happens when an F&I product's cost exceeds its selling price (negative product gross)? The system must allow it, display the negative gross clearly, and include it in total F&I gross calculation.
- What happens when all F&I products on a deal are removed or cancelled? Back-end gross returns to zero.
- What happens when a jurisdiction has no configured required disclosures? The disclosure section shows "No disclosures required for this jurisdiction" and the deal is considered disclosure-complete.
- What happens when a chargeback amount is recorded as greater than the original selling price? The system must allow it (over-chargeback can occur with fees) and display the net as a negative contribution.
- What happens when a credit application draft is on a deal that is moved to Unwound status? The draft is preserved for audit purposes but cannot be submitted.

## Requirements *(mandatory)*

### Functional Requirements

**Credit Application**

- **FR-001**: F&I Managers MUST be able to create a credit application on any deal in F&I status, capturing: annual income, employer name, length of employment in months (total; UI may collect years and months separately and convert to total months for storage), housing type (Own / Rent / Other), monthly housing payment, SSN, and date of birth.
- **FR-002**: SSN MUST be stored with security controls that protect it from exposure. In all UI views after initial entry, SSN MUST be displayed masked as `XXX-XX-####` (last four digits only).
- **FR-003**: A credit application MUST be saveable as Draft (incomplete) or marked as Submitted (complete and ready for lender submission).
- **FR-004**: Each deal MUST have at most one active credit application at a time. Creating a new application when an active one exists MUST require explicit user confirmation; the prior application is archived, not deleted.
- **FR-005**: Credit applications MUST be linked to their parent deal and to the customer record on that deal.

**Lender Submission and Decisions**

- **FR-006**: The system MUST maintain a configurable Lender catalog. Administrators MUST be able to add, deactivate, and edit lender records. Each lender record contains: name, active flag, and optional maximum markup cap (in percentage points). F&I Managers MUST be able to submit a Submitted credit application to one or more active lenders from this catalog. For this feature, lender integration MUST be implemented as a mock/simulation returning a plausible decision (Approved, Conditional, or Declined), buy rate, approved amount, maximum term, and stipulations.
- **FR-007**: The system MUST display all lender decisions for a deal in a comparison view showing: lender name, decision status, approved amount, buy rate, maximum term, and stipulations.
- **FR-008**: F&I Managers MUST be able to select one Approved or Conditional lender decision to attach to the deal.
- **FR-009**: When a lender decision is selected, F&I Managers MUST be able to enter a rate markup (in percentage points). The system MUST calculate and store: buy rate (from lender), rate markup (entered), and sell rate (buy rate + markup).
- **FR-010**: Upon selecting a lender decision and confirming, the deal's APR MUST be updated to the sell rate, the term MUST be set to the selected term, and the monthly payment MUST recalculate using the standard amortization formula applied to the approved financing amount.
- **FR-011**: Lender decisions with status Declined MUST NOT be selectable for attachment to the deal.

**F&I Product Menu**

- **FR-012**: The system MUST maintain a configurable product catalog. Each product in the catalog has: product type (Extended Warranty / VSC, GAP, Tire & Wheel, Paint Protection, Maintenance Plan, or other configurable types), provider name, and a flag indicating whether it is active in the catalog.
- **FR-013**: F&I Managers MUST be able to add products from the catalog to a deal in F&I or Contracts Signed status, specifying for each instance: cost (dealer cost), selling price, term in months, optional deductible, and optional contract number.
- **FR-014**: Each F&I product on a deal MUST have a status: Active, Cancelled, or Charged Back.
- **FR-015**: The system MUST calculate and display total F&I gross = sum of (selling price − cost) for all Active products on the deal.
- **FR-016**: The deal's back-end gross MUST be automatically updated to equal total F&I gross whenever a product is added, edited, removed, or its status changes.
- **FR-017**: F&I Managers MUST be able to edit or remove any F&I product on a deal that has not yet reached Delivered status.

**Chargeback Tracking**

- **FR-018**: Controllers and F&I Managers MUST be able to mark any Active F&I product as Charged Back and record: chargeback amount and chargeback date. The product status changes to Charged Back upon recording.
- **FR-019**: The system MUST provide an F&I performance report filterable by date range showing: total F&I revenue (sum of selling prices of all non-soft-deleted products with status Active or Cancelled on funded deals where the deal's funded date falls within the selected range; Charged Back products are excluded from revenue as their amounts are captured separately in the chargeback total), total chargebacks (sum of chargeback amounts where the user-entered chargeback date falls within the selected range), net F&I revenue (revenue minus chargebacks), and PVR (net F&I revenue ÷ funded units in period). Revenue and chargebacks are filtered by independent date criteria and may represent different deal populations.
- **FR-020**: The F&I performance report MUST be viewable broken down both by period and by individual deal.
- **FR-030**: Controllers and F&I Managers MUST be able to export the F&I performance report as a CSV file containing all rows displayed (period summary and per-deal breakdown) for the selected date range.

**Compliance and Disclosures**

- **FR-021**: The system MUST support a configurable list of required disclosures per jurisdiction. Jurisdiction is a system-level configuration setting per dealership.
- **FR-022**: F&I Managers MUST be able to confirm each required disclosure on a deal. Each confirmation MUST record: disclosure name, confirming user identity, and date of confirmation (date only; no time component stored).
- **FR-023**: The deal MUST indicate disclosure completion status (e.g., "2 of 3 disclosures confirmed") visible to F&I Managers and Sales Managers.
- **FR-024**: Disclosure confirmation records MUST be immutable once created; no user role may edit or delete them.

**Audit Log**

- **FR-025**: The system MUST record an immutable audit log entry for each of the following actions: credit application created, submitted, or superseded (prior application archived), lender submission sent, lender decision selected (with buy rate, markup, sell rate recorded), F&I product added, edited, or removed, F&I product status changed, chargeback recorded, and disclosure confirmed.
- **FR-026**: Each audit log entry MUST capture: action type, actor name and role, UTC timestamp, deal reference, and relevant entity reference.

**Access Control**

- **FR-027**: F&I Managers MUST have full read-write access to all F&I workflow sections (credit application, lender submission, product menu, disclosures) on deals in F&I status. Chargeback recording (FR-018) is exempt from this status restriction: F&I Managers MAY record chargebacks on deals in any pipeline status.
- **FR-028**: Sales Managers MUST have read-only access to credit applications, lender decisions, and F&I products on any deal.
- **FR-029**: Controllers MUST have read access to all F&I data and write access limited to chargeback recording and the F&I performance report. Controllers MAY record chargebacks on deals in any pipeline status.
- **FR-031**: Administrators MUST have read-write access to the lender catalog (add, edit, deactivate lender records per FR-006) and to disclosure requirement configuration (add, edit, deactivate disclosure requirements per FR-021). Administrators MUST NOT have deal-level F&I write access (credit application, lender submission, product menu, disclosures on deals).

### Key Entities

- **CreditApplication**: Financial profile of the customer for a specific deal. Attributes: deal reference, customer reference, annual income, employer name, length of employment (months), housing type, monthly housing payment, SSN (stored securely, displayed masked), date of birth, status (Draft / Submitted / Archived), created-by, submitted-by, submitted-at UTC timestamp.
- **Lender**: A configurable lender record in the system catalog. Attributes: name, is-active flag, max markup cap (percentage points, optional). Managed by system administrators.
- **LenderSubmission**: A single submission of the credit application to one lender. Attributes: deal reference, credit application reference, lender reference (to Lender entity), submitted-at UTC timestamp, decision (Approved / Conditional / Declined), approved amount, buy rate, max term, stipulations, is-selected flag.
- **SelectedLenderDecision**: The lender decision chosen for the deal. Attributes: deal reference, lender submission reference, buy rate, rate markup, sell rate, selected term, selected-by, selected-at UTC timestamp.
- **FIProduct**: A product sold in the F&I office attached to a specific deal. Attributes: deal reference, product type, provider name, cost, selling price, term in months, deductible (optional), contract number (optional), status (Active / Cancelled / Charged Back), chargeback amount (optional), chargeback date (optional).
- **ProductCatalogItem**: A reusable product definition in the dealership's F&I product catalog. Attributes: product type, provider name, is-active flag.
- **DisclosureRequirement**: A jurisdiction-level configuration entry. Attributes: jurisdiction, disclosure name, is-active flag.
- **DisclosureConfirmation**: A record of a specific disclosure being confirmed on a deal. Attributes: deal reference, disclosure name, confirmed-by (user name and role), confirmed-at UTC date, immutable.
- **AuditLogEntry**: Immutable event record. Attributes: action type, actor name, actor role, UTC timestamp, deal reference, entity type, entity reference, before-value snapshot (where applicable), after-value snapshot.
- **Deal** (from 003-sales-deal-management): Referenced by all F&I entities; back-end gross and APR/term/monthly payment are updated by this module.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An F&I Manager can complete a full credit application, submit to two lenders, select a decision with markup, add three F&I products, and confirm all required disclosures in under 15 minutes from opening the deal.
- **SC-002**: Lender decision selection and rate markup entry updates the deal's APR, term, and monthly payment within 1 second of confirmation, with no page reload required.
- **SC-003**: Total F&I gross and deal back-end gross recalculate and display updated values within 1 second of any product add, edit, remove, or status change.
- **SC-004**: 100% of actions listed in FR-025 produce a corresponding immutable audit log entry; zero auditable actions are missing from the log across QA validation of 30 representative deal scenarios.
- **SC-005**: The F&I performance report for any date range loads and displays complete results — revenue, chargebacks, net revenue, PVR, and per-deal breakdown — in under 5 seconds.
- **SC-006**: SSN is never exposed in plain text in any UI view, API response, or export after initial entry; verified by security review of all data access paths.
- **SC-007**: No lender decision with status Declined can be selected and attached to a deal; enforced with 100% reliability across all test scenarios.
- **SC-008**: Chargeback amounts are accurately reflected in period net F&I revenue; discrepancy rate of zero across QA validation of 20 chargeback scenarios.

## Assumptions

- The deal must be in F&I status (approved by Sales Manager via 003-sales-deal-management) before the F&I workflow can begin. Cash deals may not have a credit application; only Finance and Lease deals require one.
- Lender integration is simulated for this feature. The simulation returns a realistic variety of Approved, Conditional, and Declined responses with plausible buy rates, terms, and stipulations. Real RouteOne/DealerTrack integration is out of scope.
- Rate markup is expressed in percentage points (e.g., a 1.5% markup on a 5.9% buy rate yields a 7.4% sell rate). Flat-dollar markup is not supported.
- Jurisdiction for disclosure requirements is a single system-level configuration setting per dealership deployment. Multi-jurisdiction support within a single dealership is out of scope.
- The F&I product catalog is pre-populated by system administrators. The UI for managing the catalog (adding/deactivating product types) is a configuration-level concern outside this feature's primary user stories but must exist to support the configurable product list requirement.
- Back-end gross on the deal record (from 003-sales-deal-management) is wholly owned by this module and equals total F&I gross. Any prior manual entry of back-end gross is superseded by F&I product data when this module is active.
- SSN and DOB are captured for credit application purposes only. Access to unmasked SSN is restricted to system administrators via secure internal tooling; no standard user role can retrieve the unmasked SSN through the application.
- Chargeback date is the date the chargeback was received by the dealership, entered manually by the Controller or F&I Manager; it may differ from the date it is recorded in the system.
- A deal's funded date (set in 003-sales-deal-management) is the reference date used for F&I performance period reporting.

## Out of Scope

- Actual RouteOne or DealerTrack API integration (lender submission is simulated)
- Contract printing and generation of F&I product contracts or RISC documents
- E-signature for F&I contracts or disclosures
- Accounting journal entries or GL posting for F&I revenue and chargebacks
- Reserve / dealer participation calculation beyond sell rate = buy rate + markup
- OEM or third-party incentive programs affecting F&I products
- Multi-jurisdiction disclosure management within a single dealership
- Credit bureau pulls or soft/hard credit inquiry tracking
- Automated chargeback notifications from providers

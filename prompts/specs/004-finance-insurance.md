# Spec prompt: 004 Finance & Insurance (F&I)

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **004-finance-insurance**: the F&I office workflow — credit application, lender submission, rate markup, and F&I product menu (extended warranty, GAP, tire/wheel, etc.).

**Why:** After the sales desk structures a deal, the F&I manager secures financing and sells add-on products. This is one of the most profitable areas. The system must support collecting customer financial data, submitting to lenders (or simulating responses), recording buy rate and markup, and attaching F&I products to the deal with cost and selling price for gross tracking. Compliance and chargeback tracking are required.

**Prerequisites:** 003-sales-deal-management exists. F&I works on deals in F&I status. Roles: F&I Manager, Sales Manager (view), Controller (reporting).

**User Story 1 (P1) — Credit application**  
As an F&I Manager I can complete a credit application for the deal's customer: income, employer, length of employment, housing type, monthly housing payment, and sensitive fields (SSN, DOB) stored securely. I can save the application as draft or submit. Application is linked to the deal. I can have only one active credit application per deal.

**User Story 2 (P2) — Lender submission and decisions**  
As an F&I Manager I can submit the credit application to one or more lenders (integration may be simulated with mock approval/decline/conditional and buy rate). I can view lender responses in a comparison: lender name, decision (Approved / Conditional / Declined), approved amount, buy rate, max term, and stipulations. I can select one decision and attach it to the deal (approved amount, rate, term), and optionally apply a rate markup so the deal stores a sell rate. The deal's financing terms (APR, term, monthly payment) can be updated from the selected lender decision and markup.

**User Story 3 (P3) — F&I product menu**  
As an F&I Manager I can add F&I products to the deal from a configurable product list: product type (e.g. Extended Warranty / VSC, GAP, Tire & Wheel, Paint Protection, Maintenance Plan), provider name, cost, selling price, term, and optional deductible. I can add multiple products per deal. The system shows total F&I gross (sum of selling price − cost) and updates the deal's back-end gross. I can remove or edit a product before the deal is delivered. Contract number and status (Active / Cancelled) can be recorded for each product.

**User Story 4 (P4) — Chargeback tracking**  
As a Controller or F&I Manager I can mark an F&I product as charged back (customer cancelled or defaulted) and record the chargeback amount and date. I can see total F&I revenue and total chargebacks by period and by deal so that we track net F&I performance.

**User Story 5 (P5) — Compliance and disclosures**  
As an F&I Manager I must confirm that required disclosures have been presented (list of required disclosures is configurable per jurisdiction). The system records that the disclosure was presented and the date; it does not store the actual document content in this feature. Audit log records who completed credit app, selected lender, added products, and marked disclosures.

**Out of scope for this feature:** Actual RouteOne/DealerTrack integration (can be simulated), contract printing, e-signature, and accounting journal entries. Use correct domain terms (buy rate, rate markup, VSC, GAP, PVR); see dealer-management-system-guide.md.

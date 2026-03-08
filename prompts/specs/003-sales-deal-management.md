# Spec prompt: 003 Sales & Deal Management

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **003-sales-deal-management**: the vehicle sales process from desking (structuring the deal) through delivery and funding.

**Why:** Deal paperwork is slow and error-prone without a DMS. Sales and managers need a desking tool to adjust sale price, trade-in value, down payment, term, and APR and see monthly payment in real time. The deal must support trade-in appraisal (ACV, payoff), fees, rebates, and tax, and produce a clear deal jacket (customer, vehicle, numbers, documents) with a status pipeline: Pending → Desking → F&I → Contracts Signed → Delivered → Funded (or Unwound).

**Prerequisites:** 001-vehicle-inventory and 002-crm exist. Deals link a customer (from CRM) and a vehicle (from inventory). Roles: Sales Consultant, Sales Manager, F&I Manager (view only in this feature).

**User Story 1 (P1) — Create deal and desking**  
As a Sales Consultant I can create a deal by selecting a customer and a vehicle from inventory. I can set deal type (Cash, Finance, or Lease). I can adjust sale price, down payment, rebates, and (for Finance/Lease) APR and term. The system calculates amount financed and monthly payment using standard loan math (amount financed = sale price + fees + tax − down payment − net trade − rebates; monthly payment from amount, APR, term). I can add line-item fees (name, amount, taxable flag). I can see front-end gross (sale price vs. cost/invoice) and update the deal until the numbers work. Deal status moves from Pending to Desking as I work it.

**User Story 2 (P2) — Trade-in appraisal**  
As a Sales Consultant I can add a trade-in to the deal: VIN (optional), year, make, model, mileage, condition (Excellent/Good/Fair/Poor), ACV (actual cash value), allowance (what we show the customer), and payoff amount/lender if there is a loan. The system uses net trade (allowance minus payoff) in the deal math. I can edit or remove the trade-in before the deal is delivered.

**User Story 3 (P3) — Deal pipeline and approval**  
As a Sales Manager I can see deals in Desking and approve or send back for revision. Once approved, the deal can move to F&I status. As a Sales Consultant I can move the deal to Delivered when the customer takes the vehicle, and to Funded when the lender funds (or mark Unwound if the deal falls through). I can view a deal jacket: customer, vehicle, all financial breakdown, trade-in, fees, and status history.

**User Story 4 (P4) — Document generation**  
As a Sales Consultant or F&I Manager I can generate a buyer's order and bill of sale from the deal (using template placeholders for customer, vehicle, numbers, date). Generated documents are stored with the deal. E-signature and lender contracts are out of scope for this feature.

**User Story 5 (P5) — Sales reporting**  
As a Sales Manager or General Manager I can see a summary report: units sold in a date range, total gross profit (front + back), average front-end and back-end gross, and breakdown by salesperson. Numbers are based on deals in Funded status.

**Out of scope for this feature:** Credit applications, lender submissions, F&I product menu, accounting posting, and OEM incentive application. Use correct domain terms (desking, ACV, payoff, front-end/back-end gross, deal jacket); see dealer-management-system-guide.md.

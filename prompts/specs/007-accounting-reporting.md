# Spec prompt: 007 Accounting & Reporting

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **007-accounting-reporting**: general ledger (NADA-aligned chart of accounts), automated posting from deals and repair orders, accounts payable and receivable, and management dashboards.

**Why:** Dealerships need accurate books and real-time visibility into profitability. When a deal is funded or an RO is closed, the correct accounting entries must post automatically so the controller doesn't re-enter data. Management needs dashboards showing gross profit, units sold, service absorption, parts margin, and F&I per vehicle retailed (PVR).

**Prerequisites:** 003-sales-deal-management (deals), 004-finance-insurance (F&I products), 005-service-repair-orders (ROs), and 006-parts-inventory (parts usage) exist. Roles: Controller, General Manager, Accountant.

**User Story 1 (P1) — Chart of accounts**  
As a Controller I can maintain a chart of accounts following NADA standard structure: account number, name, type (Asset, Liability, Equity, Revenue, Expense), and department (New, Used, Service, Parts, Body Shop, Admin). Accounts can have a parent for hierarchy. I can activate or deactivate accounts. No account can be deleted if it has posting history; deactivate only.

**User Story 2 (P2) — Automatic posting from deals**  
When a deal moves to Funded status, the system automatically creates a journal entry: revenue (vehicle sale), cost of goods sold (vehicle cost), trade-in allowance and payoff, finance reserve (if rate markup), F&I product income (from F&I products on the deal), and any fees. Each entry has date, description, source type (Deal), source ID (deal id), and lines (account, debit, credit). Double-entry rules must hold. The Controller can view the generated journal entry and the deal that triggered it. Manual journal entries are also allowed: date, description, and lines (account, debit, credit) with validation that total debits equal total credits.

**User Story 3 (P3) — Automatic posting from ROs and parts**  
When a repair order is closed/invoiced, the system posts service revenue (labor + parts), parts cost (if from catalog), and tax. When a parts sale is recorded (or RO parts usage), parts revenue and cost can post. All such entries are linked to source type (RepairOrder, PurchaseOrder, etc.) and source ID for audit.

**User Story 4 (P4) — Accounts payable**  
As a Controller I can record vendor invoices: vendor, invoice number, amount, due date. I can mark an invoice as paid and record payment date and check number (or ACH reference). I can list payables by vendor and by due date and see a total of unpaid payables. Payment creation (printing checks or ACH) is out of scope; we only record that payment was made.

**User Story 5 (P5) — Accounts receivable**  
As a Controller I can record receivables: customer or other party, type (e.g. warranty receivable, customer balance, lender), amount, due date. I can mark as paid and record payment date. I can list receivables and see total outstanding.

**User Story 6 (P6) — Financial statements and dashboards**  
As a Controller or General Manager I can run a balance sheet and income statement (P&L) for a date or period using the chart of accounts and posted journal entries. As a General Manager I can see a management dashboard: total gross profit (by department or total), units sold (new/used), service absorption rate, parts gross margin, F&I PVR (per vehicle retailed), and comparison to prior period or budget if data exists. All numbers are derived from posted data; no manual override of dashboard figures.

**User Story 7 (P7) — Floor plan reconciliation**  
As an Accountant I can see a list of vehicles in inventory that are floor-planned (optional flag or integration). I can reconcile: vehicles sold but not yet paid off on the floor plan line are "out of trust." The system can list such vehicles (deal funded, vehicle sold, floor plan balance outstanding) so the dealer can pay down the line. Full bank reconciliation (matching bank statement to GL) can be a later enhancement; this feature focuses on deal/RO posting, AP, AR, and reporting.

**Out of scope for this feature:** Payroll, commission calculation detail (can be reported from deal/RO data elsewhere), and tax filing. Use correct domain terms (NADA, P&L, absorption, PVR); see dealer-management-system-guide.md.

# AutoDesk DMS — Demo Walkthrough

**AutoDesk DMS** is a Dealer Management System for automotive dealerships. It manages the full lifecycle of a car deal — from the moment a customer walks in to the day the loan is funded — and everything in between: inventory, leads, financing, F&I products, compliance, and reporting.

This guide walks you through each role from most feature-rich to most focused.

---

## Login Credentials

| Role | Email | Password |
|---|---|---|
| F&I Manager | `fni@autodesk-dms.com` | `password123` |
| Sales Manager | `manager@autodesk-dms.com` | `password123` |
| Sales Consultant | `sales1@autodesk-dms.com` | `password123` |
| Controller | `controller@autodesk-dms.com` | `password123` |
| BDC Agent | `bdc@autodesk-dms.com` | `password123` |
| Inventory Manager | `inventory@dms.local` | `password123` |
| General Manager | `gm@dms.local` | `password123` |

---

## What's Already in the System

The database is pre-loaded with **4–5 months of realistic dealership activity** (October 2025 – March 2026) so you can explore without setting anything up:

| Data | Count | Details |
|---|---|---|
| Deals | 13 | 6 funded, 1 unwound, 1 delivered, 1 contracts signed, 1 in F&I, 1 desking, 1 pending |
| Vehicles | 20 | 8 sold, 8 on the frontline, 2 in recon, 2 in transit |
| Customers | 15 | With full contact history |
| Leads | 14 | Across all pipeline stages |
| Lenders | 5 | Ally Financial, Chase Auto, Capital One, TD Auto Finance, Westlake |
| F&I Product Catalog | 8 | VSC, GAP, Tire & Wheel, Paint Protection, Maintenance Plan, Other |
| F&I Products on Deals | 9 | Seeded on 5 funded deals — performance report data ready |
| Disclosures | 3 | US-DEFAULT jurisdiction requirements |

---

## Role 1 — F&I Manager

**Login as:** `fni@autodesk-dms.com`

> The F&I (Finance & Insurance) Manager is the most feature-rich role in the system. After a Sales Manager approves a deal, it lands here. The F&I Manager secures financing, sells protection products, and ensures compliance before contracts are signed.

**Use Deal #1011** for this walkthrough — Stephanie Harrington, 2023 BMW 5 Series 530i xDrive CPO, currently in **F&I** status.

---

### Feature 1 — Credit Application

**What it does:** Collects the customer's financial profile so it can be submitted to lenders. Sensitive data (SSN, date of birth) is stored encrypted and never shown in plaintext after the first save.

1. Click **Deals** in the left sidebar → find **Deal #1011** (Stephanie Harrington) → click to open the deal jacket
2. Fill in the form:
   - Annual Income: `125000`
   - Employer: `Harrington Architecture LLC`
   - Employment Length: `84` months
   - Housing Type: `Own`
   - Monthly Housing Payment: `2850`
   - Date of Birth: `1978-04-12`
   - SSN: enter any 9 digits (e.g. `123456789`)
3. Click **Save Draft**
   - Notice: the SSN field immediately replaces with `XXX-XX-6789` — the raw digits are gone permanently from the UI
   - The status badge reads **Draft**
4. Click **Submit Application** — status changes to **Submitted**

> **Security highlight:** The SSN is encrypted at rest with AES-256-GCM. No API endpoint ever returns the plaintext SSN — only the masked version.

---

### Feature 2 — Lender Submission & Decision Comparison

**What it does:** Sends the credit application to multiple lenders simultaneously (simulated here). Returns a side-by-side comparison of each lender's decision, buy rate, approved amount, and term.

1. Still on Deal #1011 → click the **Lender Submission** tab
2. In the **Submit to Lenders** panel, check:
   - ☑ Ally Financial _(cap: 2.00%)_
   - ☑ Chase Auto _(cap: 1.75%)_
3. Click **Submit to 2 Lenders**
4. The **Lender Decisions** table populates with both responses:
   - **Approved** rows show buy rate, approved amount, max term
   - **Conditional** rows list stipulations required before funding
   - **Declined** rows have no rate or amount

> **Demo note:** The lender simulator is deterministic — the same deal always returns the same decisions, making demos reproducible.

---

### Feature 3 — Rate Markup & Sell Rate

**What it does:** The dealership earns additional income by marking up the buy rate from the lender. The sell rate (what the customer pays) equals buy rate + markup. The monthly payment recalculates instantly.

1. Click **Select** on the Ally Financial Approved row
2. Enter Rate Markup: `1.50`
3. Watch the sell rate preview update: **buy rate + 1.50% = sell rate**
4. If you enter more than 2.00% (Ally's cap), a warning banner appears — but the save is not blocked
5. Click **Confirm Selection**
6. The deal's APR and monthly payment in the jacket header update to the sell rate

---

### Feature 4 — F&I Product Menu

**What it does:** Lets the F&I Manager add protection products to the deal (extended warranty, GAP, tire & wheel, etc.). The system tracks the gross on each product (selling price − cost) and keeps the deal's back-end gross in sync — in under 1 second.

1. Click the **F&I Products** tab
2. Click **+ Add Product**:
   - Type: **VSC** | Provider: `Safe-Guard Products` | Cost: `850` | Selling Price: `1595` | Term: `48` months | Deductible: `100`
   - Click **Add** — Total F&I Gross shows **$745.00** immediately
3. Add a second product:
   - Type: **GAP** | Provider: `Safe-Guard Products` | Cost: `195` | Selling Price: `695` | Term: `60` months
   - Click **Add** — Total F&I Gross updates to **$1,245.00** within 1 second
4. The **Back-End Gross** in the deal jacket header reflects $1,245.00

> **Try editing:** Click the edit icon on a product → change the selling price → gross recalculates live.

> **Try removing:** Click **Remove** on a product → confirm → gross drops immediately.

---

### Feature 5 — Disclosures & Compliance

**What it does:** Ensures the F&I Manager has presented all required legal disclosures to the customer. Each confirmation is permanently recorded with the confirming user's name, role, and timestamp — it cannot be deleted.

1. Click the **Disclosures** tab
2. Three requirements appear for jurisdiction `US-DEFAULT`:
   - Finance Charge & APR Disclosure
   - F&I Product Voluntary Nature Disclosure
   - Right of Rescission Notice
3. Click the checkbox on each one to confirm it was presented
4. After all three: the indicator turns **green** — **"3 of 3 disclosures confirmed"**
5. Each row now shows: your name, role, and the exact date/time

> **Role restriction demo:** Log in as Sales Manager and open the same deal's Disclosures tab — the checkboxes are disabled (read-only access only).

---

### Feature 6 — Document Generation & Pipeline Advance

**What it does:** Generates PDF documents from deal data and advances the deal to the next pipeline stage.

1. Click the **Documents** tab
2. Select **Buyer's Order** → click **Generate**
   - The system merges all deal data into an HTML template, converts it to PDF, and stores it
3. Generate a **Bill of Sale** as well
4. Click **Download** on either — the PDF opens in a new tab
5. Click **Advance to Contracts Signed** — the deal status updates and the timeline records your name and timestamp

---

## Role 2 — Sales Manager

**Login as:** `manager@autodesk-dms.com`

> The Sales Manager oversees all deals, approves desk structures, and views sales performance. They are the gatekeeper between the sales floor and the F&I office.

---

### Feature 1 — Approval Queue

**What it does:** Consolidates all deals waiting for management review in one place. The manager can approve with one click or push the deal back with a required note.

1. Click **Approval Queue** in the left sidebar
2. All deals in **Desking** status appear here
3. Click a deal to review the full financial breakdown before deciding

**Option A — Approve:**
- Click **Approve** → deal immediately moves to **F&I** status

**Option B — Send Back:**
- Click **Send Back** → a dialog requires you to enter a reason
- Type: `Need to verify trade-in payoff amount`
- Click **Send Back** → the deal returns to Desking with your note visible to the consultant

---

### Feature 2 — Full Deal History

**What it does:** Every status change on every deal is permanently recorded — who did it, when, and why. This creates a complete audit trail from creation through funding.

1. Click **Deals** in the left sidebar → find **Deal #1001** (James Kowalski, 2024 Toyota Camry XSE V6)
2. Open the deal jacket → look at the **Status History Timeline** on the right:

| Transition | Actor | Date |
|---|---|---|
| Created → Pending | Jake Mitchell (Sales Consultant) | Oct 14, 2025 |
| Pending → Desking | Sam Reynolds (Sales Manager) | Oct 14, 2025 |
| Desking → F&I | Sam Reynolds (Sales Manager) | Oct 14, 2025 |
| F&I → Contracts Signed | Diana Reeves (F&I Manager) | Oct 14, 2025 |
| Contracts Signed → Delivered | Jake Mitchell (Sales Consultant) | Oct 14, 2025 |
| Delivered → Funded | Diana Reeves (F&I Manager) | Oct 21, 2025 |

> **Immutability highlight:** No entry in this timeline can ever be edited or deleted. This is enforced at the API level, not just the UI.

---

### Feature 3 — Sales Report

**What it does:** Aggregates funded deal revenue by period with a per-salesperson breakdown. Exports to CSV for use in Excel.

1. Click **Sales Report** in the left sidebar
2. Set date range: `2025-10-01` → `2026-03-09`
3. Click **Run Report**
4. The report shows: total units, total front-end gross, average per unit, and a per-salesperson breakdown (Jake Mitchell, Emily Chen, Chris Parker)
5. Click **Export CSV** → a `sales-report.csv` downloads automatically

---

## Role 3 — Sales Consultant

**Login as:** `sales1@autodesk-dms.com`

> Sales Consultants create deals, structure the financing on the desk, add fees and trade-ins, and carry the deal through delivery and funding. They interact with the customer directly throughout the process.

---

### Feature 1 — Creating a Deal

**What it does:** Links a customer, a vehicle, and a deal type to open the deal file. The system prevents the same vehicle from being committed to two deals at once.

1. Click **Deals** in the left sidebar → **+ New Deal**
2. **Customer:** Type `Kowalski` and select **James Kowalski** from the dropdown
3. **Vehicle:** Type `Tucson` → select **2024 Hyundai Tucson SEL AWD** (Stock #2014, Frontline Ready)
4. **Deal Type:** Finance
5. Click **Create Deal**

> **Conflict guard demo:** Try assigning a vehicle that's already on an active deal (e.g. search `BMW 5 Series` — it's on Deal #1011) — the system returns a `409 Conflict` error.

---

### Feature 2 — Desking (Payment Structure)

**What it does:** The deal structure screen where all financial terms are entered and the monthly payment is calculated using the standard amortization formula. Every field recalculates instantly.

On the Desking page, enter:

| Field | Value |
|---|---|
| Sale Price | `34500` |
| Down Payment | `4000` |
| Rebates | `500` |
| APR | `6.49` |
| Term | `60` |
| Tax Rate | `8.00` |

Click **Recalculate** — the panel shows:
- **Total Tax** (on sale price + taxable fees)
- **Amount Financed**
- **Monthly Payment** (M = P × [r(1+r)ⁿ] / [(1+r)ⁿ−1])
- **Front-End Gross** (sale price − invoice)

> **Live demo:** Change the APR from 6.49 to 7.99 and click Recalculate — watch the monthly payment and gross update.

---

### Feature 3 — Fees & Trade-In

**What it does:** Fees are itemized and can be taxable or non-taxable. Trade-ins reduce the amount financed — negative equity (payoff > allowance) automatically increases the loan amount.

**Add fees:**
1. Click **+ Add Fee** → Documentary Fee: `$499` taxable ✓
2. Click **+ Add Fee** → Title & License: `$250` non-taxable
3. Watch the totals recalculate with each addition

**Add a trade-in:**
1. Click **+ Add Trade-In**
2. Enter: 2020 Honda Civic, 42,000 miles, Good condition
   - ACV: `14000` | Allowance: `15000` | Payoff: `8500`
3. Net Trade = `$6,500` → amount financed decreases automatically

> **Negative equity demo:** Set the payoff to `$20,000` (more than the $15,000 allowance) — net trade becomes −$5,000 and the amount financed increases instead.

---

### Feature 4 — Completing the Pipeline

**What it does:** After F&I processing and contract signing, the consultant marks the deal as Delivered (customer takes the car) and then Funded (the lender releases money). Funded is a terminal state — no further changes allowed.

1. Open a deal in **Contracts Signed** status
2. Click **Mark as Delivered** → status updates to **Delivered**
3. Click **Mark as Funded** → status updates to **Funded**
   - The `fundedAt` timestamp is recorded and the deal appears in both the Sales Report and F&I Performance Report

---

## Role 4 — Controller

**Login as:** `controller@autodesk-dms.com`

> The Controller handles financial oversight: recording F&I chargebacks when customers cancel products, and running the F&I performance report to track net revenue across the dealership.

---

### Feature 1 — Chargeback Recording

**What it does:** When a customer cancels an F&I product (e.g. cancels their extended warranty), the Controller records a chargeback — the amount the lender claws back from the dealership. The product status updates and the deal's back-end gross recalculates.

**View an existing chargeback (seeded):**
1. Click **Deals** in the left sidebar → open **Deal #1005** (Derek O'Brien, 2022 BMW 3 Series)
2. Click the **F&I Products** tab — the VSC row shows status badge **Charged Back** (red) — recorded Jan 15, 2026

**Record a new chargeback live:**
1. Open **Deal #1006** (Raymond Flores, 2024 Toyota RAV4) → **F&I Products** tab
2. Click **Chargeback** on the VSC row
3. Enter: Amount `1200`, Date: today's date
4. Click **Confirm Chargeback** in the confirmation step
5. The badge changes to **Charged Back** and the back-end gross drops immediately

---

### Feature 2 — F&I Performance Report

**What it does:** Aggregates F&I revenue and chargebacks across all funded deals for a given period. Uses two independent date axes — funded date for revenue, chargeback date for chargebacks — so a deal funded in December with a January chargeback shows correctly in both periods.

**Run the full-year report:**
1. Click **F&I Performance Report** in the left sidebar
2. Set: From `2025-10-01` → To `2026-03-10`
3. Click **Run Report**

The summary row shows:
- **Total Revenue** — sum of all F&I product selling prices
- **Total Chargebacks** — $1,420 (the seeded VSC chargeback on Deal #1005)
- **Net Revenue** — Total Revenue − $1,420
- **PVR** (Per Vehicle Retail) — Net Revenue ÷ funded units
- **Funded Units** — count of deals with F&I products in this period

**Demonstrate the independent date axes:**
1. Change the range to `2025-10-01` → `2025-12-31` and run
   - Deal #1005 appears in **Funded Units** (funded Dec 30) but its **chargeback is $0** (chargebackDate is Jan 15)
2. Change to `2026-01-01` → `2026-01-31` and run
   - Deal #1005's **$1,420 chargeback now appears** — because the chargebackDate falls in January

> This demonstrates that revenue and chargebacks are tracked on separate, correct date axes.

**Export:**
1. Click **⬇ Export CSV** → `fi-performance-[from]-[to].csv` downloads
2. Open in Excel — all rows and columns match the on-screen table

---

## Role 5 — BDC Agent

**Login as:** `bdc@autodesk-dms.com`

> The Business Development Center (BDC) Agent manages incoming leads and customer relationships. They log every customer interaction and move leads through the sales pipeline before handing off to a consultant.

---

### Feature 1 — Lead Management

**What it does:** Tracks every potential buyer through a pipeline of stages: New → Contacted → Appointment Set → Showed → Negotiating → Sold (or Lost). All activity is logged for accountability.

1. Click **Leads** in the left sidebar — 14 leads in various stages
2. Click the lead for **Rachel Simmons** (currently Negotiating)
3. Log an activity: click **+ Activity** → type **Call** → content: `Called Rachel, confirmed interest in RAV4 CPO`
4. Create a task: click **+ Task** → type: `Send pricing sheet for RAV4 CPO` → due tomorrow
5. Advance the stage: change status from **Negotiating → Showed**

---

### Feature 2 — Customer Profiles

**What it does:** Every customer has a unified profile showing all their leads, activities, tasks, and purchase history across all their visits to the dealership.

1. Click **Customers** in the left sidebar
2. Find **James Kowalski**
3. His profile shows: Deal #1001 (Toyota Camry XSE V6, funded Oct 2025), all call/email activities, and linked leads

---

## Role 6 — Inventory Manager

**Login as:** `inventory@dms.local`

> The Inventory Manager controls the vehicle lot — adding new arrivals, tracking status (frontline, recon, transit, sold), and maintaining pricing.

---

### Feature 1 — Vehicle Inventory

**What it does:** A real-time view of every vehicle on the lot, including status, pricing, VIN, stock number, and condition. Sold vehicles are linked to their deals.

1. Click **Inventory** in the left sidebar — 20 vehicles shown
2. Filter by status: **Frontline Ready**, **In Recon**, **In Transit**, **Sold**
3. Click any vehicle to see: VIN, stock number, year/make/model, MSRP, invoice, condition, lot location

**Add a new vehicle:**
1. Click **+ Add Vehicle**
2. Fill in: VIN, stock number, year/make/model, condition (New / Used / CPO), MSRP, invoice price, status
3. Click Save — the vehicle appears immediately in the list

**View sold vehicles:**
1. Filter to **Sold** → each entry shows the date sold and the linked deal

---

## Key Things to Show in a Demo

| What to highlight | Where |
|---|---|
| **SSN encryption** | Credit Application — type an SSN, save — the raw digits vanish immediately, never visible again |
| **Live rate markup** | Lender Submission — type a markup, watch sell rate = buy rate + markup update in real time |
| **Markup cap warning** | Westlake Financial (cap 2.50%) — enter 3.00% — warning appears but save still succeeds |
| **F&I gross speed** | F&I Products — add a product — the gross total updates in under 1 second |
| **Chargeback date axis** | Performance Report — Dec range shows deal revenue but not the Jan chargeback; Jan range shows the chargeback |
| **Disclosure audit trail** | Disclosures — confirm all 3, each shows confirmer name + role + timestamp — cannot be deleted |
| **Immutable deal timeline** | Deal Jacket — every status transition recorded permanently, no delete button anywhere |
| **Negative equity** | Desking trade-in — set payoff > allowance — amount financed increases instead of decreasing |
| **Vehicle conflict guard** | Try assigning an already-committed vehicle to a new deal → 409 Conflict |
| **Role enforcement** | Log in as F&I Manager, try to create a deal → 403 Forbidden (API-level, not just UI) |
| **Optimistic concurrency** | Open the same deal in two browser tabs, edit both, save the second → conflict error |
| **CSV exports** | Both Sales Report and F&I Performance Report stream downloadable CSV files |

---

## The Deal Pipeline at a Glance

```
Customer walks in
      ↓
[Sales Consultant] Creates deal → desks payment → adds fees / trade-in
      ↓
[Sales Manager] Reviews → Approves (or sends back with note)
      ↓
[F&I Manager] Credit app → lender submission → select rate → add products → disclosures → generate docs
      ↓
[Sales Consultant] Marks Delivered
      ↓
[Sales Consultant or F&I] Marks Funded ← terminal state, appears in reports
      ↓
[Controller] Records chargebacks if products cancelled → views F&I Performance Report
```

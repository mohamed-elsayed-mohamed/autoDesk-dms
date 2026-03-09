# AutoDesk DMS — Demo Walkthrough

**A complete end-to-end guide for presenting the dealership management system.**

---

## Quick Start — Login Credentials

| Role | Email | Password | Can do |
|---|---|---|---|
| Sales Consultant | `sales1@autodesk-dms.com` | `password123` | Create deals, desk, add trade-ins/fees |
| Sales Consultant | `sales2@autodesk-dms.com` | `password123` | Second consultant for multi-user flows |
| Sales Manager | `manager@autodesk-dms.com` | `password123` | Approve deals, view all deals, sales report |
| F&I Manager | `fni@autodesk-dms.com` | `password123` | Process F&I, generate documents |
| General Manager | `gm@dms.local` | `password123` | Full access, sales report, config |
| Inventory Manager | `inventory@dms.local` | `password123` | Manage vehicle inventory |
| BDC Agent | `bdc@autodesk-dms.com` | `password123` | Manage leads and customers |

---

## What's Already in the System

The database is seeded with **4–5 months of realistic activity** (October 2025 – March 2026):

- **20 vehicles** — 8 sold, 8 on the frontline, 2 in reconditioning, 2 in transit
- **15 customers** with contact history
- **14 leads** across all pipeline stages
- **13 deals** — 6 funded (historical), plus active deals at every pipeline stage
- **27 activities** (calls, emails, texts, visits)
- **16 tasks** for the sales team

---

## Workflow 1 — Inventory Management

**Login as:** `inventory@dms.local`

### Step 1 — Browse the Lot
1. Click **Vehicles** in the left nav
2. The list shows all active inventory — filter by status: **Frontline Ready**, **In Recon**, **In Transit**
3. Click any vehicle to see full detail: VIN, stock number, pricing, condition, lot location

### Step 2 — Add a New Vehicle
1. Click **+ Add Vehicle** (top right)
2. Fill in: VIN, stock number, year/make/model, condition (New/Used/CPO), MSRP, invoice price, status
3. Save — the vehicle appears in the list immediately

### Step 3 — View Sold Vehicles
1. Use the status filter to show **Sold** vehicles
2. Each sold vehicle is linked to a deal — you can see when it sold and for how much

---

## Workflow 2 — CRM: Lead to Customer

**Login as:** `bdc@autodesk-dms.com`

### Step 1 — Manage Leads
1. Click **Leads** in the left nav
2. You'll see 14 leads in various stages — New, Contacted, Appointment Set, Showed, Negotiating, Sold, Lost
3. Click a lead (e.g., **Rachel Simmons** — currently Negotiating) to open it

### Step 2 — Work a Lead
1. Inside the lead, log a **Call activity**: "Called Rachel, confirmed she's still interested in the RAV4 CPO"
2. Create a **Follow-Up task** due tomorrow: "Send pricing sheet for RAV4 CPO"
3. Advance the lead status: **Negotiating → Showed** (or further if needed)

### Step 3 — Customer Profiles
1. Click **Customers** in the left nav
2. Find **James Kowalski** — he has a funded deal (Deal #1001, Toyota Camry XSE V6, October 2025)
3. His profile shows all activities, linked leads, and purchase history

---

## Workflow 3 — Creating a New Deal (Sales Consultant)

**Login as:** `sales1@autodesk-dms.com`

> **Scenario:** A customer walks in and wants to finance a 2025 Toyota Camry SE.

### Step 1 — Create the Deal
1. Click **Deals** → **+ New Deal**
2. **Customer search:** Type "Kowalski" or any name — select from the dropdown
   - Or pick any customer from the list
3. **Vehicle search:** Type "Camry" — select the **2025 Toyota Camry SE** (Stock #2009, Frontline Ready)
4. **Deal Type:** Select **Finance**
5. Click **Create Deal**

### Step 2 — Desk the Deal
You're now on the **Desking page**. Enter the deal terms:

| Field | Value |
|---|---|
| Sale Price | `34,500` |
| Down Payment | `4,000` |
| Rebates | `500` |
| APR | `6.49` |
| Term | `60` |
| Tax Rate | `8.00` |

Click **Recalculate** — the panel instantly shows:
- **Total Tax** (calculated on sale price + taxable fees)
- **Amount Financed**
- **Monthly Payment** (standard amortization formula)
- **Front-End Gross** (sale price minus invoice)

### Step 3 — Add Fees
In the **Fees** section:
1. Click **+ Add Fee**
2. Add **Documentation Fee** — `$499` — taxable ✓
3. Add **Title & License** — `$250` — not taxable
4. Watch the totals recalculate automatically

### Step 4 — Add a Trade-In (optional)
1. Click **+ Add Trade-In**
2. Enter: 2020 Honda Civic, 42,000 miles, Good condition
   - ACV: `$14,000` | Allowance: `$15,000` | Payoff: `$8,500`
3. **Net Trade** shows as `$6,500` → automatically reduces amount financed

---

## Workflow 4 — Manager Approval

**Login as:** `manager@autodesk-dms.com`

### Step 1 — Approval Queue
1. Click **Deals** → **Approval Queue**
2. You'll see all deals in **Desking** status waiting for your review
3. Find the deal just created by the consultant

### Step 2 — Approve or Send Back
**Option A — Approve:**
- Click **Approve** → deal advances to **F&I** status

**Option B — Send Back:**
- Click **Send Back** → a dialog opens requiring a note
- Type: "Need to verify trade-in payoff amount before advancing"
- Click **Send Back** → deal returns to **Desking** with your note visible to the consultant

### Step 3 — Explore Existing Deals
1. From **Deals** list, browse the 13 seeded deals
2. Click **Deal #1001** (James Kowalski, Funded Oct 2025) → opens the full jacket
3. See the complete history: Created → Desking → F&I → Contracts Signed → Delivered → Funded

---

## Workflow 5 — F&I Processing

**Login as:** `fni@autodesk-dms.com`

> **Scenario:** The deal approved by the Sales Manager arrives in your queue.

### Step 1 — Review the Deal Jacket
1. Click **Deals** — you'll see all deals (F&I Manager has read access to everything)
2. Find the deal in **F&I** status → click to open the Deal Jacket
3. Review: customer info, vehicle, full financial breakdown, trade-in detail, fee itemization

### Step 2 — Generate Documents
1. Scroll to the **Documents** section
2. Select **Buyer's Order** from the dropdown → click **Generate**
   - The system renders an HTML template with all deal data → converts to PDF → stores it
3. Generate a **Bill of Sale** as well
4. Both documents appear in the table with timestamps
5. Click **Download** on either document — opens the PDF in a new tab

### Step 3 — Advance the Deal
1. In the **Pipeline Actions** panel:
   - Click **Advance to Contracts Signed**
2. The status badge updates to **Contracts Signed**
3. The timeline on the right adds a new history entry with your name and timestamp

---

## Workflow 6 — Full Pipeline Completion

**Login as:** `sales1@autodesk-dms.com`

### Step 1 — Mark as Delivered
1. Open the deal (now in **Contracts Signed**)
2. Click **Mark as Delivered**
3. Status updates to **Delivered**

### Step 2 — Mark as Funded
1. Click **Mark as Funded**
2. Status updates to **Funded** — this is a terminal state (no further changes)
3. The deal's `fundedAt` timestamp is recorded
4. It now appears in the Sales Report

---

## Workflow 7 — Sales Report

**Login as:** `manager@autodesk-dms.com` or `gm@dms.local`

### Step 1 — Run the Report
1. Click **Sales Report** in the left nav
2. Set date range: **Start Date** `2025-10-01` → **End Date** `2026-03-09`
3. Click **Run Report**

### Step 2 — Review Results
The report shows (based on the 6+ funded deals in the seed):

- **Total Units:** 6+ funded deals
- **Total Front-End Gross:** Sum of all front-end gross across funded deals
- **Avg Front-End Gross / Unit**
- **Per-Salesperson Breakdown:** Jake Mitchell vs Emily Chen vs Chris Parker — units, totals, averages

### Step 3 — Export CSV
1. Click **Export CSV**
2. A `sales-report.csv` file downloads automatically
3. Open in Excel — all columns match what you see on screen

---

## Workflow 8 — Deal Jacket History View

**Login as:** any role

### View a Fully Completed Deal
1. Go to **Deals** → find **Deal #1001** (James Kowalski, Toyota Camry XSE V6)
2. Open the **Deal Jacket**
3. On the right side, the **Status History Timeline** shows all 6 transitions:

| Transition | Actor | Date |
|---|---|---|
| Created → Pending | Jake Mitchell (Sales Consultant) | Oct 14, 2025 |
| Pending → Desking | Sam Reynolds (Sales Manager) | Oct 14, 2025 |
| Desking → F&I | Sam Reynolds (Sales Manager) | Oct 14, 2025 |
| F&I → Contracts Signed | Diana Reeves (F&I Manager) | Oct 14, 2025 |
| Contracts Signed → Delivered | Jake Mitchell (Sales Consultant) | Oct 14, 2025 |
| Delivered → Funded | Diana Reeves (F&I Manager) | Oct 21, 2025 |

### View the Unwound Deal
1. Find **Deal #1007** (Robert Kim, Hyundai Sonata SE) — status **Unwound**
2. The jacket shows the Unwound note: "Customer backed out — could not secure financing"
3. The vehicle is back to **Frontline Ready** status in inventory

---

## Key Features to Highlight

| Feature | Where to show it |
|---|---|
| **Live recalculation** | Desking page — change any number, watch monthly payment update |
| **Optimistic concurrency** | Open deal in two tabs, edit both — second save shows a conflict error |
| **Role-based access** | Log in as F&I Manager and try to create a deal → 403 Forbidden |
| **Immutable audit trail** | Deal Jacket timeline — every transition is permanently recorded |
| **7-year retention** | No delete buttons exist on deals or documents anywhere in the UI |
| **Vehicle commitment guard** | Try to assign the same vehicle to two deals → 409 Conflict |
| **Trade-in negative equity** | Set payoff > allowance — negative net trade increases amount financed |
| **CSV export** | Sales Report → Export CSV → opens in Excel with all the right columns |

---

## Data Summary (As of Demo)

```
Users:        8  (Inventory, 3x Sales Consultant, Sales Manager, F&I, GM, BDC)
Vehicles:    20  (8 Sold, 8 Frontline, 2 In Recon, 2 In Transit)
Customers:   15
Leads:       14  (6 Sold, 2 Lost, 6 Active)
Activities:  27  (Calls, Emails, Texts, Notes, Visits)
Tasks:       16  (5 Completed, 11 Pending)
Deals:       13  (6 Funded, 1 Unwound, 1 Delivered, 1 Contracts Signed,
                   1 F&I, 1 Desking, 1 Pending)
Deal Range:  #1001 (Oct 14 2025) → #1013 (Mar 9 2026)
```

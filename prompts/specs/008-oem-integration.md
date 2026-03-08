# Spec prompt: 008 OEM / Manufacturer Integration

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **008-oem-integration**: warranty claim submission and status, recall lookup and alerts, manufacturer incentive/rebate programs, and compliance reporting to the OEM.

**Why:** Dealerships are franchised by OEMs and must exchange data with them. Warranty repairs must be submitted for reimbursement; recalls must be checked when a vehicle comes in; and current rebates/incentives must be applied to deals. The system must support warranty claims, recall management, OEM program data, and (where feasible) inventory or sales reporting in OEM formats.

**Prerequisites:** 001-vehicle-inventory, 003-sales-deal-management, 005-service-repair-orders. Roles: Service Advisor, Warranty Clerk, Sales Manager, Controller. OEM integration may be simulated (e.g. mock API or file-based) if real OEM portals are not in scope.

**User Story 1 (P1) — Warranty claim submission**  
As a Warranty Clerk or Service Advisor I can create a warranty claim linked to a closed repair order and vehicle. I enter labor code, labor hours, labor amount, parts used (with amounts), and total amount. I can submit the claim to the OEM (integration may be simulated: store claim as Submitted and optionally receive a mock claim number). I can track status: Draft, Submitted, Approved, Rejected, Paid. If rejected, I can record the rejection reason. When paid, I record paid date. I can list claims by status and date range and see total submitted vs. paid.

**User Story 2 (P2) — Recall management**  
As a system or admin I can load recall data (e.g. from NHTSA or OEM): recall number, description, remedy, affected VINs or year/make/model range, parts required, labor time, safety-related flag. As a Service Advisor when I create or open an RO for a vehicle, the system checks if the vehicle's VIN (or year/make/model) is in any open recall and displays an alert: "This vehicle has an open recall: [recall number] — [description]." I can view recall details and mark that the recall was performed (or deferred) on this visit. Customers with affected vehicles can be identified from the customer/vehicle database for outreach (list export or report).

**User Story 3 (P3) — Incentive and rebate programs**  
As a Sales Manager or Controller I can maintain OEM programs: program name, type (Rebate, Rate, Bonus), amount, eligibility criteria (e.g. vehicle type, finance required), start and end date, stackable (yes/no), and whether it requires financing. When desking a deal (003), the system can show applicable programs for the selected vehicle and deal type so the salesperson can apply the right rebate or rate. Applied programs are recorded on the deal. Program data may be entered manually or imported (file or API) if the OEM provides it.

**User Story 4 (P4) — Vehicle inventory reporting to OEM**  
As a Controller or designated user I can generate a report of current vehicle inventory (VIN, make, model, year, status, acquisition date) in a format required by the OEM (e.g. CSV or fixed-width). Report can be run on demand or scheduled. Actual submission (SFTP, API) may be simulated; we produce the file.

**User Story 5 (P5) — Sales and compliance reporting**  
As a Controller I can generate a sales report for the OEM: units sold by VIN, date, customer (if allowed), and deal details in OEM-required format. CSI (Customer Satisfaction Index) survey results may be received from the OEM and stored by vehicle or deal for tracking; survey submission is out of scope. Compliance reporting means producing the right data files; sending them is configurable (e.g. manual upload or automated).

**Out of scope for this feature:** Real-time OEM portal SSO, vehicle order/allocation from OEM, and parts ordering from OEM distribution (can be a separate integration). Use correct domain terms (warranty claim, recall, OEM, rebate, CSI); see dealer-management-system-guide.md.

# Spec prompt: 001 Vehicle Inventory

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **001-vehicle-inventory**: the vehicle inventory module plus the foundational authentication and roles needed for dealership staff to use it.

**Why:** Dealerships need one place to see every vehicle they own, from the moment it arrives (OEM shipment, auction, or trade-in) until it is sold or wholesaled. Without it, sales staff cannot reliably find cars for customers and management cannot see inventory value or aging (critical for floor plan cost).

**Users and roles (for this feature):** Inventory Manager, Sales Consultant, General Manager. All must sign in; access is role-based. No customer-facing or public login in this phase.

**User Story 1 (P1) — Add and manage vehicles**  
As an Inventory Manager I can add a vehicle to inventory by entering or scanning its VIN so that the system auto-fills make, model, year, trim, and key specs from a free VIN decoder (e.g. NHTSA). I can assign a unique stock number, set condition (New / Used / CPO), set status (In Transit, In Recon, Frontline Ready, Sold, Wholesaled), and enter pricing (MSRP, invoice if new, internet price, sale price when sold). I can add multiple photos per vehicle and set a primary image. I can record lot location and view a simple history of status and price changes. I can edit or soft-delete a vehicle. Every vehicle has one current status and one condition.

**User Story 2 (P2) — Search and filter inventory**  
As a Sales Consultant I can search and filter the active (non-sold, non-wholesaled) inventory by make, model, year, body style, price range, color, mileage, and condition so that I can quickly show options to a customer. Results show key details and primary photo. I can open a vehicle to see full details and all photos.

**User Story 3 (P3) — Aging and value dashboard**  
As a General Manager I can see a dashboard with: total number of vehicles in stock, total inventory value (sum of internet or sale price), average days in stock, and a list of vehicles older than 60 days (with stock number, make/model, days in stock, current price) so I can decide on price reductions and manage floor plan cost.

**Out of scope for this feature:** Customers, leads, deals, F&I, service, parts, accounting, OEM integration, and AI features. Domain terms (VIN, MSRP, ACV, recon, frontline, etc.) must be used correctly; see the project guide (dealer-management-system-guide.md) for definitions.

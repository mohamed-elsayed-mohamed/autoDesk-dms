# Spec prompt: 006 Parts Inventory

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **006-parts-inventory**: the parts catalog, stock levels, purchase orders, receiving, and usage from repair orders.

**Why:** Parts must be on the shelf when technicians need them. Without a DMS, parts run out unexpectedly and repairs are delayed. The system must support a searchable parts catalog with part number, description, cost, price, quantity on hand, reorder point, reorder quantity, and bin location; purchase orders to vendors; receiving shipments; and automatic decrement when a part is used on an RO.

**Prerequisites:** 005-service-repair-orders exists so that RO lines can consume parts from the catalog. Roles: Parts Advisor, Parts Manager, Technician (lookup and request).

**User Story 1 (P1) — Parts catalog**  
As a Parts Advisor I can add a part to the catalog: part number (unique), OEM part number (optional), description, category, manufacturer, unit cost, unit price, reorder point, reorder quantity, and bin location. I can search parts by part number, OEM number, or description and see quantity on hand and quantity on order. I can edit or deactivate a part (soft delete). I can view a part detail with full info and last-sold date.

**User Story 2 (P2) — Stock management**  
As a Parts Advisor the system shows quantity on hand and quantity on order for each part. When a part is used on an RO line (linked to this part), quantity on hand decrements automatically. When I receive a purchase order (or partial receive), quantity on hand increases and quantity on order decreases. I can run a low-stock report: all parts where quantity on hand is below reorder point, with suggested order quantity (reorder quantity or enough to reach reorder point).

**User Story 3 (P3) — Vendors and purchase orders**  
As a Parts Manager I can maintain a vendor list: name, account number, contact name, email, phone, address, and lead time in days. I can create a purchase order: select vendor, add lines (part, quantity ordered, unit cost). PO has status: Draft, Submitted, Partially Received, Received, Cancelled. I can submit the PO (status Submitted) and record expected delivery date. I can receive the shipment: for each line, enter quantity received; when all lines are fully received, PO status becomes Received and inventory is updated (quantity on hand increases, quantity on order decreases).

**User Story 4 (P4) — Parts usage on RO**  
As a Service Advisor when I add a part to an RO line I can search the parts catalog and select a part; the system fills description, unit cost, unit price and decrements quantity on hand. If the part is not in the catalog I can add a one-off line (part number, description, quantity, unit cost, unit price) without affecting the catalog. Technician can request a part by number; the advisor adds it to the RO line and parts can pull from the bin (process is manual; we only track that the part was used).

**User Story 5 (P5) — Reports**  
As a Parts Manager I can see: total parts value on hand, list of parts below reorder point with suggested order quantities, and optionally slow-moving parts (e.g. not sold in last 90 days). Lost sales (customer asked for a part we didn't have) can be recorded as a simple log: part number or description, date, optional notes — to inform future stocking.

**Out of scope for this feature:** Special-order parts tied to a single RO, returns to vendor workflow, and integration with OEM parts ordering. Use correct domain terms (bin location, reorder point, PO); see dealer-management-system-guide.md.

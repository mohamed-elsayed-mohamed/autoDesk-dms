# Spec prompt: 005 Service & Repair Orders

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **005-service-repair-orders**: appointment scheduling, repair order (RO) creation and lifecycle, technician assignment, parts usage, and service history.

**Why:** The service department is a major revenue driver and keeps customers coming back. Without a DMS, appointments get double-booked and repair orders are on paper. The system must support booking appointments, creating ROs with complaint/cause/correction lines, assigning technicians, adding parts and labor, and closing/invoicing the RO. Service history by vehicle or customer must be searchable.

**Prerequisites:** 001-vehicle-inventory and 002-crm exist. Appointments and ROs link to customers and vehicles. Roles: Service Advisor, Technician, Service Manager. Parts used on an RO may reference the parts catalog (006-parts-inventory); if parts module is not yet built, parts can be entered as line items with number, description, quantity, cost, price).

**User Story 1 (P1) — Appointment scheduling**  
As a Service Advisor or BDC I can create an appointment: select customer and vehicle (or enter vehicle by VIN if not in system), choose date and time slot, duration, and list of concerns. I can see a calendar or list view of appointments by day. I can reschedule or cancel. Appointment statuses: Scheduled, Checked-In, No-Show, Completed. When the customer arrives, I can mark the appointment Checked-In and optionally create an RO from it (linking the same customer and vehicle).

**User Story 2 (P2) — Repair order creation and lines**  
As a Service Advisor I can create a repair order (RO) linked to customer and vehicle (and optionally to an appointment). The RO has a unique RO number. I can add one or more lines: each line has complaint (what the customer said), cause (diagnosis), correction (what we did), labor hours, labor rate, and pay type (Customer Pay, Warranty, Internal, Sublet). I can assign a technician to each line. I can add parts to a line: part number, description, quantity, unit cost, unit price (or pull from parts catalog if available). RO status: Open, In Progress, Waiting Parts, Waiting Approval, Complete, Invoiced, Closed. I can update lines (add parts, set cause/correction) and move the RO through statuses.

**User Story 3 (P3) — Technician work queue**  
As a Technician I can see my assigned RO lines in a work queue: RO number, vehicle, complaint, parts needed, status. I can clock in/out on a line and mark the line In Progress or Complete. I can flag that I need a part (for parts department to pull). I do not set labor rate or pay type; the advisor does.

**User Story 4 (P4) — Service status board**  
As a Service Manager or Advisor I can see a status board of all vehicles currently in the shop: RO number, customer, vehicle, advisor, technician(s), current status, opened time. This gives a real-time view of shop load and progress.

**User Story 5 (P5) — Close and invoice RO**  
As a Service Advisor I can close the RO when all lines are complete. The system calculates subtotal (parts + labor), tax, and total. I can apply a tax rate. Once closed, the RO is invoiced (status Invoiced or Closed) and the total is recorded. The customer can be notified (mechanism out of scope; we only record that the RO is ready for pickup).

**User Story 6 (P6) — Service history**  
As a Service Advisor or Manager I can search service history by VIN or by customer. I see a list of past ROs with date, RO number, vehicle, summary of work, and total. I can open any RO to see full lines and parts. This helps when a customer returns or when selling a used car with a service history.

**Out of scope for this feature:** Multi-point inspection checklist UI, warranty claim submission to OEM (008), automated customer SMS/email, and payroll/flag hours. Use correct domain terms (RO, pay type, op-code, flagged hours); see dealer-management-system-guide.md.

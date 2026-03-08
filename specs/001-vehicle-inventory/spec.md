# Feature Specification: Vehicle Inventory

**Feature Branch**: `001-vehicle-inventory`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: Vehicle inventory module plus foundational authentication and roles for dealership staff. Add and manage vehicles with VIN decode, photos, status, pricing; search and filter inventory; aging and value dashboard for General Manager.

## Clarifications

### Session 2026-03-08

- Q: How many vehicles should the system support per dealership (order of magnitude)? → A: Medium (~500–2,000 vehicles); paginated lists (e.g. 25–50 per page).
- Q: How is the stock number determined? → A: System-generated only; sequential starting at 1001 (e.g. 1001, 1002, …). User cannot enter or change it.
- Q: Is there a maximum number of photos per vehicle? → A: Cap at 20 photos per vehicle.
- Q: Should the spec require explicit empty-state and loading-state behavior? → A: Yes: require empty state (e.g. "No vehicles yet" / "No results") and loading state (e.g. during VIN decode and list load) with clear, user-friendly messaging.
- Q: Who can restore a soft-deleted vehicle back to active inventory? → A: Inventory Manager only.
- Q: Is `internetPrice` required? → A: Required when status is FrontlineReady or active/listed; optional for vehicles that are InTransit or InRecon (still being prepared). System validates on save based on current status.
- Q: When is `dateAcquired` set — automatically on creation or user-entered? → A: User-entered with default of today. Inventory managers may enter a past date (e.g. a trade-in accepted yesterday). This drives days-in-stock and floor plan aging calculations.
- Q: Does the dashboard `totalValue` include sold vehicles? → A: No. `totalValue` is the sum of `internetPrice` for active (non-sold, non-wholesaled, non-deleted) vehicles only. The description "internet price for unsold, sale price for sold" clarifies the per-vehicle current price display; it does not change what is summed for the dashboard total.
- Q: Photo storage — use external service or local? → A: Local disk storage for now. Photos uploaded directly to the backend; stored on local disk under `uploads/vehicles/{vehicleId}/`. Production migration to cloud storage is a separate concern.
- Q: Should the system run via Docker for local development? → A: Yes. A `docker-compose.yml` at the repo root must bring up the full stack (PostgreSQL, backend, frontend) with a single command.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add and Manage Vehicles (Priority: P1)

As an Inventory Manager I can add a vehicle to inventory by entering or scanning its VIN so that the system auto-fills make, model, year, trim, and key specs from a free VIN decoder (NHTSA). The system assigns a unique stock number (sequential, starting at 1001) at creation; I cannot enter or change it. I can set condition (New / Used / CPO), set status (In Transit, In Recon, Frontline Ready, Sold, Wholesaled), and enter pricing (MSRP, invoice if new, internet price required when Frontline Ready or active/listed, sale price when sold). I can set the `dateAcquired` — it defaults to today but I can enter a past date if the vehicle was physically acquired earlier. I can add up to 20 photos per vehicle, reorder them by drag-and-drop, and set a primary image. I can record lot location and view a simple history of status and price changes, including who made each change. I can edit or soft-delete a vehicle. Every vehicle has one current status and one condition.

**Why this priority**: Inventory is the heart of the DMS; all other modules depend on vehicles. Without add/edit and VIN decode, the system cannot be used.

**Independent Test**: Add a vehicle via VIN, set status and pricing, set dateAcquired to a past date, add photos and reorder them, then edit and soft-delete. Verify history shows who changed what. Delivers a working inventory record for use in search and dashboard.

**Acceptance Scenarios**:

1. **Given** I am logged in as Inventory Manager, **When** I enter a valid 17-character VIN and request decode, **Then** the system populates make, model, year, trim, and key specs from the decoder; on save the system assigns a unique stock number (starting at 1001, incrementing) and I can save the vehicle.
2. **Given** a vehicle exists in inventory, **When** I change status (e.g. In Recon to Frontline Ready) or update price, **Then** the change is recorded in the vehicle's history with my name, the old value, the new value, and the timestamp.
3. **Given** a vehicle has multiple photos, **When** I reorder them by drag-and-drop and set one as primary, **Then** the new order and primary are persisted; the primary image is used as the main thumbnail in lists and search results.
4. **Given** a vehicle exists, **When** I soft-delete it, **Then** it is excluded from active inventory and search but remains in the system for audit; I can view it in the "Archived" view. **Given** I am an Inventory Manager viewing a soft-deleted vehicle, **When** I choose to restore it (after confirming in a dialog), **Then** the vehicle returns to active inventory with its previous status. Only Inventory Manager can restore; other roles cannot.
5. **Given** I attempt to add a vehicle whose VIN is already in the system and soft-deleted, **When** the system detects the duplicate, **Then** instead of a generic duplicate error, it shows "A vehicle with this VIN already exists in your archived records" with a direct link to restore that vehicle.

---

### User Story 2 - Search and Filter Inventory (Priority: P2)

As a Sales Consultant I can search and filter the active (non-sold, non-wholesaled) inventory by make, model, year, body style, price range, color, mileage, and condition so that I can quickly show options to a customer. I can also type a keyword (e.g. "Honda silver 2022") to search across make, model, trim, and VIN. Results show key details and primary photo. I can sort results by any column. I can open a vehicle to see full details and all photos.

**Why this priority**: Sales cannot help customers without quickly finding matching vehicles; search and filter are the primary daily use case after adding vehicles.

**Independent Test**: With several vehicles in inventory (mixed statuses), apply filters and a keyword search, verify only active vehicles appear, results show key details and primary photo, and opening a result shows full details and all photos. Sort by price descending and verify order.

**Acceptance Scenarios**:

1. **Given** I am a Sales Consultant with active inventory, **When** I filter by make, model, year, body style, price range, color, mileage, or condition (or type a keyword across make, model, trim, VIN), **Then** only vehicles with status other than Sold and Wholesaled are returned and match the selected filters.
2. **Given** search or filter results are displayed, **When** I view the list, **Then** each row shows key details (year, make, model, trim, price, mileage) and the primary photo. I can click any column header to sort ascending or descending.
3. **Given** I select a vehicle from the list, **When** I open it, **Then** I see full vehicle details and all photos.

---

### User Story 3 - Aging and Value Dashboard (Priority: P3)

As a General Manager I can see a dashboard with: total number of active vehicles in stock, total inventory value (sum of internet price for active vehicles only), average days in stock, and a list of active vehicles older than 60 days (with stock number, make/model, days in stock, current internet price) so I can decide on price reductions and manage floor plan cost.

**Why this priority**: Management visibility into inventory value and aging drives pricing and floor plan decisions; required for day-one value but builds on P1 and P2.

**Independent Test**: With inventory containing vehicles of varying age and value (including some sold), open the dashboard. Verify `totalValue` sums only active vehicles' internet prices (not sold vehicles). Verify average days in stock and the over-60-days list are correct.

**Acceptance Scenarios**:

1. **Given** I am a General Manager, **When** I open the inventory dashboard, **Then** I see total count of active vehicles (non-sold, non-wholesaled, non-deleted), total inventory value (sum of `internetPrice` for active vehicles only), and average days in stock.
2. **Given** the dashboard is open, **When** I view the aging section, **Then** I see a list of active vehicles that have been in inventory more than 60 days, with stock number, make/model, days in stock, and current internet price. The list is paginated.
3. **Given** inventory value is displayed, **When** the system calculates it, **Then** it uses `internetPrice` for active (unsold) vehicles only. Sold and wholesaled vehicles are excluded from `totalValue`. This is auditable by summing the internet prices of the active list manually.

---

### Edge Cases

- What happens when the VIN decoder is unavailable or returns no data? System allows manual entry of make, model, year, and key specs; vehicle can still be saved. User is informed that decode failed with a friendly message (not a blank screen).
- What happens when a duplicate VIN is entered? If the duplicate is an active vehicle: system rejects the save with "A vehicle with this VIN already exists." If the duplicate is a soft-deleted vehicle: system shows "A vehicle with this VIN already exists in your archived records" with a direct link to the archived record so the user can restore it.
- Stock number: System auto-assigns, starting at 1001 and incrementing by 1. User cannot enter or change it. Uniqueness guaranteed via database transaction.
- How does the system handle invalid or incomplete pricing? `internetPrice` is required when status is FrontlineReady; optional for InTransit and InRecon. Missing required values prevent save with inline error messages. MSRP and invoice are optional for used vehicles.
- What happens when a user tries to add more than 20 photos to a vehicle? System prevents the upload and shows "Photo limit reached (20/20)."
- Empty state: When there are no vehicles (or no results match search/filter), the system shows a clear empty-state message (e.g. "No vehicles yet" or "No vehicles match your filters").
- Loading state: During VIN decode and when loading the vehicle list or dashboard, the system shows a loading state (e.g. skeleton or spinner with label "Loading inventory…"); no blank screens.
- What happens when a user without Inventory Manager role tries to add or edit vehicles? System denies access with a clear role-specific message.
- What happens when a non–Inventory Manager tries to restore a soft-deleted vehicle? System denies access; only Inventory Manager can restore.
- What happens when the user's JWT session expires mid-workflow? The system detects the 401 response, preserves any unsaved form state, and redirects to the login screen with the message "Your session has expired. Please sign in again." After re-login, the user is returned to where they were.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require users to sign in before accessing any inventory or dashboard screen; access MUST be enforced by role (Inventory Manager, Sales Consultant, General Manager).
- **FR-002**: System MUST allow Inventory Managers to add a vehicle by entering a VIN and MUST call the NHTSA vPIC API to auto-fill make, model, year, trim, and key specs when available. If the decoder is unavailable or returns no data, System MUST allow manual entry and MUST NOT block save.
- **FR-003**: System MUST auto-assign a unique stock number (sequential, starting at 1001) per vehicle at creation; user MUST NOT be able to enter or change stock number. System MUST support condition (New / Used / CPO) and status (In Transit, In Recon, Frontline Ready, Sold, Wholesaled).
- **FR-004**: System MUST support pricing fields: MSRP, invoice price (optional), internet price (required when status is FrontlineReady; optional for InTransit and InRecon), sale price (when sold); and MUST allow editing and MUST log price and status changes to history including who made the change, the old value, and the new value.
- **FR-005**: System MUST allow up to 20 photos per vehicle, with one designated as primary; primary photo MUST be used in list and search result thumbnails. System MUST support drag-and-drop reordering of photos. System MUST prevent adding more than 20 photos and inform the user with "Photo limit reached (20/20)" when the limit is reached. System MUST allow removing individual photos.
- **FR-006**: System MUST support lot location, `dateAcquired` (user-set, defaults to today), and MUST allow soft-delete of vehicles. Soft-deleted vehicles MUST be excluded from active inventory and search and retained for audit. Only Inventory Manager MUST be able to restore a soft-deleted vehicle; other roles MUST NOT have restore permission. Restore MUST require an explicit confirmation dialog.
- **FR-007**: System MUST allow Sales Consultants to search and filter active inventory by make, model, year, body style, price range, color, mileage, and condition. System MUST support a keyword search (`q` param) that searches across make, model, trim, and VIN. Results MUST show key details and primary photo. Results MUST be sortable by any column header.
- **FR-008**: System MUST allow opening a vehicle from search/list to view full details and all photos.
- **FR-009**: System MUST provide a General Manager dashboard showing total active vehicles in stock, total inventory value (sum of `internetPrice` for active vehicles only — sold and wholesaled vehicles excluded), average days in stock, and a paginated list of active vehicles older than 60 days with stock number, make/model, days in stock, and current internet price.
- **FR-010**: System MUST use correct automotive domain terms (VIN, MSRP, recon, frontline, CPO, etc.) in all labels and messages.
- **FR-011**: System MUST support inventory scale of 500–2,000 vehicles per dealership; vehicle list and dashboard aging list MUST be paginated (default page size 25; max 50; user can navigate pages).
- **FR-012**: System MUST show an empty state when there are no vehicles (or no search/filter results) — each empty state MUST include an illustrative icon, a descriptive heading, and a call to action where applicable (e.g. "No vehicles yet — Add your first vehicle"). MUST show loading skeleton screens (matching content shape) during VIN decode and when loading the vehicle list or dashboard. MUST show an error boundary on every page with a friendly message and retry action (no raw stack traces or blank screens).
- **FR-013**: Vehicle history MUST display the full name of the user who made each change alongside the timestamp, old value, and new value.
- **FR-014**: When a duplicate VIN is entered at creation and the matching vehicle is soft-deleted, the system MUST offer a direct link to that archived vehicle so the user can restore it instead of creating a duplicate.
- **FR-015**: When a user's JWT expires, the frontend MUST detect the 401 response, show a "session expired" message, and redirect to the login screen without losing the user's current page context.
- **FR-016**: The full development stack (PostgreSQL, backend, frontend) MUST be runnable on a local machine with a single `docker compose up` command. No external cloud services are required for local development. Photo uploads are stored on local disk.

### Key Entities *(include if feature involves data)*

- **Vehicle**: A single unit in inventory. Attributes: VIN (unique, 17 chars), stock number (system-assigned at 1001+, unique, not user-editable), year, make, model, trim, body style, exterior color, interior color, mileage, condition (New/Used/CPO), status (In Transit, In Recon, Frontline Ready, Sold, Wholesaled), MSRP, invoice price, internet price (required for FrontlineReady), sale price, lot location, date acquired (user-set, default today), date sold (if sold), soft-delete flag. Has many photos and history entries.
- **VehiclePhoto**: An image attached to a vehicle; has sort order (drag-and-drop reorderable) and a primary flag (exactly one primary per vehicle). Stored on local disk; `url` is a backend-relative path. Maximum 20 photos per vehicle.
- **VehicleHistory**: Immutable audit log entry for a status or price change on a vehicle; includes field name, old value, new value, timestamp, and the full name of the user who made the change.
- **User**: Staff member who signs in; has a role (Inventory Manager, Sales Consultant, General Manager). Out of scope: customer or public users.

### Assumptions

- Authentication method is email/password with role-based access; no SSO or OAuth required for this feature.
- VIN decoder is the free NHTSA vPIC API; no API key required.
- "Active" inventory means `deletedAt IS NULL` and `status NOT IN ('Sold','Wholesaled')`. Dashboard count and value use active vehicles only.
- Days in stock is calculated from `dateAcquired` to today (or `dateSold` if sold).
- Dashboard `totalValue` = sum of `internetPrice` for active vehicles only. Sold vehicles are excluded entirely from the dashboard total.
- Inventory scale: 500–2,000 vehicles; lists are paginated (25 per page default, max 50).
- No external cloud services (S3, AWS, etc.) for local development. Photos stored on local disk under `uploads/vehicles/`.
- All local dev services (DB, backend, frontend) run via Docker Compose.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Inventory Manager can add a new vehicle (with VIN decode), set status and pricing, add at least one photo, and see it in the list within 2 minutes of starting.
- **SC-002**: A Sales Consultant can find a set of matching vehicles (by make, price range, or keyword) and open full details for one vehicle in under 30 seconds from the search screen.
- **SC-003**: Dashboard `totalValue` exactly matches the sum of `internetPrice` for all active vehicles when verified manually; the over-60-days list is accurate.
- **SC-004**: No user can perform add/edit/delete on vehicles or see the dashboard without signing in; users see only screens and actions allowed for their role.
- **SC-005**: Running `docker compose up` from the repo root starts all services; a new developer can complete the first-time verification steps in `quickstart.md` without installing any services manually.

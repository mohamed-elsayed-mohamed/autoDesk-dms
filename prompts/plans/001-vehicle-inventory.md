# Plan prompt: 001 Vehicle Inventory

**Use with:** `/speckit.plan` — paste the content below into the command.

**Spec:** [specs/001-vehicle-inventory/spec.md](../../specs/001-vehicle-inventory/spec.md)

---

Create the technical implementation plan for the **001-vehicle-inventory** feature. Follow the project constitution (`.specify/memory/constitution.md`) and this tech stack:

**Backend**
- Node.js with NestJS and TypeScript. One module: `inventory` (or `vehicles`). Clean Architecture: controller → service → repository. Use Prisma as the ORM with PostgreSQL. Implement REST API under `/api/vehicles` (and `/api/auth` for this feature). Vehicle list and dashboard aging list must support pagination (default page size 25–50). Stock number: system-generated sequential at creation (e.g. 1001, 1002). VIN decoding: call the free NHTSA vPIC API (no API key); on failure allow manual entry. Vehicle photos: store in AWS S3; max 20 per vehicle; one primary. Support soft-delete and restore (restore allowed for Inventory Manager only). Implement VehicleHistory (or audit log) for status and price changes.

**Frontend**
- React with TypeScript. Use a consistent component library (Material UI or Ant Design). Implement: login (email/password), role-based routing for Inventory Manager, Sales Consultant, General Manager; vehicle list with filters and pagination; vehicle add/edit form with VIN decode, photo upload (up to 20, set primary), status/condition/pricing; vehicle detail view; dashboard for General Manager (totals, average days in stock, paginated over-60-days list). Empty state and loading state on all relevant screens (no blank screens). Shared TypeScript types for Vehicle, VehiclePhoto, etc. between frontend and backend.

**Auth**
- JWT-based authentication. Three roles for this feature: Inventory Manager, Sales Consultant, General Manager. Enforce at API level: only Inventory Manager can create/update/delete/restore vehicles; Sales Consultant can read and search; General Manager can read and view dashboard.

**Database**
- PostgreSQL. Prisma schema: User (id, email, passwordHash, role, etc.), Vehicle (vin, stockNumber, year, make, model, status, condition, pricing fields, lotLocation, deletedAt, etc.), VehiclePhoto (vehicleId, url, sortOrder, isPrimary), VehicleHistory (vehicleId, change type, old/new values, userId, createdAt). Unique constraints on vin and stockNumber. Indexes for status, make/model, and list/dashboard queries. Use migrations.

**Quality**
- Unit tests for stock number generation, pagination logic, and any payment/calculation logic if added later. Integration tests for vehicle CRUD and list endpoints. E2E (e.g. Cypress) for: login, add vehicle with VIN decode, search/filter, view dashboard. Follow constitution: test-first for business logic, API-first (implement and test API before UI).

**Out of scope for this plan**
- CRM, deals, service, parts, accounting, OEM, AI features. No SSO/OAuth. No public or customer-facing routes. Single dealership scope (no multi-tenancy).

Produce the implementation plan (plan.md), research.md if needed for NestJS/Prisma/NHTSA API, data-model.md, and API contracts for this feature. Align with the spec’s user stories (P1 add/manage, P2 search/filter, P3 dashboard) and clarifications (scale 500–2k, pagination, empty/loading states).

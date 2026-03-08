# Research: 001 Vehicle Inventory

**Feature**: 001-vehicle-inventory  
**Date**: 2026-03-08

## 1. NHTSA vPIC API for VIN Decode

**Decision**: Use NHTSA vPIC Decode VIN Values API (`GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json`). No API key required.

**Rationale**: Free, official US government API; returns Make, Model, Year, Trim, Body Class, Engine, Fuel Type, etc. Widely used in automotive applications.

**Alternatives considered**: Paid VIN decoders (e.g. Edmunds, Chrome) — rejected for cost; decode only when needed (no batch in this feature).

**Implementation notes**: Call from backend (NestJS) via HTTP client (axios/fetch). Map response fields to our Vehicle model (year, make, model, trim, bodyStyle, etc.). On 4xx/5xx or empty result, return `{ "decoded": false }` and allow manual entry. Do not block save on decode success.

---

## 2. NestJS Module Structure (Inventory)

**Decision**: Single NestJS module `InventoryModule` with `InventoryController`, `InventoryService`, and Prisma-based data access (service uses `PrismaService`; no separate repository class unless complexity grows). Controller handles only HTTP; service holds business logic (stock number generation, history logging, validation).

**Rationale**: Constitution requires controller → service → repository. Prisma as ORM serves as the repository layer when used only inside the service. Keeps 001 scope small; extract to explicit repository if needed later.

**Alternatives considered**: Separate `VehicleRepository` class — acceptable for consistency with Clean Architecture; can introduce in later features or if service grows beyond 200 lines.

---

## 3. Stock Number Generation

**Decision**: Sequential integer, starting at 1001, assigned at vehicle creation. Use Prisma transaction: `SELECT MAX(stockNumber) + 1` (or starting value 1001 if no vehicles exist); assign to new vehicle and persist in same transaction to avoid duplicates.

**Rationale**: Spec requires system-generated, unique, non-editable. Integer sequence (1001, 1002, …) is human-friendly for lot use (short, memorable). Starting at 1001 avoids single-digit numbers that look incomplete.

**Alternatives considered**: UUID — rejected (not human-friendly). Database SEQUENCE — acceptable and recommended for production; deferred to keep 001 simple. Formatted string like "STK-2026-0001" — rejected (product did not request it).

---

## 4. Vehicle Photos — Local Disk Storage

**Decision**: Backend accepts photo uploads as `multipart/form-data` via `POST /api/vehicles/:id/photos`. Files are stored on local disk under `uploads/vehicles/{vehicleId}/{uuid}.ext`. The backend serves the `uploads/` directory as static files (NestJS `ServeStaticModule` or equivalent). Photo `url` is a backend-relative path (e.g. `/uploads/vehicles/{id}/file.jpg`).

**Rationale**: No external cloud service required for local development. Keeps the developer experience simple — no AWS account, no credentials, no CORS configuration. When the project moves to production, replacing the storage layer (swap `DiskStorageService` for `S3StorageService`) is a clean, bounded change.

**Alternatives considered**: AWS S3 with presigned URLs — rejected for local development (requires AWS account, credentials, CORS setup). MinIO (local S3-compatible service in Docker) — considered but adds complexity; plain disk is sufficient for 001 scope. Client-side upload with no backend registration — rejected (we need to store URL and order in DB).

**Migration path**: Extract photo storage behind a `StorageService` interface (`uploadFile(file) → url`, `deleteFile(url)`). The local implementation writes to disk. A future `S3StorageService` implementation swaps in without touching the rest of the module.

---

## 5. JWT and Role-Based Access

**Decision**: JWT access token (1 hour expiry); payload includes `sub` (userId) and `role`. NestJS guard checks role per endpoint. No refresh token in 001 scope. Frontend detects 401 responses, shows "Your session has expired. Please sign in again." and redirects to login, preserving the current page URL in the redirect so the user returns after re-login.

**Rationale**: Constitution mandates JWT and RBAC. Three roles for this feature; enforce at controller/guard level. Role embedded in token to avoid DB hit every request. 1-hour expiry balances security and UX for staff who work in short bursts; a graceful re-login prompt is sufficient for 001.

**Alternatives considered**: Session-based auth — rejected (constitution says JWT). Refresh tokens — useful for 8-hour shifts; deferred to a later auth feature. Silent token refresh — adds complexity not justified by 001 scope.

---

## 6. Pagination, Filtering, and Sorting

**Decision**: Offset-based pagination: `page` (1-based) and `limit` (default 25, max 50). Filter query params: `make`, `model`, `year`, `bodyStyle`, `minPrice`, `maxPrice`, `color`, `minMileage`, `maxMileage`, `condition`, `status`. Keyword search: `q` param does case-insensitive `ILIKE '%q%'` across `make`, `model`, `trim`, `vin`. Sorting: `sortBy` (field name) and `sortOrder` (`asc`|`desc`), default `dateAcquired desc`. Active list excludes `status IN ('Sold','Wholesaled')` and `deletedAt IS NULL`. Indexes: `(deletedAt, status)`, `(make, model)`, `(year)`, composite for common filter combinations.

**Rationale**: Spec: 500–2,000 vehicles; default page size 25–50. Offset pagination is sufficient; cursor-based can be added later if needed. Full-text search via ILIKE is adequate for 001 scale; PostgreSQL full-text search (`tsvector`) can be added later.

**Alternatives considered**: Cursor-based pagination — better for very large lists; deferred. Full-text search via `tsvector` — better relevance ranking; deferred. In-memory filter — rejected (must be server-side for scale).

---

## 7. Prisma Schema Conventions

**Decision**: Use `Decimal` for all monetary fields (msrp, invoicePrice, internetPrice, salePrice). Use `DateTime` for dates. `dateAcquired` is user-set (defaults to today). Soft-delete: `deletedAt DateTime?`. VehicleHistory: immutable table with vehicleId, changeType, fieldName, oldValue, newValue, userId, createdAt.

**Rationale**: Constitution: no float for money; soft-delete for business entities; audit trail for status/price changes.

**Alternatives considered**: Float for money — rejected. Hard delete — rejected.

---

## 8. Docker Compose for Local Development

**Decision**: A `docker-compose.yml` at the repo root defines three services: `postgres` (PostgreSQL 16), `backend` (NestJS on port 3000), `frontend` (React/Vite dev server on port 5173). Backend and frontend use bind mounts for hot reload. Postgres data is persisted in a named volume. Environment variables are injected via the compose file; no external `.env` management needed to run.

**Rationale**: Spec FR-016 requires a single `docker compose up` to start all services. Removes the prerequisite of installing Postgres locally. Ensures every developer has an identical environment.

**Alternatives considered**: Manual local services — rejected (fragile, OS-dependent). Kubernetes/Helm — rejected (excessive complexity for local dev). Docker Compose with MinIO — considered for photo storage; rejected in favour of simple disk storage mounted into the backend container.

**Implementation notes**: Backend `Dockerfile` uses multi-stage build (dev target with `pnpm run start:dev`). Frontend `Dockerfile` uses Vite dev server. Uploads directory (`backend/uploads/`) is mounted as a named volume so photos persist across container restarts. Seed script (`backend/prisma/seed.ts`) runs automatically on first start (via `prisma migrate dev --name init && prisma db seed`).

---

## 9. internetPrice Validation Rule

**Decision**: `internetPrice` is required (non-null, positive) when `status = FrontlineReady`. It is optional for `InTransit` and `InRecon`. `salePrice` is required when `status = Sold`. Validation enforced in the service layer (not just the DTO) so it applies to both create and update.

**Rationale**: A vehicle cannot be "frontline ready" (available for sale) without a listed internet price — that would be a data quality issue surfaced to customers. Vehicles still in transit or recon legitimately may not have a final price yet.

**Alternatives considered**: Require internetPrice for all vehicles at creation — rejected (overly restrictive for acquisition workflow). Validate only at a "publish" step — rejected (adds workflow complexity not in 001 scope).

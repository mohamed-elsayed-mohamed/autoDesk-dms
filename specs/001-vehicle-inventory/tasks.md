# Tasks: Vehicle Inventory

**Input**: Design documents from `specs/001-vehicle-inventory/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-spec.md

**Tests**: Included per plan (unit: stock number, pagination, status transitions, internetPrice rule; integration: vehicle CRUD/list/dashboard; E2E: login, add vehicle, search/filter, dashboard).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story (US1, US2, US3)
- Exact file paths are included in every task description

## Path Conventions

- **Backend**: `backend/src/`, `backend/prisma/`, `backend/test/`
- **Frontend**: `frontend/src/`, `frontend/cypress/`
- **Root**: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Docker, and project structure per plan.md

- [X] T001 Create `docker-compose.yml` at repo root with three services: `postgres` (PostgreSQL 16, named volume `postgres_data`), `backend` (NestJS on port 3000, uploads volume `uploads_data`), `frontend` (Vite on port 5173); inject all env vars inline; no external `.env` file required to run
- [X] T002 Create backend project with NestJS and TypeScript in `backend/` (package.json, tsconfig.json, nest-cli.json, src/main.ts, src/app.module.ts) and `backend/Dockerfile` (dev target with hot reload)
- [X] T003 Create frontend project with React and TypeScript in `frontend/` using Vite (package.json, tsconfig, src/main.tsx, src/App.tsx) and `frontend/Dockerfile` (Vite dev server)
- [X] T004 [P] Configure ESLint and Prettier in `backend/` and `frontend/` (shared config where possible)
- [X] T005 [P] Add shared types for Vehicle, VehiclePhoto, VehicleHistory, User, enums (Condition, VehicleStatus, UserRole) in `frontend/src/types/index.ts`
- [X] T006 [P] Add Prisma to backend (`backend/package.json`, `backend/prisma/schema.prisma`) and configure PostgreSQL connection via `DATABASE_URL` env var

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth, database schema, module skeleton, local file storage. Must be complete before any user story.

**Checkpoint**: `docker compose up` starts all services; login works; schema is migrated.

- [X] T007 Define Prisma schema: User (id, email, passwordHash, firstName, lastName, role enum), Vehicle (id, vin, stockNumber, year, make, model, trim, bodyStyle, exteriorColor, interiorColor, mileage, condition enum, status enum, msrp Decimal?, invoicePrice Decimal?, internetPrice Decimal?, salePrice Decimal?, lotLocation, dateAcquired, dateSold, deletedAt, createdAt, updatedAt), VehiclePhoto (id, vehicleId, url, sortOrder, isPrimary, createdAt), VehicleHistory (id, vehicleId, changeType, fieldName, oldValue, newValue, userId, createdAt) in `backend/prisma/schema.prisma` with indexes and unique constraints per data-model.md
- [X] T008 Run Prisma migration (`backend/prisma/migrations/`) and generate client; verify schema matches data model
- [X] T009 Create Prisma seed script: 3 users (InventoryManager `inventory@dms.local`, SalesConsultant `sales@dms.local`, GeneralManager `gm@dms.local`, all password `password123`) in `backend/prisma/seed.ts`; configure `prisma.seed` in `backend/package.json`
- [X] T010 [P] Implement `StorageService` interface and `DiskStorageService` in `backend/src/common/storage/` — methods: `saveFile(file, vehicleId) → url`, `deleteFile(url)`; serve `backend/uploads/` as static files via `ServeStaticModule`
- [X] T011 [P] Implement auth module: `AuthModule`, `AuthController` (`POST /api/auth/login`), `AuthService` (validate email/password with bcrypt, return JWT with `sub` and `role`), JWT strategy, `RolesGuard` in `backend/src/modules/auth/`
- [X] T012 [P] Add JWT and role decorators and global guards in `backend/src/common/` (`@Roles()` decorator, `JwtAuthGuard`, `RolesGuard`)
- [X] T013 Create `InventoryModule` skeleton: `InventoryController`, `InventoryService` in `backend/src/modules/inventory/` with `PrismaService` and `StorageService` injection
- [X] T014 Configure environment: `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`); `frontend/.env.example` (`VITE_API_URL`); document in quickstart.md
- [X] T015 Add global exception filter and validation pipe in `backend/src/common/` for standardized error responses per api-spec.md

---

## Phase 3: User Story 1 - Add and Manage Vehicles (Priority: P1) — MVP

**Goal**: Inventory Manager can add vehicles (VIN decode, stock number starting at 1001, user-set dateAcquired), edit, soft-delete with confirmation, restore; view history (with actor name) and manage photos (up to 20, drag-and-drop reorder, delete, primary).

**Independent Test**: Login as Inventory Manager, add vehicle via VIN decode, set dateAcquired to yesterday, set status/pricing, upload and reorder photos, set primary, delete a photo, edit vehicle, soft-delete; open Archived view and restore. Verify history shows who changed what.

### Tests for User Story 1

- [X] T016 [P] [US1] Unit test: `stockNumberService.next()` returns 1001 for empty table, then increments; concurrent calls do not produce duplicates (transactional) in `backend/test/unit/inventory/stock-number.spec.ts`
- [X] T017 [P] [US1] Unit test: pagination helper `toPaginationMeta(page, limit, total)` in `backend/test/unit/common/pagination.spec.ts`
- [X] T018 [P] [US1] Unit test: `internetPrice` validation rule — required when `status = FrontlineReady`, optional otherwise in `backend/test/unit/inventory/internet-price-validation.spec.ts`
- [X] T019 [P] [US1] Unit test: status transition rules — all valid statuses accepted; VehicleHistory entry logged with old/new value and userId in `backend/test/unit/inventory/vehicle-status.spec.ts`
- [X] T020 [US1] Integration test: `POST /api/vehicles` (create with stock number), `GET /api/vehicles/:id` (includes changedBy in history), `PATCH /api/vehicles/:id`, `DELETE /api/vehicles/:id` (soft), `POST /api/vehicles/:id/restore` in `backend/test/integration/vehicles.e2e-spec.ts`
- [X] T021 [US1] Integration test: `POST /api/vehicles` with duplicate VIN (active) returns 400; with soft-deleted VIN returns 409 with `archivedVehicleId` in `backend/test/integration/vehicles-duplicate-vin.e2e-spec.ts`
- [X] T022 [US1] E2E test: login as Inventory Manager, add vehicle with VIN decode, add photo, edit vehicle, soft-delete, open Archived, restore in `frontend/cypress/e2e/us1-add-vehicle.cy.ts`

### Implementation for User Story 1

- [X] T023 [US1] Implement VIN decode: call NHTSA vPIC API in `backend/src/modules/inventory/vin-decode.service.ts`; expose `GET /api/vehicles/vin-decode/:vin`; return `{ decoded: false, reason }` on failure
- [X] T024 [US1] Implement vehicle create: assign next stock number (constant `STOCK_NUMBER_START = 1001`) in a transaction, validate VIN uniqueness (return 409 with `archivedVehicleId` for soft-deleted match), validate `internetPrice` rule, create Vehicle and initial VehicleHistory entry in `backend/src/modules/inventory/inventory.service.ts`
- [X] T025 [US1] Implement vehicle update: persist only provided fields, validate `internetPrice` rule on status change, log status/price changes to VehicleHistory with acting userId in `backend/src/modules/inventory/inventory.service.ts`
- [X] T026 [US1] Implement soft-delete and restore: set/clear `deletedAt`, enforce InventoryManager role, log to VehicleHistory in `backend/src/modules/inventory/inventory.controller.ts` and service
- [X] T027 [US1] Implement `GET /api/vehicles/:id` with photos (sorted by `sortOrder`) and history (including `changedBy { id, firstName, lastName }`); InventoryManager can fetch soft-deleted in `backend/src/modules/inventory/`
- [X] T028 [US1] Implement `GET /api/vehicles` list: apply filters, keyword `q` (`ILIKE` on make/model/trim/vin), `sortBy`/`sortOrder`, `includeDeleted`, pagination meta; compute `daysInStock` in `backend/src/modules/inventory/inventory.service.ts`
- [X] T029 [US1] Implement photo upload: `POST /api/vehicles/:id/photos` — accept `multipart/form-data`, call `DiskStorageService.saveFile()`, enforce max 20, assign `sortOrder`, create `VehiclePhoto` record in `backend/src/modules/inventory/`
- [X] T030 [US1] Implement photo update: `PATCH /api/vehicles/:id/photos/:photoId` — set `isPrimary` (clear previous) and/or `sortOrder` in `backend/src/modules/inventory/`
- [X] T031 [US1] Implement bulk photo reorder: `PATCH /api/vehicles/:id/photos/reorder` — accept ordered array of photo IDs, update `sortOrder` for all in a transaction in `backend/src/modules/inventory/`
- [X] T032 [US1] Implement photo delete: `DELETE /api/vehicles/:id/photos/:photoId` — delete DB record, call `DiskStorageService.deleteFile()`, auto-promote next photo to primary if deleted was primary in `backend/src/modules/inventory/`
- [X] T033 [US1] Add DTOs with class-validator: `CreateVehicleDto`, `UpdateVehicleDto`, `PhotoReorderDto` in `backend/src/modules/inventory/dto/`
- [X] T034 [US1] Frontend: login page, JWT storage in memory/context, `useAuth` hook, session-expired interceptor (detect 401, show "Session expired", redirect to login preserving current path) in `frontend/src/modules/auth/`
- [X] T035 [US1] Frontend: protected route and role-based redirect; sidebar/nav shows only role-appropriate links in `frontend/src/`
- [X] T036 [US1] Frontend: vehicle add/edit form — VIN decode button (loading state "Decoding VIN…"), fields (dateAcquired with date picker defaulting to today, condition, status, pricing with `internetPrice` required indicator when FrontlineReady), lot location; inline validation; empty/loading states in `frontend/src/modules/inventory/`
- [X] T037 [US1] Frontend: photo manager — upload (multipart), drag-and-drop reorder (call bulk reorder endpoint on drop), set primary, delete photo (confirm dialog), "Photo limit reached (20/20)" message in `frontend/src/modules/inventory/`
- [X] T038 [US1] Frontend: vehicle detail page — all fields, photos, history table (shows field, old value, new value, changed by full name, timestamp) in `frontend/src/modules/inventory/`
- [X] T039 [US1] Frontend: vehicle list page (basic) — pagination (default 25/page), link to detail; empty state "No vehicles yet", loading skeleton in `frontend/src/modules/inventory/`
- [X] T040 [US1] Frontend: archived/deleted view — list with `includeDeleted=true`; restore button (InventoryManager only, confirmation dialog "Restore this vehicle to active inventory?") in `frontend/src/modules/inventory/`
- [X] T041 [US1] Frontend: duplicate-VIN restore flow — when API returns 409 with `archivedVehicleId`, show "A vehicle with this VIN is in your archived records" with link to the archived vehicle in `frontend/src/modules/inventory/`

**Checkpoint**: User Story 1 independently testable (add, edit, delete, restore, history with actor, photos with reorder and delete)

---

## Phase 4: User Story 2 - Search and Filter Inventory (Priority: P2)

**Goal**: Sales Consultant can search (keyword) and filter active inventory with sortable columns; results show key details and primary photo; open vehicle for full details.

**Independent Test**: Login as Sales Consultant, apply filters and a keyword search, verify only active vehicles returned; sort by price descending; open detail; empty state for no results.

### Tests for User Story 2

- [X] T042 [P] [US2] Integration test: `GET /api/vehicles` with `q`, filter params, `sortBy`, `sortOrder`, and pagination returns correct subset in `backend/test/integration/vehicles-list.e2e-spec.ts`
- [X] T043 [US2] E2E test: login as Sales Consultant, open list, type keyword, apply filter, sort by column, open vehicle detail in `frontend/cypress/e2e/us2-search-filter.cy.ts`

### Implementation for User Story 2

- [X] T044 [US2] Frontend: vehicle list filter panel — fields: make, model, year, body style, price range, color, mileage range, condition; keyword search input (`q`); "Clear filters" button; apply filters to `GET /api/vehicles` in `frontend/src/modules/inventory/`
- [X] T045 [US2] Frontend: list table with sortable column headers (click to sort asc/desc, indicator arrow); list row shows primary photo thumbnail, year, make, model, trim, mileage, internet price, status; loading skeleton and empty state "No vehicles match your filters" in `frontend/src/modules/inventory/`
- [X] T046 [US2] Frontend: enforce Sales Consultant cannot access add/edit/delete/restore/dashboard routes (redirect to list); role guard in `frontend/src/`

**Checkpoint**: User Story 2 independently testable (search, filter, sort, open detail)

---

## Phase 5: User Story 3 - Aging and Value Dashboard (Priority: P3)

**Goal**: General Manager sees total active count, total value (active vehicles only), average days in stock, and paginated list of active vehicles older than 60 days.

**Independent Test**: Open dashboard; verify `totalValue` matches sum of active vehicles' internet prices (sold vehicles excluded); verify over-60-days list; empty/loading states.

### Tests for User Story 3

- [X] T047 [P] [US3] Integration test: `GET /api/vehicles/dashboard` returns `totalCount`, `totalValue` (active only), `averageDaysInStock`, `agingList` with pagination; verify sold vehicles are excluded from `totalValue` in `backend/test/integration/dashboard.e2e-spec.ts`
- [X] T048 [US3] E2E test: login as General Manager, open dashboard, verify totals (with and without sold vehicles in DB), verify aging list in `frontend/cypress/e2e/us3-dashboard.cy.ts`

### Implementation for User Story 3

- [X] T049 [US3] Implement `GET /api/vehicles/dashboard`: `totalCount` (active), `totalValue` (sum `internetPrice` for active only), `averageDaysInStock`, `agingList` (`daysInStock > 60`, active only, paginated) in `backend/src/modules/inventory/inventory.service.ts` and controller
- [X] T050 [US3] Frontend: dashboard page — KPI row (total count, total value, average days in stock as large numbers), aging table (stock number, make/model, days in stock, internet price) with pagination; loading skeleton and empty state "No aging vehicles" in `frontend/src/modules/inventory/`
- [X] T051 [US3] Frontend: enforce General Manager can access dashboard and list/detail but not add/edit/delete/restore; role guard in `frontend/src/`

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Modern UI quality, docs, and validation per constitution XI v1.1.0

- [X] T052 [P] Define design tokens: brand accent color, neutral palette, semantic status colors (green/amber/red/blue), 8px spacing scale, border-radius (8–12px), box-shadow values, and typography scale in `frontend/src/styles/tokens.css` (or theme config if using MUI/Ant theme provider)
- [X] T053 [P] Implement vehicle status badges/chips: color-coded per status (InTransit=blue, InRecon=amber, FrontlineReady=green, Sold=gray, Wholesaled=purple) in `frontend/src/components/VehicleStatusBadge.tsx`; use everywhere status is displayed (list, detail, form)
- [X] T054 [P] Confirmation dialogs for soft-delete ("Archive this vehicle? It will be hidden from active inventory.") and restore ("Restore this vehicle to active inventory?") in `frontend/src/modules/inventory/`; ensure red styling for destructive action button
- [X] T055 [P] Error boundaries on every page: catch unexpected errors and show a friendly error card (icon + heading + retry button; no raw stack trace) in `frontend/src/components/ErrorBoundary.tsx`; wrap all page components
- [X] T056 [P] Verify and polish all empty states: each must have an illustrative icon, a descriptive heading, and a CTA where applicable ("No vehicles yet — Add your first vehicle"; "No vehicles match your filters — Clear filters"; "No aging vehicles"); implement in `frontend/src/components/EmptyState.tsx`
- [X] T057 [P] Verify all loading states use skeleton screens (not plain spinners) that match the shape of the content; implement reusable `VehicleListSkeleton`, `VehicleDetailSkeleton`, `DashboardSkeleton` in `frontend/src/components/`
- [X] T058 Run `docker compose up`, complete all steps in `quickstart.md` first-time verification, confirm all 6 steps pass
- [X] T059 Add `README.md` at repo root with: project overview, `docker compose up` instructions, screenshot or description of the UI, link to `quickstart.md`, link to `specs/001-vehicle-inventory/`
- [X] T060 [P] Code review pass: remove dead code; verify all monetary fields use Decimal; verify STOCK_NUMBER_START constant (no magic 1001); verify controller → service → repository layering; verify no `any` types; verify design tokens used (no hardcoded color hex values in components)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2. No dependency on US2/US3.
- **Phase 4 (US2)**: Depends on Phase 2; frontend list/filter builds on US1 list API (T028) and list page (T039).
- **Phase 5 (US3)**: Depends on Phase 2; dashboard builds on list/count logic in T028/T049.
- **Phase 6 (Polish)**: Depends on Phases 3–5.

### User Story Dependencies

- **US1**: After Foundational. Delivers: auth, vehicle CRUD, VIN decode, photos (local disk), history with actor, list/detail, archived/restore.
- **US2**: After Foundational; list API (T028) and basic list page (T039) from US1.
- **US3**: After Foundational; dashboard API. No dependency on US2.

### Within Each User Story

- Tests (T016–T022 for US1, etc.) should be written and failing before implementation (TDD for business logic).
- Backend: DTOs and service logic before controller endpoints.
- Frontend: API client and types before pages; empty/loading states built in from the start.

### Parallel Opportunities

- T004, T005, T006 in Phase 1 (linting, types, Prisma setup).
- T010, T011, T012 in Phase 2 (StorageService, auth module, guards).
- T016, T017, T018, T019 in Phase 3 (unit tests are independent).
- T029–T032 in Phase 3 (photo endpoints have different routes; some parallelizable by developer).
- T042 and T043 in Phase 4; T047 and T048 in Phase 5.
- US2 and US3 backend work can proceed in parallel after US1.
- Phase 6 tasks T052, T053, T054, T057 are all parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) — including Docker Compose.
2. Complete Phase 2 (Foundational) — `docker compose up` works; login returns JWT.
3. Complete Phase 3 (User Story 1) tests → implementation.
4. **STOP and VALIDATE**: Run first-time verification steps 1–6 from `quickstart.md`.
5. Demo or deploy.

### Incremental Delivery

1. Setup + Foundational → single-command `docker compose up` running.
2. US1 → independently testable MVP.
3. US2 → search and filter.
4. US3 → dashboard.
5. Polish → docs, error boundaries, code review.

---

## Notes

- [P] = parallelizable (different files, no blocking dependency).
- [USn] = task belongs to User Story n.
- No AWS, S3, or cloud credentials needed; all runs locally via Docker Compose.
- `backend/uploads/` is gitignored; Docker volume `uploads_data` persists photos across restarts.
- Commit after each logical group; follow Conventional Commits (`feat:`, `fix:`, etc.).

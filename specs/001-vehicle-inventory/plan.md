# Implementation Plan: Vehicle Inventory

**Branch**: `001-vehicle-inventory` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-vehicle-inventory/spec.md`

## Summary

Implement the vehicle inventory module and foundational auth for AutoDesk DMS: Inventory Managers add and manage vehicles (VIN decode via NHTSA, system-generated stock numbers starting at 1001, photos on local disk, status/price history with actor identity); Sales Consultants search and filter active inventory with keyword search and sortable columns; General Managers view a dashboard (active-only totals, average days in stock, paginated over-60-days list). Backend: NestJS + Prisma + PostgreSQL. Frontend: React + TypeScript with Material UI or Ant Design, role-based routing, empty/loading states. Local disk for photo storage; no external cloud services required. Full stack runs via `docker compose up`. API-first; test-first for business logic; Clean Architecture (controller → service → repository).

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS backend, React 18 frontend)  
**Primary Dependencies**: NestJS, Prisma, React, Material UI or Ant Design, Multer (file upload), `@nestjs/serve-static` (serve uploads)  
**Storage**: PostgreSQL (Prisma ORM); vehicle photos on local disk (`backend/uploads/vehicles/`)  
**Testing**: Jest (unit, integration), Supertest (API), Cypress (E2E)  
**Target Platform**: Web (browser); backend on Node; local development via Docker Compose  
**Project Type**: Web application (backend API + frontend SPA)  
**Performance Goals**: List/dashboard load < 2 s (constitution); support 500–2,000 vehicles with pagination  
**Constraints**: Pagination 25 per page default, max 50; max 20 photos per vehicle; VIN decode fallback to manual entry when NHTSA unavailable; no external cloud services for local dev  
**Scale/Scope**: Single dealership; 500–2,000 vehicles; 3 roles (Inventory Manager, Sales Consultant, General Manager)

## Constitution Check

*GATE: Must pass before implementation begins.*

| Principle | Status | Notes |
|-----------|--------|--------|
| I. Modular Domain Architecture | PASS | Single `inventory` module; owns routes, services, entities, DTOs |
| II. Type Safety End-to-End | PASS | TypeScript strict; shared types for Vehicle, VehiclePhoto, etc. |
| III. Test-First for Business Logic | PASS | Unit tests for stock number, pagination, status-transition validation, internetPrice rule; integration for all endpoints; E2E for login, add vehicle, search, dashboard |
| IV. Responsible AI Integration | N/A | No AI in this feature |
| V. Data Integrity | PASS | Decimal for money; VehicleHistory (with actor identity) for status/price changes; soft-delete; transactions for multi-table writes |
| VI. Security and Compliance | PASS | JWT + RBAC (3 roles); auth at controller level; audit via VehicleHistory |
| VII. API-First Design | PASS | REST under `/api/vehicles`, `/api/auth`; DTOs; pagination/filter/sort on list |
| VIII. Performance and Scalability | PASS | Indexes on status, make/model; pagination; local disk upload (no API bottleneck). Redis deferred (no reference data in scope for 001). Background jobs deferred (no async processing in 001 scope). |
| IX. Clean Code | PASS | Descriptive names; single-purpose functions; no magic numbers (stock start = named constant STOCK_NUMBER_START = 1001) |
| X. Clean Architecture | PASS | Controller → service → repository; no business logic in controllers; StorageService interface isolates disk I/O |
| XI. User-Friendly UI/UX | PASS | Empty/loading states; < 2 s load; consistent component library; confirmation for delete/restore; sortable columns; drag-and-drop photo reorder; session-expired redirect |

No unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-vehicle-inventory/
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-spec.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
docker-compose.yml        # Single command: docker compose up
backend/
├── Dockerfile
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/           # Guards, pipes, filters, decorators, StorageService
│   ├── modules/
│   │   ├── auth/         # Login, JWT, roles
│   │   └── inventory/    # Vehicles: controller, service, DTOs, VinDecodeService
│   └── config/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts           # Seeds 3 users (one per role)
├── uploads/              # Local photo storage (gitignored; mounted as Docker volume)
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json

frontend/
├── Dockerfile
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/              # API client, typed response models
│   ├── components/       # Layout, DataTable (sortable), empty/loading states, error boundary
│   ├── modules/
│   │   ├── auth/         # Login page, auth store, protected route, session-expired handler
│   │   └── inventory/    # List (filters, sort, keyword), add/edit form, detail, photos, dashboard, archived
│   ├── hooks/
│   ├── types/            # Vehicle, VehiclePhoto, VehicleHistory, User (align with backend)
│   └── utils/
├── cypress/              # E2E: login, add vehicle, search, dashboard
└── package.json
```

**Structure decisions**:
- `StorageService` interface in `backend/src/common/` with a `DiskStorageService` implementation. Swappable to S3 later.
- `backend/uploads/` is gitignored and mounted as a Docker named volume.
- Prisma is at `backend/prisma/` (not under `src/`).
- Shared types live in `frontend/src/types/` and are imported by the frontend. Backend uses its own Prisma-generated types and DTO interfaces; alignment is maintained through the API contract.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |

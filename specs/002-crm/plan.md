# Implementation Plan: Customer Relationship Management (CRM)

**Branch**: `002-crm` | **Date**: 2026-03-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-crm/spec.md`

## Summary

Build the CRM module for AutoDesk DMS — customer profiles with duplicate detection, a lead pipeline (New → Contacted → Appointment Set → Showed → Negotiating → Sold/Lost), activity logging with a 360-degree customer timeline, follow-up tasks with overdue tracking, and in-app notifications for lead assignment. This builds on the existing auth and inventory modules from 001-vehicle-inventory. The approach follows Clean Architecture (controller → service → repository) with NestJS sub-modules under a single CRM domain module, Prisma for data access, and React/MUI for the frontend.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: NestJS 10, Prisma 5.20, React 18, MUI 6, Axios, react-router-dom 6
**Storage**: PostgreSQL (via Prisma ORM)
**Testing**: Jest (unit + integration), Cypress (E2E)
**Target Platform**: Web application (modern browsers, tablet-responsive)
**Project Type**: Web service + SPA
**Performance Goals**: Customer search <1s for 50k records; timeline load <2s; task list <3s
**Constraints**: No WebSockets for v1 (notification polling); no external integrations; single dealership
**Scale/Scope**: Up to 50,000 customers, proportional leads/activities/tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Modular Domain Architecture | PASS | CRM is a single domain module with internal sub-modules (customers, leads, activities, tasks, notifications). Communicates with Inventory via vehicle ID references only. |
| II | Type Safety End-to-End | PASS | TypeScript strict mode. Shared enums and interfaces added to `frontend/src/types/`. |
| III | Test-First for Business Logic | PASS | Unit tests before implementation for: round-robin assignment, lead status transitions (block Sold reopen), duplicate detection, overdue task calculation. Integration tests for all endpoints. |
| IV | Responsible AI Integration | N/A | No AI features in this module. |
| V | Data Integrity and Financial Accuracy | PASS | Soft-delete for customers (archivedAt). Immutable activities. All status transitions logged with timestamps in LeadStatusHistory. DB transactions for lead+customer creation. |
| VI | Security and Compliance | PASS | RBAC via existing JwtAuthGuard + RolesGuard. New roles: SalesManager, BDCAgent. Endpoint-level authorization. |
| VII | API-First Design | PASS | All REST endpoints designed and tested before UI. Pagination, filtering, sorting on all list endpoints. |
| VIII | Performance and Scalability | PASS | Indexes on all search/filter columns. Offset pagination (cursor-based deferred to future). No N+1 queries (Prisma includes). |
| IX | Clean Code | PASS | Named enums for all status/type values. Descriptive function names. No magic strings. |
| X | Clean Architecture | PASS | Controller → Service → Prisma. No business logic in controllers. No HTTP concerns in services. |
| XI | Modern, User-Friendly UI/UX | PASS | MUI 6 with design tokens. Skeleton loading. Empty states with CTA. Status badges/chips. 8px grid spacing. |

## Project Structure

### Documentation (this feature)

```text
specs/002-crm/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── customers-api.md
│   ├── leads-api.md
│   ├── activities-api.md
│   ├── tasks-api.md
│   ├── notifications-api.md
│   └── dashboard-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma         # Extended with CRM models
│   └── migrations/           # New migration for CRM tables
├── src/
│   ├── common/
│   │   ├── decorators/       # Existing: roles, current-user
│   │   ├── guards/           # Existing: jwt-auth, roles
│   │   ├── filters/          # Existing: all-exceptions
│   │   ├── prisma/           # Existing: PrismaService
│   │   └── dto/              # NEW: shared pagination DTOs
│   ├── modules/
│   │   ├── auth/             # Existing (unchanged)
│   │   ├── inventory/        # Existing (unchanged)
│   │   └── crm/              # NEW: CRM domain module
│   │       ├── crm.module.ts
│   │       ├── customers/
│   │       │   ├── customers.module.ts
│   │       │   ├── customers.controller.ts
│   │       │   ├── customers.service.ts
│   │       │   └── dto/
│   │       ├── leads/
│   │       │   ├── leads.module.ts
│   │       │   ├── leads.controller.ts
│   │       │   ├── leads.service.ts
│   │       │   ├── round-robin.service.ts
│   │       │   └── dto/
│   │       ├── activities/
│   │       │   ├── activities.module.ts
│   │       │   ├── activities.controller.ts
│   │       │   ├── activities.service.ts
│   │       │   └── dto/
│   │       ├── tasks/
│   │       │   ├── tasks.module.ts
│   │       │   ├── tasks.controller.ts
│   │       │   ├── tasks.service.ts
│   │       │   └── dto/
│   │       ├── notifications/
│   │       │   ├── notifications.module.ts
│   │       │   ├── notifications.controller.ts
│   │       │   ├── notifications.service.ts
│   │       │   └── dto/
│   │       └── dashboard/
│   │           ├── dashboard.module.ts
│   │           ├── dashboard.controller.ts
│   │           └── dashboard.service.ts
│   └── app.module.ts         # Updated to import CrmModule
└── test/
    ├── unit/
    │   ├── round-robin.service.spec.ts
    │   ├── leads.service.spec.ts
    │   ├── customers.service.spec.ts
    │   └── tasks.service.spec.ts
    └── integration/
        ├── customers.e2e-spec.ts
        ├── leads.e2e-spec.ts
        ├── activities.e2e-spec.ts
        ├── tasks.e2e-spec.ts
        └── notifications.e2e-spec.ts

frontend/
├── src/
│   ├── api/
│   │   ├── customers.ts      # NEW
│   │   ├── leads.ts           # NEW
│   │   ├── activities.ts      # NEW
│   │   ├── tasks.ts           # NEW
│   │   └── notifications.ts   # NEW
│   ├── components/
│   │   ├── StatusBadge.tsx    # NEW: reusable status chip
│   │   ├── Timeline.tsx       # NEW: reusable activity timeline
│   │   └── NotificationBell.tsx # NEW: header notification indicator
│   ├── modules/
│   │   └── crm/               # NEW
│   │       ├── customers/
│   │       │   ├── CustomerListPage.tsx
│   │       │   ├── CustomerFormPage.tsx
│   │       │   ├── CustomerDetailPage.tsx
│   │       │   └── components/
│   │       │       ├── DuplicateWarning.tsx
│   │       │       └── CustomerSearchBar.tsx
│   │       ├── leads/
│   │       │   ├── LeadListPage.tsx
│   │       │   ├── LeadFormPage.tsx
│   │       │   ├── LeadDetailPage.tsx
│   │       │   └── components/
│   │       │       ├── PipelineBoard.tsx
│   │       │       ├── LeadStatusStepper.tsx
│   │       │       └── VehicleInterestPicker.tsx
│   │       ├── tasks/
│   │       │   ├── MyTasksPage.tsx
│   │       │   ├── TaskFormDialog.tsx
│   │       │   └── components/
│   │       │       └── TaskCard.tsx
│   │       ├── dashboard/
│   │       │   └── ManagerDashboardPage.tsx
│   │       └── activities/
│   │           ├── ActivityLogDialog.tsx
│   │           └── components/
│   │               └── ActivityTimelineItem.tsx
│   ├── types/
│   │   └── index.ts           # Extended with CRM types
│   └── App.tsx                # Updated with CRM routes
└── cypress/
    └── e2e/
        ├── customer-flow.cy.ts
        ├── lead-pipeline.cy.ts
        ├── activity-timeline.cy.ts
        ├── task-management.cy.ts
        └── lead-reassign-notification.cy.ts
```

**Structure Decision**: CRM lives as a single NestJS domain module (`CrmModule`) that imports five internal sub-modules (customers, leads, activities, tasks, notifications). This aligns with Constitution Principle I (one domain module) while keeping code organized by sub-domain. The frontend mirrors this with a `modules/crm/` directory containing sub-directories per entity.

## Implementation Phases

### Phase 1: Schema & Shared Infrastructure

**Goal**: Extend the Prisma schema, add new roles, and create shared utilities.

1. **Extend UserRole enum** in Prisma schema — add `SalesManager` and `BDCAgent`.
2. **Add CRM models** to Prisma schema — Customer, Lead, LeadVehicle, LeadStatusHistory, Activity, Task, Notification. See `data-model.md` for full schema.
3. **Generate and apply Prisma migration**.
4. **Seed data** — extend `seed.ts` with sample users (SalesManager, BDCAgent, SalesConsultant) and a few test customers.
5. **Create shared pagination DTO** (`PaginationQueryDto`) and response wrapper (`PaginatedResponseDto`) in `backend/src/common/dto/`.
6. **Add CRM types** to `frontend/src/types/index.ts` — Customer, Lead, Activity, Task, Notification interfaces and enums.

### Phase 2: Customer Profiles (P1)

**Goal**: Full customer CRUD with search and duplicate detection.

**Backend (API-first)**:
1. Create `customers.module.ts`, `customers.controller.ts`, `customers.service.ts`.
2. **Endpoints**: `POST /api/customers`, `GET /api/customers`, `GET /api/customers/:id`, `PATCH /api/customers/:id`, `PATCH /api/customers/:id/archive`, `PATCH /api/customers/:id/restore`.
3. **Search**: `GET /api/customers?search=<term>` — partial match on firstName, lastName, phone, email using Prisma `contains` (case-insensitive). Filter `archivedAt IS NULL` by default.
4. **Duplicate detection**: `GET /api/customers/check-duplicates?phone=<phone>&email=<email>` — returns matching customers. Called by frontend before create/edit submission.
5. **Unit tests**: duplicate detection matching logic.
6. **Integration tests**: all customer endpoints including search performance with seeded data.

**Frontend**:
7. `CustomerListPage` — data table with search bar, pagination, filters.
8. `CustomerFormPage` — create/edit form with inline duplicate warning (calls check-duplicates on blur of phone/email fields).
9. `CustomerDetailPage` — profile view with contact info, leads list, activity timeline (timeline populated in Phase 4).
10. Add routes: `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit`.
11. Update sidebar navigation in `Layout.tsx`.

### Phase 3: Lead Capture & Pipeline (P2)

**Goal**: Lead CRUD, pipeline management, round-robin assignment, vehicle linking.

**Backend (API-first)**:
1. Create `leads.module.ts`, `leads.controller.ts`, `leads.service.ts`, `round-robin.service.ts`.
2. **Endpoints**: `POST /api/leads`, `GET /api/leads`, `GET /api/leads/:id`, `PATCH /api/leads/:id`, `PATCH /api/leads/:id/status`, `POST /api/leads/:id/vehicles`, `DELETE /api/leads/:id/vehicles/:vehicleId`, `PATCH /api/leads/:id/reassign`.
3. **Lead creation**: Accepts `customerId` or inline `customer` object. If inline customer, create both in a transaction. Validate source is required. If no `assignedTo`, trigger round-robin.
4. **Round-robin service**: Query active SalesConsultant users ordered by ID. Track `lastAssignedUserId` in a DB table (`RoundRobinState`) or simple key-value. Assign next in rotation. If no active salespeople, return error requiring manual assignment.
5. **Status transitions**: `PATCH /api/leads/:id/status` — validate Sold cannot be reopened. Record transition in `LeadStatusHistory`. If transitioning to Lost, accept optional `lostReason`.
6. **Vehicle linking**: Many-to-many via `LeadVehicle` join table. Vehicle details included via Prisma `include` on lead queries.
7. **Filtering**: `GET /api/leads?status=New&assignedTo=<userId>&source=Website&fromDate=2026-01-01&toDate=2026-03-09`.
8. **Notifications**: On lead creation (with assignment) or reassignment, create a Notification record for the assigned user.
9. **Unit tests** (test-first): round-robin rotation logic, status transition validation (block Sold reopen, allow Lost reopen), lead creation with inline customer.
10. **Integration tests**: all lead endpoints, round-robin assignment, status transitions, vehicle linking.

**Frontend**:
11. `LeadListPage` — data table with status/assignee/source/date filters, pagination.
12. `LeadFormPage` — create form with customer picker (search existing or create new inline), source dropdown (with "Other" free-text), salesperson dropdown (or "Auto-assign"), vehicle multi-select from inventory.
13. `LeadDetailPage` — status stepper/widget showing pipeline position, vehicle(s) of interest cards, activity list (populated Phase 4), task list (populated Phase 5), reassign button (Sales Manager only).
14. `PipelineBoard` — Kanban-style or grouped list view of leads by status (Sales Manager view).
15. Add routes: `/leads`, `/leads/new`, `/leads/:id`.

### Phase 4: Activities & Timeline (P3)

**Goal**: Activity logging and chronological customer timeline.

**Backend (API-first)**:
1. Create `activities.module.ts`, `activities.controller.ts`, `activities.service.ts`.
2. **Endpoints**: `POST /api/activities` (body: `{ customerId, leadId?, type, direction?, content? }`), `GET /api/customers/:id/timeline` (paginated, reverse-chronological, across all leads), `GET /api/leads/:id/activities` (paginated, for a single lead).
3. Activities are immutable — no PUT/PATCH/DELETE endpoints.
4. **Timeline query**: Join activities where `customerId = :id`, order by `performedAt DESC`, include lead info (source, status) for labeling.
5. **Integration tests**: activity creation, timeline aggregation across multiple leads.

**Frontend**:
6. `ActivityLogDialog` — modal/drawer form accessible from lead detail and customer detail. Fields: type (dropdown), direction (dropdown, hidden for "note"), content (textarea). Auto-stamps user and time.
7. `Timeline` component — reusable reverse-chronological list. Each item shows: icon by type, direction badge, content preview, performer name, timestamp, lead label if applicable.
8. Wire timeline into `CustomerDetailPage` and activity list into `LeadDetailPage`.

### Phase 5: Follow-Up Tasks (P4)

**Goal**: Task CRUD, "My Tasks for Today", overdue flagging, manager oversight.

**Backend (API-first)**:
1. Create `tasks.module.ts`, `tasks.controller.ts`, `tasks.service.ts`.
2. **Endpoints**: `POST /api/tasks`, `GET /api/tasks/my-today` (assigned to current user, due today or overdue, status = Pending), `GET /api/tasks` (filterable by assignedTo, status, date range — for manager view), `PATCH /api/tasks/:id` (mark complete or cancel), `GET /api/leads/:id/tasks`.
3. **Overdue logic**: Task is overdue if `status = Pending` AND `dueAt < NOW()`. Computed at query time, not stored.
4. **Unit tests** (test-first): overdue calculation logic, task status transition validation.
5. **Integration tests**: task CRUD, my-today query, manager filter by assignee.

**Frontend**:
6. `MyTasksPage` — list of today's + overdue tasks. Overdue tasks highlighted with red badge/chip per Constitution XI. Quick-action buttons: Complete, Cancel.
7. `TaskFormDialog` — modal form accessible from lead detail. Fields: description, due date/time picker, type dropdown.
8. `TaskCard` — compact card showing description, due date, overdue indicator, linked lead info.
9. Wire task list into `LeadDetailPage`. Add manager view with salesperson filter.
10. Add routes: `/tasks` (My Tasks), `/tasks/team` (manager view).

### Phase 6: Notifications

**Goal**: In-app notification delivery and display.

**Backend (API-first)**:
1. Create `notifications.module.ts`, `notifications.controller.ts`, `notifications.service.ts`.
2. **Endpoints**: `GET /api/notifications` (current user's notifications, paginated, newest first), `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
3. Notifications created by `leads.service.ts` on assignment/reassignment (internal call, not a separate API).
4. **Integration tests**: notification creation on lead assignment, unread count, mark-read.

**Frontend**:
5. `NotificationBell` — header icon with unread count badge. Polls `GET /api/notifications/unread-count` every 30 seconds.
6. Notification dropdown/popover — list of recent notifications. Click navigates to the lead. "Mark all read" button.
7. Wire `NotificationBell` into `Layout.tsx` header.

### Phase 7: UI Polish & Cross-Cutting

**Goal**: Ensure Constitution XI compliance across all CRM screens. Deliver Manager Dashboard for SC-010.

**Manager Dashboard (SC-010)**:
1. **Backend**: `GET /api/dashboard/manager` — returns pipeline summary (count per status), workload per assignee (lead count, task count), and task compliance (overdue task count per salesperson). Restricted to Sales Manager role.
2. `ManagerDashboardPage` — single screen combining: pipeline summary cards/chart, assignee workload table, overdue task compliance breakdown. Uses the aggregated endpoint for a single network call.
3. Add route: `/dashboard` with Sales Manager role guard.

**UI Polish**:
4. **Design tokens** — verify CRM screens use the existing MUI theme tokens (colors, spacing, typography).
5. **Skeleton loading** — add skeleton screens to CustomerList, LeadList, CustomerDetail, LeadDetail, MyTasks, ManagerDashboard, Timeline.
6. **Empty states** — illustrative icon + heading + CTA on: no customers found, no leads, no activities yet, no tasks today.
7. **Status badges** — `StatusBadge` component using semantic colors: green (Sold), red (Lost), blue (New), amber (Negotiating), etc.
8. **Responsive layout** — verify all data tables and forms work on tablet (768px+). Use MUI responsive breakpoints.
9. **Error boundaries** — wrap each CRM page in an error boundary with friendly retry message.
10. **Confirmation dialogs** — archive customer, cancel task, move lead to Lost.
11. **Inline form validation** — all forms validate on blur with clear error messages.

### Phase 8: Testing & Quality

**Goal**: Comprehensive test coverage per Constitution III.

1. **Unit tests** (should already exist from earlier phases): round-robin, status transitions, duplicate detection, overdue calculation.
2. **Integration tests** (should already exist): all API endpoints.
3. **E2E tests** (Cypress):
   - Create customer with duplicate warning flow.
   - Create lead, assign to salesperson, move through pipeline to Sold.
   - Log activity from lead, verify it appears on customer timeline.
   - Create task, verify overdue flagging the next day.
   - Manager reassigns lead, salesperson sees notification (login as manager, reassign, login as salesperson, verify notification appears).
   - Manager views dashboard with pipeline summary and task compliance.
4. **Linting and type-checking**: `npm run lint` and `tsc --noEmit` pass with zero errors.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

| Decision | Rationale | Simpler Alternative Considered |
|----------|-----------|-------------------------------|
| DB-backed round-robin state (not in-memory) | Survives server restarts; correct across multiple instances | In-memory counter — lost on restart, wrong with >1 instance |
| DB-backed notifications with polling (not WebSockets) | Simpler infrastructure for v1; aligns with spec constraint | WebSockets — unnecessary complexity for assignment-only notifications |
| CRM as one NestJS module with sub-modules (not 4 top-level modules) | Aligns with Constitution Principle I (one module per domain) | Separate top-level modules — violates domain boundary principle |

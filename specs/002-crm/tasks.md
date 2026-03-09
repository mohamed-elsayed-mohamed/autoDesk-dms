# Tasks: Customer Relationship Management (CRM)

**Input**: Design documents from `/specs/002-crm/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per Constitution III (test-first for business logic: round-robin, status transitions, duplicate detection, overdue calculation). Integration tests for all endpoints. E2E tests for critical user workflows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/prisma/`, `backend/test/`
- **Frontend**: `frontend/src/`, `frontend/cypress/`

---

## Phase 1: Setup (Schema & Infrastructure)

**Purpose**: Extend the database schema with CRM models, apply migration, and seed test data

- [x] T001 Add CRM enums (LeadSource, LeadStatus, ActivityType, ActivityDirection, TaskStatus, NotificationType, PreferredContact) and extend UserRole with SalesManager and BDCAgent in backend/prisma/schema.prisma
- [x] T002 Add all CRM models (Customer, Lead, LeadVehicle, LeadStatusHistory, Activity, Task, Notification, RoundRobinState) with relations and indexes per data-model.md in backend/prisma/schema.prisma
- [x] T003 Add LeadVehicle relation to existing Vehicle model in backend/prisma/schema.prisma
- [x] T004 Generate and apply Prisma migration including pg_trgm extension and trigram indexes for customer search in backend/prisma/migrations/
- [x] T005 Extend seed data with SalesManager, BDCAgent, SalesConsultant users and sample customers, leads, activities, and tasks in backend/prisma/seed.ts

---

## Phase 2: Foundational (Shared Code & Navigation)

**Purpose**: Create shared DTOs, frontend types, API clients, module scaffold, and navigation — MUST complete before any user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Create shared PaginationQueryDto and PaginatedResponseDto in backend/src/common/dto/pagination.dto.ts
- [x] T007 [P] Add CRM interfaces and enums (Customer, Lead, Activity, Task, Notification, LeadSource, LeadStatus, TaskType, etc.) to frontend/src/types/index.ts
- [x] T008 Create CrmModule scaffold importing sub-module placeholders in backend/src/modules/crm/crm.module.ts
- [x] T009 Register CrmModule in backend/src/app.module.ts
- [x] T010 [P] Create customers API client (CRUD, search, check-duplicates, archive, restore) in frontend/src/api/customers.ts
- [x] T011 [P] Create leads API client (CRUD, status, vehicles, reassign) in frontend/src/api/leads.ts
- [x] T012 [P] Create activities API client (create, customer timeline, lead activities) in frontend/src/api/activities.ts
- [x] T013 [P] Create tasks API client (CRUD, my-today, lead tasks) in frontend/src/api/tasks.ts
- [x] T014 [P] Create notifications API client (list, unread-count, mark-read, read-all) in frontend/src/api/notifications.ts
- [x] T015 [P] Create StatusBadge reusable component with semantic colors per Constitution XI in frontend/src/components/StatusBadge.tsx
- [x] T016 Add CRM navigation items (Customers, Leads, My Tasks, Dashboard for SalesManager) to sidebar with role-based visibility in frontend/src/components/Layout.tsx

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Customer Profiles (Priority: P1) MVP

**Goal**: Full customer CRUD with search, duplicate detection, profile view with linked leads. Delivers a searchable customer database as standalone value.

**Independent Test**: Create a customer, search by partial name, trigger duplicate warning on matching phone, view profile with contact info and leads list.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation (Constitution III)**

- [x] T017 [P] [US1] Unit test for duplicate detection matching logic (phone, email, excludeId) in backend/test/unit/customers.service.spec.ts
- [x] T018 [P] [US1] Integration test for customer CRUD, search, duplicate check, archive/restore, and optimistic concurrency endpoints in backend/test/integration/customers.e2e-spec.ts

### Backend Implementation for User Story 1

- [x] T019 [US1] Create customer DTOs (CreateCustomerDto, UpdateCustomerDto, CustomerSearchQueryDto, CheckDuplicatesQueryDto) with class-validator decorators in backend/src/modules/crm/customers/dto/
- [x] T020 [US1] Implement CustomersService with create, update (optimistic concurrency via updatedAt), search (ILIKE with pg_trgm), checkDuplicates, findOne (with leads include), archive, and restore in backend/src/modules/crm/customers/customers.service.ts
- [x] T021 [US1] Implement CustomersController with POST /api/customers, GET /api/customers, GET /api/customers/check-duplicates, GET /api/customers/:id, PATCH /api/customers/:id, PATCH /api/customers/:id/archive, PATCH /api/customers/:id/restore per customers-api contract in backend/src/modules/crm/customers/customers.controller.ts
- [x] T022 [US1] Create CustomersModule and register in CrmModule in backend/src/modules/crm/customers/customers.module.ts

### Frontend Implementation for User Story 1

- [x] T023 [P] [US1] Create CustomerSearchBar component with debounced input in frontend/src/modules/crm/customers/components/CustomerSearchBar.tsx
- [x] T024 [P] [US1] Create DuplicateWarning component displaying matched customers with link-to-existing action in frontend/src/modules/crm/customers/components/DuplicateWarning.tsx
- [x] T025 [US1] Create CustomerListPage with data table, search bar, pagination, and sort in frontend/src/modules/crm/customers/CustomerListPage.tsx
- [x] T026 [US1] Create CustomerFormPage with create/edit form, inline duplicate warning on phone/email blur, and optimistic concurrency handling in frontend/src/modules/crm/customers/CustomerFormPage.tsx
- [x] T027 [US1] Create CustomerDetailPage showing contact info, preferred contact, notes, linked leads list (with status badges), and empty timeline placeholder in frontend/src/modules/crm/customers/CustomerDetailPage.tsx
- [x] T028 [US1] Add customer routes (/customers, /customers/new, /customers/:id, /customers/:id/edit) with role guards in frontend/src/App.tsx

**Checkpoint**: Customer profiles fully functional — search, create with duplicate warning, edit with concurrency, view profile, archive/restore

---

## Phase 4: User Story 2 — Lead Capture & Pipeline (Priority: P2)

**Goal**: Lead CRUD with pipeline status management, round-robin assignment, vehicle linking, and filtered list. Delivers a functioning sales pipeline.

**Independent Test**: Create a lead with source and assignment, move through pipeline stages, link vehicle from inventory, filter lead list by status and source.

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation (Constitution III)**

- [x] T029 [P] [US2] Unit test for round-robin rotation logic (wrap-around, skip inactive, no salespeople error) in backend/test/unit/round-robin.service.spec.ts
- [x] T030 [P] [US2] Unit test for lead status transition validation (block Sold reopen, allow Lost reopen, record lostReason) in backend/test/unit/leads.service.spec.ts
- [x] T031 [P] [US2] Integration test for lead CRUD, pipeline transitions, round-robin assignment, vehicle linking, reassignment, and filtering endpoints in backend/test/integration/leads.e2e-spec.ts

### Backend Implementation for User Story 2

- [x] T032 [US2] Create lead DTOs (CreateLeadDto with inline customer option, UpdateLeadDto, UpdateLeadStatusDto, LeadFilterQueryDto, ReassignLeadDto, AddVehicleDto) in backend/src/modules/crm/leads/dto/
- [x] T033 [US2] Implement RoundRobinService with DB-backed state, transaction locking, wrap-around, and no-salespeople error in backend/src/modules/crm/leads/round-robin.service.ts
- [x] T034 [US2] Implement LeadsService with create (inline customer transaction), update, status transitions (Sold terminal, Lost reopenable, lostReason), vehicle link/unlink, reassign (SalesManager only), and filtered list in backend/src/modules/crm/leads/leads.service.ts
- [x] T035 [US2] Implement LeadsController with POST /api/leads, GET /api/leads, GET /api/leads/:id, PATCH /api/leads/:id, PATCH /api/leads/:id/status, POST /api/leads/:id/vehicles, DELETE /api/leads/:id/vehicles/:vehicleId, PATCH /api/leads/:id/reassign per leads-api contract in backend/src/modules/crm/leads/leads.controller.ts
- [x] T036 [US2] Create LeadsModule and register in CrmModule in backend/src/modules/crm/leads/leads.module.ts

### Frontend Implementation for User Story 2

- [x] T037 [P] [US2] Create VehicleInterestPicker component with multi-select search from inventory in frontend/src/modules/crm/leads/components/VehicleInterestPicker.tsx
- [x] T038 [P] [US2] Create LeadStatusStepper component showing pipeline position with clickable steps in frontend/src/modules/crm/leads/components/LeadStatusStepper.tsx
- [x] T039 [US2] Create LeadListPage with data table, status/assignee/source/date-range filters, and pagination in frontend/src/modules/crm/leads/LeadListPage.tsx
- [x] T040 [US2] Create LeadFormPage with customer picker (search existing or create new inline), source dropdown (Other with free-text), salesperson dropdown with auto-assign option, and vehicle multi-select in frontend/src/modules/crm/leads/LeadFormPage.tsx
- [x] T041 [US2] Create LeadDetailPage with status stepper, vehicle cards, reassign button (SalesManager only), and placeholder sections for activities and tasks in frontend/src/modules/crm/leads/LeadDetailPage.tsx
- [x] T042 [US2] Create PipelineBoard component with leads grouped by status for Sales Manager view in frontend/src/modules/crm/leads/components/PipelineBoard.tsx
- [x] T043 [US2] Add lead routes (/leads, /leads/new, /leads/:id) with role guards in frontend/src/App.tsx
- [x] T044 [US2] Verify FR-024 vehicle historical reference: ensure LeadVehicle FK uses onDelete: Restrict, and LeadDetailPage renders vehicle info as read-only even when vehicle inventory status changes to Sold in backend/prisma/schema.prisma and frontend/src/modules/crm/leads/LeadDetailPage.tsx

**Checkpoint**: Lead pipeline fully functional — create, assign (manual + round-robin), move through stages, link vehicles, filter, reassign

---

## Phase 5: User Story 3 — Activities & Timeline (Priority: P3)

**Goal**: Activity logging on leads and customers with a combined 360-degree customer timeline. Delivers full interaction history.

**Independent Test**: Log a call activity on a lead, log a note on a customer directly, view customer timeline showing activities from all leads in reverse-chronological order.

### Tests for User Story 3

- [x] T045 [P] [US3] Integration test for activity creation (on lead, on customer), timeline aggregation across leads, and pagination in backend/test/integration/activities.e2e-spec.ts

### Backend Implementation for User Story 3

- [x] T046 [US3] Create activity DTOs (CreateActivityDto with conditional direction validation, TimelineQueryDto) in backend/src/modules/crm/activities/dto/
- [x] T047 [US3] Implement ActivitiesService with create (auto-stamp performedBy/performedAt, validate lead belongs to customer), getCustomerTimeline (paginated, reverse-chronological, include lead labels), getLeadActivities in backend/src/modules/crm/activities/activities.service.ts
- [x] T048 [US3] Implement ActivitiesController with POST /api/activities, GET /api/customers/:id/timeline, GET /api/leads/:id/activities per activities-api contract in backend/src/modules/crm/activities/activities.controller.ts
- [x] T049 [US3] Create ActivitiesModule and register in CrmModule in backend/src/modules/crm/activities/activities.module.ts

### Frontend Implementation for User Story 3

- [x] T050 [P] [US3] Create ActivityTimelineItem component with type icon, direction badge, content preview, performer, timestamp, and lead label in frontend/src/modules/crm/activities/components/ActivityTimelineItem.tsx
- [x] T051 [US3] Create Timeline reusable component (paginated reverse-chronological list using ActivityTimelineItem) in frontend/src/components/Timeline.tsx
- [x] T052 [US3] Create ActivityLogDialog modal form with type dropdown, conditional direction dropdown, content textarea, accessible from lead and customer views in frontend/src/modules/crm/activities/ActivityLogDialog.tsx
- [x] T053 [US3] Wire Timeline component into CustomerDetailPage (replacing placeholder) and activity list into LeadDetailPage (replacing placeholder)

**Checkpoint**: Activity logging and 360-degree customer timeline fully functional

---

## Phase 6: User Story 4 — Follow-Up Tasks (Priority: P4)

**Goal**: Task CRUD, "My Tasks for Today" with overdue flagging, manager oversight. Delivers daily accountability for salespeople.

**Independent Test**: Create a task on a lead, view in My Tasks list, verify overdue task is flagged, mark complete, verify manager can see team tasks.

### Tests for User Story 4

> **Write these tests FIRST, ensure they FAIL before implementation (Constitution III)**

- [x] T054 [P] [US4] Unit test for overdue task calculation (Pending + dueAt < NOW = overdue) in backend/test/unit/tasks.service.spec.ts
- [x] T055 [P] [US4] Integration test for task CRUD, my-today query (today + overdue), status transitions, manager filter by assignee in backend/test/integration/tasks.e2e-spec.ts

### Backend Implementation for User Story 4

- [x] T056 [US4] Create task DTOs (CreateTaskDto, UpdateTaskStatusDto, ReassignTaskDto, TaskFilterQueryDto) with validation (dueAt in future, at least type or description; TaskType enum for type field) in backend/src/modules/crm/tasks/dto/
- [x] T057 [US4] Implement TasksService with create, update status (Complete/Cancel), reassign (SalesManager only — validates target is active SalesConsultant and task is Pending), myToday query (Pending + due today or overdue, sorted overdue-first), filtered list (manager view), and lead tasks in backend/src/modules/crm/tasks/tasks.service.ts
- [x] T058 [US4] Implement TasksController with POST /api/tasks, GET /api/tasks/my-today, GET /api/tasks, PATCH /api/tasks/:id, PATCH /api/tasks/:id/reassign, GET /api/leads/:id/tasks per tasks-api contract in backend/src/modules/crm/tasks/tasks.controller.ts
- [x] T059 [US4] Create TasksModule and register in CrmModule in backend/src/modules/crm/tasks/tasks.module.ts

### Frontend Implementation for User Story 4

- [x] T060 [P] [US4] Create TaskCard component with description, due date, overdue badge (red), linked lead info, and Complete/Cancel actions in frontend/src/modules/crm/tasks/components/TaskCard.tsx
- [x] T061 [US4] Create TaskFormDialog modal form with description, due date/time picker, type dropdown, accessible from lead detail in frontend/src/modules/crm/tasks/TaskFormDialog.tsx
- [x] T062 [US4] Create MyTasksPage showing today's and overdue tasks with overdue tasks visually flagged, counts summary, and quick Complete/Cancel actions in frontend/src/modules/crm/tasks/MyTasksPage.tsx
- [x] T063 [US4] Wire task list into LeadDetailPage (replacing placeholder) and add manager team view with salesperson filter
- [x] T064 [US4] Add task routes (/tasks for My Tasks, /tasks/team for manager view) with role guards in frontend/src/App.tsx

**Checkpoint**: Task management fully functional — create, My Tasks today view, overdue flagging, complete/cancel, manager oversight

---

## Phase 7: Notifications

**Purpose**: In-app notifications for lead assignment and reassignment (FR-009b), supporting US2 lead workflow

### Tests for Notifications

- [x] T065 [P] Integration test for notification creation on lead assignment/reassignment, unread count, and mark-read in backend/test/integration/notifications.e2e-spec.ts

### Backend Implementation

- [x] T066 Create notification DTOs (NotificationListQueryDto) in backend/src/modules/crm/notifications/dto/
- [x] T067 Implement NotificationsService with create (internal), list (current user, paginated), unreadCount, markRead, markAllRead in backend/src/modules/crm/notifications/notifications.service.ts
- [x] T068 Implement NotificationsController with GET /api/notifications, GET /api/notifications/unread-count, PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all per notifications-api contract in backend/src/modules/crm/notifications/notifications.controller.ts
- [x] T069 Create NotificationsModule and register in CrmModule in backend/src/modules/crm/notifications/notifications.module.ts
- [x] T070 Wire NotificationsService into LeadsService to create notifications on lead assignment and reassignment in backend/src/modules/crm/leads/leads.service.ts

### Frontend Implementation

- [x] T071 Create NotificationBell component with unread count badge and 30-second polling in frontend/src/components/NotificationBell.tsx
- [x] T072 Create notification dropdown/popover with notification list, click-to-navigate-to-lead, and mark-all-read button in frontend/src/components/NotificationBell.tsx
- [x] T073 Wire NotificationBell into Layout header bar in frontend/src/components/Layout.tsx

**Checkpoint**: Salespeople receive in-app notifications on lead assignment and reassignment

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Constitution XI compliance, UX quality, E2E tests, and final quality pass

### UI Polish

- [x] T074 [P] Add skeleton loading screens to CustomerListPage, LeadListPage, CustomerDetailPage, LeadDetailPage, MyTasksPage, ManagerDashboardPage, and Timeline
- [x] T075 [P] Add empty states with illustrative icon, descriptive heading, and CTA to all list views (no customers, no leads, no activities, no tasks today)
- [x] T076 [P] Add error boundaries with friendly retry message to all CRM page components
- [x] T077 [P] Add confirmation dialogs for archive customer, cancel task, and move lead to Lost
- [x] T078 [P] Add inline form validation (on blur with clear error messages) to CustomerFormPage, LeadFormPage, TaskFormDialog, and ActivityLogDialog
- [x] T079 Verify responsive layout on tablet (768px+) for all CRM data tables, forms, and detail pages using MUI breakpoints

### Manager Dashboard (SC-010)

- [x] T080 [US2] Create backend dashboard stats endpoint GET /api/dashboard/manager returning pipeline counts by status, lead count and task count per assignee, and overdue task count per salesperson (SalesManager role only) in backend/src/modules/crm/dashboard/dashboard.controller.ts and dashboard.service.ts
- [x] T081 [US2] Create ManagerDashboardPage with pipeline summary cards, assignee workload table, and task compliance breakdown in frontend/src/modules/crm/dashboard/ManagerDashboardPage.tsx
- [x] T082 [US2] Add dashboard route (/dashboard) with SalesManager role guard in frontend/src/App.tsx

### E2E Tests

- [x] T083 [P] E2E test: create customer with duplicate warning flow in frontend/cypress/e2e/customer-flow.cy.ts
- [x] T084 [P] E2E test: create lead, assign to salesperson, move through pipeline to Sold in frontend/cypress/e2e/lead-pipeline.cy.ts
- [x] T085 [P] E2E test: log activity from lead, verify it appears on customer timeline in frontend/cypress/e2e/activity-timeline.cy.ts
- [x] T086 [P] E2E test: create task, verify overdue flagging, complete task in frontend/cypress/e2e/task-management.cy.ts
- [x] T087 [P] E2E test: manager reassigns lead, verify salesperson receives notification (login as SalesManager, reassign lead, login as SalesConsultant, verify notification badge and lead reference) in frontend/cypress/e2e/lead-reassign-notification.cy.ts

### Quality Gate

- [x] T088 Run npm run lint and tsc --noEmit across backend and frontend with zero errors
- [x] T089 Run all unit tests, integration tests, and E2E tests — all passing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema must exist for types/API clients)
- **User Stories (Phase 3–6)**: All depend on Phase 2 completion
  - US1 (Phase 3): Can start after Phase 2 — no dependencies on other stories
  - US2 (Phase 4): Can start after Phase 2 — references customers (US1 should be done first for full integration but US2 backend is independently testable)
  - US3 (Phase 5): Depends on US1 (customer timeline) and US2 (lead activities)
  - US4 (Phase 6): Depends on US2 (tasks link to leads)
- **Notifications (Phase 7)**: Depends on US2 (Phase 4) — notifications are triggered by lead assignment
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational)
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
      Phase 3 (US1)     Phase 4 (US2)
       Customers     Leads & Pipeline
              ↓                 ↓
              └────────┬────────┘
                       ↓
              Phase 5 (US3)
           Activities & Timeline
                       ↓
              Phase 6 (US4)
             Follow-Up Tasks
                       ↓
              Phase 7 (Notifications)
                       ↓
              Phase 8 (Polish)
```

### Within Each User Story

1. Tests written FIRST, verify they FAIL (Constitution III)
2. DTOs before services
3. Services before controllers
4. Module registration after controller
5. Frontend components (parallel where possible) after backend complete
6. Routes added last

### Parallel Opportunities

- Phase 2: T006–T015 all marked [P] — different files, no dependencies
- US1: T017+T018 tests in parallel; T023+T024 frontend components in parallel
- US2: T029+T030+T031 tests in parallel; T037+T038 frontend components in parallel
- US3: T050 component in parallel with backend work
- US4: T054+T055 tests in parallel; T060 component in parallel with backend work
- Phase 8: All polish tasks (T074–T078) in parallel; all E2E tests (T083–T087) in parallel

---

## Parallel Example: User Story 2 (Lead Pipeline)

```text
# Step 1 — Launch all tests in parallel:
T029: Unit test for round-robin in backend/test/unit/round-robin.service.spec.ts
T030: Unit test for status transitions in backend/test/unit/leads.service.spec.ts
T031: Integration test for lead endpoints in backend/test/integration/leads.e2e-spec.ts

# Step 2 — Sequential backend (same service file dependencies):
T032: Lead DTOs
T033: RoundRobinService
T034: LeadsService (depends on T033)
T035: LeadsController (depends on T034)
T036: LeadsModule

# Step 3 — Launch frontend components in parallel:
T037: VehicleInterestPicker component
T038: LeadStatusStepper component

# Step 4 — Sequential frontend pages:
T039: LeadListPage
T040: LeadFormPage (uses T037)
T041: LeadDetailPage (uses T038)
T042: PipelineBoard
T043: Lead routes
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T016)
3. Complete Phase 3: User Story 1 — Customer Profiles (T017–T028)
4. **STOP and VALIDATE**: Search customers, create with duplicate warning, view profile
5. Deploy/demo if ready — standalone customer database delivers value

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. **US1** (Customer Profiles) → Test independently → **Deploy MVP**
3. **US2** (Lead Pipeline) → Test independently → Deploy (sales pipeline live)
4. **US3** (Activities & Timeline) → Test independently → Deploy (360° view live)
5. **US4** (Follow-Up Tasks) → Test independently → Deploy (daily accountability live)
6. **Notifications** → Deploy (real-time awareness live)
7. **Manager Dashboard** → Deploy (SC-010: single-screen team oversight)
8. **Polish** → Final quality pass → Production release

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- **Developer A**: US1 (Customer Profiles) → then US3 (Activities, since it touches customer detail)
- **Developer B**: US2 (Lead Pipeline) → then US4 (Tasks, since they link to leads) → then Notifications
- Both: Phase 8 (Polish) together

---

## Notes

- [P] tasks = different files, no dependencies on incomplete parallel tasks
- [US] label maps task to specific user story for traceability
- Each user story should be independently completable and testable after its phase
- Tests must FAIL before implementation begins (Constitution III)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- API-first: build and test all backend endpoints before starting frontend for each story (Constitution VII)
- Total tasks: **89**

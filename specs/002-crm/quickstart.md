# Quickstart: 002-crm

**Feature**: Customer Relationship Management (CRM)
**Branch**: `002-crm`

## Prerequisites

- 001-vehicle-inventory feature must be implemented and working
- Docker and Docker Compose installed
- Node.js 20 LTS installed
- PostgreSQL running (via Docker Compose)

## Setup

### 1. Switch to the feature branch

```bash
git checkout 002-crm
```

### 2. Start infrastructure

```bash
docker-compose up -d postgres
```

### 3. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Apply database migration

After adding the CRM models to `backend/prisma/schema.prisma`:

```bash
cd backend
npx prisma migrate dev --name add-crm-models
```

This creates the new tables: Customer, Lead, LeadVehicle, LeadStatusHistory, Activity, Task, Notification, RoundRobinState.

### 5. Enable pg_trgm extension

The migration should include this raw SQL (add manually if not auto-generated):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

The trigram indexes for customer search are added in the same migration.

### 6. Seed the database

```bash
npx prisma db seed
```

Seed data includes: SalesManager, BDCAgent, and SalesConsultant users; sample customers; leads at various pipeline stages; activities; and tasks.

### 7. Start the backend

```bash
cd backend
npm run start:dev
```

Backend runs at `http://localhost:3000`.

### 8. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/customers` | Create customer |
| `GET /api/customers?search=<term>` | Search customers |
| `GET /api/customers/:id` | Customer profile |
| `GET /api/customers/check-duplicates?phone=<phone>` | Duplicate check |
| `POST /api/leads` | Create lead (with optional inline customer) |
| `GET /api/leads?status=New&source=Website` | Filter leads |
| `PATCH /api/leads/:id/status` | Move lead through pipeline |
| `PATCH /api/leads/:id/reassign` | Reassign lead (Manager) |
| `POST /api/activities` | Log an activity |
| `GET /api/customers/:id/timeline` | Customer activity timeline |
| `POST /api/tasks` | Create follow-up task |
| `GET /api/tasks/my-today` | My tasks for today |
| `GET /api/notifications/unread-count` | Notification badge count |

## Test Users (from seed)

| Email | Role | Password |
|-------|------|----------|
| `manager@autodesk-dms.com` | SalesManager | `password123` |
| `bdc@autodesk-dms.com` | BDCAgent | `password123` |
| `sales1@autodesk-dms.com` | SalesConsultant | `password123` |
| `sales2@autodesk-dms.com` | SalesConsultant | `password123` |

## Running Tests

```bash
# Unit tests
cd backend && npm test

# Integration tests
cd backend && npm run test:e2e

# E2E tests (frontend)
cd frontend && npm run cy:run
```

## Implementation Order

Follow the plan phases in order — each builds on the previous:

1. **Phase 1**: Schema & shared infrastructure (Prisma models, enums, types)
2. **Phase 2**: Customer profiles (P1) — API first, then UI
3. **Phase 3**: Lead capture & pipeline (P2) — API first, then UI
4. **Phase 4**: Activities & timeline (P3) — API first, then UI
5. **Phase 5**: Follow-up tasks (P4) — API first, then UI
6. **Phase 6**: Notifications — API first, then UI
7. **Phase 7**: UI polish (skeleton loading, empty states, badges)
8. **Phase 8**: Testing & quality (E2E tests, lint pass)

## Key Design Decisions

See `research.md` for full rationale on:
- **Round-robin**: DB-backed state (survives restarts)
- **Notifications**: DB + polling every 30s (no WebSockets for v1)
- **Customer search**: pg_trgm GIN indexes for sub-second partial matching
- **Soft-delete**: `archivedAt` field with manual filtering (no Prisma middleware)
- **Concurrency**: Optimistic locking via `updatedAt` on customer edits
- **Status transitions**: Service-layer validation; Sold is terminal, Lost is reopenable

# Quickstart: 001 Vehicle Inventory

**Feature**: 001-vehicle-inventory  
**Date**: 2026-03-08

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- That's it. No local Node.js, PostgreSQL, or AWS account required.

---

## Option A: Run Everything with Docker Compose (Recommended)

This is the standard local development setup. One command starts PostgreSQL, the NestJS backend, and the React frontend.

```bash
# From the repo root
docker compose up
```

On first run, Docker will:
1. Pull the PostgreSQL 16 image.
2. Build the backend and frontend images.
3. Run `prisma migrate dev` and `prisma db seed` (seeds 3 test users, one per role).
4. Start all services with hot reload.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 (internal to Docker network; exposed for DB tools) |

**Stop**: `Ctrl+C` or `docker compose down`.  
**Reset database** (wipe data and re-seed): `docker compose down -v && docker compose up`.

---

## Test Users (seeded automatically)

| Role | Email | Password |
|------|-------|----------|
| Inventory Manager | `inventory@dms.local` | `password123` |
| Sales Consultant | `sales@dms.local` | `password123` |
| General Manager | `gm@dms.local` | `password123` |

---

## Option B: Run Without Docker (Manual)

If you prefer to run services manually:

### Prerequisites (manual)

- Node.js 20 LTS
- pnpm (`npm install -g pnpm`)
- PostgreSQL 14+ running locally

### Environment Variables

**Backend** (`backend/.env`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autodesk_dms"
JWT_SECRET="local-dev-secret-at-least-32-characters-long"
JWT_EXPIRES_IN="1h"
UPLOAD_DIR="./uploads"
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3000
```

### Database

```bash
createdb autodesk_dms
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### Backend

```bash
cd backend
pnpm install
pnpm run start:dev
```

### Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

---

## Running Tests

**Backend unit tests**:
```bash
docker compose exec backend pnpm run test
# or (manual): cd backend && pnpm run test
```

**Backend integration tests** (requires running DB):
```bash
docker compose exec backend pnpm run test:integration
# or (manual): cd backend && pnpm run test:integration
```

**E2E tests** (Cypress; backend and frontend must be running):
```bash
cd frontend && pnpm run cy:open   # interactive
cd frontend && pnpm run cy:run    # headless
```

---

## Photo Uploads

Photos are stored on local disk at `backend/uploads/vehicles/{vehicleId}/`. The backend serves them as static files at `/uploads/...`.

With Docker Compose, the uploads directory is a named Docker volume (`uploads_data`) so photos persist across container restarts. The volume is mounted at `/app/uploads` inside the container.

No AWS account, S3 bucket, or credentials are needed.

---

## VIN Decode (NHTSA)

No API key. The backend calls:

```
GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json
```

If the NHTSA service is unavailable, the add-vehicle form falls back to manual entry (no VIN fields are pre-filled; you can type them manually and save).

---

## First-Time Verification

1. Open http://localhost:5173 and log in as **Inventory Manager** (`inventory@dms.local` / `password123`).
2. Add a vehicle: enter VIN `1HGBH41JXMN109186`, click "Decode VIN", confirm fields are pre-filled, set condition (e.g. Used), status (Frontline Ready), internet price (e.g. 24000), and `dateAcquired` (default today is fine). Save. Verify stock number is assigned (e.g. 1001).
3. Upload one photo. Verify the photo appears and is set as primary.
4. Log out and sign in as **Sales Consultant** (`sales@dms.local` / `password123`). Open the vehicle list, apply a filter (e.g. make = Honda), verify only active vehicles appear. Open the vehicle detail and confirm all fields and photo are visible.
5. Log out and sign in as **General Manager** (`gm@dms.local` / `password123`). Open the dashboard. Verify total count, total inventory value, average days in stock, and the over-60-days aging list.
6. Back as **Inventory Manager**: soft-delete the vehicle. Confirm it disappears from the default list. Open the "Archived" view and confirm it appears there. Restore it and verify it is back in the active list.

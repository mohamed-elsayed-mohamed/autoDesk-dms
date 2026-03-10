# Quickstart: Finance & Insurance (F&I) Module

**Feature**: `004-finance-insurance` | **Date**: 2026-03-10

## Prerequisites

- Docker and Docker Compose running (shared from 001/002/003 setup)
- Node.js 20 LTS installed
- PostgreSQL running via `docker-compose up -d` from repo root
- Backend dependencies installed: `cd backend && npm install`
- Frontend dependencies installed: `cd frontend && npm install`

## Environment Variables

Add to `backend/.env`:

```env
# Existing from 001/002/003 — no change needed
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autodesks_dms"
JWT_SECRET="your-jwt-secret"

# New for 004-finance-insurance
SSN_ENCRYPTION_KEY="your-32-byte-hex-key-here-64-chars"
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Run Migrations

```bash
cd backend
npx prisma migrate dev --name fi-module-initial
npx prisma generate
```

## Seed Test Data

```bash
cd backend
npx ts-node prisma/seed-fi.ts
```

This seed script creates:
- 5 lenders (Ally Financial, Chase Auto, Capital One, TD Auto Finance, Westlake Financial)
- 3 with `maxMarkupCap` set (Ally: 2.00%, Chase: 1.75%, Westlake: 2.50%)
- 8 product catalog items (2x VSC, 2x GAP, 1x T&W, 1x Paint, 1x Maintenance)
- 3 disclosure requirements for jurisdiction "US-DEFAULT"

## Run Unit Tests

```bash
cd backend
npx jest tests/unit/fi --verbose
```

Expected: all `FiCalculationService`, `LenderSimulatorService`, and `SsnEncryptionService` tests pass.

## Run Integration Tests

```bash
cd backend
npx jest tests/integration/fi --verbose --runInBand
```

Note: `--runInBand` ensures tests run sequentially to avoid DB isolation issues.

## Start Dev Servers

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

## Verify Module Registration

Confirm `FiModule` is imported in `backend/src/app.module.ts` alongside `DealsModule`, `CrmModule`, and `InventoryModule`.

## Quick API Smoke Test

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fi@example.com","password":"password"}' | jq -r '.access_token')

# 2. List lenders
curl -s http://localhost:3000/api/fi/lenders \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].name'

# 3. List product catalog
curl -s http://localhost:3000/api/fi/product-catalog \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].productType'
```

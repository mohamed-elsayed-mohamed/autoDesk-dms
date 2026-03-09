# AutoDesk DMS — Dealer Management System

A full-stack dealership management platform covering vehicle inventory, CRM, and the complete vehicle sales deal pipeline.

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git
- That's it — no local Node.js, PostgreSQL, or cloud accounts needed

### 1. Clone the repository

```bash
git clone <your-repo-url> autoDesk-dms
cd autoDesk-dms
```

### 2. Start everything

```bash
docker compose up --build
```

On first run Docker will:
1. Pull PostgreSQL 16 and build the backend (NestJS) and frontend (React + Vite)
2. Apply all database migrations automatically
3. Seed the database with **4–5 months of realistic demo data** (vehicles, customers, leads, deals, activities)
4. Start all three services with hot-reload enabled

Wait about 60–90 seconds for the first build. You'll know it's ready when you see:

```
autodesk-dms-backend  | [NestJS] Application is listening on port 3000
```

### 3. Open the app

| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3000 |
| **PostgreSQL** | localhost:5432 |

---

## Login Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| Sales Consultant | `sales1@autodesk-dms.com` | `password123` | Create & desk deals, add fees/trade-ins |
| Sales Consultant | `sales2@autodesk-dms.com` | `password123` | Second consultant for multi-user demos |
| Sales Manager | `manager@autodesk-dms.com` | `password123` | Approve deals, view all, sales report |
| F&I Manager | `fni@autodesk-dms.com` | `password123` | Process F&I, generate documents |
| General Manager | `gm@dms.local` | `password123` | Full access, config, sales report |
| Inventory Manager | `inventory@dms.local` | `password123` | Vehicle inventory management |
| BDC Agent | `bdc@autodesk-dms.com` | `password123` | Leads and customer management |

---

## What's in the Demo Data

The seed creates a realistic snapshot as if the dealership has been live since October 2025:

| Entity | Count | Notes |
|---|---|---|
| Users | 8 | All roles covered |
| Vehicles | 20 | 8 Sold, 8 Frontline Ready, 2 In Recon, 2 In Transit |
| Customers | 15 | Chicago-area with full contact details |
| Leads | 14 | 6 Sold, 2 Lost, 6 active across all stages |
| Activities | 27 | Calls, emails, texts, visits, notes |
| Tasks | 16 | Mix of completed (historical) and pending |
| Deals | 13 | #1001–#1013, Oct 2025 → Mar 2026 |

**Deal pipeline snapshot (as of demo):**

| Deal # | Status | Customer | Vehicle | Amount |
|---|---|---|---|---|
| #1001 | ✅ Funded | James Kowalski | 2024 Toyota Camry XSE V6 | $32,500 |
| #1002 | ✅ Funded | Patricia Nguyen | 2022 Honda CR-V EX-L | $30,500 |
| #1003 | ✅ Funded | Marcus Williams | 2023 Ford F-150 XLT | $44,800 |
| #1004 | ✅ Funded | Sandra Liu | 2022 Chevrolet Malibu LT CPO | $25,500 |
| #1005 | ✅ Funded | David Park | 2021 BMW 330i CPO | $48,900 |
| #1006 | ✅ Funded | Angela Brooks | 2023 Toyota RAV4 LE | $36,900 |
| #1007 | ❌ Unwound | Robert Kim | 2022 Hyundai Sonata SE | — |
| #1008 | ✅ Funded | Michelle Tran | 2021 Honda Accord Sport | $33,800 |
| #1009 | 🚗 Delivered | Carlos Rivera | 2024 Toyota Camry SE | $27,195 |
| #1010 | 📝 Contracts Signed | Olivia Bennett | 2024 Honda CR-V Sport Hybrid | $28,895 |
| #1011 | 💼 F&I | Jonathan Hayes | 2023 BMW 530i CPO | $58,500 |
| #1012 | 🔄 Desking | Rachel Simmons | 2023 Toyota RAV4 CPO | $31,200 |
| #1013 | 🆕 Pending | Daniel Okonkwo | 2024 Ford F-150 Lariat | $37,195 |

---

## Module Overview

### Inventory Management
Manage the vehicle lot: add vehicles (VIN lookup via NHTSA), track status (In Transit → In Recon → Frontline Ready → Sold), manage pricing, upload photos, and monitor aging metrics on the dashboard.

### CRM
Track leads from first contact to sold. Log calls, emails, texts, and visits. Assign tasks. Manage customer profiles with full activity history and linked deals.

### Deal Management (Sales Pipeline)
The full vehicle sales workflow:

```
Pending → Desking → F&I → Contracts Signed → Delivered → Funded
                ↘ Unwound (at any stage with mandatory note)
```

- **Sales Consultant** creates deals and enters desking numbers (sale price, APR, term, fees, trade-in)
- **Sales Manager** reviews the approval queue and approves or sends back with notes
- **F&I Manager** processes paperwork, generates PDF documents (Buyer's Order, Bill of Sale)
- **Sales Report** aggregates funded deals by date range with per-salesperson breakdown and CSV export

---

## Common Commands

### Reset database and reseed

```bash
docker compose down -v
docker compose up --build
```

### Run only the seed (without restarting)

```bash
docker exec autodesk-dms-backend npx prisma db seed
```

### Apply new migrations

```bash
docker exec autodesk-dms-backend npx prisma migrate deploy
```

### Open a database shell

```bash
docker exec -it autodesk-dms-postgres psql -U postgres -d autodesk_dms
```

### View backend logs

```bash
docker compose logs -f backend
```

### Run backend tests

```bash
docker exec autodesk-dms-backend npm test
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Material UI v5, Vite |
| Backend | NestJS 10, TypeScript (strict), Prisma 5 |
| Database | PostgreSQL 15/16 |
| Auth | JWT + Role-Based Access Control |
| PDF Generation | Puppeteer (HTML → PDF) |
| File Storage | AWS S3 (document storage) |
| CSV Export | fast-csv + NestJS StreamableFile |
| Testing | Jest (unit + integration), Cypress (E2E) |
| Dev Environment | Docker Compose (single command) |

---

## Project Structure

```
├── docker-compose.yml
├── DEMO_WALKTHROUGH.md          # Step-by-step demo guide
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma        # All models and enums
│   │   ├── migrations/          # SQL migration history
│   │   └── seed.ts              # Demo data (idempotent, runs on every start)
│   └── src/
│       ├── common/              # Guards, decorators, Prisma service
│       └── modules/
│           ├── auth/            # Login, JWT strategy
│           ├── inventory/       # Vehicles, photos, VIN decode, dashboard
│           ├── crm/             # Customers, leads, tasks, activities
│           ├── deals/           # Full deal pipeline + documents + reports
│           └── config/          # Dealership configuration
└── frontend/
    ├── cypress/                 # E2E tests
    └── src/
        └── modules/
            ├── auth/            # Login page, auth context
            ├── inventory/       # Vehicle list, detail, form pages
            ├── crm/             # Customer, lead, task pages
            └── deals/           # Deal list, desking, jacket, approval, reports
```

---

## Troubleshooting

**Backend won't start / TypeScript errors**
```bash
docker compose logs backend
```
Most common cause: Prisma client not generated. Fix:
```bash
docker exec autodesk-dms-backend npx prisma generate
docker compose restart backend
```

**Login returns 500**
The migration hasn't been applied to the database. Run:
```bash
docker exec autodesk-dms-backend npx prisma migrate deploy
docker exec autodesk-dms-backend npx prisma db seed
```

**Port already in use**
```bash
# Change ports in docker-compose.yml, or stop the conflicting process:
lsof -i :5173   # or :3000 / :5432
```

**Full reset (wipes all data)**
```bash
docker compose down -v && docker compose up --build
```

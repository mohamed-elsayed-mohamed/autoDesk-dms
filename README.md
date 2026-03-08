# AutoDesk DMS - Dealer Management System

A modern Dealer Management System for automotive dealerships, starting with the Vehicle Inventory module.

## Features

### Vehicle Inventory (001)
- **Add & Manage Vehicles**: VIN decode via NHTSA, auto-generated stock numbers, status tracking, pricing management, photo uploads with drag-and-drop reorder
- **Search & Filter**: Keyword search across make/model/trim/VIN, multi-criteria filters, sortable columns, paginated results
- **Aging Dashboard**: Total inventory value, average days in stock, vehicles aging 60+ days
- **Role-Based Access**: Inventory Manager (full CRUD), Sales Consultant (search/view), General Manager (dashboard/view)
- **Audit History**: Track all status and price changes with actor identity

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- That's it. No local Node.js, PostgreSQL, or AWS account required.

### Run

```bash
docker compose up
```

On first run, Docker will:
1. Pull PostgreSQL 16
2. Build backend (NestJS) and frontend (React/Vite)
3. Run database migrations and seed 3 test users
4. Start all services with hot reload

| Service    | URL                    |
|------------|------------------------|
| Frontend   | http://localhost:5173  |
| Backend API| http://localhost:3000  |
| PostgreSQL | localhost:5432         |

### Test Users

| Role              | Email                  | Password      |
|-------------------|------------------------|---------------|
| Inventory Manager | inventory@dms.local    | password123   |
| Sales Consultant  | sales@dms.local        | password123   |
| General Manager   | gm@dms.local           | password123   |

### Reset Database

```bash
docker compose down -v && docker compose up
```

## Tech Stack

- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **Frontend**: React 18 + TypeScript + Material UI + Vite
- **Auth**: JWT with role-based access control
- **Storage**: Local disk (Docker volume for photos)
- **Testing**: Jest (unit/integration), Cypress (E2E)

## Project Structure

```
├── docker-compose.yml          # Single command: docker compose up
├── backend/
│   ├── src/
│   │   ├── common/             # Guards, pipes, filters, decorators, storage
│   │   └── modules/
│   │       ├── auth/           # Login, JWT, roles
│   │       └── inventory/      # Vehicles, photos, dashboard, VIN decode
│   └── prisma/                 # Schema, migrations, seed
├── frontend/
│   ├── src/
│   │   ├── api/                # API client
│   │   ├── components/         # Shared components
│   │   └── modules/
│   │       ├── auth/           # Login, auth context
│   │       └── inventory/      # All inventory pages
│   └── cypress/                # E2E tests
└── specs/                      # Feature specifications
```

## Documentation

- [Quickstart Guide](specs/001-vehicle-inventory/quickstart.md)
- [Feature Specification](specs/001-vehicle-inventory/spec.md)
- [API Contract](specs/001-vehicle-inventory/contracts/api-spec.md)
- [Data Model](specs/001-vehicle-inventory/data-model.md)
- [Implementation Plan](specs/001-vehicle-inventory/plan.md)

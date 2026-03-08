# Data Model: 001 Vehicle Inventory

**Feature**: 001-vehicle-inventory  
**Date**: 2026-03-08

## Entity Relationship Overview

- **User** — staff who sign in; have a single **role** (InventoryManager, SalesConsultant, GeneralManager).
- **Vehicle** — one per physical unit; has many **VehiclePhoto**; has many **VehicleHistory** entries. Soft-deleted via `deletedAt`.
- **VehiclePhoto** — belongs to one Vehicle; `url` (backend-relative path to local disk file), `sortOrder` (drag-and-drop reorderable), `isPrimary` (exactly one true per vehicle); max 20 per vehicle.
- **VehicleHistory** — audit log for a Vehicle; records status or price changes; links to User (who made the change).

## Entities

### User

| Field | Type | Constraints | Notes |
|-------|------|-------------|--------|
| id | UUID | PK | |
| email | string | unique, not null | login identifier |
| passwordHash | string | not null | hashed (e.g. bcrypt) |
| firstName | string | not null | |
| lastName | string | not null | |
| role | enum | not null | InventoryManager, SalesConsultant, GeneralManager |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

**Validation**: Email format; role in allowed set. No duplicate email.

---

### Vehicle

| Field | Type | Constraints | Notes |
|-------|------|-------------|--------|
| id | UUID | PK | |
| vin | string(17) | unique, not null | 17-char VIN |
| stockNumber | int | unique, not null | system-assigned at creation |
| year | int | not null | |
| make | string | not null | |
| model | string | not null | |
| trim | string? | | |
| bodyStyle | string? | | e.g. Sedan, SUV |
| exteriorColor | string? | | |
| interiorColor | string? | | |
| mileage | int | not null, default 0 | |
| condition | enum | not null | New, Used, CPO |
| status | enum | not null | InTransit, InRecon, FrontlineReady, Sold, Wholesaled |
| msrp | Decimal? | | |
| invoicePrice | Decimal? | | |
| internetPrice | Decimal? | required when status = FrontlineReady | |
| salePrice | Decimal? | | set when status = Sold |
| lotLocation | string? | | |
| dateAcquired | DateTime | not null | user-set; defaults to today; may be a past date |
| dateSold | DateTime? | | set when status = Sold |
| deletedAt | DateTime? | | soft-delete; null = active |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

**Validation**: VIN length 17; condition and status in allowed enums; stock number not user-editable; `internetPrice` required when `status = FrontlineReady`, optional for InTransit/InRecon; at most one of internetPrice/salePrice used for “current price” display (internet for unsold, sale for sold). **Uniqueness**: vin (across non-deleted; if duplicate matches a soft-deleted vehicle, surface restore link), stockNumber globally (starting at 1001, increment by 1, assigned in transaction).

**State**: Only one status and one condition per vehicle. Status transitions: any → Sold/Wholesaled; InTransit → InRecon → FrontlineReady; etc. (no strict FSM in 001; any valid status update allowed with history logged).

---

### VehiclePhoto

| Field | Type | Constraints | Notes |
|-------|------|-------------|--------|
| id | UUID | PK | |
| vehicleId | UUID | FK Vehicle, not null | |
| url | string | not null | backend-relative path (e.g. /uploads/vehicles/{id}/file.jpg) |
| sortOrder | int | not null, default 0 | display order |
| isPrimary | bool | not null, default false | exactly one true per vehicle |
| createdAt | DateTime | not null | |

**Validation**: Max 20 photos per vehicle (enforce in service). Exactly one `isPrimary = true` per vehicle (enforce in service). On set primary, clear previous primary.

---

### VehicleHistory

| Field | Type | Constraints | Notes |
|-------|------|-------------|--------|
| id | UUID | PK | |
| vehicleId | UUID | FK Vehicle, not null | |
| changeType | string | not null | e.g. status_change, price_change |
| fieldName | string? | | e.g. status, internetPrice |
| oldValue | string? | | serialized if needed |
| newValue | string? | | serialized if needed |
| userId | UUID | FK User, not null | who made the change |
| createdAt | DateTime | not null | |

**Usage**: Log every status change and every price change (msrp, invoicePrice, internetPrice, salePrice) with old/new and userId. Immutable; no updates.

---

## Indexes (recommended)

- **Vehicle**: `(deletedAt, status)`, `(make, model)`, `(year)`, `(vin)` (unique), `(stockNumber)` (unique). Consider composite for list filter: e.g. `(deletedAt, status, make, year)` if filter patterns warrant.
- **VehiclePhoto**: `(vehicleId)`.
- **VehicleHistory**: `(vehicleId)`, `(vehicleId, createdAt)` for history by vehicle.
- **User**: `(email)` unique.

---

## Cross-Cutting Rules

- **Active vehicles**: `deletedAt IS NULL` and `status NOT IN ('Sold','Wholesaled')` for list and dashboard count/value.
- **Days in stock**: computed as `dateAcquired` to `dateSold` or today; store dateAcquired/dateSold only (no stored “days” field).
- **Inventory value (dashboard)**: sum of `internetPrice` for active unsold vehicles; for sold in period could use `salePrice` (spec: “internet price for unsold and sale price for sold” — for dashboard total value, use only active vehicles and internetPrice per spec assumption).

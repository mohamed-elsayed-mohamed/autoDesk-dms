# Data Model: 003 Sales Deal Management

**Branch**: `003-sales-deal-management` | **Phase**: 1 | **Date**: 2026-03-09

---

## Entity Overview

```
Customer (002-crm) ──┐
                     ├── Deal ──── DealFee (many)
Vehicle (001-inv) ───┘       ├─── TradeIn (0..1)
                             ├─── DealStatusHistory (many, insert-only)
User (001-inv) ──────────────┤    (createdBy, actor refs)
                             └─── GeneratedDocument (many, no-delete)

DealershipConfig (singleton)
```

---

## Prisma Schema Additions

> **Extend** the existing schema from 001-vehicle-inventory and 002-crm.
> Do **not** modify `User`, `Vehicle`, or `Customer` models.

```prisma
// ─── Enums ─────────────────────────────────────────────────────────────────

enum DealType {
  CASH
  FINANCE
  LEASE
}

enum DealStatus {
  PENDING
  DESKING
  FNI             // Finance & Insurance
  CONTRACTS_SIGNED
  DELIVERED
  FUNDED
  UNWOUND
}

enum TradeInCondition {
  EXCELLENT
  GOOD
  FAIR
  POOR
}

enum DocumentType {
  BUYERS_ORDER
  BILL_OF_SALE
}

// ─── DealershipConfig ───────────────────────────────────────────────────────
// Singleton table (always exactly one row). Stores dealership-level settings.

model DealershipConfig {
  id                Int      @id @default(1)
  dealNumberOffset  Int      @default(1001)   // Starting value for deal number sequence
  updatedAt         DateTime @updatedAt

  @@map("dealership_config")
}

// ─── Deal ───────────────────────────────────────────────────────────────────
// Central deal record. NO soft-delete (regulatory retention: 7 years minimum).
// deletedAt is intentionally absent. No delete endpoint is exposed.

model Deal {
  id              String     @id @default(cuid())
  dealNumber      Int        @unique                // From PostgreSQL sequence; human-readable
  dealType        DealType
  status          DealStatus @default(PENDING)

  // Linked entities (read-only references; not owned by this module)
  customerId      String
  customer        Customer   @relation(fields: [customerId], references: [id])
  vehicleId       String
  vehicle         Vehicle    @relation(fields: [vehicleId], references: [id])

  // Desking — all monetary values use Decimal (never Float)
  salePrice       Decimal    @default(0) @db.Decimal(12, 2)
  downPayment     Decimal    @default(0) @db.Decimal(12, 2)
  rebates         Decimal    @default(0) @db.Decimal(12, 2)
  apr             Decimal    @default(0) @db.Decimal(6, 4)   // e.g. 0.0690 for 6.9%
  term            Int        @default(0)                      // months
  taxRate         Decimal    @default(0) @db.Decimal(6, 4)   // e.g. 0.0800 for 8%

  // Computed & derived (recalculated server-side on every mutating request)
  totalTax        Decimal    @default(0) @db.Decimal(12, 2)
  amountFinanced  Decimal    @default(0) @db.Decimal(12, 2)
  monthlyPayment  Decimal    @default(0) @db.Decimal(12, 2)
  frontEndGross   Decimal    @default(0) @db.Decimal(12, 2)  // salePrice - vehicle.cost

  // Back-end gross is manually entered (F&I product profit for reporting)
  backEndGross    Decimal?   @db.Decimal(12, 2)

  // Ownership and timing
  createdById     String
  createdBy       User       @relation("DealCreatedBy", fields: [createdById], references: [id])
  fundedAt        DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt             // Used for optimistic concurrency control

  // Relations
  fees            DealFee[]
  tradeIn         TradeIn?
  statusHistory   DealStatusHistory[]
  documents       GeneratedDocument[]

  @@index([status])
  @@index([createdById])
  @@index([vehicleId])
  @@index([fundedAt])
  @@map("deals")
}

// ─── DealFee ────────────────────────────────────────────────────────────────
// Line-item fees on a deal (doc fee, title fee, registration, etc.)

model DealFee {
  id       String  @id @default(cuid())
  dealId   String
  deal     Deal    @relation(fields: [dealId], references: [id])
  name     String                                   // e.g. "Doc Fee", "Title Fee"
  amount   Decimal @db.Decimal(12, 2)
  taxable  Boolean @default(false)                  // Included in taxable base when true
  createdAt DateTime @default(now())

  @@index([dealId])
  @@map("deal_fees")
}

// ─── TradeIn ────────────────────────────────────────────────────────────────
// Customer's trade-in vehicle. One per deal (unique constraint on dealId).
// Editable until deal reaches DELIVERED status.

model TradeIn {
  id         String           @id @default(cuid())
  dealId     String           @unique              // One trade-in per deal
  deal       Deal             @relation(fields: [dealId], references: [id])

  vin        String?                               // Optional
  year       Int
  make       String
  model      String
  mileage    Int
  condition  TradeInCondition

  acv        Decimal  @db.Decimal(12, 2)           // Actual Cash Value (dealer's cost basis)
  allowance  Decimal  @db.Decimal(12, 2)           // Amount shown to customer
  payoff     Decimal  @default(0) @db.Decimal(12, 2)  // Outstanding loan payoff
  lenderName String?                               // Lender name if payoff > 0

  // netTrade = allowance - payoff (may be negative; calculated, not stored)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("trade_ins")
}

// ─── DealStatusHistory ──────────────────────────────────────────────────────
// Immutable audit log. Insert-only — no update or delete endpoint exposed.
// Every status transition produces exactly one row.

model DealStatusHistory {
  id             String      @id @default(cuid())
  dealId         String
  deal           Deal        @relation(fields: [dealId], references: [id])

  previousStatus DealStatus?                       // null for the initial PENDING entry
  newStatus      DealStatus

  actorId        String                            // User.id at time of transition
  actorName      String                            // Denormalized: preserved if user is deleted
  actorRole      String                            // Denormalized role string at time of action

  note           String?                           // Mandatory for UNWOUND and send-back; optional otherwise
  createdAt      DateTime @default(now())          // UTC timestamp of transition

  @@index([dealId, createdAt])
  @@map("deal_status_history")
}

// ─── GeneratedDocument ──────────────────────────────────────────────────────
// PDF documents generated from a deal. No delete endpoint exposed.
// Retained minimum 7 years from deal.createdAt.

model GeneratedDocument {
  id           String       @id @default(cuid())
  dealId       String
  deal         Deal         @relation(fields: [dealId], references: [id])

  documentType DocumentType
  fileUrl      String                              // S3 object key (not a pre-signed URL)
  generatedAt  DateTime     @default(now())

  @@index([dealId, generatedAt])
  @@map("generated_documents")
}
```

---

## Calculated Fields (Not Stored)

These values are computed in `DealCalculationService` on every mutating request and written back to the `Deal` row. They are never read from client input for authoritative calculation.

| Field | Formula |
|---|---|
| `netTrade` | `tradeIn.allowance − tradeIn.payoff` (may be negative; NOT stored, derived in response) |
| `totalTax` | `(salePrice + Σ taxable fees) × taxRate` |
| `amountFinanced` | `salePrice + Σ all fees + totalTax − downPayment − netTrade − rebates` |
| `monthlyPayment` | `P × [r(1+r)^n] / [(1+r)^n − 1]`; if APR = 0: `P ÷ n`; if CASH: `0` |
| `frontEndGross` | `salePrice − vehicle.cost` (vehicle.cost read from inventory record) |

---

## State Machine

```
               [auto on first edit]
  PENDING ──────────────────────────► DESKING
                                         │
                               [SM approve]│
                                         ▼
                              ┌────── F&I ──────────────────────────► UNWOUND
                              │          │
                   [SM send-back]        │[SC or FIM]
                              │          ▼
                              └────► CONTRACTS_SIGNED ──────────────► UNWOUND
                                         │
                                    [SC]│
                                         ▼
                                     DELIVERED ──────────────────────► UNWOUND
                                         │
                                    [SC]│
                                         ▼
                                      FUNDED   (terminal — no further transitions)

  UNWOUND = terminal
```

**Roles in transitions**:
- SC = Sales Consultant
- SM = Sales Manager
- FIM = F&I Manager

---

## Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| `deals` | `status` | Manager approval queue filter, pipeline queries |
| `deals` | `createdById` | Sales Consultant's own deal list |
| `deals` | `vehicleId` | Double-commitment guard lookup |
| `deals` | `fundedAt` | Sales report date range filter |
| `deals` | `dealNumber` (unique) | Human-readable lookup |
| `deal_status_history` | `dealId, createdAt` | Chronological history fetch |
| `deal_fees` | `dealId` | Fee list per deal |
| `generated_documents` | `dealId, generatedAt` | Document list per deal, newest first |

---

## Constraints & Business Rules

| Rule | Enforcement |
|---|---|
| Vehicle may not appear in two non-UNWOUND deals | Application layer check before INSERT |
| Deal records must never be deleted | No DELETE endpoint; no `deletedAt` field |
| GeneratedDocument records must never be deleted | No DELETE endpoint on documents |
| All monetary fields use DECIMAL, not FLOAT | Prisma `@db.Decimal(12,2)` throughout |
| `DealStatusHistory` is insert-only | No PUT/PATCH/DELETE endpoint for history |
| Trade-in editable only while status < DELIVERED | Service-layer guard on trade-in mutations |
| Fees editable only while status < DELIVERED | Service-layer guard on fee mutations |
| Unwound and send-back transitions require a note | Validated in DTO (`@IsNotEmpty()` when applicable) |
| Tax rate must be set before desking can be finalized | Validation error if `taxRate === 0` at approval time |
| Deal number assigned atomically on creation | PostgreSQL sequence via `$queryRaw` |
| Multi-table writes (deal + history + fees) wrapped in DB transaction | `prisma.$transaction([...])` |

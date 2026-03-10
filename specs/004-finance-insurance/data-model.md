# Data Model: Finance & Insurance (F&I) Office Workflow

**Feature**: `004-finance-insurance` | **Date**: 2026-03-10

---

## Prisma Schema Additions

Add these models to the existing `schema.prisma`. Do not modify `User`, `Vehicle`, `Customer`, `Deal`, `DealFee`, `TradeIn`, `DealStatusHistory`, or `GeneratedDocument`.

```prisma
// ─── Enums ────────────────────────────────────────────────────────────────────

enum HousingType {
  OWN
  RENT
  OTHER
}

enum CreditApplicationStatus {
  DRAFT
  SUBMITTED
  ARCHIVED
}

enum LenderDecision {
  APPROVED
  CONDITIONAL
  DECLINED
}

enum FiProductType {
  VSC               // Vehicle Service Contract (Extended Warranty)
  GAP               // Guaranteed Asset Protection
  TIRE_WHEEL
  PAINT_PROTECTION
  MAINTENANCE_PLAN
  OTHER
}

enum FiProductStatus {
  ACTIVE
  CANCELLED
  CHARGED_BACK
}

enum FiAuditActionType {
  CREDIT_APP_CREATED
  CREDIT_APP_SUBMITTED
  CREDIT_APP_SUPERSEDED
  LENDER_SUBMITTED
  LENDER_DECISION_SELECTED
  PRODUCT_ADDED
  PRODUCT_EDITED
  PRODUCT_REMOVED
  PRODUCT_STATUS_CHANGED
  CHARGEBACK_RECORDED
  DISCLOSURE_CONFIRMED
}

// ─── Lender Catalog ───────────────────────────────────────────────────────────

model Lender {
  id           String   @id @default(cuid())
  name         String   @unique
  isActive     Boolean  @default(true)
  maxMarkupCap Decimal? @db.Decimal(5, 2) // max rate markup in percentage points, e.g. 2.00

  lenderSubmissions LenderSubmission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("lenders")
}

// ─── Credit Application ───────────────────────────────────────────────────────

model CreditApplication {
  id                    String                  @id @default(cuid())
  dealId                String
  customerId            String
  annualIncome          Decimal                 @db.Decimal(12, 2)
  employerName          String
  employmentLengthMonths Int
  housingType           HousingType
  monthlyHousingPayment Decimal                 @db.Decimal(10, 2)
  ssnEncrypted          String                  // AES-256-GCM ciphertext, base64
  ssnIv                 String                  // 12-byte IV, base64
  ssnLastFour           String                  @db.Char(4) // non-sensitive, for masking
  dateOfBirth           DateTime                @db.Date
  status                CreditApplicationStatus @default(DRAFT)
  createdById           String
  submittedById         String?
  submittedAt           DateTime?

  deal      Deal     @relation(fields: [dealId], references: [id])
  customer  Customer @relation(fields: [customerId], references: [id])
  createdBy User     @relation("CreditAppCreatedBy", fields: [createdById], references: [id])
  submittedBy User?  @relation("CreditAppSubmittedBy", fields: [submittedById], references: [id])

  lenderSubmissions LenderSubmission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([dealId, status])
  @@map("credit_applications")
}

// ─── Lender Submission ────────────────────────────────────────────────────────

model LenderSubmission {
  id                  String         @id @default(cuid())
  dealId              String
  creditApplicationId String
  lenderId            String
  submittedAt         DateTime       @default(now())
  decision            LenderDecision
  approvedAmount      Decimal?       @db.Decimal(12, 2)
  buyRate             Decimal?       @db.Decimal(5, 2) // percentage, e.g. 5.90
  maxTerm             Int?           // months
  stipulations        String?
  isSelected          Boolean        @default(false)

  deal              Deal              @relation(fields: [dealId], references: [id])
  creditApplication CreditApplication @relation(fields: [creditApplicationId], references: [id])
  lender            Lender            @relation(fields: [lenderId], references: [id])

  selectedDecision SelectedLenderDecision?

  createdAt DateTime @default(now())

  @@index([dealId])
  @@index([lenderId])
  @@map("lender_submissions")
}

// ─── Selected Lender Decision (one per deal, upserted) ───────────────────────

model SelectedLenderDecision {
  id                 String   @id @default(cuid())
  dealId             String   @unique // one selected decision per deal
  lenderSubmissionId String   @unique
  buyRate            Decimal  @db.Decimal(5, 2)
  rateMarkup         Decimal  @db.Decimal(5, 2)
  sellRate           Decimal  @db.Decimal(5, 2)
  selectedTerm       Int      // months
  selectedById       String
  selectedAt         DateTime @default(now())

  deal             Deal             @relation(fields: [dealId], references: [id])
  lenderSubmission LenderSubmission @relation(fields: [lenderSubmissionId], references: [id])
  selectedBy       User             @relation(fields: [selectedById], references: [id])

  createdAt DateTime @default(now())

  @@map("selected_lender_decisions")
}

// ─── F&I Product (on deal) ────────────────────────────────────────────────────

model FIProduct {
  id                  String          @id @default(cuid())
  dealId              String
  productType         FiProductType
  providerName        String
  cost                Decimal         @db.Decimal(10, 2)
  sellingPrice        Decimal         @db.Decimal(10, 2)
  termMonths          Int
  deductible          Decimal?        @db.Decimal(8, 2)
  contractNumber      String?
  status              FiProductStatus @default(ACTIVE)
  chargebackAmount    Decimal?        @db.Decimal(10, 2)
  chargebackDate      DateTime?       @db.Date
  chargebackRecordedById String?

  deal                  Deal  @relation(fields: [dealId], references: [id])
  chargebackRecordedBy  User? @relation("ChargebackRecordedBy", fields: [chargebackRecordedById], references: [id])

  deletedAt DateTime? // soft delete (product removed from deal before delivery)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([dealId, status])
  @@index([chargebackDate])
  @@map("fi_products")
}

// ─── Product Catalog ──────────────────────────────────────────────────────────

model ProductCatalogItem {
  id           String        @id @default(cuid())
  productType  FiProductType
  providerName String
  isActive     Boolean       @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("product_catalog_items")
}

// ─── Disclosure Requirement ───────────────────────────────────────────────────

model DisclosureRequirement {
  id              String  @id @default(cuid())
  jurisdiction    String
  disclosureName  String
  isActive        Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([jurisdiction, isActive])
  @@map("disclosure_requirements")
}

// ─── Disclosure Confirmation (insert-only) ────────────────────────────────────

model DisclosureConfirmation {
  id              String   @id @default(cuid())
  dealId          String
  disclosureName  String   // snapshot at time of confirmation
  confirmedById   String
  confirmedByName String   // snapshot
  confirmedByRole String   // snapshot
  confirmedAt     DateTime @db.Date

  deal        Deal @relation(fields: [dealId], references: [id])
  confirmedBy User @relation(fields: [confirmedById], references: [id])

  createdAt DateTime @default(now())

  // No updatedAt — insert-only; no update endpoint exposed
  @@index([dealId])
  @@map("disclosure_confirmations")
}

// ─── F&I Audit Log (insert-only) ─────────────────────────────────────────────

model FIAuditLog {
  id             String            @id @default(cuid())
  dealId         String
  actionType     FiAuditActionType
  actorId        String
  actorName      String            // snapshot
  actorRole      String            // snapshot
  entityType     String            // e.g. "CreditApplication", "FIProduct"
  entityId       String
  beforeSnapshot Json?             // Decimal values serialized as strings
  afterSnapshot  Json?

  deal  Deal @relation(fields: [dealId], references: [id])
  actor User @relation(fields: [actorId], references: [id])

  createdAt DateTime @default(now())

  // No updatedAt — insert-only; no update or delete endpoint exposed
  @@index([dealId, createdAt])
  @@map("fi_audit_log")
}
```

---

## Deal Model Extension

No new columns are added to the `Deal` model. The `fi` module writes to columns already defined in 003:

| Column | Type | Owned by this module |
|---|---|---|
| `apr` | `Decimal(5,2)` | Updated by lender decision selection (sell rate) |
| `term` | `Int` | Updated by lender decision selection |
| `monthlyPayment` | `Decimal(10,2)` | Recalculated from sell rate + approved amount |
| `backEndGross` | `Decimal(10,2)` | Updated atomically on every product mutation |

---

## State Transitions

### CreditApplication Status

```
DRAFT ──submit──→ SUBMITTED ──supersede──→ ARCHIVED
  ↑                    │
  └── (re-edit)        └── (remains SUBMITTED unless superseded)
```

- A deal may have multiple `CreditApplication` records but only one with `status != ARCHIVED`.
- Superseding: existing active application → `ARCHIVED`; new application created → `DRAFT`.
- The check for an existing active application is: `status IN (DRAFT, SUBMITTED)`.

### FIProduct Status

```
ACTIVE ──cancel──→ CANCELLED
ACTIVE ──chargeback──→ CHARGED_BACK
```
- `CANCELLED` and `CHARGED_BACK` are terminal states.
- Removal (soft delete): sets `deletedAt`; only possible when `status = ACTIVE` and deal is not yet `DELIVERED`.
- `CANCELLED` products are excluded from F&I gross; `CHARGED_BACK` products are also excluded from F&I gross but contribute to chargeback totals in the performance report.

---

## Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| `credit_applications` | `(dealId, status)` | Look up active application per deal |
| `lender_submissions` | `(dealId)` | List submissions for a deal |
| `lender_submissions` | `(lenderId)` | Lender history |
| `fi_products` | `(dealId, status)` | Filter active products for gross calculation |
| `fi_products` | `(chargebackDate)` | Chargeback date-range filter for performance report |
| `disclosure_confirmations` | `(dealId)` | List confirmations per deal |
| `fi_audit_log` | `(dealId, createdAt)` | Paginated audit log per deal |
| `disclosure_requirements` | `(jurisdiction, isActive)` | List active requirements for jurisdiction |

---

## Constraints

- All monetary columns (`Decimal`) — never `Float`.
- `FIAuditLog`: no `updatedAt`, no update/delete endpoint.
- `DisclosureConfirmation`: no `updatedAt`, no update/delete endpoint.
- `FIProduct.deletedAt`: soft delete for removal; `status` field is independent.
- `SelectedLenderDecision.dealId`: unique constraint — one selected decision per deal.
- `Lender.name`: unique constraint — prevents duplicate lender names.
- `CreditApplication.ssnEncrypted` + `ssnIv`: always set together; `ssnLastFour` derived from plaintext at write time.

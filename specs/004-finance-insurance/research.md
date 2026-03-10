# Research: Finance & Insurance (F&I) Office Workflow

**Feature**: `004-finance-insurance` | **Date**: 2026-03-10

---

## 1. SSN Encryption at Rest

**Decision**: AES-256-GCM with a per-record IV, key loaded from environment variable `SSN_ENCRYPTION_KEY`.

**Rationale**:
- AES-256-GCM is authenticated encryption — it detects ciphertext tampering (via the authentication tag) without requiring a separate HMAC.
- A unique 12-byte IV per record ensures that two customers with the same SSN produce different ciphertexts, preventing correlation attacks.
- The last 4 digits of the plaintext SSN are stored separately in `ssnLastFour` (a non-sensitive 4-char string). This allows masking (`XXX-XX-####`) without decryption on every API read, improving performance and reducing exposure surface.
- Node.js's built-in `crypto` module provides `createCipheriv` / `createDecipheriv` with AES-256-GCM support — no additional dependency needed.

**Implementation**:
```typescript
// SsnEncryptionService (pure, no DB dependency)
encrypt(ssn: string): { ciphertext: string; iv: string; lastFour: string }
decrypt(ciphertext: string, iv: string): string
mask(lastFour: string): string  // returns 'XXX-XX-{lastFour}'
```
- `SSN_ENCRYPTION_KEY`: 32-byte hex string from env (256 bits).
- IV: 12 bytes, generated via `crypto.randomBytes(12)`, stored as base64.
- Ciphertext: base64-encoded.
- The auth tag (16 bytes) is appended to the ciphertext before base64 encoding.

**Alternatives considered**:
- **bcrypt/argon2 (one-way hash)**: Rejected — SSN must be retrievable for future real lender integration.
- **Field-level DB encryption (pgcrypto)**: Rejected — moves key management into DB configuration; harder to rotate keys; less portable.
- **Envelope encryption (KMS)**: Correct long-term approach for production hardening. Deferred — adds AWS KMS dependency not present in 001/002/003. Can be layered on top of AES-256-GCM without schema changes by replacing the key source.

---

## 2. Lender Simulation Determinism

**Decision**: djb2 hash of the string `"${dealId}:${lenderId}"`, modulo 3 → decision mapping. Buy rate derived from same hash.

**Rationale**:
- Determinism is critical: tests must be reproducible without mocking randomness.
- djb2 is simple (no dependencies), fast, and produces uniform-enough distribution for 3-bucket modulo.
- Using both `dealId` and `lenderId` ensures the same deal produces different decisions for different lenders (not all approved or all declined).

**Implementation**:
```typescript
// LenderSimulatorService
function djb2Hash(str: string): number {
  let hash = 5381;
  for (const char of str) {
    hash = ((hash << 5) + hash) + char.charCodeAt(0);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function simulateDecision(dealId: string, lenderId: string, amountFinanced: Decimal): LenderDecisionResult {
  const hash = djb2Hash(`${dealId}:${lenderId}`);
  const bucket = hash % 3; // 0 = Approved, 1 = Conditional, 2 = Declined
  // Buy rate: 4.50 + ((hash % 441) / 100) → range 4.50–8.90%
  const buyRateCents = 450 + (hash % 441);
  const buyRate = new Decimal(buyRateCents).dividedBy(100);
  ...
}
```

**Decision mapping**:
- `bucket = 0`: Approved — `approvedAmount = amountFinanced`, `buyRate` derived, `maxTerm = 72`, `stipulations = null`
- `bucket = 1`: Conditional — `approvedAmount = amountFinanced × 0.90` (10% haircut), `buyRate` derived, `maxTerm = 60`, `stipulations = "Proof of income required"`
- `bucket = 2`: Declined — `approvedAmount = null`, `buyRate = null`, `maxTerm = null`, `stipulations = null`

**Alternatives considered**:
- **Math.random()**: Rejected — non-deterministic; tests would require mocking.
- **Seeded PRNG (e.g., seedrandom library)**: Correct approach but adds a dependency. djb2 achieves the same outcome with zero dependencies.

---

## 3. Rate Markup Calculation

**Decision**: Pure function in `FiCalculationService`. `sellRate = buyRate + rateMarkup` (both Decimal, percentage points). Monthly payment uses the standard amortization formula on `approvedAmount` at `sellRate`.

**Rationale**:
- F&I industry standard: rate markup is always expressed as a percentage-point additive (not basis points, not flat dollar).
- Reuses the same amortization formula from `003-sales-deal-management` (`DealCalculationService`) — no duplication, consistent math.
- Warning threshold: `rateMarkup > lender.maxMarkupCap` → returned in `warnings: string[]` on the HTTP 200 response. The API does not block — consistent with spec edge case behavior.

**Markup cap warning**:
```typescript
function checkMarkupCapWarning(rateMarkup: Decimal, maxMarkupCap: Decimal | null): string[] {
  if (maxMarkupCap !== null && rateMarkup.greaterThan(maxMarkupCap)) {
    return [`Rate markup ${rateMarkup}% exceeds lender cap of ${maxMarkupCap}%`];
  }
  return [];
}
```

---

## 4. F&I Gross Calculation and Back-End Gross Sync

**Decision**: Pure function `calculateFiGross(products: FIProduct[]): Decimal` filters `status = ACTIVE AND deletedAt = null`, sums `sellingPrice − cost`. Written to `Deal.backEndGross` in the same Prisma `$transaction` as the triggering product mutation.

**Rationale**:
- Atomicity is required: if the product row is inserted/updated but the deal update fails, `backEndGross` would be stale. Prisma `$transaction` wraps both writes.
- Pure function ensures unit testability without DB setup — only the final service integration test requires a DB.
- The `fi` module writes directly to the `Deal` model's `backEndGross` column. This is the one field the `fi` module "owns" on the `Deal` record, alongside `apr`, `term`, and `monthlyPayment` (updated by lender selection).

**Transaction pattern**:
```typescript
await prisma.$transaction([
  prisma.fIProduct.create({ data: productData }),
  prisma.deal.update({ where: { id: dealId }, data: { backEndGross: newFiGross } }),
  fiAuditService.buildCreateEntry(actorContext, productData, tx), // uses tx client
]);
```

---

## 5. Chargeback Report: Dual Independent Date Windows

**Decision**: Two separate Prisma queries, combined in `PerformanceReportService`. Revenue uses `Deal.fundedAt`; chargebacks use `FIProduct.chargebackDate`.

**Rationale**:
- The clarification (Session 2026-03-10) confirmed: chargeback date is independent from funded date. A chargeback received in April on a March-funded deal appears in the April chargeback total but the March revenue total.
- Attempting a single SQL join with two different date predicates would produce a confusing cross product or require complex CTEs. Two clean queries are simpler, more readable, and independently testable.

**Query structure**:
```typescript
// Revenue: deals funded in range
const fundedDeals = await prisma.deal.findMany({
  where: { status: 'FUNDED', fundedAt: { gte: from, lte: to } },
  include: { fiProducts: { where: { deletedAt: null } } },
});

// Chargebacks: chargebacks received in range
const chargebacks = await prisma.fIProduct.findMany({
  where: { chargebackDate: { gte: from, lte: to }, status: 'CHARGED_BACK', deletedAt: null },
  include: { deal: true },
});
```

**PVR**: `netFiRevenue / fundedUnitCount` using Decimal arithmetic. If `fundedUnitCount = 0`, return `null`.

---

## 6. CSV Export

**Decision**: `fast-csv` (existing project dependency from 003), NestJS `StreamableFile` with `Content-Disposition: attachment`.

**Rationale**: Same pattern established in 003-sales-deal-management. No new dependency. `fast-csv` supports streaming, which handles large date ranges without memory pressure.

**Filename pattern**: `fi-performance-YYYY-MM-DD-to-YYYY-MM-DD.csv`

**CSV columns**: `deal_number`, `customer_name`, `funded_date`, `total_fi_revenue`, `total_chargebacks`, `net_fi_revenue`, `product_count`. Summary row appended at top or bottom with `deal_number = "TOTAL"`.

---

## 7. Audit Log Write Pattern

**Decision**: `FiAuditService.log(params, tx: Prisma.TransactionClient)` — always called inside the triggering mutation's transaction.

**Rationale**:
- Transactional coupling ensures no orphaned audit records on rollback.
- The service accepts the transaction client as a parameter rather than calling `prisma.$transaction` internally, allowing callers to compose multiple audit entries in one transaction (e.g., lender decision selection updates `SelectedLenderDecision` and creates a `LENDER_DECISION_SELECTED` audit entry in one atomic operation).
- For simple single-write operations (e.g., confirming a disclosure), the service wraps both writes in `prisma.$transaction([...])`.

**Snapshot strategy**: `beforeSnapshot` and `afterSnapshot` are JSON fields. For financial mutations, they capture the relevant Decimal values as strings to avoid floating-point serialization issues.

---

## 8. FIProduct Removal: Soft Delete vs Hard Delete

**Decision**: Soft delete via `deletedAt` on `FIProduct`. The `status` field (Active / Cancelled / Charged Back) is kept as a separate F&I lifecycle concern.

**Rationale**:
- Constitution V mandates soft deletes for all business entities.
- `deletedAt` represents "removed from the deal by the manager before delivery."
- `status` represents the F&I product lifecycle (Active → Cancelled or Charged Back).
- These two concerns are orthogonal: a removed product has `deletedAt` set; a cancelled product has `status = CANCELLED` but `deletedAt = null`.
- The `fiGross` calculation excludes records where `deletedAt IS NOT NULL` OR `status != ACTIVE`.
- `FIAuditLog` captures the removal event (`PRODUCT_REMOVED`) so the history is preserved even though the record is soft-deleted.

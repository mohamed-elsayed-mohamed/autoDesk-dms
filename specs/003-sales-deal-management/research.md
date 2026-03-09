# Research: 003 Sales Deal Management

**Branch**: `003-sales-deal-management` | **Phase**: 0 | **Date**: 2026-03-09

---

## 1. PDF Generation Library

**Decision**: **Puppeteer** (headless Chromium, HTML → PDF)

**Rationale**: Buyer's orders and bills of sale are formatted financial documents with tables, headers, and layout. HTML + CSS templates are the most natural authoring format for dealership staff and designers. Puppeteer renders them with full CSS fidelity. The server already runs Node.js and Puppeteer is a first-class npm package. Document generation is user-triggered (one at a time), so Chromium startup cost (~1–2s) is acceptable.

**Implementation pattern**:
```ts
// Template stored as HTML string with {{placeholder}} tokens
const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
const pdfBuffer = await page.pdf({ format: 'Letter', printBackground: true });
await browser.close();
```

**Alternatives considered**:
- **pdfkit**: Programmatic PDF drawing — good for simple receipts, impractical for structured deal documents with tables/logos.
- **@react-pdf/renderer**: JSX-based PDF — elegant but creates a React-in-Node dependency; template changes require code deploys.
- **pdf-lib**: Fills existing PDF form fields — requires pre-built PDF templates; layout changes require designer tooling.
- **jsPDF**: Browser-oriented; limited server-side CSS support.

**Templates storage**: Store HTML templates as files under `backend/src/deals/templates/` (one per document type). Templates are versioned with the codebase; no DB storage needed for v1.

---

## 2. S3 Document Storage

**Decision**: Server-side upload via AWS SDK `PutObjectCommand`; serve via **pre-signed GET URLs** (1-hour expiry).

**Rationale**: Unlike vehicle photos (client → S3 signed URL), deal documents are server-generated buffers. The server generates the PDF, uploads it to S3, and stores the resulting object key in `GeneratedDocument.fileUrl`. Download links are pre-signed GET URLs generated on demand at the API layer (never stored, always fresh). This keeps access controlled by the existing IAM role.

**S3 key pattern**: `deals/{dealId}/documents/{documentType}-{timestamp}.pdf`
Mirrors 001-vehicle-inventory pattern: `vehicles/{vehicleId}/photos/{filename}`.

**Alternatives considered**:
- Public-read S3 URL: Rejected — deal documents contain PII and financial data; must require authenticated access.
- Streaming PDF through API response: Acceptable for small files but bypasses S3 retention; rejected for compliance reasons (7-year retention requires durable object storage, not ephemeral API responses).

---

## 3. Atomic Deal Number Generation

**Decision**: PostgreSQL **sequence** with configurable starting value, accessed via Prisma `$queryRaw`.

**Rationale**: PostgreSQL sequences are transactionally safe, gap-tolerant under rollback (acceptable for deal numbers — gaps are fine), and perform well under concurrent load. The `DealershipConfig.dealNumberOffset` seeds the sequence at first initialization via a migration.

**Implementation**:
```sql
-- Migration: create sequence starting at offset
CREATE SEQUENCE deal_number_seq START WITH 1001;

-- On deal creation (in DealRepository):
const [{ nextval }] = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
  SELECT nextval('deal_number_seq')
`;
const dealNumber = Number(nextval);
```

**Configurable offset**: The `DealershipConfig` table stores `dealNumberOffset`. On first system boot (sequence does not yet exist), a bootstrap migration reads this value and sets the sequence start. Changing the offset after deals exist is blocked at the API level (can only increase, never below current max deal number).

**Alternatives considered**:
- `SELECT MAX(dealNumber) + 1 FOR UPDATE`: Race condition risk under concurrent inserts; rejected.
- Prisma `autoincrement()`: Cannot set a configurable starting value per dealership without raw SQL; rejected.
- UUID for deal number: Rejected — spec explicitly requires human-readable integer.

---

## 4. Optimistic Concurrency Control (Concurrent Edit Detection)

**Decision**: **`updatedAt` timestamp comparison** (optimistic locking, client-supplied).

**Rationale**: The spec mandates "last write wins" with a warning to the losing user. This is classic optimistic concurrency: no row locks, minimal contention, works well for a dealership's concurrent user count.

**Flow**:
1. Client fetches deal — receives `updatedAt: "2026-03-09T14:00:00Z"`.
2. Client sends PATCH with body `{ ...changes, updatedAt: "2026-03-09T14:00:00Z" }`.
3. Server: `SELECT deal WHERE id = :id` — gets current `updatedAt`.
4. If `current.updatedAt !== supplied.updatedAt` → return HTTP 409 `{ error: "CONFLICT", currentDeal: {...} }`.
5. If match → apply update (Prisma updates `updatedAt` automatically).

**Alternatives considered**:
- PostgreSQL `SELECT FOR UPDATE` (pessimistic locking): Prevents the conflict entirely but degrades UX (users wait); rejected per spec ("last write wins").
- ETag header: Equivalent to `updatedAt` approach but requires client to handle `If-Match` header; slightly more complex with no added benefit.

---

## 5. CSV Export

**Decision**: In-memory string construction using **`fast-csv`** library, returned as `StreamableFile`.

**Rationale**: For a single dealership's funded deals within a date range, record counts are bounded (realistically 100–2,000 rows per month). In-memory generation is fast, simple, and avoids the complexity of streaming pipelines. `fast-csv` handles CSV escaping correctly (commas in names, dollar amounts with commas).

**NestJS response pattern**:
```ts
@Get('export')
@Header('Content-Type', 'text/csv')
@Header('Content-Disposition', 'attachment; filename="sales-report.csv"')
async exportSalesReport(@Query() dto: SalesReportQueryDto, @Res({ passthrough: true }) res: Response) {
  const csvBuffer = await this.reportsService.generateSalesCsv(dto);
  return new StreamableFile(csvBuffer);
}
```

**Alternatives considered**:
- Node.js `csv-stringify`: Equivalent; `fast-csv` chosen for slightly better API ergonomics.
- Database-side `COPY TO CSV`: Requires direct DB access from API layer; rejected (violates Clean Architecture).

---

## 6. Status Pipeline — State Machine Implementation

**Decision**: **Explicit transition map** as a `const` in a `deal-status.constants.ts` file; validated in `DealService` before any status write.

**Rationale**: A simple lookup table of `{ [fromStatus]: allowedTransitions[] }` is self-documenting, trivially unit-testable, and easily extended. No FSM library needed for 7 states and ~10 transitions.

**Transition map**:
```ts
export const DEAL_STATUS_TRANSITIONS: Record<DealStatus, { to: DealStatus; roles: Role[] }[]> = {
  PENDING: [{ to: 'DESKING', roles: ['SALES_CONSULTANT'] }],
  DESKING: [
    { to: 'FNI', roles: ['SALES_MANAGER'] },
    { to: 'UNWOUND', roles: ['SALES_CONSULTANT'] },
  ],
  FNI: [
    { to: 'DESKING', roles: ['SALES_MANAGER'] },
    { to: 'CONTRACTS_SIGNED', roles: ['SALES_CONSULTANT', 'FNI_MANAGER'] },
    { to: 'UNWOUND', roles: ['SALES_CONSULTANT'] },
  ],
  CONTRACTS_SIGNED: [
    { to: 'DELIVERED', roles: ['SALES_CONSULTANT'] },
    { to: 'UNWOUND', roles: ['SALES_CONSULTANT'] },
  ],
  DELIVERED: [
    { to: 'FUNDED', roles: ['SALES_CONSULTANT'] },
    { to: 'UNWOUND', roles: ['SALES_CONSULTANT'] },
  ],
  FUNDED: [],
  UNWOUND: [],
};
```

**Alternatives considered**:
- XState: Full FSM library — overkill for 7 states; adds dependency and learning curve.
- Database-enforced check constraints: Useful as a safety net but can't enforce role-based rules; use as supplementary only.

---

## 7. Document Template Storage

**Decision**: HTML files on disk at `backend/src/deals/templates/` — one file per document type.

| File | Purpose |
|---|---|
| `buyers-order.template.html` | Buyer's order with all deal fields |
| `bill-of-sale.template.html` | Simplified bill of sale |

**Placeholder convention**: `{{snake_case_field_name}}` tokens. Template rendering is a pure function: `renderTemplate(templatePath, data) → htmlString`. All fields listed in FR-019 are included as placeholders.

**Alternatives considered**:
- Handlebars/Mustache: Adds a templating dependency for what is essentially string interpolation; rejected for simplicity (YAGNI).
- DB-stored templates: Allows runtime edits without deploys — deferred to a future feature (template management UI is out of scope).

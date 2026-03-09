# API Contracts: 003 Sales Deal Management

**Branch**: `003-sales-deal-management` | **Phase**: 1 | **Date**: 2026-03-09
**Base URL**: `/api`
**Auth**: All endpoints require `Authorization: Bearer <jwt>`. Role enforcement noted per endpoint.

---

## Shared Types

```ts
type DealType = 'CASH' | 'FINANCE' | 'LEASE'

type DealStatus =
  | 'PENDING' | 'DESKING' | 'FNI' | 'CONTRACTS_SIGNED'
  | 'DELIVERED' | 'FUNDED' | 'UNWOUND'

type TradeInCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'

type DocumentType = 'BUYERS_ORDER' | 'BILL_OF_SALE'

interface DealFee {
  id: string
  name: string
  amount: string          // Decimal as string (e.g. "799.00")
  taxable: boolean
  createdAt: string       // ISO 8601
}

interface TradeIn {
  id: string
  vin: string | null
  year: number
  make: string
  model: string
  mileage: number
  condition: TradeInCondition
  acv: string             // Decimal as string
  allowance: string
  payoff: string
  lenderName: string | null
  netTrade: string        // Computed: allowance - payoff (may be negative)
}

interface DealStatusHistoryEntry {
  id: string
  previousStatus: DealStatus | null
  newStatus: DealStatus
  actorName: string
  actorRole: string
  note: string | null
  createdAt: string       // ISO 8601 UTC
}

interface GeneratedDocumentSummary {
  id: string
  documentType: DocumentType
  downloadUrl: string     // Pre-signed S3 GET URL, 1-hour expiry
  generatedAt: string     // ISO 8601
}

interface DealSummary {
  id: string
  dealNumber: number
  dealType: DealType
  status: DealStatus
  customerName: string    // Denormalized: "FirstName LastName"
  vehicleSummary: string  // Denormalized: "2023 Toyota Camry — VIN: 1HGBH..."
  salePrice: string
  monthlyPayment: string
  createdByName: string
  updatedAt: string
  createdAt: string
}

interface DealDetail extends DealSummary {
  customerId: string
  vehicleId: string
  downPayment: string
  rebates: string
  apr: string
  term: number
  taxRate: string
  totalTax: string
  amountFinanced: string
  frontEndGross: string
  backEndGross: string | null
  fundedAt: string | null
  fees: DealFee[]
  tradeIn: TradeIn | null
  statusHistory: DealStatusHistoryEntry[]
  documents: GeneratedDocumentSummary[]
}
```

---

## Deals

### `POST /api/deals`
**Role**: Sales Consultant
**Description**: Create a new deal. Vehicle must be available (not in any non-UNWOUND deal). Deal starts at PENDING status with all financial fields at 0.

**Request body**:
```json
{
  "customerId": "string",
  "vehicleId": "string",
  "dealType": "CASH | FINANCE | LEASE"
}
```

**Response `201`**:
```json
{
  "data": { /* DealDetail */ }
}
```

**Errors**:
- `400` — Missing required fields or invalid dealType
- `404` — Customer or vehicle not found
- `409` — Vehicle already committed to an active deal (`{ "error": "VEHICLE_COMMITTED", "conflictingDealId": "..." }`)

---

### `GET /api/deals`
**Role**: All roles (visibility filtered by role)
**Description**: List deals. Sales Consultants see only their own. All other roles see all.

**Query params**:
| Param | Type | Description |
|---|---|---|
| `status` | DealStatus | Filter by status |
| `createdById` | string | Filter by salesperson (Managers only) |
| `startDate` | ISO date | Filter by `createdAt` range start |
| `endDate` | ISO date | Filter by `createdAt` range end |
| `page` | int | Page number (default: 1) |
| `pageSize` | int | Results per page (default: 25, max: 100) |

**Response `200`**:
```json
{
  "data": [ /* DealSummary[] */ ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 143,
    "totalPages": 6
  }
}
```

---

### `GET /api/deals/:id`
**Role**: All roles (ownership check for Sales Consultants)
**Description**: Get full deal jacket.

**Response `200`**:
```json
{
  "data": { /* DealDetail */ }
}
```

**Errors**:
- `403` — Sales Consultant requesting a deal not created by them
- `404` — Deal not found

---

### `PATCH /api/deals/:id`
**Role**: Sales Consultant (own deals, status < DELIVERED)
**Description**: Update desking fields. Triggers recalculation of all derived values. If status is PENDING, automatically transitions to DESKING. Validates `updatedAt` for optimistic concurrency.

**Request body**:
```json
{
  "updatedAt": "2026-03-09T14:00:00Z",  // Required for concurrency check
  "salePrice": "30000.00",              // All fields optional; only provided fields updated
  "downPayment": "3000.00",
  "rebates": "0.00",
  "apr": "0.0690",
  "term": 60,
  "taxRate": "0.0800",
  "backEndGross": "1500.00",
  "dealType": "FINANCE"
}
```

**Response `200`**:
```json
{
  "data": { /* DealDetail with recalculated values */ }
}
```

**Errors**:
- `403` — Not the deal creator, or deal is DELIVERED/FUNDED/UNWOUND
- `404` — Deal not found
- `409` — Concurrency conflict (`{ "error": "CONFLICT", "currentDeal": { /* DealDetail */ } }`)

---

## Deal Fees

### `POST /api/deals/:id/fees`
**Role**: Sales Consultant (own deal, status < DELIVERED)
**Description**: Add a fee. Triggers full deal recalculation.

**Request body**:
```json
{
  "name": "Doc Fee",
  "amount": "799.00",
  "taxable": true
}
```

**Response `201`**:
```json
{
  "data": { /* DealDetail with recalculated values */ }
}
```

---

### `PATCH /api/deals/:id/fees/:feeId`
**Role**: Sales Consultant (own deal, status < DELIVERED)
**Description**: Update a fee. Triggers full deal recalculation.

**Request body**: Same shape as POST (all fields optional).

**Response `200`**: Updated `DealDetail`.

---

### `DELETE /api/deals/:id/fees/:feeId`
**Role**: Sales Consultant (own deal, status < DELIVERED)
**Description**: Remove a fee. Triggers full deal recalculation.

**Response `200`**: Updated `DealDetail` (without deleted fee).

---

## Trade-In

### `POST /api/deals/:id/trade-in`
**Role**: Sales Consultant (own deal, status < DELIVERED)
**Description**: Add or replace the trade-in on a deal. Triggers full deal recalculation.

**Request body**:
```json
{
  "vin": "1HGBH41JXMN109186",  // Optional
  "year": 2020,
  "make": "Honda",
  "model": "Civic",
  "mileage": 42000,
  "condition": "GOOD",
  "acv": "8000.00",
  "allowance": "10000.00",
  "payoff": "4500.00",
  "lenderName": "Chase Auto"   // Optional
}
```

**Response `201`**: Updated `DealDetail` with trade-in and recalculated values.

---

### `PATCH /api/deals/:id/trade-in`
**Role**: Sales Consultant (own deal, status < DELIVERED)
**Description**: Update trade-in fields. Triggers full deal recalculation. All fields optional.

**Request body**: Same shape as POST (partial update).

**Response `200`**: Updated `DealDetail`.

---

### `DELETE /api/deals/:id/trade-in`
**Role**: Sales Consultant (own deal, status < DELIVERED)
**Description**: Remove trade-in. Triggers full deal recalculation.

**Response `200`**: Updated `DealDetail` (tradeIn: null, recalculated without net trade).

---

## Deal Status

### `POST /api/deals/:id/status`
**Role**: Varies by transition (see state machine)
**Description**: Advance or change deal status. Server validates the transition, actor role, and required fields (e.g. note for UNWOUND / send-back).

**Request body**:
```json
{
  "newStatus": "FNI",
  "note": "Approved — solid deal."  // Required for: UNWOUND, F&I → DESKING send-back
}
```

**Response `200`**:
```json
{
  "data": { /* DealDetail with updated status and new history entry */ }
}
```

**Errors**:
- `403` — Caller's role is not permitted to make this transition
- `409` — Transition not valid from current status (`{ "error": "INVALID_TRANSITION", "validTransitions": ["UNWOUND"] }`)
- `422` — Note required but not provided

---

## Documents

### `POST /api/deals/:id/documents`
**Role**: Sales Consultant, F&I Manager
**Description**: Generate a document (buyer's order or bill of sale) from the deal's current data. Renders HTML template → PDF → upload to S3 → persist GeneratedDocument record.

**Request body**:
```json
{
  "documentType": "BUYERS_ORDER"
}
```

**Response `201`**:
```json
{
  "data": { /* GeneratedDocumentSummary */ }
}
```

**Errors**:
- `422` — Deal missing required fields for document generation (e.g. taxRate not set)

---

### `GET /api/deals/:id/documents`
**Role**: All roles with deal access
**Description**: List all generated documents for a deal, newest first.

**Response `200`**:
```json
{
  "data": [ /* GeneratedDocumentSummary[] */ ]
}
```

---

### `GET /api/deals/:id/documents/:documentId/download`
**Role**: All roles with deal access
**Description**: Returns a fresh pre-signed S3 GET URL (1-hour expiry) for the document.

**Response `200`**:
```json
{
  "data": {
    "downloadUrl": "https://s3.amazonaws.com/...",
    "expiresAt": "2026-03-09T15:00:00Z"
  }
}
```

---

## Sales Report

### `GET /api/reports/sales`
**Role**: Sales Manager, General Manager
**Description**: Sales summary for funded deals in a date range. Funded date = `fundedAt` within range.

**Query params**:
| Param | Type | Required | Description |
|---|---|---|---|
| `startDate` | ISO date | Yes | Range start (inclusive) |
| `endDate` | ISO date | Yes | Range end (inclusive) |

**Response `200`**:
```json
{
  "data": {
    "summary": {
      "totalUnits": 42,
      "totalFrontEndGross": "52400.00",
      "totalBackEndGross": "18900.00",
      "averageFrontEndGross": "1247.62",
      "averageBackEndGross": "450.00"
    },
    "bySalesperson": [
      {
        "userId": "...",
        "name": "Jane Smith",
        "units": 15,
        "totalFrontEndGross": "18600.00",
        "totalBackEndGross": "6750.00",
        "averageFrontEndGross": "1240.00",
        "averageBackEndGross": "450.00"
      }
    ],
    "period": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-09"
    }
  }
}
```

**Empty period response**: Same structure with all numeric fields `"0.00"` / `0`; include `"message": "No funded deals in this period"`.

---

### `GET /api/reports/sales/export`
**Role**: Sales Manager, General Manager
**Description**: Export sales report as CSV. Same query params as `GET /api/reports/sales`.

**Response `200`**:
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="sales-report-{startDate}-{endDate}.csv"`

**CSV format** (summary row first, then per-salesperson rows):
```csv
Type,Salesperson,Units,Total Front-End Gross,Total Back-End Gross,Avg Front-End Gross,Avg Back-End Gross
SUMMARY,ALL,42,52400.00,18900.00,1247.62,450.00
SALESPERSON,Jane Smith,15,18600.00,6750.00,1240.00,450.00
SALESPERSON,John Doe,27,33800.00,12150.00,1251.85,450.00
```

---

## Dealership Config

### `GET /api/config/dealership`
**Role**: Admin, General Manager
**Description**: Get dealership configuration (deal number offset, etc.)

**Response `200`**:
```json
{
  "data": {
    "dealNumberOffset": 1001,
    "updatedAt": "2026-03-09T00:00:00Z"
  }
}
```

---

### `PATCH /api/config/dealership`
**Role**: Admin
**Description**: Update dealership configuration. `dealNumberOffset` can only be increased and must be greater than the current maximum deal number in the system.

**Request body**:
```json
{
  "dealNumberOffset": 2001
}
```

**Response `200`**: Updated config object.

**Errors**:
- `422` — New offset is less than or equal to the current maximum deal number

---

## Standard Error Response

All errors follow this envelope:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "statusCode": 409
}
```

| Code | HTTP Status | Meaning |
|---|---|---|
| `VEHICLE_COMMITTED` | 409 | Vehicle already in an active deal |
| `CONFLICT` | 409 | Optimistic concurrency conflict (stale `updatedAt`) |
| `INVALID_TRANSITION` | 409 | Status transition not allowed from current state |
| `FORBIDDEN` | 403 | Role lacks permission for this action |
| `NOT_FOUND` | 404 | Resource does not exist or caller cannot access it |
| `VALIDATION_ERROR` | 422 | DTO validation failure; includes `fields` array |
| `MISSING_TAX_RATE` | 422 | Tax rate required before document generation |

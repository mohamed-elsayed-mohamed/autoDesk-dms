# API Contracts: Finance & Insurance (F&I) Office Workflow

**Feature**: `004-finance-insurance` | **Date**: 2026-03-10
**Base URL**: `/api`
**Auth**: Bearer JWT required on all endpoints. Role enforcement via NestJS guards.

---

## Common Conventions

- All monetary values are strings in JSON (e.g. `"1500.00"`) to preserve Decimal precision.
- Dates are ISO 8601 strings (`"2026-04-01"`).
- Timestamps are UTC ISO 8601 (`"2026-03-10T14:30:00.000Z"`).
- List endpoints support `?page=1&limit=25` (default limit 25, max 100).
- Error responses: `{ "statusCode": N, "message": "...", "error": "..." }`.
- Warnings (non-blocking): responses include `"warnings": string[]` when applicable.
- SSN is never returned as plaintext. All responses use `"ssnMasked": "XXX-XX-1234"`.

---

## Lender Catalog

### `GET /api/fi/lenders`

**Roles**: All authenticated
**Query**: `?active=true|false` (optional filter), `?page`, `?limit`

**Response 200**:
```json
{
  "data": [
    {
      "id": "clr1abc",
      "name": "Ally Financial",
      "isActive": true,
      "maxMarkupCap": "2.00",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 25
}
```

---

### `POST /api/fi/lenders`

**Roles**: Admin

**Request**:
```json
{
  "name": "Chase Auto",
  "isActive": true,
  "maxMarkupCap": "2.50"
}
```

**Response 201**: Lender object (same shape as GET item).

**Errors**: `409` if name already exists.

---

### `GET /api/fi/lenders/:id`

**Roles**: All authenticated
**Response 200**: Single lender object. `404` if not found.

---

### `PATCH /api/fi/lenders/:id`

**Roles**: Admin

**Request** (all fields optional):
```json
{
  "name": "Chase Auto Finance",
  "isActive": false,
  "maxMarkupCap": "1.75"
}
```

**Response 200**: Updated lender object. `404` if not found.

---

## Credit Applications

### `GET /api/deals/:dealId/credit-application`

**Roles**: F&I Manager, Sales Manager, Controller

**Response 200**:
```json
{
  "id": "clr2xyz",
  "dealId": "deal123",
  "customerId": "cust456",
  "annualIncome": "75000.00",
  "employerName": "Acme Corp",
  "employmentLengthMonths": 36,
  "housingType": "RENT",
  "monthlyHousingPayment": "1200.00",
  "ssnMasked": "XXX-XX-4321",
  "dateOfBirth": "1985-06-15",
  "status": "SUBMITTED",
  "createdById": "user1",
  "submittedById": "user1",
  "submittedAt": "2026-03-10T15:00:00.000Z",
  "createdAt": "2026-03-10T14:45:00.000Z",
  "updatedAt": "2026-03-10T15:00:00.000Z"
}
```

**Errors**: `404` if no active credit application exists for deal.

---

### `POST /api/deals/:dealId/credit-application`

**Roles**: F&I Manager
**Guard**: Deal must be in `FNI` status.

**Request**:
```json
{
  "annualIncome": "75000.00",
  "employerName": "Acme Corp",
  "employmentLengthMonths": 36,
  "housingType": "RENT",
  "monthlyHousingPayment": "1200.00",
  "ssn": "123-45-4321",
  "dateOfBirth": "1985-06-15",
  "supersede": false
}
```

- `supersede: true` required if an active application already exists (otherwise returns `409`).

**Response 201**: Credit application object (SSN returned as `ssnMasked`).

**Errors**:
- `409` if active application exists and `supersede: false`.
- `422` if deal is not in `FNI` status.

---

### `PATCH /api/deals/:dealId/credit-application`

**Roles**: F&I Manager
**Guard**: Application must be in `DRAFT` status.

**Request** (all fields optional):
```json
{
  "annualIncome": "80000.00",
  "employerName": "New Corp",
  "employmentLengthMonths": 24,
  "housingType": "OWN",
  "monthlyHousingPayment": "0.00"
}
```

**Response 200**: Updated credit application object.

**Errors**: `422` if application is `SUBMITTED` (cannot edit submitted app).

---

### `POST /api/deals/:dealId/credit-application/submit`

**Roles**: F&I Manager
**Guard**: Application must be in `DRAFT` status.

**Request**: `{}` (empty body)

**Response 200**:
```json
{
  "id": "clr2xyz",
  "status": "SUBMITTED",
  "submittedAt": "2026-03-10T15:00:00.000Z"
}
```

**Errors**: `422` if already `SUBMITTED`.

---

## Lender Submissions

### `GET /api/deals/:dealId/lender-submissions`

**Roles**: F&I Manager, Sales Manager, Controller

**Response 200**:
```json
{
  "data": [
    {
      "id": "sub1",
      "dealId": "deal123",
      "lenderId": "clr1abc",
      "lenderName": "Ally Financial",
      "submittedAt": "2026-03-10T15:05:00.000Z",
      "decision": "APPROVED",
      "approvedAmount": "28000.00",
      "buyRate": "5.90",
      "maxTerm": 72,
      "stipulations": null,
      "isSelected": true
    },
    {
      "id": "sub2",
      "lenderName": "Capital One Auto",
      "decision": "DECLINED",
      "approvedAmount": null,
      "buyRate": null,
      "maxTerm": null,
      "stipulations": null,
      "isSelected": false
    }
  ],
  "selectedDecision": {
    "buyRate": "5.90",
    "rateMarkup": "1.50",
    "sellRate": "7.40",
    "selectedTerm": 60,
    "selectedAt": "2026-03-10T15:10:00.000Z"
  }
}
```

---

### `POST /api/deals/:dealId/lender-submissions`

**Roles**: F&I Manager
**Guard**: Deal must have a `SUBMITTED` credit application; deal must be in `FNI` status.

**Request**:
```json
{
  "lenderIds": ["clr1abc", "clr2def"]
}
```

**Response 201**:
```json
{
  "submissions": [
    {
      "id": "sub1",
      "lenderId": "clr1abc",
      "lenderName": "Ally Financial",
      "decision": "APPROVED",
      "approvedAmount": "28000.00",
      "buyRate": "5.90",
      "maxTerm": 72,
      "stipulations": null
    },
    {
      "id": "sub2",
      "lenderId": "clr2def",
      "lenderName": "Capital One Auto",
      "decision": "DECLINED",
      "approvedAmount": null,
      "buyRate": null,
      "maxTerm": null,
      "stipulations": null
    }
  ]
}
```

**Errors**:
- `422` if no `SUBMITTED` credit application exists.
- `422` if any `lenderId` is not active.

---

### `POST /api/deals/:dealId/lender-submissions/select`

**Roles**: F&I Manager

**Request**:
```json
{
  "lenderSubmissionId": "sub1",
  "rateMarkup": "1.50",
  "selectedTerm": 60
}
```

**Response 200**:
```json
{
  "selectedDecision": {
    "id": "sel1",
    "dealId": "deal123",
    "buyRate": "5.90",
    "rateMarkup": "1.50",
    "sellRate": "7.40",
    "selectedTerm": 60,
    "selectedAt": "2026-03-10T15:10:00.000Z"
  },
  "dealUpdated": {
    "apr": "7.40",
    "term": 60,
    "monthlyPayment": "554.68"
  },
  "warnings": []
}
```

- `warnings` contains `"Rate markup 1.50% exceeds lender cap of 1.25%"` if applicable.

**Errors**:
- `404` if `lenderSubmissionId` not found on this deal.
- `422` if the submission's decision is `DECLINED`.

---

## F&I Product Catalog

### `GET /api/fi/product-catalog`

**Roles**: F&I Manager, Admin
**Query**: `?active=true` (default), `?page`, `?limit`

**Response 200**:
```json
{
  "data": [
    {
      "id": "cat1",
      "productType": "VSC",
      "providerName": "Protective Asset Protection",
      "isActive": true
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 25
}
```

---

### `POST /api/fi/product-catalog`

**Roles**: Admin

**Request**:
```json
{
  "productType": "GAP",
  "providerName": "Safe-Guard Products",
  "isActive": true
}
```

**Response 201**: Catalog item object.

---

### `PATCH /api/fi/product-catalog/:id`

**Roles**: Admin

**Request** (all fields optional):
```json
{
  "providerName": "Safe-Guard International",
  "isActive": false
}
```

**Response 200**: Updated catalog item. `404` if not found.

---

## F&I Products (on Deal)

### `GET /api/deals/:dealId/fi-products`

**Roles**: F&I Manager, Sales Manager, Controller

**Response 200**:
```json
{
  "products": [
    {
      "id": "prod1",
      "productType": "VSC",
      "providerName": "Protective Asset Protection",
      "cost": "800.00",
      "sellingPrice": "1500.00",
      "termMonths": 48,
      "deductible": "100.00",
      "contractNumber": "VSC-2026-001",
      "status": "ACTIVE",
      "gross": "700.00",
      "chargebackAmount": null,
      "chargebackDate": null,
      "createdAt": "2026-03-10T16:00:00.000Z"
    }
  ],
  "totalFiGross": "1195.00",
  "backEndGross": "1195.00"
}
```

---

### `POST /api/deals/:dealId/fi-products`

**Roles**: F&I Manager
**Guard**: Deal must be in `FNI` or `CONTRACTS_SIGNED` status.

**Request**:
```json
{
  "productType": "VSC",
  "providerName": "Protective Asset Protection",
  "cost": "800.00",
  "sellingPrice": "1500.00",
  "termMonths": 48,
  "deductible": "100.00",
  "contractNumber": "VSC-2026-001"
}
```

**Response 201**: Product object + updated `totalFiGross` and `backEndGross`.

**Errors**: `422` if deal is `DELIVERED` or later.

---

### `PATCH /api/deals/:dealId/fi-products/:productId`

**Roles**: F&I Manager
**Guard**: Deal must not be in `DELIVERED`, `FUNDED`, or `UNWOUND` status.

**Request** (all fields optional):
```json
{
  "sellingPrice": "1400.00",
  "contractNumber": "VSC-2026-001-REV",
  "status": "CANCELLED"
}
```

**Response 200**: Updated product object + updated `totalFiGross` and `backEndGross`.

**Errors**:
- `422` if deal is `DELIVERED` or later.
- `422` if attempting to set `status` to `CHARGED_BACK` (use chargeback endpoint).

---

### `DELETE /api/deals/:dealId/fi-products/:productId`

**Roles**: F&I Manager
**Guard**: Deal must not be in `DELIVERED`, `FUNDED`, or `UNWOUND` status.

**Response 200**:
```json
{
  "deleted": true,
  "totalFiGross": "495.00",
  "backEndGross": "495.00"
}
```

**Errors**: `422` if deal is `DELIVERED` or later.

---

## Chargebacks

### `POST /api/deals/:dealId/fi-products/:productId/chargeback`

**Roles**: F&I Manager, Controller
**Guard**: No deal status restriction (chargebacks allowed on any pipeline status).
**Guard**: Product must have `status = ACTIVE`.

**Request**:
```json
{
  "chargebackAmount": "600.00",
  "chargebackDate": "2026-04-01"
}
```

**Response 200**:
```json
{
  "id": "prod1",
  "status": "CHARGED_BACK",
  "chargebackAmount": "600.00",
  "chargebackDate": "2026-04-01",
  "chargebackRecordedById": "user1",
  "totalFiGross": "495.00",
  "backEndGross": "495.00"
}
```

**Errors**:
- `422` if product `status` is not `ACTIVE`.
- `404` if product not found on this deal.

---

## Disclosures

### `GET /api/fi/disclosure-requirements`

**Roles**: F&I Manager, Sales Manager, Admin
**Query**: `?jurisdiction=CA` (optional; defaults to dealership jurisdiction from config)

**Response 200**:
```json
{
  "jurisdiction": "CA",
  "requirements": [
    { "id": "req1", "disclosureName": "RISC Notice", "isActive": true },
    { "id": "req2", "disclosureName": "GAP Waiver Notice", "isActive": true }
  ]
}
```

---

### `GET /api/deals/:dealId/disclosures`

**Roles**: F&I Manager, Sales Manager, Controller

**Response 200**:
```json
{
  "required": 2,
  "confirmed": 1,
  "isComplete": false,
  "confirmations": [
    {
      "id": "conf1",
      "disclosureName": "RISC Notice",
      "confirmedByName": "Jane Smith",
      "confirmedByRole": "FIManager",
      "confirmedAt": "2026-03-10",
      "createdAt": "2026-03-10T16:30:00.000Z"
    }
  ],
  "pending": ["GAP Waiver Notice"]
}
```

---

### `POST /api/deals/:dealId/disclosures/confirm`

**Roles**: F&I Manager

**Request**:
```json
{
  "disclosureRequirementId": "req2"
}
```

**Response 201**:
```json
{
  "id": "conf2",
  "disclosureName": "GAP Waiver Notice",
  "confirmedByName": "Jane Smith",
  "confirmedByRole": "FIManager",
  "confirmedAt": "2026-03-10",
  "required": 2,
  "confirmed": 2,
  "isComplete": true
}
```

**Errors**:
- `404` if disclosure requirement not found or not active.
- `409` if this disclosure has already been confirmed on this deal (idempotency: return `200` with existing confirmation instead of `409`).

---

## F&I Performance Report

### `GET /api/fi/performance-report`

**Roles**: F&I Manager, Controller
**Query**: `?from=2026-01-01&to=2026-03-31` (required)

**Response 200**:
```json
{
  "from": "2026-01-01",
  "to": "2026-03-31",
  "summary": {
    "fundedUnits": 10,
    "totalFiRevenue": "14500.00",
    "totalChargebacks": "600.00",
    "netFiRevenue": "13900.00",
    "pvr": "1390.00"
  },
  "deals": [
    {
      "dealId": "deal123",
      "dealNumber": 1001,
      "customerName": "John Doe",
      "fundedDate": "2026-01-15",
      "products": [
        {
          "productType": "VSC",
          "sellingPrice": "1500.00",
          "chargebackAmount": null,
          "chargebackDate": null,
          "status": "ACTIVE"
        }
      ],
      "dealFiRevenue": "2195.00",
      "dealChargebacks": "0.00",
      "dealNetFiRevenue": "2195.00"
    }
  ]
}
```

**Notes**:
- `totalFiRevenue`: sum of `sellingPrice` for all non-soft-deleted products on funded deals where `Deal.fundedAt BETWEEN from AND to`.
- `totalChargebacks`: sum of `chargebackAmount` for products where `FIProduct.chargebackDate BETWEEN from AND to`.
- `pvr`: `netFiRevenue / fundedUnits`; `null` if `fundedUnits = 0`.

**Errors**: `400` if `from` or `to` missing or `from > to`.

---

### `GET /api/fi/performance-report/export`

**Roles**: F&I Manager, Controller
**Query**: `?from=2026-01-01&to=2026-03-31` (required)

**Response 200**: CSV file stream.
```
Content-Type: text/csv
Content-Disposition: attachment; filename="fi-performance-2026-01-01-to-2026-03-31.csv"
```

**CSV columns**: `deal_number`, `customer_name`, `funded_date`, `fi_revenue`, `chargebacks`, `net_fi_revenue`, `product_count`

Last row: summary totals row with `deal_number = "TOTAL"`.

---

## F&I Audit Log

### `GET /api/deals/:dealId/fi-audit-log`

**Roles**: F&I Manager, Controller, Sales Manager
**Query**: `?page`, `?limit` (default 25, ordered by `createdAt DESC`)

**Response 200**:
```json
{
  "data": [
    {
      "id": "log1",
      "dealId": "deal123",
      "actionType": "LENDER_DECISION_SELECTED",
      "actorName": "Jane Smith",
      "actorRole": "FIManager",
      "entityType": "SelectedLenderDecision",
      "entityId": "sel1",
      "beforeSnapshot": null,
      "afterSnapshot": {
        "buyRate": "5.90",
        "rateMarkup": "1.50",
        "sellRate": "7.40",
        "selectedTerm": 60
      },
      "createdAt": "2026-03-10T15:10:00.000Z"
    }
  ],
  "total": 14,
  "page": 1,
  "limit": 25
}
```

**Note**: No `POST`, `PATCH`, or `DELETE` endpoints are exposed for this resource. Audit entries are written internally by the service layer.

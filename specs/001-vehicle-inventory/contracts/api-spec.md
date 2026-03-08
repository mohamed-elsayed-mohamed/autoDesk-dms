# API Contract: 001 Vehicle Inventory

**Feature**: 001-vehicle-inventory  
**Base path**: `/api`  
**Auth**: JWT in `Authorization: Bearer <token>`  
**Photo storage**: Local disk. Backend serves uploads at `/uploads/vehicles/{vehicleId}/`. No external cloud service required for local development.

---

## Auth

### POST /api/auth/login

**Request**: `application/json`

```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**: `application/json`

```json
{
  "accessToken": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "InventoryManager | SalesConsultant | GeneralManager"
  }
}
```

**Response 401**: Invalid credentials.

---

## Vehicles

All vehicle endpoints require JWT. Role enforcement:

- **InventoryManager**: create, update, delete, restore, list (all/archived), get one, dashboard, VIN decode, photo upload, photo update, photo delete.
- **SalesConsultant**: list (active only), get one. No create/update/delete/restore/dashboard.
- **GeneralManager**: list (active), get one, dashboard. No create/update/delete/restore.

### GET /api/vehicles

List vehicles with filters, sorting, and pagination. Default: active only (`deletedAt` null, `status` not Sold/Wholesaled).

**Query params**:

| Param | Type | Notes |
|-------|------|-------|
| page | int | 1-based, default 1 |
| limit | int | default 25, max 50 |
| q | string | keyword search across make, model, trim, VIN (ILIKE) |
| make | string | exact or partial match |
| model | string | exact or partial match |
| year | int | exact |
| bodyStyle | string | |
| minPrice | decimal | filter by internetPrice >= |
| maxPrice | decimal | filter by internetPrice <= |
| color | string | matches exteriorColor |
| minMileage | int | |
| maxMileage | int | |
| condition | string | New\|Used\|CPO |
| status | string | filter by exact status |
| includeDeleted | boolean | InventoryManager only; includes soft-deleted vehicles |
| sortBy | string | field name to sort by (e.g. year, make, internetPrice, mileage, dateAcquired); default dateAcquired |
| sortOrder | string | asc \| desc; default desc |

**Response 200**: `application/json`

```json
{
  "data": [
    {
      "id": "uuid",
      "stockNumber": 1001,
      "vin": "string",
      "year": 2023,
      "make": "string",
      "model": "string",
      "trim": "string",
      "condition": "New|Used|CPO",
      "status": "InTransit|InRecon|FrontlineReady|Sold|Wholesaled",
      "internetPrice": "decimal|null",
      "mileage": 0,
      "exteriorColor": "string",
      "primaryPhotoUrl": "string|null",
      "dateAcquired": "ISO8601",
      "daysInStock": 14
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 100
  }
}
```

---

### GET /api/vehicles/:id

Single vehicle with all fields, photos, and history. Returns 404 if not found or (for non-InventoryManager) if soft-deleted.

**Response 200**: `application/json`

```json
{
  "id": "uuid",
  "vin": "string",
  "stockNumber": 1001,
  "year": 2023,
  "make": "string",
  "model": "string",
  "trim": "string",
  "bodyStyle": "string",
  "exteriorColor": "string",
  "interiorColor": "string",
  "mileage": 0,
  "condition": "New|Used|CPO",
  "status": "InTransit|InRecon|FrontlineReady|Sold|Wholesaled",
  "msrp": "decimal|null",
  "invoicePrice": "decimal|null",
  "internetPrice": "decimal|null",
  "salePrice": "decimal|null",
  "lotLocation": "string|null",
  "dateAcquired": "ISO8601",
  "dateSold": "ISO8601|null",
  "deletedAt": "ISO8601|null",
  "daysInStock": 14,
  "photos": [
    { "id": "uuid", "url": "string", "sortOrder": 0, "isPrimary": true }
  ],
  "history": [
    {
      "id": "uuid",
      "changeType": "status_change|price_change",
      "fieldName": "string",
      "oldValue": "string",
      "newValue": "string",
      "changedAt": "ISO8601",
      "changedBy": {
        "id": "uuid",
        "firstName": "string",
        "lastName": "string"
      }
    }
  ]
}
```

---

### POST /api/vehicles

Create vehicle. **InventoryManager only.** `stockNumber` must be omitted (system-assigned, starting at 1001). VIN must be unique among non-deleted vehicles.

**Request**: `application/json`

```json
{
  "vin": "string (17 chars)",
  "year": 2023,
  "make": "string",
  "model": "string",
  "trim": "string (optional)",
  "bodyStyle": "string (optional)",
  "exteriorColor": "string (optional)",
  "interiorColor": "string (optional)",
  "mileage": 0,
  "condition": "New|Used|CPO",
  "status": "InTransit|InRecon|FrontlineReady|Sold|Wholesaled",
  "msrp": "decimal (optional)",
  "invoicePrice": "decimal (optional)",
  "internetPrice": "decimal (required if status=FrontlineReady)",
  "salePrice": "decimal (optional)",
  "lotLocation": "string (optional)",
  "dateAcquired": "ISO8601 (optional, defaults to today)"
}
```

**Response 201**: Same shape as `GET /api/vehicles/:id` (photos = [], history = [create entry]).

**Response 400**: Validation error — e.g. duplicate VIN (active), missing required field, internetPrice required for FrontlineReady.

**Response 409** (special): Duplicate VIN that matches a **soft-deleted** vehicle:

```json
{
  "message": "A vehicle with this VIN already exists in your archived records.",
  "archivedVehicleId": "uuid",
  "stockNumber": 1005
}
```

**Response 403**: Forbidden.

---

### PATCH /api/vehicles/:id

Partial update. **InventoryManager only.** Only sent fields are updated. Status/price changes are logged to VehicleHistory with the acting user's identity. Cannot set `stockNumber` or `id`.

**Response 200**: Updated vehicle (same shape as `GET /api/vehicles/:id`).  
**Response 400**: Validation error (e.g. internetPrice required for FrontlineReady).  
**Response 403**: Forbidden. **Response 404**: Not found.

---

### DELETE /api/vehicles/:id

Soft-delete. **InventoryManager only.** Sets `deletedAt`; vehicle excluded from default list and search.

**Response 204**.  
**Response 403**: Forbidden. **Response 404**: Not found.

---

### POST /api/vehicles/:id/restore

Restore soft-deleted vehicle. **InventoryManager only.** Clears `deletedAt`.

**Response 200**: Restored vehicle (same shape as `GET /api/vehicles/:id`).  
**Response 403**: Forbidden. **Response 404**: Not found or not soft-deleted.

---

### GET /api/vehicles/vin-decode/:vin

Decode VIN via NHTSA vPIC API. Requires auth (InventoryManager). Returns decoded fields mapped to Vehicle model. On NHTSA failure returns `{ "decoded": false }` so the client falls back to manual entry.

**Response 200** (success):

```json
{
  "decoded": true,
  "year": 2023,
  "make": "Honda",
  "model": "Accord",
  "trim": "Sport",
  "bodyStyle": "Sedan",
  "fuelType": "Gasoline"
}
```

**Response 200** (failure):

```json
{ "decoded": false, "reason": "NHTSA unavailable or no data returned" }
```

---

## Photos

Photos are uploaded directly to the backend as multipart form data and stored on local disk under `uploads/vehicles/{vehicleId}/`. The backend serves the `uploads/` directory as static files. No external storage service is required.

### POST /api/vehicles/:id/photos

Upload a photo. **InventoryManager only.** Multipart form data, field name `file` (image/jpeg or image/png). Enforces max 20 photos per vehicle.

**Request**: `multipart/form-data` — field `file` (binary image).

**Response 201**:

```json
{
  "id": "uuid",
  "url": "/uploads/vehicles/{vehicleId}/{uuid}.jpg",
  "sortOrder": 3,
  "isPrimary": false
}
```

**Response 400**: Max photos reached ("Photo limit reached (20/20)") or invalid file type.  
**Response 403**: Forbidden.

---

### PATCH /api/vehicles/:id/photos/:photoId

Set `sortOrder` and/or `isPrimary`. **InventoryManager only.** When `isPrimary: true`, clears previous primary. Client sends updated sort orders for all photos after drag-and-drop reorder.

**Request**: `application/json`

```json
{
  "isPrimary": true,
  "sortOrder": 0
}
```

**Response 200**: Updated photo `{ "id", "url", "sortOrder", "isPrimary" }`.  
**Response 403**: Forbidden. **Response 404**: Photo or vehicle not found.

---

### PATCH /api/vehicles/:id/photos/reorder

Bulk-reorder all photos after drag-and-drop. **InventoryManager only.**

**Request**: `application/json`

```json
{
  "order": ["uuid-photo-1", "uuid-photo-3", "uuid-photo-2"]
}
```

**Response 200**: Updated photos array sorted by new order.  
**Response 400**: Order array does not match the vehicle's photo IDs.  
**Response 403**: Forbidden.

---

### DELETE /api/vehicles/:id/photos/:photoId

Remove photo. **InventoryManager only.** Deletes the DB record and the file from local disk. If the deleted photo was primary and other photos exist, promotes the next photo (lowest sortOrder) to primary.

**Response 204**.  
**Response 403**: Forbidden. **Response 404**: Photo or vehicle not found.

---

## Dashboard

### GET /api/vehicles/dashboard

**GeneralManager only.** Returns inventory KPIs. `totalValue` = sum of `internetPrice` for active vehicles only (deletedAt IS NULL AND status NOT IN (Sold, Wholesaled)). `agingList` = active vehicles with `daysInStock > 60`, paginated.

**Query params**: `page` (default 1), `limit` (default 25, max 50).

**Response 200**: `application/json`

```json
{
  "totalCount": 150,
  "totalValue": "4500000.00",
  "averageDaysInStock": 42,
  "agingList": {
    "data": [
      {
        "stockNumber": 1001,
        "make": "Honda",
        "model": "Accord",
        "daysInStock": 75,
        "internetPrice": "28000.00"
      }
    ],
    "meta": { "page": 1, "limit": 25, "total": 12 }
  }
}
```

---

## Error Responses

**400** — Validation error: `{ "message": "string", "errors": [{ "field": "string", "message": "string" }] }`.  
**401** — Unauthorized (missing or invalid token).  
**403** — Forbidden (wrong role).  
**404** — Resource not found.  
**409** — Conflict (duplicate soft-deleted VIN; see POST /api/vehicles).  
**500** — Server error.

All list endpoints support pagination and return `meta.total` for client-side page count calculation.

# API Contract: Leads

**Base URL**: `/api/leads`
**Auth**: JWT Bearer token required on all endpoints
**Roles**: Sales Consultant, BDC Agent, Sales Manager (reassign: Sales Manager only)

## Endpoints

### POST /api/leads

Create a new lead. Optionally create a new customer inline.

**Request Body (existing customer)**:
```json
{
  "customerId": "uuid",
  "source": "Phone",
  "sourceOther": null,
  "assignedTo": "uuid",
  "notes": "Looking for a family SUV",
  "vehicleIds": ["uuid-1", "uuid-2"]
}
```

**Request Body (inline customer creation)**:
```json
{
  "customer": {
    "firstName": "John",
    "lastName": "Smith",
    "phone": "555-123-4567",
    "email": "john@email.com",
    "preferredContact": "Phone"
  },
  "source": "WalkIn",
  "assignedTo": null,
  "notes": "Walk-in, interested in sedans"
}
```

**Validation**:
- One of `customerId` or `customer` object required (not both)
- `source`: required, enum `Website | Phone | WalkIn | AutoTrader | CarsDotCom | Other`
- `sourceOther`: required when `source` = `Other`, max 100 chars
- `assignedTo`: optional UUID of active Sales Consultant; if omitted, round-robin assigns
- `vehicleIds`: optional array of vehicle UUIDs from inventory

**Behavior**:
- Lead created with status `New`
- If `assignedTo` is null, round-robin auto-assignment occurs
- If inline `customer` provided, customer + lead created in a single transaction
- A `Notification` is created for the assigned salesperson

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "customer": { "id": "uuid", "firstName": "John", "lastName": "Smith" },
  "source": "Phone",
  "sourceOther": null,
  "status": "New",
  "assignedTo": "uuid",
  "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
  "lostReason": null,
  "notes": "Looking for a family SUV",
  "vehicles": [
    { "id": "uuid", "vehicleId": "uuid-1", "vehicle": { "year": 2025, "make": "Honda", "model": "CR-V", "stockNumber": 1042 } }
  ],
  "createdAt": "2026-03-09T12:00:00Z",
  "updatedAt": "2026-03-09T12:00:00Z"
}
```

**Errors**:
- `400`: Validation failed, or no active salespeople for round-robin

---

### GET /api/leads

List leads with filtering, sorting, and pagination.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter by LeadStatus (comma-separated for multiple) |
| `assignedTo` | string | — | Filter by assignee UUID |
| `source` | string | — | Filter by LeadSource |
| `fromDate` | ISO date | — | Created on or after this date |
| `toDate` | ISO date | — | Created on or before this date |
| `customerId` | string | — | Filter by customer UUID |
| `page` | integer | `1` | Page number |
| `limit` | integer | `25` | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field: `createdAt`, `updatedAt` (`status` excluded — pipeline ordering is handled by PipelineBoard grouping, not list sort) |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "customer": { "id": "uuid", "firstName": "John", "lastName": "Smith", "phone": "555-123-4567" },
      "source": "Website",
      "status": "Contacted",
      "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "vehicleCount": 1,
      "createdAt": "2026-03-09T10:00:00Z",
      "updatedAt": "2026-03-09T11:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 87,
    "totalPages": 4
  }
}
```

---

### GET /api/leads/:id

Get a single lead with full details.

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "customer": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "555-123-4567",
    "email": "john@email.com",
    "preferredContact": "Phone"
  },
  "source": "Phone",
  "sourceOther": null,
  "status": "AppointmentSet",
  "assignedTo": "uuid",
  "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
  "lostReason": null,
  "notes": "Looking for a family SUV",
  "vehicles": [
    {
      "id": "uuid",
      "vehicleId": "uuid-1",
      "vehicle": {
        "id": "uuid-1",
        "year": 2025,
        "make": "Honda",
        "model": "CR-V",
        "trim": "EX-L",
        "stockNumber": 1042,
        "status": "FrontlineReady",
        "internetPrice": 34500
      }
    }
  ],
  "statusHistory": [
    { "fromStatus": "Contacted", "toStatus": "AppointmentSet", "changedBy": "uuid", "changedAt": "2026-03-09T14:00:00Z" },
    { "fromStatus": "New", "toStatus": "Contacted", "changedBy": "uuid", "changedAt": "2026-03-09T11:00:00Z" }
  ],
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T14:00:00Z"
}
```

---

### PATCH /api/leads/:id

Update lead fields (notes, sourceOther).

**Request Body**:
```json
{
  "notes": "Updated notes",
  "sourceOther": "Dealer referral"
}
```

**Response** `200 OK`: Full updated lead object.

---

### PATCH /api/leads/:id/status

Move a lead through the pipeline.

**Request Body**:
```json
{
  "status": "Lost",
  "lostReason": "Customer chose another dealership"
}
```

**Validation**:
- `status`: required, valid LeadStatus enum
- Cannot change status of a `Sold` lead (409 Conflict)
- Cannot set same status as current (400)
- `lostReason`: optional, accepted only when status = `Lost`

**Behavior**:
- Creates a `LeadStatusHistory` record (includes `lostReason` if provided, for permanent audit)
- If transitioning to `Lost`: stores `lostReason` on the `Lead` record
- If transitioning **away from `Lost`** (be-back/reopen): clears `lostReason` on the `Lead` record; the historical reason is preserved in the `LeadStatusHistory` entry that recorded the original `Lost` transition

**Response** `200 OK`: Full updated lead object with new statusHistory entry.

**Errors**:
- `400`: Invalid transition or same status
- `409`: Cannot change status of a Sold lead

---

### POST /api/leads/:id/vehicles

Link a vehicle of interest to a lead.

**Request Body**:
```json
{
  "vehicleId": "uuid"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "leadId": "uuid",
  "vehicleId": "uuid",
  "vehicle": { "year": 2025, "make": "Honda", "model": "CR-V", "stockNumber": 1042 }
}
```

**Errors**:
- `400`: Vehicle already linked to this lead
- `404`: Vehicle not found

---

### DELETE /api/leads/:id/vehicles/:vehicleId

Remove a vehicle link from a lead.

**Response** `204 No Content`

---

### PATCH /api/leads/:id/reassign

Reassign a lead to a different salesperson. **Sales Manager only.**

**Request Body**:
```json
{
  "assignedTo": "uuid"
}
```

**Behavior**:
- Updates `assignedTo` on the lead
- Creates a `LeadReassigned` notification for the new assignee

**Response** `200 OK`: Full updated lead object.

**Errors**:
- `400`: Target user is not an active Sales Consultant
- `403`: Insufficient role (not a Sales Manager)

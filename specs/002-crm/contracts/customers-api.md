# API Contract: Customers

**Base URL**: `/api/customers`
**Auth**: JWT Bearer token required on all endpoints
**Roles**: Sales Consultant, BDC Agent, Sales Manager (archive/restore: Sales Manager only)

## Endpoints

### POST /api/customers

Create a new customer profile.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "555-123-4567",
  "email": "john.smith@email.com",
  "street": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "preferredContact": "Phone",
  "notes": "Interested in SUVs"
}
```

**Validation**:
- `firstName`: required, string, max 100
- `lastName`: required, string, max 100
- `phone`: optional, string (valid phone format)
- `email`: optional, string (valid email format)
- At least one of `phone` or `email` must be provided
- `state`: optional, 2-char US state code
- `zip`: optional, 5 or 9 digit
- `preferredContact`: optional, enum `Phone | Email | Text`, defaults to `Phone`

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "555-123-4567",
  "email": "john.smith@email.com",
  "street": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "preferredContact": "Phone",
  "notes": "Interested in SUVs",
  "archivedAt": null,
  "createdAt": "2026-03-09T12:00:00Z",
  "updatedAt": "2026-03-09T12:00:00Z"
}
```

**Errors**:
- `400`: Validation failed
- `401`: Unauthorized

---

### GET /api/customers

List customers with search, filtering, and pagination.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Partial match on name, phone, or email |
| `includeArchived` | boolean | `false` | Include archived customers (Sales Manager only) |
| `page` | integer | `1` | Page number |
| `limit` | integer | `25` | Items per page (max 100) |
| `sortBy` | string | `lastName` | Sort field: `lastName`, `firstName`, `createdAt`, `updatedAt` |
| `sortOrder` | string | `asc` | `asc` or `desc` |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "phone": "555-123-4567",
      "email": "john.smith@email.com",
      "preferredContact": "Phone",
      "archivedAt": null,
      "createdAt": "2026-03-09T12:00:00Z",
      "leadCount": 2
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

---

### GET /api/customers/check-duplicates

Check for potential duplicate customers by phone or email.

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `phone` | string | Phone number to check |
| `email` | string | Email to check |
| `excludeId` | string | Customer ID to exclude (for edit scenarios) |

At least one of `phone` or `email` required.

**Response** `200 OK`:
```json
{
  "duplicates": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "phone": "555-123-4567",
      "email": "john.smith@email.com",
      "matchedOn": "phone"
    }
  ]
}
```

---

### GET /api/customers/:id

Get a single customer with linked leads summary.

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "555-123-4567",
  "email": "john.smith@email.com",
  "street": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "preferredContact": "Phone",
  "notes": "Interested in SUVs",
  "archivedAt": null,
  "createdAt": "2026-03-09T12:00:00Z",
  "updatedAt": "2026-03-09T12:00:00Z",
  "leads": [
    {
      "id": "uuid",
      "source": "Website",
      "status": "Contacted",
      "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "createdAt": "2026-03-09T10:00:00Z"
    }
  ]
}
```

**Errors**:
- `404`: Customer not found

---

### PATCH /api/customers/:id

Update a customer profile.

**Request Body** (partial update — only include fields to change):
```json
{
  "email": "john.smith.new@email.com",
  "notes": "Updated notes",
  "updatedAt": "2026-03-09T12:00:00Z"
}
```

`updatedAt` is required for optimistic concurrency — must match current DB value.

**Response** `200 OK`: Full updated customer object.

**Errors**:
- `400`: Validation failed
- `404`: Customer not found
- `409`: Conflict — record was modified by another user

---

### PATCH /api/customers/:id/archive

Soft-delete (archive) a customer. **Sales Manager only.**

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "archivedAt": "2026-03-09T14:00:00Z"
}
```

**Errors**:
- `403`: Insufficient role
- `404`: Customer not found

---

### PATCH /api/customers/:id/restore

Restore an archived customer. **Sales Manager only.**

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "archivedAt": null
}
```

**Errors**:
- `400`: Customer is not archived
- `403`: Insufficient role
- `404`: Customer not found

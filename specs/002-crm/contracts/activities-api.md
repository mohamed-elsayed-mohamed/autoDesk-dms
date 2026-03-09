# API Contract: Activities

**Base URL**: `/api/activities` and nested routes
**Auth**: JWT Bearer token required on all endpoints
**Roles**: Sales Consultant, BDC Agent, Sales Manager

## Endpoints

### POST /api/activities

Log a new activity on a customer or lead.

**Request Body**:
```json
{
  "customerId": "uuid",
  "leadId": "uuid",
  "type": "Call",
  "direction": "Outbound",
  "content": "Left voicemail about test drive appointment"
}
```

**Validation**:
- `customerId`: required UUID
- `leadId`: optional UUID (if provided, must belong to the customer)
- `type`: required, enum `Call | Email | Text | Visit | Note`
- `direction`: required for `Call`, `Email`, `Text`, `Visit`; omit for `Note`; enum `Inbound | Outbound`
- `content`: optional, free text

**Behavior**:
- `performedBy` is set from the JWT token (current user)
- `performedAt` is set to the current server time
- Activities are immutable — no update or delete endpoints

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "leadId": "uuid",
  "type": "Call",
  "direction": "Outbound",
  "content": "Left voicemail about test drive appointment",
  "performedBy": "uuid",
  "performer": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
  "performedAt": "2026-03-09T14:30:00Z"
}
```

**Errors**:
- `400`: Validation failed (e.g., direction required for Call type)
- `404`: Customer or lead not found
- `400`: Lead does not belong to the specified customer

---

### GET /api/customers/:id/timeline

Get the combined activity timeline for a customer across all leads.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `25` | Items per page (max 100) |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "leadId": "uuid",
      "lead": { "id": "uuid", "source": "Website", "status": "Contacted" },
      "type": "Call",
      "direction": "Outbound",
      "content": "Left voicemail about test drive appointment",
      "performer": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "performedAt": "2026-03-09T14:30:00Z"
    },
    {
      "id": "uuid",
      "customerId": "uuid",
      "leadId": null,
      "lead": null,
      "type": "Note",
      "direction": null,
      "content": "Customer prefers morning calls",
      "performer": { "id": "uuid", "firstName": "Bob", "lastName": "Jones" },
      "performedAt": "2026-03-08T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 47,
    "totalPages": 2
  }
}
```

Activities are sorted by `performedAt DESC` (newest first).

---

### GET /api/leads/:id/activities

Get activities for a specific lead.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `25` | Items per page (max 100) |

**Response** `200 OK`: Same structure as timeline, filtered to a single lead. Sorted by `performedAt DESC`.

# API Contract: Tasks

**Base URL**: `/api/tasks`
**Auth**: JWT Bearer token required on all endpoints
**Roles**: Sales Consultant, BDC Agent, Sales Manager (team view: Sales Manager only)

## Endpoints

### POST /api/tasks

Create a follow-up task linked to a lead.

**Request Body**:
```json
{
  "leadId": "uuid",
  "type": "Call",
  "description": "Call back about test drive",
  "dueAt": "2026-03-11T14:00:00Z"
}
// type must be one of: Call | Email | Text | Quote | FollowUp | Other
```

**Validation**:
- `leadId`: required UUID
- `type`: optional, enum `Call | Email | Text | Quote | FollowUp | Other`
- `description`: optional, max 500 chars
- At least one of `type` or `description` required
- `dueAt`: required, ISO 8601 datetime, must be in the future

**Behavior**:
- `assignedTo` is set from the JWT token (current user)
- `status` defaults to `Pending`

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "leadId": "uuid",
  "lead": { "id": "uuid", "customer": { "firstName": "John", "lastName": "Smith" }, "source": "Phone" },
  "assignedTo": "uuid",
  "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
  "type": "Call",
  "description": "Call back about test drive",
  "dueAt": "2026-03-11T14:00:00Z",
  "completedAt": null,
  "status": "Pending",
  "isOverdue": false,
  "createdAt": "2026-03-09T12:00:00Z"
}
```

**Errors**:
- `400`: Validation failed
- `404`: Lead not found

---

### GET /api/tasks/my-today

Get the current user's tasks that are due today or overdue.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "leadId": "uuid",
      "lead": {
        "id": "uuid",
        "customer": { "id": "uuid", "firstName": "John", "lastName": "Smith", "phone": "555-123-4567" },
        "source": "Phone",
        "status": "Contacted"
      },
      "type": "Call",
      "description": "Call back about test drive",
      "dueAt": "2026-03-09T14:00:00Z",
      "completedAt": null,
      "status": "Pending",
      "isOverdue": false,
      "createdAt": "2026-03-08T12:00:00Z"
    },
    {
      "id": "uuid",
      "leadId": "uuid",
      "lead": { "...": "..." },
      "type": "Email",
      "description": "Send quote by Friday",
      "dueAt": "2026-03-07T17:00:00Z",
      "completedAt": null,
      "status": "Pending",
      "isOverdue": true,
      "createdAt": "2026-03-05T10:00:00Z"
    }
  ],
  "meta": {
    "todayCount": 3,
    "overdueCount": 1
  }
}
```

**Logic**: Returns tasks where `assignedTo = currentUser` AND `status = Pending` AND (`dueAt` is today OR `dueAt` < today). Sorted: overdue first (by `dueAt ASC`), then today's tasks (by `dueAt ASC`).

---

### GET /api/tasks

List tasks with filters. Sales Managers can filter by any assignee; others see only their own.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `assignedTo` | string | current user | UUID (Sales Manager can specify any user) |
| `status` | string | — | Filter by TaskStatus: `Pending`, `Completed`, `Cancelled` |
| `leadId` | string | — | Filter by lead UUID |
| `fromDate` | ISO date | — | Due on or after this date |
| `toDate` | ISO date | — | Due on or before this date |
| `page` | integer | `1` | Page number |
| `limit` | integer | `25` | Items per page (max 100) |
| `sortBy` | string | `dueAt` | Sort field: `dueAt`, `createdAt`, `status` |
| `sortOrder` | string | `asc` | `asc` or `desc` |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "leadId": "uuid",
      "lead": { "id": "uuid", "customer": { "firstName": "John", "lastName": "Smith" }, "source": "Phone", "status": "Contacted" },
      "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "type": "Call",
      "description": "Call back about test drive",
      "dueAt": "2026-03-11T14:00:00Z",
      "completedAt": null,
      "status": "Pending",
      "isOverdue": false,
      "createdAt": "2026-03-09T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### PATCH /api/tasks/:id

Update a task's status (complete or cancel).

**Request Body**:
```json
{
  "status": "Completed"
}
```

**Validation**:
- `status`: required, enum `Completed | Cancelled`
- Task must currently be `Pending` (cannot re-complete or re-cancel)

**Behavior**:
- If `Completed`: sets `completedAt` to current server time
- If `Cancelled`: sets `completedAt` to null (remains null)

**Response** `200 OK`: Full updated task object.

**Errors**:
- `400`: Task is not in Pending status
- `403`: Not assigned to current user (unless Sales Manager)
- `404`: Task not found

---

### PATCH /api/tasks/:id/reassign

Reassign a pending task to a different active salesperson. **Sales Manager only.**

Covers the edge case where a salesperson is deactivated and their pending tasks must be transferred.

**Request Body**:
```json
{
  "assignedTo": "uuid"
}
```

**Validation**:
- `assignedTo`: required UUID of an active user with role `SalesConsultant`
- Task must be in `Pending` status (cannot reassign completed or cancelled tasks)

**Behavior**:
- Updates `assignedTo` on the task
- Does not change task `status`, `dueAt`, or any other field

**Response** `200 OK`: Full updated task object.

**Errors**:
- `400`: Task is not Pending, or target user is not an active Sales Consultant
- `403`: Insufficient role (not a Sales Manager)
- `404`: Task not found

---

### GET /api/leads/:id/tasks

Get tasks for a specific lead.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter by TaskStatus |
| `page` | integer | `1` | Page number |
| `limit` | integer | `25` | Items per page |

**Response** `200 OK`: Same structure as `GET /api/tasks`, filtered to a single lead.

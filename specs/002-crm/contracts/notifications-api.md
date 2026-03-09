# API Contract: Notifications

**Base URL**: `/api/notifications`
**Auth**: JWT Bearer token required on all endpoints
**Roles**: All CRM roles (each user sees only their own notifications)

## Endpoints

### GET /api/notifications

Get the current user's notifications, newest first.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 50) |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "LeadAssigned",
      "referenceId": "uuid",
      "message": "New lead assigned: John Smith (Phone)",
      "readAt": null,
      "createdAt": "2026-03-09T14:00:00Z"
    },
    {
      "id": "uuid",
      "type": "LeadReassigned",
      "referenceId": "uuid",
      "message": "Lead reassigned to you: Jane Doe (Website)",
      "readAt": "2026-03-09T13:30:00Z",
      "createdAt": "2026-03-09T13:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

---

### GET /api/notifications/unread-count

Get the count of unread notifications for the current user. Used for the notification bell badge. Polled every 30 seconds by the frontend.

**Response** `200 OK`:
```json
{
  "count": 3
}
```

---

### PATCH /api/notifications/:id/read

Mark a single notification as read.

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "readAt": "2026-03-09T14:05:00Z"
}
```

**Errors**:
- `404`: Notification not found or does not belong to current user

---

### PATCH /api/notifications/read-all

Mark all unread notifications as read for the current user.

**Response** `200 OK`:
```json
{
  "markedCount": 3
}
```

## Internal Creation (Not an API Endpoint)

Notifications are created internally by `LeadsService` — not through a public endpoint:

- **On lead assignment** (creation or round-robin): `NotificationService.create({ userId: assigneeId, type: 'LeadAssigned', referenceId: leadId, message: 'New lead assigned: {customerName} ({source})' })`
- **On lead reassignment**: `NotificationService.create({ userId: newAssigneeId, type: 'LeadReassigned', referenceId: leadId, message: 'Lead reassigned to you: {customerName} ({source})' })`

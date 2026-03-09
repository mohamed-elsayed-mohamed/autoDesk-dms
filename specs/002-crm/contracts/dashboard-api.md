# API Contract: Manager Dashboard

**Base URL**: `/api/dashboard`
**Auth**: JWT Bearer token required on all endpoints
**Roles**: Sales Manager only

## Endpoints

### GET /api/dashboard/manager

Returns aggregated CRM stats for the Sales Manager dashboard (SC-010).

**Query Parameters**: None

**Response (200 OK)**:
```json
{
  "pipeline": {
    "New": 12,
    "Contacted": 8,
    "AppointmentSet": 5,
    "Showed": 3,
    "Negotiating": 2,
    "Sold": 15,
    "Lost": 7
  },
  "workload": [
    {
      "userId": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "activeLeadCount": 8,
      "pendingTaskCount": 3,
      "overdueTaskCount": 1
    }
  ],
  "taskCompliance": {
    "totalPending": 22,
    "totalOverdue": 4,
    "overdueByAssignee": [
      {
        "userId": "uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "overdueCount": 1
      }
    ]
  }
}
```

**Behavior**:
- `pipeline`: Count of leads per status (all leads, not filtered by assignee).
- `workload`: One entry per active Sales Consultant with their lead and task counts. Only includes users with `role = SalesConsultant` and active status.
- `taskCompliance.totalPending`: All tasks with `status = Pending`.
- `taskCompliance.totalOverdue`: All tasks with `status = Pending` and `dueAt < NOW()`.
- `taskCompliance.overdueByAssignee`: Breakdown of overdue tasks per salesperson.

**Error Responses**:

| Code | Condition |
|------|-----------|
| 401  | Missing or invalid JWT |
| 403  | User role is not SalesManager |

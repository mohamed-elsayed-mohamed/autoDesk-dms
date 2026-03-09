# Research: 002-crm

**Feature**: Customer Relationship Management (CRM)
**Date**: 2026-03-09

## 1. Round-Robin Lead Assignment Strategy

### Decision: Database-backed round-robin with a state row

### Rationale
Store the last-assigned user ID in a single-row `RoundRobinState` table (or a config/settings table). On each assignment:
1. Query active users with role `SalesConsultant`, ordered by `id ASC`.
2. Read `lastAssignedUserId` from state.
3. Find the next user in the sorted list after `lastAssignedUserId`. If at end, wrap to first.
4. Assign the lead and update `lastAssignedUserId`.
5. Wrap steps 2–4 in a transaction with `SELECT ... FOR UPDATE` on the state row to prevent race conditions under concurrent lead creation.

### Alternatives Considered
- **In-memory counter**: Simplest to implement but lost on server restart and incorrect when running multiple instances. Rejected for production reliability.
- **Redis-backed counter**: More durable than in-memory but adds an infrastructure dependency (Redis) for a simple counter. Over-engineered for v1 volume.
- **Weighted/territory-based routing**: Out of scope per spec. Simple rotation meets current requirements.

### Implementation Notes
- Prisma model: `RoundRobinState { id: "lead-assignment", lastAssignedUserId: String? }`.
- When no active salespeople exist, throw a `BadRequestException` with message instructing manual assignment.
- The sorted user list should be queried fresh each time (not cached) to reflect newly activated/deactivated users immediately.

---

## 2. In-App Notification Pattern (Polling)

### Decision: Database-backed notifications with client-side polling every 30 seconds

### Rationale
For v1, lead assignment notifications are low-frequency events (a few per hour per salesperson). A simple DB table with polling is sufficient and avoids the infrastructure complexity of WebSockets or Server-Sent Events.

### Design
- **Notification table**: `id`, `userId`, `type` (enum: `LeadAssigned`, `LeadReassigned`), `referenceId` (lead ID), `message` (human-readable string), `readAt` (null = unread), `createdAt`.
- **Creation**: `NotificationService.create()` called internally by `LeadsService` during assignment/reassignment. Not exposed as a public API endpoint.
- **Polling**: Frontend calls `GET /api/notifications/unread-count` every 30 seconds. Full list fetched on demand when user clicks the bell icon.
- **Mark read**: `PATCH /api/notifications/:id/read` (single) or `PATCH /api/notifications/read-all` (bulk).

### Alternatives Considered
- **WebSockets (Socket.IO)**: Real-time but adds significant complexity (connection management, reconnection, auth handshake). Deferred to a future iteration if polling latency becomes a user complaint.
- **Server-Sent Events (SSE)**: Simpler than WebSockets but still requires persistent HTTP connections and infrastructure awareness (load balancers, proxies). Over-engineered for v1.
- **Push notifications (browser)**: Requires service worker setup and user permission. Out of scope.

### Migration Path
When WebSockets are needed (e.g., for real-time service board in a future feature), the `Notification` table remains the source of truth. WebSockets would push events in addition to DB writes, not replace them.

---

## 3. Customer Search Performance (Partial Match on 50k Records)

### Decision: PostgreSQL `ILIKE` with trigram index (pg_trgm) for sub-second partial matching

### Rationale
The spec requires partial-match search on name, phone, and email returning results within 1 second for up to 50,000 customer records. Standard B-tree indexes only support prefix matching (`LIKE 'foo%'`). For mid-string matching (`LIKE '%foo%'`), PostgreSQL's `pg_trgm` extension with GIN indexes provides excellent performance.

### Implementation
1. Enable the `pg_trgm` extension via a Prisma migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`.
2. Create GIN trigram indexes on the search columns:
   ```sql
   CREATE INDEX idx_customers_name_trgm ON "Customer" USING gin (
     (lower("firstName") || ' ' || lower("lastName")) gin_trgm_ops
   );
   CREATE INDEX idx_customers_phone_trgm ON "Customer" USING gin ("phone" gin_trgm_ops);
   CREATE INDEX idx_customers_email_trgm ON "Customer" USING gin ("email" gin_trgm_ops);
   ```
3. Use Prisma raw query for search (since Prisma doesn't natively support trigram operators):
   ```sql
   SELECT * FROM "Customer"
   WHERE "archivedAt" IS NULL
   AND (
     (lower("firstName") || ' ' || lower("lastName")) ILIKE '%search%'
     OR "phone" ILIKE '%search%'
     OR "email" ILIKE '%search%'
   )
   ORDER BY "lastName", "firstName"
   LIMIT 25 OFFSET 0;
   ```
4. Alternatively, use Prisma's `contains` with `mode: 'insensitive'` which generates `ILIKE` — this works with pg_trgm indexes transparently.

### Alternatives Considered
- **Full-text search (tsvector)**: Designed for natural language text, not structured fields like phone numbers and emails. Overkill and less precise for exact/partial matching.
- **Elasticsearch**: Excellent search performance but adds a heavy infrastructure dependency. Deferred unless PostgreSQL performance proves insufficient at scale.
- **Application-level caching**: Would require invalidation logic for every customer create/edit. Complexity not justified when database indexes solve the problem.

### Performance Expectation
With pg_trgm GIN indexes, `ILIKE '%term%'` queries on 50k rows typically execute in 5–50ms, well within the 1-second target.

---

## 4. Prisma Soft-Delete Pattern for Customers

### Decision: `archivedAt` field with manual filtering (no Prisma middleware)

### Rationale
Prisma middleware for automatic soft-delete filtering has known limitations: it doesn't cover all query types, is hard to override when you need to include archived records, and adds hidden behavior. A manual approach with explicit `where: { archivedAt: null }` is more transparent and controllable.

### Implementation
- Add `archivedAt DateTime?` to the Customer model.
- All list/search queries in `CustomersService` include `where: { archivedAt: null }` by default.
- `GET /api/customers?includeArchived=true` (Sales Manager only) overrides to include archived records.
- Archive: `PATCH /api/customers/:id/archive` sets `archivedAt = now()`.
- Restore: `PATCH /api/customers/:id/restore` sets `archivedAt = null`.
- Leads, activities, and tasks linked to archived customers remain accessible via their own endpoints and via the lead/task list views.

### Alternatives Considered
- **Prisma middleware**: Automatically filters `archivedAt IS NULL` on all queries. Rejected because it hides behavior, makes "include archived" queries harder, and has edge cases with relation queries.
- **Database views**: Create a `active_customers` view. Adds schema complexity and Prisma doesn't natively support views as models without workarounds.
- **Separate archived table**: Move archived records to a separate table. Over-engineered; breaks foreign keys and requires data movement.

---

## 5. Lead Status Transition Validation

### Decision: Service-layer validation with an allowed-transitions map

### Rationale
Lead status transitions are non-sequential (can move backward) but have one hard constraint: "Sold" leads cannot be reopened. Rather than a full state machine library, a simple map of disallowed transitions in the service layer is sufficient.

### Implementation
```typescript
const TERMINAL_STATUSES = ['Sold'] as const;
const ALL_STATUSES = ['New', 'Contacted', 'AppointmentSet', 'Showed', 'Negotiating', 'Sold', 'Lost'] as const;

function validateTransition(from: LeadStatus, to: LeadStatus): void {
  if (from === to) throw new BadRequestException('Lead is already in this status');
  if (TERMINAL_STATUSES.includes(from)) {
    throw new BadRequestException(`Cannot change status of a ${from} lead`);
  }
}
```

- "Lost" is not terminal — it can be reopened (be-back scenario).
- "Sold" is terminal — once sold, the lead represents a completed transaction.
- All transitions are logged in `LeadStatusHistory` with from/to status, user, and timestamp.
- When transitioning to "Lost", the `lostReason` field is accepted and stored on the lead.

### Alternatives Considered
- **State machine library (xstate)**: Powerful but heavy for a simple set of rules. The only hard constraint is "Sold is terminal." YAGNI.
- **Database-level CHECK constraint**: Cannot express "from Sold to anything is blocked" in a single column constraint. Would require a trigger, adding DB-level complexity.

---

## 6. Concurrent Edit Handling for Customer Profiles

### Decision: Optimistic concurrency via `updatedAt` version check

### Rationale
The spec requires that concurrent edits don't silently lose changes. Optimistic concurrency using the `updatedAt` timestamp as a version field is simple and effective.

### Implementation
1. Frontend fetches customer, receives `updatedAt` timestamp.
2. On save, frontend sends the `updatedAt` it received in the request body.
3. Backend `CustomersService.update()` uses Prisma's `updateMany` with a `where` clause including both `id` and `updatedAt`.
4. If `updateMany` returns `count: 0`, the record was modified by another user. Return `409 Conflict` with a message.
5. Frontend displays: "This record was modified by another user. Please refresh and try again."

### Alternatives Considered
- **Last-write-wins**: Simpler but violates the spec requirement to not silently lose changes.
- **Explicit version column (integer)**: Slightly more robust than timestamp but adds a column that serves no other purpose. `updatedAt` is already present and sufficient.
- **Pessimistic locking (SELECT FOR UPDATE)**: Blocks other users from editing. Poor UX in a multi-user dealership environment.

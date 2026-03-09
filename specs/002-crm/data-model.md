# Data Model: 002-crm

**Feature**: Customer Relationship Management (CRM)
**Date**: 2026-03-09
**ORM**: Prisma 5.20 with PostgreSQL

## Schema Changes Summary

| Change | Type | Description |
|--------|------|-------------|
| `UserRole` enum | MODIFY | Add `SalesManager`, `BDCAgent` |
| `User` model | MODIFY | Add relation to leads, activities, tasks, notifications |
| `Customer` model | ADD | Customer profiles with soft-delete |
| `Lead` model | ADD | Sales opportunities with pipeline status |
| `LeadVehicle` model | ADD | Many-to-many join: leads ↔ vehicles |
| `LeadStatusHistory` model | ADD | Immutable audit log of status transitions |
| `Activity` model | ADD | Immutable interaction records |
| `Task` model | ADD | Follow-up tasks with due dates |
| `Notification` model | ADD | In-app notifications |
| `RoundRobinState` model | ADD | Tracks round-robin assignment position |
| `LeadSource` enum | ADD | Valid lead source values |
| `LeadStatus` enum | ADD | Pipeline status values |
| `ActivityType` enum | ADD | Activity type values |
| `ActivityDirection` enum | ADD | Inbound/outbound |
| `TaskStatus` enum | ADD | Pending, Completed, Cancelled |
| `TaskType` enum | ADD | Call, Email, Text, Quote, FollowUp, Other |
| `NotificationType` enum | ADD | LeadAssigned, LeadReassigned |
| `PreferredContact` enum | ADD | Phone, Email, Text |

## Prisma Schema Additions

Add the following to `backend/prisma/schema.prisma` after the existing models.

### Enum Additions

```prisma
// Extend existing enum
enum UserRole {
  InventoryManager
  SalesConsultant
  GeneralManager
  SalesManager    // NEW
  BDCAgent        // NEW
}

// New enums
enum LeadSource {
  Website
  Phone
  WalkIn
  AutoTrader
  CarsDotCom
  Other
}

enum LeadStatus {
  New
  Contacted
  AppointmentSet
  Showed
  Negotiating
  Sold
  Lost
}

enum ActivityType {
  Call
  Email
  Text
  Visit
  Note
}

enum ActivityDirection {
  Inbound
  Outbound
}

enum TaskStatus {
  Pending
  Completed
  Cancelled
}

enum TaskType {
  Call
  Email
  Text
  Quote
  FollowUp
  Other
}

enum NotificationType {
  LeadAssigned
  LeadReassigned
}

enum PreferredContact {
  Phone
  Email
  Text
}
```

### User Model Changes

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  role         UserRole
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Existing relations
  vehicleHistory VehicleHistory[]

  // NEW: CRM relations
  assignedLeads       Lead[]             @relation("LeadAssignee")
  performedActivities Activity[]         @relation("ActivityPerformer")
  assignedTasks       Task[]             @relation("TaskAssignee")
  statusChanges       LeadStatusHistory[] @relation("StatusChanger")
  notifications       Notification[]

  @@index([email])
  @@index([role])  // NEW: for round-robin query
}
```

### New Models

```prisma
model Customer {
  id               String           @id @default(uuid())
  firstName        String
  lastName         String
  email            String?
  phone            String?
  street           String?
  city             String?
  state            String?          @db.VarChar(2)
  zip              String?          @db.VarChar(10)
  preferredContact PreferredContact @default(Phone)
  notes            String?
  archivedAt       DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  leads      Lead[]
  activities Activity[]

  @@index([lastName, firstName])
  @@index([email])
  @@index([phone])
  @@index([archivedAt])
}

model Lead {
  id         String     @id @default(uuid())
  customerId String
  source     LeadSource
  sourceOther String?
  status     LeadStatus @default(New)
  assignedTo String?
  lostReason String?
  notes      String?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  customer       Customer          @relation(fields: [customerId], references: [id])
  assignee       User?             @relation("LeadAssignee", fields: [assignedTo], references: [id])
  vehicles       LeadVehicle[]
  statusHistory  LeadStatusHistory[]
  activities     Activity[]
  tasks          Task[]

  @@index([customerId])
  @@index([status])
  @@index([assignedTo])
  @@index([source])
  @@index([createdAt])
}

model LeadVehicle {
  id        String   @id @default(uuid())
  leadId    String
  vehicleId String
  createdAt DateTime @default(now())

  lead    Lead    @relation(fields: [leadId], references: [id], onDelete: Cascade)
  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Restrict)

  @@unique([leadId, vehicleId])
  @@index([vehicleId])
}
// NOTE: onDelete: Restrict prevents hard-deleting a Vehicle that is linked to any lead.
// Per FR-024, the vehicle record must be retained as a read-only historical reference.
// Vehicles sold or removed from active inventory should use a status flag, not deletion.

model LeadStatusHistory {
  id         String     @id @default(uuid())
  leadId     String
  fromStatus LeadStatus
  toStatus   LeadStatus
  lostReason String?
  changedBy  String
  changedAt  DateTime   @default(now())

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)
  user User @relation("StatusChanger", fields: [changedBy], references: [id])

  @@index([leadId, changedAt])
}

model Activity {
  id          String             @id @default(uuid())
  customerId  String
  leadId      String?
  type        ActivityType
  direction   ActivityDirection?
  content     String?
  performedBy String
  performedAt DateTime           @default(now())

  customer Customer @relation(fields: [customerId], references: [id])
  lead     Lead?    @relation(fields: [leadId], references: [id])
  performer User    @relation("ActivityPerformer", fields: [performedBy], references: [id])

  @@index([customerId, performedAt])
  @@index([leadId])
}

model Task {
  id          String     @id @default(uuid())
  leadId      String
  assignedTo  String
  type        TaskType?
  description String?
  dueAt       DateTime
  completedAt DateTime?
  status      TaskStatus @default(Pending)
  createdAt   DateTime   @default(now())

  lead     Lead @relation(fields: [leadId], references: [id])
  assignee User @relation("TaskAssignee", fields: [assignedTo], references: [id])

  @@index([assignedTo, status, dueAt])
  @@index([leadId])
}

model Notification {
  id          String           @id @default(uuid())
  userId      String
  type        NotificationType
  referenceId String
  message     String
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, readAt])
  @@index([userId, createdAt])
}

model RoundRobinState {
  id                 String  @id @default("lead-assignment")
  lastAssignedUserId String?
}
```

### Vehicle Model Changes

Add the `LeadVehicle` relation to the existing `Vehicle` model:

```prisma
model Vehicle {
  // ... existing fields ...

  photos  VehiclePhoto[]
  history VehicleHistory[]
  leadVehicles LeadVehicle[]  // NEW

  // ... existing indexes ...
}
```

## Entity Relationship Diagram

```
User (existing)
 ├── 1:N → Lead (assignedTo)
 ├── 1:N → Activity (performedBy)
 ├── 1:N → Task (assignedTo)
 ├── 1:N → LeadStatusHistory (changedBy)
 └── 1:N → Notification (userId)

Customer (new)
 ├── 1:N → Lead (customerId)
 └── 1:N → Activity (customerId)

Lead (new)
 ├── N:1 → Customer
 ├── N:1 → User (assignee)
 ├── M:N → Vehicle (via LeadVehicle)
 ├── 1:N → LeadStatusHistory
 ├── 1:N → Activity
 └── 1:N → Task

Vehicle (existing)
 └── M:N → Lead (via LeadVehicle)
```

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| Customer | `(lastName, firstName)` | Name search and sort |
| Customer | `(email)` | Email search and duplicate detection |
| Customer | `(phone)` | Phone search and duplicate detection |
| Customer | `(archivedAt)` | Filter active vs archived |
| Lead | `(customerId)` | Customer's leads lookup |
| Lead | `(status)` | Pipeline filtering |
| Lead | `(assignedTo)` | Assignee filtering |
| Lead | `(source)` | Source filtering |
| Lead | `(createdAt)` | Date range filtering |
| LeadVehicle | `(leadId, vehicleId)` UNIQUE | Prevent duplicate links |
| LeadVehicle | `(vehicleId)` | Reverse lookup: which leads reference a vehicle |
| LeadStatusHistory | `(leadId, changedAt)` | Chronological status history |
| Activity | `(customerId, performedAt)` | Customer timeline query |
| Activity | `(leadId)` | Lead activity list |
| Task | `(assignedTo, status, dueAt)` | "My tasks today" composite query |
| Task | `(leadId)` | Lead task list |
| Notification | `(userId, readAt)` | Unread count query |
| Notification | `(userId, createdAt)` | Notification list (newest first) |
| User | `(role)` | Round-robin: fetch active salespeople |

## Additional Database Setup

### pg_trgm Extension (for customer search)

Add a migration with raw SQL to enable trigram-based partial matching:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_customers_name_trgm ON "Customer"
  USING gin ((lower("firstName") || ' ' || lower("lastName")) gin_trgm_ops);

CREATE INDEX idx_customers_phone_trgm ON "Customer"
  USING gin ("phone" gin_trgm_ops);

CREATE INDEX idx_customers_email_trgm ON "Customer"
  USING gin ("email" gin_trgm_ops);
```

### Seed Data

Extend `backend/prisma/seed.ts` with:

1. **Users**: Add SalesManager, BDCAgent, and additional SalesConsultant users.
2. **Customers**: 5–10 sample customers with varied contact info.
3. **Leads**: 3–5 leads across different pipeline stages and sources.
4. **Activities**: A few activities per lead for timeline testing.
5. **Tasks**: Mix of pending, completed, and overdue tasks.
6. **RoundRobinState**: Initialize with `id: "lead-assignment"`, `lastAssignedUserId: null`.

## Validation Rules

| Field | Rule |
|-------|------|
| Customer.firstName | Required, max 100 chars |
| Customer.lastName | Required, max 100 chars |
| Customer.email | Optional, valid email format if provided |
| Customer.phone | Optional, valid phone format if provided |
| Customer (create) | At least one of email or phone required |
| Customer.state | Optional, 2-char US state code |
| Customer.zip | Optional, 5 or 9 digit US zip |
| Lead.source | Required, must be valid LeadSource enum |
| Lead.sourceOther | Required when source = Other, max 100 chars |
| Lead.status | Must be valid LeadStatus enum |
| Activity.type | Required, must be valid ActivityType enum |
| Activity.direction | Required for Call, Email, Text, Visit; not applicable (omit) for Note |
| Task.dueAt | Required, must be in the future on creation |
| Task.type | Optional, must be valid TaskType enum if provided: Call, Email, Text, Quote, FollowUp, Other |
| Task.description | Optional, max 500 chars |
| Task (create) | At least one of type or description required |

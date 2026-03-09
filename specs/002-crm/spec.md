# Feature Specification: Customer Relationship Management (CRM)

**Feature Branch**: `002-crm`  
**Created**: 2026-03-09  
**Status**: Draft  
**Input**: User description: "Build AutoDesk DMS — 002-crm: Customer Relationship Management so that every interaction with customers and leads is tracked and no lead falls through the cracks."

**Prerequisites**: 001-vehicle-inventory (and authentication) must be implemented. Customers may reference vehicles of interest from the existing inventory module.

**Out of Scope**: Deals, F&I, service, parts, accounting, OEM integration, AI lead scoring, and email/SMS sending (this feature supports activity *logging* only).

## Clarifications

### Session 2026-03-09

- Q: Can leads be reassigned after initial assignment, and who can do it? → A: Sales Managers can reassign any lead to a different active salesperson at any time.
- Q: Can a lead be linked to multiple vehicles of interest, or only one? → A: A lead can link to multiple vehicles of interest (reflects real car-shopping behavior).
- Q: When a lost lead comes back (be-back), is it reopened or does a new lead get created? → A: A lost lead can be reopened by moving it back to an earlier pipeline status, preserving full history.
- Q: Can customer records be deleted, and what happens to linked data? → A: Soft-delete only — managers can archive a customer, hiding them from active lists but preserving all linked leads, activities, and tasks.
- Q: Are salespeople notified when they receive a new or reassigned lead? → A: Yes, in-app notifications for new lead assignments and reassignments only (no notifications for pipeline status changes).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Customer Profiles (Priority: P1)

As a Sales Consultant or BDC agent, I can create and edit customer profiles with name, phone, email, address, preferred contact method, and optional notes so that the dealership has one authoritative record per person. I can search customers by name, phone, or email. When I create a new customer, the system warns me if an existing record shares the same phone number or email address so I can avoid duplicates. I can view a customer's full profile page that shows all linked leads and a combined activity timeline.

**Why this priority**: Customer records are the foundation of every CRM action — leads, activities, and tasks all hang off a customer. Without customer profiles, nothing else in this feature can function.

**Independent Test**: Can be fully tested by creating, editing, searching, and viewing customer profiles. Delivers a searchable customer database with duplicate prevention — valuable on its own even without leads or activities.

**Acceptance Scenarios**:

1. **Given** I am a logged-in Sales Consultant, **When** I submit a new customer form with first name, last name, phone, and preferred contact method, **Then** the customer record is created and I am taken to the customer's profile page.
2. **Given** I am creating a new customer, **When** I enter a phone number or email that already exists in the system, **Then** I see a warning listing the matching existing customer(s) with name, phone, and email so I can decide whether to proceed or open the existing record.
3. **Given** I am on the customer list, **When** I type a search term (partial name, phone number, or email), **Then** the system returns matching customers within 1 second.
4. **Given** I am viewing a customer's profile, **When** the page loads, **Then** I see the customer's contact details, preferred contact method, notes, a list of their linked leads (with status), and a chronological activity timeline across all leads.
5. **Given** I am editing a customer profile, **When** I change the email to one that belongs to another customer, **Then** the system warns me about the potential duplicate before saving.
6. **Given** I search for a customer name that does not exist, **When** results return, **Then** I see an empty state with an option to create a new customer.

---

### User Story 2 — Lead Capture and Pipeline (Priority: P2)

As a BDC agent or Sales Consultant, I can create a lead and link it to an existing customer or create a new customer inline at the same time. I must record the lead source (Website, Phone, Walk-In, AutoTrader, Cars.com, or Other). I can assign the lead to a salesperson manually or via round-robin auto-assignment. Each lead has a status that follows the dealership pipeline: New → Contacted → Appointment Set → Showed → Negotiating → Sold or Lost. I can advance or regress the lead through the pipeline. I can optionally link a vehicle of interest from the existing inventory. I can view and filter the lead list by status, assigned salesperson, lead source, and date range.

**Why this priority**: Lead capture is the primary workflow that drives revenue. Without leads and a pipeline, there is no way to track sales opportunities or measure conversion. This story builds on customer profiles from P1.

**Independent Test**: Can be fully tested by creating leads with various sources, assigning them to salespeople, moving them through pipeline stages, and filtering the lead list. Delivers a functioning sales pipeline — demonstrable value to a sales manager.

**Acceptance Scenarios**:

1. **Given** I am a BDC agent with an existing customer, **When** I create a lead selecting source "Phone" and assigning a salesperson, **Then** the lead is created with status "New", linked to the customer, and visible on the lead list.
2. **Given** I am creating a lead for a person not yet in the system, **When** I choose "Create new customer" inline, **Then** I can fill in customer details and both the customer record and lead are created together.
3. **Given** a lead source field is required, **When** I try to save a lead without selecting a source, **Then** I see a validation error and the lead is not created.
4. **Given** round-robin assignment is enabled, **When** I create a lead without manually assigning a salesperson, **Then** the system assigns the next available salesperson in rotation.
5. **Given** a lead is in status "Contacted", **When** I move it to "Appointment Set", **Then** the status updates and a timestamp is recorded for the transition.
6. **Given** a lead exists, **When** I link one or more vehicles of interest from inventory, **Then** the lead's profile shows each linked vehicle's details (year, make, model, stock number).
7. **Given** I am on the lead list, **When** I filter by status "New" and source "Website", **Then** only leads matching both criteria are displayed.
8. **Given** I move a lead to "Lost", **When** I confirm the status change, **Then** the system prompts me to record a lost reason (optional free-text note) before saving.

---

### User Story 3 — Activities and Timeline (Priority: P3)

As any staff member, I can log an activity on a lead or directly on a customer. Each activity has a type (call, email, text, visit, or note), a direction (inbound or outbound), optional content/notes, and is automatically stamped with the logged-in user's identity and the current date/time. I can view a chronological timeline of all activities for a customer that spans all of their leads, giving a full 360-degree history of touchpoints.

**Why this priority**: Activity tracking is what turns the CRM from a contact list into a relationship management tool. Knowing when and how the dealership last communicated with a customer prevents missed follow-ups and duplicated outreach. Depends on customers (P1) and leads (P2).

**Independent Test**: Can be fully tested by logging activities of various types on leads and customers, then viewing the timeline. Delivers an interaction history visible on the customer profile — valuable for any salesperson picking up a customer conversation.

**Acceptance Scenarios**:

1. **Given** I am viewing a lead, **When** I log a "call" activity with direction "outbound" and content "Left voicemail about test drive", **Then** the activity appears on both the lead's activity list and the customer's combined timeline with my name and the current timestamp.
2. **Given** I am viewing a customer profile (not a specific lead), **When** I log a "note" activity, **Then** the activity is recorded against the customer without requiring a lead association.
3. **Given** a customer has three leads with activities across all of them, **When** I view the customer's timeline, **Then** I see all activities from all three leads combined in reverse-chronological order, each labeled with which lead it belongs to (if any).
4. **Given** I log a "note" activity, **When** I do not select a direction (direction is not applicable to notes), **Then** the activity saves without a direction. For all other types (call, email, text, visit), a direction is required.
5. **Given** I am viewing a timeline with many entries, **When** the list exceeds one page, **Then** I can paginate or scroll to load more activities without losing context.

---

### User Story 4 — Follow-Up Tasks (Priority: P4)

As a Sales Consultant, I can create a follow-up task linked to a lead with a due date, task type, and optional description (e.g., "Call back Tuesday 2pm", "Send quote by Friday"). I can view a "My Tasks for Today" list that shows all tasks assigned to me that are due today or overdue. I can mark a task as complete or cancel it. Overdue tasks (past their due date and not completed) are visually highlighted so nothing slips.

**Why this priority**: Follow-up tasks are the accountability mechanism that ensures the pipeline actually moves. Without structured tasks, salespeople rely on memory and sticky notes. This story builds on leads (P2) and enhances the CRM's day-to-day utility.

**Independent Test**: Can be fully tested by creating tasks on leads, viewing the "My Tasks" dashboard, completing and cancelling tasks, and verifying overdue indicators. Delivers a personal task management view — immediately useful for any salesperson starting their day.

**Acceptance Scenarios**:

1. **Given** I am viewing a lead, **When** I create a follow-up task with description "Call back" and due date of tomorrow at 2:00 PM, **Then** the task appears on my "My Tasks" list and on the lead's task list.
2. **Given** I have three tasks due today and one overdue from yesterday, **When** I open "My Tasks for Today", **Then** I see all four tasks, with the overdue task visually distinguished (e.g., highlighted in red or marked with an overdue badge).
3. **Given** I complete a task, **When** I mark it as complete, **Then** the task status changes to "Completed", a completion timestamp is recorded, and it no longer appears in my active task list.
4. **Given** I no longer need to follow up, **When** I cancel a task, **Then** the task status changes to "Cancelled" and it no longer appears in my active task list.
5. **Given** a task's due date passes without being completed, **When** I view the task list the next day, **Then** the task is flagged as overdue automatically without any manual action.
6. **Given** I am a Sales Manager, **When** I view a salesperson's tasks, **Then** I can see their pending and overdue tasks to monitor follow-up discipline.

---

### Edge Cases

- **Duplicate detection boundary**: What if two customers share the same phone number legitimately (e.g., a married couple at the same household)? The system warns but still allows the user to proceed with creation after acknowledging the duplicate.
- **Lead with deleted vehicle of interest**: If a vehicle linked to a lead is sold or removed from inventory, the lead still displays the vehicle information as a historical reference (read-only) rather than breaking the link.
- **Round-robin with no active salespeople**: If no salespeople are available for round-robin assignment (e.g., all are inactive), the system requires manual assignment and displays a clear message.
- **Activity on a "Sold" or "Lost" lead**: Staff can still log activities on closed leads (e.g., post-sale follow-up call, be-back attempt on a lost lead). The pipeline status does not restrict activity logging.
- **Customer with no leads**: A customer record can exist without any leads (e.g., a service-only customer or a walk-in who hasn't generated a lead yet). The profile page handles this gracefully with an empty leads section.
- **Concurrent editing**: If two users edit the same customer profile simultaneously, the system preserves the most recent save and does not silently lose changes (optimistic concurrency or last-write-wins with notification).
- **Task assigned to deactivated user**: If a salesperson is deactivated, their pending tasks remain visible to managers and can be reassigned to another active salesperson.
- **Lead source "Other"**: When a user selects "Other" as the lead source, a free-text field becomes available to specify the actual source.
- **Be-back (reopening a lost lead)**: When a customer previously marked as "Lost" returns, staff can reopen the existing lead by moving it back to an earlier pipeline status. All prior activities and history are preserved. "Sold" leads cannot be reopened (a sold vehicle is a completed transaction).

## Requirements *(mandatory)*

### Functional Requirements

**Customer Management**

- **FR-001**: System MUST allow authorized users (Sales Consultants, BDC agents, Sales Managers) to create customer profiles with required fields: first name, last name, and at least one contact method (phone or email).
- **FR-002**: System MUST allow editing of all customer profile fields: name, phone, email, address (street, city, state, zip), preferred contact method (phone, email, or text), and free-text notes.
- **FR-003**: System MUST support searching customers by name (partial match), phone number, or email address and return results within 1 second.
- **FR-004**: System MUST detect potential duplicate customers when a new customer is being created by matching on phone number or email address, and display a warning with the matching record(s) before allowing the user to proceed.
- **FR-005**: System MUST display a customer profile page showing: contact details, preferred contact method, notes, all linked leads with their current status, and a chronological activity timeline aggregated across all leads.
- **FR-005a**: System MUST allow Sales Managers to archive (soft-delete) a customer record, which hides the customer from active lists and search results but preserves all linked leads, activities, and tasks. Archived customers can be restored by a Sales Manager.

**Lead Management**

- **FR-006**: System MUST allow creating a lead linked to an existing customer, or creating a new customer and lead simultaneously in one workflow.
- **FR-007**: System MUST require a lead source on every lead. Valid sources: Website, Phone, Walk-In, AutoTrader, Cars.com, Other.
- **FR-008**: When source "Other" is selected, system MUST present a free-text field to specify the source.
- **FR-009**: System MUST support manual lead assignment to any active salesperson and round-robin auto-assignment when no salesperson is specified.
- **FR-009a**: System MUST allow Sales Managers to reassign any lead to a different active salesperson at any time after initial assignment.
- **FR-009b**: System MUST send an in-app notification to the assigned salesperson when they receive a new lead (via creation or round-robin) or when a lead is reassigned to them.
- **FR-010**: System MUST enforce the lead status pipeline with valid statuses: New, Contacted, Appointment Set, Showed, Negotiating, Sold, Lost. A "Lost" lead can be reopened by moving it back to an earlier status (be-back scenario).
- **FR-011**: System MUST record a timestamp for each lead status transition.
- **FR-012**: System MUST allow optionally linking one or more vehicles of interest from the existing inventory (from 001-vehicle-inventory) to a lead.
- **FR-013**: System MUST support filtering the lead list by status, assigned salesperson, lead source, and date range (created date).
- **FR-014**: When a lead is moved to "Lost", the system MUST prompt for an optional lost reason.

**Activity Tracking**

- **FR-015**: System MUST allow logging an activity on a lead or directly on a customer with the following fields: type (call, email, text, visit, note), direction (inbound/outbound — required for call, email, text, and visit; not applicable for note), and optional content.
- **FR-016**: System MUST automatically record the identity of the user who logged the activity and the timestamp.
- **FR-017**: System MUST display a combined chronological timeline on the customer profile aggregating activities across all of the customer's leads, with each activity labeled by its associated lead (if any).

**Task Management**

- **FR-018**: System MUST allow Sales Consultants, BDC Agents, and Sales Managers to create a follow-up task linked to a lead with required fields: due date/time and at least a task type or description. The task is assigned to the creating user by default; Sales Managers may reassign tasks to any active salesperson.
- **FR-019**: System MUST provide a "My Tasks for Today" view showing all tasks assigned to the logged-in user that are due today or overdue.
- **FR-020**: System MUST allow marking tasks as Complete (recording a completion timestamp) or Cancelled.
- **FR-021**: System MUST visually indicate overdue tasks (tasks past their due date that are not completed or cancelled).
- **FR-022**: System MUST allow managers to view tasks assigned to any salesperson for oversight.

**Cross-Cutting**

- **FR-023**: System MUST enforce role-based access control. All three CRM roles (Sales Consultant, BDC Agent, Sales Manager) can create and view customers, leads, activities, and tasks. Sales Managers additionally have exclusive rights to: archive/restore customers, reassign leads, reassign tasks, and view team-wide tasks and pipeline data.
- **FR-024**: If a vehicle linked to a lead is sold or removed from inventory, the system MUST retain the vehicle reference as a read-only historical record on the lead.

### Key Entities

- **Customer**: A person the dealership interacts with. Key attributes: name, phone, email, address, preferred contact method, notes, archived status. A customer can have zero or many leads. Uniqueness is advisory (duplicate warning) rather than enforced on phone/email to handle legitimate scenarios (e.g., household members sharing a number). Customers are soft-deleted (archived) rather than hard-deleted to preserve referential integrity.

- **Lead**: A sales opportunity linked to exactly one customer. Key attributes: source, pipeline status, assigned salesperson, optional vehicles of interest (one or more), notes. A lead progresses through the pipeline: New → Contacted → Appointment Set → Showed → Negotiating → Sold or Lost.

- **Activity**: A recorded interaction (call, email, text, visit, or note) associated with a customer and optionally a specific lead. Key attributes: type, direction, content, who performed it, when. Activities form the customer's 360-degree timeline.

- **Task**: A follow-up action item linked to a lead and assigned to a salesperson. Key attributes: due date/time, description, status (Pending, Completed, Cancelled). Tasks drive daily accountability and pipeline progression.

### Assumptions

- Authentication and role-based access control already exist from 001-vehicle-inventory. This feature leverages existing user/auth infrastructure.
- The vehicle inventory module provides an interface (or identifier) to look up and link vehicles of interest.
- Round-robin assignment rotates among all active salespeople with the "Sales Consultant" role. No weighting or territory-based routing is needed for this iteration.
- Duplicate detection is advisory only — the system warns but does not block creation. This avoids blocking legitimate multi-person households.
- Lead status transitions are not strictly sequential — a user can move a lead backward (e.g., from "Appointment Set" back to "Contacted") to correct mistakes.
- Pagination and sorting are assumed for all list views (customers, leads, activities, tasks).
- Time zones: all timestamps are stored in UTC and displayed in the dealership's local time zone.
- Lead permanence: Leads cannot be deleted. A lead can only progress through the pipeline or be marked Lost. This ensures a complete audit trail for every sales opportunity.
- Activity immutability: Activities cannot be edited or deleted once created. The timeline serves as a reliable, tamper-proof audit trail of all customer interactions.
- Lost reason on reopen: When a Lost lead is reopened (be-back scenario), the original lost reason is preserved in the LeadStatusHistory record. The `lostReason` field on the Lead record itself is cleared upon reopening.
- Vehicle reference integrity: Vehicles linked to leads via the LeadVehicle join table are not hard-deleted from inventory while referenced. If a vehicle's inventory status changes (e.g., sold), the lead retains a read-only historical reference per FR-024.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Sales Consultant can create a new customer profile in under 1 minute.
- **SC-002**: Customer search returns results within 1 second for a database of up to 50,000 customer records.
- **SC-003**: Duplicate detection identifies and warns about matching phone/email before a duplicate is created in 95% of cases.
- **SC-004**: A BDC agent can create a lead (with source, customer link, and salesperson assignment) in under 2 minutes.
- **SC-005**: 100% of lead status transitions are recorded with a timestamp, enabling accurate pipeline reporting.
- **SC-006**: Any staff member can log an activity in under 30 seconds from the lead or customer view.
- **SC-007**: The customer timeline displays all historical activities across all leads within 2 seconds of opening the profile.
- **SC-008**: A salesperson can view their "My Tasks for Today" list within 3 seconds of navigating to the task view.
- **SC-009**: 100% of overdue tasks are visually flagged without manual intervention.
- **SC-010**: Sales Managers can view lead pipeline, assignee workload, and task compliance for their team from a single screen.

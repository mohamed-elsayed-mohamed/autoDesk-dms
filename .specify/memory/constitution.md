<!--
  === Sync Impact Report ===
  Version change: 0.0.0 (template) → 1.0.0
  Modified principles: N/A (initial creation)
  Added sections:
    - 11 Core Principles (I through XI)
    - Additional Constraints
    - Development Workflow
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible (Constitution Check section aligns)
    - .specify/templates/spec-template.md ✅ compatible (user stories, requirements, success criteria align)
    - .specify/templates/tasks-template.md ✅ compatible (phase structure, test-first, parallel markers align)
    - .specify/templates/checklist-template.md ✅ compatible (generic structure, no conflicts)
  Follow-up TODOs: None
-->

# AutoDesk DMS Constitution

## Core Principles

### I. Modular Domain Architecture

The system MUST be organized into independent domain modules:
Inventory, CRM, Sales, F&I, Service, Parts, Accounting, and
OEM Integration.

- Each module owns its own routes, services, entities, and DTOs.
- Modules communicate through well-defined internal interfaces,
  never by directly accessing another module's database tables
  or internal services.
- This enables independent development, testing, and eventual
  extraction into microservices.

### II. Type Safety End-to-End

TypeScript strict mode MUST be enabled across both frontend
(React) and backend (Node.js/NestJS).

- Shared type definitions for all domain entities (Vehicle,
  Customer, Deal, RepairOrder, Part) MUST live in a shared
  types package consumed by both layers.
- No `any` types permitted except with explicit justification
  in a code comment.

### III. Test-First for Business Logic (NON-NEGOTIABLE)

All financial calculations (deal desking, payment math, tax
computation, commission calculation, F&I product pricing) and
state machine transitions (vehicle status, deal pipeline, RO
lifecycle, lead pipeline) MUST have unit tests written before
implementation.

- Integration tests MUST cover every REST API endpoint.
- End-to-end tests (Cypress) MUST cover critical user workflows:
  vehicle search, deal creation, RO creation, and appointment
  booking.
- Red-Green-Refactor cycle strictly enforced for all business
  logic.

### IV. Responsible AI Integration

AI-powered features (semantic search, description generation,
OCR, lead scoring, copilot) MUST include human-in-the-loop
review before any AI output is persisted or shown to customers.

- All LLM prompts MUST be versioned and stored as templates,
  not hardcoded inline.
- AI responses MUST include confidence indicators where
  applicable.
- OCR-extracted data MUST be presented for human confirmation
  before saving.
- The system MUST function fully without AI services being
  available (graceful degradation).

### V. Data Integrity and Financial Accuracy

All monetary values MUST use NUMERIC/DECIMAL types, never
floating point.

- Deal financial calculations (amount financed, monthly payment,
  gross profit) MUST be deterministic and auditable.
- Every state change on a financial entity (deal, RO, journal
  entry) MUST be logged in an immutable audit trail.
- Soft deletes MUST be used for all business entities.
- Database transactions MUST wrap any multi-table write
  operation.

### VI. Security and Compliance

Authentication via JWT with role-based access control (RBAC).

- Roles: Admin, SalesConsultant, SalesManager, FIManager,
  ServiceAdvisor, Technician, PartsAdvisor, Controller.
- Sensitive data (SSN, driver's license numbers) MUST be
  encrypted at rest.
- API endpoints MUST enforce authorization at the controller
  level.
- All user actions on deals, credit applications, and financial
  records MUST be audit-logged with timestamps and user IDs.

### VII. API-First Design

Every feature MUST be exposed through a documented REST API
before any UI is built.

- API endpoints follow RESTful conventions with consistent
  naming: `/api/{module}/{resource}`.
- All endpoints MUST validate input with DTOs and return
  standardized error responses.
- Pagination, filtering, and sorting MUST be supported on all
  list endpoints from day one.

### VIII. Performance and Scalability

Database queries MUST use proper indexes; no N+1 query patterns
permitted.

- List endpoints MUST support cursor-based or offset pagination.
- Vehicle photo uploads MUST go directly to S3 with signed URLs,
  not through the API server.
- Redis MUST be used for caching frequently accessed reference
  data (OEM programs, parts catalog lookups).
- Background jobs (OEM data feeds, report generation, AI
  embeddings) MUST be processed via message queues (SQS), not
  inline.

### IX. Clean Code

All code MUST follow Clean Code principles.

- Functions MUST do one thing and do it well.
- Function and variable names MUST be descriptive and reveal
  intent -- no abbreviations or cryptic names
  (e.g., `calculateMonthlyPayment` not `calcPmt`).
- Functions MUST be short (under 30 lines as a guideline).
- No deeply nested conditionals -- extract into named helper
  functions or use early returns.
- No magic numbers or strings -- use named constants or enums.
- Code MUST be self-documenting; comments are only permitted to
  explain "why," never "what."
- Dead code, commented-out code, and TODO hacks MUST NOT be
  committed.
- DRY (Don't Repeat Yourself) MUST be enforced -- shared logic
  lives in utility functions or base classes, not copy-pasted
  across modules.

### X. Clean Architecture

The backend MUST follow Clean Architecture layering.

- **Controllers** handle HTTP concerns only (request parsing,
  response formatting).
- **Services** contain all business logic and orchestration.
- **Repositories/ORM layer** handles all data access.
- No business logic in controllers. No HTTP/request concepts in
  services. No direct ORM calls in controllers.
- Dependencies MUST point inward -- outer layers depend on inner
  layers, never the reverse.
- Each module MUST follow this structure:
  controller → service → repository.
- Cross-cutting concerns (logging, error handling, validation,
  auth) MUST be handled via NestJS interceptors, guards, pipes,
  and filters -- not duplicated in each module.
- The frontend MUST separate concerns similarly: pages handle
  routing/layout, components handle UI rendering, hooks handle
  data fetching and state, and utility functions handle pure
  logic.

### XI. User-Friendly UI/UX

The interface MUST be designed for dealership staff who work
under time pressure with customers present.

- Every screen MUST load in under 2 seconds.
- Navigation MUST require no more than 3 clicks to reach any
  primary function.
- Forms MUST use inline validation with clear error messages --
  never submit and reload to show errors.
- The design MUST use a consistent component library (Material
  UI or Ant Design) with a unified color palette, typography,
  and spacing system.
- Data tables MUST support sorting, filtering, column resizing,
  and keyboard navigation.
- Dashboard widgets MUST show real-time KPIs with at-a-glance
  readability (large numbers, color-coded status indicators,
  sparkline trends).
- Mobile-responsive layouts MUST be provided for service
  advisors and sales consultants who use tablets on the lot and
  in the shop.
- Empty states, loading skeletons, and error boundaries MUST be
  implemented on every page -- no blank screens or raw error
  dumps.
- All destructive actions (delete, unwind deal, void RO) MUST
  require explicit confirmation dialogs.

## Additional Constraints

- **Technology stack**: React + TypeScript frontend, NestJS +
  TypeScript backend, PostgreSQL database, Prisma ORM, AWS
  (S3, SQS, ECS, RDS, CloudFront), Docker, Redis, pgvector
  for AI embeddings.
- The automotive domain uses specific terminology (VIN, MSRP,
  RO, F&I, ACV, desking) -- code, APIs, and documentation MUST
  use correct domain language, not generic approximations.
- The NHTSA vPIC API is the primary VIN decoding source (free,
  no API key required).
- The NADA standard chart of accounts structure MUST be followed
  for all accounting/GL functionality.

## Development Workflow

- All code changes go through pull requests with at least one
  review.
- Every PR MUST pass linting (ESLint), type checking
  (`tsc --noEmit`), and all existing tests before merge.
- Commit messages follow Conventional Commits format:
  `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Database schema changes MUST use Prisma migrations, never
  manual SQL in production.
- Environment configuration via `.env` files, never hardcoded
  credentials or connection strings.

## Governance

- This constitution supersedes all ad-hoc decisions. Any
  deviation requires documented justification.
- Amendments require updating this document, incrementing the
  version, and verifying that all specs, plans, and tasks
  remain consistent.
- All PRs and code reviews MUST verify compliance with these
  principles.
- Complexity MUST be justified -- when in doubt, favor
  simplicity (YAGNI). Do not add features, abstractions, or
  infrastructure that are not required by a current
  specification.

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08

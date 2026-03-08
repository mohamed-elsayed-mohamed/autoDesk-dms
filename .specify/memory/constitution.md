<!--
  === Sync Impact Report ===
  Version change: 1.0.0 → 1.1.0
  Modified principles:
    - XI. Renamed "User-Friendly UI/UX" → "Modern, User-Friendly UI/UX"
    - XI. Expanded with explicit modern design requirements:
        visual design tokens, 8px grid, color palette rules, typography rules,
        icon set consistency, rounded corners/shadows, badge/chip status display,
        skeleton loading screens, empty state with illustration + CTA,
        WCAG AA contrast, drag-and-drop styling, button state rules
  Added sections: None
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible
    - .specify/templates/spec-template.md ✅ compatible
    - .specify/templates/tasks-template.md ⚠️ UI Polish phase tasks may need
        additional items for design tokens, badge styles, and skeleton screens
    - .specify/templates/checklist-template.md ✅ compatible
  Follow-up TODOs:
    - Review specs/001-vehicle-inventory/tasks.md Phase 6 (Polish) for alignment
      with new XI requirements (design tokens, badge statuses, skeleton screens,
      empty state illustrations)
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

### XI. Modern, User-Friendly UI/UX

The interface MUST be designed for dealership staff who work
under time pressure with customers present. It MUST look and
feel like a modern, professional SaaS product -- not a legacy
dealership tool.

#### Performance & Navigation

- Every screen MUST load in under 2 seconds.
- Navigation MUST require no more than 3 clicks to reach any
  primary function.
- Page transitions and data updates MUST use optimistic UI or
  smooth loading states -- no full-page reloads for partial
  updates.

#### Visual Design

- The design MUST use a consistent component library (Material
  UI or Ant Design) with a carefully chosen, modern color
  palette: a neutral base (white or light gray backgrounds),
  a single strong brand accent color, and semantic status
  colors (green = active/success, amber = warning/pending,
  red = error/deleted, blue = informational).
- Typography MUST use a clean sans-serif font with a clear
  hierarchy: large, bold headings; medium body text; small
  muted labels. No more than 2 font families across the
  entire application.
- Spacing MUST follow an 8px grid system (4 / 8 / 16 / 24 /
  32 / 48px). No arbitrary pixel values.
- Icons MUST come from a single icon set (e.g. Material Icons
  or Lucide) used consistently. No mixing icon libraries.
- Cards, panels, and modals MUST use subtle box shadows and
  rounded corners (border-radius 8–12px) for depth without
  heaviness.
- The color palette and component styles MUST be defined as
  design tokens (CSS variables or theme config) so they can
  be updated in one place.

#### Forms & Interactions

- Forms MUST use inline validation with clear error messages
  -- never submit and reload to show errors.
- Primary action buttons MUST be visually prominent; secondary
  and destructive actions MUST be clearly differentiated by
  style (outlined or ghost for secondary; red or with warning
  icon for destructive).
- All destructive actions (delete, unwind deal, void RO) MUST
  require explicit confirmation dialogs with a clear
  description of what will happen.
- Hover, focus, active, and disabled states MUST be defined
  for every interactive element -- no unstyled defaults.
- Drag-and-drop interactions (e.g. photo reorder) MUST
  provide visible drag handles and drop-zone highlights.

#### Data Display

- Data tables MUST support sorting, filtering, column
  resizing, and keyboard navigation.
- Status values MUST be displayed as color-coded badges or
  chips (not plain text) using the semantic color palette.
- Dashboard widgets MUST show KPIs with at-a-glance
  readability: large, bold numbers; descriptive labels;
  color-coded trend indicators where applicable.
- Primary photos and thumbnails MUST use consistent aspect
  ratios (e.g. 16:9 or 4:3) with object-fit: cover to
  avoid distortion.

#### Responsiveness & Accessibility

- Mobile-responsive layouts MUST be provided for service
  advisors and sales consultants who use tablets on the lot
  and in the shop. Layouts MUST use CSS Grid or Flexbox;
  no fixed-width tables that overflow on small screens.
- Interactive elements MUST meet WCAG AA color contrast
  ratios (4.5:1 for normal text, 3:1 for large text).
- All images MUST have descriptive alt text.

#### Empty, Loading & Error States

- Empty states MUST include an illustrative icon or
  graphic, a descriptive heading, and a clear call to
  action where applicable (e.g. "No vehicles yet —
  Add your first vehicle").
- Loading states MUST use skeleton screens (not raw
  spinners) that match the shape of the content being
  loaded.
- Error boundaries MUST be implemented on every page;
  errors MUST show a friendly message with a retry
  action -- never a raw stack trace or blank screen.

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

**Version**: 1.1.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08

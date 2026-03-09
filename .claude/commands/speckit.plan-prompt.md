---
description: Generate a plan prompt MD file for the current feature and save it under prompts/plans/.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Read the current feature spec and produce a ready-to-paste plan prompt file (like the ones in `prompts/plans/`) that the user can hand to `/speckit.plan` with their tech-stack context pre-filled.

Execution steps:

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from repo root. Parse the JSON and extract:
   - `FEATURE_NUMBER` (e.g. `003`)
   - `FEATURE_SHORT_NAME` (e.g. `sales-deal-management`)
   - `FEATURE_DIR` (e.g. `specs/003-sales-deal-management`)
   - `FEATURE_SPEC` (path to `spec.md`)
   - If parsing fails, abort and instruct the user to verify their feature branch and re-run `/speckit.specify`.

2. Load and read `FEATURE_SPEC` in full.

3. Derive the human-readable feature title from the spec's top-level heading (e.g. `# Feature Specification: Sales Deal Management` → "Sales Deal Management").

4. Scan the existing files under `prompts/plans/` to understand the established format (e.g. `001-vehicle-inventory.md`, `002-crm.md`). Match that format exactly.

5. Using the spec content (functional requirements, user stories, data model, non-functional attributes, clarifications, and out-of-scope declarations), synthesise a concise but comprehensive plan prompt with these sections. Infer sensible defaults from the project constitution (`.specify/memory/constitution.md`) and the patterns in the other plan prompt files when the spec does not specify something explicitly.

   Required sections (use the same names as existing plan prompts):

   **Backend**
   - Framework, architecture style, modules introduced, ORM, database, key REST routes.
   - Highlight any notable domain constraints surfaced by the spec (state machines, calculation rules, concurrency rules, retention rules, etc.).
   - Call out any external integrations the spec describes.

   **Frontend**
   - UI library (inherit from prior features unless overridden), new pages/views, shared types.
   - Mention empty/loading/error state requirements from the spec.

   **Auth & Roles**
   - Roles relevant to this feature and their permission boundaries as specified.

   **Database**
   - New Prisma models, key fields, relationships, indexes, and any constraints (soft-delete, unique, non-deletable records, retention periods).

   **Quality**
   - Unit, integration, and E2E test requirements derived from the spec's acceptance scenarios.
   - Follow the constitution's test-first and API-first conventions.

   **Out of scope for this plan**
   - Copy directly from the spec's out-of-scope declarations. Add a note that prior feature modules (from earlier feature numbers) are reused but not redefined here.

   Close the prompt with: "Produce the implementation plan (plan.md), research.md if needed, data-model.md, and API contracts for this feature. Align with the spec's user stories and clarifications."

6. Determine the output file path:
   - `prompts/plans/{FEATURE_NUMBER}-{FEATURE_SHORT_NAME}.md`

7. Write the file with this exact structure:

   ```
   # Plan prompt: {FEATURE_NUMBER} {Feature Title}

   **Use with:** `/speckit.plan` — paste the content below into the command.

   **Spec:** [specs/{FEATURE_NUMBER}-{FEATURE_SHORT_NAME}/spec.md](../../specs/{FEATURE_NUMBER}-{FEATURE_SHORT_NAME}/spec.md)

   ---

   Create the technical implementation plan for the **{FEATURE_NUMBER}-{FEATURE_SHORT_NAME}** feature. Follow the project constitution (`.specify/memory/constitution.md`) and this tech stack:

   {synthesised sections}

   Produce the implementation plan (plan.md), research.md if needed, data-model.md, and API contracts for this feature. Align with the spec's user stories and clarifications.
   ```

8. Report completion:
   - Confirm the file was written and display its path as a clickable link.
   - Show a brief summary of what was generated (sections included, notable constraints captured).
   - Suggest the next step: copy the file content and run `/speckit.plan`.

Behavior rules:

- Do not invent tech-stack choices that contradict the spec or constitution. When the spec is silent, inherit from the most recent prior feature (e.g., NestJS, Prisma, React, Material UI or Ant Design).
- Keep the output focused and non-redundant. The goal is a dense, actionable briefing — not a prose summary of the spec.
- If the spec has no clarifications yet, note that clarification was skipped and recommend running `/speckit.clarify` first for better output quality.
- Never create the file if the spec is missing; instruct the user to run `/speckit.specify` first.

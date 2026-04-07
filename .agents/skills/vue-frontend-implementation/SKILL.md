---
name: vue-frontend-implementation
description: Implement or modify Vue 3 + TypeScript frontend code in InvitaSR when the task affects public pages, onboarding flows, session/auth state, route guards, API services, backoffice views, reusable UI components, layouts, or styling tokens. Use this skill for real frontend implementation work in this repository. Do not use it for backend-only changes, pure copy review, or broad product discussion with no code changes.
---

# Vue Frontend Implementation

## Goal

Use this skill when a task requires real frontend implementation in the InvitaSR Vue application.

This skill keeps changes aligned with:
- repository `AGENTS.md`
- `AI_CONTEXT.md`
- `CLAUDE.md`
- the current Vue 3 + Pinia + Router architecture
- public conversion goals
- onboarding continuity
- backoffice maintainability

---

## Use when

Use this skill when the task involves one or more of these:

- creating or updating Vue pages
- changing reusable components
- adjusting route structure or guards
- implementing or updating API services
- wiring forms, tables, modals, or list/detail flows
- changing session or auth-driven UI state
- refining responsive UI while preserving product intent
- integrating frontend behavior with documented backend endpoints

---

## Do not use when

Do not use this skill when the task is mainly:

- backend-only API work
- pure copywriting with no code changes
- audit-only UX critique
- pricing or monetization analysis without frontend implementation

Use a more specific skill when the task is mainly contract review, onboarding flow review, copy review, or landing conversion audit.

---

## Repository anchors

Start from the concrete frontend surfaces already present in the repo:

- `src/router/index.ts`
- `src/stores/session.ts`
- `src/services/http.ts`
- `src/services/*.ts`
- `src/pages/public/*`
- `src/pages/backoffice/*`
- `src/layouts/*`
- `src/components/ui/*`
- `src/components/public/*`
- `src/components/auth/*`
- `src/config/backofficeModules.ts`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `InvitaSR.postman_collection.json`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Understand the business surface first

Before editing, identify:
- whether the task is public, onboarding, authenticated client, or backoffice
- what user outcome should improve
- whether the change affects conversion, plan access, clarity, or maintainability

Do not start coding from component shape alone.

---

### 2. Trace route, state, and data together

Inspect the full path:
- route entry
- page component
- child components
- service calls
- session or route-guard dependencies

Frontend bugs in this repo often come from mismatches across those layers, not from one file in isolation.

---

### 3. Keep API normalization in services

When the backend payload is inconsistent or flexible:
- normalize in `src/services/*`
- keep pages and components simpler
- avoid scattering payload fallbacks across the UI

Prefer typed service helpers over repeating raw `fetch` assumptions in views.

---

### 4. Respect existing UI patterns

Prefer current patterns already present in the codebase:
- `BaseButton` and `BaseModal`
- toast helpers from `src/utils/toast.ts`
- route meta and router guards
- local reactive form state for pages with forms and modals
- shared tokens and base styles instead of ad hoc styling

Do not introduce a new local pattern unless the current one is clearly failing.

---

### 5. Make plan and access logic explicit

InvitaSR is plan-sensitive.

When a change touches:
- plan selection
- client plan state
- active plan requirements
- master vs client routes
- tenant activity

make the access behavior explicit in code and in your summary. Do not hide plan logic inside visual conditionals without naming the business reason.

---

### 6. Verify with the real frontend checks

When feasible, validate with:
- `npm run type-check`
- `npm run lint`
- `npm run build`

If a check is skipped or blocked, say so explicitly.

---

## InvitaSR-specific heuristics

### Value should feel visible
If a change adds complexity but the user does not perceive more value, prefer the simpler implementation.

### Public experience is not generic SaaS chrome
Landing and onboarding should feel emotional, premium, and clear, not like a cold admin product.

### Backoffice should optimize clarity
Master flows are operational. Favor filters, status visibility, and predictable actions over decorative complexity.

### Separate contract risk from UI risk
If the task depends on uncertain backend behavior, use `frontend-api-contract-review` rather than hardcoding assumptions in the UI.

---

## Suggested response structure

When using this skill, prefer:

1. short diagnosis
2. implementation decision
3. files or areas changed
4. verification
5. backend impact if any

Keep it concrete.

---

## Definition of success

This skill has succeeded when:
- the frontend change solves the requested problem
- the implementation matches existing repo structure
- plan, auth, and routing behavior remain coherent
- API assumptions stay centralized enough to maintain
- the change improves UX, conversion, or operational clarity without unnecessary complexity

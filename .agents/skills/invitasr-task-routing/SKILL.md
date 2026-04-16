---
name: invitasr-task-routing
description: Classify any non-trivial InvitaSR frontend request before implementation to choose the right repo skills, agent ownership, orchestrator path, and delegation strategy. Use this skill at the start of feature work, bug fixes, reviews, and refactors when the prompt describes the product problem but does not explicitly say which skills or agents should own it.
---

# InvitaSR Task Routing

## Goal

Use this skill first when the request is about working on the InvitaSR frontend and the main challenge is deciding how to route the task before editing code.

This skill protects:
- correct business-surface classification
- minimal but sufficient skill activation
- clearer agent ownership
- explicit backend contract risk
- incremental feature delivery without scattered decisions

---

## Context priority

When this skill is active, read context in this order:

1. `AGENTS.md`
2. `../docs/customer-language-policy.md` when the task touches visible text, UX states, onboarding, checkout, or customer messaging
3. `.codex/ROUTING.md`
4. `AI_CONTEXT.md`
5. `CLAUDE.md`
6. `InvitaSR.postman_collection.json` when the task touches API behavior

---

## Default workflow

### 1. Classify the primary business surface

Pick one primary surface first:

- public growth
- public onboarding
- auth and access
- master backoffice
- shared frontend implementation
- cross-cutting UX or copy review

If the task spans several surfaces, identify one primary owner and list the secondary risks explicitly.

### 2. Choose the orchestrator path

Use this routing:

- `public-growth-orchestrator` when public conversion, plans, landing, or onboarding intent is the main surface
- `backoffice-delivery-orchestrator` when master operations, CRUD, filters, or operational clarity dominate
- `frontend-product-orchestrator` when the task is generic frontend implementation, auth-sensitive, contract-sensitive, or cross-surface

If in doubt, fall back to `frontend-product-orchestrator`.

### 3. Choose the primary agent

Assign one primary owner:

- `conversion-strategist` for hero, pricing, CTA hierarchy, value framing, and trust-building copy
- `frontend-builder` for Vue implementation across pages, components, layouts, routes, stores, and services
- `integration-guardian` for auth/session, payload assumptions, status handling, checkout responses, and route guards
- `backoffice-operator` for master modules, lists, filters, detail views, and operational actions

Use one primary agent, not several equal owners.

### 4. Activate only the necessary repo skills

Use this mapping:

- public landing or pricing:
  `landing-conversion-audit`
  `copy-surface-review` when text matters
  `ux-ui-product-audit` when the issue is broader than copy
  `vue-frontend-implementation` only if code changes are requested

- public onboarding or checkout:
  `onboarding-frontend-flow`
  `vue-frontend-implementation`
  `frontend-api-contract-review` if payloads, redirects, or checkout responses are risky
  `copy-surface-review` when helper text, toasts, empty states, or status messages are affected

- auth, session, guards, or plan-gated access:
  `auth-session-access-review`
  `frontend-api-contract-review`
  `vue-frontend-implementation` if code changes are required
  `copy-surface-review` when the customer will read auth or access messages

- master backoffice:
  `backoffice-master-operations`
  `vue-frontend-implementation`
  `frontend-api-contract-review` when filters, sorting, pagination, or statuses may drift from backend behavior

- cross-cutting product UX:
  `ux-ui-product-audit`
  `copy-surface-review` when wording is part of the friction
  `vue-frontend-implementation` only if the task includes implementation

Prefer one primary skill plus up to two supporting skills.

### 5. Add customer-language review when wording is visible

If the task affects text shown to clients or guests:

- check whether the wording leaks internal SaaS jargon
- translate technical language into everyday language
- make the next action obvious
- preserve trust, perceived value, and clarity

Do not ship visible text that assumes the user understands terms like `tenant`, `webhook`, `payload`, `middleware`, or similar internal concepts.

### 6. Decide whether delegation is real or conceptual

Use real subagents only when all of these are true:

- the environment supports delegation
- the user explicitly asked for delegation or subagents, or the active runtime authorizes it
- the task can be split into disjoint ownership slices

If those conditions are not met, keep the work local but preserve the same ownership model in the plan:

- primary owner
- secondary review surface
- backend impact check

Never split work into overlapping write scopes.

### 7. Plan first when risk is multi-surface

Produce an explicit plan before coding when the task:

- affects multiple modules
- touches monetization, plans, or permissions
- changes frontend/backend assumptions
- mixes UX, copy, and implementation
- is ambiguous enough that the wrong owner would waste time

### 8. Report the routing decision

Before substantial work, make the routing visible:

- primary surface
- primary agent
- selected skills
- whether delegation is real or conceptual
- backend repo impact if any
- whether customer-language policy applies

## Definition of success

This skill has succeeded when:
- the task is classified quickly and correctly
- the active skills are minimal and relevant
- agent ownership is clear
- backend contract risk is explicit
- the repo can be evolved feature by feature without re-deciding the same routing logic each time

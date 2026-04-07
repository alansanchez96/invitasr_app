# InvitaSR Routing Rules

Apply these rules to any non-trivial request in this repo.

## 1. Initial classification

Choose one primary surface first:

- `public-growth`: home, pricing, hero, CTA, FAQ, trust, plan comparison
- `public-onboarding`: plan or template selection, registration, draft persistence, checkout, post-login continuity
- `auth-access`: login, logout, `me`, cookie vs token, guards, redirects, tenant status, active plan
- `backoffice-master`: `/master` modules, lists, filters, tables, modals, operator actions
- `shared-frontend`: shared components, layouts, router, stores, services, styling
- `ux-copy-cross`: flow clarity, states, microcopy, visual hierarchy

If several surfaces are involved, choose one primary owner and treat the others as secondary risks.

## 2. Default orchestrator

- `public-growth-orchestrator` for public growth and commercial onboarding
- `backoffice-delivery-orchestrator` for master backoffice work
- `frontend-product-orchestrator` for general implementation, auth, contract-sensitive work, or multi-surface work

If there is doubt, use `frontend-product-orchestrator`.

## 3. Primary agent

- `conversion-strategist` for public conversion, perceived value, CTAs, and copy
- `frontend-builder` for Vue implementation across pages, components, routes, stores, services, and layouts
- `integration-guardian` for auth/session, payloads, filters, status handling, and integration risk
- `backoffice-operator` for operational UX and master modules

Choose one primary owner.

## 4. Minimum skills required

- `public-growth`:
  `landing-conversion-audit`
  `copy-surface-review` when wording matters
  `ux-ui-product-audit` when the issue is about flow or hierarchy
  `vue-frontend-implementation` only if code changes are needed

- `public-onboarding`:
  `onboarding-frontend-flow`
  `vue-frontend-implementation`
  `frontend-api-contract-review` if checkout, redirects, or payloads are risky

- `auth-access`:
  `auth-session-access-review`
  `frontend-api-contract-review`
  `vue-frontend-implementation` if implementation is required

- `backoffice-master`:
  `backoffice-master-operations`
  `vue-frontend-implementation`
  `frontend-api-contract-review` when filters, pagination, sorting, or statuses depend on backend behavior

- `ux-copy-cross`:
  `ux-ui-product-audit`
  `copy-surface-review` when friction is largely textual
  `vue-frontend-implementation` only if implementation is part of the task

- `shared-frontend`:
  `vue-frontend-implementation`
  `invitation-template-frontend` when the task affects template registry, manifests, preview routes, or event-specific template folders
  `frontend-api-contract-review` if template rendering depends on backend payload semantics

Prefer one primary skill and up to two supporting skills.

## 5. Subagent policy

Use real subagents only if:

- the session/runtime allows delegation
- the user explicitly asked for delegation or the runtime authorizes it
- the work can be split into disjoint write scopes

Otherwise keep the routing conceptual in one flow:

- primary owner
- secondary review surface
- explicit backend impact check

## 6. When to plan first

Plan before editing when there is:

- work across multiple modules
- monetization, plans, or permissions
- frontend/backend contract change
- a mix of UX, copy, and implementation
- relevant ambiguity

## 7. Cross-repo impact rule

If a change affects shared payloads, naming, statuses, authentication, filters, or validations, state the backend repo impact explicitly.

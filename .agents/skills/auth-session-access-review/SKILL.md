---
name: auth-session-access-review
description: Implement or review frontend authentication, session persistence, and access rules in InvitaSR whenever a task touches login, logout, me, token vs cookie mode, route guards, master vs client routing, tenant activity checks, or plan-required redirects. Use this skill for auth-sensitive frontend work. Do not use it for backend auth implementation or purely visual changes with no access-state impact.
---

# Auth Session Access Review

## Goal

Use this skill when a frontend task affects who can enter, how the session is stored, or where the user should be routed inside InvitaSR.

This skill protects:
- session persistence correctness
- cookie vs token behavior
- route guard clarity
- master vs client access separation
- tenant activity handling
- plan-required redirects

---

## Use when

Use this skill when the task touches one or more of these:

- `src/stores/session.ts`
- `src/services/http.ts`
- `src/router/index.ts`
- `src/components/auth/*`
- login/logout screens or session-driven menus
- auth-sensitive onboarding continuation
- redirects based on `client_plan` or tenant status

---

## Do not use when

Do not use this skill when the task is mainly:

- backend auth logic
- marketing or copy
- generic CRUD work unrelated to access state
- purely visual layout changes

---

## Repository anchors

Start from:

- `src/stores/session.ts`
- `src/services/http.ts`
- `src/router/index.ts`
- `src/components/auth/AuthForm.vue`
- `src/components/auth/AuthProviders.vue`
- `src/components/public/navbar/PublicAccountMenu.vue`
- `src/pages/public/PublicCommercialOnboarding.vue`
- `InvitaSR.postman_collection.json`
- `CLAUDE.md`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Identify the access boundary

State clearly:
- whether the user is public, authenticated client, or master
- whether the route requires auth, master access, client access, or active plan
- which payload fields determine that access

Do not edit guards before the boundary is explicit.

---

### 2. Separate authentication from authorization

Check both questions separately:
- authentication: do we have a valid session
- authorization: should this user be allowed on this route

Avoid hiding authorization decisions inside weak auth checks.

---

### 3. Review storage and transport mode

Verify whether the frontend is operating in:
- `token` mode
- `cookie` mode

Check that:
- token persistence matches remember behavior
- cookie mode uses `credentials: include`
- `me` hydration or refresh logic matches route needs
- logout clears local state safely even if the backend request fails

---

### 4. Review session payload assumptions

Treat these fields as contract-sensitive:
- `contextEncrypt`
- `tenant.status`
- `client_plan.has_plan`
- `client_plan.has_active_plan`
- `client_plan.plan_status`
- `client_plan.plan`

If routing depends on them, keep those assumptions explicit.

---

### 5. Review failure behavior

Check:
- unauthenticated route access
- stale session
- inactive tenant
- missing active plan
- failed refresh in cookie mode

The redirect or recovery behavior should feel intentional, not accidental.

---

## InvitaSR-specific heuristics

### Master and client are different products
The backoffice and the client panel are different trust zones. Keep that separation visible in routing and UI assumptions.

### Cookie mode is first-class here
The Postman collection emphasizes cookie-based auth. Do not assume bearer-token-only behavior when working in this repo.

### Plan access is part of authorization
For client routes, active plan state is not a cosmetic detail. It is part of whether the user should continue.

---

## Suggested response structure

When using this skill, prefer:

1. auth or access surface affected
2. current session mode and route logic
3. risk or intended change
4. contract impact
5. verification

Keep it concrete.

---

## Definition of success

This skill has succeeded when:
- session behavior is coherent for the configured auth mode
- route access rules are explicit
- master vs client boundaries remain clear
- tenant and plan state handling stay predictable
- auth regressions are less likely

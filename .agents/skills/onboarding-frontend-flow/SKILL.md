---
name: onboarding-frontend-flow
description: Implement or review the InvitaSR public onboarding and checkout flow whenever a task spans landing plan selection, template selection, registration, profile completion, session continuity, checkout initiation, or post-login continuation into the client panel. Use this skill for cross-surface work across plans, onboarding pages, session state, and public onboarding services. Do not use it for isolated backoffice CRUD or generic landing copy tasks.
---

# Onboarding Frontend Flow

## Goal

Use this skill when the task affects the conversion-critical path that turns a visitor into an authenticated customer ready to pay or continue using the product.

This skill protects:
- plan selection continuity
- onboarding draft persistence
- low-friction registration
- checkout readiness
- post-auth routing clarity
- visible value before payment

---

## Use when

Use this skill when the task touches one or more of these:

- `src/pages/public/PlansPage.vue`
- `src/pages/public/PublicCommercialOnboarding.vue`
- `src/pages/public/PublicOnboarding.vue`
- `src/components/public/PlanAcquisitionModal.vue`
- `src/components/auth/*`
- `src/services/publicOnboarding.ts`
- `src/services/onboardings.ts`
- `src/stores/session.ts`
- public onboarding route behavior
- checkout CTA logic

---

## Do not use when

Do not use this skill when the task is mainly:

- backoffice-only admin work
- generic visual polish unrelated to onboarding
- backend payment implementation
- pure copy review with no flow impact

---

## Repository anchors

Start from:

- `src/pages/public/PlansPage.vue`
- `src/pages/public/PublicCommercialOnboarding.vue`
- `src/pages/public/PublicOnboarding.vue`
- `src/services/publicOnboarding.ts`
- `src/services/onboardings.ts`
- `src/stores/session.ts`
- `src/router/index.ts`
- `src/components/auth/AuthForm.vue`
- `src/components/auth/AuthProviders.vue`
- `InvitaSR.postman_collection.json`
- `AI_CONTEXT.md`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Map the user stages first

Lay out the actual flow before editing:
- landing or plans discovery
- plan and template choice
- registration or OAuth intent
- profile confirmation
- checkout
- return to authenticated state or dashboard

Do not treat onboarding as one generic screen.

---

### 2. Protect continuity between steps

Check where state is carried through:
- query params
- session storage draft
- authenticated session
- onboarding profile payload

If a change breaks continuity between steps, it is a serious conversion risk even if the page still renders.

---

### 3. Respect product rules from `AI_CONTEXT.md`

Keep visible business intent in mind:
- template choice can constrain plan expectations
- there are paid and gift-style branches
- the user should perceive value before paying
- the MVP is wedding-first but the UI must not block future event types

If the frontend flow hides or contradicts those rules, call it out.

---

### 4. Keep checkout readiness explicit

Before enabling payment or next-step actions, make sure the UI clearly knows:
- whether the required registration data exists
- whether plan selection is valid
- whether template selection is optional or required in that branch
- what the next action is if data is incomplete

Prefer explicit readiness checks over optimistic redirects.

---

### 5. Review failure states as carefully as the happy path

Check:
- missing onboarding profile
- expired or absent onboarding state
- invalid draft data
- missing checkout URL
- backend validation errors
- route redirection when the user loses the required state

Conversion flows fail in edge cases more often than in the happy path.

---

## InvitaSR-specific heuristics

### Plan choice is not just a pricing step
It shapes the rest of the flow and can affect expectations around templates and access.

### Draft state is product-critical
If draft persistence breaks, the flow feels unreliable to non-technical users.

### Friction must stay low
When two correct implementations exist, prefer the one that makes the next action obvious for the user.

### Backend coordination may be required
If the frontend needs fields or statuses that the backend does not expose clearly, mention the cross-repo impact instead of burying the mismatch in UI workarounds.

---

## Suggested response structure

When using this skill, prefer:

1. onboarding stage affected
2. continuity or conversion risk
3. implementation or review decision
4. contract impact
5. verification notes

Keep it practical.

---

## Definition of success

This skill has succeeded when:
- the public onboarding path stays coherent end to end
- required data survives between steps
- checkout readiness is explicit
- user friction stays low
- backend dependencies are called out clearly when needed

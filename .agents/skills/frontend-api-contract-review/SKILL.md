---
name: frontend-api-contract-review
description: Review or protect frontend integration with the InvitaSR API whenever a task depends on or may be broken by request payloads, response payloads, auth/session shapes, filters, pagination, sorting, status values, onboarding responses, checkout responses, or other backend-visible contract details. Use this skill for service-layer review, integration-sensitive frontend work, and before or after implementation when backend compatibility matters. Do not use it for pure visual work with no API dependency.
---

# Frontend API Contract Review

## Goal

Use this skill when the frontend task is sensitive to backend contract details documented in the repo or inferred from current services.

This skill protects:
- request compatibility
- response compatibility
- auth/session expectations
- filter and pagination correctness
- stable onboarding and checkout integration
- visibility of backend repo impact

---

## Use when

Use this skill when the task touches one or more of these:

- `src/services/*`
- typed payload mapping
- `session.ts` auth payload expectations
- list filters, sorting, or pagination
- onboarding or checkout responses
- status or enum handling in UI
- query param construction
- route decisions based on backend session data
- fallback mapping for inconsistent payloads

---

## Do not use when

Do not use this skill when the task is mainly:

- copywriting
- layout or styling only
- purely local component state with no backend dependency
- backend implementation itself

---

## Repository anchors

Start from these files:

- `InvitaSR.postman_collection.json`
- `src/services/http.ts`
- `src/services/onboardings.ts`
- `src/services/publicOnboarding.ts`
- `src/services/clients.ts`
- `src/services/users.ts`
- `src/services/plans.ts`
- `src/services/features.ts`
- `src/services/planFeatures.ts`
- `src/services/typeEvents.ts`
- `src/services/payments.ts`
- `src/services/subscriptions.ts`
- `src/stores/session.ts`
- `src/router/index.ts`

Also inspect the consuming page before changing the service contract assumptions.

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Identify the contract surface

State clearly:
- which endpoint is involved
- which frontend service wraps it
- which page or store consumes it
- whether the risk is request-side, response-side, auth-side, or pagination-side

---

### 2. Compare Postman, service mapping, and UI usage

Check three layers together:
- current Postman documentation
- current normalization logic in `src/services/*`
- current UI assumptions in pages or stores

Do not trust only one of those layers when they disagree.

---

### 3. Review request compatibility

Check whether the task affects:
- field names
- required vs optional inputs
- query param names
- filter names
- sorting fields
- credentials mode for the request

If the UI is about to send a different shape than the documented one, call that out explicitly.

---

### 4. Review response compatibility

Check whether the task depends on:
- field names
- nested objects
- fallback aliases
- pagination keys
- status values
- auth payload fields such as `client_plan` or `tenant.status`

If the service currently hides backend inconsistency, preserve that intentionally or clean it up consciously.

---

### 5. Review auth and session semantics

For auth-sensitive endpoints, verify:
- cookie vs token expectations
- `credentials: include` behavior
- `me`, `login`, and `logout` payload assumptions
- master vs client session interpretation
- inactive tenant handling

Treat auth/session shape as contract-sensitive frontend data, not just implementation detail.

---

### 6. Classify compatibility

Be explicit about the outcome:

- fully compatible
- compatible with frontend service update
- requires coordinated frontend/backend change
- likely breaking

---

## InvitaSR-specific heuristics

### Postman is the first integration source of truth
When current code and Postman differ, verify the intent before expanding the mismatch.

### Service normalization is strategic here
This repo already tolerates backend shape variance in service mappers. Use that layer deliberately rather than duplicating fallback logic in the UI.

### Call out cross-repo impact
InvitaSR frontend and backend live in separate repos. If a frontend task reveals a backend contract gap, state it clearly.

---

## Suggested response structure

When using this skill, prefer:

1. endpoint or service surface affected
2. current vs expected contract
3. compatibility decision
4. frontend change needed
5. backend repo impact if any

Keep it concrete.

---

## Definition of success

This skill has succeeded when:
- the risky contract surface is identified clearly
- request and response assumptions are deliberate
- auth/session expectations stay predictable
- frontend/backend impact is explicit
- integration regressions are less likely

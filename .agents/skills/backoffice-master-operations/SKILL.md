---
name: backoffice-master-operations
description: Implement or review InvitaSR backoffice master screens whenever a task affects admin list filters, table sorting and pagination, detail panels, create/edit modals, status actions, or navigation for clients, users, onboardings, plans, features, plan-features, event types, payments, or subscriptions. Use this skill for master-only operational frontend work. Do not use it for public landing or client-facing invitation flows.
---

# Backoffice Master Operations

## Goal

Use this skill when working on the administrative side of InvitaSR, where the priority is operational clarity, reliable data handling, and alignment with master endpoints.

This skill protects:
- filter and pagination correctness
- CRUD flow clarity
- detail-panel coherence
- master-only access assumptions
- alignment with documented API list behaviors

---

## Use when

Use this skill when the task touches one or more of these:

- `src/pages/backoffice/*`
- `src/services/clients.ts`
- `src/services/users.ts`
- `src/services/onboardings.ts`
- `src/services/plans.ts`
- `src/services/features.ts`
- `src/services/planFeatures.ts`
- `src/services/typeEvents.ts`
- `src/services/payments.ts`
- `src/services/subscriptions.ts`
- `src/config/backofficeModules.ts`
- master route entries in `src/router/index.ts`

---

## Do not use when

Do not use this skill when the task is mainly:

- public marketing pages
- public onboarding
- backend-only CRUD work
- generic copy review

---

## Repository anchors

Start from:

- `src/pages/backoffice/BackofficeClients.vue`
- `src/pages/backoffice/BackofficeUsers.vue`
- `src/pages/backoffice/BackofficeOnboarding.vue`
- `src/pages/backoffice/BackofficePlans.vue`
- `src/pages/backoffice/BackofficeFeatures.vue`
- `src/pages/backoffice/BackofficePlanFeatures.vue`
- `src/pages/backoffice/BackofficeEventTypes.vue`
- `src/pages/backoffice/BackofficePayments.vue`
- `src/pages/backoffice/BackofficeSubscriptions.vue`
- `src/config/backofficeModules.ts`
- `src/router/index.ts`
- `InvitaSR.postman_collection.json`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Identify the module and operational goal

Before editing, define:
- which master module is affected
- whether the task is list, detail, create, update, cancel, resend, or read-only inspection
- which status or business rule matters to the operator

Backoffice work should optimize decision-making speed, not just component rendering.

---

### 2. Match list behavior to the documented API

For list screens, verify:
- filter names
- pagination params
- sorting field names
- default ordering
- detail fetch behavior

The Postman collection already documents list sorting and filter patterns. Reuse those expectations deliberately.

---

### 3. Keep detail and action states coherent

If the screen supports selection plus action:
- make sure selected detail matches the current row
- reset stale detail state when needed
- keep action availability consistent with status
- use explicit success and error toasts

Operator confidence depends on predictable state transitions.

---

### 4. Prefer normalized services over page-specific parsing

If the API shape is flexible:
- normalize in the service
- keep the page focused on UI logic
- avoid repeating transformation logic across multiple backoffice modules

---

### 5. Preserve master semantics

These screens are master-only.

When a task touches:
- user management
- onboarding creation
- plan and feature configuration
- payment or subscription visibility

keep the business semantics explicit. Do not flatten product meaning into generic CRUD labels if a more precise domain term already exists.

---

## InvitaSR-specific heuristics

### Operational clarity beats decoration
The admin area should feel fast, legible, and trustworthy.

### Onboarding is a revenue surface
Backoffice onboarding is not just CRUD. It directly supports activation and conversion.

### Payments and subscriptions are not symmetric
Respect read-only vs mutable surfaces and the differences between one-time and subscription logic.

### Cross-repo impact still matters
If a backoffice UI task reveals a mismatch in backend filters or payloads, mention the backend repo impact explicitly.

---

## Suggested response structure

When using this skill, prefer:

1. module affected
2. operational risk or objective
3. implementation decision
4. contract impact if any
5. verification

Keep it practical.

---

## Definition of success

This skill has succeeded when:
- the admin flow is easier to operate
- list, detail, and action states are coherent
- API filters and sorting remain aligned
- domain terminology stays clear
- the backoffice becomes easier to scale without turning generic

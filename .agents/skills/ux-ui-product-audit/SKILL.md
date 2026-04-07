---
name: ux-ui-product-audit
description: Audit the overall InvitaSR product UX/UI whenever a task spans screen hierarchy, responsiveness, feedback states, onboarding clarity, backoffice usability, accessibility, or visual consistency across public and authenticated surfaces. Use this skill for product-facing review work. Do not use it for backend-only tasks or trivial copy tweaks.
---

# UX UI Product Audit

## Goal

Use this skill when the task is mainly about evaluating or improving the quality of the user experience across screens, not only one string or one endpoint.

This skill protects:
- hierarchy and scanability
- responsive behavior
- loading, empty, and error state quality
- consistency between public and operational surfaces
- product clarity for non-technical users

---

## Use when

Use this skill when the task touches one or more of these:

- overall flow clarity
- page hierarchy
- component consistency
- empty and loading states
- modal and form ergonomics
- mobile behavior
- accessibility or readability concerns
- cross-screen product coherence

---

## Do not use when

Do not use this skill when the task is mainly:

- backend implementation
- a pure copy rewrite
- an isolated API contract question
- a trivial style tweak with no UX implication

---

## Repository anchors

Start from:

- `src/layouts/PublicLayout.vue`
- `src/layouts/PanelLayout.vue`
- `src/layouts/BackofficeLayout.vue`
- `src/pages/public/*`
- `src/pages/backoffice/*`
- `src/components/ui/*`
- `src/components/public/*`
- `src/components/auth/*`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `AGENTS.md`
- `AI_CONTEXT.md`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Define the journey being audited

State which journey matters:
- first-time public visitor
- prospect comparing plans
- user completing onboarding
- master operator in backoffice
- authenticated client entering the panel

The right UX standard depends on the journey.

---

### 2. Audit clarity before style

Check whether the user can quickly answer:
- where am I
- what should I do next
- what matters most on this screen
- what happens if I take the primary action

If those answers are weak, hierarchy has priority over visual polish.

---

### 3. Review all key states

Do not evaluate only the default state.

Check:
- loading
- empty
- success
- validation error
- backend error
- disabled or gated state

These states shape trust more than perfect static mockups.

---

### 4. Review responsive behavior intentionally

For important screens, assess:
- content density on mobile
- tap target clarity
- CTA persistence
- table or detail behavior on narrower widths
- modal usability on small screens

---

### 5. Preserve brand fit

InvitaSR should feel:
- elegant
- modern
- emotional
- close and human
- clear

Avoid recommendations that make it look like a generic enterprise admin or a cluttered template marketplace.

---

## InvitaSR-specific heuristics

### Public and backoffice should not feel identical
They share brand coherence, but they solve different jobs and should optimize for different user emotions.

### Simplicity is a product feature
If a screen needs too much explanation, the UX is probably doing too much or sequencing poorly.

### Plan and payment context matters
When access, plan restrictions, or payment state appear in the UI, clarity and trust are more important than decorative novelty.

---

## Suggested response structure

When using this skill, prefer:

1. journey audited
2. primary UX issue
3. recommended change
4. expected user or business impact
5. remaining risk

Keep it focused on findings and action.

---

## Definition of success

This skill has succeeded when:
- the user journey is easier to understand
- important states are intentional
- mobile behavior is accounted for
- the product feels more coherent and trustworthy
- complexity does not grow without visible value

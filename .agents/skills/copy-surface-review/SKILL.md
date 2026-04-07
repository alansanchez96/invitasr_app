---
name: copy-surface-review
description: Review or rewrite user-facing copy in InvitaSR whenever a task touches headlines, CTAs, plan descriptions, onboarding microcopy, trust signals, helper text, empty states, error messages, toasts, or other visible product text. Use this skill to improve clarity, perceived value, trust, and conversion. Do not use it for backend tasks or layout work with no copy implications.
---

# Copy Surface Review

## Goal

Use this skill when text quality is part of the product problem, not just a final cosmetic layer.

This skill protects:
- clarity
- human tone
- trustworthy messaging
- plan differentiation
- lower user friction
- conversion support without hype

---

## Use when

Use this skill when the task touches one or more of these:

- hero headlines
- CTA labels
- plan and feature descriptions
- onboarding helper text
- form validation guidance
- modal copy
- empty states
- toast messages
- FAQ wording
- backoffice helper text that must stay clear for operators

---

## Do not use when

Do not use this skill when the task is mainly:

- backend implementation
- API contract review
- pure visual redesign with unchanged text
- architecture discussion

---

## Repository anchors

Start from:

- `src/pages/public/HomePage.vue`
- `src/pages/public/PlansPage.vue`
- `src/pages/public/PublicCommercialOnboarding.vue`
- `src/pages/public/PublicOnboarding.vue`
- `src/pages/backoffice/*`
- `src/components/public/*`
- `src/components/auth/*`
- `src/utils/toast.ts`
- `AGENTS.md`
- `AI_CONTEXT.md`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Identify the user stage

Before rewriting text, define whether the user is:
- discovering the product
- comparing plans
- entering onboarding
- fixing a form issue
- completing an operational backoffice task

The right tone depends on the stage.

---

### 2. Lead with benefit, then clarity

Prefer text that answers:
- what do I gain
- why should I trust this
- what should I do next

But never sacrifice clarity for marketing tone.

---

### 3. Respect real business rules

When copy references:
- plans
- templates
- onboarding steps
- payment
- feature availability

make sure the wording matches the actual product rule. Do not promise universal access if the product is plan-gated.

---

### 4. Keep microcopy friction low

For helper text, validation, and toasts:
- be direct
- explain the next action
- avoid blame-heavy tone
- avoid generic error phrases when a clearer guidance exists

---

### 5. Preserve brand fit

InvitaSR copy should feel:
- elegant
- modern
- warm
- clear
- credible

Avoid exaggerated claims, aggressive sales language, or robotic wording.

---

## InvitaSR-specific heuristics

### Public copy must reduce hesitation
This product asks people to trust a digital invitation for an emotional event. Clarity and reassurance matter.

### Backoffice copy should reduce operator mistakes
Admin text can be shorter and more utilitarian, but it still needs to be explicit.

### Copy and UX are linked
If text is working too hard to explain the UI, the underlying flow may need revision as well. Say so when relevant.

---

## Suggested response structure

When using this skill, prefer:

1. surface affected
2. copy problem found
3. recommended rewrite or direction
4. business or UX reason

Keep it concrete.

---

## Definition of success

This skill has succeeded when:
- the wording is clearer and more human
- the next action feels more obvious
- perceived value is stronger without exaggeration
- plan and product rules remain truthful

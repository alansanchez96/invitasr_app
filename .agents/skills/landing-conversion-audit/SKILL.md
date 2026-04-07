---
name: landing-conversion-audit
description: Audit or improve the InvitaSR public landing and pricing surfaces whenever a task touches the home page, plans page, CTA hierarchy, hero messaging, social proof, template showcases, pricing framing, or mobile conversion flow. Use this skill for conversion-sensitive public UX work. Do not use it for isolated backend tasks or internal backoffice CRUD.
---

# Landing Conversion Audit

## Goal

Use this skill when the task is mainly about improving how the public experience converts visitors into plan selection or onboarding intent.

This skill protects:
- clear CTA hierarchy
- premium but approachable positioning
- visible value before payment
- objection handling
- mobile conversion quality

---

## Use when

Use this skill when the task touches one or more of these:

- `src/pages/public/HomePage.vue`
- `src/pages/public/PlansPage.vue`
- `src/components/public/PublicNavbar.vue`
- `src/components/public/PublicFooter.vue`
- `src/components/public/MobileCtaBar.vue`
- `src/components/public/PlanAcquisitionModal.vue`
- hero sections, social proof, benefits, FAQ, pricing, or plan comparison

---

## Do not use when

Do not use this skill when the task is mainly:

- backend API work
- backoffice operations
- auth or route guard internals
- purely technical refactors with unchanged public UX

---

## Repository anchors

Start from:

- `src/pages/public/HomePage.vue`
- `src/pages/public/PlansPage.vue`
- `src/components/public/PublicNavbar.vue`
- `src/components/public/PublicFooter.vue`
- `src/components/public/MobileCtaBar.vue`
- `src/components/public/PlanAcquisitionModal.vue`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/assets/img/hero/*`
- `AGENTS.md`
- `AI_CONTEXT.md`

---

## Default workflow

When this skill is active, follow this sequence.

### 1. Identify the primary conversion action

Before proposing changes, decide what the screen should push the user toward:
- exploring plans
- starting onboarding
- understanding the product faster
- trusting the brand enough to continue

If the page asks for too many next steps, conversion weakens.

---

### 2. Audit the first screen first

Check whether the hero answers quickly:
- what InvitaSR is
- why it is valuable
- who it is for
- what action the user should take next

If those answers are blurry, fix that before polishing lower sections.

---

### 3. Balance emotion, clarity, and proof

The public surface should feel:
- elegant
- modern
- emotionally resonant
- easy to trust

But it must also answer practical objections:
- is it easy
- is it fast
- will it look professional
- what do I get before paying

---

### 4. Review plan framing carefully

When pricing or plans are involved, check:
- whether differences between plans are understandable
- whether the recommended option is obvious when appropriate
- whether value is framed before technical detail
- whether naming or labels overpromise

Do not use generic pricing-table language if it weakens perceived value.

---

### 5. Review mobile conversion separately

Landing issues often hide on mobile:
- CTA visibility
- scroll fatigue
- oversized sections
- weak sticky actions
- unclear plan comparison

Audit mobile behavior intentionally rather than assuming desktop quality translates.

---

## InvitaSR-specific heuristics

### The product should feel emotional, not cold
This is an invitation product, not generic backoffice software marketed to consumers.

### Visible value before payment is strategic
Preview, clarity, and trust should appear early because the business model depends on reducing hesitation.

### Premium without friction
The experience should feel elevated, but never difficult or overloaded.

---

## Suggested response structure

When using this skill, prefer:

1. conversion surface affected
2. main friction found
3. highest-leverage recommendation or implementation
4. expected business impact
5. verification notes

Keep it concise and prioritized.

---

## Definition of success

This skill has succeeded when:
- the public page communicates value faster
- the next step is clearer
- objections feel reduced
- the brand feels more premium and trustworthy
- conversion friction is lower, especially on mobile

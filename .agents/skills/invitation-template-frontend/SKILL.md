---
name: invitation-template-frontend
description: Implement or evolve the InvitaSR invitation template system when work involves template registry, event-specific Vue templates, manifests, shared wedding blocks, preview routes, template metadata, or the boundary between reusable blocks and template-specific experiences. Use this skill for frontend template architecture and template implementation. Do not use it for isolated backoffice CRUD or generic marketing copy changes.
---

# Invitation Template Frontend

## Goal

Use this skill when the task is about how invitation templates are structured, rendered, previewed, or scaled inside the InvitaSR frontend.

This skill protects:
- clear separation between template code and template content
- `template_id` driven rendering
- maintainable Vue-based template implementation
- reuse of shared blocks without collapsing all templates into one giant renderer
- wedding-first execution without blocking future event types

## Use when

Use this skill when the task touches one or more of these:

- `src/templates/*`
- template registry and manifest files
- invitation preview routes
- event-specific template folders such as `wedding/template-42`
- shared invitation blocks
- mock template data used for local preview
- frontend architecture for selecting or rendering templates by `template_id`

## Default workflow

### 1. Separate code from configuration

Keep the template implementation in Vue files and keep metadata/content/config outside the component when possible.

Do not turn the database into a container for arbitrary frontend code.

### 2. Keep `template_id` as the runtime selector

A template should be loaded because the invitation or onboarding flow references a `template_id`.

Prefer a registry or loader layer over hardcoded branching across many pages.

### 3. Share blocks, not full experiences

Reuse section blocks like gallery, RSVP, schedule, or hero wrappers when it helps.

Do not force different templates through one mega-component if the visual experience should feel distinct.

### 4. Preserve event-type boundaries

Wedding templates may share blocks, but the folder structure should still leave room for future event families.

### 5. Keep previewing easy

A template system without a local preview surface slows down design and implementation. Prefer a preview route or sandbox page early.

## Definition of success

This skill has succeeded when:
- templates are rendered by `template_id`
- Vue code owns the visual experience
- shared blocks stay reusable without making templates feel identical
- future event types remain possible without a rewrite

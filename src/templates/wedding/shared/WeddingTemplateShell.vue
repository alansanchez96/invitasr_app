<script setup lang="ts">
defineProps<{
  accentLabel: string
}>()
</script>

<template>
  <article class="wedding-template-shell">
    <header class="wedding-template-shell__header">
      <span class="wedding-template-shell__eyebrow">{{ accentLabel }}</span>
      <slot name="hero" />
    </header>

    <div class="wedding-template-shell__body">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.wedding-template-shell {
  color: var(--text);
  border-radius: 36px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(240, 106, 166, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(251, 245, 255, 0.96));
  box-shadow: 0 28px 70px rgba(69, 30, 109, 0.16);
}

.wedding-template-shell__header {
  padding: 2rem 2rem 1.5rem;
}

.wedding-template-shell__eyebrow {
  display: inline-flex;
  margin-bottom: 1rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-purple);
  background: rgba(122, 79, 217, 0.12);
}

.wedding-template-shell__body {
  display: grid;
  gap: 1.5rem;
  padding: 0 2rem 2rem;
}

@media (max-width: 720px) {
  .wedding-template-shell__header,
  .wedding-template-shell__body {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}
</style>

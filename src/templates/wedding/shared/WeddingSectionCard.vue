<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section class="wedding-section-card">
    <header class="wedding-section-card__header">
      <p v-if="subtitle" class="wedding-section-card__subtitle">{{ subtitle }}</p>
      <h2 class="wedding-section-card__title">{{ title }}</h2>
    </header>
    <div class="wedding-section-card__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wedding-section-card {
  padding: 1.5rem;
  border: 1px solid rgba(122, 79, 217, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.86);
}

.wedding-section-card__header {
  margin-bottom: 1rem;
}

.wedding-section-card__subtitle {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-pink);
}

.wedding-section-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2vw, 2rem);
}

.wedding-section-card__content {
  color: var(--muted);
}
</style>

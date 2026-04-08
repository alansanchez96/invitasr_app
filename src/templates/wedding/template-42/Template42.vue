<script setup lang="ts">
import WeddingTemplateShell from '@/templates/wedding/shared/WeddingTemplateShell.vue'
import WeddingSectionCard from '@/templates/wedding/shared/WeddingSectionCard.vue'
import type { InvitationTemplateRendererProps } from '@/templates/types'

defineProps<InvitationTemplateRendererProps<'wedding'>>()
</script>

<template>
  <WeddingTemplateShell accent-label="Template 42 · Editorial romance">
    <template #hero>
      <div class="template-42-hero">
        <div>
          <p class="template-42-hero__kicker">{{ data.couple.headline }}</p>
          <h1 class="template-42-hero__title">{{ data.couple.brideName }} & {{ data.couple.groomName }}</h1>
          <p class="template-42-hero__meta">{{ data.event.date.label }} · {{ data.event.venue }} · {{ data.event.city }}</p>
        </div>
        <div class="template-42-hero__music">
          <span>Soundtrack sugerido</span>
          <strong>{{ data.music.title }} · {{ data.music.artist }}</strong>
        </div>
      </div>
    </template>

    <WeddingSectionCard title="Nuestra historia" subtitle="Narrativa">
      <div class="template-42-story">
        <article v-for="moment in data.story" :key="moment.title">
          <h3>{{ moment.title }}</h3>
          <p>{{ moment.description }}</p>
        </article>
      </div>
    </WeddingSectionCard>

    <div class="template-42-grid">
      <WeddingSectionCard title="Agenda del dia" subtitle="Momentos clave">
        <ul class="template-42-schedule">
          <li v-for="item in data.schedule" :key="item.id">
            <strong>{{ item.time }}</strong>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </li>
        </ul>
      </WeddingSectionCard>

      <WeddingSectionCard title="RSVP" subtitle="Integracion futura">
        <p>
          Este bloque queda preparado para conectar con <code>{{ data.rsvp.endpoint }}</code> y manejar confirmacion real
          por invitado.
        </p>
        <button class="template-42-rsvp">{{ data.rsvp.submitLabel }}</button>
      </WeddingSectionCard>
    </div>

    <WeddingSectionCard title="Galeria" subtitle="Visual moodboard">
      <div class="template-42-gallery">
        <figure v-for="item in data.gallery" :key="item.id" class="template-42-gallery__item">
          <img :src="item.imageUrl" :alt="item.alt" loading="lazy" />
        </figure>
      </div>
    </WeddingSectionCard>
  </WeddingTemplateShell>
</template>

<style scoped>
.template-42-hero {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.template-42-hero__kicker {
  margin: 0 0 0.4rem;
  color: var(--brand-pink);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.82rem;
}

.template-42-hero__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 5vw, 4.6rem);
  line-height: 0.95;
}

.template-42-hero__meta {
  margin: 0.8rem 0 0;
  color: var(--muted);
}

.template-42-hero__music {
  min-width: 220px;
  padding: 1rem;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(122, 79, 217, 0.12), rgba(240, 106, 166, 0.12));
}

.template-42-hero__music span {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.template-42-story,
.template-42-grid {
  display: grid;
  gap: 1rem;
}

.template-42-story {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.template-42-story h3,
.template-42-schedule h3 {
  margin: 0 0 0.4rem;
  color: var(--text);
}

.template-42-story p,
.template-42-schedule p {
  margin: 0;
}

.template-42-grid {
  grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.7fr);
}

.template-42-schedule {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.template-42-schedule li {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 1rem;
}

.template-42-schedule strong {
  font-size: 1.1rem;
  color: var(--brand-purple);
}

.template-42-rsvp {
  margin-top: 1rem;
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.4rem;
  font-weight: 700;
  color: white;
  background: var(--gradient-brand);
}

.template-42-gallery {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.template-42-gallery__item {
  margin: 0;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 24px;
}

.template-42-gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 900px) {
  .template-42-hero,
  .template-42-story,
  .template-42-grid,
  .template-42-gallery {
    grid-template-columns: 1fr;
  }
}
</style>

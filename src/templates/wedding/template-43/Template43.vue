<script setup lang="ts">
import WeddingTemplateShell from '@/templates/wedding/shared/WeddingTemplateShell.vue'
import WeddingSectionCard from '@/templates/wedding/shared/WeddingSectionCard.vue'
import type { InvitationTemplateRendererProps } from '@/templates/types'

defineOptions({
  name: 'WeddingTemplateFortyThree',
})

defineProps<InvitationTemplateRendererProps<'wedding'>>()
</script>

<template>
  <WeddingTemplateShell accent-label="Template 43 · Modern ceremony">
    <template #hero>
      <div class="template-43-hero">
        <p class="template-43-hero__eyebrow">{{ data.couple.headline }}</p>
        <h1>{{ data.couple.brideName }} & {{ data.couple.groomName }}</h1>
        <p class="template-43-hero__lede">
          Te esperamos en {{ data.event.venue }}, {{ data.event.city }} para celebrar un dia pensado con detalles,
          calidez y mucha musica.
        </p>
      </div>
    </template>

    <div class="template-43-grid">
      <WeddingSectionCard title="Ceremonia" subtitle="Fecha y lugar">
        <p class="template-43-highlight">{{ data.event.date.label }}</p>
        <p>{{ data.location.name }}</p>
        <p>{{ data.location.address }}</p>
        <a class="template-43-link" :href="data.location.mapsUrl" target="_blank" rel="noreferrer">Ver ubicacion</a>
      </WeddingSectionCard>

      <WeddingSectionCard title="Musica" subtitle="Clima del evento">
        <p class="template-43-highlight">{{ data.music.title }}</p>
        <p>{{ data.music.artist }}</p>
        <p>Bloque preparado para integrar reproduccion, playlist o audio propio segun plan.</p>
      </WeddingSectionCard>
    </div>

    <WeddingSectionCard title="Nuestra historia" subtitle="Momentos">
      <div class="template-43-story">
        <article v-for="moment in data.story" :key="moment.title">
          <h3>{{ moment.title }}</h3>
          <p>{{ moment.description }}</p>
        </article>
      </div>
    </WeddingSectionCard>

    <WeddingSectionCard title="Agenda" subtitle="Recorrido de la celebracion">
      <div class="template-43-schedule">
        <article v-for="item in data.schedule" :key="item.id">
          <span>{{ item.time }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </WeddingSectionCard>
  </WeddingTemplateShell>
</template>

<style scoped>
.template-43-hero {
  max-width: 760px;
}

.template-43-hero__eyebrow {
  margin: 0 0 0.5rem;
  color: var(--brand-violet);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
}

.template-43-hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 5vw, 4.2rem);
  line-height: 0.94;
}

.template-43-hero__lede {
  max-width: 54ch;
  margin: 1rem 0 0;
  color: var(--muted);
}

.template-43-grid,
.template-43-story,
.template-43-schedule {
  display: grid;
  gap: 1rem;
}

.template-43-grid,
.template-43-story {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.template-43-highlight {
  margin: 0 0 0.3rem;
  font-size: 1.15rem;
  color: var(--text);
}

.template-43-link {
  color: var(--brand-purple);
  font-weight: 700;
}

.template-43-story h3,
.template-43-schedule h3 {
  margin: 0 0 0.35rem;
  color: var(--text);
}

.template-43-story p,
.template-43-schedule p {
  margin: 0;
}

.template-43-schedule article {
  padding: 1rem 1.1rem;
  border-radius: 20px;
  background: rgba(122, 79, 217, 0.06);
}

.template-43-schedule span {
  display: inline-block;
  margin-bottom: 0.5rem;
  color: var(--brand-purple);
  font-weight: 700;
}

@media (max-width: 840px) {
  .template-43-grid,
  .template-43-story {
    grid-template-columns: 1fr;
  }
}
</style>

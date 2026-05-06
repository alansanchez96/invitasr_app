<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { listPublicProductUpdates, type ProductUpdateItem } from '@/services/productUpdates'

const updates = ref<ProductUpdateItem[]>([])
const isLoading = ref(false)
const loadError = ref('')

const featuredUpdate = computed(() => updates.value[0] ?? null)
const secondaryUpdates = computed(() => updates.value.slice(1))

const formatDate = (value?: string | null) => {
  if (!value) return 'Disponible ahora'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Disponible ahora'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const loadUpdates = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await listPublicProductUpdates({ page: 1, perPage: 12 })
    updates.value = result.items
  } catch {
    loadError.value = 'No pudimos cargar las novedades en este momento.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadUpdates)
</script>

<template>
  <section id="noticias" class="news-page">
    <div class="container news-shell">
      <div class="news-hero">
        <p class="news-kicker">Novedades InvitaSR</p>
        <h1>Mejoras pensadas para que cada invitación convierta mejor.</h1>
        <p>
          Seguimos sumando detalles de diseño, organización y experiencia para que tus invitados abran,
          entiendan y respondan con menos fricción.
        </p>
        <div class="news-actions">
          <BaseButton as="RouterLink" to="/demo" variant="primary">Probar una demo</BaseButton>
          <BaseButton as="RouterLink" to="/planes" variant="ghost">Ver planes</BaseButton>
        </div>
      </div>

      <div v-if="isLoading" class="news-state">Cargando novedades...</div>
      <div v-else-if="loadError" class="news-state is-error">{{ loadError }}</div>

      <template v-else>
        <article v-if="featuredUpdate" class="featured-update">
          <div>
            <span class="version-pill">Versión {{ featuredUpdate.version }}</span>
            <h2>{{ featuredUpdate.title }}</h2>
            <p>{{ featuredUpdate.summary }}</p>
            <ul v-if="featuredUpdate.changes.length" class="change-list">
              <li v-for="change in featuredUpdate.changes" :key="change">{{ change }}</li>
            </ul>
          </div>
          <aside class="featured-date">
            <span>Publicado</span>
            <strong>{{ formatDate(featuredUpdate.published_at) }}</strong>
          </aside>
        </article>

        <div v-if="secondaryUpdates.length" class="updates-grid">
          <article v-for="item in secondaryUpdates" :key="item.id" class="update-card">
            <div class="update-card-head">
              <span>v{{ item.version }}</span>
              <small>{{ formatDate(item.published_at) }}</small>
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.summary }}</p>
            <ul v-if="item.changes.length" class="mini-change-list">
              <li v-for="change in item.changes.slice(0, 3)" :key="change">{{ change }}</li>
            </ul>
          </article>
        </div>

        <div v-if="!updates.length" class="empty-news">
          <span>Muy pronto</span>
          <h2>Estamos preparando nuevas mejoras.</h2>
          <p>Mientras tanto puedes probar una demo y ver cómo se siente crear una invitación en minutos.</p>
          <BaseButton as="RouterLink" to="/demo" variant="primary">Explorar demos</BaseButton>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.news-page {
  min-height: 100svh;
  padding: 132px 0 96px;
  background:
    radial-gradient(circle at 8% 10%, rgba(155, 107, 255, 0.16), transparent 34%),
    radial-gradient(circle at 88% 2%, rgba(240, 106, 166, 0.15), transparent 30%),
    linear-gradient(180deg, #fff 0%, #fbf7ff 54%, #f6f1ff 100%);
}

.news-shell {
  display: grid;
  gap: 28px;
}

.news-hero {
  display: grid;
  gap: 16px;
  max-width: 850px;
}

.news-kicker,
.version-pill,
.empty-news span {
  width: fit-content;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(122, 79, 217, 0.11);
  color: #6d3fd3;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.news-hero h1 {
  margin: 0;
  color: #211238;
  font-size: clamp(42px, 7vw, 84px);
  line-height: 0.94;
  letter-spacing: -0.08em;
  max-width: 960px;
}

.news-hero p,
.featured-update p,
.update-card p,
.empty-news p {
  margin: 0;
  color: #69597f;
  line-height: 1.7;
  font-size: 16px;
}

.news-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.news-state {
  border: 1px solid #eadfff;
  border-radius: 22px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.78);
  color: #5c4a78;
  font-weight: 800;
}

.news-state.is-error {
  color: #b91c1c;
}

.featured-update {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 28px;
  align-items: stretch;
  border: 1px solid rgba(122, 79, 217, 0.2);
  border-radius: 34px;
  padding: clamp(24px, 5vw, 42px);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(251, 244, 255, 0.92)),
    radial-gradient(circle at 94% 12%, rgba(240, 106, 166, 0.18), transparent 32%);
  box-shadow: 0 28px 70px rgba(122, 79, 217, 0.14);
}

.featured-update h2 {
  margin: 18px 0 12px;
  color: #23143f;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.featured-date {
  display: grid;
  align-content: end;
  gap: 8px;
  border-radius: 26px;
  padding: 24px;
  background: linear-gradient(145deg, #25133d, #7a4fd9 58%, #f06aa6);
  color: #fff;
  min-height: 220px;
}

.featured-date span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  opacity: 0.8;
}

.featured-date strong {
  font-size: 24px;
  line-height: 1.1;
}

.change-list,
.mini-change-list {
  display: grid;
  gap: 10px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.change-list li,
.mini-change-list li {
  position: relative;
  padding-left: 24px;
  color: #3a2952;
  line-height: 1.55;
}

.change-list li::before,
.mini-change-list li::before {
  content: "";
  position: absolute;
  top: 0.62em;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
  box-shadow: 0 0 0 6px rgba(122, 79, 217, 0.09);
}

.updates-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.update-card,
.empty-news {
  border: 1px solid #eadfff;
  border-radius: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 44px rgba(122, 79, 217, 0.09);
}

.update-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.update-card-head span {
  color: #7a4fd9;
  font-weight: 900;
}

.update-card-head small {
  color: #8b7aa4;
  font-weight: 700;
}

.update-card h3,
.empty-news h2 {
  margin: 0 0 10px;
  color: #22133b;
  font-size: 22px;
  line-height: 1.12;
}

.empty-news {
  display: grid;
  justify-items: start;
  gap: 12px;
  max-width: 620px;
}

@media (max-width: 960px) {
  .featured-update,
  .updates-grid {
    grid-template-columns: 1fr;
  }

  .featured-date {
    min-height: 160px;
  }
}

@media (max-width: 640px) {
  .news-page {
    padding: 104px 0 72px;
  }

  .news-actions {
    flex-direction: column;
  }
}
</style>

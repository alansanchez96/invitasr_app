<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  listCatalogPlans,
  listCatalogTemplates,
  listCatalogTypeEvents,
  type CatalogPlanListItem,
  type CatalogTemplateItem,
  type CatalogTypeEventItem,
} from '@/services/catalogs'
import { notifyWarning } from '@/utils/toast'

type DemoTemplateCard = {
  key: string
  id?: number | string
  name: string
  slug: string
  rendererKey: string
  typeEventId?: number | string | null
  typeEventName: string
  imageUrl: string
  minimumPlan: CatalogPlanListItem | null
  availablePlans: string[]
  summary: string
}

const templateImageModules = import.meta.glob('/src/templates/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const typeEvents = ref<CatalogTypeEventItem[]>([])
const templates = ref<CatalogTemplateItem[]>([])
const plans = ref<CatalogPlanListItem[]>([])
const selectedTypeEventId = ref<string>('')
const selectedPlanName = ref<string>('')
const isLoading = ref(false)
const loadError = ref('')

const planRank: Record<string, number> = {
  demo: 0,
  basic: 1,
  pro: 2,
  planner: 3,
}

const normalize = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/template$/i, '')
    .replace(/[^a-z0-9]/g, '')

const formatPlanName = (value: unknown): string => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'basic') return 'Basic'
  if (normalized === 'pro') return 'Pro'
  if (normalized === 'planner') return 'Planner'
  if (normalized === 'demo') return 'Demo'
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Plan'
}

const getPlanRank = (plan: CatalogPlanListItem | null | undefined): number => {
  const name = String(plan?.name ?? '').trim().toLowerCase()
  return planRank[name] ?? 99
}

const getTemplatePlan = (template: CatalogTemplateItem): CatalogPlanListItem | null => {
  if (template.plan) return template.plan
  const planId = template.plan_id == null ? '' : String(template.plan_id)
  return plans.value.find((plan) => String(plan.id) === planId) ?? null
}

const getTemplateTypeEvent = (template: CatalogTemplateItem): CatalogTypeEventItem | null => {
  if (template.type_event) return template.type_event
  const eventId = template.type_event_id == null ? '' : String(template.type_event_id)
  return typeEvents.value.find((event) => String(event.id) === eventId) ?? null
}

const resolveTemplateImage = (template: CatalogTemplateItem): string => {
  if (template.preview_image) return template.preview_image

  const templateName = normalize(template.name)
  const templateSlug = normalize(template.slug)
  const rendererKey = normalize(template.renderer_key)
  const candidates = Object.entries(templateImageModules)

  const exact = candidates.find(([path]) => {
    const fileName = normalize(path.split('/').pop()?.replace(/\.[^.]+$/, ''))
    return fileName === templateName || fileName === templateSlug || fileName === rendererKey
  })

  if (exact) return exact[1]

  const byFolder = candidates.find(([path]) => {
    const normalizedPath = normalize(path)
    return normalizedPath.includes(templateSlug) || normalizedPath.includes(rendererKey)
  })

  return byFolder?.[1] ?? ''
}

const templateGroups = computed<DemoTemplateCard[]>(() => {
  const grouped = new Map<string, CatalogTemplateItem[]>()

  for (const template of templates.value) {
    const key = [
      template.type_event_id ?? template.type_event?.id ?? 'event',
      template.renderer_key || template.slug || template.name || 'template',
    ].join(':')
    const current = grouped.get(key) ?? []
    current.push(template)
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
    .flatMap(([key, group]) => {
      const sorted = [...group].sort((a, b) => getPlanRank(getTemplatePlan(a)) - getPlanRank(getTemplatePlan(b)))
      const base = sorted[0]
      if (!base) return []

      const typeEvent = getTemplateTypeEvent(base)
      const minimumPlan = getTemplatePlan(base)
      const availablePlans = sorted
        .map((template) => formatPlanName(getTemplatePlan(template)?.name))
        .filter((value, index, all) => value && all.indexOf(value) === index)

      return [{
        key,
        id: base.id,
        name: String(base.name ?? 'Plantilla disponible'),
        slug: String(base.slug ?? ''),
        rendererKey: String(base.renderer_key ?? ''),
        typeEventId: base.type_event_id ?? typeEvent?.id ?? null,
        typeEventName: String(typeEvent?.name ?? 'Evento'),
        imageUrl: resolveTemplateImage(base),
        minimumPlan,
        availablePlans,
        summary: resolveTemplateSummary(base, minimumPlan),
      }]
    })
    .sort((a, b) => {
      const eventCompare = a.typeEventName.localeCompare(b.typeEventName)
      if (eventCompare !== 0) return eventCompare
      return getPlanRank(a.minimumPlan) - getPlanRank(b.minimumPlan)
    })
})

const planFilterOptions = computed(() =>
  [...plans.value]
    .filter((plan) => ['basic', 'pro', 'planner'].includes(String(plan.name ?? '').trim().toLowerCase()))
    .sort((a, b) => getPlanRank(a) - getPlanRank(b)),
)

const visibleTemplates = computed(() => {
  return templateGroups.value.filter((template) => {
    const matchesEvent = !selectedTypeEventId.value || String(template.typeEventId ?? '') === selectedTypeEventId.value
    const matchesPlan = !selectedPlanName.value || template.availablePlans
      .some((plan) => normalize(plan) === normalize(selectedPlanName.value))

    return matchesEvent && matchesPlan
  })
})

const hasTemplatesForType = (eventId: number | string | undefined): boolean =>
  templateGroups.value.some((template) => String(template.typeEventId ?? '') === String(eventId ?? ''))

const resolveTemplateSummary = (template: CatalogTemplateItem, plan: CatalogPlanListItem | null): string => {
  const definition = template.definition ?? {}
  const variants = Array.isArray(definition.visual_variants) ? definition.visual_variants : []
  const firstVariant = variants[0] as Record<string, unknown> | undefined
  const theme = String(firstVariant?.theme ?? '').trim()
  const planName = formatPlanName(plan?.name)

  if (theme) return `Estilo ${theme} disponible desde ${planName}.`
  return `Una experiencia lista para probar y personalizar desde ${planName}.`
}

const getBuyTo = (template: DemoTemplateCard) => ({
  name: 'planes',
  query: {
    template: template.id ? String(template.id) : undefined,
    type_event: template.typeEventId ? String(template.typeEventId) : undefined,
    from: 'demo-gallery',
  },
})

const selectTypeEvent = (eventId: string) => {
  selectedTypeEventId.value = eventId
}

const selectPlan = (planName: string) => {
  selectedPlanName.value = planName
}

const handleTryDemo = () => {
  notifyWarning('El editor demo será el siguiente paso. Por ahora puedes explorar estilos y elegir tu plan.')
}

const loadCatalogs = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const [eventResponse, templateResponse, planResponse] = await Promise.all([
      listCatalogTypeEvents({ page: 1, perPage: 80 }),
      listCatalogTemplates({ page: 1, perPage: 200 }),
      listCatalogPlans({ page: 1, perPage: 20 }),
    ])

    typeEvents.value = eventResponse.list
    templates.value = templateResponse.list
    plans.value = planResponse.list

    const firstWithTemplates = typeEvents.value.find((event) => hasTemplatesForType(event.id))
    selectedTypeEventId.value = firstWithTemplates?.id == null ? '' : String(firstWithTemplates.id)
  } catch {
    loadError.value = 'No pudimos cargar la galeria de plantillas. Intenta nuevamente en unos segundos.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadCatalogs)
</script>

<template>
  <section id="demo" class="demo-gallery" aria-labelledby="demo-gallery-title">
    <div class="container demo-gallery-shell">
      <div class="demo-gallery-head">
        <div>
          <p class="demo-kicker">Demo interactiva</p>
          <h2 id="demo-gallery-title">Explora estilos reales antes de elegir tu plan</h2>
          <p>
            Filtra por tipo de evento, mira una vista previa y elige si quieres probar el estilo o comprar para
            conservar tus cambios.
          </p>
        </div>
        <BaseButton as="RouterLink" to="/planes" variant="ghost">Ver todos los planes</BaseButton>
      </div>

      <div class="demo-filter-panel" aria-label="Filtros de plantillas demo">
        <div class="demo-filter-group">
          <span>Tipo de evento</span>
          <div class="demo-filter-tabs" aria-label="Tipos de evento">
            <button
              type="button"
              class="demo-filter-tab"
              :class="{ active: selectedTypeEventId === '' }"
              @click="selectTypeEvent('')">
              Todos
            </button>
            <button
              v-for="event in typeEvents"
              :key="String(event.id)"
              type="button"
              class="demo-filter-tab"
              :class="{ active: selectedTypeEventId === String(event.id) }"
              :disabled="!hasTemplatesForType(event.id)"
              @click="selectTypeEvent(String(event.id ?? ''))">
              {{ event.name }}
            </button>
          </div>
        </div>

        <div class="demo-filter-group demo-filter-group-plan">
          <span>Plan</span>
          <div class="demo-filter-tabs" aria-label="Planes disponibles">
            <button
              type="button"
              class="demo-filter-tab"
              :class="{ active: selectedPlanName === '' }"
              @click="selectPlan('')">
              Todos
            </button>
            <button
              v-for="plan in planFilterOptions"
              :key="String(plan.id ?? plan.name)"
              type="button"
              class="demo-filter-tab"
              :class="{ active: normalize(selectedPlanName) === normalize(plan.name) }"
              @click="selectPlan(String(plan.name ?? ''))">
              {{ formatPlanName(plan.name) }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="isLoading" class="demo-state">Cargando estilos disponibles...</p>
      <p v-else-if="loadError" class="demo-state demo-state-error">{{ loadError }}</p>

      <div v-else-if="visibleTemplates.length" class="demo-template-grid">
        <article v-for="template in visibleTemplates" :key="template.key" class="demo-template-card">
          <div class="demo-template-media">
            <img v-if="template.imageUrl" :src="template.imageUrl" :alt="`Vista previa de ${template.name}`" loading="lazy" />
            <div v-else class="demo-template-placeholder">
              <span>{{ template.name }}</span>
            </div>
            <span class="demo-template-plan">Desde {{ formatPlanName(template.minimumPlan?.name) }}</span>
          </div>

          <div class="demo-template-body">
            <div class="demo-template-title-row">
              <div>
                <span>{{ template.typeEventName }}</span>
                <h3>{{ template.name }}</h3>
              </div>
            </div>
            <p>{{ template.summary }}</p>
            <div class="demo-template-plans" aria-label="Planes compatibles">
              <span v-for="plan in template.availablePlans" :key="plan">{{ plan }}</span>
            </div>
          </div>

          <footer class="demo-template-actions">
            <button type="button" class="demo-card-button demo-card-button-secondary" @click="handleTryDemo">
              Probar demo
            </button>
            <BaseButton
              class="demo-card-button demo-card-button-primary"
              as="RouterLink"
              :to="getBuyTo(template)"
              variant="primary">
              Comprar y editar
            </BaseButton>
          </footer>
        </article>
      </div>

      <div v-else class="demo-empty">
        <strong>Pronto habrá estilos para este tipo de evento.</strong>
        <p>Mientras tanto puedes explorar los estilos disponibles o ver los planes.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo-gallery {
  padding: 82px 0;
  background:
    radial-gradient(circle at 8% 12%, rgba(240, 106, 166, 0.12), transparent 34%),
    radial-gradient(circle at 90% 10%, rgba(122, 79, 217, 0.12), transparent 32%),
    linear-gradient(180deg, #fff 0%, #fbf7ff 100%);
}

.demo-gallery-shell {
  display: grid;
  gap: 22px;
}

.demo-gallery-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.demo-gallery-head > div {
  max-width: 780px;
}

.demo-kicker {
  margin: 0 0 0.45rem;
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.demo-gallery-head h2 {
  margin: 0;
  color: #2b1a44;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.02;
  letter-spacing: -0.04em;
  max-width: 16ch;
}

.demo-gallery-head p {
  margin: 12px 0 0;
  color: #6c5a7e;
  line-height: 1.58;
  max-width: 68ch;
}

.demo-filter-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(226, 214, 246, 0.8);
  border-radius: 26px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(249, 244, 255, 0.84)),
    radial-gradient(circle at 6% 18%, rgba(240, 106, 166, 0.12), transparent 30%);
  box-shadow: 0 18px 42px rgba(72, 43, 118, 0.1);
}

.demo-filter-group {
  display: grid;
  gap: 9px;
}

.demo-filter-group > span {
  color: #7b5aa7;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.demo-filter-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 0 6px;
  scrollbar-width: thin;
}

.demo-filter-tab {
  flex: 0 0 auto;
  border: 1px solid rgba(155, 107, 255, 0.22);
  border-radius: 999px;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.88);
  color: #5d437f;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(91, 55, 142, 0.06);
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.demo-filter-tab:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(122, 79, 217, 0.52);
  box-shadow: 0 12px 26px rgba(91, 55, 142, 0.12);
}

.demo-filter-tab.active {
  color: #fff;
  background: linear-gradient(120deg, #7a4fd9 0%, #f06aa6 100%);
  border-color: transparent;
  box-shadow: 0 12px 26px rgba(122, 79, 217, 0.22);
}

.demo-filter-tab:disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.demo-template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.demo-template-card {
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border: 1px solid rgba(226, 214, 246, 0.95);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 48px rgba(72, 43, 118, 0.12);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.demo-template-card:hover {
  transform: translateY(-5px);
  border-color: rgba(155, 107, 255, 0.42);
  box-shadow: 0 28px 60px rgba(72, 43, 118, 0.18);
}

.demo-template-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: linear-gradient(135deg, #eee7ff 0%, #fff4fb 100%);
}

.demo-template-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.demo-template-card:hover .demo-template-media img {
  transform: scale(1.04);
}

.demo-template-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 22px;
  text-align: center;
  color: #5d437f;
  font-family: var(--font-display);
  font-size: 1.6rem;
}

.demo-template-plan {
  position: absolute;
  left: 14px;
  top: 14px;
  border-radius: 999px;
  padding: 7px 11px;
  background: rgba(31, 19, 48, 0.78);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  backdrop-filter: blur(12px);
}

.demo-template-body {
  display: grid;
  gap: 12px;
  padding: 18px 18px 12px;
}

.demo-template-title-row span {
  display: block;
  margin-bottom: 5px;
  color: #8a67c5;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.demo-template-title-row h3 {
  margin: 0;
  color: #25133a;
  font-size: 1.35rem;
  line-height: 1.08;
}

.demo-template-body p {
  margin: 0;
  color: #6d5b7e;
  line-height: 1.5;
}

.demo-template-plans {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.demo-template-plans span {
  border-radius: 999px;
  padding: 6px 10px;
  color: #5e3c87;
  background: #f4edff;
  font-size: 12px;
  font-weight: 800;
}

.demo-template-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 18px 18px;
}

.demo-card-button {
  min-height: 48px;
  width: 100%;
  border-radius: 16px;
  border: 1px solid transparent;
  padding: 12px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #27153d;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.1;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.demo-card-button:hover {
  transform: translateY(-2px);
}

.demo-card-button-secondary {
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(120deg, rgba(122, 79, 217, 0.36), rgba(240, 106, 166, 0.36)) border-box;
  border-color: transparent;
  box-shadow: 0 12px 24px rgba(66, 36, 105, 0.08);
}

.demo-card-button-secondary:hover {
  box-shadow: 0 16px 30px rgba(66, 36, 105, 0.14);
}

.demo-card-button-primary {
  color: #fff;
  background: linear-gradient(120deg, #7a4fd9 0%, #f06aa6 100%);
  box-shadow: 0 14px 30px rgba(122, 79, 217, 0.26);
}

.demo-card-button-primary:hover {
  box-shadow: 0 18px 38px rgba(122, 79, 217, 0.34);
}

.demo-template-actions :deep(.btn) {
  min-height: 48px;
  width: 100%;
  border-radius: 16px;
  white-space: normal;
}

.demo-state,
.demo-empty {
  margin: 0;
  padding: 22px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  color: #6b5a7d;
}

.demo-state-error {
  border-color: rgba(239, 68, 68, 0.24);
  background: rgba(254, 242, 242, 0.82);
  color: #991b1b;
}

.demo-empty {
  display: grid;
  gap: 6px;
}

.demo-empty strong {
  color: #2b1a44;
}

.demo-empty p {
  margin: 0;
}

@media (max-width: 980px) {
  .demo-gallery-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .demo-filter-panel {
    padding: 14px;
  }

  .demo-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .demo-gallery {
    padding: 64px 0;
  }

  .demo-template-grid,
  .demo-template-actions {
    grid-template-columns: 1fr;
  }

  .demo-gallery-head :deep(.btn) {
    width: 100%;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicDemoInvitation } from '@/services/publicInvitations'
import { loadTemplateModuleByRendererKey } from '@/templates/registry'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'

const route = useRoute()
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const templateModule = ref<InvitationTemplateModule<'wedding'> | null>(null)
const templateData = ref<WeddingTemplateData | null>(null)
const sectionVisibility = ref<Record<string, boolean>>({})
const templateId = ref<number>(1)
const invitationTitle = ref('')
const typeEventName = ref('')
const remainingVisits = ref<number | null>(null)

const userPath = computed(() => `us_${String(route.params.userId ?? '').trim()}`)
const demoSlug = computed(() => String(route.params.demoSlug ?? '').trim())

const loadInvitation = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const payload = await getPublicDemoInvitation(userPath.value, demoSlug.value)
    const rendererKey = String(payload.template?.rendererKey ?? '').trim()
    if (!rendererKey || !payload.content) {
      loadError.value = 'No encontramos el diseño configurado para esta demo.'
      return
    }

    const loadedModule = await loadTemplateModuleByRendererKey(rendererKey) as InvitationTemplateModule<'wedding'> | null
    if (!loadedModule) {
      loadError.value = 'No pudimos cargar esta demo.'
      return
    }

    const rawSectionVisibility = payload.settings?.section_visibility
    const nextSectionVisibility: Record<string, boolean> = {}
    if (rawSectionVisibility && typeof rawSectionVisibility === 'object') {
      Object.entries(rawSectionVisibility).forEach(([key, value]) => {
        if (!key.trim()) return
        nextSectionVisibility[key] = Boolean(value)
      })
    }

    templateId.value = Number(payload.template?.id ?? loadedModule.manifest.id ?? 1)
    templateModule.value = loadedModule
    templateData.value = payload.content
    sectionVisibility.value = nextSectionVisibility
    invitationTitle.value = String(payload.invitation?.title ?? '').trim()
    typeEventName.value = String(payload.typeEvent?.name ?? '').trim()
    remainingVisits.value = payload.demo?.remainingVisits ?? null
    document.title = invitationTitle.value || 'Demo publicada InvitaSR'
  } catch (error) {
    const source = error as { message?: string; status?: number; statusCode?: number }
    const statusCode = Number(source?.statusCode ?? source?.status ?? 500)
    loadError.value = statusCode === 410
      ? 'Esta demo ya no está disponible.'
      : (source?.message ?? 'No pudimos abrir esta demo ahora.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadInvitation()
})
</script>

<template>
  <section class="public-demo-invitation-page">
    <div v-if="isLoading" class="public-demo-invitation-page__state" role="status" aria-live="polite">
      <p>Cargando demo...</p>
    </div>

    <div v-else-if="loadError" class="public-demo-invitation-page__state public-demo-invitation-page__state--error">
      <p>{{ loadError }}</p>
      <RouterLink class="public-demo-invitation-page__link" to="/demo">Probar otra plantilla</RouterLink>
    </div>

    <template v-else-if="templateModule && templateData">
      <div class="demo-public-banner">
        <strong>Demo publicada</strong>
        <span v-if="remainingVisits !== null">Quedan {{ remainingVisits }} visitas de prueba.</span>
        <RouterLink to="/planes">Crear mi invitación real</RouterLink>
      </div>

      <component
        :is="templateModule.component"
        :template-id="templateId"
        :manifest="templateModule.manifest"
        :data="templateData"
        :invitation-title="invitationTitle"
        :type-event-name="typeEventName"
        :section-visibility="sectionVisibility"
        demo-mode />
    </template>
  </section>
</template>

<style scoped>
.public-demo-invitation-page {
  min-height: 100vh;
}

.public-demo-invitation-page__state {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
  color: #334155;
  padding: 1rem;
}

.public-demo-invitation-page__state--error {
  color: #9f1239;
}

.public-demo-invitation-page__link,
.demo-public-banner a {
  color: #7a4fd9;
  font-weight: 900;
}

.demo-public-banner {
  position: sticky;
  top: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 14px;
  color: #2b1a44;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(155, 107, 255, 0.18);
  backdrop-filter: blur(16px);
}

.demo-public-banner strong {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #7a4fd9;
}

.demo-public-banner span {
  color: #6d5b7e;
  font-size: 13px;
}

@media (max-width: 640px) {
  .demo-public-banner {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

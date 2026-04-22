<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPublicInvitationByHost } from '@/services/publicInvitations'
import { loadTemplateModuleByRendererKey } from '@/templates/registry'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'
import { resolveInvitationSubdomainFromHost } from '@/utils/host'

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const templateModule = ref<InvitationTemplateModule<'wedding'> | null>(null)
const templateData = ref<WeddingTemplateData | null>(null)
const templateId = ref<number>(1)

const invitationSubdomain = computed(() => resolveInvitationSubdomainFromHost())

const loadInvitation = async () => {
  isLoading.value = true
  loadError.value = null

  if (!invitationSubdomain.value) {
    loadError.value = 'Este enlace no corresponde a una invitación activa.'
    isLoading.value = false
    return
  }

  try {
    const payload = await getPublicInvitationByHost()
    const rendererKey = String(payload.template?.rendererKey ?? '').trim()
    if (!rendererKey) {
      loadError.value = 'No encontramos el diseño configurado para esta invitación.'
      isLoading.value = false
      return
    }

    const loadedModule = (await loadTemplateModuleByRendererKey(rendererKey)) as InvitationTemplateModule<'wedding'> | null
    if (!loadedModule) {
      loadError.value = 'No pudimos cargar la experiencia de la invitación.'
      isLoading.value = false
      return
    }

    if (!payload.content) {
      loadError.value = 'Esta invitación aún no tiene contenido publicado.'
      isLoading.value = false
      return
    }

    templateId.value = Number(payload.template?.id ?? loadedModule.manifest.id ?? 1)
    templateModule.value = loadedModule
    templateData.value = payload.content
  } catch (error) {
    const source = error as { message?: string; status?: number; statusCode?: number }
    const statusCode = Number(source?.statusCode ?? source?.status ?? 500)
    loadError.value = statusCode === 410
      ? 'Esta invitación ya no está disponible.'
      : (source?.message ?? 'No pudimos abrir esta invitación ahora.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadInvitation()
})
</script>

<template>
  <section class="public-invitation-page">
    <div v-if="isLoading" class="public-invitation-page__state" role="status" aria-live="polite">
      <p>Cargando invitación...</p>
    </div>

    <div v-else-if="loadError" class="public-invitation-page__state public-invitation-page__state--error">
      <p>{{ loadError }}</p>
    </div>

    <component
      :is="templateModule.component"
      v-else-if="templateModule && templateData"
      :template-id="templateId"
      :manifest="templateModule.manifest"
      :data="templateData" />
  </section>
</template>

<style scoped>
.public-invitation-page {
  min-height: 100vh;
}

.public-invitation-page__state {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
  color: #334155;
  padding: 1rem;
}

.public-invitation-page__state p {
  margin: 0;
}

.public-invitation-page__state--error {
  color: #9f1239;
}
</style>


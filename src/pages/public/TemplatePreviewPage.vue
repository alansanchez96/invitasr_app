<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { resolveWeddingTemplatePreviewData } from '@/templates/previewData'
import { listRegisteredTemplateIds, loadTemplateModule } from '@/templates/registry'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'

const route = useRoute()
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const templateModule = ref<InvitationTemplateModule<'wedding'> | null>(null)
const templateData = ref<WeddingTemplateData | null>(null)

const templateId = computed(() => Number(route.params.templateId))
const availableTemplateIds = listRegisteredTemplateIds()

const loadPreview = async () => {
  isLoading.value = true
  loadError.value = null

  if (!Number.isInteger(templateId.value)) {
    loadError.value = 'El template solicitado no es valido.'
    isLoading.value = false
    return
  }

  const loadedModule = (await loadTemplateModule(templateId.value)) as InvitationTemplateModule<'wedding'> | null
  if (!loadedModule) {
    loadError.value = `No encontramos el template ${templateId.value} en el registry.`
    isLoading.value = false
    return
  }

  templateModule.value = loadedModule
  templateData.value = resolveWeddingTemplatePreviewData(loadedModule, {
    invitationTitle: loadedModule.manifest.name,
    typeEventName: loadedModule.manifest.eventType,
  })
  isLoading.value = false
}

onMounted(loadPreview)
watch(templateId, loadPreview)
</script>

<template>
  <section class="template-preview-page">
    <div class="container template-preview-page__header">
      <div>
        <p class="template-preview-page__eyebrow">Wedding template sandbox</p>
        <h1>Preview estructural de templates</h1>
        <p class="template-preview-page__lede">
          Esta pantalla sirve para desarrollar templates por <code>template_id</code> antes de conectarlos al backend
          real de invitaciones.
        </p>
      </div>

      <div class="template-preview-page__actions">
        <BaseButton
          v-for="id in availableTemplateIds"
          :key="id"
          as="RouterLink"
          :to="{ name: 'template-preview', params: { templateId: id } }"
          :variant="id === templateId ? 'primary' : 'ghost'"
        >
          Template {{ id }}
        </BaseButton>
      </div>
    </div>

    <div class="container template-preview-page__content">
      <p v-if="isLoading">Cargando preview del template...</p>
      <p v-else-if="loadError" class="template-preview-page__error">{{ loadError }}</p>
      <component
        :is="templateModule.component"
        v-else-if="templateModule && templateData"
        :template-id="templateId"
        :manifest="templateModule.manifest"
        :data="templateData"
      />
    </div>
  </section>
</template>

<style scoped>
.template-preview-page {
  padding: 2rem 0 4rem;
}

.container {
  width: min(1120px, calc(100vw - 2rem));
  margin: 0 auto;
}

.template-preview-page__header {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.template-preview-page__eyebrow {
  margin: 0 0 0.4rem;
  color: var(--brand-violet);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
}

.template-preview-page__header h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 4vw, 3.4rem);
}

.template-preview-page__lede {
  max-width: 60ch;
  margin: 0.8rem 0 0;
  color: var(--muted);
}

.template-preview-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.template-preview-page__content {
  padding-bottom: 2rem;
}

.template-preview-page__error {
  padding: 1rem 1.2rem;
  border-radius: 18px;
  color: #8a1739;
  background: rgba(240, 106, 166, 0.12);
}
</style>

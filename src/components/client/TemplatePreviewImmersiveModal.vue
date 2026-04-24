<script setup lang="ts">
import { computed } from 'vue'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'

type ResponsiveDevice = 'mobile' | 'tablet' | 'desktop'

const props = defineProps<{
  open: boolean
  title: string
  templateModule: InvitationTemplateModule<'wedding'> | null
  templateId: number
  previewData: WeddingTemplateData
  invitationTitle: string
  typeEventName: string
  device: ResponsiveDevice
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update:device', value: ResponsiveDevice): void
}>()

const createPreviewDevices = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
] as const

const createPreviewViewportClass = computed(() => `template-preview-frame--${props.device}`)

const closeModal = () => emit('close')
const updateDevice = (value: ResponsiveDevice) => emit('update:device', value)
</script>

<template>
  <Transition name="template-preview-modal">
    <div
      v-if="open"
      class="template-preview-modal-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="closeModal">
      <div class="template-preview-modal-card template-preview-modal-card--immersive">
        <header class="template-preview-modal-head">
          <div>
            <p class="client-kicker">Vista previa</p>
            <h3>{{ title || 'Plantilla seleccionada' }}</h3>
          </div>
          <button
            type="button"
            class="template-preview-modal-close"
            aria-label="Salir de la vista previa"
            title="Salir"
            data-tooltip="Salir"
            @click="closeModal">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div class="template-preview-toolbar">
          <div class="device-tabs" role="tablist" aria-label="Vista previa responsive">
            <button
              v-for="option in createPreviewDevices"
              :key="option.value"
              type="button"
              class="device-tab"
              :class="{ active: device === option.value }"
              @click="updateDevice(option.value)">
              {{ option.label }}
            </button>
          </div>
          <p class="template-preview-hint">Vista inmersiva: desliza para recorrer la plantilla completa en cada resolución.</p>
        </div>

        <div class="template-preview-stage template-preview-stage--modal">
          <p v-if="!templateModule" class="preview-placeholder">
            Selecciona una plantilla para ver la vista previa.
          </p>
          <div v-else class="template-preview-frame" :class="createPreviewViewportClass">
            <component
              :is="templateModule.component"
              :template-id="templateId"
              :manifest="templateModule.manifest"
              :data="previewData"
              :invitation-title="invitationTitle"
              :type-event-name="typeEventName"
              :preview-viewport="device"
              :constrained-overlay="true" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.template-preview-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 10px 14px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 251, 255, 0.95) 100%);
}

.template-preview-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}

.device-tabs {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  padding: 0.28rem;
  background: #f8fafc;
}

.device-tab {
  border: 0;
  border-radius: 999px;
  padding: 0.42rem 0.85rem;
  background: transparent;
  color: #475569;
  font-weight: 700;
  cursor: pointer;
}

.device-tab.active {
  background: #0f172a;
  color: #fff;
}

.template-preview-stage {
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  padding: 10px;
  background: #f8fafc;
  overflow: auto;
}

.template-preview-stage--modal {
  min-height: 0;
  height: 100%;
  padding: 14px;
  background:
    radial-gradient(circle at 12% 16%, rgba(148, 163, 184, 0.22), transparent 38%),
    #f8fafc;
}

.preview-placeholder {
  margin: 0;
  color: #64748b;
}

.template-preview-frame {
  position: relative;
  isolation: isolate;
  transform: translateZ(0);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #f1f5f9;
  margin: 0 auto;
  max-height: none;
}

.template-preview-modal-card--immersive .template-preview-frame {
  min-height: calc(100dvh - 250px);
}

.template-preview-frame--mobile {
  width: 390px;
  max-width: none;
  margin: 0 auto;
}

.template-preview-frame--tablet {
  width: 860px;
  max-width: none;
  margin: 0 auto;
}

.template-preview-frame--desktop {
  width: 1366px;
  max-width: none;
  margin: 0 auto;
}

.template-preview-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(6px);
  padding: 12px;
  display: grid;
}

.template-preview-modal-card {
  width: min(1366px, 100%);
  height: calc(100dvh - 24px);
  margin: auto;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
  box-shadow: 0 34px 68px rgba(15, 23, 42, 0.38);
  display: grid;
  grid-template-rows: auto auto 1fr;
  overflow: hidden;
}

.template-preview-modal-head {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.26);
}

.template-preview-modal-head h3 {
  margin: 0;
  color: #1e293b;
}

.template-preview-modal-close {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  border-radius: 999px;
  width: 40px;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.template-preview-modal-close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.template-preview-modal-enter-active,
.template-preview-modal-leave-active {
  transition: opacity 0.28s ease;
}

.template-preview-modal-enter-from,
.template-preview-modal-leave-to {
  opacity: 0;
}

.template-preview-modal-enter-active .template-preview-modal-card,
.template-preview-modal-leave-active .template-preview-modal-card {
  transition: transform 0.36s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease;
}

.template-preview-modal-enter-from .template-preview-modal-card,
.template-preview-modal-leave-to .template-preview-modal-card {
  transform: translateY(24px) scale(0.97);
  opacity: 0.85;
}

@media (max-width: 720px) {
  .device-tabs {
    width: 100%;
    justify-content: space-between;
  }

  .device-tab {
    flex: 1;
  }

  .template-preview-modal-backdrop {
    padding: 8px;
  }

  .template-preview-modal-card {
    height: calc(100dvh - 16px);
    border-radius: 14px;
  }

  .template-preview-modal-close {
    min-width: 40px;
    width: 40px;
  }

  .template-preview-toolbar {
    padding: 8px 10px 10px;
    gap: 0.4rem;
  }

  .template-preview-hint {
    font-size: 0.75rem;
  }

  .template-preview-stage--modal {
    padding: 8px;
  }

  .template-preview-modal-card--immersive .template-preview-frame {
    min-height: calc(100dvh - 224px);
  }
}
</style>

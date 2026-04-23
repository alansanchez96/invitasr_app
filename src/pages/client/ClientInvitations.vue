<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatStatusLabel } from '@/utils/clientPanel'
import {
  createTenantInvitation,
  deleteTenantInvitation,
  getTenantDashboardSummary,
  listTenantInvitations,
  publishTenantInvitation,
  type TenantInvitationItem,
} from '@/services/tenantInvitations'
import { listCatalogTemplates, type CatalogTemplateItem, type CatalogTypeEventItem } from '@/services/catalogs'
import { useSessionStore } from '@/stores/session'
import { loadTemplateModuleByRendererKey } from '@/templates/registry'
import { weddingTemplateMocks } from '@/templates/mockWeddingTemplateData'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'
import { notifyError, notifySuccess } from '@/utils/toast'

const session = useSessionStore()

const isLoading = ref(false)
const isCreating = ref(false)
const loadError = ref<string | null>(null)
const dashboard = ref({
  total_invitations: 0,
  draft_invitations: 0,
  published_invitations: 0,
  credits_available: 0,
  last_updated_at: null as string | null,
})
const invitations = ref<TenantInvitationItem[]>([])
const templates = ref<CatalogTemplateItem[]>([])
const typeEvents = ref<CatalogTypeEventItem[]>([])

const pagination = reactive({
  page: 1,
  perPage: 10,
  total: 0,
  lastPage: 1,
})
const filters = reactive({
  status: '' as '' | 'draft' | 'published',
  search: '',
})

const createForm = reactive({
  title: '',
  template_id: '',
  type_event_id: '',
})

const createTemplatePreviewModule = ref<InvitationTemplateModule<'wedding'> | null>(null)
const createPreviewDevice = ref<'mobile' | 'tablet' | 'desktop'>('mobile')
const isCreatePreviewModalOpen = ref(false)
const showDeletePrompt = ref(false)
const deletingInvitation = ref<TenantInvitationItem | null>(null)
const isDeleting = ref(false)
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

const hasInvitations = computed(() => invitations.value.length > 0)
const hasTemplates = computed(() => templates.value.length > 0)
const filteredTemplates = computed(() => {
  const selectedTypeEvent = String(createForm.type_event_id ?? '').trim()
  if (!selectedTypeEvent) return templates.value

  return templates.value.filter((item) => String(item.type_event_id ?? '') === selectedTypeEvent)
})
const selectedTemplate = computed(() =>
  templates.value.find((item) => String(item.id) === createForm.template_id),
)
const selectedTypeEventName = computed(() => {
  const eventId = String(createForm.type_event_id ?? '').trim()
  if (!eventId) return ''
  const match = typeEvents.value.find((item) => String(item.id ?? '') === eventId)
  return String(match?.name ?? '').trim()
})

const createPreviewViewportClass = computed(() => `template-preview-frame--${createPreviewDevice.value}`)

const createPreviewData = computed<WeddingTemplateData>(() => {
  return weddingTemplateMocks[1001]!
})

const createPreviewDevices = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
] as const

const loadCreateTemplatePreview = async () => {
  createTemplatePreviewModule.value = null
  const rendererKey = String(selectedTemplate.value?.renderer_key ?? '').trim()
  if (!rendererKey) return

  createTemplatePreviewModule.value = (await loadTemplateModuleByRendererKey(rendererKey)) as InvitationTemplateModule<'wedding'> | null
}

const openCreatePreviewModal = async () => {
  if (!createForm.template_id) {
    notifyError('Selecciona una plantilla para abrir la vista previa.')
    return
  }

  await loadCreateTemplatePreview()
  isCreatePreviewModalOpen.value = true
}

const closeCreatePreviewModal = () => {
  isCreatePreviewModalOpen.value = false
}

const askDeleteInvitation = (item: TenantInvitationItem) => {
  if (String(item.status ?? '').toLowerCase() !== 'draft') {
    notifyError('Solo puedes eliminar invitaciones en borrador.')
    return
  }

  deletingInvitation.value = item
  showDeletePrompt.value = true
}

const closeDeletePrompt = () => {
  if (isDeleting.value) return
  showDeletePrompt.value = false
  deletingInvitation.value = null
}

const confirmDeleteInvitation = async () => {
  const invitationId = deletingInvitation.value?.id
  if (!invitationId) return

  closeDeletePrompt()
  isDeleting.value = true
  try {
    const response = await deleteTenantInvitation(invitationId)
    notifySuccess(response.message ?? 'Borrador eliminado.')
    await loadData()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos eliminar el borrador.')
  } finally {
    isDeleting.value = false
  }
}

const handlePreviewModalHotkeys = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showDeletePrompt.value) {
    event.preventDefault()
    closeDeletePrompt()
    return
  }

  if (event.key === 'Escape' && isCreatePreviewModalOpen.value) {
    event.preventDefault()
    closeCreatePreviewModal()
  }
}

const metrics = computed(() => [
  { label: 'Créditos disponibles', value: dashboard.value.credits_available },
  { label: 'Total', value: dashboard.value.total_invitations },
  { label: 'Borradores', value: dashboard.value.draft_invitations },
  { label: 'Publicadas', value: dashboard.value.published_invitations },
  {
    label: 'Ultima actualizacion',
    value: dashboard.value.last_updated_at ? new Date(dashboard.value.last_updated_at).toLocaleString() : 'Sin movimientos',
  },
])

const fetchCatalogs = async () => {
  const planId = session.user?.client_plan?.plan?.id
  if (!planId) return

  const templateResponse = await listCatalogTemplates({ plan_id: planId, perPage: 100, page: 1 })

  templates.value = templateResponse.list.filter(
    (template) => String(template.status ?? 'active').toLowerCase() === 'active',
  )

  const mappedTypeEvents = new Map<string, CatalogTypeEventItem>()
  templates.value.forEach((template) => {
    const id = template.type_event?.id ?? template.type_event_id
    if (id === undefined || id === null) return
    const key = String(id)
    if (mappedTypeEvents.has(key)) return
    mappedTypeEvents.set(key, {
      id,
      name: template.type_event?.name ?? `Evento ${key}`,
      status: 'active',
    })
  })
  typeEvents.value = Array.from(mappedTypeEvents.values())

  if (!createForm.type_event_id && typeEvents.value[0]?.id !== undefined) {
    createForm.type_event_id = String(typeEvents.value[0].id)
  }

  if (
    createForm.type_event_id &&
    !typeEvents.value.some((eventType) => String(eventType.id ?? '') === String(createForm.type_event_id))
  ) {
    createForm.type_event_id = typeEvents.value[0]?.id !== undefined
      ? String(typeEvents.value[0].id)
      : ''
  }

  if (!createForm.template_id) {
    const eventId = String(createForm.type_event_id ?? '').trim()
    const firstTemplate = eventId
      ? templates.value.find((item) => String(item.type_event_id ?? '') === eventId)
      : templates.value[0]

    if (firstTemplate?.id !== undefined) {
      createForm.template_id = String(firstTemplate.id)
    }
  }
}

const loadData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const [summary, rows] = await Promise.all([
      getTenantDashboardSummary(),
      listTenantInvitations({
        page: pagination.page,
        perPage: pagination.perPage,
        status: filters.status,
        search: filters.search,
      }),
    ])

    dashboard.value = summary
    invitations.value = rows.list
    pagination.total = rows.total
    pagination.lastPage = rows.lastPage
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus invitaciones.'
  } finally {
    isLoading.value = false
  }
}

const scheduleFilterRefresh = () => {
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = null
  }

  filterDebounceTimer = setTimeout(() => {
    pagination.page = 1
    void loadData()
  }, 260)
}

const nextPage = () => {
  if (pagination.page >= pagination.lastPage) return
  pagination.page += 1
  void loadData()
}

const prevPage = () => {
  if (pagination.page <= 1) return
  pagination.page -= 1
  void loadData()
}

const createInvitation = async () => {
  if (!createForm.type_event_id) {
    notifyError('Selecciona primero el tipo de evento.')
    return
  }

  if (!createForm.template_id) {
    notifyError('Selecciona una plantilla para crear tu invitación.')
    return
  }

  isCreating.value = true
  try {
    const response = await createTenantInvitation({
      template_id: createForm.template_id,
      type_event_id: createForm.type_event_id || null,
      title: createForm.title.trim() || null,
    })
    notifySuccess(response.message ?? 'Invitacion creada en borrador.')
    createForm.title = ''
    pagination.page = 1
    await loadData()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos crear la invitacion.')
  } finally {
    isCreating.value = false
  }
}

const openInvitationPublicUrl = (url: string): boolean => {
  if (typeof window === 'undefined') return false
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')
  return Boolean(openedWindow)
}

const openPublishedInvitation = (item: TenantInvitationItem) => {
  const publicUrl = String(item.public_url ?? '').trim()
  if (!publicUrl) {
    notifyError('Esta invitación todavía no tiene un enlace público disponible.')
    return
  }

  const wasOpened = openInvitationPublicUrl(publicUrl)
  if (!wasOpened) {
    notifyError('Tu navegador bloqueó la nueva pestaña. Abre el enlace desde la acción de copiar o permite popups.')
  }
}

const publishInvitation = async (item: TenantInvitationItem) => {
  if (!item.id) return

  try {
    const response = await publishTenantInvitation(item.id)
    const publicUrl = String(response.invitation.public_url ?? '').trim()
    if (publicUrl) {
      const wasOpened = openInvitationPublicUrl(publicUrl)
      notifySuccess(
        wasOpened
          ? 'Invitación publicada. Abrimos tu enlace en una pestaña nueva.'
          : 'Invitación publicada. El enlace público ya quedó activo.',
      )
    } else {
      notifySuccess(response.message ?? 'Invitacion publicada.')
    }
    await loadData()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos publicar la invitacion.')
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handlePreviewModalHotkeys)
  await fetchCatalogs()
  await loadCreateTemplatePreview()
  await loadData()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePreviewModalHotkeys)
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = null
  }
  document.body.style.overflow = ''
})

watch(
  () => createForm.type_event_id,
  (nextTypeEventId) => {
    const next = String(nextTypeEventId ?? '').trim()
    if (!next) return

    const currentTemplateId = String(createForm.template_id ?? '')
    const currentExistsInFilter = filteredTemplates.value.some((item) => String(item.id) === currentTemplateId)

    if (!currentExistsInFilter) {
      createForm.template_id = filteredTemplates.value[0]?.id !== undefined
        ? String(filteredTemplates.value[0].id)
        : ''
    }
  },
)

watch(
  () => [filters.status, filters.search],
  () => {
    scheduleFilterRefresh()
  },
)

watch(
  () => createForm.template_id,
  () => {
    if (selectedTemplate.value?.type_event_id && String(createForm.type_event_id ?? '') !== String(selectedTemplate.value.type_event_id)) {
      createForm.type_event_id = String(selectedTemplate.value.type_event_id)
    }
    void loadCreateTemplatePreview()
  },
)

watch(isCreatePreviewModalOpen, (isOpen) => {
  if (typeof document === 'undefined') return
  const lock = isOpen || showDeletePrompt.value
  document.body.style.overflow = lock ? 'hidden' : ''
})

watch(showDeletePrompt, (isOpen) => {
  if (typeof document === 'undefined') return
  const lock = isCreatePreviewModalOpen.value || isOpen
  document.body.style.overflow = lock ? 'hidden' : ''
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-invitations-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Operacion del evento</p>
        <h1 id="client-invitations-title">Mis invitaciones</h1>
        <p class="client-lead">
          Crea, edita y publica tus invitaciones. Los cambios se guardan en tu espacio de trabajo para que puedas continuar cuando quieras.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/estadisticas" variant="ghost">Ver estadisticas</BaseButton>
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ir a configuracion</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando invitaciones...</p>

    <section class="metrics-grid" aria-label="Resumen de invitaciones">
      <article v-for="item in metrics" :key="item.label" class="bo-card metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="bo-card create-card">
      <header class="section-head">
        <div>
          <h2>Nueva invitacion</h2>
          <p>Añade un título, elige el tipo de evento y selecciona una plantilla para iniciar.</p>
        </div>
      </header>

      <div class="create-grid">
        <label class="field">
          <span>Añadir título de invitación</span>
          <input v-model="createForm.title" type="text" placeholder="Ej: Boda de Sofia y Mateo" />
        </label>

        <label class="field">
          <span>Tipo de evento</span>
          <select v-model="createForm.type_event_id" :disabled="isCreating">
            <option value="" disabled>Selecciona un tipo de evento</option>
            <option v-for="eventType in typeEvents" :key="String(eventType.id)" :value="String(eventType.id)">
              {{ eventType.name }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Selecciona plantilla</span>
          <select v-model="createForm.template_id" :disabled="!hasTemplates || isCreating">
            <option value="" disabled>Selecciona una plantilla</option>
            <option v-for="template in filteredTemplates" :key="String(template.id)" :value="String(template.id)">
              {{ template.name ?? `Plantilla ${template.id}` }}
            </option>
          </select>
          <small v-if="createForm.type_event_id && !filteredTemplates.length" class="field-hint">
            No hay plantillas disponibles para este tipo de evento en tu plan.
          </small>
        </label>

        <div class="create-action">
          <BaseButton
            type="button"
            variant="primary"
            class="icon-action-btn"
            :disabled="isCreating || !hasTemplates"
            :aria-label="isCreating ? 'Creando borrador' : 'Crear borrador'"
            :title="isCreating ? 'Creando borrador' : 'Crear borrador'"
            :data-tooltip="isCreating ? 'Creando borrador' : 'Crear borrador'"
            @click="createInvitation">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </BaseButton>
          <BaseButton
            type="button"
            variant="ghost"
            class="icon-action-btn icon-action-btn--preview"
            :disabled="!createForm.template_id"
            aria-label="Previsualizar plantilla"
            title="Previsualizar plantilla"
            data-tooltip="Previsualizar plantilla"
            @click="openCreatePreviewModal">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
          </BaseButton>
        </div>
      </div>
    </section>

    <Transition name="template-preview-modal">
      <div
        v-if="isCreatePreviewModalOpen"
        class="template-preview-modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="closeCreatePreviewModal">
        <div class="template-preview-modal-card">
          <header class="template-preview-modal-head">
            <div>
              <p class="client-kicker">Vista previa</p>
              <h3>{{ selectedTemplate?.name ?? 'Plantilla seleccionada' }}</h3>
            </div>
            <button
              type="button"
              class="template-preview-modal-close"
              aria-label="Salir de la vista previa"
              title="Salir"
              data-tooltip="Salir"
              @click="closeCreatePreviewModal">
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
                :class="{ active: createPreviewDevice === option.value }"
                @click="createPreviewDevice = option.value">
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="template-preview-stage template-preview-stage--modal">
            <p v-if="!createTemplatePreviewModule" class="preview-placeholder">
              Selecciona una plantilla para ver la vista previa.
            </p>
            <div v-else class="template-preview-frame" :class="createPreviewViewportClass">
              <component
                :is="createTemplatePreviewModule.component"
                :template-id="Number(createForm.template_id || 0)"
                :manifest="createTemplatePreviewModule.manifest"
                :data="createPreviewData"
                :invitation-title="createForm.title || selectedTemplate?.name || 'Mi invitación'"
                :type-event-name="selectedTypeEventName || 'Evento'"
                :constrained-overlay="true" />
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <section class="bo-card filters-card">
      <div class="filters-row">
        <label class="field">
          <span>Estado</span>
          <select v-model="filters.status">
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicada</option>
          </select>
        </label>

        <label class="field field-search">
          <span>Buscar</span>
          <input v-model="filters.search" type="text" placeholder="Titulo o slug" />
        </label>
      </div>
    </section>

    <section class="bo-card">
      <header class="section-head">
        <div>
          <h2>Listado real de invitaciones</h2>
          <p>Resultados: {{ pagination.total }}</p>
        </div>
      </header>

      <div v-if="!hasInvitations" class="empty-box">
        Todavia no hay invitaciones registradas con los filtros actuales.
      </div>

      <div v-else class="table-wrap">
        <table class="invitation-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Titulo</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Creada</th>
              <th>Expira</th>
              <th>Actualizada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in invitations" :key="item.id">
              <td>#{{ item.id }}</td>
              <td>{{ item.title ?? 'Sin titulo' }}</td>
              <td>{{ item.slug ?? '-' }}</td>
              <td>{{ formatStatusLabel(item.status, 'Sin estado') }}</td>
              <td>{{ item.created_at ? new Date(item.created_at).toLocaleDateString() : '-' }}</td>
              <td>{{ item.expires_at ? new Date(item.expires_at).toLocaleDateString() : '-' }}</td>
              <td>{{ item.updated_at ? new Date(item.updated_at).toLocaleString() : '-' }}</td>
              <td class="actions-cell">
                <BaseButton
                  v-if="item.id"
                  as="RouterLink"
                  class="table-icon-btn"
                  aria-label="Editar invitación"
                  title="Editar"
                  data-tooltip="Editar"
                  :to="{ name: 'client-invitation-editor', params: { invitationId: item.id } }"
                  variant="ghost">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m4 20 4.6-1 9.8-9.8a1.7 1.7 0 0 0 0-2.4l-1.2-1.2a1.7 1.7 0 0 0-2.4 0L5 15.4 4 20Z" />
                    <path d="M13.5 6.5 17.5 10.5" />
                  </svg>
                </BaseButton>
                <BaseButton
                  v-if="String(item.status ?? '').toLowerCase() === 'draft'"
                  type="button"
                  class="table-icon-btn table-icon-btn--publish"
                  aria-label="Publicar invitación"
                  title="Publicar"
                  data-tooltip="Publicar"
                  variant="primary"
                  @click="publishInvitation(item)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12.5 20 4l-5.8 16-2.5-6L4 12.5Z" />
                    <path d="m20 4-8.3 9.8" />
                  </svg>
                </BaseButton>
                <BaseButton
                  v-if="String(item.status ?? '').toLowerCase() === 'published'"
                  type="button"
                  variant="ghost"
                  class="table-icon-btn"
                  aria-label="Abrir invitación publicada"
                  title="Abrir invitación"
                  data-tooltip="Abrir invitación"
                  @click="openPublishedInvitation(item)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 4h6v6" />
                    <path d="M20 4 11 13" />
                    <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
                  </svg>
                </BaseButton>
                <BaseButton
                  v-if="String(item.status ?? '').toLowerCase() === 'draft'"
                  type="button"
                  variant="ghost"
                  class="table-icon-btn delete-draft-btn"
                  aria-label="Eliminar borrador"
                  title="Eliminar borrador"
                  data-tooltip="Eliminar"
                  @click="askDeleteInvitation(item)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M9 7V5h6v2" />
                    <path d="M7 7l1 12h8l1-12" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-row">
        <BaseButton type="button" variant="ghost" :disabled="pagination.page <= 1" @click="prevPage">Anterior</BaseButton>
        <span>Pagina {{ pagination.page }} de {{ pagination.lastPage }}</span>
        <BaseButton type="button" variant="ghost" :disabled="pagination.page >= pagination.lastPage" @click="nextPage">Siguiente</BaseButton>
      </div>
    </section>

    <Transition name="template-preview-modal">
      <div
        v-if="showDeletePrompt"
        class="template-preview-modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="closeDeletePrompt">
        <div class="template-preview-modal-card delete-modal-card">
          <header class="template-preview-modal-head">
            <div>
              <p class="client-kicker">Eliminar borrador</p>
              <h3>¿Deseas eliminar esta invitación?</h3>
            </div>
            <button
              type="button"
              class="template-preview-modal-close"
              aria-label="Salir de la advertencia"
              title="Salir"
              data-tooltip="Salir"
              @click="closeDeletePrompt">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div class="delete-modal-body">
            <p>
              Vas a eliminar <strong>{{ deletingInvitation?.title ?? 'este borrador' }}</strong>.
            </p>
            <p>Esta acción no se puede deshacer.</p>
            <div class="delete-modal-actions">
              <BaseButton type="button" variant="ghost" :disabled="isDeleting" @click="closeDeletePrompt">
                Cancelar
              </BaseButton>
              <BaseButton type="button" variant="primary" :disabled="isDeleting" @click="confirmDeleteInvitation">
                {{ isDeleting ? 'Eliminando...' : 'Eliminar borrador' }}
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.client-page-head,
.metric-card,
.filters-card,
.create-card {
  padding: 22px;
}

.client-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-page-head h1,
.section-head h2 {
  margin: 0;
}

.client-lead,
.client-inline-note,
.section-head p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  gap: 0.75rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
}

.metric-card {
  display: grid;
  gap: 0.35rem;
}

.metric-card span {
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.metric-card strong {
  color: var(--brand-ink);
}

.section-head {
  margin-bottom: 1rem;
}

.create-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.95fr) minmax(260px, 1.1fr) auto;
  align-items: end;
}

.create-action {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.55rem;
  justify-content: flex-end;
}

.icon-action-btn {
  width: 46px;
  min-width: 46px;
  min-height: 46px;
  border-radius: 13px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.icon-action-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-action-btn--preview {
  border-color: rgba(30, 41, 59, 0.2);
  background: #fff;
}

.icon-action-btn[data-tooltip]::after,
.icon-action-btn[data-tooltip]::before,
.table-icon-btn[data-tooltip]::after,
.table-icon-btn[data-tooltip]::before,
.template-preview-modal-close[data-tooltip]::after,
.template-preview-modal-close[data-tooltip]::before {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.icon-action-btn[data-tooltip]::after,
.table-icon-btn[data-tooltip]::after,
.template-preview-modal-close[data-tooltip]::after {
  content: attr(data-tooltip);
  left: 50%;
  top: calc(100% + 11px);
  transform: translate(-50%, -4px);
  white-space: nowrap;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  color: #fff;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 0.38rem 0.55rem;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.28);
  z-index: 4;
}

.icon-action-btn[data-tooltip]::before,
.table-icon-btn[data-tooltip]::before,
.template-preview-modal-close[data-tooltip]::before {
  content: '';
  left: 50%;
  top: calc(100% + 5px);
  transform: translate(-50%, -4px);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(15, 23, 42, 0.95);
  z-index: 4;
}

.icon-action-btn[data-tooltip]:hover::after,
.icon-action-btn[data-tooltip]:hover::before,
.icon-action-btn[data-tooltip]:focus-visible::after,
.icon-action-btn[data-tooltip]:focus-visible::before,
.table-icon-btn[data-tooltip]:hover::after,
.table-icon-btn[data-tooltip]:hover::before,
.table-icon-btn[data-tooltip]:focus-visible::after,
.table-icon-btn[data-tooltip]:focus-visible::before,
.template-preview-modal-close[data-tooltip]:hover::after,
.template-preview-modal-close[data-tooltip]:hover::before,
.template-preview-modal-close[data-tooltip]:focus-visible::after,
.template-preview-modal-close[data-tooltip]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, 0);
}

.template-preview-toolbar {
  display: flex;
  justify-content: center;
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
  min-height: clamp(420px, 66vh, 760px);
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
  max-height: 420px;
}

.template-preview-frame--mobile {
  width: min(390px, 100%);
  margin: 0 auto;
}

.template-preview-frame--tablet {
  width: min(820px, 100%);
  margin: 0 auto;
}

.template-preview-frame--desktop {
  width: 100%;
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
  width: min(1280px, 100%);
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

.delete-draft-btn {
  border-color: rgba(190, 24, 93, 0.2);
  color: #9f1239;
}

.delete-modal-card {
  width: min(520px, 100%);
  height: auto;
  grid-template-rows: auto 1fr;
}

.delete-modal-body {
  padding: 16px 14px 18px;
  display: grid;
  gap: 0.6rem;
}

.delete-modal-body p {
  margin: 0;
  color: #475569;
}

.delete-modal-actions {
  margin-top: 0.4rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.filters-row {
  display: grid;
  gap: 12px;
  grid-template-columns: 220px minmax(260px, 420px);
  justify-content: start;
  align-items: end;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field span {
  font-weight: 700;
  color: var(--brand-ink);
}

.field-hint {
  color: #7c2d12;
  font-size: 0.78rem;
  font-weight: 600;
}

.field select,
.field input {
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.75rem 0.9rem;
  color: var(--brand-ink);
}

.field-search input {
  width: min(420px, 100%);
}

.empty-box {
  padding: 16px;
  border-radius: 14px;
  border: 1px dashed rgba(155, 107, 255, 0.2);
  color: #6a5a84;
}

.table-wrap {
  min-height: clamp(420px, 56vh, 620px);
  max-height: clamp(420px, 62vh, 700px);
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: #fff;
}

.invitation-table {
  width: 100%;
  border-collapse: collapse;
}

.invitation-table th,
.invitation-table td {
  text-align: left;
  padding: 12px 12px;
  border-bottom: 1px solid #eee7fb;
  font-size: 14px;
}

.invitation-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.table-icon-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.12s ease;
}

.table-icon-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.table-icon-btn.btn-ghost {
  background: #fff;
  border-color: rgba(148, 163, 184, 0.42);
  color: #334155;
  box-shadow: 0 2px 0 rgba(148, 163, 184, 0.14);
}

.table-icon-btn.btn-ghost:hover,
.table-icon-btn.btn-ghost:focus-visible {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.3);
}

.table-icon-btn.btn-primary {
  background: #f8fafc;
  border-color: rgba(15, 23, 42, 0.3);
  color: #0f172a;
  box-shadow: 0 2px 0 rgba(15, 23, 42, 0.1);
}

.table-icon-btn.btn-primary:hover,
.table-icon-btn.btn-primary:focus-visible {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.32);
}

.table-icon-btn:active {
  transform: translateY(1px) scale(0.98);
}

.table-icon-btn:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
  outline-offset: 2px;
}

.table-icon-btn--publish {
  border-width: 1px;
}

.table-icon-btn.delete-draft-btn {
  background: #fff1f2;
  border-color: rgba(190, 24, 93, 0.25);
  color: #9f1239;
  box-shadow: 0 2px 0 rgba(190, 24, 93, 0.12);
}

.table-icon-btn.delete-draft-btn:hover,
.table-icon-btn.delete-draft-btn:focus-visible {
  background: #9f1239;
  border-color: #9f1239;
  color: #fff;
  box-shadow: 0 10px 18px rgba(159, 18, 57, 0.3);
}

.pagination-row {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 1100px) {
  .create-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .create-action {
    justify-content: flex-start;
  }
}

@media (max-width: 1000px) {
  .filters-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions {
    width: 100%;
  }

  .create-grid {
    grid-template-columns: 1fr;
  }

  .create-action {
    justify-content: flex-start;
  }

  .icon-action-btn {
    width: 52px;
    min-width: 52px;
    min-height: 52px;
  }

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

  .delete-modal-card {
    height: auto;
  }

  .delete-modal-actions,
  .delete-modal-actions :deep(.btn) {
    width: 100%;
  }

  .template-preview-modal-close {
    min-width: 40px;
    width: 40px;
  }
}
</style>

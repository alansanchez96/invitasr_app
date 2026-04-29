<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import TemplatePreviewImmersiveModal from '@/components/client/TemplatePreviewImmersiveModal.vue'
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
import { resolveWeddingTemplatePreviewData } from '@/templates/previewData'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'
import { notifyError, notifySuccess } from '@/utils/toast'

type InvitationSortField = 'id' | 'title' | 'status' | 'created_at' | 'updated_at'
type InvitationSortDirection = 'asc' | 'desc'

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
const perPageOptions = [10, 15, 25, 50]
const sortBy = ref<InvitationSortField>('updated_at')
const sortDir = ref<InvitationSortDirection>('desc')
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
const totalPages = computed(() => Math.max(1, Number(pagination.lastPage || 1)))
const canGoPrev = computed(() => pagination.page > 1)
const canGoNext = computed(() => pagination.page < totalPages.value)
const pageItems = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, pagination.page - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})
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

const createPreviewData = computed<WeddingTemplateData>(() =>
  resolveWeddingTemplatePreviewData(createTemplatePreviewModule.value, {
    invitationTitle: createForm.title || selectedTemplate.value?.name,
    typeEventName: selectedTypeEventName.value,
  }),
)

const activeSortLabel = computed(() => {
  if (sortBy.value === 'title') {
    return `Título ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  }
  if (sortBy.value === 'status') {
    return sortDir.value === 'asc'
      ? 'Estado: borrador primero'
      : 'Estado: publicadas primero'
  }
  if (sortBy.value === 'created_at') {
    return sortDir.value === 'asc'
      ? 'Creación: más antiguas primero'
      : 'Creación: más recientes primero'
  }
  if (sortBy.value === 'updated_at') {
    return sortDir.value === 'asc'
      ? 'Actualización: más antiguas primero'
      : 'Actualización: más recientes primero'
  }
  return sortDir.value === 'asc'
    ? 'Orden: primeras invitaciones primero'
    : 'Orden: últimas invitaciones primero'
})

const toggleSort = (field: InvitationSortField) => {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortBy.value = field
  sortDir.value = field === 'status' || field === 'title' ? 'asc' : 'desc'
}

const isSortActive = (field: InvitationSortField) => sortBy.value === field

const sortIndicator = (field: InvitationSortField) => {
  if (sortBy.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

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
        orderField: sortBy.value,
        orderDirection: sortDir.value,
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

const goToPage = (page: number) => {
  const targetPage = Math.min(totalPages.value, Math.max(1, page))
  if (targetPage === pagination.page) return
  pagination.page = targetPage
  void loadData()
}

const nextPage = () => {
  goToPage(pagination.page + 1)
}

const prevPage = () => {
  goToPage(pagination.page - 1)
}

const refreshData = () => {
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

watch([sortBy, sortDir], () => {
  pagination.page = 1
  void loadData()
})

watch(
  () => pagination.perPage,
  () => {
    pagination.page = 1
    void loadData()
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
        <BaseButton as="RouterLink" to="/panel/estadisticas" variant="primary" class="stats-action-btn">
          Ver estadísticas
        </BaseButton>
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

    <TemplatePreviewImmersiveModal
      :open="isCreatePreviewModalOpen"
      :title="selectedTemplate?.name ?? 'Plantilla seleccionada'"
      :template-module="createTemplatePreviewModule"
      :template-id="Number(createForm.template_id || 0)"
      :preview-data="createPreviewData"
      :invitation-title="createForm.title || selectedTemplate?.name || 'Mi invitación'"
      :type-event-name="selectedTypeEventName || 'Evento'"
      :device="createPreviewDevice"
      @close="closeCreatePreviewModal"
      @update:device="createPreviewDevice = $event" />

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

        <p class="filters-helper">{{ activeSortLabel }}</p>
        <div class="filters-actions">
          <div class="per-page-control">
            <select id="invitation-list-per-page" aria-label="Cantidad de filas" v-model.number="pagination.perPage" :disabled="isLoading">
              <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <button
            type="button"
            class="refresh-icon-btn"
            :disabled="isLoading"
            aria-label="Recargar datos"
            title="Recargar datos"
            @click="refreshData">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" :class="{ 'is-spinning': isLoading }" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <section class="bo-card table-card">
      <header class="section-head">
        <div>
          <h2>Listado real de invitaciones</h2>
          <p>Total: {{ pagination.total }}</p>
        </div>
      </header>

      <div v-if="!hasInvitations" class="empty-box">
        Todavia no hay invitaciones registradas con los filtros actuales.
      </div>

      <div v-else class="table-wrap">
        <table class="invitation-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('id') }"
                  title="ID"
                  @click="toggleSort('id')">
                  <span>ID</span>
                  <span class="sort-head-indicator">{{ sortIndicator('id') }}</span>
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('title') }"
                  title="Título"
                  @click="toggleSort('title')">
                  <span>Título</span>
                  <span class="sort-head-indicator">{{ sortIndicator('title') }}</span>
                </button>
              </th>
              <th>Slug</th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('status') }"
                  title="Estado"
                  @click="toggleSort('status')">
                  <span>Estado</span>
                  <span class="sort-head-indicator">{{ sortIndicator('status') }}</span>
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('created_at') }"
                  title="Creada"
                  @click="toggleSort('created_at')">
                  <span>Creada</span>
                  <span class="sort-head-indicator">{{ sortIndicator('created_at') }}</span>
                </button>
              </th>
              <th>Expira</th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('updated_at') }"
                  title="Actualizada"
                  @click="toggleSort('updated_at')">
                  <span>Actualizada</span>
                  <span class="sort-head-indicator">{{ sortIndicator('updated_at') }}</span>
                </button>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in invitations" :key="item.id">
              <td data-label="ID">#{{ item.id }}</td>
              <td data-label="Título">{{ item.title ?? 'Sin título' }}</td>
              <td data-label="Slug">{{ item.slug ?? '-' }}</td>
              <td data-label="Estado">{{ formatStatusLabel(item.status, 'Sin estado') }}</td>
              <td data-label="Creada">{{ item.created_at ? new Date(item.created_at).toLocaleDateString() : '-' }}</td>
              <td data-label="Expira">{{ item.expires_at ? new Date(item.expires_at).toLocaleDateString() : '-' }}</td>
              <td data-label="Actualizada">{{ item.updated_at ? new Date(item.updated_at).toLocaleString() : '-' }}</td>
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

    </section>

    <footer class="bo-card pagination-card">
      <div class="pagination-layout">
        <BaseButton
          type="button"
          variant="ghost"
          class="pagination-nav-btn pagination-nav-btn--left"
          :disabled="!canGoPrev || isLoading"
          @click="prevPage">
          <span class="pagination-arrow" aria-hidden="true">←</span>
          <span class="pagination-label">Anterior</span>
        </BaseButton>

        <div class="pagination-center">
          <p class="pagination-summary">
            Página {{ pagination.page }} de {{ totalPages }} · {{ pagination.total }} registros
          </p>

          <div class="pagination-pages">
            <button
              v-for="page in pageItems"
              :key="`invite-page-${page}`"
              type="button"
              class="page-btn"
              :class="{ 'page-btn--active': page === pagination.page }"
              :disabled="isLoading"
              @click="goToPage(page)">
              {{ page }}
            </button>
          </div>
        </div>

        <BaseButton
          type="button"
          variant="ghost"
          class="pagination-nav-btn pagination-nav-btn--right"
          :disabled="!canGoNext || isLoading"
          @click="nextPage">
          <span class="pagination-label">Siguiente</span>
          <span class="pagination-arrow" aria-hidden="true">→</span>
        </BaseButton>
      </div>
    </footer>

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

.table-card,
.pagination-card {
  padding: 20px;
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

.stats-action-btn {
  min-height: 42px;
  padding-inline: 1rem;
  border-radius: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
}

.stats-action-btn:hover,
.stats-action-btn:focus-visible {
  transform: translateY(-1px);
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
.table-icon-btn[data-tooltip]::before {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.icon-action-btn[data-tooltip]::after,
.table-icon-btn[data-tooltip]::after {
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
.table-icon-btn[data-tooltip]::before {
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
.table-icon-btn[data-tooltip]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, 0);
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
  grid-template-rows: auto 1fr;
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
  grid-template-columns: minmax(180px, 240px) minmax(220px, 1fr) auto auto;
  align-items: end;
  justify-content: space-between;
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
  width: 100%;
}

.filters-helper {
  margin: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(111, 57, 187, 0.18);
  background: rgba(247, 243, 255, 0.86);
  color: #4f357f;
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0 0.85rem;
}

.filters-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-height: 44px;
  justify-self: end;
  margin-left: auto;
}

.empty-box {
  padding: 16px;
  border-radius: 14px;
  border: 1px dashed rgba(155, 107, 255, 0.2);
  color: #6a5a84;
}

.table-wrap {
  width: 100%;
}

.invitation-table {
  width: 100%;
  border-collapse: collapse;
}

.invitation-table th,
.invitation-table td {
  text-align: left;
  padding: 12px 12px;
  border-bottom: 1px solid #eee5fb;
  font-size: 0.92rem;
  color: #2b2242;
}

.invitation-table th {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b5b86;
}

.sort-head-btn {
  appearance: none;
  border: none;
  background: transparent;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  padding: 0;
}

.sort-head-indicator {
  font-size: 0.78rem;
  color: #8a7ca4;
}

.sort-head-btn--active {
  color: #4f2d81;
}

.sort-head-btn--active .sort-head-indicator {
  color: #4f2d81;
}

.invitation-table tbody tr:hover td {
  background: #fbf8ff;
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

.pagination-card {
  display: block;
}

.pagination-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 0.8rem;
  width: 100%;
}

.pagination-center {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.pagination-summary {
  margin: 0;
  font-size: 0.9rem;
  color: #5d4e79;
  text-align: center;
}

.pagination-nav-btn--left {
  justify-self: start;
}

.pagination-nav-btn--right {
  justify-self: end;
}

:deep(.pagination-nav-btn) {
  min-height: 36px;
  border-radius: 10px;
  white-space: nowrap;
  padding-inline: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
}

.pagination-label {
  line-height: 1;
}

.pagination-arrow {
  line-height: 1;
}

.pagination-pages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex-wrap: nowrap;
}

.per-page-control {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: #5d4e79;
  font-weight: 600;
}

.per-page-control select {
  min-height: 34px;
  border-radius: 9px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #2f2050;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0 0.6rem;
}

.refresh-icon-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #4f2d81;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.refresh-icon-btn svg {
  width: 16px;
  height: 16px;
}

.refresh-icon-btn:hover,
.refresh-icon-btn:focus-visible {
  background: #f6f2ff;
  border-color: #cdbcf2;
}

.refresh-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.refresh-icon-btn .is-spinning {
  animation: spin-refresh 0.8s linear infinite;
}

@keyframes spin-refresh {
  to { transform: rotate(360deg); }
}

.page-btn {
  min-width: 34px;
  height: 34px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #2f2050;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-btn--active {
  border-color: transparent;
  background: linear-gradient(120deg, #6f39bb, #c2548d);
  color: #fff;
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

@media (max-width: 900px) {
  .table-wrap {
    min-height: auto;
    max-height: none;
    overflow: visible;
    border: 0;
    background: transparent;
  }

  .invitation-table,
  .invitation-table tbody {
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  .invitation-table thead {
    display: none;
  }

  .invitation-table tr {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  }

  .invitation-table td {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 6px;
    padding: 0;
    border-bottom: 0;
    font-size: 0.85rem;
    align-items: start;
  }

  .invitation-table td::before {
    content: attr(data-label);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(90, 48, 140, 0.78);
  }

  .actions-cell {
    grid-template-columns: 1fr;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 4px;
  }

  .actions-cell::before {
    display: none;
  }

  .pagination-layout {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.55rem;
  }

  .pagination-summary {
    font-size: 0.84rem;
  }

  .pagination-pages {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: thin;
    padding-bottom: 2px;
  }

  :deep(.pagination-nav-btn) {
    min-height: 34px;
    padding-inline: 0.7rem;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .pagination-layout {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 0.5rem;
    align-items: start;
  }

  .pagination-center {
    gap: 0.35rem;
  }

  :deep(.pagination-nav-btn) {
    min-height: 38px;
    width: 44px;
    min-width: 44px;
    padding-inline: 0;
    border-radius: 12px;
    justify-content: center;
  }

  .pagination-label {
    display: none;
  }

  .pagination-arrow {
    font-size: 1rem;
  }

  .pagination-summary {
    font-size: 0.8rem;
  }

  .pagination-pages {
    max-width: 100%;
    justify-content: flex-start;
    scrollbar-width: none;
    padding-bottom: 0;
  }

  .pagination-pages::-webkit-scrollbar {
    display: none;
  }

  .client-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .filters-actions {
    width: 100%;
    justify-content: space-between;
  }

  .stats-action-btn {
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

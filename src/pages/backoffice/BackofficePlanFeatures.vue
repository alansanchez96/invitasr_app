<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  createPlanFeature,
  deletePlanFeature,
  listPlanFeatures,
  updatePlanFeature,
  type PlanFeatureDetail,
  type PlanFeatureItem,
} from '@/services/planFeatures'
import { listPlans, type PlanListItem } from '@/services/plans'
import { listFeatures, type FeatureListItem } from '@/services/features'
import { notifyError, notifySuccess } from '@/utils/toast'

type Filters = {
  plan_id: string
  page: number
  perPage: number
}

type PlanOption = {
  id: string | number
  label: string
}

type FeatureOption = {
  id: string | number
  key: string
  type: string
  description?: string
}

type AssociationForm = {
  feature_id: string
  status: 'active' | 'inactive'
  limit: string
  config: string
}

const filters = reactive<Filters>({
  plan_id: '',
  page: 1,
  perPage: 10,
})

const list = ref<PlanFeatureItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)
const catalogsLoading = ref(false)

const planOptions = ref<PlanOption[]>([])
const featureOptions = ref<FeatureOption[]>([])

const selectedKey = ref<string | number | null>(null)
const selected = ref<PlanFeatureDetail | null>(null)
const isEditing = ref(false)

const isResettingFilters = ref(false)
const isFiltersOpen = ref(true)

const isCreateModalOpen = ref(false)
const isCreateLoading = ref(false)
const isSaving = ref(false)
const isDeleteConfirmOpen = ref(false)
const isDeleting = ref(false)

const createForm = reactive<AssociationForm>({
  feature_id: '',
  status: 'active',
  limit: '',
  config: '[]',
})

const editForm = reactive<AssociationForm>({
  feature_id: '',
  status: 'active',
  limit: '',
  config: '[]',
})

const hasSelection = computed(() => selectedKey.value !== null)
const isAnyModalOpen = computed(() => isCreateModalOpen.value || isDeleteConfirmOpen.value)
let filtersTimer: number | undefined
let previousBodyOverflow = ''

const perPageOptions = [10, 15, 25, 50]
const isCompactPagination = ref(false)

const buildCompactPagination = (totalPages: number, current: number) => {
  if (totalPages <= 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (current <= 1) return [1, 2, '...']
  if (current >= totalPages) return ['...', totalPages - 1, totalPages]

  return ['...', current, Math.min(totalPages, current + 1), '...']
}

const formatStatus = (value?: string) => {
  if (!value || value === 'active') return 'Activo'
  if (value === 'inactive') return 'Inactivo'
  return value
}

const formatType = (value?: string) => {
  if (!value || value === 'boolean') return 'Booleano'
  if (value === 'limit') return 'Limite'
  if (value === 'config') return 'Configurable'
  return value
}

const selectedPlanLabel = computed(() => {
  const found = planOptions.value.find((option) => String(option.id) === filters.plan_id)
  return found?.label ?? 'Sin plan seleccionado'
})

const selectedCreateFeature = computed(() =>
  featureOptions.value.find((feature) => String(feature.id) === createForm.feature_id),
)

const itemKey = (item: PlanFeatureItem) => {
  if (item.feature_id !== undefined && item.feature_id !== null) {
    return String(item.feature_id)
  }
  if (item.feature_key) {
    return item.feature_key
  }
  return ''
}

const formatConfig = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const formatFeatureOptionLabel = (feature: FeatureOption) => {
  const summary = feature.description?.trim() ? ` - ${feature.description.trim()}` : ''
  return `${feature.key}${summary} (${formatType(feature.type)})`
}

const getFeatureDescription = (item?: PlanFeatureItem | PlanFeatureDetail | null) => {
  if (!item) return '-'
  if (item.feature_description && item.feature_description.trim()) return item.feature_description.trim()
  const found = featureOptions.value.find((feature) => String(feature.id) === String(item.feature_id ?? ''))
  if (found?.description?.trim()) return found.description.trim()
  return 'Sin descripcion disponible.'
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const parseConfigInput = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    return JSON.parse(trimmed)
  } catch {
    notifyError('El campo Config debe tener un JSON valido.')
    return null
  }
}

const configToEditorText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '[]'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[]'
  }
}

const hydrateEditForm = (item: PlanFeatureItem) => {
  editForm.feature_id = item.feature_id === undefined || item.feature_id === null ? '' : String(item.feature_id)
  editForm.status = item.status === 'inactive' ? 'inactive' : 'active'
  editForm.limit = item.limit === null || item.limit === undefined ? '' : String(item.limit)
  editForm.config = configToEditorText(item.config)
}

const resetCreateForm = () => {
  createForm.feature_id = featureOptions.value.length ? String(featureOptions.value[0].id) : ''
  createForm.status = 'active'
  createForm.limit = ''
  createForm.config = '[]'
}

const loadPlanOptions = async () => {
  const collected: PlanOption[] = []
  let page = 1
  let last = 1
  let guard = 0

  do {
    const result = await listPlans({
      page,
      perPage: 50,
      orderField: 'name',
      orderDirection: 'asc',
    })

    result.list.forEach((item: PlanListItem) => {
      if (item.id === undefined || item.id === null) return
      collected.push({
        id: item.id,
        label: item.name ?? `Plan ${item.id}`,
      })
    })

    page += 1
    last = result.lastPage
    guard += 1
  } while (page <= last && guard < 10)

  planOptions.value = collected
}

const loadFeatureOptions = async () => {
  const collected: FeatureOption[] = []
  let page = 1
  let last = 1
  let guard = 0

  do {
    const result = await listFeatures({
      page,
      perPage: 50,
      orderField: 'key',
      orderDirection: 'asc',
    })

    result.list.forEach((item: FeatureListItem) => {
      if (item.id === undefined || item.id === null) return
      collected.push({
        id: item.id,
        key: item.key ?? `feature_${item.id}`,
        type: item.type ?? 'boolean',
        description: item.description ?? '',
      })
    })

    page += 1
    last = result.lastPage
    guard += 1
  } while (page <= last && guard < 10)

  featureOptions.value = collected
}

const fetchCatalogs = async () => {
  catalogsLoading.value = true
  try {
    await Promise.all([loadPlanOptions(), loadFeatureOptions()])

    if (!filters.plan_id && planOptions.value.length) {
      filters.plan_id = String(planOptions.value[0].id)
    }
  } catch {
    notifyError('No pudimos cargar planes y funcionalidades.')
  } finally {
    catalogsLoading.value = false
  }
}

const clearSelection = () => {
  selectedKey.value = null
  selected.value = null
  isEditing.value = false
}

const fetchList = async () => {
  if (!filters.plan_id) {
    list.value = []
    total.value = 0
    lastPage.value = 1
    clearSelection()
    return
  }

  isLoading.value = true
  try {
    const result = await listPlanFeatures(filters.plan_id, {
      page: filters.page,
      perPage: filters.perPage,
    })

    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage

    if (selectedKey.value !== null) {
      const target = result.list.find((item) => itemKey(item) === String(selectedKey.value))
      if (target) {
        selected.value = target as PlanFeatureDetail
      } else {
        clearSelection()
      }
    }
  } catch {
    notifyError()
  } finally {
    isLoading.value = false
  }
}

const openAssociation = (item: PlanFeatureItem) => {
  const key = itemKey(item)
  if (!key) return
  selectedKey.value = key
  selected.value = item as PlanFeatureDetail
  hydrateEditForm(item)
  isEditing.value = false
}

const openCreateModal = () => {
  if (!filters.plan_id) {
    notifyError('Selecciona un plan para asociar funcionalidades.')
    return
  }
  if (!featureOptions.value.length) {
    notifyError('No hay funcionalidades disponibles para asociar.')
    return
  }
  resetCreateForm()
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  if (isCreateLoading.value) return
  isCreateModalOpen.value = false
}

const submitCreate = async () => {
  if (!filters.plan_id) {
    notifyError('Selecciona un plan valido.')
    return
  }
  if (!createForm.feature_id) {
    notifyError('Selecciona una funcionalidad.')
    return
  }

  const config = parseConfigInput(createForm.config)
  if (config === null) return

  isCreateLoading.value = true
  try {
    const created = (await createPlanFeature(filters.plan_id, {
      feature_id: createForm.feature_id,
      status: createForm.status,
      limit: parseOptionalNumber(createForm.limit),
      config,
    })) as PlanFeatureDetail

    notifySuccess('Funcionalidad asociada al plan correctamente.')
    closeCreateModal()
    await fetchList()

    const createdKey = created.feature_id ? String(created.feature_id) : ''
    if (createdKey) {
      const target = list.value.find((item) => itemKey(item) === createdKey)
      if (target) {
        openAssociation(target)
      }
    }
  } catch {
    notifyError()
  } finally {
    isCreateLoading.value = false
  }
}

const startEdit = () => {
  if (!selected.value) return
  hydrateEditForm(selected.value)
  isEditing.value = true
}

const cancelEdit = () => {
  if (!selected.value || isSaving.value) return
  hydrateEditForm(selected.value)
  isEditing.value = false
}

const saveEdit = async () => {
  if (!selected.value) return

  const planId = selected.value.plan_id ?? filters.plan_id
  const featureId = selected.value.feature_id
  if (!planId || !featureId) {
    notifyError('No pudimos identificar la asociacion a actualizar.')
    return
  }

  const config = parseConfigInput(editForm.config)
  if (config === null) return

  isSaving.value = true
  try {
    const updated = (await updatePlanFeature(planId, featureId, {
      status: editForm.status,
      limit: parseOptionalNumber(editForm.limit),
      config,
    })) as PlanFeatureDetail

    const merged: PlanFeatureDetail = {
      ...selected.value,
      ...updated,
      status: editForm.status,
      limit: parseOptionalNumber(editForm.limit),
      config,
    }

    selected.value = merged

    const currentKey = itemKey(selected.value)
    const index = list.value.findIndex((item) => itemKey(item) === currentKey)
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        ...merged,
      }
    }

    isEditing.value = false
    notifySuccess('Asociacion actualizada correctamente.')
  } catch {
    notifyError()
  } finally {
    isSaving.value = false
  }
}

const requestDelete = () => {
  if (!selected.value || isEditing.value) return
  isDeleteConfirmOpen.value = true
}

const cancelDelete = () => {
  if (isDeleting.value) return
  isDeleteConfirmOpen.value = false
}

const confirmDelete = async () => {
  if (!selected.value) return

  const planId = selected.value.plan_id ?? filters.plan_id
  const featureId = selected.value.feature_id
  if (!planId || !featureId) {
    notifyError('No pudimos identificar la asociacion a eliminar.')
    return
  }

  isDeleting.value = true
  try {
    await deletePlanFeature(planId, featureId)
    notifySuccess('Asociacion eliminada correctamente.')
    isDeleteConfirmOpen.value = false
    clearSelection()
    await fetchList()
  } catch {
    notifyError()
  } finally {
    isDeleting.value = false
  }
}

const scheduleFiltersFetch = (immediate = false) => {
  if (filtersTimer) window.clearTimeout(filtersTimer)

  const run = () => {
    filters.page = 1
    clearSelection()
    fetchList()
  }

  if (immediate) {
    run()
    return
  }

  filtersTimer = window.setTimeout(run, 220)
}

const resetFilters = () => {
  isResettingFilters.value = true
  filters.plan_id = planOptions.value.length ? String(planOptions.value[0].id) : ''
  filters.page = 1
  filters.perPage = 10
  isResettingFilters.value = false
  scheduleFiltersFetch(true)
}

const goToPage = (direction: 'prev' | 'next') => {
  if (direction === 'prev' && filters.page > 1) {
    filters.page -= 1
    fetchList()
  }
  if (direction === 'next' && filters.page < lastPage.value) {
    filters.page += 1
    fetchList()
  }
}

const goToPageNumber = (page: number) => {
  if (page < 1 || page > lastPage.value || page === filters.page) return
  filters.page = page
  fetchList()
}

const paginationItems = computed<(number | string)[]>(() => {
  const totalPages = lastPage.value
  const current = filters.page
  if (isCompactPagination.value) {
    return buildCompactPagination(totalPages, current)
  }
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const items: (number | string)[] = [1]
  if (current > 3) items.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  for (let i = start; i <= end; i += 1) items.push(i)
  if (current < totalPages - 2) items.push('...')
  items.push(totalPages)
  return items
})

const updatePaginationViewport = () => {
  isCompactPagination.value = window.matchMedia('(max-width: 1010px)').matches
}

onMounted(async () => {
  isFiltersOpen.value = !window.matchMedia('(max-width: 900px)').matches
  updatePaginationViewport()
  window.addEventListener('resize', updatePaginationViewport)

  await fetchCatalogs()
  if (filters.plan_id) {
    fetchList()
  }
})

onUnmounted(() => {
  if (filtersTimer) window.clearTimeout(filtersTimer)
  window.removeEventListener('resize', updatePaginationViewport)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
  }
})

watch(
  () => filters.plan_id,
  () => {
    if (isResettingFilters.value) return
    scheduleFiltersFetch(true)
  },
)

watch(
  () => filters.perPage,
  () => {
    if (isResettingFilters.value) return
    filters.page = 1
    fetchList()
  },
)

watch(isAnyModalOpen, (isOpen) => {
  if (typeof document === 'undefined') return
  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="bo-page container">
    <header class="bo-page-header">
      <h1>Funcionalidades por plan</h1>
      <button class="primary-action" type="button" :disabled="catalogsLoading || !filters.plan_id" @click="openCreateModal">
        Crear asociacion
      </button>
      <div class="bo-divider"></div>
    </header>

    <section class="bo-card bo-filters-card">
      <div class="filters-head">
        <strong>Filtros</strong>
        <button
          class="filters-toggle"
          type="button"
          :aria-expanded="isFiltersOpen"
          aria-controls="filters-panel"
          @click="isFiltersOpen = !isFiltersOpen">
          <span>{{ isFiltersOpen ? 'Ocultar' : 'Ver' }}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      <div id="filters-panel" class="filters-panel" :class="{ open: isFiltersOpen }" role="region" aria-label="Filtros de asociaciones plan-feature">
        <div class="bo-filters">
          <div class="field field--plan">
            <label for="filter-plan">Plan</label>
            <select id="filter-plan" v-model="filters.plan_id" :disabled="catalogsLoading">
              <option value="">Selecciona un plan</option>
              <option v-for="plan in planOptions" :key="String(plan.id)" :value="String(plan.id)">
                {{ plan.label }}
              </option>
            </select>
          </div>
          <button class="filters-clear" type="button" aria-label="Limpiar filtros" title="Restablecer vista" @click="resetFilters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M7 6l1 14h8l1-14" />
              <path d="M10 10v6" />
              <path d="M14 10v6" />
            </svg>
          </button>
        </div>
        <div class="filters-note">
          <span class="bo-muted">Plan activo:</span>
          <strong>{{ selectedPlanLabel }}</strong>
        </div>
      </div>
    </section>

    <section class="bo-content">
      <div class="bo-card bo-table">
        <div class="bo-table-header">
          <h2>Listado</h2>
          <span class="bo-muted">Total: {{ total }}</span>
        </div>

        <div v-if="isLoading" class="bo-loading" role="status" aria-live="polite">Cargando funcionalidades del plan...</div>

        <table v-else>
          <caption class="sr-only">Listado de funcionalidades asociadas al plan</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Funcionalidad</th>
              <th scope="col">Descripcion</th>
              <th scope="col">Tipo</th>
              <th scope="col">Estado</th>
              <th scope="col">Limite</th>
              <th scope="col">Config</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in list"
              :key="itemKey(item)"
              class="table-row"
              :class="{ 'is-selected': itemKey(item) === String(selectedKey) }"
              tabindex="0"
              :aria-label="`Ver detalle de funcionalidad ${item.feature_key ?? ''}`"
              :aria-selected="itemKey(item) === String(selectedKey)"
              @click="openAssociation(item)"
              @keydown.enter.prevent="openAssociation(item)"
              @keydown.space.prevent="openAssociation(item)">
              <td>{{ item.feature_id ?? '-' }}</td>
              <td>{{ item.feature_key ?? '-' }}</td>
              <td>
                <span class="description-ellipsis" :title="getFeatureDescription(item)">{{ getFeatureDescription(item) }}</span>
              </td>
              <td>{{ formatType(item.feature_type) }}</td>
              <td><span class="status-badge" :class="item.status ?? 'active'">{{ formatStatus(item.status) }}</span></td>
              <td>{{ item.limit ?? '-' }}</td>
              <td>
                <span class="config-ellipsis" :title="formatConfig(item.config)">{{ formatConfig(item.config) }}</span>
              </td>
            </tr>
            <tr v-if="!list.length">
              <td colspan="7" class="bo-empty">No encontramos funcionalidades asociadas para este plan.</td>
            </tr>
          </tbody>
        </table>

        <div class="bo-pagination">
          <div class="pagination-left">
            <button type="button" @click="goToPage('prev')" :disabled="filters.page <= 1">Anterior</button>
            <div class="page-buttons" role="navigation" aria-label="Paginas">
              <button
                v-for="(item, index) in paginationItems"
                :key="`page-${item}-${index}`"
                type="button"
                class="page-button"
                :class="{ active: item === filters.page }"
                :disabled="item === '...'"
                :aria-current="item === filters.page ? 'page' : undefined"
                @click="typeof item === 'number' && goToPageNumber(item)">
                {{ item }}
              </button>
            </div>
            <button type="button" @click="goToPage('next')" :disabled="filters.page >= lastPage">Siguiente</button>
          </div>
          <div class="pagination-right">
            <span>Pagina {{ filters.page }} de {{ lastPage }}</span>
            <label class="per-page">
              <span>Resultados:</span>
              <select v-model.number="filters.perPage">
                <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <aside class="bo-card bo-detail" :class="{ empty: !hasSelection }">
        <header class="bo-detail-header">
          <h2>Detalle</h2>
          <button v-if="hasSelection" class="link-button" type="button" @click="clearSelection">Cerrar</button>
        </header>

        <div v-if="!hasSelection" class="bo-muted">Selecciona una asociacion para ver el detalle.</div>
        <div v-else-if="selected" class="bo-detail-body">
          <div class="detail-row">
            <span>Plan</span>
            <strong>{{ selected.plan_name ?? selectedPlanLabel }}</strong>
          </div>

          <div class="detail-row">
            <span>Funcionalidad</span>
            <strong>{{ selected.feature_key ?? '-' }}</strong>
          </div>

          <div class="detail-row">
            <span>Descripcion</span>
            <strong class="config-preview">{{ getFeatureDescription(selected) }}</strong>
          </div>

          <div class="detail-row">
            <span>Tipo</span>
            <strong>{{ formatType(selected.feature_type) }}</strong>
          </div>

          <div class="detail-row">
            <span>Estado</span>
            <strong v-if="!isEditing"><span class="status-badge" :class="selected.status ?? 'active'">{{ formatStatus(selected.status) }}</span></strong>
            <select v-else v-model="editForm.status">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div class="detail-row">
            <span>Limite</span>
            <strong v-if="!isEditing" class="dbl-edit-trigger" title="Doble clic para editar" @dblclick.stop="startEdit">{{ selected.limit ?? '-' }}</strong>
            <input v-else v-model="editForm.limit" type="number" placeholder="Opcional" />
          </div>

          <div class="detail-row">
            <span>Config (JSON)</span>
            <strong v-if="!isEditing" class="dbl-edit-trigger config-preview" title="Doble clic para editar" @dblclick.stop="startEdit">{{ formatConfig(selected.config) }}</strong>
            <textarea v-else v-model="editForm.config" rows="5" spellcheck="false"></textarea>
          </div>

          <div class="detail-actions">
            <div class="detail-actions-main">
              <button
                class="btn-outline"
                type="button"
                :disabled="isSaving || isDeleting"
                @click="isEditing ? saveEdit() : startEdit()">
                {{ isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Editar' }}
              </button>
              <button v-if="isEditing" class="btn-link" type="button" :disabled="isSaving" @click="cancelEdit">Cancelar</button>
            </div>
            <button
              class="btn-danger"
              type="button"
              :class="{ disabled: isEditing }"
              :disabled="isDeleting || isEditing || isSaving"
              @click="requestDelete">
              {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </aside>
    </section>

    <div
      v-if="isCreateModalOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crear asociacion plan-feature"
      @click.self="closeCreateModal">
      <div class="modal-card" @click.stop>
        <h3>Asociar funcionalidad al plan</h3>
        <div class="modal-form">
          <label class="full-width">
            <span>Plan</span>
            <input :value="selectedPlanLabel" type="text" disabled />
          </label>
          <label class="full-width">
            <span>Funcionalidad</span>
            <select v-model="createForm.feature_id" :disabled="catalogsLoading">
              <option value="">Selecciona una funcionalidad</option>
              <option v-for="feature in featureOptions" :key="String(feature.id)" :value="String(feature.id)">
                {{ formatFeatureOptionLabel(feature) }}
              </option>
            </select>
          </label>
          <div v-if="selectedCreateFeature" class="feature-hint full-width" role="status" aria-live="polite">
            <strong>{{ selectedCreateFeature.key }}</strong>
            <span>{{ selectedCreateFeature.description?.trim() || 'Sin descripcion disponible para esta funcionalidad.' }}</span>
          </div>
          <label>
            <span>Estado</span>
            <select v-model="createForm.status">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label>
            <span>Limite</span>
            <input v-model="createForm.limit" type="number" placeholder="Opcional" />
          </label>
          <label class="full-width">
            <span>Config (JSON)</span>
            <textarea v-model="createForm.config" rows="5" spellcheck="false"></textarea>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isCreateLoading" @click="closeCreateModal">Cancelar</button>
          <button class="primary-action" type="button" :disabled="isCreateLoading" @click="submitCreate">
            {{ isCreateLoading ? 'Creando...' : 'Crear asociacion' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isDeleteConfirmOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminacion de asociacion"
      @click.self="cancelDelete">
      <div class="modal-card confirm-card" @click.stop>
        <h3>Eliminar asociacion</h3>
        <p>
          Vas a quitar la funcionalidad <strong>{{ selected?.feature_key ?? '-' }}</strong> del plan
          <strong>{{ selected?.plan_name ?? selectedPlanLabel }}</strong>. Esta accion no se puede deshacer.
        </p>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isDeleting" @click="cancelDelete">Cancelar</button>
          <button class="btn-danger" type="button" :disabled="isDeleting" @click="confirmDelete">
            {{ isDeleting ? 'Eliminando...' : 'Eliminar asociacion' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bo-page { display: grid; gap: 24px; }
.bo-page-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 8px;
}

.bo-page-header h1 { margin: 0; }
.bo-divider { grid-column: 1 / -1; height: 1px; background: #ece7f8; }
.bo-card { background: #fff; border: 1px solid #e6e8f0; border-radius: 18px; padding: 20px; box-shadow: var(--shadow-card); }
.bo-filters-card { display: grid; gap: 12px; }

.primary-action {
  border: 1px solid transparent;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
}

.primary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filters-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 600; }
.filters-toggle { display: none; align-items: center; gap: 6px; border: 1px solid #e2ddf7; border-radius: 999px; padding: 6px 12px; background: #fbfaff; color: #7a4fd9; font-weight: 600; cursor: pointer; }
.filters-toggle svg { width: 14px; height: 14px; }
.filters-panel { display: grid; gap: 12px; }
.bo-filters { display: grid; gap: 16px; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: end; }
.field--plan { grid-column: 1 / span 2; grid-row: 1; }
.field { display: grid; gap: 8px; }
.field label { font-size: 13px; color: #6b6b80; font-weight: 600; }
.field input, .field select, .detail-row input, .detail-row select, textarea {
  border-radius: 12px;
  border: 1px solid #e2ddf7;
  padding: 10px 12px;
  background: #fbfaff;
}

textarea {
  resize: vertical;
  min-height: 92px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
}

.filters-clear { width: 44px; height: 44px; border-radius: 12px; border: 1px solid #e2ddf7; background: #fbfaff; color: #7a4fd9; display: grid; place-items: center; cursor: pointer; transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; justify-self: end; grid-column: 4; grid-row: 1; }
.filters-clear svg { width: 18px; height: 18px; }
.filters-clear:hover, .filters-clear:focus-visible { background: var(--gradient-brand); color: #fff; border-color: rgba(155, 107, 255, 0.2); }
.filters-note { display: inline-flex; align-items: center; gap: 8px; }

.bo-page.container { width: 100%; max-width: 1320px; margin: 0 auto; }
.bo-content { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 20px; }
.bo-table table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: fixed; }
.bo-table th, .bo-table td { padding: 14px 12px; text-align: left; border-bottom: 1px solid #edf0f6; font-size: 13px; }
.bo-table th { color: #475569; font-weight: 700; }
.bo-table tbody .table-row { cursor: pointer; transition: background 0.2s ease; }
.bo-table tbody .table-row:hover { background: #f6f4ff; }
.bo-table tbody .table-row.is-selected { background: #efe7ff; }
.bo-table tbody .table-row:focus-visible { outline: 2px solid rgba(122, 79, 217, 0.6); outline-offset: -2px; }

.status-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; font-weight: 600; background: rgba(16, 185, 129, 0.16); color: #0f766e; }
.status-badge.inactive { background: rgba(239, 68, 68, 0.16); color: #b91c1c; }

.config-ellipsis {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description-ellipsis {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #475569;
}

.bo-empty { text-align: center !important; color: #6b6b80; font-weight: 600; padding: 22px 10px !important; }
.bo-table-header { display: flex; justify-content: space-between; align-items: center; }
.bo-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 12px; font-size: 13px; color: #6b6b80; }
.pagination-left { display: flex; align-items: center; gap: 10px; }
.pagination-left button { border-radius: 999px; border: 1px solid #e2ddf7; background: #fff; padding: 6px 12px; font-weight: 600; cursor: pointer; }
.page-buttons { display: flex; align-items: center; gap: 6px; }
.page-button { border-radius: 999px; border: 1px solid transparent; background: #f3f0ff; color: #7a4fd9; padding: 4px 10px; font-weight: 600; cursor: pointer; }
.page-button.active { background: #7a4fd9; color: #fff; }
.pagination-right { display: flex; align-items: center; gap: 12px; }
.per-page { display: inline-flex; align-items: center; gap: 8px; }
.per-page select { border-radius: 999px; border: 1px solid #e2ddf7; padding: 5px 10px; background: #fff; font-weight: 600; }

.bo-detail { display: grid; gap: 16px; align-content: start; }
.bo-detail.empty { color: #6b6b80; }
.bo-detail-header { display: flex; justify-content: space-between; align-items: center; }
.bo-detail-body { display: grid; gap: 14px; }
.detail-row { display: grid; gap: 6px; }
.detail-row span { font-size: 12px; color: #64748b; font-weight: 600; }
.detail-row strong { font-size: 14px; color: #1f2937; }
.config-preview { white-space: pre-wrap; word-break: break-word; }
.dbl-edit-trigger { cursor: text; }

.detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 6px;
}

.detail-actions-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-outline {
  border: 1px solid #d9cff6;
  background: #fff;
  color: #5b21b6;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-danger {
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: #fff5f5;
  color: #b91c1c;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-danger.disabled {
  opacity: 0.5;
}

.btn-danger:disabled {
  cursor: not-allowed;
}

.btn-link {
  border: none;
  background: none;
  color: #7a4fd9;
  font-weight: 600;
  cursor: pointer;
}

.bo-muted { color: #6b6b80; }
.bo-loading { padding: 20px 0; font-weight: 600; color: #6b6b80; }
.link-button { background: none; border: none; color: #7a4fd9; font-weight: 600; cursor: pointer; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: 18px;
}

.modal-card {
  width: min(700px, 100%);
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 22px 45px rgba(15, 23, 42, 0.22);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.confirm-card {
  width: min(480px, 100%);
}

.modal-card h3 {
  margin: 0;
}

.modal-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.full-width {
  grid-column: 1 / -1;
}

.modal-form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.modal-form input,
.modal-form select,
.modal-form textarea {
  border-radius: 10px;
  border: 1px solid #d6dbe7;
  padding: 9px 10px;
}

.feature-hint {
  border: 1px solid #e2ddf7;
  background: #fbfaff;
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.feature-hint strong {
  font-size: 13px;
  color: #4c1d95;
}

.feature-hint span {
  font-size: 12px;
  color: #6b6b80;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 900px) {
  .filters-toggle { display: inline-flex; }
  .filters-panel { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.3s ease, opacity 0.2s ease; }
  .filters-panel.open { max-height: 520px; opacity: 1; }
  .bo-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .field--plan { grid-column: 1 / span 2; grid-row: 1; }
  .filters-clear { grid-column: 3; grid-row: 1; }
}

@media (max-width: 1010px) {
  .bo-content { grid-template-columns: 1fr; }
  .bo-pagination { flex-direction: column; align-items: stretch; }
  .pagination-left, .pagination-right { justify-content: center; }
}

@media (max-width: 720px) {
  .bo-card { padding: 16px; }
  .bo-page { gap: 18px; }
  .bo-page.container { max-width: 100%; }
  .bo-table { overflow-x: auto; }
  .bo-table table { min-width: 980px; }
  .modal-form { grid-template-columns: 1fr; }
}

@media (max-width: 650px) {
  .bo-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .filters-clear { grid-column: 2; grid-row: 1; }
  .field--plan { grid-column: 1; grid-row: 1; }
  .field input, .field select, .detail-row input, .detail-row select, textarea { padding: 12px; font-size: 14px; }
  .pagination-left, .pagination-right { width: 100%; justify-content: center; gap: 10px; }
  .pagination-right { font-size: 12px; }
  .per-page select { padding: 5px 8px; font-size: 12px; }
  .detail-actions { align-items: flex-start; }
  .detail-actions-main { width: 100%; }
}
</style>

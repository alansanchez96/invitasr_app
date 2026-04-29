<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  createFeature,
  deleteFeature,
  getFeature,
  listFeatures,
  updateFeature,
  updateFeatureStatus,
  type FeatureDetail,
  type FeatureListItem,
} from '@/services/features'
import { notifyError, notifySuccess } from '@/utils/toast'

type Filters = {
  status: '' | 'active' | 'inactive'
  type: '' | 'boolean' | 'limit' | 'config'
  page: number
  perPage: number
}

type FeatureForm = {
  key: string
  description: string
  type: 'boolean' | 'limit' | 'config'
  status: 'active' | 'inactive'
}

const filters = reactive<Filters>({
  status: '',
  type: '',
  page: 1,
  perPage: 10,
})

const list = ref<FeatureListItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)

const selectedId = ref<string | number | null>(null)
const selected = ref<FeatureDetail | null>(null)
const detailLoading = ref(false)
const isResettingFilters = ref(false)
const isFiltersOpen = ref(true)
const showCreatedAt = ref(false)

const isCreateModalOpen = ref(false)
const isCreateLoading = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleteConfirmOpen = ref(false)
const isDeleting = ref(false)

const editingStatusId = ref<string | number | null>(null)
const editingDetailStatus = ref(false)
const updatingStatusId = ref<string | number | null>(null)

const createForm = reactive<FeatureForm>({
  key: '',
  description: '',
  type: 'boolean',
  status: 'active',
})

const editForm = reactive<FeatureForm>({
  key: '',
  description: '',
  type: 'boolean',
  status: 'active',
})

const hasSelection = computed(() => selectedId.value !== null)
const isAnyModalOpen = computed(() => isCreateModalOpen.value || isDeleteConfirmOpen.value)
let filtersTimer: number | undefined
let previousBodyOverflow = ''

type SortKey = 'id' | 'key' | 'type' | 'status' | 'created_at'
type SortField = 'id' | 'key' | 'type' | 'status' | 'created_at'

const sortField = ref<SortField>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')
const perPageOptions = [10, 15, 25, 50]
const isCompactPagination = ref(false)

const sortFieldMap: Record<SortKey, SortField> = {
  id: 'id',
  key: 'key',
  type: 'type',
  status: 'status',
  created_at: 'created_at',
}

const buildCompactPagination = (totalPages: number, current: number) => {
  if (totalPages <= 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (current <= 1) return [1, 2, '...']
  if (current >= totalPages) return ['...', totalPages - 1, totalPages]

  return ['...', current, Math.min(totalPages, current + 1), '...']
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
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

const isSortActive = (key: SortKey) => sortField.value === sortFieldMap[key]

const getAriaSort = (key: SortKey) => {
  if (!isSortActive(key)) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const setSort = (key: SortKey) => {
  const nextField = sortFieldMap[key]
  if (sortField.value === nextField) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = nextField
    sortDir.value = 'asc'
  }
  fetchList()
}

const resetCreateForm = () => {
  createForm.key = ''
  createForm.description = ''
  createForm.type = 'boolean'
  createForm.status = 'active'
}

const hydrateEditForm = (item: FeatureDetail) => {
  editForm.key = (item.key ?? '').toString()
  editForm.description = (item.description ?? '').toString()
  editForm.type = (item.type === 'limit' || item.type === 'config' ? item.type : 'boolean') as
    | 'boolean'
    | 'limit'
    | 'config'
  editForm.status = (item.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
}

const openCreateModal = () => {
  resetCreateForm()
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  if (isCreateLoading.value) return
  isCreateModalOpen.value = false
}

const fetchList = async () => {
  isLoading.value = true
  try {
    const result = await listFeatures({
      ...filters,
      orderField: sortField.value,
      orderDirection: sortDir.value,
    })
    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage
    if (result.orderField && Object.values(sortFieldMap).includes(result.orderField as SortField)) {
      sortField.value = result.orderField as SortField
    }
    if (result.orderDirection) {
      sortDir.value = result.orderDirection
    }
  } catch {
    notifyError()
  } finally {
    isLoading.value = false
  }
}

const openFeature = async (item: FeatureListItem) => {
  const id = item.id
  if (!id) return
  selectedId.value = id
  detailLoading.value = true
  isEditing.value = false
  try {
    const data = await getFeature(id)
    selected.value = data as FeatureDetail
    hydrateEditForm(selected.value)
  } catch {
    selectedId.value = null
    selected.value = null
    notifyError()
  } finally {
    detailLoading.value = false
  }
}

const clearSelection = () => {
  selectedId.value = null
  selected.value = null
  isEditing.value = false
  editingStatusId.value = null
  editingDetailStatus.value = false
}

const scheduleFiltersFetch = (immediate = false) => {
  if (filtersTimer) window.clearTimeout(filtersTimer)

  const run = () => {
    filters.page = 1
    fetchList()
  }

  if (immediate) {
    run()
    return
  }

  filtersTimer = window.setTimeout(run, 280)
}

const resetFilters = () => {
  isResettingFilters.value = true
  filters.status = ''
  filters.type = ''
  filters.page = 1
  filters.perPage = 10
  isResettingFilters.value = false
  scheduleFiltersFetch(true)
}

const submitCreate = async () => {
  if (!createForm.key.trim() || !createForm.description.trim()) {
    notifyError('La key y la descripcion son obligatorias.')
    return
  }

  isCreateLoading.value = true
  try {
    const created = (await createFeature({
      key: createForm.key.trim(),
      description: createForm.description.trim(),
      type: createForm.type,
      status: createForm.status,
    })) as FeatureDetail

    notifySuccess('Funcionalidad creada correctamente.')
    closeCreateModal()
    await fetchList()

    const createdId = created.id
    if (createdId) {
      const target = list.value.find((item) => item.id === createdId)
      if (target) {
        await openFeature(target)
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
  if (!editForm.key.trim() || !editForm.description.trim()) {
    notifyError('La key y la descripcion son obligatorias.')
    return
  }

  const id = selected.value.id
  if (!id) return

  isSaving.value = true
  try {
    const updated = (await updateFeature(id, {
      key: editForm.key.trim(),
      description: editForm.description.trim(),
      type: editForm.type,
    })) as FeatureDetail

    selected.value = { ...selected.value, ...updated }
    hydrateEditForm(selected.value)

    const index = list.value.findIndex((item) => item.id === id)
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        ...updated,
      }
    }

    isEditing.value = false
    notifySuccess('Funcionalidad actualizada correctamente.')
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
  if (!selected.value?.id) return
  isDeleting.value = true
  try {
    await deleteFeature(selected.value.id)
    notifySuccess('Funcionalidad eliminada correctamente.')
    isDeleteConfirmOpen.value = false
    clearSelection()
    await fetchList()
  } catch {
    notifyError()
  } finally {
    isDeleting.value = false
  }
}

const openStatusEditor = (id: string | number | null) => {
  if (!id || isEditing.value) return
  editingStatusId.value = id
}

const closeStatusEditor = () => {
  editingStatusId.value = null
}

const openDetailStatusEditor = () => {
  if (isEditing.value) return
  editingDetailStatus.value = true
}

const closeDetailStatusEditor = () => {
  editingDetailStatus.value = false
}

const applyStatusChange = async (id: string | number, nextStatus: 'active' | 'inactive') => {
  updatingStatusId.value = id
  try {
    const data = (await updateFeatureStatus(id, nextStatus)) as FeatureDetail

    const index = list.value.findIndex((item) => item.id === id)
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        status: nextStatus,
      }
    }

    if (selected.value && selected.value.id === id) {
      selected.value = {
        ...selected.value,
        ...data,
        status: nextStatus,
      }
      editForm.status = nextStatus
    }

    notifySuccess('Estado actualizado.')
  } catch {
    notifyError()
  } finally {
    updatingStatusId.value = null
    closeStatusEditor()
    closeDetailStatusEditor()
  }
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

onMounted(() => {
  fetchList()
  isFiltersOpen.value = !window.matchMedia('(max-width: 900px)').matches
  updatePaginationViewport()
  window.addEventListener('resize', updatePaginationViewport)
})

onUnmounted(() => {
  if (filtersTimer) window.clearTimeout(filtersTimer)
  window.removeEventListener('resize', updatePaginationViewport)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
  }
})

watch(isAnyModalOpen, (isOpen) => {
  if (typeof document === 'undefined') return
  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousBodyOverflow
})

watch(
  () => [filters.status, filters.type],
  () => {
    if (isResettingFilters.value) return
    scheduleFiltersFetch()
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
</script>

<template>
  <div class="bo-page container">
    <header class="bo-page-header">
      <h1>Funcionalidades</h1>
      <button class="primary-action" type="button" @click="openCreateModal">Crear funcionalidad</button>
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
      <div id="filters-panel" class="filters-panel" :class="{ open: isFiltersOpen }" role="region" aria-label="Filtros de funcionalidades">
        <div class="bo-filters">
          <div class="field field--status">
            <label for="filter-status">Estado</label>
            <select id="filter-status" v-model="filters.status">
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div class="field field--type">
            <label for="filter-type">Tipo</label>
            <select id="filter-type" v-model="filters.type">
              <option value="">Todos</option>
              <option value="boolean">Booleano</option>
              <option value="limit">Limite</option>
              <option value="config">Configurable</option>
            </select>
          </div>
          <button class="filters-clear" type="button" aria-label="Limpiar filtros" title="Limpiar filtros" @click="resetFilters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M7 6l1 14h8l1-14" />
              <path d="M10 10v6" />
              <path d="M14 10v6" />
            </svg>
          </button>
        </div>
        <label class="filters-option">
          <input type="checkbox" v-model="showCreatedAt" />
          Mostrar fecha de creacion en el listado
        </label>
      </div>
    </section>

    <section class="bo-content" :class="{ 'is-detail-open': hasSelection }">
      <div class="bo-card bo-table">
        <div class="bo-table-header">
          <h2>Listado</h2>
          <span class="bo-muted">Total: {{ total }}</span>
        </div>

        <div v-if="isLoading" class="bo-loading" role="status" aria-live="polite">Cargando funcionalidades...</div>

        <table v-else>
          <caption class="sr-only">Listado de funcionalidades</caption>
          <thead>
            <tr>
              <th scope="col" :aria-sort="getAriaSort('id')">
                <button class="sort-button" type="button" @click="setSort('id')"><span>ID</span><span class="sort-indicator" :class="{ active: isSortActive('id'), desc: isSortActive('id') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('key')">
                <button class="sort-button" type="button" @click="setSort('key')"><span>Key</span><span class="sort-indicator" :class="{ active: isSortActive('key'), desc: isSortActive('key') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button>
              </th>
              <th scope="col">Descripcion</th>
              <th scope="col" :aria-sort="getAriaSort('type')">
                <button class="sort-button" type="button" @click="setSort('type')"><span>Tipo</span><span class="sort-indicator" :class="{ active: isSortActive('type'), desc: isSortActive('type') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('status')">
                <button class="sort-button" type="button" @click="setSort('status')"><span>Estado</span><span class="sort-indicator" :class="{ active: isSortActive('status'), desc: isSortActive('status') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button>
              </th>
              <th v-if="showCreatedAt" scope="col" :aria-sort="getAriaSort('created_at')">
                <button class="sort-button" type="button" @click="setSort('created_at')"><span>Creado</span><span class="sort-indicator" :class="{ active: isSortActive('created_at'), desc: isSortActive('created_at') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in list"
              :key="String(item.id)"
              class="table-row"
              :class="{ 'is-selected': item.id === selectedId }"
              tabindex="0"
              :aria-label="`Ver detalle de funcionalidad ${item.key ?? ''}`"
              :aria-selected="item.id === selectedId"
              @click="openFeature(item)"
              @keydown.enter.prevent="openFeature(item)"
              @keydown.space.prevent="openFeature(item)">
              <td>{{ item.id ?? '-' }}</td>
              <td>{{ item.key ?? '-' }}</td>
              <td>{{ item.description ?? '-' }}</td>
              <td>{{ formatType(item.type) }}</td>
              <td>
                <div class="status-cell">
                  <button
                    v-if="editingStatusId !== item.id"
                    class="status-pill"
                    :class="item.status ?? 'active'"
                    type="button"
                    aria-haspopup="listbox"
                    :aria-expanded="editingStatusId === item.id"
                    :aria-controls="`status-select-${item.id}`"
                    :disabled="isEditing || updatingStatusId === item.id"
                    @click.stop="openStatusEditor(item.id ?? null)">
                    <span>{{ formatStatus(item.status) }}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  <select
                    v-else
                    :id="`status-select-${item.id}`"
                    :disabled="updatingStatusId === item.id"
                    :value="(item.status ?? 'active') as string"
                    aria-label="Cambiar estado"
                    @click.stop
                    @change="applyStatusChange(item.id as string | number, ($event.target as HTMLSelectElement).value as 'active' | 'inactive')"
                    @blur="closeStatusEditor">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </td>
              <td v-if="showCreatedAt">{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="!list.length">
              <td :colspan="showCreatedAt ? 6 : 5" class="bo-empty">No encontramos funcionalidades con los filtros actuales.</td>
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
          <button v-if="hasSelection" class="icon-button" type="button" aria-label="Cerrar detalle" @click="clearSelection">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </svg>
</button>
        </header>

        <div v-if="!hasSelection" class="bo-muted">Selecciona una funcionalidad para ver el detalle.</div>
        <div v-else-if="detailLoading" class="bo-loading" role="status" aria-live="polite">Cargando detalle...</div>
        <div v-else-if="selected" class="bo-detail-body">
          <div class="detail-row">
            <span>Key</span>
            <strong v-if="!isEditing" class="dbl-edit-trigger" title="Doble clic para editar" @dblclick.stop="startEdit">{{ selected.key ?? '-' }}</strong>
            <input v-else v-model="editForm.key" type="text" placeholder="Ej: crear_evento" />
          </div>

          <div class="detail-row">
            <span>Descripcion</span>
            <strong v-if="!isEditing" class="dbl-edit-trigger" title="Doble clic para editar" @dblclick.stop="startEdit">{{ selected.description ?? '-' }}</strong>
            <input v-else v-model="editForm.description" type="text" placeholder="Descripcion de la funcionalidad" />
          </div>

          <div class="detail-row">
            <span>Tipo</span>
            <strong v-if="!isEditing" class="dbl-edit-trigger" title="Doble clic para editar" @dblclick.stop="startEdit">{{ formatType(selected.type) }}</strong>
            <select v-else v-model="editForm.type">
              <option value="boolean">Booleano</option>
              <option value="limit">Limite</option>
              <option value="config">Configurable</option>
            </select>
          </div>

          <div class="detail-row">
            <span>Estado</span>
            <div class="status-cell">
              <button
                v-if="!editingDetailStatus"
                class="status-pill"
                :class="selected.status ?? 'active'"
                type="button"
                aria-haspopup="listbox"
                :aria-expanded="editingDetailStatus"
                aria-controls="detail-status-select"
                :disabled="updatingStatusId === selected.id || isEditing"
                @click="openDetailStatusEditor">
                <span>{{ formatStatus(selected.status) }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <select
                v-else
                id="detail-status-select"
                :disabled="updatingStatusId === selected.id"
                :value="(selected.status ?? 'active') as string"
                aria-label="Cambiar estado"
                @change="applyStatusChange(selected.id as string | number, ($event.target as HTMLSelectElement).value as 'active' | 'inactive')"
                @blur="closeDetailStatusEditor">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div class="detail-row">
            <span>Creado</span>
            <strong>{{ formatDate(selected.created_at) }}</strong>
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
      aria-label="Crear funcionalidad"
      @click.self="closeCreateModal">
      <div class="modal-card" @click.stop>
        <h3>Crear funcionalidad</h3>
        <div class="modal-form">
          <label>
            <span>Key</span>
            <input v-model="createForm.key" type="text" placeholder="Ej: crear_evento" />
          </label>
          <label>
            <span>Estado</span>
            <select v-model="createForm.status">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label class="full-width">
            <span>Descripcion</span>
            <input v-model="createForm.description" type="text" placeholder="Describe la funcionalidad" />
          </label>
          <label>
            <span>Tipo</span>
            <select v-model="createForm.type">
              <option value="boolean">Booleano</option>
              <option value="limit">Limite</option>
              <option value="config">Configurable</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isCreateLoading" @click="closeCreateModal">Cancelar</button>
          <button class="primary-action" type="button" :disabled="isCreateLoading" @click="submitCreate">
            {{ isCreateLoading ? 'Creando...' : 'Crear funcionalidad' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isDeleteConfirmOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminacion de funcionalidad"
      @click.self="cancelDelete">
      <div class="modal-card confirm-card" @click.stop>
        <h3>Eliminar funcionalidad</h3>
        <p>Esta funcionalidad se eliminara de forma permanente y no podra recuperarse.</p>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isDeleting" @click="cancelDelete">Cancelar</button>
          <button class="btn-danger" type="button" :disabled="isDeleting" @click="confirmDelete">
            {{ isDeleting ? 'Eliminando...' : 'Eliminar funcionalidad' }}
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

.filters-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 600; }
.filters-toggle { display: none; align-items: center; gap: 6px; border: 1px solid #e2ddf7; border-radius: 999px; padding: 6px 12px; background: #fbfaff; color: #7a4fd9; font-weight: 600; cursor: pointer; }
.filters-toggle svg { width: 14px; height: 14px; }
.filters-panel { display: grid; gap: 12px; }
.bo-filters { display: grid; gap: 16px; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: end; }
.field--status { grid-column: 1; grid-row: 1; }
.field--type { grid-column: 2; grid-row: 1; }
.field { display: grid; gap: 8px; }
.field label { font-size: 13px; color: #6b6b80; font-weight: 600; }
.field input, .field select, .detail-row input, .detail-row select {
  border-radius: 12px;
  border: 1px solid #e2ddf7;
  padding: 10px 12px;
  background: #fbfaff;
}

.filters-clear { width: 44px; height: 44px; border-radius: 12px; border: 1px solid #e2ddf7; background: #fbfaff; color: #7a4fd9; display: grid; place-items: center; cursor: pointer; transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; justify-self: end; grid-column: 4; grid-row: 1; }
.filters-clear svg { width: 18px; height: 18px; }
.filters-clear:hover, .filters-clear:focus-visible { background: var(--gradient-brand); color: #fff; border-color: rgba(155, 107, 255, 0.2); }
.filters-option { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; color: #6b6b80; font-weight: 600; }
.filters-option input { width: 16px; height: 16px; accent-color: #7a4fd9; }

.bo-page.container { width: 100%; max-width: 1320px; margin: 0 auto; }
.bo-content {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.bo-content.is-detail-open {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 20px;
}

.bo-content:not(.is-detail-open) .bo-detail {
  display: none;
}

.bo-detail {
  min-width: 0;
}
.bo-table table { width: 100%; border-collapse: collapse; margin-top: 16px; }
.bo-table th, .bo-table td { padding: 14px 14px; text-align: left; border-bottom: 1px solid #edf0f6; font-size: 13px; }
.bo-table th { color: #475569; font-weight: 700; }
.bo-table tbody .table-row { cursor: pointer; transition: background 0.2s ease; }
.bo-table tbody .table-row:hover { background: #f6f4ff; }
.bo-table tbody .table-row.is-selected { background: #efe7ff; }
.bo-table tbody .table-row:focus-visible { outline: 2px solid rgba(122, 79, 217, 0.6); outline-offset: -2px; }

.sort-button { display: inline-flex; align-items: center; gap: 6px; border: none; background: none; color: inherit; font: inherit; cursor: pointer; padding: 0; }
.sort-indicator { display: inline-flex; width: 14px; height: 14px; opacity: 0.35; transform: translateY(1px); transition: opacity 0.2s ease, transform 0.2s ease; }
.sort-indicator svg { width: 100%; height: 100%; }
.sort-indicator.active { opacity: 1; }
.sort-indicator.desc { transform: translateY(1px) rotate(180deg); }

.status-cell { display: flex; align-items: center; min-height: 34px; }
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 6px 10px;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.12);
  color: #0f766e;
  cursor: pointer;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.status-pill svg {
  width: 0;
  height: 12px;
  opacity: 0;
  transform: translateY(1px);
  transition: opacity 0.2s ease, width 0.2s ease, margin-left 0.2s ease;
  margin-left: 0;
}

.status-pill:hover svg {
  opacity: 1;
  width: 12px;
  margin-left: 6px;
}

.status-pill.inactive {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.status-pill:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.status-cell select {
  border-radius: 10px;
  border: 1px solid #e2ddf7;
  padding: 6px 28px 6px 10px;
  background: #fbfaff;
  font-weight: 600;
  color: #4c1d95;
  appearance: none;
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

.dbl-edit-trigger {
  cursor: text;
}

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

.icon-button {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid #e2ddf7;
  background: #fff;
  color: #7a4fd9;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.icon-button:hover,
.icon-button:focus-visible {
  background: #7a4fd9;
  color: #fff;
  border-color: #cdbbff;
  transform: translateY(-1px);
}

.icon-button:active {
  transform: translateY(0);
}

.icon-button svg {
  width: 16px;
  height: 16px;
}

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
  width: min(640px, 100%);
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 22px 45px rgba(15, 23, 42, 0.22);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.confirm-card {
  width: min(420px, 100%);
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
.modal-form select {
  border-radius: 10px;
  border: 1px solid #d6dbe7;
  padding: 9px 10px;
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
  .modal-form { grid-template-columns: 1fr; }
}

@media (max-width: 650px) {
  .bo-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .filters-clear { grid-column: 2; grid-row: 1; }
  .field--status { grid-column: 1; grid-row: 1; }
  .field--type { grid-column: 1 / -1; grid-row: 2; }
  .field input, .field select, .detail-row input, .detail-row select { padding: 12px; font-size: 14px; }
  .pagination-left, .pagination-right { width: 100%; justify-content: center; gap: 10px; }
  .pagination-right { font-size: 12px; }
  .per-page select { padding: 5px 8px; font-size: 12px; }
  .detail-actions { align-items: flex-start; }
  .detail-actions-main { width: 100%; }
}
</style>

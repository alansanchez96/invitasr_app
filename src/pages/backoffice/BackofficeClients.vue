<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { listClients, getClient, updateClientStatus, type ClientDetail, type ClientListItem } from '@/services/clients'
import { notifyError } from '@/utils/toast'

type Filters = {
  status: '' | 'active' | 'inactive'
  country_code: string
  client_name: string
  db_name: string
  page: number
  perPage: number
}

const filters = reactive<Filters>({
  status: '',
  country_code: '',
  client_name: '',
  db_name: '',
  page: 1,
  perPage: 10,
})

const list = ref<ClientListItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)

const selectedId = ref<string | number | null>(null)
const selected = ref<ClientDetail | null>(null)
const detailLoading = ref(false)
const isResettingFilters = ref(false)
const isFiltersOpen = ref(true)
const showCreatedAt = ref(false)
const editingStatusId = ref<string | number | null>(null)
const editingDetailStatus = ref(false)
const updatingStatusId = ref<string | number | null>(null)

const hasSelection = computed(() => selectedId.value !== null)
let filtersTimer: number | undefined

type SortKey = 'id' | 'client' | 'email' | 'status' | 'db' | 'country' | 'created_at'

type SortField = 'id' | 'client_name' | 'email' | 'status' | 'db_name' | 'country_code' | 'created_at'

const sortField = ref<SortField>('id')
const sortDir = ref<'asc' | 'desc'>('asc')
const perPageOptions = [10, 15, 25, 50]
const isCompactPagination = ref(false)

const getClientLabel = (item: ClientListItem) => {
  return (item.client_name ?? item.name ?? '').toString()
}

const buildCompactPagination = (totalPages: number, current: number) => {
  if (totalPages <= 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (current <= 1) {
    return [1, 2, '…']
  }

  if (current >= totalPages) {
    return ['…', totalPages - 1, totalPages]
  }

  return ['…', current, Math.min(totalPages, current + 1), '…']
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

const sortFieldMap: Record<SortKey, SortField> = {
  id: 'id',
  client: 'client_name',
  email: 'email',
  status: 'status',
  db: 'db_name',
  country: 'country_code',
  created_at: 'created_at',
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

const formatStatus = (value?: string) => {
  if (!value) return 'Activo'
  return value === 'inactive' ? 'Inactivo' : 'Activo'
}

const openStatusEditor = (id: string | number | null) => {
  if (!id) return
  editingStatusId.value = id
}

const closeStatusEditor = () => {
  editingStatusId.value = null
}

const openDetailStatusEditor = () => {
  editingDetailStatus.value = true
}

const closeDetailStatusEditor = () => {
  editingDetailStatus.value = false
}

const applyStatusChange = async (id: string | number, nextStatus: 'active' | 'inactive') => {
  updatingStatusId.value = id
  try {
    const data = await updateClientStatus(id, nextStatus)
    const matchIndex = list.value.findIndex(
      (item) => (item.id ?? item.client_id) === id,
    )
    if (matchIndex >= 0) {
      list.value[matchIndex] = {
        ...list.value[matchIndex],
        status: nextStatus,
      }
    }
    if (selected.value && (selected.value.id ?? selected.value.client_id) === id) {
      selected.value = {
        ...selected.value,
        status: nextStatus,
        ...(data as ClientDetail),
      }
    }
  } catch {
    notifyError()
  } finally {
    updatingStatusId.value = null
    closeStatusEditor()
    closeDetailStatusEditor()
  }
}

const fetchList = async () => {
  isLoading.value = true
  try {
    const result = await listClients({
      ...filters,
      orderField: sortField.value,
      orderDirection: sortDir.value,
    })
    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage
    if (result.orderField) {
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

const openClient = async (item: ClientListItem) => {
  const id = item.id ?? item.client_id
  if (!id) return
  selectedId.value = id
  detailLoading.value = true
  try {
    const data = await getClient(id)
    selected.value = data as ClientDetail
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
}

const scheduleFiltersFetch = (immediate = false) => {
  if (filtersTimer) {
    window.clearTimeout(filtersTimer)
  }

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
  filters.country_code = ''
  filters.client_name = ''
  filters.db_name = ''
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
  if (page < 1 || page > lastPage.value) return
  if (page === filters.page) return
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
  if (current > 3) items.push('…')
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  for (let i = start; i <= end; i += 1) {
    items.push(i)
  }
  if (current < totalPages - 2) items.push('…')
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
  if (filtersTimer) {
    window.clearTimeout(filtersTimer)
  }
  window.removeEventListener('resize', updatePaginationViewport)
})

watch(
  () => [filters.status, filters.country_code, filters.client_name, filters.db_name],
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
      <div>
        <h1>Clientes</h1>
        <div class="bo-divider"></div>
      </div>
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
      <div id="filters-panel" class="filters-panel" :class="{ open: isFiltersOpen }" role="region" aria-label="Filtros de clientes">
        <div class="bo-filters">
          <div class="field field--status">
            <label for="filter-status">Estado</label>
            <select id="filter-status" v-model="filters.status">
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div class="field field--country">
            <label for="filter-country">Pais</label>
            <input id="filter-country" v-model="filters.country_code" type="text" placeholder="AR, MX, CO" />
          </div>
          <div class="field field--client">
            <label for="filter-client">Nombre cliente</label>
            <input id="filter-client" v-model="filters.client_name" type="text" placeholder="Ej: Alan" />
          </div>
          <div class="field field--db">
            <label for="filter-db">Base de datos</label>
            <input id="filter-db" v-model="filters.db_name" type="text" placeholder="invita_alan" />
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

        <div v-if="isLoading" class="bo-loading" role="status" aria-live="polite">Cargando clientes...</div>

        <table v-else>
          <caption class="sr-only">Listado de clientes</caption>
          <thead>
            <tr>
              <th scope="col" :aria-sort="getAriaSort('id')">
                <button class="sort-button" type="button" @click="setSort('id')">
                  <span>ID</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('id'), desc: isSortActive('id') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('client')">
                <button class="sort-button" type="button" @click="setSort('client')">
                  <span>Cliente</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('client'), desc: isSortActive('client') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('email')">
                <button class="sort-button" type="button" @click="setSort('email')">
                  <span>Correo</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('email'), desc: isSortActive('email') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('status')">
                <button class="sort-button" type="button" @click="setSort('status')">
                  <span>Estado</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('status'), desc: isSortActive('status') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('db')">
                <button class="sort-button" type="button" @click="setSort('db')">
                  <span>DB</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('db'), desc: isSortActive('db') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('country')">
                <button class="sort-button" type="button" @click="setSort('country')">
                  <span>Pais</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('country'), desc: isSortActive('country') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th v-if="showCreatedAt" scope="col" :aria-sort="getAriaSort('created_at')">
                <button class="sort-button" type="button" @click="setSort('created_at')">
                  <span>Fecha de creacion</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('created_at'), desc: isSortActive('created_at') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in list"
              :key="String(item.id ?? item.client_id)"
              class="table-row"
              :class="{ 'is-selected': (item.id ?? item.client_id) === selectedId }"
              tabindex="0"
              :aria-label="`Ver detalle de ${getClientLabel(item) || 'cliente'}`"
              :aria-selected="(item.id ?? item.client_id) === selectedId"
              @click="openClient(item)"
              @keydown.enter.prevent="openClient(item)"
              @keydown.space.prevent="openClient(item)">
              <td>{{ item.id ?? item.client_id ?? '-' }}</td>
              <td>{{ item.client_name ?? item.name ?? '-' }}</td>
              <td>{{ item.email ?? '-' }}</td>
              <td>
                <div class="status-cell">
                  <button
                    v-if="editingStatusId !== (item.id ?? item.client_id)"
                    class="status-pill"
                    :class="item.status ?? 'active'"
                    type="button"
                    aria-haspopup="listbox"
                    :aria-expanded="editingStatusId === (item.id ?? item.client_id)"
                    :aria-controls="`status-select-${item.id ?? item.client_id}`"
                    @click.stop="openStatusEditor(item.id ?? item.client_id ?? null)">
                    <span>{{ formatStatus(item.status) }}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <select
                    v-else
                    :id="`status-select-${item.id ?? item.client_id}`"
                    :disabled="updatingStatusId === (item.id ?? item.client_id)"
                    :value="(item.status ?? 'active') as string"
                    aria-label="Cambiar estado"
                    @click.stop
                    @change="applyStatusChange(item.id ?? item.client_id ?? '', ($event.target as HTMLSelectElement).value as 'active' | 'inactive')"
                    @blur="closeStatusEditor">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </td>
              <td>{{ item.db_name ?? '-' }}</td>
              <td>{{ item.country_code ?? '-' }}</td>
              <td v-if="showCreatedAt">{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="!list.length">
              <td :colspan="showCreatedAt ? 7 : 6" class="bo-empty">No encontramos clientes con los filtros actuales.</td>
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
                :disabled="item === '…'"
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

        <div v-if="!hasSelection" class="bo-muted">Selecciona un cliente para ver el detalle.</div>
        <div v-else-if="detailLoading" class="bo-loading" role="status" aria-live="polite">Cargando detalle...</div>
        <div v-else-if="selected" class="bo-detail-body">
          <div class="detail-row">
            <span>Nombre</span>
            <strong>{{ selected.client_name ?? selected.name ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Correo</span>
            <strong>{{ selected.email ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Base de datos</span>
            <strong>{{ selected.db_name ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Pais</span>
            <strong>{{ selected.country_code ?? '-' }}</strong>
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
                @click="openDetailStatusEditor">
                <span>{{ formatStatus(selected.status) }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <select
                v-else
                id="detail-status-select"
                :disabled="updatingStatusId === (selected.id ?? selected.client_id)"
                :value="(selected.status ?? 'active') as string"
                aria-label="Cambiar estado"
                @change="applyStatusChange((selected.id ?? selected.client_id) as string | number, ($event.target as HTMLSelectElement).value as 'active' | 'inactive')"
                @blur="closeDetailStatusEditor">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.bo-page {
  display: grid;
  gap: 24px;
}

.bo-page-header h1 {
  margin-bottom: 6px;
}

.bo-divider {
  height: 1px;
  background: #ece7f8;
  margin-top: 12px;
}

.bo-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 18px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.bo-filters-card {
  display: grid;
  gap: 12px;
}

.filters-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.filters-toggle {
  display: none;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2ddf7;
  border-radius: 999px;
  padding: 6px 12px;
  background: #fbfaff;
  color: #7a4fd9;
  font-weight: 600;
  cursor: pointer;
}

.filters-toggle svg {
  width: 14px;
  height: 14px;
}

.filters-panel {
  display: grid;
  gap: 12px;
}

.bo-filters {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
}

.field--status {
  grid-column: 1;
  grid-row: 1;
}

.field--country {
  grid-column: 2;
  grid-row: 1;
}

.field--client {
  grid-column: 3;
  grid-row: 1;
}

.field--db {
  grid-column: 1;
  grid-row: 2;
}

.field {
  display: grid;
  gap: 8px;
}

.field label {
  font-size: 13px;
  color: #6b6b80;
  font-weight: 600;
}

.field input,
.field select {
  border-radius: 12px;
  border: 1px solid #e2ddf7;
  padding: 10px 12px;
  background: #fbfaff;
}

.filters-clear {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid #e2ddf7;
  background: #fbfaff;
  color: #7a4fd9;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  justify-self: end;
  grid-column: 4;
  grid-row: 1;
}

.filters-clear svg {
  width: 18px;
  height: 18px;
}

.filters-clear:hover,
.filters-clear:focus-visible {
  background: var(--gradient-brand);
  color: #fff;
  border-color: rgba(155, 107, 255, 0.2);
}

.filters-option {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #6b6b80;
  font-weight: 600;
}

.filters-option input {
  width: 16px;
  height: 16px;
  accent-color: #7a4fd9;
}

.bo-page.container {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

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

.bo-table table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.bo-table th,
.bo-table td {
  padding: 14px 14px;
  text-align: left;
  border-bottom: 1px solid #edf0f6;
  font-size: 13px;
}

.bo-table tbody .table-row {
  cursor: pointer;
  transition: background 0.2s ease;
}

.bo-table tbody .table-row:hover {
  background: #f7f3ff;
}

.bo-table tbody .table-row.is-selected {
  background: #efe7ff;
}

.bo-table tbody .table-row:focus-visible {
  outline: 2px solid rgba(122, 79, 217, 0.6);
  outline-offset: -2px;
}

.bo-table th {
  color: #6b6b80;
  font-weight: 600;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 0;
}

.sort-indicator {
  display: inline-flex;
  width: 14px;
  height: 14px;
  opacity: 0.35;
  transform: translateY(1px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.sort-indicator svg {
  width: 100%;
  height: 100%;
}

.sort-indicator.active {
  opacity: 1;
}

.sort-indicator.desc {
  transform: translateY(1px) rotate(180deg);
}

.bo-empty {
  text-align: center !important;
  color: #6b6b80;
  font-weight: 600;
  padding: 22px 10px !important;
}

.status-cell {
  display: flex;
  align-items: center;
  min-height: 32px;
}

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
  position: relative;
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

.status-pill:hover {
  border-color: rgba(122, 79, 217, 0.2);
  color: #4c1d95;
}

.status-pill.inactive:hover {
  border-color: rgba(185, 28, 28, 0.2);
  color: #b91c1c;
}

.status-cell select {
  border-radius: 10px;
  border: 1px solid #e2ddf7;
  padding: 6px 28px 6px 10px;
  background: #fbfaff;
  font-weight: 600;
  color: #4c1d95;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #7a4fd9 50%),
    linear-gradient(135deg, #7a4fd9 50%, transparent 50%),
    linear-gradient(to right, #e2ddf7, #e2ddf7);
  background-position: calc(100% - 16px) 12px, calc(100% - 12px) 12px, calc(100% - 36px) 50%;
  background-size: 6px 6px, 6px 6px, 1px 60%;
  background-repeat: no-repeat;
}

@media (max-width: 900px) {
  .filters-toggle {
    display: inline-flex;
  }

  .filters-panel {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, opacity 0.2s ease;
  }

  .filters-panel.open {
    max-height: 600px;
    opacity: 1;
  }

  .filters-panel {
    grid-template-columns: 1fr;
  }

  .bo-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filters-clear {
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
  }

  .field--status {
    grid-column: 1;
    grid-row: 1;
  }

  .field--country {
    grid-column: 2;
    grid-row: 1;
  }

  .field--client {
    grid-column: 1;
    grid-row: 2;
  }

  .field--db {
    grid-column: 2;
    grid-row: 2;
  }
}

.bo-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bo-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  font-size: 13px;
  color: #6b6b80;
  flex-wrap: wrap;
}

.bo-pagination button {
  background: none;
  border: none;
  font-weight: 600;
  color: #7a4fd9;
  cursor: pointer;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.page-button {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #fbfaff;
  color: #6a3fc9;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.page-button:hover,
.page-button:focus-visible {
  background: var(--gradient-brand);
  color: #fff;
  border-color: rgba(155, 107, 255, 0.2);
}

.page-button.active {
  background: var(--gradient-brand);
  color: #fff;
  border-color: rgba(155, 107, 255, 0.2);
}

.page-button:disabled {
  cursor: default;
  background: transparent;
  color: #b9b1d2;
}

.pagination-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-left: auto;
}

.per-page {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.per-page select {
  border-radius: 10px;
  border: 1px solid #e2ddf7;
  padding: 6px 10px;
  background: #fbfaff;
  font-weight: 600;
  color: #4c1d95;
}

.bo-pagination button:disabled {
  color: #bdb7d6;
  cursor: not-allowed;
}

.bo-detail {
  display: grid;
  gap: 16px;
  align-content: start;
}

.bo-detail.empty {
  color: #9b93b0;
}

.bo-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bo-detail-body {
  display: grid;
  gap: 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.detail-row select {
  border-radius: 10px;
  border: 1px solid #e2ddf7;
  padding: 6px 10px;
}

.bo-muted {
  color: #6b6b80;
  font-size: 13px;
}

.bo-error {
  color: #b91c1c;
  font-weight: 600;
  padding: 12px 0;
}

.bo-loading {
  color: #6b6b80;
  padding: 12px 0;
}

.status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #f3f0ff;
  color: #7a4fd9;
}

.status.inactive {
  background: #ffe8ea;
  color: #b91c1c;
}

.link-button {
  background: none;
  border: none;
  color: #7a4fd9;
  font-weight: 600;
  cursor: pointer;
}

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

@media (max-width: 1010px) {
  .bo-content {
    grid-template-columns: 1fr;
  }

  .bo-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .pagination-left {
    justify-content: center;
    flex-wrap: nowrap;
  }

  .pagination-right {
    margin-left: 0;
    justify-content: center;
    flex-wrap: nowrap;
  }
}

@media (max-width: 720px) {
  .bo-card {
    padding: 16px;
  }

  .bo-page {
    gap: 18px;
  }

  .bo-page.container {
    max-width: 100%;
  }

  .bo-table {
    overflow-x: auto;
  }

  .bo-table table {
    min-width: 680px;
  }

  .pagination-right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 650px) {
  .bo-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .filters-clear {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
  }

  .field--status {
    grid-column: 1;
    grid-row: 1;
  }

  .field--country {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .field--client {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .field--db {
    grid-column: 1 / -1;
    grid-row: 4;
  }

  .field input,
  .field select {
    padding: 12px 12px;
    font-size: 14px;
  }

  .filters-option {
    font-size: 12px;
  }

  .pagination-left,
  .pagination-right {
    width: 100%;
    justify-content: center;
    gap: 10px;
  }

  .page-buttons {
    flex-wrap: nowrap;
  }

  .pagination-right {
    font-size: 12px;
  }

  .per-page select {
    padding: 5px 8px;
    font-size: 12px;
  }
}
</style>

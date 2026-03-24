<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { listClients, getClient, updateClientStatus, type ClientDetail, type ClientListItem } from '@/services/clients'
import BaseButton from '@/components/ui/BaseButton.vue'

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
  perPage: 15,
})

const list = ref<ClientListItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)

const selectedId = ref<string | number | null>(null)
const selected = ref<ClientDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const isResettingFilters = ref(false)
const isFiltersOpen = ref(true)
const showCreatedAt = ref(false)
const editingStatusId = ref<string | number | null>(null)
const editingDetailStatus = ref(false)
const updatingStatusId = ref<string | number | null>(null)
const statusMessage = ref<string | null>(null)

const hasSelection = computed(() => selectedId.value !== null)
let filtersTimer: number | undefined

type SortKey = 'id' | 'client' | 'email' | 'status' | 'db' | 'country' | 'created_at'

const sortKey = ref<SortKey>('id')
const sortDir = ref<'asc' | 'desc'>('asc')

const normalizeText = (value: unknown) => String(value ?? '').toLowerCase()

const getClientLabel = (item: ClientListItem) => {
  return (item.client_name ?? item.name ?? '').toString()
}

const getIdValue = (item: ClientListItem) => {
  const raw = item.id ?? item.client_id
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return numeric
  return raw ? raw.toString() : ''
}

const getCreatedAtValue = (item: ClientListItem) => {
  if (!item.created_at) return 0
  const time = new Date(item.created_at).getTime()
  return Number.isFinite(time) ? time : 0
}

const compareValues = (a: unknown, b: unknown) => {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return normalizeText(a).localeCompare(normalizeText(b), 'es', { sensitivity: 'base' })
}

const sortedList = computed(() => {
  const items = [...list.value]
  items.sort((first, second) => {
    let result = 0
    switch (sortKey.value) {
      case 'id':
        result = compareValues(getIdValue(first), getIdValue(second))
        break
      case 'client':
        result = compareValues(getClientLabel(first), getClientLabel(second))
        break
      case 'email':
        result = compareValues(first.email ?? '', second.email ?? '')
        break
      case 'status':
        result = compareValues(first.status ?? '', second.status ?? '')
        break
      case 'db':
        result = compareValues(first.db_name ?? '', second.db_name ?? '')
        break
      case 'country':
        result = compareValues(first.country_code ?? '', second.country_code ?? '')
        break
      case 'created_at':
        result = compareValues(getCreatedAtValue(first), getCreatedAtValue(second))
        break
      default:
        result = 0
    }
    return sortDir.value === 'asc' ? result : -result
  })
  return items
})

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const isSortActive = (key: SortKey) => sortKey.value === key

const getAriaSort = (key: SortKey) => {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const setSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = 'asc'
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
  statusMessage.value = null
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
    statusMessage.value = 'No pudimos actualizar el estado.'
  } finally {
    updatingStatusId.value = null
    closeStatusEditor()
    closeDetailStatusEditor()
  }
}

const fetchList = async () => {
  isLoading.value = true
  error.value = null
  try {
    const result = await listClients(filters)
    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage
  } catch {
    error.value = 'No pudimos cargar los clientes.'
  } finally {
    isLoading.value = false
  }
}

const openClient = async (item: ClientListItem) => {
  const id = item.id ?? item.client_id
  if (!id) return
  selectedId.value = id
  detailLoading.value = true
  detailError.value = null
  try {
    const data = await getClient(id)
    selected.value = data as ClientDetail
  } catch {
    detailError.value = 'No pudimos cargar el detalle.'
  } finally {
    detailLoading.value = false
  }
}

const clearSelection = () => {
  selectedId.value = null
  selected.value = null
  detailError.value = null
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
  filters.perPage = 15
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

onMounted(() => {
  fetchList()
  isFiltersOpen.value = !window.matchMedia('(max-width: 900px)').matches
})

onUnmounted(() => {
  if (filtersTimer) {
    window.clearTimeout(filtersTimer)
  }
})

watch(
  () => [filters.status, filters.country_code, filters.client_name, filters.db_name],
  () => {
    if (isResettingFilters.value) return
    scheduleFiltersFetch()
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

    <section class="bo-content">
      <div class="bo-card bo-table">
        <div class="bo-table-header">
          <h2>Listado</h2>
          <span class="bo-muted">Total: {{ total }}</span>
        </div>

        <div v-if="error" class="bo-error" role="alert">{{ error }}</div>
        <div v-else-if="statusMessage" class="bo-error" role="alert">{{ statusMessage }}</div>
        <div v-else-if="isLoading" class="bo-loading" role="status" aria-live="polite">Cargando clientes...</div>

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
              v-for="item in sortedList"
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
            <tr v-if="!sortedList.length">
              <td :colspan="showCreatedAt ? 7 : 6" class="bo-empty">No encontramos clientes con los filtros actuales.</td>
            </tr>
          </tbody>
        </table>

        <div class="bo-pagination">
          <button type="button" @click="goToPage('prev')" :disabled="filters.page <= 1">Anterior</button>
          <span>Pagina {{ filters.page }} de {{ lastPage }}</span>
          <button type="button" @click="goToPage('next')" :disabled="filters.page >= lastPage">Siguiente</button>
        </div>
      </div>

      <aside class="bo-card bo-detail" :class="{ empty: !hasSelection }">
        <header class="bo-detail-header">
          <h2>Detalle</h2>
          <button v-if="hasSelection" class="link-button" type="button" @click="clearSelection">Cerrar</button>
        </header>

        <div v-if="!hasSelection" class="bo-muted">Selecciona un cliente para ver el detalle.</div>
        <div v-else-if="detailLoading" class="bo-loading" role="status" aria-live="polite">Cargando detalle...</div>
        <div v-else-if="detailError" class="bo-error" role="alert">{{ detailError }}</div>
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
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 20px;
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
  padding-top: 12px;
  font-size: 13px;
  color: #6b6b80;
}

.bo-pagination button {
  background: none;
  border: none;
  font-weight: 600;
  color: #7a4fd9;
  cursor: pointer;
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

@media (max-width: 1010px) {
  .bo-content {
    grid-template-columns: 1fr;
  }
}
</style>

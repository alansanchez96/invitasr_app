<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  listPayments,
  getPayment,
  type PaymentDetail,
  type PaymentListItem,
} from '@/services/payments'
import { notifyError } from '@/utils/toast'

type Filters = {
  client_id: string
  status: string
  provider: string
  type: string
  date_from: string
  date_to: string
  page: number
  perPage: number
}

const filters = reactive<Filters>({
  client_id: '',
  status: '',
  provider: '',
  type: '',
  date_from: '',
  date_to: '',
  page: 1,
  perPage: 10,
})

const list = ref<PaymentListItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)

const selectedId = ref<string | number | null>(null)
const selected = ref<PaymentDetail | null>(null)
const detailLoading = ref(false)
const isResettingFilters = ref(false)
const isFiltersOpen = ref(true)
const showCreatedAt = ref(false)

const hasSelection = computed(() => selectedId.value !== null)
let filtersTimer: number | undefined

type SortKey =
  | 'id'
  | 'client'
  | 'plan'
  | 'amount'
  | 'status'
  | 'type'
  | 'provider'
  | 'paid_at'
  | 'created_at'

type SortField =
  | 'id'
  | 'client_id'
  | 'plan_id'
  | 'amount'
  | 'status'
  | 'type'
  | 'provider'
  | 'paid_at'
  | 'created_at'

const sortField = ref<SortField>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')
const perPageOptions = [10, 15, 25, 50]
const isCompactPagination = ref(false)

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

const formatAmount = (amount?: string | number, currency?: string) => {
  if (!amount) return '-'
  const suffix = currency ? ` ${currency.toUpperCase()}` : ''
  return `${amount}${suffix}`
}

const formatStatus = (value?: string) => {
  if (!value) return 'Pendiente'
  const normalized = value.toLowerCase()
  if (normalized === 'paid') return 'Pagado'
  if (normalized === 'active') return 'Activo'
  if (normalized === 'failed') return 'Fallido'
  if (normalized === 'canceled') return 'Cancelado'
  return 'Pendiente'
}

const formatType = (value?: string) => {
  if (!value) return 'Pago unico'
  return value === 'subscription' ? 'Suscripcion' : 'Pago unico'
}

const formatProvider = (value?: string) => {
  if (!value) return '-'
  if (value.toLowerCase() === 'mercadopago') return 'MercadoPago'
  return value.toUpperCase()
}

const statusClass = (value?: string) => {
  if (!value) return 'pending'
  const normalized = value.toLowerCase()
  if (normalized === 'paid') return 'paid'
  if (normalized === 'active') return 'active'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'canceled') return 'canceled'
  return 'pending'
}

const sortFieldMap: Record<SortKey, SortField> = {
  id: 'id',
  client: 'client_id',
  plan: 'plan_id',
  amount: 'amount',
  status: 'status',
  type: 'type',
  provider: 'provider',
  paid_at: 'paid_at',
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

const fetchList = async () => {
  isLoading.value = true
  try {
    const result = await listPayments({
      ...filters,
      orderField: sortField.value,
      orderDirection: sortDir.value,
    })
    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage
    if (result.orderField && sortFieldMap) {
      const matched = Object.values(sortFieldMap).includes(result.orderField as SortField)
      if (matched) sortField.value = result.orderField as SortField
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

const openPayment = async (item: PaymentListItem) => {
  const id = item.id
  if (!id) return
  selectedId.value = id
  detailLoading.value = true
  try {
    const data = await getPayment(id)
    selected.value = data as PaymentDetail
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
  filters.client_id = ''
  filters.status = ''
  filters.provider = ''
  filters.type = ''
  filters.date_from = ''
  filters.date_to = ''
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
  () => [
    filters.client_id,
    filters.status,
    filters.provider,
    filters.type,
    filters.date_from,
    filters.date_to,
  ],
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
        <h1>Pagos</h1>
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
      <div
        id="filters-panel"
        class="filters-panel"
        :class="{ open: isFiltersOpen }"
        role="region"
        aria-label="Filtros de pagos">
        <div class="bo-filters">
          <div class="field field--status">
            <label for="filter-status">Estado</label>
            <select id="filter-status" v-model="filters.status">
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="active">Activo</option>
              <option value="failed">Fallido</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
          <div class="field field--provider">
            <label for="filter-provider">Proveedor</label>
            <select id="filter-provider" v-model="filters.provider">
              <option value="">Todos</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>
          <div class="field field--client">
            <label for="filter-client">Cliente ID</label>
            <input id="filter-client" v-model="filters.client_id" type="text" placeholder="Ej: 120" />
          </div>
          <div class="field field--type">
            <label for="filter-type">Tipo</label>
            <select id="filter-type" v-model="filters.type">
              <option value="">Todos</option>
              <option value="one_time">Pago unico</option>
              <option value="subscription">Suscripcion</option>
            </select>
          </div>
          <div class="field field--date-from">
            <label for="filter-date-from">Desde</label>
            <input id="filter-date-from" v-model="filters.date_from" type="date" />
          </div>
          <div class="field field--date-to">
            <label for="filter-date-to">Hasta</label>
            <input id="filter-date-to" v-model="filters.date_to" type="date" />
          </div>
          <button
            class="filters-clear"
            type="button"
            aria-label="Limpiar filtros"
            title="Limpiar filtros"
            @click="resetFilters">
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

        <div v-if="isLoading" class="bo-loading" role="status" aria-live="polite">Cargando pagos...</div>

        <table v-else>
          <caption class="sr-only">Listado de pagos</caption>
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
              <th scope="col" :aria-sort="getAriaSort('plan')">
                <button class="sort-button" type="button" @click="setSort('plan')">
                  <span>Plan</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('plan'), desc: isSortActive('plan') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('amount')">
                <button class="sort-button" type="button" @click="setSort('amount')">
                  <span>Monto</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('amount'), desc: isSortActive('amount') && sortDir === 'desc' }">
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
              <th scope="col" :aria-sort="getAriaSort('type')">
                <button class="sort-button" type="button" @click="setSort('type')">
                  <span>Tipo</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('type'), desc: isSortActive('type') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('provider')">
                <button class="sort-button" type="button" @click="setSort('provider')">
                  <span>Proveedor</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('provider'), desc: isSortActive('provider') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th scope="col" :aria-sort="getAriaSort('paid_at')">
                <button class="sort-button" type="button" @click="setSort('paid_at')">
                  <span>Pagado</span>
                  <span class="sort-indicator" :class="{ active: isSortActive('paid_at'), desc: isSortActive('paid_at') && sortDir === 'desc' }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </th>
              <th v-if="showCreatedAt" scope="col" :aria-sort="getAriaSort('created_at')">
                <button class="sort-button" type="button" @click="setSort('created_at')">
                  <span>Creado</span>
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
              :key="String(item.id)"
              class="table-row"
              :class="{ 'is-selected': item.id === selectedId }"
              tabindex="0"
              :aria-label="`Ver detalle de pago ${item.id ?? ''}`"
              :aria-selected="item.id === selectedId"
              @click="openPayment(item)"
              @keydown.enter.prevent="openPayment(item)"
              @keydown.space.prevent="openPayment(item)">
              <td>{{ item.id ?? '-' }}</td>
              <td>{{ item.client_name ?? '-' }}</td>
              <td>{{ item.plan_name ?? '-' }}</td>
              <td>{{ formatAmount(item.amount, item.currency) }}</td>
              <td>
                <span class="status-badge" :class="statusClass(item.status)">{{ formatStatus(item.status) }}</span>
              </td>
              <td>{{ formatType(item.type) }}</td>
              <td>{{ formatProvider(item.provider) }}</td>
              <td>{{ formatDate(item.paid_at) }}</td>
              <td v-if="showCreatedAt">{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="!list.length">
              <td :colspan="showCreatedAt ? 9 : 8" class="bo-empty">No encontramos pagos con los filtros actuales.</td>
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
          <button v-if="hasSelection" class="link-button" type="button" @click="clearSelection">Cerrar</button>
        </header>

        <div v-if="!hasSelection" class="bo-muted">Selecciona un pago para ver el detalle.</div>
        <div v-else-if="detailLoading" class="bo-loading" role="status" aria-live="polite">Cargando detalle...</div>
        <div v-else-if="selected" class="bo-detail-body">
          <div class="detail-row">
            <span>ID</span>
            <strong>{{ selected.id ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Cliente</span>
            <strong>{{ selected.client_name ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Plan</span>
            <strong>{{ selected.plan_name ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Monto</span>
            <strong>{{ formatAmount(selected.amount, selected.currency) }}</strong>
          </div>
          <div class="detail-row">
            <span>Estado</span>
            <strong class="status-badge" :class="statusClass(selected.status)">{{ formatStatus(selected.status) }}</strong>
          </div>
          <div class="detail-row">
            <span>Tipo</span>
            <strong>{{ formatType(selected.type) }}</strong>
          </div>
          <div class="detail-row">
            <span>Proveedor</span>
            <strong>{{ formatProvider(selected.provider) }}</strong>
          </div>
          <div class="detail-row">
            <span>ID pago proveedor</span>
            <strong>{{ selected.provider_payment_id ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>ID suscripcion proveedor</span>
            <strong>{{ selected.provider_subscription_id ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>ID cliente proveedor</span>
            <strong>{{ selected.provider_customer_id ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Pagado</span>
            <strong>{{ formatDate(selected.paid_at) }}</strong>
          </div>
          <div class="detail-row">
            <span>Creado</span>
            <strong>{{ formatDate(selected.created_at) }}</strong>
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

.field--provider {
  grid-column: 2;
  grid-row: 1;
}

.field--client {
  grid-column: 3;
  grid-row: 1;
}

.field--type {
  grid-column: 1;
  grid-row: 2;
}

.field--date-from {
  grid-column: 2;
  grid-row: 2;
}

.field--date-to {
  grid-column: 3;
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

.bo-table th {
  color: #475569;
  font-weight: 700;
}

.bo-table tbody .table-row {
  cursor: pointer;
  transition: background 0.2s ease;
}

.bo-table tbody .table-row:hover {
  background: #f6f4ff;
}

.bo-table tbody .table-row.is-selected {
  background: #efe7ff;
}

.bo-table tbody .table-row:focus-visible {
  outline: 2px solid rgba(122, 79, 217, 0.6);
  outline-offset: -2px;
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

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 600;
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.status-badge.paid,
.status-badge.active {
  background: rgba(16, 185, 129, 0.16);
  color: #0f766e;
}

.status-badge.pending {
  background: rgba(234, 179, 8, 0.16);
  color: #854d0e;
}

.status-badge.failed {
  background: rgba(239, 68, 68, 0.16);
  color: #b91c1c;
}

.status-badge.canceled {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.bo-empty {
  text-align: center !important;
  color: #6b6b80;
  font-weight: 600;
  padding: 22px 10px !important;
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
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-left button {
  border-radius: 999px;
  border: 1px solid #e2ddf7;
  background: #fff;
  padding: 6px 12px;
  font-weight: 600;
  cursor: pointer;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-button {
  border-radius: 999px;
  border: 1px solid transparent;
  background: #f3f0ff;
  color: #7a4fd9;
  padding: 4px 10px;
  font-weight: 600;
  cursor: pointer;
}

.page-button.active {
  background: #7a4fd9;
  color: #fff;
}

.pagination-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.per-page {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.per-page select {
  border-radius: 999px;
  border: 1px solid #e2ddf7;
  padding: 5px 10px;
  background: #fff;
  font-weight: 600;
}

.bo-detail {
  display: grid;
  gap: 16px;
  align-content: start;
}

.bo-detail.empty {
  color: #6b6b80;
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
  display: grid;
  gap: 6px;
}

.detail-row span {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.detail-row strong {
  font-size: 14px;
  color: #1f2937;
}

.bo-muted {
  color: #6b6b80;
}

.bo-loading {
  padding: 20px 0;
  font-weight: 600;
  color: #6b6b80;
}

.link-button {
  background: none;
  border: none;
  color: #7a4fd9;
  font-weight: 600;
  cursor: pointer;
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
    max-height: 700px;
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

  .field--provider {
    grid-column: 2;
    grid-row: 1;
  }

  .field--client {
    grid-column: 1;
    grid-row: 2;
  }

  .field--type {
    grid-column: 2;
    grid-row: 2;
  }

  .field--date-from {
    grid-column: 1;
    grid-row: 3;
  }

  .field--date-to {
    grid-column: 2;
    grid-row: 3;
  }
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
    min-width: 900px;
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

  .field--provider {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .field--client {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .field--type {
    grid-column: 1 / -1;
    grid-row: 4;
  }

  .field--date-from {
    grid-column: 1 / -1;
    grid-row: 5;
  }

  .field--date-to {
    grid-column: 1 / -1;
    grid-row: 6;
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

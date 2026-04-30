<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { listTenantPayments, type TenantPaymentItem } from '@/services/tenantPayments'
import { formatStatusLabel } from '@/utils/clientPanel'

type SortField = 'id' | 'plan_name' | 'purchase_kind' | 'amount' | 'status' | 'paid_at' | 'created_at' | 'updated_at'
type SortDirection = 'asc' | 'desc'

const rows = ref<TenantPaymentItem[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const searchInput = ref('')
const searchQuery = ref('')
const selectedStatus = ref('')
const sortBy = ref<SortField>('id')
const sortDir = ref<SortDirection>('desc')

const perPageOptions = [10, 15, 25, 50]
const perPage = ref(10)
const currentPage = ref(1)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
})

const cellPreview = ref({
  visible: false,
  text: '',
})

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let cellPreviewTimer: ReturnType<typeof setTimeout> | null = null

const statusOptionsBase = [
  { value: '', label: 'Todos los estados' },
  { value: 'paid', label: 'Pago aprobado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'failed', label: 'Fallido' },
  { value: 'canceled', label: 'Cancelado' },
  { value: 'refunded', label: 'Reintegrado' },
  { value: 'unpaid', label: 'Impago' },
]

const statusOptions = computed(() => {
  const known = new Set(statusOptionsBase.map((item) => item.value))
  const dynamic = rows.value
    .map((row) => String(row.status ?? '').trim().toLowerCase())
    .filter((value) => value && !known.has(value))
    .map((value) => ({ value, label: formatStatusLabel(value, value) }))

  return [...statusOptionsBase, ...dynamic]
})

const totalPages = computed(() => Math.max(1, pagination.value.last_page || 1))
const canGoPrev = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const pageItems = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const totalApprovedVisible = computed(() =>
  rows.value.filter((item) => String(item.status ?? '').toLowerCase() === 'paid').length,
)

const totalPendingVisible = computed(() =>
  rows.value.filter((item) => String(item.status ?? '').toLowerCase() === 'pending').length,
)

const totalAmountVisible = computed(() => {
  let total = 0
  for (const item of rows.value) {
    const value = Number(item.amount ?? '')
    if (!Number.isFinite(value)) continue
    total += value
  }
  return total
})

const latestPaidAtLabel = computed(() => {
  let latestTs = 0
  let latestPaymentId: number | null = null
  for (const item of rows.value) {
    if (!item.paid_at) continue
    const ts = new Date(item.paid_at).getTime()
    if (!Number.isFinite(ts)) continue
    if (ts > latestTs) {
      latestTs = ts
      latestPaymentId = Number(item.id)
    }
  }
  return latestPaymentId ? `#${latestPaymentId}` : 'Sin pagos acreditados'
})

const activeSortLabel = computed(() => {
  if (sortBy.value === 'plan_name') {
    return `Plan ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  }
  if (sortBy.value === 'amount') {
    return sortDir.value === 'asc'
      ? 'Monto: menor a mayor'
      : 'Monto: mayor a menor'
  }
  if (sortBy.value === 'purchase_kind') {
    return sortDir.value === 'asc'
      ? 'Concepto: compras primero'
      : 'Concepto: mejoras primero'
  }
  if (sortBy.value === 'status') {
    return sortDir.value === 'asc'
      ? 'Estado: pagos aprobados primero'
      : 'Estado: pendientes o rechazados primero'
  }
  if (sortBy.value === 'paid_at') {
    return sortDir.value === 'asc'
      ? 'Pago: más antiguo primero'
      : 'Pago: más reciente primero'
  }
  if (sortBy.value === 'created_at') {
    return sortDir.value === 'asc'
      ? 'Creación: más antigua primero'
      : 'Creación: más reciente primero'
  }
  if (sortBy.value === 'updated_at') {
    return sortDir.value === 'asc'
      ? 'Actualización: más antigua primero'
      : 'Actualización: más reciente primero'
  }
  return sortDir.value === 'asc'
    ? 'Cobros: primeros registros primero'
    : 'Cobros: últimos registros primero'
})

const sortIndicator = (field: SortField) => {
  if (sortBy.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const isSortActive = (field: SortField) => sortBy.value === field

const toggleSort = (field: SortField) => {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortBy.value = field
  sortDir.value = field === 'id' ? 'desc' : 'asc'
}

const resolveStatusClass = (status: string | null) => {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (normalized === 'paid') return 'status-pill--ok'
  if (normalized === 'pending') return 'status-pill--pending'
  if (normalized === 'failed' || normalized === 'canceled' || normalized === 'unpaid') return 'status-pill--danger'
  if (normalized === 'refunded') return 'status-pill--neutral'
  return 'status-pill--neutral'
}

const paymentInitials = (item: TenantPaymentItem) => {
  if (item.purchase_category === 'credit_purchase') return 'CR'
  if (item.purchase_category === 'plan_upgrade') return 'UP'
  if (item.purchase_category === 'subscription_renewal') return 'RN'

  const plan = String(item.plan_name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('')

  if (plan) return plan

  const provider = String(item.provider ?? '').trim().slice(0, 2).toUpperCase()
  return provider || 'PG'
}

const formatPlanName = (name: string | null) => {
  const normalized = String(name ?? '').trim().toLowerCase()
  if (normalized === 'basic') return 'Basic'
  if (normalized === 'pro') return 'Pro'
  if (normalized === 'planner') return 'Planner'
  if (!normalized) return 'Sin plan'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const resolvePurchaseClass = (item: TenantPaymentItem) => {
  if (item.purchase_category === 'credit_purchase') return 'purchase-pill--credits'
  if (item.purchase_category === 'plan_upgrade') return 'purchase-pill--upgrade'
  if (item.purchase_category === 'subscription_renewal') return 'purchase-pill--renewal'
  return 'purchase-pill--plan'
}

const purchaseIcon = (item: TenantPaymentItem) => {
  if (item.purchase_category === 'credit_purchase') return '+'
  if (item.purchase_category === 'plan_upgrade') return '↑'
  if (item.purchase_category === 'subscription_renewal') return '↻'
  return '✓'
}

const purchasePreview = (item: TenantPaymentItem) => {
  const label = item.purchase_label || 'Pago'
  const description = item.purchase_description || formatPlanName(item.plan_name)
  if (item.discount_percent) {
    return `${label} · ${description} · ${item.discount_percent}% de descuento`
  }
  return `${label} · ${description}`
}

const rowClass = (item: TenantPaymentItem) => ({
  'payment-row--upgrade': item.purchase_category === 'plan_upgrade',
})

const formatMoney = (amount: string | null, currency: string | null) => {
  const value = Number(amount ?? '')
  const code = String(currency ?? 'ARS').toUpperCase()
  if (!Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatAmountVisible = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDateTime = (value: string | null) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}

const showCellPreview = (value: string) => {
  const text = String(value ?? '').trim()
  if (!text) return

  cellPreview.value.visible = true
  cellPreview.value.text = text

  if (cellPreviewTimer) {
    clearTimeout(cellPreviewTimer)
    cellPreviewTimer = null
  }

  cellPreviewTimer = setTimeout(() => {
    cellPreview.value.visible = false
    cellPreviewTimer = null
  }, 2200)
}

const loadPayments = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const result = await listTenantPayments({
      page: currentPage.value,
      perPage: perPage.value,
      search: searchQuery.value,
      status: selectedStatus.value,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    })

    rows.value = result.items
    pagination.value = {
      current_page: result.pagination.current_page,
      last_page: result.pagination.last_page,
      per_page: result.pagination.per_page,
      total: result.pagination.total,
    }
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus pagos.'
  } finally {
    isLoading.value = false
  }
}

const resetToFirstPageOrLoad = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  void loadPayments()
}

const goToPage = (page: number) => {
  const target = Math.min(totalPages.value, Math.max(1, page))
  if (target === currentPage.value) return
  currentPage.value = target
}

const goToPrevPage = () => goToPage(currentPage.value - 1)
const goToNextPage = () => goToPage(currentPage.value + 1)
const refreshRows = () => void loadPayments()

watch(currentPage, () => {
  void loadPayments()
}, { immediate: true })

watch([sortBy, sortDir], () => {
  resetToFirstPageOrLoad()
})

watch(selectedStatus, () => {
  resetToFirstPageOrLoad()
})

watch(perPage, () => {
  resetToFirstPageOrLoad()
})

watch(searchInput, (value) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    searchQuery.value = value.trim()
  }, 320)
})

watch(searchQuery, () => {
  resetToFirstPageOrLoad()
})

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  if (cellPreviewTimer) {
    clearTimeout(cellPreviewTimer)
    cellPreviewTimer = null
  }
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-payments-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Historial de pagos</p>
        <h1 id="client-payments-title">Mis pagos</h1>
        <p class="client-lead">
          Revisa tu historial completo de cobros, estado y fechas de cada movimiento.
        </p>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen de pagos">
      <article class="bo-card stat-card">
        <span>Total de movimientos</span>
        <strong>{{ pagination.total }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Pagos aprobados (vista)</span>
        <strong>{{ totalApprovedVisible }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Pendientes (vista)</span>
        <strong>{{ totalPendingVisible }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Monto visible</span>
        <strong>{{ formatAmountVisible(totalAmountVisible) }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Último pago visible</span>
        <strong>{{ latestPaidAtLabel }}</strong>
      </article>
    </section>

    <article class="bo-card filters-card">
      <div class="filters-row">
        <label class="field field-search">
          <span>Buscar</span>
          <div class="search-shell">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              v-model="searchInput"
              type="search"
              placeholder="Buscar por ID, plan, concepto, estado o fecha" />
          </div>
        </label>

        <label class="field field-status">
          <span>Estado</span>
          <select v-model="selectedStatus">
            <option v-for="item in statusOptions" :key="item.value || 'all'" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <p class="filters-helper">{{ activeSortLabel }}</p>

        <div class="filters-actions">
          <div class="per-page-control">
            <select aria-label="Cantidad de filas" v-model.number="perPage" :disabled="isLoading">
              <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>

          <button
            type="button"
            class="refresh-icon-btn"
            :disabled="isLoading"
            aria-label="Recargar datos"
            title="Recargar datos"
            @click="refreshRows">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" :class="{ 'is-spinning': isLoading }" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>
    </article>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando pagos...</p>

    <article class="bo-card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Tabla de pagos del cliente</caption>
          <thead>
            <tr>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('id') }" @click="toggleSort('id')">
                  <span>ID</span>
                  <span class="sort-head-indicator">{{ sortIndicator('id') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('plan_name') }" @click="toggleSort('plan_name')">
                  <span>Plan</span>
                  <span class="sort-head-indicator">{{ sortIndicator('plan_name') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('purchase_kind') }" @click="toggleSort('purchase_kind')">
                  <span>Concepto</span>
                  <span class="sort-head-indicator">{{ sortIndicator('purchase_kind') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('amount') }" @click="toggleSort('amount')">
                  <span>Monto</span>
                  <span class="sort-head-indicator">{{ sortIndicator('amount') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('status') }" @click="toggleSort('status')">
                  <span>Estado</span>
                  <span class="sort-head-indicator">{{ sortIndicator('status') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('paid_at') }" @click="toggleSort('paid_at')">
                  <span>Fecha de pago</span>
                  <span class="sort-head-indicator">{{ sortIndicator('paid_at') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('created_at') }" @click="toggleSort('created_at')">
                  <span>Creado</span>
                  <span class="sort-head-indicator">{{ sortIndicator('created_at') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('updated_at') }" @click="toggleSort('updated_at')">
                  <span>Actualizado</span>
                  <span class="sort-head-indicator">{{ sortIndicator('updated_at') }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && !loadError && !rows.length">
              <td colspan="8" class="empty-row">Todavía no encontramos pagos para mostrar.</td>
            </tr>
            <tr v-for="item in rows" :key="item.id" :class="rowClass(item)">
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn cell-identity-btn"
                  :title="`#${item.id}`"
                  @click="showCellPreview(`#${item.id} · ${purchasePreview(item)}`)">
                  <span class="payment-avatar" aria-hidden="true">{{ paymentInitials(item) }}</span>
                  <span class="payment-identity">
                    <strong>#{{ item.id }}</strong>
                  </span>
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn cell-plan-btn"
                  :title="formatPlanName(item.plan_name)"
                  @click="showCellPreview(formatPlanName(item.plan_name))">
                  <strong>{{ formatPlanName(item.plan_name) }}</strong>
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn purchase-cell-btn"
                  :title="purchasePreview(item)"
                  @click="showCellPreview(purchasePreview(item))">
                  <span class="purchase-pill" :class="resolvePurchaseClass(item)">
                    <span class="purchase-icon" aria-hidden="true">{{ purchaseIcon(item) }}</span>
                    <span class="purchase-copy">
                      <strong>{{ item.purchase_label || 'Pago' }}</strong>
                      <small>{{ item.purchase_description || formatPlanName(item.plan_name) }}</small>
                    </span>
                  </span>
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatMoney(item.amount, item.currency)"
                  @click="showCellPreview(formatMoney(item.amount, item.currency))">
                  <span class="amount-pill">{{ formatMoney(item.amount, item.currency) }}</span>
                </button>
              </td>
              <td>
                <span class="status-pill" :class="resolveStatusClass(item.status)">
                  {{ formatStatusLabel(item.status, 'Sin estado') }}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatDateTime(item.paid_at)"
                  @click="showCellPreview(formatDateTime(item.paid_at))">
                  {{ formatDateTime(item.paid_at) }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatDateTime(item.created_at)"
                  @click="showCellPreview(formatDateTime(item.created_at))">
                  {{ formatDateTime(item.created_at) }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatDateTime(item.updated_at)"
                  @click="showCellPreview(formatDateTime(item.updated_at))">
                  {{ formatDateTime(item.updated_at) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <footer class="bo-card pagination-card">
      <div class="pagination-layout">
        <BaseButton
          type="button"
          variant="ghost"
          class="pagination-nav-btn pagination-nav-btn--left"
          :disabled="!canGoPrev || isLoading"
          @click="goToPrevPage">
          <span class="pagination-arrow" aria-hidden="true">←</span>
          <span class="pagination-label">Anterior</span>
        </BaseButton>

        <div class="pagination-center">
          <p class="pagination-summary">
            Página {{ currentPage }} de {{ totalPages }} · {{ pagination.total }} registros
          </p>
          <div class="pagination-pages">
            <button
              v-for="page in pageItems"
              :key="page"
              type="button"
              class="page-btn"
              :class="{ 'page-btn--active': page === currentPage }"
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
          @click="goToNextPage">
          <span class="pagination-label">Siguiente</span>
          <span class="pagination-arrow" aria-hidden="true">→</span>
        </BaseButton>
      </div>
    </footer>

    <Transition name="cell-preview-fade">
      <div v-if="cellPreview.visible" class="cell-preview-quote" role="status" aria-live="polite">
        <p>{{ cellPreview.text }}</p>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 18px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.client-page-head,
.filters-card,
.table-card,
.pagination-card,
.stat-card {
  padding: 20px;
  min-width: 0;
}

.client-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-page-head h1 {
  margin: 0;
}

.client-lead,
.client-inline-note {
  margin: 0;
  color: #6a5a84;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: grid;
  gap: 0.35rem;
}

.stat-card span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.stat-card strong {
  font-size: 1.1rem;
  color: #1f1442;
  line-height: 1.2;
}

.filters-row {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(190px, 230px) auto auto;
  align-items: end;
  gap: 12px;
}

.filters-row > * {
  min-width: 0;
}

.field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.field span {
  font-weight: 700;
  color: var(--brand-ink);
}

.field input,
.field select {
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.75rem 0.9rem;
  color: var(--brand-ink);
  font-size: 0.92rem;
  font-family: inherit;
}

.field-search input {
  width: 100%;
  border: 0;
  background: transparent;
  min-height: 42px;
  padding: 0;
  min-width: 0;
}

.search-shell {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0 0.9rem;
  min-width: 0;
}

.search-shell svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: #7a66a5;
  stroke-width: 1.9;
}

.field input:focus-visible,
.field select:focus-visible,
.filters-actions select:focus-visible {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
}

.search-shell:focus-within {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
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
  white-space: nowrap;
  min-width: 0;
}

.filters-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-height: 44px;
  justify-self: end;
}

.per-page-control {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.per-page-control select {
  width: auto;
  min-width: 58px;
  min-height: 36px;
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

.table-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(111, 57, 187, 0.35) rgba(234, 225, 247, 0.65);
}

table {
  width: max(100%, 1120px);
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 12px 12px;
  border-bottom: 1px solid #eee5fb;
  font-size: 0.92rem;
  color: #2b2242;
  white-space: nowrap;
}

th:nth-child(1),
td:nth-child(1) {
  min-width: 130px;
}

th:nth-child(2),
td:nth-child(2) {
  min-width: 160px;
}

th:nth-child(3),
td:nth-child(3) {
  min-width: 220px;
}

th:nth-child(4),
td:nth-child(4) {
  min-width: 124px;
}

th:nth-child(5),
td:nth-child(5) {
  min-width: 146px;
}

th:nth-child(6),
td:nth-child(6),
th:nth-child(7),
td:nth-child(7),
th:nth-child(8),
td:nth-child(8) {
  min-width: 154px;
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover td {
  background: rgba(247, 241, 255, 0.72);
}

tbody tr.payment-row--upgrade td {
  background:
    linear-gradient(90deg, rgba(248, 243, 255, 0.96), rgba(239, 247, 255, 0.88)),
    radial-gradient(circle at 2% 50%, rgba(124, 77, 224, 0.14), transparent 32%);
}

tbody tr.payment-row--upgrade:hover td {
  background:
    linear-gradient(90deg, rgba(244, 237, 255, 0.98), rgba(232, 243, 255, 0.94)),
    radial-gradient(circle at 2% 50%, rgba(124, 77, 224, 0.2), transparent 34%);
}

th {
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

.cell-ellipsis-btn {
  width: 100%;
  max-width: 100%;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  line-height: inherit;
  white-space: inherit;
  overflow: inherit;
  text-overflow: inherit;
  cursor: help;
}

.cell-identity-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}

.payment-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(111, 57, 187, 0.2);
  background: linear-gradient(135deg, #6f39bb, #c2548d);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.payment-row--upgrade .payment-avatar {
  background: linear-gradient(135deg, #32205a, #7b4ee0 48%, #e54ab2);
  box-shadow: 0 8px 24px rgba(111, 57, 187, 0.22);
}

.payment-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.payment-identity strong {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-plan-btn {
  display: grid;
  gap: 2px;
  cursor: pointer;
}

.cell-plan-btn strong,
.cell-plan-btn small {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-plan-btn strong {
  font-weight: 700;
}

.cell-plan-btn small {
  color: #7b6c98;
  font-size: 0.76rem;
}

.amount-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(22, 163, 74, 0.24);
  background: rgba(240, 253, 244, 0.95);
  color: #166534;
  font-size: 0.81rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.purchase-cell-btn {
  cursor: pointer;
}

.purchase-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  max-width: 100%;
  min-width: 0;
  padding: 0.42rem 0.6rem;
  border-radius: 16px;
  border: 1px solid transparent;
  box-shadow: 0 10px 26px rgba(54, 31, 86, 0.08);
}

.purchase-icon {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 900;
}

.purchase-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.purchase-copy strong,
.purchase-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.purchase-copy strong {
  color: #24163f;
  font-size: 0.85rem;
}

.purchase-copy small {
  color: #6b5b86;
  font-size: 0.76rem;
}

.purchase-pill--plan {
  background: rgba(248, 243, 255, 0.92);
  border-color: rgba(111, 57, 187, 0.18);
}

.purchase-pill--plan .purchase-icon {
  background: linear-gradient(135deg, #6f39bb, #a855f7);
}

.purchase-pill--credits {
  background: rgba(239, 253, 244, 0.94);
  border-color: rgba(22, 163, 74, 0.2);
}

.purchase-pill--credits .purchase-icon {
  background: linear-gradient(135deg, #15803d, #22c55e);
}

.purchase-pill--upgrade {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(245, 238, 255, 0.96));
  border-color: rgba(126, 79, 224, 0.25);
}

.purchase-pill--upgrade .purchase-icon {
  background: linear-gradient(135deg, #32205a, #7b4ee0 52%, #e54ab2);
}

.purchase-pill--renewal {
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(224, 242, 254, 0.94));
  border-color: rgba(37, 99, 235, 0.22);
}

.purchase-pill--renewal .purchase-icon {
  background: linear-gradient(135deg, #1d4ed8, #38bdf8);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.status-pill--ok {
  color: #166534;
  background: rgba(240, 253, 244, 0.96);
  border-color: rgba(22, 163, 74, 0.24);
}

.status-pill--pending {
  color: #92400e;
  background: rgba(255, 251, 235, 0.96);
  border-color: rgba(217, 119, 6, 0.24);
}

.status-pill--danger {
  color: #9f1239;
  background: rgba(255, 241, 242, 0.96);
  border-color: rgba(225, 29, 72, 0.24);
}

.status-pill--neutral {
  color: #4f2d81;
  background: rgba(248, 243, 255, 0.9);
  border-color: rgba(111, 57, 187, 0.25);
}

.empty-row {
  text-align: center;
  color: #6a5a84;
  padding: 1.25rem 0.8rem;
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

.pagination-pages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex-wrap: nowrap;
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

.cell-preview-quote {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 80;
  width: min(92vw, 520px);
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.28);
  background: rgba(19, 15, 38, 0.95);
  color: #fff;
  padding: 0.7rem 0.8rem;
  box-shadow: 0 14px 32px rgba(15, 11, 31, 0.45);
}

.cell-preview-quote p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.35;
}

.cell-preview-quote p::before {
  content: '"';
  opacity: 0.8;
  margin-right: 2px;
}

.cell-preview-quote p::after {
  content: '"';
  opacity: 0.8;
  margin-left: 2px;
}

.cell-preview-fade-enter-active,
.cell-preview-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.cell-preview-fade-enter-from,
.cell-preview-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}

@media (max-width: 1220px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filters-row {
    grid-template-columns: minmax(220px, 1fr) minmax(180px, 230px);
  }

  .filters-helper {
    grid-column: 1 / -1;
  }

  .filters-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    justify-self: stretch;
  }
}

@media (max-width: 980px) {
  table {
    width: max(100%, 1080px);
  }

  th,
  td {
    padding: 11px 10px;
    font-size: 0.86rem;
  }
}

@media (max-width: 920px) {
  .client-page {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .client-page-head {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .field-search,
  .search-shell,
  .field,
  .field input,
  .field select {
    width: 100%;
    min-width: 0;
  }

  .filters-helper {
    white-space: normal;
  }

  .filters-actions {
    width: 100%;
    justify-content: space-between;
    justify-self: stretch;
    margin-left: 0;
    grid-column: auto;
  }

  .per-page-control {
    max-width: calc(100% - 44px);
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: max-content;
    min-width: 1080px;
    table-layout: auto;
  }

  .pagination-layout {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.55rem;
  }

  .pagination-center {
    min-width: 0;
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
  .client-page-head,
  .filters-card,
  .table-card,
  .pagination-card,
  .stat-card {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-row {
    grid-template-columns: 1fr;
    align-items: stretch;
    width: 100%;
  }

  .filters-actions {
    justify-content: space-between;
  }

  .field-search {
    width: 100%;
  }

  .field input,
  .field select {
    width: 100%;
    min-height: 44px;
  }

  table {
    width: max-content;
    min-width: 1040px;
    table-layout: auto;
  }

  th,
  td {
    padding: 10px 8px;
    font-size: 0.8rem;
    vertical-align: top;
    white-space: nowrap;
  }

  th {
    font-size: 0.72rem;
  }

  .sort-head-btn {
    align-items: flex-start;
  }

  :deep(.pagination-nav-btn) {
    min-height: 38px;
    width: 44px;
    min-width: 44px;
    padding-inline: 0;
    border-radius: 12px;
    justify-content: center;
  }

  .pagination-arrow {
    font-size: 1rem;
    line-height: 1;
  }

  .pagination-label {
    display: none;
  }

  .pagination-summary {
    font-size: 0.8rem;
  }

  .pagination-pages {
    max-width: 100%;
    justify-content: center;
  }

  .per-page-control select { width: auto; }

  .cell-ellipsis-btn {
    cursor: pointer;
  }

  .payment-avatar {
    width: 26px;
    height: 26px;
    font-size: 0.68rem;
  }

  .amount-pill {
    max-width: 100%;
    font-size: 0.76rem;
  }
}
</style>

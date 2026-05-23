<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { listTenantPaymentHistory, type TenantPaymentHistoryItem } from '@/services/tenantPayments'

const rows = ref<TenantPaymentHistoryItem[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const searchInput = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const perPage = ref(10)
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

const positiveCreditsVisible = computed(() =>
  rows.value.reduce((total, item) => {
    const value = Number(item.credit_delta ?? 0)
    return value > 0 ? total + value : total
  }, 0),
)

const usedCreditsVisible = computed(() =>
  Math.abs(rows.value.reduce((total, item) => {
    const value = Number(item.credit_delta ?? 0)
    return value < 0 ? total + value : total
  }, 0)),
)

const adjustmentMovementsVisible = computed(() =>
  rows.value.filter((item) => {
    const type = String(item.movement_type ?? '').toLowerCase()
    return type === 'credit_expired' || type === 'credit_canceled' || type === 'credit_refunded'
  }).length,
)

const formatPlanName = (name: string | null) => {
  const normalized = String(name ?? '').trim().toLowerCase()
  if (normalized === 'basic') return 'Basic'
  if (normalized === 'pro') return 'Pro'
  if (normalized === 'planner') return 'Planner'
  if (!normalized) return 'Sin plan'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
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

const formatCredits = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '-'
  if (value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

const movementPreview = (item: TenantPaymentHistoryItem) => {
  const label = item.label || 'Movimiento'
  const description = item.description || item.reference_label || ''
  return description ? `${label} · ${description}` : label
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

const loadHistory = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const result = await listTenantPaymentHistory({
      page: currentPage.value,
      perPage: perPage.value,
      search: searchQuery.value,
      category: 'credit',
      source: 'credit_movement',
      sortDir: 'desc',
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
    loadError.value = payload?.message ?? 'No pudimos cargar los movimientos.'
  } finally {
    isLoading.value = false
  }
}

const resetToFirstPageOrLoad = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  void loadHistory()
}

const goToPage = (page: number) => {
  const target = Math.min(totalPages.value, Math.max(1, page))
  if (target === currentPage.value) return
  currentPage.value = target
}

const goToPrevPage = () => goToPage(currentPage.value - 1)
const goToNextPage = () => goToPage(currentPage.value + 1)
const refreshRows = () => void loadHistory()

watch(currentPage, () => {
  void loadHistory()
}, { immediate: true })

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
  <section class="client-page container" aria-labelledby="client-payment-movements-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Créditos</p>
        <h1 id="client-payment-movements-title">Movimientos</h1>
        <p class="client-lead">
          Acreditaciones, usos, vencimientos y ajustes de créditos de tu cuenta.
        </p>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen de movimientos">
      <article class="bo-card stat-card">
        <span>Total de movimientos</span>
        <strong>{{ pagination.total }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Créditos agregados (vista)</span>
        <strong>{{ positiveCreditsVisible }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Créditos usados (vista)</span>
        <strong>{{ usedCreditsVisible }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Ajustes (vista)</span>
        <strong>{{ adjustmentMovementsVisible }}</strong>
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
              placeholder="Buscar por movimiento, referencia o plan" />
          </div>
        </label>

        <div class="filters-actions">
          <div class="per-page-control">
            <select aria-label="Cantidad de filas" v-model.number="perPage" :disabled="isLoading">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
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
    <p v-else-if="isLoading" class="client-inline-note">Cargando movimientos...</p>

    <article class="bo-card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Movimientos de créditos</caption>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Referencia</th>
              <th>Plan</th>
              <th>Créditos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && !loadError && !rows.length">
              <td colspan="5" class="empty-row">Todavía no encontramos movimientos de créditos para mostrar.</td>
            </tr>
            <tr v-for="item in rows" :key="item.id">
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatDateTime(item.occurred_at)"
                  @click="showCellPreview(formatDateTime(item.occurred_at))">
                  {{ formatDateTime(item.occurred_at) }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="movementPreview(item)"
                  @click="showCellPreview(movementPreview(item))">
                  <span class="movement-copy">
                    <strong>{{ item.label || 'Movimiento' }}</strong>
                    <small>{{ item.description || '-' }}</small>
                  </span>
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="item.reference_label || '-'"
                  @click="showCellPreview(item.reference_label || '-')">
                  {{ item.reference_label || '-' }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatPlanName(item.plan_name)"
                  @click="showCellPreview(formatPlanName(item.plan_name))">
                  {{ formatPlanName(item.plan_name) }}
                </button>
              </td>
              <td>
                <span
                  class="credits-delta-pill"
                  :class="{
                    'credits-delta-pill--positive': Number(item.credit_delta ?? 0) > 0,
                    'credits-delta-pill--negative': Number(item.credit_delta ?? 0) < 0,
                  }">
                  {{ formatCredits(item.credit_delta) }}
                </span>
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
            Página {{ currentPage }} de {{ totalPages }} · {{ pagination.total }} movimientos
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  grid-template-columns: minmax(240px, 1fr) auto;
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
  width: max(100%, 920px);
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
  min-width: 154px;
}

th:nth-child(2),
td:nth-child(2) {
  min-width: 230px;
}

th:nth-child(3),
td:nth-child(3),
th:nth-child(4),
td:nth-child(4),
th:nth-child(5),
td:nth-child(5) {
  min-width: 150px;
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover td {
  background: rgba(247, 241, 255, 0.72);
}

th {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b5b86;
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

.movement-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.movement-copy strong,
.movement-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movement-copy strong {
  color: #24163f;
  font-size: 0.86rem;
}

.movement-copy small {
  color: #6b5b86;
  font-size: 0.76rem;
}

.credits-delta-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
  border: 1px solid transparent;
  white-space: nowrap;
  color: #4f2d81;
  background: rgba(248, 243, 255, 0.9);
  border-color: rgba(111, 57, 187, 0.25);
}

.credits-delta-pill--positive {
  color: #166534;
  background: rgba(240, 253, 244, 0.96);
  border-color: rgba(22, 163, 74, 0.24);
}

.credits-delta-pill--negative {
  color: #92400e;
  background: rgba(255, 251, 235, 0.96);
  border-color: rgba(217, 119, 6, 0.24);
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

  .filters-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    justify-self: stretch;
  }
}

@media (max-width: 980px) {
  table {
    width: max-content;
    min-width: 900px;
    table-layout: auto;
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

  table {
    min-width: 860px;
  }

  th,
  td {
    padding: 10px 8px;
    font-size: 0.8rem;
    vertical-align: top;
  }

  th {
    font-size: 0.72rem;
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
}
</style>

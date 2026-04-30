<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  cancelTenantSubscription,
  listTenantSubscriptions,
  type TenantSubscriptionItem,
} from '@/services/tenantSubscriptions'
import { notifyError, notifySuccess } from '@/utils/toast'
import { formatStatusLabel } from '@/utils/clientPanel'

type SortField =
  | 'id'
  | 'current_period_start'
  | 'current_period_end'
  | 'status'
  | 'cancel_at_period_end'
  | 'canceled_at'
type SortDirection = 'asc' | 'desc'

const rows = ref<TenantSubscriptionItem[]>([])
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

const selectedId = ref<number | null>(null)
const cancelingId = ref<number | null>(null)
const cellPreview = ref({
  visible: false,
  text: '',
})

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let cellPreviewTimer: ReturnType<typeof setTimeout> | null = null

const statusOptionsBase = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activa' },
  { value: 'trialing', label: 'En prueba' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'past_due', label: 'Pendiente de pago' },
  { value: 'canceled', label: 'Cancelada' },
]

const statusOptions = computed(() => {
  const known = new Set(statusOptionsBase.map((item) => item.value))
  const dynamic = rows.value
    .map((row) => String(row.status ?? '').trim().toLowerCase())
    .filter((value) => value && !known.has(value))
    .map((value) => ({ value, label: formatStatusLabel(value, value) }))

  return [...statusOptionsBase, ...dynamic]
})

const selectedSubscription = computed(() => {
  if (!selectedId.value) return null
  return rows.value.find((item) => item.id === selectedId.value) ?? null
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

const totalActiveVisible = computed(
  () => rows.value.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length,
)

const cancelScheduledVisible = computed(
  () => rows.value.filter((item) => item.cancel_at_period_end).length,
)

const nextBillingVisibleLabel = computed(() => {
  let nextTs = Number.POSITIVE_INFINITY
  let nextIso: string | null = null
  const now = Date.now()

  for (const item of rows.value) {
    if (!item.current_period_end) continue
    const ts = new Date(item.current_period_end).getTime()
    if (!Number.isFinite(ts) || ts < now) continue
    if (ts < nextTs) {
      nextTs = ts
      nextIso = item.current_period_end
    }
  }

  return nextIso ? formatDateTime(nextIso) : 'Sin fecha visible'
})

const activeSortLabel = computed(() => {
  if (sortBy.value === 'current_period_start') {
    return sortDir.value === 'asc'
      ? 'Inicio del ciclo: fechas antiguas primero'
      : 'Inicio del ciclo: fechas recientes primero'
  }
  if (sortBy.value === 'current_period_end') {
    return sortDir.value === 'asc'
      ? 'Próxima renovación: fechas cercanas primero'
      : 'Próxima renovación: fechas lejanas primero'
  }
  if (sortBy.value === 'status') {
    return sortDir.value === 'asc'
      ? 'Estado: activas primero'
      : 'Estado: pendientes o canceladas primero'
  }
  if (sortBy.value === 'cancel_at_period_end') {
    return sortDir.value === 'asc'
      ? 'Cancelación: sin programar primero'
      : 'Cancelación: programadas primero'
  }
  if (sortBy.value === 'canceled_at') {
    return sortDir.value === 'asc'
      ? 'Canceladas: antiguas primero'
      : 'Canceladas: recientes primero'
  }
  return sortDir.value === 'asc'
    ? 'Suscripciones: primeros registros primero'
    : 'Suscripciones: últimos registros primero'
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
  if (normalized === 'active') return 'status-pill--ok'
  if (normalized === 'trialing') return 'status-pill--info'
  if (normalized === 'pending' || normalized === 'past_due' || normalized === 'unpaid') {
    return 'status-pill--pending'
  }
  if (normalized === 'canceled') return 'status-pill--danger'
  return 'status-pill--neutral'
}

const formatDateTime = (value: string | null | undefined) => {
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

const formatCycleStart = (item: TenantSubscriptionItem) => formatDateTime(item.current_period_start)
const formatCycleEnd = (item: TenantSubscriptionItem) => formatDateTime(item.current_period_end)

const formatCancelLabel = (item: TenantSubscriptionItem) => {
  if (item.cancel_at_period_end) return 'Al finalizar el periodo'
  return 'No programada'
}

const canCancelSubscription = (item: TenantSubscriptionItem) => {
  const status = String(item.status ?? '').toLowerCase()
  return Boolean(item.provider_subscription_id)
    && !item.cancel_at_period_end
    && !['canceled', 'cancelled'].includes(status)
}

const openDetails = (item: TenantSubscriptionItem) => {
  selectedId.value = selectedId.value === item.id ? null : item.id
}

const closeDetails = () => {
  selectedId.value = null
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

const loadSubscriptions = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const result = await listTenantSubscriptions({
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

    if (selectedId.value && !result.items.some((item) => item.id === selectedId.value)) {
      selectedId.value = null
    }
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus suscripciones.'
  } finally {
    isLoading.value = false
  }
}

const resetToFirstPageOrLoad = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  void loadSubscriptions()
}

const goToPage = (page: number) => {
  const target = Math.min(totalPages.value, Math.max(1, page))
  if (target === currentPage.value) return
  currentPage.value = target
}

const goToPrevPage = () => goToPage(currentPage.value - 1)
const goToNextPage = () => goToPage(currentPage.value + 1)
const refreshRows = () => void loadSubscriptions()

const cancelSubscription = async (item: TenantSubscriptionItem) => {
  if (!canCancelSubscription(item) || cancelingId.value) return

  const confirmed = window.confirm(
    '¿Quieres cancelar esta suscripción? No se realizarán nuevos cobros automáticos.',
  )

  if (!confirmed) return

  cancelingId.value = item.id

  try {
    await cancelTenantSubscription(item.id)
    notifySuccess('La suscripción quedó cancelada.')
    await loadSubscriptions()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos cancelar la suscripción.')
  } finally {
    cancelingId.value = null
  }
}

watch(currentPage, () => {
  void loadSubscriptions()
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
  <section class="client-page container" aria-labelledby="client-subscriptions-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Renovaciones</p>
        <h1 id="client-subscriptions-title">Suscripciones</h1>
        <p class="client-lead">
          Revisa tus periodos, estados y próximas fechas de facturación.
        </p>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen de suscripciones">
      <article class="bo-card stat-card">
        <span>Total de registros</span>
        <strong>{{ pagination.total }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Activas en vista</span>
        <strong>{{ totalActiveVisible }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Cancelación programada</span>
        <strong>{{ cancelScheduledVisible }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Próxima facturación visible</span>
        <strong>{{ nextBillingVisibleLabel }}</strong>
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
              placeholder="Buscar por ID, periodo o fecha" />
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
              <option v-for="option in perPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
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
    <p v-else-if="isLoading" class="client-inline-note">Cargando suscripciones...</p>

    <section class="subscriptions-shell" :class="{ 'subscriptions-shell--open': selectedSubscription }">
      <article class="bo-card table-card">
        <div class="table-wrap">
          <table>
            <caption class="sr-only">Tabla de suscripciones</caption>
            <thead>
              <tr>
                <th>
                  <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('id') }" @click="toggleSort('id')">
                    <span>ID</span>
                    <span class="sort-head-indicator">{{ sortIndicator('id') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('current_period_start') }" @click="toggleSort('current_period_start')">
                    <span>Inicio del ciclo</span>
                    <span class="sort-head-indicator">{{ sortIndicator('current_period_start') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('current_period_end') }" @click="toggleSort('current_period_end')">
                    <span>Próxima renovación</span>
                    <span class="sort-head-indicator">{{ sortIndicator('current_period_end') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('status') }" @click="toggleSort('status')">
                    <span>Estado</span>
                    <span class="sort-head-indicator">{{ sortIndicator('status') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('cancel_at_period_end') }" @click="toggleSort('cancel_at_period_end')">
                    <span>Cancelación</span>
                    <span class="sort-head-indicator">{{ sortIndicator('cancel_at_period_end') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-head-btn" :class="{ 'sort-head-btn--active': isSortActive('canceled_at') }" @click="toggleSort('canceled_at')">
                    <span>Cancelado el</span>
                    <span class="sort-head-indicator">{{ sortIndicator('canceled_at') }}</span>
                  </button>
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!isLoading && !loadError && !rows.length">
                <td colspan="7" class="empty-row">
                  Todavía no encontramos suscripciones para mostrar.
                </td>
              </tr>
              <tr
                v-for="item in rows"
                :key="item.id"
                :class="{ 'row-selected': item.id === selectedId }">
                <td>
                  <button
                    type="button"
                    class="cell-ellipsis-btn cell-identity-btn"
                    :title="`#${item.id}`"
                    @click="showCellPreview(`#${item.id}`)">
                    <span class="subscription-avatar" aria-hidden="true">S</span>
                    <span class="subscription-identity">
                      <strong>#{{ item.id }}</strong>
                    </span>
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    class="cell-ellipsis-btn"
                    :title="formatCycleStart(item)"
                    @click="showCellPreview(formatCycleStart(item))">
                    {{ formatCycleStart(item) }}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    class="cell-ellipsis-btn"
                    :title="formatCycleEnd(item)"
                    @click="showCellPreview(formatCycleEnd(item))">
                    {{ formatCycleEnd(item) }}
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
                    :title="formatCancelLabel(item)"
                    @click="showCellPreview(formatCancelLabel(item))">
                    {{ formatCancelLabel(item) }}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    class="cell-ellipsis-btn"
                    :title="formatDateTime(item.canceled_at)"
                    @click="showCellPreview(formatDateTime(item.canceled_at))">
                    {{ formatDateTime(item.canceled_at) }}
                  </button>
                </td>
                <td class="actions-cell">
                  <button
                    type="button"
                    class="table-icon-btn"
                    title="Ver detalles"
                    :aria-label="`Ver detalles de la suscripción ${item.id}`"
                    @click.stop="openDetails(item)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="table-icon-btn table-icon-btn--danger"
                    title="Cancelar suscripción"
                    :aria-label="`Cancelar la suscripción ${item.id}`"
                    :disabled="!canCancelSubscription(item) || cancelingId === item.id"
                    @click.stop="cancelSubscription(item)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12" />
                      <path d="M18 6 6 18" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="detail-panel" :aria-hidden="!selectedSubscription">
        <article class="bo-card detail-card">
          <header class="detail-head">
            <div>
              <p class="client-kicker">Detalle</p>
              <h2>{{ selectedSubscription ? `Suscripción #${selectedSubscription.id}` : 'Sin selección' }}</h2>
            </div>
            <button
              type="button"
              class="detail-close"
              aria-label="Cerrar detalle"
              title="Cerrar"
              @click="closeDetails">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div v-if="selectedSubscription" class="detail-list">
            <div class="detail-row">
              <span>ID</span>
              <strong>#{{ selectedSubscription.id }}</strong>
            </div>
            <div class="detail-row">
              <span>Inicio del ciclo</span>
              <strong>{{ formatCycleStart(selectedSubscription) }}</strong>
            </div>
            <div class="detail-row">
              <span>Próxima renovación</span>
              <strong>{{ formatCycleEnd(selectedSubscription) }}</strong>
            </div>
            <div class="detail-row">
              <span>Estado</span>
              <strong>{{ formatStatusLabel(selectedSubscription.status, 'Sin estado') }}</strong>
            </div>
            <div class="detail-row">
              <span>Cancelación</span>
              <strong>{{ formatCancelLabel(selectedSubscription) }}</strong>
            </div>
            <div class="detail-row">
              <span>Cancelado el</span>
              <strong>{{ formatDateTime(selectedSubscription.canceled_at) }}</strong>
            </div>
            <div class="detail-row">
              <span>ID suscripción proveedor</span>
              <strong>{{ selectedSubscription.provider_subscription_id || '-' }}</strong>
            </div>
            <div class="detail-row">
              <span>ID cliente proveedor</span>
              <strong>{{ selectedSubscription.provider_customer_id || '-' }}</strong>
            </div>
          </div>
        </article>
      </aside>
    </section>

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
  min-width: 0;
  overflow-x: hidden;
}

.client-page-head,
.filters-card,
.table-card,
.pagination-card,
.stat-card,
.detail-card {
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
  min-width: 0;
  max-width: 100%;
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
  font-size: 1.2rem;
  color: #1f1442;
  line-height: 1.2;
}

.filters-card {
  display: grid;
  gap: 0;
  width: 100%;
  max-width: 100%;
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

.refresh-icon-btn,
.table-icon-btn,
.detail-close {
  border: 1px solid #d7cce8;
  background: #fff;
  color: #4f2d81;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.refresh-icon-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
}

.refresh-icon-btn svg {
  width: 16px;
  height: 16px;
}

.refresh-icon-btn:hover,
.refresh-icon-btn:focus-visible,
.table-icon-btn:hover,
.table-icon-btn:focus-visible,
.detail-close:hover,
.detail-close:focus-visible {
  background: #f6f2ff;
  border-color: #cdbcf2;
}

.refresh-icon-btn:disabled,
.table-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.refresh-icon-btn .is-spinning {
  animation: spin-refresh 0.8s linear infinite;
}

@keyframes spin-refresh {
  to { transform: rotate(360deg); }
}

.subscriptions-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 0fr;
  gap: 0;
  align-items: start;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  transition: grid-template-columns 0.28s ease, gap 0.28s ease;
}

.subscriptions-shell--open {
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.88fr);
  gap: 14px;
}

.table-card,
.detail-panel {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.table-card {
  overflow: hidden;
}

.detail-panel {
  overflow: hidden;
}

.detail-card {
  opacity: 0;
  transform: translateX(16px);
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.subscriptions-shell--open .detail-card {
  opacity: 1;
  transform: translateX(0);
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.detail-head h2 {
  margin: 0;
  color: #1f1442;
  font-size: 1.05rem;
}

.detail-close {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
}

.detail-close svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.detail-list {
  display: grid;
  gap: 8px;
}

.detail-row {
  display: grid;
  gap: 3px;
  padding: 10px 11px;
  border-radius: 12px;
  border: 1px solid rgba(111, 57, 187, 0.16);
  background: rgba(250, 247, 255, 0.82);
}

.detail-row span {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.68);
  font-weight: 700;
}

.detail-row strong {
  color: #1f1442;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  width: max(100%, 1040px);
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
  min-width: 128px;
}

th:nth-child(2),
td:nth-child(2) {
  min-width: 180px;
}

th:nth-child(3),
td:nth-child(3) {
  min-width: 190px;
}

th:nth-child(4),
td:nth-child(4) {
  min-width: 140px;
}

th:nth-child(5),
td:nth-child(5) {
  min-width: 180px;
}

th:nth-child(6),
td:nth-child(6) {
  min-width: 150px;
}

th:nth-child(7),
td:nth-child(7) {
  min-width: 96px;
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover td {
  background: rgba(247, 241, 255, 0.72);
}

tbody tr.row-selected td {
  background: rgba(238, 229, 255, 0.84);
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

.subscription-avatar {
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

.subscription-identity {
  display: grid;
  min-width: 0;
}

.subscription-identity strong {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.status-pill--info {
  color: #1d4ed8;
  background: rgba(239, 246, 255, 0.96);
  border-color: rgba(59, 130, 246, 0.22);
}

.actions-cell {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.table-icon-btn {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 10px;
}

.table-icon-btn svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
}

.table-icon-btn--danger {
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.24);
  background: rgba(255, 241, 242, 0.86);
}

.table-icon-btn--danger:hover,
.table-icon-btn--danger:focus-visible {
  background: rgba(255, 228, 230, 0.96);
  border-color: rgba(225, 29, 72, 0.34);
}

.empty-row {
  text-align: center;
  color: #6a5a84;
  padding: 1.25rem 0.8rem;
}

.pagination-card {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
  .subscriptions-shell,
  .subscriptions-shell--open {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .detail-card {
    opacity: 1;
    transform: none;
  }

  .detail-panel[aria-hidden='true'] {
    display: none;
  }

  table {
    width: max(100%, 1040px);
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
    overflow-x: hidden;
  }

  .client-page-head {
    flex-direction: column;
  }

  .filters-row {
    grid-template-columns: 1fr;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
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
    width: 100%;
    max-width: 100%;
    white-space: normal;
  }

  .filters-actions {
    width: 100%;
    justify-content: space-between;
    justify-self: stretch;
    margin-left: 0;
    grid-column: auto;
  }

  .table-wrap {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
  }

  table {
    width: max-content;
    min-width: 1040px;
    table-layout: auto;
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
  .stat-card,
  .detail-card {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-row {
    grid-template-columns: 1fr;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
  }

  .filters-actions {
    width: 100%;
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
    min-width: 1020px;
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

  .pagination-label {
    display: none;
  }

  .pagination-arrow {
    font-size: 1rem;
    line-height: 1;
  }

  .pagination-summary {
    font-size: 0.8rem;
  }

  .pagination-pages {
    max-width: 100%;
    justify-content: center;
  }

  .cell-ellipsis-btn {
    cursor: pointer;
  }

  .subscription-avatar {
    width: 26px;
    height: 26px;
    font-size: 0.68rem;
  }
}

@media (max-width: 560px) {
  .pagination-layout {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 0.5rem;
    align-items: start;
  }

  .pagination-pages {
    width: 100%;
    justify-content: flex-start;
    scrollbar-width: none;
  }

  .pagination-pages::-webkit-scrollbar {
    display: none;
  }
}
</style>

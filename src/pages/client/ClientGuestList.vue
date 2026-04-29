<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import {
  getTenantInvitationRsvpResponses,
  type TenantInvitationRsvpResponse,
} from '@/services/tenantInvitations'

type ConfirmedGuestRow = {
  id: number
  firstName: string
  lastName: string
  dietaryRestrictions: string
  confirmedAt: string | null
}

type SortField = 'id' | 'name' | 'last_name' | 'confirmed_at'
type SortDirection = 'asc' | 'desc'

const session = useSessionStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const rows = ref<ConfirmedGuestRow[]>([])

const searchInput = ref('')
const searchQuery = ref('')
const sortBy = ref<SortField>('id')
const sortDir = ref<SortDirection>('asc')

const currentPage = ref(1)
const perPage = 10
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: perPage,
  total: 0,
})

const summary = ref({
  total_confirmed: 0,
  total_invitations: 0,
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

const toRow = (item: TenantInvitationRsvpResponse): ConfirmedGuestRow => ({
  id: Number(item.id ?? 0),
  firstName: String(item.first_name ?? '').trim(),
  lastName: String(item.last_name ?? '').trim(),
  dietaryRestrictions: String(item.dietary_restrictions ?? '').trim() || 'Sin restricciones',
  confirmedAt: item.confirmed_at ?? null,
})

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const normalizedPlanName = computed(() =>
  String(session.user?.client_plan?.plan?.name ?? '')
    .trim()
    .toLowerCase(),
)

const planLabel = computed(() => {
  if (normalizedPlanName.value === 'pro') return 'Pro'
  if (normalizedPlanName.value === 'planner') return 'Planner'
  return 'Basic'
})

const canExportExcel = computed(() => ['pro', 'planner'].includes(normalizedPlanName.value))

const toggleSort = (field: SortField) => {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortBy.value = field
  sortDir.value = 'asc'
}

const isSortActive = (field: SortField) => sortBy.value === field

const sortIndicator = (field: SortField) => {
  if (sortBy.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const loadGuests = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const result = await getTenantInvitationRsvpResponses({
      page: currentPage.value,
      perPage,
      search: searchQuery.value,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    })

    rows.value = result.items.map(toRow)
    summary.value = {
      total_confirmed: result.summary.total_confirmed,
      total_invitations: result.summary.total_invitations,
    }
    pagination.value = {
      current_page: result.pagination.current_page,
      last_page: result.pagination.last_page,
      per_page: result.pagination.per_page,
      total: result.pagination.total,
    }
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar la lista de invitados confirmados.'
  } finally {
    isLoading.value = false
  }
}

const resetToFirstPageOrLoad = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  void loadGuests()
}

const goToPage = (page: number) => {
  const targetPage = Math.min(totalPages.value, Math.max(1, page))
  if (targetPage === currentPage.value) return
  currentPage.value = targetPage
}

const goToPrevPage = () => {
  goToPage(currentPage.value - 1)
}

const goToNextPage = () => {
  goToPage(currentPage.value + 1)
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

watch(currentPage, () => {
  void loadGuests()
}, { immediate: true })

watch([sortBy, sortDir], () => {
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
  <section class="client-page container" aria-labelledby="client-guests-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Confirmaciones RSVP</p>
        <h1 id="client-guests-title">Lista de invitados confirmados</h1>
        <p class="client-lead">
          Revisa quién confirmó asistencia y sus restricciones alimenticias.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton type="button" variant="ghost" class="export-btn export-btn--pdf">
          Exportar PDF
        </BaseButton>
        <BaseButton
          v-if="canExportExcel"
          type="button"
          variant="ghost"
          class="export-btn export-btn--excel">
          Exportar Excel
        </BaseButton>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen">
      <article class="bo-card stat-card">
        <span>Total confirmados</span>
        <strong>{{ summary.total_confirmed }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Plan actual</span>
        <strong>{{ planLabel }}</strong>
      </article>
    </section>

    <article class="bo-card filters-card">
      <div class="filters-row">
        <label class="field field-search">
          <span>Buscar invitado</span>
          <input
            v-model="searchInput"
            type="search"
            placeholder="Buscar por nombre o apellido" />
        </label>
      </div>
    </article>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando invitados confirmados...</p>

    <article class="bo-card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Tabla de invitados confirmados</caption>
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('name') }"
                  title="Nombre"
                  @click="toggleSort('name')">
                  <span>Nombre</span>
                  <span class="sort-head-indicator">{{ sortIndicator('name') }}</span>
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('last_name') }"
                  title="Apellido"
                  @click="toggleSort('last_name')">
                  <span>Apellido</span>
                  <span class="sort-head-indicator">{{ sortIndicator('last_name') }}</span>
                </button>
              </th>
              <th title="Restricción alimenticia">Restricción alimenticia</th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('confirmed_at') }"
                  title="Fecha"
                  @click="toggleSort('confirmed_at')">
                  <span>Fecha</span>
                  <span class="sort-head-indicator">{{ sortIndicator('confirmed_at') }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && !loadError && !rows.length">
              <td colspan="4" class="empty-row">
                Todavía no se encontraron invitados confirmados.
              </td>
            </tr>
            <tr v-for="guest in rows" :key="guest.id">
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="guest.firstName || '—'"
                  @click="showCellPreview(guest.firstName || '—')">
                  {{ guest.firstName || '—' }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="guest.lastName || '—'"
                  @click="showCellPreview(guest.lastName || '—')">
                  {{ guest.lastName || '—' }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="guest.dietaryRestrictions"
                  @click="showCellPreview(guest.dietaryRestrictions)">
                  {{ guest.dietaryRestrictions }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatDateTime(guest.confirmedAt)"
                  @click="showCellPreview(formatDateTime(guest.confirmedAt))">
                  {{ formatDateTime(guest.confirmedAt) }}
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
            Página {{ currentPage }} de {{ totalPages }} · {{ pagination.total }} resultados
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
.stat-card,
.pagination-card {
  padding: 20px;
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

.client-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

:deep(.export-btn) {
  min-height: 42px;
  padding-inline: 1rem;
  border-radius: 12px;
  font-weight: 700;
  white-space: nowrap;
  border-color: transparent;
  color: #fff;
  box-shadow: 0 12px 26px rgba(19, 14, 36, 0.16);
}

:deep(.export-btn:hover) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

:deep(.export-btn--pdf) {
  background: linear-gradient(120deg, #cf2f3f, #ec4f5f);
}

:deep(.export-btn--excel) {
  background: linear-gradient(120deg, #117744, #1fa765);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  font-size: 1.35rem;
  color: #1f1442;
}

.filters-card {
  display: grid;
  gap: 0;
  width: 100%;
}

.filters-row {
  display: grid;
  grid-template-columns: minmax(220px, 320px);
  gap: 12px;
}

.field-search {
  width: 100%;
}

.field {
  display: grid;
  gap: 0.35rem;
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
}

.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
}

.table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(111, 57, 187, 0.35) rgba(234, 225, 247, 0.65);
}

table {
  width: max(100%, 820px);
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 12px 12px;
  border-bottom: 1px solid #eee5fb;
  font-size: 0.92rem;
  color: #2b2242;
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

.empty-row {
  text-align: center;
  color: #6a5a84;
  padding: 1.25rem 0.8rem;
}

.pagination-card {
  display: block;
  width: 100%;
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

.cell-ellipsis-btn:focus-visible {
  outline: 2px solid rgba(79, 45, 129, 0.28);
  outline-offset: 2px;
  border-radius: 6px;
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

@media (max-width: 980px) {
  table {
    width: max(100%, 780px);
  }

  th,
  td {
    padding: 11px 10px;
    font-size: 0.86rem;
  }
}

@media (max-width: 920px) {
  .client-page-head {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-row {
    grid-template-columns: minmax(200px, 280px);
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
  .filters-row {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .field-search {
    width: 100%;
  }

  .field input,
  .field select {
    width: 100%;
    min-height: 44px;
  }

  .table-wrap {
    overflow-x: visible;
    scrollbar-width: auto;
  }

  table {
    width: 100%;
    table-layout: fixed;
  }

  th,
  td {
    padding: 10px 8px;
    font-size: 0.8rem;
    vertical-align: top;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
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
}

@media (max-width: 560px) {
  .pagination-layout {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 0.5rem;
    align-items: start;
  }

  .pagination-center {
    gap: 0.35rem;
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

@media (max-width: 520px) {
  .client-page-head,
  .filters-card,
  .table-card,
  .stat-card,
  .pagination-card {
    padding: 16px;
  }

  .field input,
  .field select {
    min-height: 46px;
  }

  .page-btn {
    min-width: 34px;
    height: 34px;
  }
}
</style>

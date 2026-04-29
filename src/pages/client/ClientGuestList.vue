<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import {
  exportTenantInvitationRsvpPdf,
  getTenantInvitationRsvpResponses,
  type TenantInvitationRsvpResponse,
} from '@/services/tenantInvitations'
import { notifyError, notifySuccess } from '@/utils/toast'

type ConfirmedGuestRow = {
  id: number
  firstName: string
  lastName: string
  invitationTitle: string
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
const perPageOptions = [10, 15, 25, 50]
const perPage = ref(10)

const currentPage = ref(1)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: perPage.value,
  total: 0,
})

const summary = ref({
  total_confirmed: 0,
  total_invitations: 0,
})
const showExportModal = ref(false)
const isExporting = ref(false)
const exportScope = ref<'all' | 'confirmed'>('confirmed')
const exportSortField = ref<'last_name' | 'first_name'>('last_name')
const exportLastNameOrder = ref<'asc' | 'desc'>('asc')
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
  invitationTitle: String(item.invitation_title ?? 'Invitación').trim() || 'Invitación',
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
const isBasicPlan = computed(() => normalizedPlanName.value === 'basic' || normalizedPlanName.value === '')
const visibleRowsCount = computed(() => rows.value.length)

const latestConfirmedAtLabel = computed(() => {
  let latestTimestamp = 0
  let latestIso: string | null = null

  for (const row of rows.value) {
    if (!row.confirmedAt) continue
    const timestamp = new Date(row.confirmedAt).getTime()
    if (!Number.isFinite(timestamp)) continue
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp
      latestIso = row.confirmedAt
    }
  }

  return latestIso ? formatDateTime(latestIso) : 'Sin registros recientes'
})

const activeSortLabel = computed(() => {
  if (sortBy.value === 'name') {
    return `Nombre ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  }
  if (sortBy.value === 'last_name') {
    return `Apellido ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  }
  if (sortBy.value === 'confirmed_at') {
    return sortDir.value === 'asc'
      ? 'Fecha: más antiguas primero'
      : 'Fecha: más recientes primero'
  }
  return sortDir.value === 'asc'
    ? 'Confirmación: primeras respuestas primero'
    : 'Confirmación: últimas respuestas primero'
})

const guestDisplayName = (guest: ConfirmedGuestRow) => {
  const full = `${guest.firstName} ${guest.lastName}`.trim()
  return full !== '' ? full : 'Invitado confirmado'
}

const guestInitials = (guest: ConfirmedGuestRow) => {
  const letters = `${guest.firstName} ${guest.lastName}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('')
  return letters || 'IC'
}

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
      perPage: perPage.value,
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

const refreshGuests = () => {
  void loadGuests()
}

const openExportModal = () => {
  if (isBasicPlan.value) {
    exportScope.value = 'confirmed'
  }
  showExportModal.value = true
}

const closeExportModal = () => {
  if (isExporting.value) return
  showExportModal.value = false
}

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  if (typeof window === 'undefined') return

  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

const exportGuestsPdf = async () => {
  isExporting.value = true
  try {
    const response = await exportTenantInvitationRsvpPdf({
      scope: exportScope.value,
      sortField: exportSortField.value,
      lastNameOrder: exportLastNameOrder.value,
    })

    triggerBlobDownload(response.blob, response.fileName)
    closeExportModal()
    notifySuccess('Tu archivo se descargó correctamente.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos exportar el PDF en este momento.')
  } finally {
    isExporting.value = false
  }
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

const handleWindowHotkeys = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showExportModal.value) {
    event.preventDefault()
    closeExportModal()
  }
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

watch(perPage, () => {
  resetToFirstPageOrLoad()
})

watch(showExportModal, (isOpen) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWindowHotkeys)
  }
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
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWindowHotkeys)
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
        <span class="plan-pill">Plan {{ planLabel }}</span>
        <BaseButton
          type="button"
          variant="ghost"
          class="export-btn export-btn--pdf"
          @click="openExportModal">
          Exportar
        </BaseButton>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen">
      <article class="bo-card stat-card">
        <span>Total confirmados</span>
        <strong>{{ summary.total_confirmed }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Invitaciones con confirmación</span>
        <strong>{{ summary.total_invitations }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Mostrando en esta página</span>
        <strong>{{ visibleRowsCount }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Última confirmación visible</span>
        <strong>{{ latestConfirmedAtLabel }}</strong>
      </article>
    </section>

    <article class="bo-card filters-card">
      <div class="filters-row">
        <label class="field field-search">
          <span>Buscar invitado</span>
          <div class="search-shell">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              v-model="searchInput"
              type="search"
              placeholder="Buscar por nombre o apellido" />
          </div>
        </label>
        <p class="filters-helper">{{ activeSortLabel }}</p>
        <div class="filters-actions">
          <div class="per-page-control">
            <select id="guest-list-per-page" aria-label="Cantidad de filas" v-model.number="perPage" :disabled="isLoading">
              <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <button
            type="button"
            class="refresh-icon-btn"
            :disabled="isLoading"
            aria-label="Recargar datos"
            title="Recargar datos"
            @click="refreshGuests">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" :class="{ 'is-spinning': isLoading }" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
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
                  class="cell-ellipsis-btn cell-identity-btn"
                  :title="guestDisplayName(guest)"
                  @click="showCellPreview(`${guestDisplayName(guest)} · ${guest.invitationTitle}`)">
                  <span class="guest-avatar" aria-hidden="true">{{ guestInitials(guest) }}</span>
                  <span class="guest-identity">
                    <strong>{{ guest.firstName || '—' }}</strong>
                    <small>{{ guest.invitationTitle }}</small>
                  </span>
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
                <span
                  class="diet-pill"
                  :class="{ 'diet-pill--clean': guest.dietaryRestrictions === 'Sin restricciones' }"
                  :title="guest.dietaryRestrictions"
                  @click="showCellPreview(guest.dietaryRestrictions)">
                  {{ guest.dietaryRestrictions }}
                </span>
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

    <Transition name="export-modal-fade">
      <div
        v-if="showExportModal"
        class="export-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        @click.self="closeExportModal">
        <article class="export-modal-card">
          <header class="export-modal-head">
            <div>
              <p class="client-kicker">Exportación PDF</p>
              <h2 id="export-modal-title">Configura tu descarga</h2>
            </div>
            <button
              type="button"
              class="export-modal-close"
              aria-label="Cerrar"
              @click="closeExportModal">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div class="export-modal-body">
            <section class="export-option-group" aria-label="Tipo de invitados">
              <p class="export-option-title">Invitados</p>
              <template v-if="isBasicPlan">
                <div class="export-chip-fixed" role="status" aria-live="polite">
                  Invitados confirmados
                </div>
              </template>
              <template v-else>
                <label class="export-radio">
                  <input v-model="exportScope" type="radio" value="all" />
                  <span>Todos los invitados</span>
                </label>
                <label class="export-radio">
                  <input v-model="exportScope" type="radio" value="confirmed" />
                  <span>Invitados confirmados</span>
                </label>
              </template>
            </section>

            <section class="export-option-group" aria-label="Orden alfabético">
              <p class="export-option-title">Orden alfabético</p>
              <label class="export-radio">
                <input v-model="exportSortField" type="radio" value="last_name" />
                <span>Ordenar por apellido</span>
              </label>
              <label class="export-radio">
                <input v-model="exportSortField" type="radio" value="first_name" />
                <span>Ordenar por nombre</span>
              </label>
              <label class="export-radio">
                <input v-model="exportLastNameOrder" type="radio" value="asc" />
                <span>A - Z</span>
              </label>
              <label class="export-radio">
                <input v-model="exportLastNameOrder" type="radio" value="desc" />
                <span>Z - A</span>
              </label>
            </section>
          </div>

          <footer class="export-modal-actions">
            <BaseButton type="button" variant="ghost" :disabled="isExporting" @click="closeExportModal">
              Cancelar
            </BaseButton>
            <BaseButton type="button" variant="primary" :disabled="isExporting" @click="exportGuestsPdf">
              {{ isExporting ? 'Exportando...' : 'Exportar' }}
            </BaseButton>
          </footer>
        </article>
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

.plan-pill {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(111, 57, 187, 0.2);
  background: rgba(246, 241, 255, 0.92);
  color: #4a2f7c;
  font-weight: 700;
  font-size: 0.84rem;
  letter-spacing: 0.02em;
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
  font-size: 1.35rem;
  color: #1f1442;
  line-height: 1.2;
}

.filters-card {
  display: grid;
  gap: 0;
  width: 100%;
}

.filters-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  align-items: end;
  gap: 12px;
  justify-content: space-between;
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
  border: 0;
  background: transparent;
  min-height: 42px;
  padding: 0;
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
}

.search-shell svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: #7a66a5;
  stroke-width: 1.9;
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

.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
}

.search-shell:focus-within {
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

.guest-avatar {
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

.guest-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.guest-identity strong {
  font-weight: 700;
}

.guest-identity small {
  font-size: 0.76rem;
  color: #7a6997;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diet-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(217, 119, 6, 0.25);
  background: rgba(255, 247, 237, 0.95);
  color: #9a4311;
  font-size: 0.81rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diet-pill--clean {
  border-color: rgba(22, 163, 74, 0.24);
  background: rgba(240, 253, 244, 0.95);
  color: #166534;
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

.export-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 145;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(12, 16, 31, 0.62);
  backdrop-filter: blur(7px);
}

.export-modal-card {
  width: min(560px, 100%);
  border-radius: 18px;
  border: 1px solid rgba(188, 171, 222, 0.42);
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(213, 182, 255, 0.25), transparent 62%),
    linear-gradient(180deg, #ffffff, #f8f7ff);
  box-shadow: 0 34px 70px rgba(14, 20, 36, 0.42);
  overflow: hidden;
}

.export-modal-head {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(148, 132, 185, 0.24);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.export-modal-head h2 {
  margin: 0;
  font-size: 1.24rem;
  color: #1f133f;
}

.export-modal-close {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(123, 108, 160, 0.34);
  background: rgba(255, 255, 255, 0.92);
  color: #1f133f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.export-modal-close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.export-modal-body {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.export-option-group {
  border: 1px solid rgba(155, 126, 214, 0.22);
  background: rgba(255, 255, 255, 0.82);
  border-radius: 14px;
  padding: 12px;
  display: grid;
  gap: 8px;
  align-content: start;
  align-items: start;
}

.export-chip-fixed {
  border-radius: 999px;
  border: 1px solid rgba(111, 57, 187, 0.22);
  background: rgba(245, 238, 255, 0.95);
  color: #4b2a80;
  font-weight: 700;
  font-size: 0.86rem;
  min-height: 40px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  line-height: 1;
  width: fit-content;
  align-self: start;
  justify-self: start;
  box-shadow: 0 8px 18px rgba(90, 57, 153, 0.1);
}

.export-option-title {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #5a3d8d;
}

.export-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  border: 1px solid rgba(155, 126, 214, 0.18);
  background: rgba(250, 247, 255, 0.92);
  padding: 9px 10px;
  color: #2f1e4f;
  font-weight: 600;
}

.export-radio input {
  accent-color: #6f39bb;
}

.export-modal-actions {
  padding: 14px 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  border-top: 1px solid rgba(148, 132, 185, 0.24);
}

.export-modal-fade-enter-active,
.export-modal-fade-leave-active {
  transition: opacity 0.24s ease;
}

.export-modal-fade-enter-from,
.export-modal-fade-leave-to {
  opacity: 0;
}

.export-modal-fade-enter-active .export-modal-card,
.export-modal-fade-leave-active .export-modal-card {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.export-modal-fade-enter-from .export-modal-card,
.export-modal-fade-leave-to .export-modal-card {
  transform: translateY(14px) scale(0.98);
  opacity: 0.9;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters-row {
    grid-template-columns: 1fr;
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

  .guest-avatar {
    width: 26px;
    height: 26px;
    font-size: 0.68rem;
  }

  .guest-identity small {
    font-size: 0.72rem;
  }

  .diet-pill {
    max-width: 100%;
    font-size: 0.76rem;
  }

  .export-modal-body {
    grid-template-columns: 1fr;
  }

  .export-modal-actions {
    flex-direction: column-reverse;
  }

  .export-modal-actions :deep(.btn) {
    width: 100%;
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

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

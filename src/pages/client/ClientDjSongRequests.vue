<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import {
  createTenantInvitationDjSongRequest,
  deleteTenantInvitationDjSongRequest,
  exportTenantInvitationDjSongRequestsPdf,
  exportTenantInvitationDjSongRequestsXlsx,
  getTenantInvitationDjSongRequests,
  listTenantInvitations,
  updateTenantInvitationDjSongRequest,
  type TenantInvitationDjSongRequest,
  type TenantInvitationItem,
} from '@/services/tenantInvitations'
import { notifyError, notifySuccess } from '@/utils/toast'

type SortField = 'song_name' | 'created_at'
type SortDirection = 'asc' | 'desc'
type LinkFilter = 'all' | 'with_link' | 'without_link'
type ExportFormat = 'pdf' | 'xlsx'
const INVITATION_SELECT_RESULT_LIMIT = 25

const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const isExportingPdf = ref(false)
const isExportingXlsx = ref(false)
const loadError = ref<string | null>(null)
const rows = ref<TenantInvitationDjSongRequest[]>([])
const invitations = ref<TenantInvitationItem[]>([])
const invitationTitleById = ref<Record<string, string>>({})
const searchInput = ref('')
const searchQuery = ref('')
const selectedInvitationId = ref('')
const invitationFilterOpen = ref(false)
const invitationFilterSearch = ref('')
const linkFilter = ref<LinkFilter>('all')
const sortBy = ref<SortField>('created_at')
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
const summary = ref({
  enabled: false,
  total_requests: 0,
  total_invitations: 0,
})
const modalOpen = ref(false)
const showExportModal = ref(false)
const exportFormat = ref<ExportFormat>('pdf')
const exportInvitationId = ref('')
const exportLinkFilter = ref<LinkFilter>('all')
const exportSortBy = ref<SortField>('created_at')
const exportSortDir = ref<SortDirection>('desc')
const editingSong = ref<TenantInvitationDjSongRequest | null>(null)
const form = ref({
  invitationId: '',
  songName: '',
  referenceUrl: '',
})
const cellPreview = ref({
  visible: false,
  text: '',
})
const invitationSelectRef = ref<HTMLElement | null>(null)

const session = useSessionStore()
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let invitationSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let cellPreviewTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.max(1, pagination.value.last_page || 1))
const canGoPrev = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const visibleRowsCount = computed(() => rows.value.length)
const modalTitle = computed(() => editingSong.value ? 'Editar canción sugerida' : 'Añadir canción sugerida')
const exportModalTitle = computed(() => exportFormat.value === 'pdf' ? 'Exportar PDF' : 'Exportar XLSX')
const exportButtonLabel = computed(() => {
  if (exportFormat.value === 'pdf') {
    return isExportingPdf.value ? 'Exportando PDF...' : 'Exportar PDF'
  }

  return isExportingXlsx.value ? 'Exportando XLSX...' : 'Exportar XLSX'
})
const isExporting = computed(() => isExportingPdf.value || isExportingXlsx.value)
const canSave = computed(() =>
  !isSaving.value
  && form.value.songName.trim().length >= 2
  && (editingSong.value !== null || form.value.invitationId.trim() !== ''),
)

const pageItems = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const activeSortLabel = computed(() => {
  if (sortBy.value === 'song_name') {
    return `Canción ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  }
  return sortDir.value === 'asc'
    ? 'Fecha: más antiguas primero'
    : 'Fecha: más recientes primero'
})

const activeLinkFilterLabel = computed(() => {
  if (linkFilter.value === 'with_link') return 'Con enlace'
  if (linkFilter.value === 'without_link') return 'Sin enlace'
  return 'Todos los enlaces'
})

const latestVisibleDateLabel = computed(() => {
  let latestTimestamp = 0
  let latestIso: string | null = null

  for (const row of rows.value) {
    const rawDate = row.created_at || row.suggested_at
    if (!rawDate) continue
    const timestamp = new Date(rawDate).getTime()
    if (!Number.isFinite(timestamp)) continue
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp
      latestIso = rawDate
    }
  }

  return latestIso ? formatDateTime(latestIso) : 'Sin registros recientes'
})

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

const selectedInvitationLabel = computed(() => {
  if (!selectedInvitationId.value) return 'Todas'
  return invitationTitleById.value[selectedInvitationId.value] ?? 'Invitación seleccionada'
})

const filteredInvitations = computed(() => invitations.value)

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

const formatReference = (value: string | null) => {
  if (!value) return 'Sin enlace'
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

const isSortActive = (field: SortField) => sortBy.value === field

const toggleSort = (field: SortField) => {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortBy.value = field
  sortDir.value = field === 'created_at' ? 'desc' : 'asc'
}

const sortIndicator = (field: SortField) => {
  if (sortBy.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
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

const loadInvitations = async (query = '') => {
  try {
    const result = await listTenantInvitations({
      page: 1,
      perPage: INVITATION_SELECT_RESULT_LIMIT,
      search: query.trim() || undefined,
      orderField: 'updated_at',
      orderDirection: 'desc',
    })
    invitations.value = result.list.filter((item) => Number(item.id ?? 0) > 0)
    invitationTitleById.value = {
      ...invitationTitleById.value,
      ...Object.fromEntries(invitations.value.map((item) => [
        String(item.id ?? ''),
        String(item.title ?? '').trim() || 'Invitación sin título',
      ]).filter(([id]) => id !== '')),
    }
  } catch {
    invitations.value = []
  }
}

const loadSongs = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const result = await getTenantInvitationDjSongRequests({
      page: currentPage.value,
      perPage: perPage.value,
      invitation_id: selectedInvitationId.value || undefined,
      search: searchQuery.value,
      linkStatus: linkFilter.value,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    })

    rows.value = result.items
    summary.value = result.summary
    pagination.value = result.pagination
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar las canciones sugeridas.'
  } finally {
    isLoading.value = false
  }
}

const resetToFirstPageOrLoad = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  void loadSongs()
}

const goToPage = (page: number) => {
  const target = Math.min(totalPages.value, Math.max(1, page))
  if (target === currentPage.value) return
  currentPage.value = target
}

const goToPrevPage = () => {
  goToPage(currentPage.value - 1)
}

const goToNextPage = () => {
  goToPage(currentPage.value + 1)
}

const refreshSongs = () => {
  void loadSongs()
}

const clearSongFilters = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
    invitationSearchDebounceTimer = null
  }
  searchInput.value = ''
  searchQuery.value = ''
  selectedInvitationId.value = ''
  invitationFilterSearch.value = ''
  invitationFilterOpen.value = false
  linkFilter.value = 'all'
  resetToFirstPageOrLoad()
}

const currentExportParams = () => ({
  invitation_id: exportInvitationId.value || undefined,
  search: searchQuery.value,
  linkStatus: exportLinkFilter.value,
  sortBy: exportSortBy.value,
  sortDir: exportSortDir.value,
})

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

const openExportModal = (format: ExportFormat) => {
  exportFormat.value = format
  exportInvitationId.value = selectedInvitationId.value
  exportLinkFilter.value = linkFilter.value
  exportSortBy.value = sortBy.value
  exportSortDir.value = sortDir.value
  showExportModal.value = true
}

const closeExportModal = () => {
  if (isExporting.value) return
  showExportModal.value = false
}

const exportSongsPdf = async () => {
  if (isExportingPdf.value) return

  isExportingPdf.value = true
  try {
    const response = await exportTenantInvitationDjSongRequestsPdf(currentExportParams())
    triggerBlobDownload(response.blob, response.fileName)
    closeExportModal()
    notifySuccess('Tu PDF se descargó correctamente.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos exportar el PDF.')
  } finally {
    isExportingPdf.value = false
  }
}

const exportSongsXlsx = async () => {
  if (isExportingXlsx.value) return

  isExportingXlsx.value = true
  try {
    const response = await exportTenantInvitationDjSongRequestsXlsx(currentExportParams())
    triggerBlobDownload(response.blob, response.fileName)
    closeExportModal()
    notifySuccess('Tu XLSX se descargó correctamente.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos exportar el XLSX.')
  } finally {
    isExportingXlsx.value = false
  }
}

const exportSongs = () => {
  if (exportFormat.value === 'pdf') {
    void exportSongsPdf()
    return
  }

  void exportSongsXlsx()
}

const toggleInvitationFilter = () => {
  invitationFilterOpen.value = !invitationFilterOpen.value
  if (invitationFilterOpen.value) {
    invitationFilterSearch.value = ''
    void loadInvitations()
  }
}

const selectInvitationFilter = (value: string, title = '') => {
  selectedInvitationId.value = value
  if (value && title) {
    invitationTitleById.value = { ...invitationTitleById.value, [value]: title }
  }
  invitationFilterOpen.value = false
  invitationFilterSearch.value = ''
}

const openCreateModal = () => {
  editingSong.value = null
  form.value = {
    invitationId: selectedInvitationId.value || String(invitations.value[0]?.id ?? ''),
    songName: '',
    referenceUrl: '',
  }
  modalOpen.value = true
}

const openEditModal = (song: TenantInvitationDjSongRequest) => {
  editingSong.value = song
  form.value = {
    invitationId: String(song.invitation_id),
    songName: song.song_name,
    referenceUrl: song.reference_url ?? '',
  }
  modalOpen.value = true
}

const closeModal = () => {
  if (isSaving.value) return
  modalOpen.value = false
}

const saveSong = async () => {
  if (!canSave.value) {
    notifyError('Escribe el nombre de la canción.')
    return
  }

  isSaving.value = true
  try {
    const invitationId = editingSong.value?.invitation_id ?? Number(form.value.invitationId)
    const payload = {
      song_name: form.value.songName.trim(),
      reference_url: form.value.referenceUrl.trim() || null,
    }

    if (editingSong.value) {
      await updateTenantInvitationDjSongRequest(invitationId, editingSong.value.id, payload)
      notifySuccess('Canción actualizada.')
    } else {
      await createTenantInvitationDjSongRequest(invitationId, payload)
      notifySuccess('Canción añadida.')
    }

    closeModal()
    void loadSongs()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos guardar la canción.')
  } finally {
    isSaving.value = false
  }
}

const deleteSong = async (song: TenantInvitationDjSongRequest) => {
  if (isDeleting.value) return
  const confirmed = window.confirm(`¿Eliminar "${song.song_name}"?`)
  if (!confirmed) return

  isDeleting.value = true
  try {
    await deleteTenantInvitationDjSongRequest(song.invitation_id, song.id)
    notifySuccess('Canción eliminada.')
    void loadSongs()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos eliminar la canción.')
  } finally {
    isDeleting.value = false
  }
}

const handleWindowHotkeys = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return

  if (showExportModal.value) {
    event.preventDefault()
    closeExportModal()
    return
  }

  if (modalOpen.value) {
    event.preventDefault()
    closeModal()
    return
  }

  if (invitationFilterOpen.value) {
    event.preventDefault()
    invitationFilterOpen.value = false
  }
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target) return

  if (invitationFilterOpen.value && !invitationSelectRef.value?.contains(target)) {
    invitationFilterOpen.value = false
  }
}

watch([selectedInvitationId, linkFilter, sortBy, sortDir, perPage], resetToFirstPageOrLoad)
watch(currentPage, () => {
  void loadSongs()
})
watch(searchInput, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    searchQuery.value = value.trim()
    resetToFirstPageOrLoad()
  }, 320)
})
watch(invitationFilterSearch, (value) => {
  if (!invitationFilterOpen.value) return
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
  }

  invitationSearchDebounceTimer = setTimeout(() => {
    invitationSearchDebounceTimer = null
    void loadInvitations(value)
  }, 260)
})
watch([modalOpen, showExportModal], ([isSongModalOpen, isExportModalOpen]) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isSongModalOpen || isExportModalOpen ? 'hidden' : ''
})

onMounted(() => {
  void loadInvitations()
  void loadSongs()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWindowHotkeys)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
  }
})

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  if (invitationSearchDebounceTimer) clearTimeout(invitationSearchDebounceTimer)
  if (cellPreviewTimer) clearTimeout(cellPreviewTimer)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWindowHotkeys)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-dj-songs-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Música para la fiesta</p>
        <h1 id="client-dj-songs-title">Canciones sugeridas</h1>
        <p class="client-lead">
          Revisa las canciones que tus invitados quieren escuchar y suma las tuyas.
        </p>
      </div>

      <div class="client-actions">
        <span class="plan-pill">Plan {{ planLabel }}</span>
        <BaseButton
          type="button"
          variant="ghost"
          class="export-btn export-btn--pdf"
          :disabled="isExportingPdf"
          @click="openExportModal('pdf')">
          PDF
        </BaseButton>
        <BaseButton
          type="button"
          variant="ghost"
          class="export-btn export-btn--xlsx"
          :disabled="isExportingXlsx"
          @click="openExportModal('xlsx')">
          XLSX
        </BaseButton>
        <BaseButton
          type="button"
          variant="ghost"
          class="export-btn export-btn--add"
          @click="openCreateModal">
          Añadir canción
        </BaseButton>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen">
      <article class="bo-card stat-card">
        <span>Total sugeridas</span>
        <strong>{{ summary.total_requests }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Invitaciones con canciones</span>
        <strong>{{ summary.total_invitations }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Mostrando en esta página</span>
        <strong>{{ visibleRowsCount }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Última sugerencia visible</span>
        <strong>{{ latestVisibleDateLabel }}</strong>
      </article>
    </section>

    <article class="bo-card filters-card">
      <div class="filters-row filters-row--primary">
        <label class="field field-search">
          <span>Buscar canción</span>
          <div class="search-shell">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              v-model="searchInput"
              type="search"
              placeholder="Buscar por canción o enlace" />
          </div>
        </label>

        <div class="field field-invitation-filter">
          <span>Invitación</span>
          <div ref="invitationSelectRef" class="invitation-select" :class="{ open: invitationFilterOpen }">
            <button
              type="button"
              class="invitation-select__button"
              :aria-expanded="invitationFilterOpen"
              aria-controls="dj-song-invitation-options"
              @click="toggleInvitationFilter">
              <span>{{ selectedInvitationLabel }}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="invitationFilterOpen" id="dj-song-invitation-options" class="invitation-select__menu">
              <input
                v-model="invitationFilterSearch"
                class="invitation-select__search"
                type="search"
                placeholder="Buscar invitación" />
              <button type="button" class="invitation-select__option" :class="{ selected: !selectedInvitationId }" @click="selectInvitationFilter('')">
                Todas
              </button>
              <button
                v-for="invitation in filteredInvitations"
                :key="invitation.id"
                type="button"
                class="invitation-select__option"
                :class="{ selected: String(invitation.id) === selectedInvitationId }"
                @click="selectInvitationFilter(String(invitation.id), String(invitation.title || 'Invitación sin título'))">
                {{ invitation.title || 'Invitación sin título' }}
              </button>
              <p v-if="!filteredInvitations.length" class="invitation-select__empty">No encontramos invitaciones.</p>
              <p v-else-if="filteredInvitations.length >= INVITATION_SELECT_RESULT_LIMIT" class="invitation-select__empty">
                Mostramos hasta {{ INVITATION_SELECT_RESULT_LIMIT }} resultados. Escribe para afinar la búsqueda.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="filters-row filters-row--song-secondary">
        <label class="field field-link-filter">
          <span>Enlaces</span>
          <select v-model="linkFilter" :disabled="isLoading">
            <option value="all">Todos</option>
            <option value="with_link">Con enlace</option>
            <option value="without_link">Sin enlace</option>
          </select>
        </label>

        <p class="filters-helper">
          {{ activeSortLabel }} · {{ activeLinkFilterLabel }} · {{ pagination.total }} resultado{{ pagination.total === 1 ? '' : 's' }}
        </p>

        <div class="filters-actions">
          <button
            type="button"
            class="clear-filter-btn"
            :disabled="isLoading"
            aria-label="Limpiar filtros"
            title="Limpiar filtros"
            @click="clearSongFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div class="per-page-control">
            <select id="dj-songs-per-page" aria-label="Cantidad de filas" v-model.number="perPage" :disabled="isLoading">
              <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <button
            type="button"
            class="refresh-icon-btn"
            :disabled="isLoading"
            aria-label="Recargar datos"
            title="Recargar datos"
            @click="refreshSongs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" :class="{ 'is-spinning': isLoading }" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>
    </article>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando canciones sugeridas...</p>

    <article class="bo-card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Tabla de canciones sugeridas</caption>
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('song_name') }"
                  title="Nombre de la canción"
                  @click="toggleSort('song_name')">
                  <span>Nombre de la canción</span>
                  <span class="sort-head-indicator">{{ sortIndicator('song_name') }}</span>
                </button>
              </th>
              <th title="Invitación">Invitación</th>
              <th title="Enlace de referencia">Enlace de referencia</th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('created_at') }"
                  title="Fecha y hora"
                  @click="toggleSort('created_at')">
                  <span>Fecha y hora</span>
                  <span class="sort-head-indicator">{{ sortIndicator('created_at') }}</span>
                </button>
              </th>
              <th title="Acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && !loadError && !rows.length">
              <td colspan="5" class="empty-row">
                Todavía no hay canciones sugeridas.
              </td>
            </tr>
            <tr v-for="song in rows" :key="song.id">
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="song.song_name"
                  @click="showCellPreview(song.song_name)">
                  {{ song.song_name || '—' }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="song.invitation_title || 'Invitación'"
                  @click="showCellPreview(song.invitation_title || 'Invitación')">
                  {{ song.invitation_title || 'Invitación' }}
                </button>
              </td>
              <td>
                <a
                  v-if="song.reference_url"
                  class="reference-link"
                  :href="song.reference_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="song.reference_url"
                  @click.stop>
                  {{ formatReference(song.reference_url) }}
                </a>
                <span v-else class="empty-pill">Sin enlace</span>
              </td>
              <td>
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="formatDateTime(song.created_at || song.suggested_at)"
                  @click="showCellPreview(formatDateTime(song.created_at || song.suggested_at))">
                  {{ formatDateTime(song.created_at || song.suggested_at) }}
                </button>
              </td>
              <td>
                <div class="row-actions">
                  <button type="button" class="row-action" aria-label="Editar canción" title="Editar canción" @click="openEditModal(song)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="row-action row-action--danger"
                    :disabled="isDeleting"
                    aria-label="Eliminar canción"
                    title="Eliminar canción"
                    @click="deleteSong(song)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5" />
                      <path d="M14 11v5" />
                    </svg>
                  </button>
                </div>
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
        aria-labelledby="song-export-modal-title"
        @click.self="closeExportModal">
        <article class="export-modal-card export-modal-card--filters">
          <header class="export-modal-head">
            <div>
              <p class="client-kicker">Canciones sugeridas</p>
              <h2 id="song-export-modal-title">{{ exportModalTitle }}</h2>
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

          <div class="export-modal-body export-modal-body--filters">
            <section class="export-option-group" aria-label="Invitación">
              <p class="export-option-title">Invitación</p>
              <label class="field">
                <span>Incluir</span>
                <select v-model="exportInvitationId" :disabled="isExporting">
                  <option value="">Todas las invitaciones</option>
                  <option v-for="invitation in invitations" :key="invitation.id" :value="String(invitation.id)">
                    {{ invitation.title || 'Invitación sin título' }}
                  </option>
                </select>
              </label>
            </section>

            <section class="export-option-group" aria-label="Enlaces">
              <p class="export-option-title">Enlaces</p>
              <label class="export-radio">
                <input v-model="exportLinkFilter" type="radio" value="all" :disabled="isExporting" />
                <span>Todas las canciones</span>
              </label>
              <label class="export-radio">
                <input v-model="exportLinkFilter" type="radio" value="with_link" :disabled="isExporting" />
                <span>Solo con enlace</span>
              </label>
              <label class="export-radio">
                <input v-model="exportLinkFilter" type="radio" value="without_link" :disabled="isExporting" />
                <span>Solo sin enlace</span>
              </label>
            </section>

            <section class="export-option-group" aria-label="Orden">
              <p class="export-option-title">Orden</p>
              <label class="export-radio">
                <input v-model="exportSortBy" type="radio" value="song_name" :disabled="isExporting" />
                <span>Ordenar por canción</span>
              </label>
              <label class="export-radio">
                <input v-model="exportSortBy" type="radio" value="created_at" :disabled="isExporting" />
                <span>Ordenar por fecha</span>
              </label>
              <label class="export-radio">
                <input v-model="exportSortDir" type="radio" value="asc" :disabled="isExporting" />
                <span>A - Z / antiguas</span>
              </label>
              <label class="export-radio">
                <input v-model="exportSortDir" type="radio" value="desc" :disabled="isExporting" />
                <span>Z - A / recientes</span>
              </label>
            </section>
          </div>

          <footer class="export-modal-actions">
            <BaseButton type="button" variant="ghost" :disabled="isExporting" @click="closeExportModal">
              Cancelar
            </BaseButton>
            <BaseButton type="button" variant="primary" :disabled="isExporting" @click="exportSongs">
              {{ exportButtonLabel }}
            </BaseButton>
          </footer>
        </article>
      </div>
    </Transition>

    <Transition name="export-modal-fade">
      <div
        v-if="modalOpen"
        class="export-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-modal-title"
        @click.self="closeModal">
        <article class="export-modal-card">
          <header class="export-modal-head">
            <div>
              <p class="client-kicker">Canciones sugeridas</p>
              <h2 id="song-modal-title">{{ modalTitle }}</h2>
            </div>
            <button
              type="button"
              class="export-modal-close"
              aria-label="Cerrar"
              @click="closeModal">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <form class="export-modal-body export-modal-body--form" @submit.prevent="saveSong">
            <label v-if="!editingSong" class="field">
              <span>Invitación</span>
              <select v-model="form.invitationId" required>
                <option value="" disabled>Selecciona una invitación</option>
                <option v-for="invitation in invitations" :key="invitation.id" :value="String(invitation.id)">
                  {{ invitation.title || 'Invitación sin título' }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Nombre de la canción</span>
              <input v-model="form.songName" type="text" maxlength="180" required />
            </label>
            <label class="field">
              <span>Enlace de referencia</span>
              <input v-model="form.referenceUrl" type="url" maxlength="2048" placeholder="YouTube, Spotify u otro enlace" />
            </label>
          </form>

          <footer class="export-modal-actions">
            <BaseButton type="button" variant="ghost" :disabled="isSaving" @click="closeModal">
              Cancelar
            </BaseButton>
            <BaseButton type="button" variant="primary" :disabled="!canSave" @click="saveSong">
              {{ isSaving ? 'Guardando...' : 'Guardar' }}
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
  min-width: 0;
  max-width: 1320px;
  margin: 0 auto;
  overflow-x: hidden;
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

:deep(.export-btn:disabled) {
  cursor: not-allowed;
  opacity: 0.72;
  transform: none;
  filter: none;
}

:deep(.export-btn--pdf) {
  background: linear-gradient(120deg, #c83242, #f0606d);
}

:deep(.export-btn--xlsx) {
  background: linear-gradient(120deg, #168854, #35b86f);
}

:deep(.export-btn--add) {
  background: linear-gradient(120deg, #6f39bb, #c2548d);
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
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.table-card {
  min-width: 0;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.filters-row > * {
  min-width: 0;
}

.filters-row .field,
.filters-row .filters-helper {
  flex: 0 1 calc(25% - 9px);
  max-width: 100%;
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
}

.filters-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-height: 44px;
  justify-self: end;
  margin-left: auto;
  flex: 0 0 auto;
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

.invitation-select {
  position: relative;
  width: 100%;
}

.invitation-select__button {
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0 0.85rem;
  color: var(--brand-ink);
  font: inherit;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  cursor: pointer;
}

.invitation-select__button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--brand-ink);
  font-weight: 600;
}

.invitation-select__button svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: #7a66a5;
  stroke-width: 1.9;
  transition: transform 0.18s ease;
}

.invitation-select.open .invitation-select__button svg {
  transform: rotate(180deg);
}

.invitation-select__button:focus-visible {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
}

.invitation-select__menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  gap: 4px;
  max-height: 280px;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.22);
  background: #fff;
  padding: 8px;
  box-shadow: 0 18px 42px rgba(31, 20, 66, 0.16);
}

.invitation-select__search {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  padding: 0 0.75rem;
  color: var(--brand-ink);
  font: inherit;
  font-size: 0.88rem;
}

.invitation-select__option {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #2b2242;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: left;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invitation-select__option:hover,
.invitation-select__option:focus-visible,
.invitation-select__option.selected {
  background: rgba(247, 241, 255, 0.9);
  color: #4f2d81;
}

.invitation-select__empty {
  margin: 0;
  padding: 0.55rem 0.65rem;
  color: #6a5a84;
  font-size: 0.86rem;
}

.table-wrap {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(111, 57, 187, 0.35) rgba(234, 225, 247, 0.65);
}

table {
  width: max-content;
  min-width: 1120px;
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

.clear-filter-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #4f2d81;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.clear-filter-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.clear-filter-btn:hover,
.clear-filter-btn:focus-visible {
  background: #f6f2ff;
  border-color: #cdbcf2;
}

.clear-filter-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
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

.cell-ellipsis-btn:focus-visible {
  outline: 2px solid rgba(79, 45, 129, 0.28);
  outline-offset: 2px;
  border-radius: 6px;
}

.reference-link {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  color: #4f2d81;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reference-link:hover,
.reference-link:focus-visible {
  text-decoration: underline;
}

.empty-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(248, 250, 252, 0.94);
  color: #64748b;
  font-size: 0.81rem;
  font-weight: 700;
  white-space: nowrap;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
}

.row-action {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #4f2d81;
  border-radius: 9px;
  padding: 0;
  cursor: pointer;
}

.row-action svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.row-action:hover,
.row-action:focus-visible {
  background: #f6f2ff;
  border-color: #cdbcf2;
}

.row-action--danger {
  color: #b4233a;
}

.row-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
  max-height: calc(100dvh - 24px);
  border-radius: 18px;
  border: 1px solid rgba(188, 171, 222, 0.42);
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(213, 182, 255, 0.25), transparent 62%),
    linear-gradient(180deg, #ffffff, #f8f7ff);
  box-shadow: 0 34px 70px rgba(14, 20, 36, 0.42);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.export-modal-card--filters {
  width: min(620px, calc(100vw - 24px));
}

.export-modal-head {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(148, 132, 185, 0.24);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex: 0 0 auto;
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
  gap: 12px;
  min-height: 0;
  overflow: auto;
}

.export-modal-body--form {
  grid-template-columns: 1fr;
}

.export-modal-body--filters {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
}

.export-modal-body--filters .export-option-group:first-child {
  grid-column: 1 / -1;
}

.export-modal-body--filters .field {
  gap: 0.25rem;
}

.export-modal-body--filters .field input,
.export-modal-body--filters .field select {
  min-height: 38px;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.88rem;
}

.export-option-group {
  display: grid;
  align-content: start;
  gap: 0.45rem;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  background: rgba(255, 255, 255, 0.74);
}

.export-option-title {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b5b86;
  font-weight: 800;
}

.export-radio {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 28px;
  color: #2b2242;
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
}

.export-radio input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #6f39bb;
}

.export-radio input:disabled,
.export-radio input:disabled + span {
  cursor: not-allowed;
  opacity: 0.68;
}

.export-modal-actions {
  padding: 12px 16px 14px;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  border-top: 1px solid rgba(148, 132, 185, 0.24);
  flex: 0 0 auto;
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
  th,
  td {
    padding: 11px 10px;
    font-size: 0.86rem;
  }
}

@media (max-width: 1220px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters-row .field,
  .filters-row .filters-helper {
    flex-basis: calc(50% - 6px);
  }
}

@media (max-width: 920px) {
  .client-page-head {
    flex-direction: column;
  }

  .filters-row {
    align-items: stretch;
  }

  .table-wrap {
    overflow-x: scroll;
  }

  .filters-helper {
    width: 100%;
    max-width: 100%;
    white-space: normal;
  }

  .field-search,
  .search-shell,
  .field,
  .field input,
  .field select {
    width: 100%;
    min-width: 0;
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

  .export-modal-card--filters {
    width: min(560px, calc(100vw - 24px));
  }

  .export-modal-body--filters {
    grid-template-columns: 1fr;
  }

  .export-modal-body--filters .export-option-group:first-child {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .filters-row {
    width: 100%;
  }

  .filters-row .field,
  .filters-row .filters-helper {
    flex: 0 0 100%;
  }

  .filters-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-left: 0;
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
    overflow-x: auto;
    scrollbar-width: auto;
  }

  table {
    min-width: 1120px;
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

  .row-actions {
    gap: 0.32rem;
  }

  .row-action {
    min-height: 30px;
    padding: 0 0.48rem;
    font-size: 0.76rem;
  }

  .export-modal-actions {
    flex-direction: column-reverse;
  }

  .export-modal-actions :deep(.btn) {
    width: 100%;
  }

  .export-modal-backdrop {
    padding: 10px;
  }

  .export-modal-card {
    width: 100%;
    max-height: calc(100dvh - 20px);
    border-radius: 16px;
  }

  .export-modal-head {
    padding: 12px 14px 10px;
  }

  .export-modal-head h2 {
    font-size: 1.12rem;
  }

  .export-modal-close {
    width: 34px;
    height: 34px;
  }

  .export-modal-body {
    padding: 12px;
  }

  .export-modal-body--filters {
    gap: 8px;
    padding: 10px;
  }

  .export-option-group {
    gap: 0.36rem;
    padding: 9px;
  }

  .export-radio {
    min-height: 27px;
    font-size: 0.84rem;
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

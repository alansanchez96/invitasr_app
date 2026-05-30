<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { useSessionStore } from '@/stores/session'
import {
  exportTenantInvitationRsvpPdf,
  exportTenantInvitationRsvpXlsx,
  getTenantInvitationRsvpResponses,
  listTenantInvitations,
  updateTenantInvitationRsvpStatus,
  updateTenantInvitationRsvpTableAssignment,
  type TenantInvitationItem,
  type TenantInvitationRsvpResponse,
} from '@/services/tenantInvitations'
import { notifyError, notifySuccess } from '@/utils/toast'

type ConfirmedGuestRow = {
  id: number
  firstName: string
  lastName: string
  invitationTitle: string
  dietaryRestrictions: string
  whatsapp: string
  companionsCount: number
  tableAssignment: string
  status: string
  confirmedAt: string | null
}

type SortField = 'id' | 'name' | 'last_name' | 'status' | 'confirmed_at'
type SortDirection = 'asc' | 'desc'
type WhatsappStatusFilter = 'all' | 'with' | 'without'
type GuestStatusFilter = 'all' | 'confirmed' | 'pending' | 'declined' | 'not_confirmed'
type EditableGuestStatus = 'confirmed' | 'pending' | 'declined'
type ExportColumnKey =
  | 'first_name'
  | 'last_name'
  | 'invitation_title'
  | 'dietary_restrictions'
  | 'whatsapp'
  | 'companions_count'
  | 'table_assignment'
  | 'status'
type ExportGroupBy = 'name' | 'table' | 'dietary' | 'status'
type SearchableSelectOption = {
  value: string
  label: string
}
const INVITATION_SELECT_RESULT_LIMIT = 25
const EXPORT_COLUMNS: Array<{ key: ExportColumnKey; label: string }> = [
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name', label: 'Apellido' },
  { key: 'invitation_title', label: 'Invitación' },
  { key: 'dietary_restrictions', label: 'Restricción alimenticia' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'companions_count', label: 'Acompañantes' },
  { key: 'table_assignment', label: 'Mesa' },
  { key: 'status', label: 'Estado' },
]

const session = useSessionStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const rows = ref<ConfirmedGuestRow[]>([])

const searchInput = ref('')
const searchQuery = ref('')
const selectedInvitationIds = ref<string[]>([])
const invitationFilterOpen = ref(false)
const invitationSearchInput = ref('')
const tableAssignmentInput = ref('')
const tableAssignmentFilter = ref('')
const whatsappStatus = ref<WhatsappStatusFilter>('all')
const guestStatus = ref<GuestStatusFilter>('all')
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
const invitationOptions = ref<Array<{ id: number; title: string }>>([])
const invitationTitleById = ref<Record<string, string>>({})
const isLoadingInvitations = ref(false)
const showExportModal = ref(false)
const isExporting = ref(false)
const isSavingTable = ref(false)
const savingStatusGuestIds = ref<number[]>([])
const exportScope = ref<'all' | 'confirmed'>('confirmed')
const exportStatusFilter = ref<GuestStatusFilter>('confirmed')
const exportFormat = ref<'pdf' | 'xlsx'>('pdf')
const exportInvitationIds = ref<string[]>([])
const exportInvitationFilterOpen = ref(false)
const exportInvitationSearch = ref('')
const exportTableAssignment = ref('')
const exportSelectedTablesInput = ref('')
const exportIncludeUnassignedTables = ref(true)
const exportWhatsappStatus = ref<WhatsappStatusFilter>('all')
const exportSelectedColumns = ref<ExportColumnKey[]>(EXPORT_COLUMNS.map((column) => column.key))
const exportGroupBy = ref<ExportGroupBy>('name')
const exportSortField = ref<'last_name' | 'first_name'>('last_name')
const exportLastNameOrder = ref<'asc' | 'desc'>('asc')
const exportTableOrder = ref<'asc' | 'desc'>('asc')
const cellPreview = ref({
  visible: false,
  text: '',
})
const invitationSelectRef = ref<HTMLElement | null>(null)
const exportInvitationSelectRef = ref<HTMLElement | null>(null)

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let tableAssignmentDebounceTimer: ReturnType<typeof setTimeout> | null = null
let invitationSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let exportInvitationSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null
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

const normalizeGuestStatus = (value: unknown): EditableGuestStatus => {
  const status = String(value ?? '').trim().toLowerCase()
  if (status === 'confirmed' || status === 'declined') return status
  return 'pending'
}

const toRow = (item: TenantInvitationRsvpResponse): ConfirmedGuestRow => ({
  id: Number(item.id ?? 0),
  firstName: String(item.first_name ?? '').trim(),
  lastName: String(item.last_name ?? '').trim(),
  invitationTitle: String(item.invitation_title ?? 'Invitación').trim() || 'Invitación',
  dietaryRestrictions: String(item.dietary_restrictions ?? '').trim() || 'Sin restricciones',
  whatsapp: String(item.whatsapp ?? '').trim() || 'Sin WhatsApp',
  companionsCount: Number(item.companions_count ?? 0) || 0,
  tableAssignment: String(item.table_assignment ?? '').trim(),
  status: normalizeGuestStatus(item.status),
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

const normalizeInvitationOption = (item: TenantInvitationItem): { id: number; title: string } | null => {
  const id = Number(item.id ?? 0)
  if (!id) return null
  const title = String(item.title ?? '').trim() || `Invitación #${id}`
  return { id, title }
}

const filteredInvitationOptions = computed(() => invitationOptions.value)
const filteredExportInvitationOptions = computed(() => invitationOptions.value)
const searchableInvitationOptions = computed<SearchableSelectOption[]>(() => {
  const options = invitationOptions.value.map((item) => ({
    value: String(item.id),
    label: item.title,
  }))

  options.unshift(
    ...selectedInvitationIds.value
      .concat(exportInvitationIds.value)
      .filter((id, index, list) => id && list.indexOf(id) === index)
      .filter((id) => invitationTitleById.value[id] && !options.some((option) => option.value === id))
      .map((id) => ({
        value: id,
        label: invitationTitleById.value[id] ?? 'Invitación seleccionada',
      })),
  )

  return options
})

const selectedInvitationLabel = computed(() => {
  if (!selectedInvitationIds.value.length) return 'Todas las invitaciones'
  if (selectedInvitationIds.value.length === 1) {
    return invitationTitleById.value[selectedInvitationIds.value[0] ?? ''] ?? 'Invitación seleccionada'
  }
  return `${selectedInvitationIds.value.length} invitaciones seleccionadas`
})

const selectedExportInvitationLabel = computed(() => {
  if (!exportInvitationIds.value.length) return 'Todas'
  if (exportInvitationIds.value.length === 1) {
    return invitationTitleById.value[exportInvitationIds.value[0] ?? ''] ?? 'Invitación seleccionada'
  }
  return `${exportInvitationIds.value.length} invitaciones seleccionadas`
})

const exportSelectedTables = computed(() =>
  exportSelectedTablesInput.value
    .split(',')
    .map((item) => item.trim())
    .filter((item, index, list) => /^\d+$/.test(item) && list.indexOf(item) === index),
)

const exportCanSubmit = computed(() => exportSelectedColumns.value.length > 0)

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
  if (sortBy.value === 'status') {
    return `Estado ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  }
  return sortDir.value === 'asc'
    ? 'Confirmación: primeras respuestas primero'
    : 'Confirmación: últimas respuestas primero'
})

const guestDisplayName = (guest: ConfirmedGuestRow) => {
  const full = `${guest.firstName} ${guest.lastName}`.trim()
  return full !== '' ? full : 'Invitado confirmado'
}

const guestStatusLabel = (status: string) => {
  if (status === 'confirmed') return 'Confirmado'
  if (status === 'declined') return 'No confirmado'
  return 'Pendiente'
}

const guestStatusMark = (status: string) => status === 'confirmed' ? '✓' : 'X'

const onlyDigits = (value: string) => value.replace(/\D/g, '')

const updateTableFilterInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const nextValue = onlyDigits(target?.value ?? '')
  tableAssignmentInput.value = nextValue
  if (target) target.value = nextValue
}

const updateExportTablesInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const nextValue = String(target?.value ?? '').replace(/[^\d,\s]/g, '')
  exportSelectedTablesInput.value = nextValue
  exportTableAssignment.value = nextValue.includes(',') ? '' : nextValue.trim()
  if (target) target.value = nextValue
}

const updateGuestTableAssignmentInput = (guest: ConfirmedGuestRow, event: Event) => {
  const target = event.target as HTMLInputElement | null
  const nextValue = onlyDigits(target?.value ?? '')
  if (target) target.value = nextValue
  void updateGuestTableAssignment(guest, nextValue)
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
      invitation_ids: selectedInvitationIds.value,
      table_assignment: tableAssignmentFilter.value || undefined,
      whatsapp_status: whatsappStatus.value,
      status: guestStatus.value,
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

const loadInvitationOptions = async (query = '') => {
  isLoadingInvitations.value = true
  try {
    const response = await listTenantInvitations({
      page: 1,
      perPage: INVITATION_SELECT_RESULT_LIMIT,
      status: 'published',
      search: query.trim() || undefined,
      orderField: 'title',
      orderDirection: 'asc',
    })
    const options = response.list
      .map(normalizeInvitationOption)
      .filter((item): item is { id: number; title: string } => Boolean(item))
    invitationOptions.value = options
    invitationTitleById.value = {
      ...invitationTitleById.value,
      ...Object.fromEntries(options.map((item) => [String(item.id), item.title])),
    }
  } catch {
    invitationOptions.value = []
  } finally {
    isLoadingInvitations.value = false
  }
}

const searchInvitationOptions = (query: string) => {
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
  }

  invitationSearchDebounceTimer = setTimeout(() => {
    invitationSearchDebounceTimer = null
    void loadInvitationOptions(query)
  }, 260)
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

const clearTableFilters = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  if (tableAssignmentDebounceTimer) {
    clearTimeout(tableAssignmentDebounceTimer)
    tableAssignmentDebounceTimer = null
  }
  searchInput.value = ''
  searchQuery.value = ''
  selectedInvitationIds.value = []
  invitationSearchInput.value = ''
  tableAssignmentInput.value = ''
  tableAssignmentFilter.value = ''
  whatsappStatus.value = 'all'
  guestStatus.value = 'all'
  invitationFilterOpen.value = false
  resetToFirstPageOrLoad()
}

const toggleInvitationFilter = () => {
  invitationFilterOpen.value = !invitationFilterOpen.value
  if (invitationFilterOpen.value) {
    invitationSearchInput.value = ''
    void loadInvitationOptions()
  }
}

const selectInvitationFilter = (value: string, title = '') => {
  selectedInvitationIds.value = value ? [value] : []
  if (value && title) {
    invitationTitleById.value = { ...invitationTitleById.value, [value]: title }
  }
  invitationFilterOpen.value = false
  invitationSearchInput.value = ''
}

const toggleExportInvitationFilter = () => {
  exportInvitationFilterOpen.value = !exportInvitationFilterOpen.value
  if (exportInvitationFilterOpen.value) {
    exportInvitationSearch.value = ''
    void loadInvitationOptions()
  }
}

const selectExportInvitationFilter = (value: string, title = '') => {
  exportInvitationIds.value = value ? [value] : []
  if (value && title) {
    invitationTitleById.value = { ...invitationTitleById.value, [value]: title }
  }
  exportInvitationFilterOpen.value = false
  exportInvitationSearch.value = ''
}

const openExportModal = (format: 'pdf' | 'xlsx' = 'pdf') => {
  if (format === 'xlsx' && isBasicPlan.value) {
    notifyError('La exportación XLSX está disponible en Pro y Planner.')
    return
  }
  exportFormat.value = format
  exportInvitationIds.value = [...selectedInvitationIds.value]
  exportInvitationSearch.value = ''
  exportInvitationFilterOpen.value = false
  exportTableAssignment.value = tableAssignmentFilter.value
  exportSelectedTablesInput.value = tableAssignmentFilter.value && /^\d+$/.test(tableAssignmentFilter.value)
    ? tableAssignmentFilter.value
    : ''
  exportIncludeUnassignedTables.value = false
  exportWhatsappStatus.value = whatsappStatus.value
  exportStatusFilter.value = isBasicPlan.value ? 'confirmed' : guestStatus.value
  exportSelectedColumns.value = EXPORT_COLUMNS.map((column) => column.key)
  exportGroupBy.value = 'name'
  exportTableOrder.value = 'asc'
  if (isBasicPlan.value) {
    exportScope.value = 'confirmed'
    exportStatusFilter.value = 'confirmed'
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
  if (!exportCanSubmit.value) {
    notifyError('Selecciona al menos una columna para exportar.')
    return
  }

  isExporting.value = true
  try {
    const response = await exportTenantInvitationRsvpPdf({
      scope: exportScope.value,
      status_filter: exportStatusFilter.value,
      invitation_ids: exportInvitationIds.value,
      table_assignment: exportTableAssignment.value || undefined,
      table_assignments: exportSelectedTables.value,
      include_unassigned_tables: exportIncludeUnassignedTables.value,
      whatsapp_status: exportWhatsappStatus.value,
      columns: exportSelectedColumns.value,
      group_by: exportGroupBy.value,
      sortField: exportSortField.value,
      lastNameOrder: exportLastNameOrder.value,
      tableOrder: exportTableOrder.value,
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

const exportGuestsXlsx = async () => {
  if (isBasicPlan.value) {
    notifyError('La exportación XLSX está disponible en Pro y Planner.')
    return
  }
  if (!exportCanSubmit.value) {
    notifyError('Selecciona al menos una columna para exportar.')
    return
  }

  isExporting.value = true
  try {
    const response = await exportTenantInvitationRsvpXlsx({
      scope: exportScope.value,
      status_filter: exportStatusFilter.value,
      invitation_ids: exportInvitationIds.value,
      table_assignment: exportTableAssignment.value || undefined,
      table_assignments: exportSelectedTables.value,
      include_unassigned_tables: exportIncludeUnassignedTables.value,
      whatsapp_status: exportWhatsappStatus.value,
      columns: exportSelectedColumns.value,
      group_by: exportGroupBy.value,
      sortField: exportSortField.value,
      lastNameOrder: exportLastNameOrder.value,
      tableOrder: exportTableOrder.value,
    })

    triggerBlobDownload(response.blob, response.fileName)
    closeExportModal()
    notifySuccess('Tu archivo se descargó correctamente.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos exportar el XLSX en este momento.')
  } finally {
    isExporting.value = false
  }
}

const exportGuests = () => {
  if (exportFormat.value === 'xlsx') {
    void exportGuestsXlsx()
    return
  }

  void exportGuestsPdf()
}

const updateGuestTableAssignment = async (guest: ConfirmedGuestRow, value: string) => {
  if (isBasicPlan.value) {
    notifyError('La asignación de mesas está disponible en Pro y Planner.')
    return
  }

  const previous = guest.tableAssignment
  const nextValue = value.replace(/\D/g, '').trim()
  if (value.trim() !== '' && nextValue === '') {
    notifyError('La mesa solo acepta números.')
    return
  }
  guest.tableAssignment = nextValue
  isSavingTable.value = true

  try {
    await updateTenantInvitationRsvpTableAssignment(guest.id, nextValue || null)
    notifySuccess('Mesa actualizada.')
  } catch (error) {
    guest.tableAssignment = previous
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos actualizar la mesa.')
  } finally {
    isSavingTable.value = false
  }
}

const updateGuestStatus = async (guest: ConfirmedGuestRow, value: EditableGuestStatus) => {
  const previousStatus = guest.status
  const previousConfirmedAt = guest.confirmedAt

  guest.status = value
  if (value !== 'confirmed') {
    guest.confirmedAt = null
  }

  savingStatusGuestIds.value = [...savingStatusGuestIds.value, guest.id]

  try {
    const result = await updateTenantInvitationRsvpStatus(guest.id, value)
    guest.status = normalizeGuestStatus(result.response.status)
    guest.confirmedAt = result.response.confirmed_at
    notifySuccess('Estado actualizado.')
  } catch (error) {
    guest.status = previousStatus
    guest.confirmedAt = previousConfirmedAt
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos actualizar el estado.')
  } finally {
    savingStatusGuestIds.value = savingStatusGuestIds.value.filter((id) => id !== guest.id)
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
  if (event.key !== 'Escape') return

  if (exportInvitationFilterOpen.value) {
    event.preventDefault()
    exportInvitationFilterOpen.value = false
    return
  }

  if (invitationFilterOpen.value) {
    event.preventDefault()
    invitationFilterOpen.value = false
    return
  }

  if (showExportModal.value) {
    event.preventDefault()
    closeExportModal()
  }
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target) return

  if (invitationFilterOpen.value && !invitationSelectRef.value?.contains(target)) {
    invitationFilterOpen.value = false
  }

  if (exportInvitationFilterOpen.value && !exportInvitationSelectRef.value?.contains(target)) {
    exportInvitationFilterOpen.value = false
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

watch([selectedInvitationIds, tableAssignmentFilter, whatsappStatus, guestStatus], () => {
  resetToFirstPageOrLoad()
})

watch(tableAssignmentInput, (value) => {
  if (tableAssignmentDebounceTimer) {
    clearTimeout(tableAssignmentDebounceTimer)
  }

  tableAssignmentDebounceTimer = setTimeout(() => {
    tableAssignmentDebounceTimer = null
    tableAssignmentFilter.value = value.trim()
  }, 320)
})

watch(invitationSearchInput, (value) => {
  if (!invitationFilterOpen.value) return
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
  }

  invitationSearchDebounceTimer = setTimeout(() => {
    invitationSearchDebounceTimer = null
    void loadInvitationOptions(value)
  }, 260)
})

watch(exportInvitationSearch, (value) => {
  if (!exportInvitationFilterOpen.value) return
  if (exportInvitationSearchDebounceTimer) {
    clearTimeout(exportInvitationSearchDebounceTimer)
  }

  exportInvitationSearchDebounceTimer = setTimeout(() => {
    exportInvitationSearchDebounceTimer = null
    void loadInvitationOptions(value)
  }, 260)
})

watch(perPage, () => {
  resetToFirstPageOrLoad()
})

watch(showExportModal, (isOpen) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  void loadInvitationOptions()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWindowHotkeys)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
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
  if (tableAssignmentDebounceTimer) {
    clearTimeout(tableAssignmentDebounceTimer)
    tableAssignmentDebounceTimer = null
  }
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
    invitationSearchDebounceTimer = null
  }
  if (exportInvitationSearchDebounceTimer) {
    clearTimeout(exportInvitationSearchDebounceTimer)
    exportInvitationSearchDebounceTimer = null
  }
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
  <section class="client-page container" aria-labelledby="client-guests-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Confirmaciones RSVP</p>
        <h1 id="client-guests-title">Lista de invitados</h1>
        <p class="client-lead">
          Revisa el estado de asistencia, acompañantes y datos de contacto.
        </p>
      </div>

      <div class="client-actions">
        <span class="plan-pill">Plan {{ planLabel }}</span>
        <BaseButton
          type="button"
          variant="ghost"
          class="export-btn export-btn--pdf"
          @click="openExportModal('pdf')">
          PDF
        </BaseButton>
        <BaseButton
          v-if="!isBasicPlan"
          type="button"
          variant="ghost"
          class="export-btn export-btn--xlsx"
          @click="openExportModal('xlsx')">
          XLSX
        </BaseButton>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen">
      <article class="bo-card stat-card">
        <span>Total invitados</span>
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
      <div class="filters-row filters-row--primary">
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

        <div class="field field-filter">
          <span>Invitación</span>
          <SearchableSelect
            v-model="selectedInvitationIds"
            multiple
            :options="searchableInvitationOptions"
            all-label="Todas las invitaciones"
            placeholder="Selecciona invitaciones"
            search-placeholder="Buscar invitación"
            empty-label="No encontramos invitaciones publicadas."
            :result-limit="INVITATION_SELECT_RESULT_LIMIT"
            :disabled="isLoadingInvitations"
            @open="loadInvitationOptions"
            @search-change="searchInvitationOptions" />
        </div>
      </div>

      <div class="filters-row filters-row--guest-secondary">
        <label class="field field-filter">
          <span>Mesa</span>
          <input
            :value="tableAssignmentInput"
            type="search"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Ej: 4"
            @input="updateTableFilterInput" />
        </label>

        <label class="field field-filter">
          <span>WhatsApp</span>
          <select v-model="whatsappStatus">
            <option value="all">Todos</option>
            <option value="with">Con WhatsApp</option>
            <option value="without">Sin WhatsApp</option>
          </select>
        </label>

        <label class="field field-filter">
          <span>Estado</span>
          <select v-model="guestStatus">
            <option value="all">Todos</option>
            <option value="confirmed">Confirmados</option>
            <option value="not_confirmed">No confirmados</option>
            <option value="pending">Pendientes</option>
            <option value="declined">No asistirán</option>
          </select>
        </label>

        <div class="filters-actions">
          <button
            type="button"
            class="clear-filter-btn"
            :disabled="isLoading"
            aria-label="Limpiar filtros"
            title="Limpiar filtros"
            @click="clearTableFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
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
    <p v-else-if="isLoading" class="client-inline-note">Cargando invitados...</p>

    <article class="bo-card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Tabla de invitados</caption>
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
              <th title="Invitación">Invitación</th>
              <th title="Restricción alimenticia">Restricción alimenticia</th>
              <th title="WhatsApp">WhatsApp</th>
              <th title="Acompañantes">Acompañantes</th>
              <th title="Mesa">Mesa</th>
              <th>
                <button
                  type="button"
                  class="sort-head-btn"
                  :class="{ 'sort-head-btn--active': isSortActive('status') }"
                  title="Estado"
                  @click="toggleSort('status')">
                  <span>Estado</span>
                  <span class="sort-head-indicator">{{ sortIndicator('status') }}</span>
                </button>
              </th>
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
              <td colspan="9" class="empty-row">
                Todavía no se encontraron invitados.
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
                    <small>{{ guestStatusLabel(guest.status) }}</small>
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
                <button
                  type="button"
                  class="cell-ellipsis-btn"
                  :title="guest.invitationTitle"
                  @click="showCellPreview(guest.invitationTitle)">
                  {{ guest.invitationTitle }}
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
                  :title="guest.whatsapp"
                  @click="showCellPreview(guest.whatsapp)">
                  {{ guest.whatsapp }}
                </button>
              </td>
              <td>
                <span class="companions-pill" :class="{ 'companions-pill--empty': guest.companionsCount === 0 }">
                  {{ guest.companionsCount > 0 ? guest.companionsCount : 'Sin acompañantes' }}
                </span>
              </td>
              <td>
                <input
                  class="table-assignment-input"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="3"
                  :value="guest.tableAssignment"
                  :disabled="isBasicPlan || isSavingTable"
                  placeholder="Mesa"
                  @change="updateGuestTableAssignmentInput(guest, $event)" />
              </td>
              <td>
                <div class="status-edit-cell">
                  <span class="status-mark" :class="{ 'status-mark--confirmed': guest.status === 'confirmed' }">
                    {{ guestStatusMark(guest.status) }}
                  </span>
                  <select
                    class="status-select"
                    :value="guest.status"
                    :disabled="savingStatusGuestIds.includes(guest.id)"
                    :aria-label="`Estado de ${guestDisplayName(guest)}`"
                    @change="updateGuestStatus(guest, ($event.target as HTMLSelectElement).value as EditableGuestStatus)">
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendiente</option>
                    <option value="declined">No confirmado</option>
                  </select>
                </div>
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
              <p class="client-kicker">Exportación {{ exportFormat.toUpperCase() }}</p>
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
            <section class="export-option-group" aria-label="Estado de invitados">
              <p class="export-option-title">Estado</p>
              <template v-if="isBasicPlan">
                <div class="export-chip-fixed" role="status" aria-live="polite">
                  Invitados confirmados
                </div>
              </template>
              <template v-else>
                <label class="export-field">
                  <span>Qué invitados incluir</span>
                  <select v-model="exportStatusFilter">
                    <option value="all">Todos los invitados</option>
                    <option value="confirmed">Confirmados</option>
                    <option value="not_confirmed">No confirmados</option>
                    <option value="pending">Pendientes</option>
                    <option value="declined">No asistirán</option>
                  </select>
                </label>
              </template>
            </section>

            <section class="export-option-group" aria-label="Filtrar por invitación">
              <p class="export-option-title">Invitación</p>
              <div class="export-field">
                <span>Elegir invitación</span>
                <SearchableSelect
                  v-model="exportInvitationIds"
                  multiple
                  :options="searchableInvitationOptions"
                  all-label="Todas"
                  placeholder="Selecciona invitaciones"
                  search-placeholder="Buscar invitación"
                  empty-label="No encontramos invitaciones publicadas."
                  :result-limit="INVITATION_SELECT_RESULT_LIMIT"
                  :disabled="isLoadingInvitations || isExporting"
                  @open="loadInvitationOptions"
                  @search-change="searchInvitationOptions" />
              </div>
            </section>

            <section class="export-option-group" aria-label="Filtrar por mesa y WhatsApp">
              <p class="export-option-title">Mesa y contacto</p>
              <label class="export-field">
                <span>Mesas incluidas</span>
                <input
                  :value="exportSelectedTablesInput"
                  type="search"
                  inputmode="numeric"
                  placeholder="Ej: 1, 2, 5"
                  @input="updateExportTablesInput" />
                <small>Deja vacío para incluir todas las mesas.</small>
              </label>
              <label class="export-check">
                <input v-model="exportIncludeUnassignedTables" type="checkbox" />
                <span>Incluir invitados sin mesa</span>
              </label>
              <label class="export-field">
                <span>WhatsApp</span>
                <select v-model="exportWhatsappStatus">
                  <option value="all">Todos</option>
                  <option value="with">Con WhatsApp</option>
                  <option value="without">Sin WhatsApp</option>
                </select>
              </label>
            </section>

            <section class="export-option-group export-option-group--wide" aria-label="Columnas del archivo">
              <p class="export-option-title">Columnas</p>
              <div class="export-check-grid">
                <label v-for="column in EXPORT_COLUMNS" :key="column.key" class="export-check">
                  <input v-model="exportSelectedColumns" type="checkbox" :value="column.key" />
                  <span>{{ column.label }}</span>
                </label>
              </div>
              <small class="export-help">La fecha no se exporta. Puedes quitar cualquier otra columna.</small>
            </section>

            <section class="export-option-group" aria-label="Tipo de exportación">
              <p class="export-option-title">Tipo de exportación</p>
              <label class="export-field">
                <span>Agrupar por</span>
                <select v-model="exportGroupBy">
                  <option value="name">Nombres</option>
                  <option value="table">Mesas</option>
                  <option value="dietary">Alimentación</option>
                  <option value="status">Confirmados y no confirmados</option>
                </select>
              </label>
              <label class="export-field">
                <span>Orden de mesas</span>
                <select v-model="exportTableOrder">
                  <option value="asc">Mesa 1 a mayor</option>
                  <option value="desc">Mesa mayor a 1</option>
                </select>
              </label>
            </section>

            <section class="export-option-group" aria-label="Orden alfabético">
              <p class="export-option-title">Orden por nombre</p>
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
            <BaseButton type="button" variant="primary" :disabled="isExporting || !exportCanSubmit" @click="exportGuests">
              {{ isExporting ? 'Exportando...' : `Exportar ${exportFormat.toUpperCase()}` }}
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

:deep(.export-btn--pdf) {
  background: linear-gradient(120deg, #cf2f3f, #ec4f5f);
}

:deep(.export-btn--xlsx) {
  background: linear-gradient(120deg, #168854, #35b86f);
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

.filters-row .field {
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

.field input:focus-visible,
.field select:focus-visible {
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

.invitation-select__button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
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
  z-index: 50;
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

.invitation-select--export .invitation-select__menu {
  z-index: 160;
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

.invitation-select__search:focus-visible {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
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

.search-shell:focus-within {
  outline: 2px solid rgba(108, 68, 178, 0.22);
  outline-offset: 1px;
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
  min-width: 1180px;
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

.companions-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(111, 57, 187, 0.22);
  background: rgba(246, 241, 255, 0.92);
  color: #4f2d81;
  font-size: 0.81rem;
  font-weight: 700;
  white-space: nowrap;
}

.companions-pill--empty {
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(248, 250, 252, 0.94);
  color: #64748b;
}

.table-assignment-input {
  width: min(150px, 100%);
  min-height: 34px;
  border-radius: 9px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #2f2050;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0 0.65rem;
}

.table-assignment-input:focus-visible {
  outline: 2px solid rgba(79, 45, 129, 0.26);
  outline-offset: 1px;
}

.table-assignment-input:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.status-edit-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 100%;
}

.status-mark {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.78rem;
  font-weight: 900;
}

.status-mark--confirmed {
  background: #dcfce7;
  color: #15803d;
}

.status-select {
  width: min(142px, 100%);
  min-height: 34px;
  border-radius: 9px;
  border: 1px solid #d7cce8;
  background: #fff;
  color: #2f2050;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0 0.5rem;
}

.status-select:focus-visible {
  outline: 2px solid rgba(79, 45, 129, 0.26);
  outline-offset: 1px;
}

.status-select:disabled {
  cursor: wait;
  opacity: 0.68;
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
  width: min(860px, 100%);
  max-height: min(88vh, 860px);
  border-radius: 18px;
  border: 1px solid rgba(188, 171, 222, 0.42);
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(213, 182, 255, 0.25), transparent 62%),
    linear-gradient(180deg, #ffffff, #f8f7ff);
  box-shadow: 0 34px 70px rgba(14, 20, 36, 0.42);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
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
  overflow: auto;
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

.export-option-group--wide {
  grid-column: 1 / -1;
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

.export-check-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.export-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border-radius: 10px;
  border: 1px solid rgba(155, 126, 214, 0.18);
  background: rgba(250, 247, 255, 0.92);
  padding: 9px 10px;
  color: #2f1e4f;
  font-weight: 600;
  font-size: 0.86rem;
}

.export-check input {
  accent-color: #6f39bb;
}

.export-check span {
  min-width: 0;
}

.export-field {
  display: grid;
  gap: 5px;
  color: #2f1e4f;
  font-weight: 700;
  font-size: 0.84rem;
}

.export-field input,
.export-field select {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(155, 126, 214, 0.22);
  background: #fff;
  color: #2f1e4f;
  font: inherit;
  font-size: 0.86rem;
  padding: 0 0.7rem;
}

.export-field small,
.export-help {
  color: #75658f;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.35;
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

  .filters-row .field {
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
}

@media (max-width: 720px) {
  .filters-row {
    width: 100%;
  }

  .filters-row .field {
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

  .export-modal-body {
    grid-template-columns: 1fr;
  }

  .export-option-group--wide {
    grid-column: auto;
  }

  .export-check-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    min-width: 1180px;
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

  .diet-pill,
  .companions-pill {
    max-width: 100%;
    font-size: 0.76rem;
  }

  .export-modal-body {
    grid-template-columns: 1fr;
  }

  .export-check-grid {
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

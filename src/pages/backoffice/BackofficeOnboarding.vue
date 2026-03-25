<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  cancelOnboarding,
  createOnboarding,
  getOnboarding,
  listOnboardings,
  resendOnboarding,
  updateOnboarding,
  type OnboardingDetail,
  type OnboardingListItem,
} from '@/services/onboardings'
import { listPlans, type PlanListItem } from '@/services/plans'
import { notifyError, notifySuccess } from '@/utils/toast'

type Filters = {
  status: string
  payment_mode: string
  page: number
  perPage: number
}

type PlanOption = {
  id: string | number
  label: string
}

type OnboardingForm = {
  plan_id: string
  payment_mode: 'paid' | 'gift'
  expires_in_days: string
}

type EditForm = {
  plan_id: string
  payment_mode: 'paid' | 'gift'
}

type ResendForm = {
  expires_in_days: string
}

const filters = reactive<Filters>({
  status: '',
  payment_mode: '',
  page: 1,
  perPage: 10,
})

const list = ref<OnboardingListItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)
const catalogsLoading = ref(false)

const planOptions = ref<PlanOption[]>([])

const selectedId = ref<string | number | null>(null)
const selected = ref<OnboardingDetail | null>(null)
const detailLoading = ref(false)

const isResettingFilters = ref(false)
const isFiltersOpen = ref(true)
const showCreatedAt = ref(false)

const isCreateModalOpen = ref(false)
const isCreateLoading = ref(false)

const isEditing = ref(false)
const isSaving = ref(false)

const isCancelConfirmOpen = ref(false)
const isCanceling = ref(false)

const isResendModalOpen = ref(false)
const isResending = ref(false)

const createForm = reactive<OnboardingForm>({
  plan_id: '',
  payment_mode: 'paid',
  expires_in_days: '2',
})

const editForm = reactive<EditForm>({
  plan_id: '',
  payment_mode: 'paid',
})

const resendForm = reactive<ResendForm>({
  expires_in_days: '2',
})

const hasSelection = computed(() => selectedId.value !== null)
const isAnyModalOpen = computed(
  () => isCreateModalOpen.value || isCancelConfirmOpen.value || isResendModalOpen.value,
)
let filtersTimer: number | undefined
let previousBodyOverflow = ''

type SortKey =
  | 'id'
  | 'client'
  | 'plan'
  | 'payment_mode'
  | 'status'
  | 'expires_at'
  | 'completed_at'
  | 'created_at'

type SortField =
  | 'id'
  | 'client_id'
  | 'plan_id'
  | 'payment_mode'
  | 'status'
  | 'expires_at'
  | 'completed_at'
  | 'created_at'

const sortField = ref<SortField>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')
const perPageOptions = [10, 15, 25, 50]
const isCompactPagination = ref(false)

const sortFieldMap: Record<SortKey, SortField> = {
  id: 'id',
  client: 'client_id',
  plan: 'plan_id',
  payment_mode: 'payment_mode',
  status: 'status',
  expires_at: 'expires_at',
  completed_at: 'completed_at',
  created_at: 'created_at',
}

const selectedPlanLabel = computed(() => {
  const planId = selected.value?.plan_id ?? ''
  const found = planOptions.value.find((option) => String(option.id) === String(planId))
  return found?.label ?? selected.value?.plan_name ?? '-'
})

const canCancel = computed(() => {
  if (!selected.value?.status) return true
  const status = selected.value.status.toLowerCase()
  return status !== 'completed' && status !== 'canceled' && status !== 'cancelled'
})

const canResend = computed(() => {
  if (!selected.value?.status) return true
  const status = selected.value.status.toLowerCase()
  return status !== 'completed'
})

const buildCompactPagination = (totalPages: number, current: number) => {
  if (totalPages <= 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (current <= 1) return [1, 2, '...']
  if (current >= totalPages) return ['...', totalPages - 1, totalPages]

  return ['...', current, Math.min(totalPages, current + 1), '...']
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

const formatStatus = (value?: string) => {
  if (!value) return 'Pendiente'
  const normalized = value.toLowerCase()
  if (normalized === 'completed') return 'Completado'
  if (normalized === 'canceled' || normalized === 'cancelled') return 'Cancelado'
  if (normalized === 'pending') return 'Pendiente'
  if (normalized === 'sent') return 'Enviado'
  return value
}

const statusClass = (value?: string) => {
  if (!value) return 'pending'
  const normalized = value.toLowerCase()
  if (normalized === 'completed') return 'completed'
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'sent') return 'sent'
  return 'pending'
}

const formatPaymentMode = (value?: string) => {
  if (!value || value === 'paid') return 'Pago'
  if (value === 'gift') return 'Regalo'
  return value
}

const formatTokenUsed = (used?: boolean) => {
  return used ? 'Si' : 'No'
}

const copyTextToClipboard = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard API no disponible')
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', 'true')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  input.style.pointerEvents = 'none'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(input)
  if (!copied) {
    throw new Error('No fue posible copiar')
  }
}

const copyAccessCode = async (code?: string | null) => {
  const value = code?.toString().trim()
  if (!value) {
    notifyError('No hay codigo disponible para copiar.')
    return
  }

  try {
    await copyTextToClipboard(value)
    notifySuccess('Codigo copiado al portapapeles.')
  } catch {
    notifyError('No pudimos copiar el codigo.')
  }
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
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

const resetCreateForm = () => {
  const firstPlan = planOptions.value[0]
  createForm.plan_id =
    firstPlan && firstPlan.id !== undefined && firstPlan.id !== null ? String(firstPlan.id) : ''
  createForm.payment_mode = 'paid'
  createForm.expires_in_days = '2'
}

const hydrateEditForm = (item: OnboardingDetail) => {
  editForm.plan_id = item.plan_id === undefined || item.plan_id === null ? '' : String(item.plan_id)
  editForm.payment_mode = item.payment_mode === 'gift' ? 'gift' : 'paid'
}

const loadPlanOptions = async () => {
  const collected: PlanOption[] = []
  let page = 1
  let last = 1
  let guard = 0

  do {
    const result = await listPlans({
      page,
      perPage: 50,
      orderField: 'name',
      orderDirection: 'asc',
    })

    result.list.forEach((item: PlanListItem) => {
      if (item.id === undefined || item.id === null) return
      collected.push({
        id: item.id,
        label: item.name ?? `Plan ${item.id}`,
      })
    })

    page += 1
    last = result.lastPage
    guard += 1
  } while (page <= last && guard < 10)

  planOptions.value = collected
}

const fetchCatalogs = async () => {
  catalogsLoading.value = true
  try {
    await loadPlanOptions()
  } catch {
    notifyError('No pudimos cargar el catalogo de planes.')
  } finally {
    catalogsLoading.value = false
  }
}

const fetchList = async () => {
  isLoading.value = true
  try {
    const result = await listOnboardings({
      ...filters,
      orderField: sortField.value,
      orderDirection: sortDir.value,
    })

    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage

    if (result.orderField && Object.values(sortFieldMap).includes(result.orderField as SortField)) {
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

const openOnboarding = async (item: OnboardingListItem) => {
  const id = item.id
  if (!id) return
  selectedId.value = id
  detailLoading.value = true
  isEditing.value = false
  try {
    const data = await getOnboarding(id)
    selected.value = data as OnboardingDetail
    hydrateEditForm(selected.value)
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
  isEditing.value = false
}

const scheduleFiltersFetch = (immediate = false) => {
  if (filtersTimer) window.clearTimeout(filtersTimer)

  const run = () => {
    filters.page = 1
    clearSelection()
    fetchList()
  }

  if (immediate) {
    run()
    return
  }

  filtersTimer = window.setTimeout(run, 260)
}

const resetFilters = () => {
  isResettingFilters.value = true
  filters.status = ''
  filters.payment_mode = ''
  filters.page = 1
  filters.perPage = 10
  isResettingFilters.value = false
  scheduleFiltersFetch(true)
}

const openCreateModal = () => {
  if (!planOptions.value.length) {
    notifyError('No hay planes disponibles para iniciar onboardings.')
    return
  }
  resetCreateForm()
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  if (isCreateLoading.value) return
  isCreateModalOpen.value = false
}

const submitCreate = async () => {
  if (!createForm.plan_id) {
    notifyError('Selecciona un plan.')
    return
  }

  const expiresInDays = parseOptionalNumber(createForm.expires_in_days)
  if (expiresInDays === null) {
    notifyError('Define dias validos para vencimiento.')
    return
  }

  isCreateLoading.value = true
  try {
    const created = (await createOnboarding({
      plan_id: createForm.plan_id,
      payment_mode: createForm.payment_mode,
      expires_in_days: expiresInDays,
    })) as OnboardingDetail

    const tokenLabel = created.token_short_code ? ` Codigo: ${created.token_short_code}.` : ''
    notifySuccess(`Onboarding creado correctamente.${tokenLabel}`)
    closeCreateModal()
    await fetchList()

    if (created.id) {
      const target = list.value.find((item) => item.id === created.id)
      if (target) {
        await openOnboarding(target)
      }
    }
  } catch {
    notifyError()
  } finally {
    isCreateLoading.value = false
  }
}

const startEdit = () => {
  if (!selected.value) return
  hydrateEditForm(selected.value)
  isEditing.value = true
}

const cancelEdit = () => {
  if (!selected.value || isSaving.value) return
  hydrateEditForm(selected.value)
  isEditing.value = false
}

const saveEdit = async () => {
  if (!selected.value?.id) return
  if (!editForm.plan_id) {
    notifyError('Selecciona un plan valido.')
    return
  }

  isSaving.value = true
  try {
    const updated = (await updateOnboarding(selected.value.id, {
      plan_id: editForm.plan_id,
      payment_mode: editForm.payment_mode,
    })) as OnboardingDetail

    selected.value = {
      ...selected.value,
      ...updated,
      plan_id: editForm.plan_id,
      payment_mode: editForm.payment_mode,
    }

    const index = list.value.findIndex((item) => item.id === selected.value?.id)
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        ...selected.value,
      }
    }

    isEditing.value = false
    notifySuccess('Onboarding actualizado correctamente.')
  } catch {
    notifyError()
  } finally {
    isSaving.value = false
  }
}

const openCancelConfirm = () => {
  if (!selected.value || isEditing.value || !canCancel.value) return
  isCancelConfirmOpen.value = true
}

const closeCancelConfirm = () => {
  if (isCanceling.value) return
  isCancelConfirmOpen.value = false
}

const confirmCancel = async () => {
  if (!selected.value?.id) return
  isCanceling.value = true
  try {
    const updated = (await cancelOnboarding(selected.value.id)) as OnboardingDetail

    selected.value = {
      ...selected.value,
      ...updated,
      status: updated.status ?? 'canceled',
    }

    const index = list.value.findIndex((item) => item.id === selected.value?.id)
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        ...selected.value,
      }
    }

    isCancelConfirmOpen.value = false
    notifySuccess('Onboarding cancelado correctamente.')
  } catch {
    notifyError()
  } finally {
    isCanceling.value = false
  }
}

const openResendModal = () => {
  if (!selected.value?.id || isEditing.value || !canResend.value) return
  resendForm.expires_in_days = '2'
  isResendModalOpen.value = true
}

const closeResendModal = () => {
  if (isResending.value) return
  isResendModalOpen.value = false
}

const submitResend = async () => {
  if (!selected.value?.id) return

  const expiresInDays = parseOptionalNumber(resendForm.expires_in_days)
  if (expiresInDays === null) {
    notifyError('Define dias validos para reenvio.')
    return
  }

  isResending.value = true
  try {
    const updated = (await resendOnboarding(selected.value.id, {
      expires_in_days: expiresInDays,
    })) as OnboardingDetail

    selected.value = {
      ...selected.value,
      ...updated,
    }

    const index = list.value.findIndex((item) => item.id === selected.value?.id)
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        ...selected.value,
      }
    }

    const tokenLabel = updated.token_short_code ? ` Codigo: ${updated.token_short_code}.` : ''
    isResendModalOpen.value = false
    notifySuccess(`Acceso reenviado correctamente.${tokenLabel}`)
  } catch {
    notifyError()
  } finally {
    isResending.value = false
  }
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
  if (page < 1 || page > lastPage.value || page === filters.page) return
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
  if (current > 3) items.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  for (let i = start; i <= end; i += 1) items.push(i)
  if (current < totalPages - 2) items.push('...')
  items.push(totalPages)
  return items
})

const updatePaginationViewport = () => {
  isCompactPagination.value = window.matchMedia('(max-width: 1010px)').matches
}

onMounted(async () => {
  isFiltersOpen.value = !window.matchMedia('(max-width: 900px)').matches
  updatePaginationViewport()
  window.addEventListener('resize', updatePaginationViewport)

  await fetchCatalogs()
  await fetchList()
})

onUnmounted(() => {
  if (filtersTimer) window.clearTimeout(filtersTimer)
  window.removeEventListener('resize', updatePaginationViewport)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
  }
})

watch(
  () => [filters.status, filters.payment_mode],
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

watch(isAnyModalOpen, (isOpen) => {
  if (typeof document === 'undefined') return
  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="bo-page container">
    <header class="bo-page-header">
      <h1>Onboarding</h1>
      <button class="primary-action" type="button" :disabled="catalogsLoading" @click="openCreateModal">Crear onboarding</button>
      <div class="bo-divider"></div>
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
      <div id="filters-panel" class="filters-panel" :class="{ open: isFiltersOpen }" role="region" aria-label="Filtros de onboarding">
        <div class="bo-filters">
          <div class="field field--status">
            <label for="filter-status">Estado</label>
            <select id="filter-status" v-model="filters.status">
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
          <div class="field field--payment">
            <label for="filter-payment">Modo de pago</label>
            <select id="filter-payment" v-model="filters.payment_mode">
              <option value="">Todos</option>
              <option value="paid">Pago</option>
              <option value="gift">Regalo</option>
            </select>
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

        <div v-if="isLoading" class="bo-loading" role="status" aria-live="polite">Cargando onboardings...</div>

        <table v-else>
          <caption class="sr-only">Listado de onboardings</caption>
          <thead>
            <tr>
              <th scope="col" :aria-sort="getAriaSort('id')"><button class="sort-button" type="button" @click="setSort('id')"><span>ID</span><span class="sort-indicator" :class="{ active: isSortActive('id'), desc: isSortActive('id') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
              <th scope="col" :aria-sort="getAriaSort('client')"><button class="sort-button" type="button" @click="setSort('client')"><span>Cliente</span><span class="sort-indicator" :class="{ active: isSortActive('client'), desc: isSortActive('client') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
              <th scope="col" :aria-sort="getAriaSort('plan')"><button class="sort-button" type="button" @click="setSort('plan')"><span>Plan</span><span class="sort-indicator" :class="{ active: isSortActive('plan'), desc: isSortActive('plan') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
              <th scope="col" :aria-sort="getAriaSort('payment_mode')"><button class="sort-button" type="button" @click="setSort('payment_mode')"><span>Pago</span><span class="sort-indicator" :class="{ active: isSortActive('payment_mode'), desc: isSortActive('payment_mode') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
              <th scope="col" :aria-sort="getAriaSort('status')"><button class="sort-button" type="button" @click="setSort('status')"><span>Estado</span><span class="sort-indicator" :class="{ active: isSortActive('status'), desc: isSortActive('status') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
              <th scope="col">Codigo</th>
              <th scope="col" :aria-sort="getAriaSort('expires_at')"><button class="sort-button" type="button" @click="setSort('expires_at')"><span>Expira</span><span class="sort-indicator" :class="{ active: isSortActive('expires_at'), desc: isSortActive('expires_at') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
              <th v-if="showCreatedAt" scope="col" :aria-sort="getAriaSort('created_at')"><button class="sort-button" type="button" @click="setSort('created_at')"><span>Creado</span><span class="sort-indicator" :class="{ active: isSortActive('created_at'), desc: isSortActive('created_at') && sortDir === 'desc' }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg></span></button></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in list"
              :key="String(item.id)"
              class="table-row"
              :class="{ 'is-selected': item.id === selectedId }"
              tabindex="0"
              :aria-label="`Ver detalle de onboarding ${item.id ?? ''}`"
              :aria-selected="item.id === selectedId"
              @click="openOnboarding(item)"
              @keydown.enter.prevent="openOnboarding(item)"
              @keydown.space.prevent="openOnboarding(item)">
              <td>{{ item.id ?? '-' }}</td>
              <td>{{ item.client_name ?? '-' }}</td>
              <td>{{ item.plan_name ?? '-' }}</td>
              <td>{{ formatPaymentMode(item.payment_mode) }}</td>
              <td><span class="status-badge" :class="statusClass(item.status)">{{ formatStatus(item.status) }}</span></td>
              <td>
                <div class="code-cell">
                  <span>{{ item.token_short_code ?? '-' }}</span>
                  <button
                    v-if="item.token_short_code"
                    class="copy-code-btn"
                    type="button"
                    title="Copiar codigo"
                    :aria-label="`Copiar codigo ${item.token_short_code}`"
                    @click.stop="copyAccessCode(item.token_short_code)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copiar</span>
                  </button>
                </div>
              </td>
              <td>{{ formatDateTime(item.expires_at) }}</td>
              <td v-if="showCreatedAt">{{ formatDateTime(item.created_at) }}</td>
            </tr>
            <tr v-if="!list.length">
              <td :colspan="showCreatedAt ? 8 : 7" class="bo-empty">No encontramos onboardings con los filtros actuales.</td>
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
                :disabled="item === '...'"
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

        <div v-if="!hasSelection" class="bo-muted">Selecciona un onboarding para ver el detalle.</div>
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
            <strong v-if="!isEditing" class="dbl-edit-trigger" title="Doble clic para editar" @dblclick.stop="startEdit">{{ selectedPlanLabel }}</strong>
            <select v-else v-model="editForm.plan_id">
              <option value="">Selecciona un plan</option>
              <option v-for="plan in planOptions" :key="String(plan.id)" :value="String(plan.id)">{{ plan.label }}</option>
            </select>
          </div>

          <div class="detail-row">
            <span>Modo de pago</span>
            <strong v-if="!isEditing" class="dbl-edit-trigger" title="Doble clic para editar" @dblclick.stop="startEdit">{{ formatPaymentMode(selected.payment_mode) }}</strong>
            <select v-else v-model="editForm.payment_mode">
              <option value="paid">Pago</option>
              <option value="gift">Regalo</option>
            </select>
          </div>

          <div class="detail-row">
            <span>Estado</span>
            <strong><span class="status-badge" :class="statusClass(selected.status)">{{ formatStatus(selected.status) }}</span></strong>
          </div>

          <div class="detail-row">
            <span>Codigo acceso</span>
            <div class="detail-code">
              <strong>{{ selected.token_short_code ?? '-' }}</strong>
              <button
                v-if="selected.token_short_code"
                class="copy-code-btn"
                type="button"
                title="Copiar codigo"
                :aria-label="`Copiar codigo ${selected.token_short_code}`"
                @click="copyAccessCode(selected.token_short_code)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copiar</span>
              </button>
            </div>
          </div>

          <div class="detail-row">
            <span>Token utilizado</span>
            <strong>{{ formatTokenUsed(selected.token_used) }}</strong>
          </div>

          <div class="detail-row">
            <span>Expira</span>
            <strong>{{ formatDateTime(selected.expires_at ?? selected.token_expire) }}</strong>
          </div>

          <div class="detail-row">
            <span>Completado</span>
            <strong>{{ formatDateTime(selected.completed_at) }}</strong>
          </div>

          <div class="detail-row">
            <span>Creado por</span>
            <strong>{{ selected.creator_name ?? selected.creator_email ?? '-' }}</strong>
          </div>

          <div class="detail-row">
            <span>Creado</span>
            <strong>{{ formatDateTime(selected.created_at) }}</strong>
          </div>

          <div class="detail-actions">
            <div class="detail-actions-main">
              <button class="btn-outline" type="button" :disabled="isSaving || isCanceling || isResending" @click="isEditing ? saveEdit() : startEdit()">
                {{ isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Editar' }}
              </button>
              <button v-if="isEditing" class="btn-link" type="button" :disabled="isSaving" @click="cancelEdit">Cancelar</button>
            </div>
            <div class="detail-actions-secondary">
              <button class="btn-outline" type="button" :disabled="isEditing || isResending || !canResend" @click="openResendModal">
                {{ isResending ? 'Reenviando...' : 'Reenviar acceso' }}
              </button>
              <button class="btn-danger" type="button" :class="{ disabled: isEditing || !canCancel }" :disabled="isCanceling || isEditing || !canCancel" @click="openCancelConfirm">
                {{ isCanceling ? 'Cancelando...' : 'Cancelar onboarding' }}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <div
      v-if="isCreateModalOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crear onboarding"
      @click.self="closeCreateModal">
      <div class="modal-card" @click.stop>
        <h3>Crear onboarding</h3>
        <div class="modal-form">
          <label>
            <span>Plan</span>
            <select v-model="createForm.plan_id">
              <option value="">Selecciona un plan</option>
              <option v-for="plan in planOptions" :key="String(plan.id)" :value="String(plan.id)">{{ plan.label }}</option>
            </select>
          </label>
          <label>
            <span>Modo de pago</span>
            <select v-model="createForm.payment_mode">
              <option value="paid">Pago</option>
              <option value="gift">Regalo</option>
            </select>
          </label>
          <label>
            <span>Expira en (dias)</span>
            <input v-model="createForm.expires_in_days" type="number" min="1" placeholder="Ej: 2" />
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isCreateLoading" @click="closeCreateModal">Cancelar</button>
          <button class="primary-action" type="button" :disabled="isCreateLoading" @click="submitCreate">
            {{ isCreateLoading ? 'Creando...' : 'Crear onboarding' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isCancelConfirmOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar cancelacion de onboarding"
      @click.self="closeCancelConfirm">
      <div class="modal-card confirm-card" @click.stop>
        <h3>Cancelar onboarding</h3>
        <p>
          Vas a cancelar el onboarding de <strong>{{ selected?.client_name ?? 'este cliente' }}</strong>.
          El enlace actual dejara de estar disponible.
        </p>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isCanceling" @click="closeCancelConfirm">Volver</button>
          <button class="btn-danger" type="button" :disabled="isCanceling" @click="confirmCancel">
            {{ isCanceling ? 'Cancelando...' : 'Confirmar cancelacion' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isResendModalOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Reenviar acceso de onboarding"
      @click.self="closeResendModal">
      <div class="modal-card confirm-card" @click.stop>
        <h3>Reenviar acceso</h3>
        <p>Generaremos un nuevo vencimiento para el enlace de onboarding.</p>
        <div class="modal-form">
          <label class="full-width">
            <span>Nuevo vencimiento (dias)</span>
            <input v-model="resendForm.expires_in_days" type="number" min="1" placeholder="Ej: 2" />
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" type="button" :disabled="isResending" @click="closeResendModal">Cancelar</button>
          <button class="primary-action" type="button" :disabled="isResending" @click="submitResend">
            {{ isResending ? 'Reenviando...' : 'Reenviar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bo-page {
  display: grid;
  gap: 24px;
}

.bo-page-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 8px;
}

.bo-page-header h1 {
  margin: 0;
}

.bo-divider {
  grid-column: 1 / -1;
  height: 1px;
  background: #ece7f8;
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

.primary-action {
  border: 1px solid transparent;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
}

.primary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.field--payment {
  grid-column: 2;
  grid-row: 1;
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
.field select,
.detail-row input,
.detail-row select,
.modal-form input,
.modal-form select {
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
  background: rgba(245, 158, 11, 0.14);
  color: #92400e;
}

.status-badge.completed {
  background: rgba(16, 185, 129, 0.14);
  color: #0f766e;
}

.status-badge.canceled {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.status-badge.sent {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.code-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.copy-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #e2ddf7;
  border-radius: 999px;
  background: #fbfaff;
  color: #6d28d9;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.copy-code-btn svg {
  width: 13px;
  height: 13px;
}

.copy-code-btn:hover,
.copy-code-btn:focus-visible {
  background: var(--gradient-brand);
  color: #fff;
  border-color: rgba(155, 107, 255, 0.24);
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

.detail-code {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.dbl-edit-trigger {
  cursor: text;
}

.detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 6px;
}

.detail-actions-main,
.detail-actions-secondary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-outline {
  border: 1px solid #d9cff6;
  background: #fff;
  color: #5b21b6;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-danger {
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: #fff5f5;
  color: #b91c1c;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-danger.disabled {
  opacity: 0.5;
}

.btn-danger:disabled,
.btn-outline:disabled {
  cursor: not-allowed;
}

.btn-link {
  border: none;
  background: none;
  color: #7a4fd9;
  font-weight: 600;
  cursor: pointer;
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: 18px;
}

.modal-card {
  width: min(640px, 100%);
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 22px 45px rgba(15, 23, 42, 0.22);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.confirm-card {
  width: min(460px, 100%);
}

.modal-card h3 {
  margin: 0;
}

.modal-card p {
  margin: 0;
  color: #6b6b80;
  font-size: 14px;
}

.modal-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.full-width {
  grid-column: 1 / -1;
}

.modal-form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
    max-height: 520px;
    opacity: 1;
  }

  .bo-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filters-clear {
    grid-column: 3;
    grid-row: 1;
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

  .pagination-left,
  .pagination-right {
    justify-content: center;
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
    min-width: 920px;
  }

  .modal-form {
    grid-template-columns: 1fr;
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
  }

  .field--status {
    grid-column: 1;
    grid-row: 1;
  }

  .field--payment {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .field input,
  .field select,
  .detail-row input,
  .detail-row select,
  .modal-form input,
  .modal-form select {
    padding: 12px;
    font-size: 14px;
  }

  .pagination-left,
  .pagination-right {
    width: 100%;
    justify-content: center;
    gap: 10px;
  }

  .pagination-right {
    font-size: 12px;
  }

  .per-page select {
    padding: 5px 8px;
    font-size: 12px;
  }

  .detail-actions {
    align-items: flex-start;
  }

  .detail-actions-main,
  .detail-actions-secondary {
    width: 100%;
  }
}
</style>

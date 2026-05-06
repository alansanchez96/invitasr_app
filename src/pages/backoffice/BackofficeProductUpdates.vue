<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createProductUpdate,
  deleteProductUpdate,
  listMasterProductUpdates,
  notifyProductUpdate,
  updateProductUpdate,
  type ProductUpdateItem,
  type ProductUpdatePayload,
  type ProductUpdateStatus,
} from '@/services/productUpdates'
import { notifyError, notifySuccess } from '@/utils/toast'

type FormState = {
  version: string
  title: string
  summary: string
  body: string
  changesText: string
  status: 'draft' | 'published' | 'archived'
}

const filters = reactive({
  search: '',
  status: '' as ProductUpdateStatus,
  page: 1,
  perPage: 10,
})

const list = ref<ProductUpdateItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const notifyingId = ref<number | null>(null)
const selected = ref<ProductUpdateItem | null>(null)
const showForm = ref(false)
const confirmDeleteId = ref<number | null>(null)
let filterTimer: number | undefined

const sortField = ref<'id' | 'version' | 'title' | 'status' | 'published_at' | 'created_at'>('published_at')
const sortDir = ref<'asc' | 'desc'>('desc')
const perPageOptions = [10, 15, 25, 50]

const form = reactive<FormState>({
  version: '',
  title: '',
  summary: '',
  body: '',
  changesText: '',
  status: 'draft',
})

const activeSortLabel = computed(() => {
  if (sortField.value === 'version') return `Versión ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  if (sortField.value === 'title') return `Título ${sortDir.value === 'asc' ? 'A - Z' : 'Z - A'}`
  if (sortField.value === 'status') return sortDir.value === 'asc' ? 'Borradores primero' : 'Publicadas primero'
  if (sortField.value === 'created_at') return sortDir.value === 'asc' ? 'Creación: antiguas primero' : 'Creación: recientes primero'
  return sortDir.value === 'asc' ? 'Publicación: antiguas primero' : 'Publicación: recientes primero'
})

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const statusLabel = (value?: string) => {
  if (value === 'published') return 'Publicada'
  if (value === 'archived') return 'Archivada'
  return 'Borrador'
}

const hydrateForm = (item: ProductUpdateItem | null) => {
  form.version = item?.version ?? ''
  form.title = item?.title ?? ''
  form.summary = item?.summary ?? ''
  form.body = item?.body ?? ''
  form.changesText = item?.changes.join('\n') ?? ''
  form.status = (item?.status || 'draft') as FormState['status']
}

const buildPayload = (): ProductUpdatePayload => ({
  version: form.version.trim(),
  title: form.title.trim(),
  summary: form.summary.trim(),
  body: form.body.trim() || null,
  status: form.status,
  changes: form.changesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean),
})

const fetchList = async () => {
  isLoading.value = true
  try {
    const result = await listMasterProductUpdates({
      ...filters,
      orderField: sortField.value,
      orderDirection: sortDir.value,
    })
    list.value = result.items
    total.value = result.total
    lastPage.value = result.lastPage
    filters.page = result.page
    filters.perPage = result.perPage
  } catch {
    notifyError('No pudimos cargar las actualizaciones.')
  } finally {
    isLoading.value = false
  }
}

const scheduleFetch = () => {
  if (filterTimer) window.clearTimeout(filterTimer)
  filterTimer = window.setTimeout(() => {
    filters.page = 1
    fetchList()
  }, 260)
}

const setSort = (field: typeof sortField.value) => {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
  fetchList()
}

const openCreate = () => {
  selected.value = null
  hydrateForm(null)
  showForm.value = true
}

const openEdit = (item: ProductUpdateItem) => {
  selected.value = item
  hydrateForm(item)
  showForm.value = true
}

const closeForm = () => {
  if (isSaving.value) return
  showForm.value = false
  selected.value = null
}

const submitForm = async () => {
  const payload = buildPayload()
  if (!payload.version || !payload.title || !payload.summary) {
    notifyError('Versión, título y resumen son obligatorios.')
    return
  }

  isSaving.value = true
  try {
    const result = selected.value
      ? await updateProductUpdate(selected.value.id, payload)
      : await createProductUpdate(payload)
    notifySuccess(result.message)
    showForm.value = false
    selected.value = null
    await fetchList()
  } catch (error) {
    const payloadError = error as { message?: string }
    notifyError(payloadError?.message ?? 'No pudimos guardar la actualización.')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (item: ProductUpdateItem) => {
  confirmDeleteId.value = item.id
}

const runDelete = async () => {
  if (!confirmDeleteId.value) return
  isDeleting.value = true
  try {
    const result = await deleteProductUpdate(confirmDeleteId.value)
    notifySuccess(result.message)
    confirmDeleteId.value = null
    await fetchList()
  } catch {
    notifyError('No pudimos eliminar la actualización.')
  } finally {
    isDeleting.value = false
  }
}

const runNotify = async (item: ProductUpdateItem) => {
  notifyingId.value = item.id
  try {
    const result = await notifyProductUpdate(item.id)
    notifySuccess(`${result.message} Correos enviados: ${result.sent}.`)
    await fetchList()
  } catch (error) {
    const payloadError = error as { message?: string }
    notifyError(payloadError?.message ?? 'No pudimos notificar la actualización.')
  } finally {
    notifyingId.value = null
  }
}

const goToPage = (direction: 'prev' | 'next') => {
  if (direction === 'prev' && filters.page > 1) filters.page -= 1
  if (direction === 'next' && filters.page < lastPage.value) filters.page += 1
  fetchList()
}

watch(() => [filters.search, filters.status], scheduleFetch)
watch(() => filters.perPage, () => {
  filters.page = 1
  fetchList()
})

onMounted(fetchList)
</script>

<template>
  <div class="bo-page container">
    <header class="updates-header">
      <div>
        <p>Noticias y versiones</p>
        <h1>Actualizaciones de InvitaSR</h1>
        <span>Publica novedades visibles en la landing y notifica a clientes desde un solo lugar.</span>
      </div>
      <button class="primary-action" type="button" @click="openCreate">Nueva actualización</button>
    </header>

    <section class="filters-card">
      <label>
        <span>Buscar</span>
        <input v-model="filters.search" type="search" placeholder="Versión, título o mejora" />
      </label>
      <label>
        <span>Estado</span>
        <select v-model="filters.status">
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicada</option>
          <option value="archived">Archivada</option>
        </select>
      </label>
      <div class="table-controls">
        <select v-model.number="filters.perPage" aria-label="Cantidad de filas">
          <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
        </select>
        <button type="button" class="icon-control" :disabled="isLoading" title="Recargar" @click="fetchList">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>
    </section>

    <section class="table-card">
      <div class="table-head">
        <div>
          <h2>Listado</h2>
          <p>{{ activeSortLabel }}</p>
        </div>
        <span>Total: {{ total }}</span>
      </div>

      <div v-if="isLoading" class="state">Cargando actualizaciones...</div>
      <table v-else>
        <thead>
          <tr>
            <th><button type="button" @click="setSort('version')">Versión</button></th>
            <th><button type="button" @click="setSort('title')">Título</button></th>
            <th><button type="button" @click="setSort('status')">Estado</button></th>
            <th><button type="button" @click="setSort('published_at')">Publicada</button></th>
            <th>Notificación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td><strong>v{{ item.version }}</strong></td>
            <td>
              <div class="title-cell">
                <strong>{{ item.title }}</strong>
                <span>{{ item.summary }}</span>
              </div>
            </td>
            <td><span class="status-pill" :class="item.status">{{ statusLabel(item.status) }}</span></td>
            <td>{{ formatDate(item.published_at) }}</td>
            <td>
              <span v-if="item.notified_at">Enviada a {{ item.notification_sent_count }}</span>
              <span v-else>Sin enviar</span>
            </td>
            <td>
              <div class="row-actions">
                <button type="button" title="Editar" @click="openEdit(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Notificar"
                  :disabled="item.status !== 'published' || Boolean(item.notified_at) || notifyingId === item.id"
                  @click="runNotify(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
                <button type="button" title="Eliminar" @click="confirmDelete(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="m7 6 1 14h8l1-14" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="6" class="empty">Todavía no hay actualizaciones para mostrar.</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button type="button" :disabled="filters.page <= 1" @click="goToPage('prev')">← Anterior</button>
        <span>Página {{ filters.page }} de {{ lastPage }}</span>
        <button type="button" :disabled="filters.page >= lastPage" @click="goToPage('next')">Siguiente →</button>
      </div>
    </section>

    <div v-if="showForm" class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="update-modal" @submit.prevent="submitForm">
        <header>
          <div>
            <p>Versión de app</p>
            <h2>{{ selected ? 'Editar actualización' : 'Nueva actualización' }}</h2>
          </div>
          <button type="button" class="modal-close" @click="closeForm">×</button>
        </header>

        <div class="form-grid">
          <label>
            <span>Versión</span>
            <input v-model="form.version" type="text" placeholder="1.2.0" />
          </label>
          <label>
            <span>Estado</span>
            <select v-model="form.status">
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
              <option value="archived">Archivada</option>
            </select>
          </label>
          <label class="full">
            <span>Título</span>
            <input v-model="form.title" type="text" placeholder="Editor más simple y rápido" />
          </label>
          <label class="full">
            <span>Resumen visible</span>
            <textarea v-model="form.summary" rows="3" placeholder="Cuenta qué mejora esta versión y por qué le importa al cliente."></textarea>
          </label>
          <label class="full">
            <span>Funcionalidades o mejoras</span>
            <textarea v-model="form.changesText" rows="6" placeholder="Una mejora por línea"></textarea>
          </label>
          <label class="full">
            <span>Detalle interno o ampliado</span>
            <textarea v-model="form.body" rows="5" placeholder="Opcional"></textarea>
          </label>
        </div>

        <footer>
          <button type="button" class="secondary-action" @click="closeForm">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="isSaving">
            {{ isSaving ? 'Guardando...' : 'Guardar actualización' }}
          </button>
        </footer>
      </form>
    </div>

    <div v-if="confirmDeleteId" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="confirm-modal">
        <h2>Eliminar actualización</h2>
        <p>Esta noticia dejará de aparecer en la landing. Puedes crear otra versión cuando lo necesites.</p>
        <footer>
          <button type="button" class="secondary-action" @click="confirmDeleteId = null">Cancelar</button>
          <button type="button" class="danger-action" :disabled="isDeleting" @click="runDelete">
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bo-page {
  display: grid;
  gap: 22px;
}

.updates-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.updates-header p,
.update-modal header p {
  margin: 0 0 6px;
  color: #8e6ed4;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.updates-header h1,
.update-modal h2,
.confirm-modal h2 {
  margin: 0;
  color: #24123f;
}

.updates-header span {
  display: block;
  margin-top: 8px;
  color: #6b5a82;
}

.filters-card,
.table-card,
.update-modal,
.confirm-modal {
  border: 1px solid #eadfff;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 52px rgba(122, 79, 217, 0.1);
}

.filters-card {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 220px auto;
  gap: 14px;
  align-items: end;
  padding: 18px;
}

label {
  display: grid;
  gap: 8px;
  color: #2d1a48;
  font-weight: 800;
}

label span {
  font-size: 13px;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #dfd4f5;
  border-radius: 14px;
  background: #fff;
  color: #24123f;
  padding: 12px 14px;
  font: inherit;
}

textarea {
  resize: vertical;
}

.table-controls {
  display: inline-flex;
  justify-content: flex-end;
  gap: 10px;
}

.table-controls select {
  width: 82px;
}

.primary-action,
.secondary-action,
.danger-action,
.icon-control,
.row-actions button {
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 900;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.primary-action {
  border-radius: 14px;
  padding: 12px 18px;
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
  color: #fff;
  box-shadow: 0 16px 34px rgba(122, 79, 217, 0.2);
}

.secondary-action {
  border-color: #dfd4f5;
  border-radius: 14px;
  padding: 12px 18px;
  background: #fff;
  color: #4b2f78;
}

.danger-action {
  border-color: rgba(239, 68, 68, 0.22);
  border-radius: 14px;
  padding: 12px 18px;
  background: #fff0f1;
  color: #b91c1c;
}

.primary-action:hover,
.secondary-action:hover,
.danger-action:hover,
.icon-control:hover,
.row-actions button:hover {
  transform: translateY(-1px);
}

.primary-action:disabled,
.row-actions button:disabled,
.icon-control:disabled,
.danger-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.icon-control,
.row-actions button {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border-color: #dfd4f5;
  background: #fff;
  color: #6d3fd3;
  display: inline-grid;
  place-items: center;
}

.icon-control svg,
.row-actions svg {
  width: 18px;
  height: 18px;
}

.table-card {
  padding: 20px;
  overflow-x: auto;
}

.table-head,
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.table-head h2,
.table-head p {
  margin: 0;
}

.table-head p {
  margin-top: 6px;
  width: fit-content;
  border: 1px solid rgba(111, 57, 187, 0.2);
  border-radius: 999px;
  padding: 8px 12px;
  background: #fbf7ff;
  color: #4f357f;
  font-size: 12px;
  font-weight: 800;
}

table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  margin-top: 18px;
}

th,
td {
  border-bottom: 1px solid #eee8f8;
  padding: 15px 12px;
  text-align: left;
  color: #2d1a48;
  vertical-align: top;
}

th {
  color: #73618d;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

th button {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.title-cell {
  display: grid;
  gap: 4px;
  max-width: 420px;
}

.title-cell span {
  color: #75658f;
  line-height: 1.45;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(122, 79, 217, 0.11);
  color: #6d3fd3;
  font-weight: 900;
  font-size: 12px;
}

.status-pill.published {
  background: rgba(16, 185, 129, 0.13);
  color: #047857;
}

.status-pill.archived {
  background: rgba(100, 116, 139, 0.14);
  color: #475569;
}

.row-actions {
  display: inline-flex;
  gap: 8px;
}

.empty,
.state {
  text-align: center;
  color: #75658f;
  font-weight: 800;
  padding: 24px !important;
}

.pagination {
  padding-top: 16px;
  color: #6b5a82;
  font-weight: 700;
}

.pagination button {
  border: 1px solid #dfd4f5;
  border-radius: 12px;
  background: #fff;
  padding: 10px 14px;
  color: #4b2f78;
  font-weight: 900;
  cursor: pointer;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(27, 18, 44, 0.52);
  backdrop-filter: blur(10px);
}

.update-modal {
  width: min(760px, 100%);
  max-height: min(88svh, 860px);
  overflow: auto;
  padding: 22px;
}

.update-modal header,
.update-modal footer,
.confirm-modal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-close {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid #dfd4f5;
  background: #fff;
  cursor: pointer;
  font-size: 22px;
  color: #32194f;
}

.form-grid {
  display: grid;
  grid-template-columns: 180px 180px minmax(0, 1fr);
  gap: 14px;
  margin: 20px 0;
}

.form-grid .full {
  grid-column: 1 / -1;
}

.confirm-modal {
  width: min(420px, 100%);
  padding: 24px;
}

.confirm-modal p {
  color: #6b5a82;
  line-height: 1.6;
}

@media (max-width: 820px) {
  .updates-header,
  .table-head,
  .pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .filters-card,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .table-controls {
    justify-content: space-between;
  }

  .pagination {
    text-align: center;
  }
}
</style>

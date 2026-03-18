<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { listClients, getClient, updateClientStatus, type ClientDetail, type ClientListItem } from '@/services/clients'
import BaseButton from '@/components/ui/BaseButton.vue'

type Filters = {
  status: '' | 'active' | 'inactive'
  country_code: string
  client_name: string
  db_name: string
  client_id: string
  page: number
  perPage: number
}

const filters = reactive<Filters>({
  status: '',
  country_code: '',
  client_name: '',
  db_name: '',
  client_id: '',
  page: 1,
  perPage: 10,
})

const list = ref<ClientListItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)

const selectedId = ref<string | number | null>(null)
const selected = ref<ClientDetail | null>(null)
const detailLoading = ref(false)
const updateLoading = ref(false)
const statusDraft = ref<'active' | 'inactive'>('active')
const detailError = ref<string | null>(null)

const hasSelection = computed(() => selectedId.value !== null)

const fetchList = async () => {
  isLoading.value = true
  error.value = null
  try {
    const result = await listClients(filters)
    list.value = result.list
    total.value = result.total
    lastPage.value = result.lastPage
  } catch {
    error.value = 'No pudimos cargar los clientes.'
  } finally {
    isLoading.value = false
  }
}

const openClient = async (item: ClientListItem) => {
  const id = item.id ?? item.client_id
  if (!id) return
  selectedId.value = id
  detailLoading.value = true
  detailError.value = null
  try {
    const data = await getClient(id)
    selected.value = data as ClientDetail
    const nextStatus = (data?.status as 'active' | 'inactive' | undefined) ?? 'active'
    statusDraft.value = nextStatus
  } catch {
    detailError.value = 'No pudimos cargar el detalle.'
  } finally {
    detailLoading.value = false
  }
}

const clearSelection = () => {
  selectedId.value = null
  selected.value = null
  detailError.value = null
}

const applyFilters = () => {
  filters.page = 1
  fetchList()
}

const resetFilters = () => {
  filters.status = ''
  filters.country_code = ''
  filters.client_name = ''
  filters.db_name = ''
  filters.client_id = ''
  filters.page = 1
  filters.perPage = 10
  fetchList()
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

const updateStatus = async () => {
  if (!selectedId.value) return
  updateLoading.value = true
  try {
    const data = await updateClientStatus(selectedId.value, statusDraft.value)
    selected.value = data as ClientDetail
    const matchIndex = list.value.findIndex(
      (item) => (item.id ?? item.client_id) === selectedId.value,
    )
    if (matchIndex >= 0) {
      list.value[matchIndex] = {
        ...list.value[matchIndex],
        status: statusDraft.value,
      }
    }
  } catch {
    detailError.value = 'No pudimos actualizar el estado.'
  } finally {
    updateLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="bo-page container">
    <header class="bo-page-header">
      <div>
        <h1>Clientes</h1>
        <p>Gestiona los clientes activos, suscripciones y estado general.</p>
      </div>
    </header>

    <section class="bo-card bo-filters">
      <div class="field">
        <label>Estado</label>
        <select v-model="filters.status">
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
      <div class="field">
        <label>Pais</label>
        <input v-model="filters.country_code" type="text" placeholder="AR, MX, CO" />
      </div>
      <div class="field">
        <label>Nombre cliente</label>
        <input v-model="filters.client_name" type="text" placeholder="Ej: Alan" />
      </div>
      <div class="field">
        <label>Base de datos</label>
        <input v-model="filters.db_name" type="text" placeholder="invita_alan" />
      </div>
      <div class="field">
        <label>ID cliente</label>
        <input v-model="filters.client_id" type="text" placeholder="ID interno" />
      </div>
      <div class="filters-actions">
        <BaseButton variant="primary" type="button" @click="applyFilters">Buscar</BaseButton>
        <BaseButton variant="ghost" type="button" @click="resetFilters">Limpiar</BaseButton>
      </div>
    </section>

    <section class="bo-content">
      <div class="bo-card bo-table">
        <div class="bo-table-header">
          <h2>Listado</h2>
          <span class="bo-muted">Total: {{ total }}</span>
        </div>

        <div v-if="error" class="bo-error">{{ error }}</div>
        <div v-else-if="isLoading" class="bo-loading">Cargando clientes...</div>

        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>DB</th>
              <th>Pais</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="String(item.id ?? item.client_id)">
              <td>{{ item.id ?? item.client_id ?? '-' }}</td>
              <td>{{ item.client_name ?? item.name ?? '-' }}</td>
              <td>{{ item.email ?? '-' }}</td>
              <td>
                <span class="status" :class="item.status">{{ item.status ?? '-' }}</span>
              </td>
              <td>{{ item.db_name ?? '-' }}</td>
              <td>{{ item.country_code ?? '-' }}</td>
              <td>
                <button class="link-button" type="button" @click="openClient(item)">Ver</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="bo-pagination">
          <button type="button" @click="goToPage('prev')" :disabled="filters.page <= 1">Anterior</button>
          <span>Pagina {{ filters.page }} de {{ lastPage }}</span>
          <button type="button" @click="goToPage('next')" :disabled="filters.page >= lastPage">Siguiente</button>
        </div>
      </div>

      <aside class="bo-card bo-detail" :class="{ empty: !hasSelection }">
        <header class="bo-detail-header">
          <h2>Detalle</h2>
          <button v-if="hasSelection" class="link-button" type="button" @click="clearSelection">Cerrar</button>
        </header>

        <div v-if="!hasSelection" class="bo-muted">Selecciona un cliente para ver el detalle.</div>
        <div v-else-if="detailLoading" class="bo-loading">Cargando detalle...</div>
        <div v-else-if="detailError" class="bo-error">{{ detailError }}</div>
        <div v-else-if="selected" class="bo-detail-body">
          <div class="detail-row">
            <span>Nombre</span>
            <strong>{{ selected.client_name ?? selected.name ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Correo</span>
            <strong>{{ selected.email ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Base de datos</span>
            <strong>{{ selected.db_name ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Pais</span>
            <strong>{{ selected.country_code ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>Estado</span>
            <select v-model="statusDraft">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <BaseButton variant="primary" type="button" :disabled="updateLoading" @click="updateStatus">
            {{ updateLoading ? 'Actualizando...' : 'Actualizar estado' }}
          </BaseButton>
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

.bo-page-header p {
  color: #6b6b80;
}

.bo-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 18px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.bo-filters {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  align-items: end;
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

.filters-actions {
  display: flex;
  gap: 10px;
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
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid #edf0f6;
  font-size: 13px;
}

.bo-table th {
  color: #6b6b80;
  font-weight: 600;
}

.bo-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bo-pagination {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  font-size: 13px;
  color: #6b6b80;
}

.bo-pagination button {
  background: none;
  border: none;
  font-weight: 600;
  color: #7a4fd9;
  cursor: pointer;
}

.bo-pagination button:disabled {
  color: #bdb7d6;
  cursor: not-allowed;
}

.bo-detail {
  display: grid;
  gap: 16px;
  align-content: start;
}

.bo-detail.empty {
  color: #9b93b0;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.detail-row select {
  border-radius: 10px;
  border: 1px solid #e2ddf7;
  padding: 6px 10px;
}

.bo-muted {
  color: #6b6b80;
  font-size: 13px;
}

.bo-error {
  color: #b91c1c;
  font-weight: 600;
  padding: 12px 0;
}

.bo-loading {
  color: #6b6b80;
  padding: 12px 0;
}

.status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #f3f0ff;
  color: #7a4fd9;
}

.status.inactive {
  background: #ffe8ea;
  color: #b91c1c;
}

.link-button {
  background: none;
  border: none;
  color: #7a4fd9;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 1010px) {
  .bo-content {
    grid-template-columns: 1fr;
  }
}
</style>

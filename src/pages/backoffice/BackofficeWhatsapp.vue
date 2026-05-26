<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  listWhatsappChats,
  listWhatsappLogs,
  listWhatsappMessages,
  listWhatsappTenants,
  type WhatsappChat,
  type WhatsappMessage,
  type WhatsappSummary,
  type WhatsappTenant,
} from '@/services/whatsappBackoffice'
import { notifyError } from '@/utils/toast'

const tenants = ref<WhatsappTenant[]>([])
const selectedTenantId = ref<number | null>(null)
const activeTab = ref<'chats' | 'logs'>('chats')
const chats = ref<WhatsappChat[]>([])
const selectedChatPhone = ref('')
const messages = ref<WhatsappMessage[]>([])
const logs = ref<WhatsappMessage[]>([])
const logsSummary = ref<WhatsappSummary | null>(null)
const loadingTenants = ref(false)
const loadingChats = ref(false)
const loadingMessages = ref(false)
const loadingLogs = ref(false)

const logFilters = reactive({
  status: '',
  direction: '',
  phone: '',
  page: 1,
  perPage: 25,
  lastPage: 1,
  total: 0,
})

const selectedTenant = computed(() =>
  tenants.value.find((tenant) => tenant.id === selectedTenantId.value) ?? null,
)

const selectedChat = computed(() =>
  chats.value.find((chat) => chat.participant_phone === selectedChatPhone.value) ?? null,
)

const selectedTenantQueryable = computed(() => Boolean(selectedTenant.value?.is_queryable))

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const statusLabel = (value?: string) => {
  const status = String(value ?? '').toLowerCase()
  if (status === 'accepted') return 'Aceptado'
  if (status === 'received') return 'Recibido'
  if (status === 'delivered') return 'Entregado'
  if (status === 'read') return 'Leído'
  if (status === 'failed') return 'Fallido'
  if (status === 'skipped') return 'Omitido'
  return 'Pendiente'
}

const directionLabel = (value?: string) =>
  String(value ?? '').toLowerCase() === 'inbound' ? 'Entrante' : 'Saliente'

const messageText = (message: WhatsappMessage) => {
  if (message.body_text) return message.body_text
  if (message.template_name) return `Plantilla: ${message.template_name}`
  return message.message_type || 'Mensaje'
}

const prettyJson = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

const loadTenants = async () => {
  loadingTenants.value = true
  try {
    tenants.value = await listWhatsappTenants()
    if (!selectedTenantId.value && tenants.value.length) {
      selectedTenantId.value = tenants.value[0]?.id ?? null
    }
  } catch {
    notifyError('No se pudieron cargar los tenants.')
  } finally {
    loadingTenants.value = false
  }
}

const loadChats = async () => {
  if (!selectedTenantId.value || !selectedTenantQueryable.value) {
    chats.value = []
    selectedChatPhone.value = ''
    messages.value = []
    return
  }

  loadingChats.value = true
  try {
    chats.value = await listWhatsappChats(selectedTenantId.value)
    if (!selectedChatPhone.value && chats.value.length) {
      selectedChatPhone.value = chats.value[0]?.participant_phone ?? ''
    }
  } catch {
    notifyError('No se pudieron cargar los chats de WhatsApp.')
  } finally {
    loadingChats.value = false
  }
}

const loadMessages = async () => {
  if (!selectedTenantId.value || !selectedChatPhone.value) {
    messages.value = []
    return
  }

  loadingMessages.value = true
  try {
    messages.value = await listWhatsappMessages(selectedTenantId.value, selectedChatPhone.value)
  } catch {
    notifyError('No se pudo cargar la conversación.')
  } finally {
    loadingMessages.value = false
  }
}

const loadLogs = async () => {
  if (!selectedTenantId.value || !selectedTenantQueryable.value) {
    logs.value = []
    logsSummary.value = null
    return
  }

  loadingLogs.value = true
  try {
    const result = await listWhatsappLogs({
      tenant_id: selectedTenantId.value,
      status: logFilters.status,
      direction: logFilters.direction,
      phone: logFilters.phone,
      page: logFilters.page,
      perPage: logFilters.perPage,
    })
    logs.value = result.items
    logsSummary.value = result.summary
    logFilters.page = result.pagination.current_page
    logFilters.lastPage = result.pagination.last_page
    logFilters.total = result.pagination.total
  } catch {
    notifyError('No se pudieron cargar los logs de WhatsApp.')
  } finally {
    loadingLogs.value = false
  }
}

const selectChat = (chat: WhatsappChat) => {
  selectedChatPhone.value = chat.participant_phone
}

const resetLogPage = () => {
  logFilters.page = 1
  void loadLogs()
}

watch(selectedTenantId, () => {
  selectedChatPhone.value = ''
  messages.value = []
  logs.value = []
  logFilters.page = 1
  void loadChats()
  void loadLogs()
})

watch(selectedChatPhone, () => {
  void loadMessages()
})

onMounted(() => {
  void loadTenants()
})
</script>

<template>
  <section class="container whatsapp-page" aria-labelledby="whatsapp-title">
    <header class="whatsapp-head">
      <div>
        <h1 id="whatsapp-title">WhatsApp</h1>
        <p>Conversaciones y monitoreo de mensajes enviados desde la plataforma.</p>
      </div>
      <label class="tenant-picker">
        <span>Tenant</span>
        <select v-model.number="selectedTenantId" :disabled="loadingTenants">
          <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
            {{ tenant.client_name }} · {{ tenant.status }} · {{ tenant.db_name }}
          </option>
        </select>
      </label>
    </header>

    <section v-if="selectedTenant" class="tenant-summary">
      <article>
        <span>Total</span>
        <strong>{{ selectedTenant.whatsapp_counts.total }}</strong>
      </article>
      <article>
        <span>Aceptados</span>
        <strong>{{ selectedTenant.whatsapp_counts.accepted }}</strong>
      </article>
      <article>
        <span>Fallidos</span>
        <strong>{{ selectedTenant.whatsapp_counts.failed }}</strong>
      </article>
      <article>
        <span>Omitidos</span>
        <strong>{{ selectedTenant.whatsapp_counts.skipped }}</strong>
      </article>
    </section>

    <div class="whatsapp-tabs" role="tablist" aria-label="Vistas WhatsApp">
      <button type="button" :class="{ active: activeTab === 'chats' }" @click="activeTab = 'chats'">Chats</button>
      <button type="button" :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">Monitoreo</button>
    </div>

    <section v-if="selectedTenant && !selectedTenantQueryable" class="bo-card whatsapp-empty">
      Este tenant no tiene una base operativa consultable o aún no tiene la tabla de WhatsApp.
    </section>

    <section v-else-if="activeTab === 'chats'" class="whatsapp-chat-layout">
      <aside class="bo-card chat-list">
        <header>
          <h2>Chats</h2>
          <span>{{ chats.length }} conversaciones</span>
        </header>
        <p v-if="loadingChats" class="muted">Cargando chats...</p>
        <p v-else-if="!chats.length" class="muted">Todavía no hay conversaciones registradas.</p>
        <button
          v-for="chat in chats"
          :key="chat.participant_phone"
          type="button"
          class="chat-row"
          :class="{ active: chat.participant_phone === selectedChatPhone }"
          @click="selectChat(chat)">
          <strong>{{ chat.participant_name || chat.participant_phone }}</strong>
          <span>{{ chat.participant_phone }}</span>
          <small>{{ chat.last_text }} · {{ statusLabel(chat.last_status) }}</small>
        </button>
      </aside>

      <article class="bo-card conversation-panel">
        <header class="conversation-head">
          <div>
            <h2>{{ selectedChat?.participant_name || selectedChat?.participant_phone || 'Conversación' }}</h2>
            <span>{{ selectedChat?.invitation_title || 'Sin invitación asociada' }}</span>
          </div>
          <span>{{ selectedChatPhone }}</span>
        </header>

        <div v-if="loadingMessages" class="conversation-state">Cargando conversación...</div>
        <div v-else-if="!messages.length" class="conversation-state">Selecciona un chat para ver el historial.</div>
        <div v-else class="conversation-feed">
          <article
            v-for="message in messages"
            :key="message.id"
            class="message-bubble"
            :class="message.direction === 'inbound' ? 'inbound' : 'outbound'">
            <p>{{ messageText(message) }}</p>
            <footer>
              <span>{{ directionLabel(message.direction) }}</span>
              <span>{{ statusLabel(message.delivery_status) }}</span>
              <span>{{ formatDate(message.created_at) }}</span>
            </footer>
          </article>
        </div>
      </article>
    </section>

    <section v-else class="bo-card logs-panel">
      <header class="logs-head">
        <div>
          <h2>Monitoreo de WhatsApp</h2>
          <p>{{ logsSummary?.total ?? 0 }} registros encontrados</p>
        </div>
        <div class="log-filters">
          <select v-model="logFilters.status" @change="resetLogPage">
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="accepted">Aceptado</option>
            <option value="received">Recibido</option>
            <option value="failed">Fallido</option>
            <option value="skipped">Omitido</option>
            <option value="delivered">Entregado</option>
            <option value="read">Leído</option>
          </select>
          <select v-model="logFilters.direction" @change="resetLogPage">
            <option value="">Todas las direcciones</option>
            <option value="outbound">Saliente</option>
            <option value="inbound">Entrante</option>
          </select>
          <input v-model="logFilters.phone" type="search" placeholder="Teléfono" @keydown.enter="resetLogPage" />
          <button type="button" @click="resetLogPage">Buscar</button>
        </div>
      </header>

      <div v-if="loadingLogs" class="whatsapp-empty">Cargando logs...</div>
      <div v-else-if="!logs.length" class="whatsapp-empty">No hay logs para los filtros seleccionados.</div>
      <div v-else class="logs-table-wrap">
        <table class="logs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>HTTP</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in logs" :key="item.id">
              <td>#{{ item.id }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>{{ directionLabel(item.direction) }}</td>
              <td>{{ item.participant_phone || item.recipient_phone || '-' }}</td>
              <td>{{ item.content_type }} · {{ item.message_type }}</td>
              <td><span class="status-pill" :class="item.delivery_status">{{ statusLabel(item.delivery_status) }}</span></td>
              <td>{{ item.response_status_code ?? '-' }}</td>
              <td>
                <details>
                  <summary>{{ item.error_message || item.provider_message_id || item.template_name || 'Ver payload' }}</summary>
                  <pre>{{ prettyJson({ request: item.request_payload, response: item.response_body, error: item.error_message }) }}</pre>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="logs-pagination">
        <button type="button" :disabled="logFilters.page <= 1" @click="logFilters.page--; loadLogs()">Anterior</button>
        <span>Página {{ logFilters.page }} de {{ logFilters.lastPage }}</span>
        <button type="button" :disabled="logFilters.page >= logFilters.lastPage" @click="logFilters.page++; loadLogs()">Siguiente</button>
      </footer>
    </section>
  </section>
</template>

<style scoped>
.whatsapp-page {
  display: grid;
  gap: 16px;
}

.whatsapp-head,
.logs-head,
.conversation-head,
.chat-list header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.whatsapp-head h1,
.logs-head h2,
.conversation-head h2,
.chat-list h2 {
  margin: 0;
  color: #1f1633;
}

.whatsapp-head p,
.logs-head p,
.conversation-head span,
.muted {
  margin: 4px 0 0;
  color: #6b6478;
}

.tenant-picker {
  display: grid;
  gap: 6px;
  min-width: min(420px, 100%);
  font-weight: 800;
  color: #2b1a44;
}

.tenant-picker select,
.log-filters select,
.log-filters input {
  min-height: 40px;
  border: 1px solid #ded6ef;
  border-radius: 8px;
  background: #fff;
  color: #251837;
  padding: 0 12px;
  font: inherit;
}

.tenant-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.tenant-summary article {
  border: 1px solid #eadff7;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.tenant-summary span {
  display: block;
  color: #6b6478;
  font-size: 0.82rem;
  font-weight: 800;
}

.tenant-summary strong {
  display: block;
  margin-top: 4px;
  color: #211331;
  font-size: 1.6rem;
}

.whatsapp-tabs {
  display: flex;
  gap: 8px;
}

.whatsapp-tabs button,
.log-filters button,
.logs-pagination button {
  min-height: 38px;
  border: 1px solid #d8c9f0;
  border-radius: 8px;
  background: #fff;
  color: #4c247c;
  font-weight: 900;
  padding: 0 14px;
  cursor: pointer;
}

.whatsapp-tabs button.active,
.log-filters button {
  background: #6f3cc3;
  color: #fff;
}

.whatsapp-empty,
.conversation-state {
  padding: 24px;
  color: #6b6478;
}

.whatsapp-chat-layout {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 14px;
  min-height: 620px;
}

.chat-list {
  display: grid;
  align-content: start;
  gap: 8px;
  max-height: 720px;
  overflow: auto;
}

.chat-row {
  display: grid;
  gap: 3px;
  width: 100%;
  border: 1px solid #eee6f6;
  border-radius: 8px;
  background: #fff;
  color: #211331;
  text-align: left;
  padding: 10px;
  cursor: pointer;
}

.chat-row.active {
  border-color: #7b4ccc;
  background: #f4efff;
}

.chat-row span,
.chat-row small {
  color: #6b6478;
}

.conversation-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 620px;
}

.conversation-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  overflow: auto;
  background: #f8f6fb;
  border-radius: 8px;
}

.message-bubble {
  max-width: min(620px, 82%);
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(31, 22, 51, 0.08);
}

.message-bubble.outbound {
  align-self: flex-end;
  background: #6f3cc3;
  color: #fff;
}

.message-bubble.inbound {
  align-self: flex-start;
  background: #fff;
  color: #211331;
}

.message-bubble p {
  margin: 0;
  line-height: 1.45;
}

.message-bubble footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  opacity: 0.78;
  font-size: 0.74rem;
}

.logs-panel {
  display: grid;
  gap: 14px;
}

.log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.logs-table-wrap {
  overflow: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.logs-table th,
.logs-table td {
  border-bottom: 1px solid #eee6f6;
  padding: 10px;
  text-align: left;
  vertical-align: top;
}

.logs-table th {
  color: #514466;
  font-size: 0.78rem;
  text-transform: uppercase;
}

.logs-table pre {
  max-width: 520px;
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 8px;
  background: #efe9f8;
  color: #4c247c;
  font-size: 0.78rem;
  font-weight: 900;
}

.status-pill.failed {
  background: #ffe8e8;
  color: #a51f1f;
}

.status-pill.accepted,
.status-pill.delivered,
.status-pill.read {
  background: #e5f8ec;
  color: #19713a;
}

.logs-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 900px) {
  .whatsapp-head,
  .logs-head {
    align-items: stretch;
    flex-direction: column;
  }

  .tenant-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .whatsapp-chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>

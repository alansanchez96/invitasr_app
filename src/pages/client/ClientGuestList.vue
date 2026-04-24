<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  getTenantInvitationRsvpResponses,
  listTenantInvitations,
  type TenantInvitationItem,
  type TenantInvitationRsvpResponse,
} from '@/services/tenantInvitations'

type ConfirmedGuest = {
  id: number
  invitationId: number | null
  invitationTitle: string
  fullName: string
  dietaryRestrictions: string
  confirmedAt: string | null
}

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const selectedInvitationId = ref('all')
const search = ref('')
const invitations = ref<TenantInvitationItem[]>([])
const guests = ref<ConfirmedGuest[]>([])

const publishedInvitations = computed(() =>
  invitations.value.filter((invitation) => String(invitation.status ?? '').toLowerCase() === 'published'),
)

const filteredGuests = computed(() => {
  const term = search.value.trim().toLowerCase()

  return guests.value.filter((guest) => {
    if (selectedInvitationId.value !== 'all' && String(guest.invitationId ?? '') !== selectedInvitationId.value) {
      return false
    }

    if (!term) return true

    return (
      guest.fullName.toLowerCase().includes(term)
      || guest.invitationTitle.toLowerCase().includes(term)
      || guest.dietaryRestrictions.toLowerCase().includes(term)
    )
  })
})

const summary = computed(() => ({
  totalGuests: guests.value.length,
  totalInvitations: publishedInvitations.value.length,
}))

const toGuest = (item: TenantInvitationRsvpResponse): ConfirmedGuest => ({
  id: Number(item.id ?? 0),
  invitationId: Number(item.invitation_id ?? 0) || null,
  invitationTitle: String(item.invitation_title ?? 'Invitación'),
  fullName: String(item.full_name ?? '').trim() || 'Invitado confirmado',
  dietaryRestrictions: String(item.dietary_restrictions ?? 'Sin datos').trim() || 'Sin datos',
  confirmedAt: item.confirmed_at ?? null,
})

const formatDate = (value: string | null) => {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return date.toLocaleString()
}

const loadData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const [invitationResult, rsvpResult] = await Promise.all([
      listTenantInvitations({ page: 1, perPage: 100 }),
      getTenantInvitationRsvpResponses({ page: 1, perPage: 100 }),
    ])

    invitations.value = invitationResult.list
    guests.value = rsvpResult.items.map(toGuest)
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar la lista de invitados.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-guests-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Asistencia confirmada</p>
        <h1 id="client-guests-title">Lista de invitados</h1>
        <p class="client-lead">
          Aquí verás a las personas que confirmaron asistencia desde tu invitación.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/invitaciones" variant="ghost">Mis invitaciones</BaseButton>
        <BaseButton as="RouterLink" to="/panel/estadisticas" variant="primary">Ver estadísticas</BaseButton>
      </div>
    </header>

    <section class="stats-grid" aria-label="Resumen de confirmaciones">
      <article class="bo-card stat-card">
        <span>Confirmados</span>
        <strong>{{ summary.totalGuests }}</strong>
      </article>
      <article class="bo-card stat-card">
        <span>Invitaciones publicadas</span>
        <strong>{{ summary.totalInvitations }}</strong>
      </article>
    </section>

    <article class="bo-card filters-card">
      <label class="field">
        <span>Invitación</span>
        <select v-model="selectedInvitationId">
          <option value="all">Todas</option>
          <option v-for="invitation in publishedInvitations" :key="invitation.id" :value="String(invitation.id)">
            {{ invitation.title }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Buscar invitado</span>
        <input v-model="search" type="search" placeholder="Ej: Ana, Pedro, vegetariano..." />
      </label>
    </article>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando confirmaciones...</p>

    <article v-else-if="!filteredGuests.length" class="bo-card empty-state">
      <h2>Aún no hay confirmaciones registradas</h2>
      <p>Cuando tus invitados confirmen asistencia, aparecerán aquí de forma automática.</p>
    </article>

    <article v-else class="bo-card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Listado de invitados confirmados</caption>
          <thead>
            <tr>
              <th>Invitado</th>
              <th>Invitación</th>
              <th>Restricción alimentaria</th>
              <th>Confirmó el</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guest in filteredGuests" :key="guest.id">
              <td>{{ guest.fullName }}</td>
              <td>{{ guest.invitationTitle }}</td>
              <td>{{ guest.dietaryRestrictions }}</td>
              <td>{{ formatDate(guest.confirmedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.client-page-head,
.stat-card,
.filters-card,
.table-card,
.empty-state {
  padding: 22px;
}

.client-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
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
.client-inline-note,
.empty-state p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: grid;
  gap: 0.45rem;
}

.stat-card span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.stat-card strong {
  color: var(--brand-ink);
  font-size: clamp(1.2rem, 1.5vw, 1.5rem);
}

.filters-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: grid;
  gap: 0.45rem;
}

.field span {
  font-weight: 700;
  color: var(--brand-ink);
}

.field input,
.field select {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.85rem 1rem;
  color: var(--brand-ink);
}

.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid rgba(123, 78, 224, 0.24);
  border-color: rgba(123, 78, 224, 0.5);
}

.empty-state {
  border: 1px dashed rgba(155, 107, 255, 0.26);
}

.empty-state h2 {
  margin: 0 0 0.4rem;
  color: var(--brand-ink);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.82rem 0.9rem;
  border-bottom: 1px solid rgba(155, 107, 255, 0.14);
}

th {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

td {
  color: var(--brand-ink);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 900px) {
  .stats-grid,
  .filters-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn) {
    width: 100%;
  }
}
</style>

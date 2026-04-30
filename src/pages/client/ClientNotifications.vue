<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import {
  getTenantNotificationPreferences,
  updateTenantNotificationPreferences,
  type TenantNotificationKey as NotificationKey,
  type TenantNotificationPreferences,
} from '@/services/tenantNotificationPreferences'
import { notifyError, notifySuccess } from '@/utils/toast'

const session = useSessionStore()
const isSaving = ref(false)
const isLoading = ref(false)
const loadError = ref('')

const form = reactive<TenantNotificationPreferences>({
  wall_message_received: true,
  product_updates: true,
  billing_updates: true,
  rsvp_confirmed: true,
  invitation_expiration_reminder: true,
  weekly_performance_summary: false,
})

const options: Array<{
  key: NotificationKey
  title: string
  description: string
}> = [
  {
    key: 'wall_message_received',
    title: 'Notificar cuando reciba mensajes del muro',
    description: 'Recibe un email cada vez que tus invitados publiquen un mensaje nuevo.',
  },
  {
    key: 'product_updates',
    title: 'Notificar sobre actualizaciones de InvitaSR',
    description: 'Te avisamos cambios importantes, mejoras y novedades del producto.',
  },
  {
    key: 'billing_updates',
    title: 'Notificar sobre cobros y facturación',
    description: 'Te enviamos avisos sobre cobros aprobados, rechazos y comprobantes.',
  },
  {
    key: 'rsvp_confirmed',
    title: 'Notificar si invitados confirmaron su asistencia',
    description: 'Recibe un aviso cuando un invitado confirme que asistirá a tu evento.',
  },
  {
    key: 'invitation_expiration_reminder',
    title: 'Notificar si tu invitación está por vencer',
    description: 'Te avisamos con anticipación para que no pierdas visibilidad del enlace.',
  },
  {
    key: 'weekly_performance_summary',
    title: 'Enviar resumen semanal de rendimiento',
    description: 'Resumen semanal con métricas clave de visitas, confirmaciones e interacción.',
  },
]

const applyPreferences = (preferences: TenantNotificationPreferences) => {
  for (const option of options) {
    form[option.key] = Boolean(preferences[option.key])
  }
}

const loadPreferences = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    applyPreferences(await getTenantNotificationPreferences())
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus preferencias.'
  } finally {
    isLoading.value = false
  }
}

const savePreferences = async () => {
  isSaving.value = true
  try {
    const response = await updateTenantNotificationPreferences({ ...form })
    applyPreferences(response.preferences)
    notifySuccess(response.message)
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos guardar tus preferencias.')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  void loadPreferences()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-notifications-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Comunicación por email</p>
        <h1 id="client-notifications-title">Notificaciones</h1>
        <p class="client-lead">
          Elige qué avisos quieres recibir para mantenerte al día sin ruido innecesario.
        </p>
        <p class="client-email">Destino actual: {{ session.user?.email || 'Sin email disponible' }}</p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ir a configuración</BaseButton>
        <BaseButton type="button" variant="primary" :disabled="isSaving" @click="savePreferences">
          {{ isSaving ? 'Guardando...' : 'Guardar preferencias' }}
        </BaseButton>
      </div>
    </header>

    <section class="bo-card notifications-card" aria-label="Preferencias de notificación">
      <p v-if="isLoading" class="notification-state">Cargando tus preferencias...</p>
      <p v-else-if="loadError" class="notification-state notification-state--error">{{ loadError }}</p>

      <article v-for="option in options" :key="option.key" class="notification-item">
        <div>
          <h2>{{ option.title }}</h2>
          <p>{{ option.description }}</p>
        </div>

        <label class="switch">
          <input v-model="form[option.key]" type="checkbox" :disabled="isLoading" />
          <span class="switch-track"></span>
        </label>
      </article>
    </section>
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
.notifications-card {
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
.client-email,
.notification-item p {
  margin: 0;
  color: #6a5a84;
}

.client-email {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.notifications-card {
  display: grid;
  gap: 12px;
}

.notification-state {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.16);
  background: rgba(255, 255, 255, 0.72);
  color: #6a5a84;
}

.notification-state--error {
  border-color: rgba(239, 68, 68, 0.24);
  color: #991b1b;
  background: rgba(254, 242, 242, 0.78);
}

.notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.14);
  background: rgba(249, 244, 255, 0.78);
}

.notification-item h2 {
  margin: 0;
  font-size: 1rem;
  color: var(--brand-ink);
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 50px;
  height: 30px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.switch-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.65);
  transition: background 0.2s ease;
}

.switch-track::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.switch input:checked + .switch-track {
  background: #2563eb;
}

.switch input:checked + .switch-track::before {
  transform: translateX(20px);
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn) {
    width: 100%;
  }

  .notification-item {
    align-items: flex-start;
  }
}
</style>

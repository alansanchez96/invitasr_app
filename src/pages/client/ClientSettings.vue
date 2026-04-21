<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useCatalogStore } from '@/stores/catalogs'
import { useSessionStore } from '@/stores/session'
import {
  getPublicOnboardingProfile,
  updatePublicOnboardingProfile,
  type PublicOnboardingProfile,
} from '@/services/publicOnboarding'
import { getTenantDashboardSummary, listTenantInvitations } from '@/services/tenantInvitations'
import {
  getClientBillingLabel,
  getClientPlanName,
  getClientPlanStatusLabel,
  getNextStepLabel,
  getSelectedTemplateName,
} from '@/utils/clientPanel'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

const session = useSessionStore()
const catalogStore = useCatalogStore()
const { countries } = storeToRefs(catalogStore)

const profile = ref<PublicOnboardingProfile | null>(null)
const tenantSummary = ref({
  total_invitations: 0,
  draft_invitations: 0,
  published_invitations: 0,
  last_updated_at: null as string | null,
})
const lastInvitationTitle = ref('Sin invitaciones creadas')
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)

const form = reactive({
  full_name: '',
  email: '',
  country_code: '',
})

const securityForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})
const isTwoFactorEnabled = ref(false)

const patchSessionName = (fullName: string, email: string) => {
  const normalized = fullName.trim().replace(/\s+/g, ' ')
  const [name = '', ...rest] = normalized.split(' ')
  session.patchUser({
    name,
    last_name: rest.join(' '),
    email,
  })
}

const syncForm = (nextProfile: PublicOnboardingProfile | null) => {
  const sessionFullName = [session.user?.name, session.user?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim()

  form.full_name = nextProfile?.registration?.full_name ?? sessionFullName
  form.email = nextProfile?.registration?.email ?? session.user?.email ?? ''
  form.country_code = nextProfile?.registration?.country_code ?? ''
}

const summaryCards = computed(() => [
  {
    label: 'Plan',
    value: getClientPlanName(session.user),
    hint: getClientBillingLabel(session.user),
  },
  {
    label: 'Estado comercial',
    value: getClientPlanStatusLabel(session.user),
    hint: 'Te muestra si tu plan ya esta listo o si aun queda un paso pendiente.',
  },
  {
    label: 'Estilo elegido',
    value: getSelectedTemplateName(profile.value),
    hint: 'Es la base visual que elegiste hasta ahora.',
  },
  {
    label: 'Siguiente paso',
    value: getNextStepLabel(profile.value),
    hint: 'Te indica lo siguiente que conviene hacer.',
  },
  {
    label: 'Invitaciones activas',
    value: String(tenantSummary.value.total_invitations),
    hint: `Borradores: ${tenantSummary.value.draft_invitations} · Publicadas: ${tenantSummary.value.published_invitations}`,
  },
])

const loadProfile = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const [profileResult, summaryResult, invitationResult] = await Promise.allSettled([
      getPublicOnboardingProfile(),
      getTenantDashboardSummary(),
      listTenantInvitations({ page: 1, perPage: 1 }),
    ])

    if (profileResult.status === 'fulfilled') {
      profile.value = profileResult.value.profile
      syncForm(profileResult.value.profile)
    } else {
      profile.value = null
      syncForm(null)
    }

    if (summaryResult.status === 'fulfilled') {
      tenantSummary.value = summaryResult.value
    }

    if (invitationResult.status === 'fulfilled') {
      lastInvitationTitle.value = invitationResult.value.list[0]?.title ?? 'Sin invitaciones creadas'
    }

    if (
      profileResult.status === 'rejected' &&
      summaryResult.status === 'rejected' &&
      invitationResult.status === 'rejected'
    ) {
      loadError.value = 'No pudimos cargar la configuración de tu cuenta.'
    }
  } catch {
    loadError.value = 'No pudimos cargar la configuración de tu cuenta.'
  } finally {
    isLoading.value = false
  }
}

const saveProfile = async () => {
  const onboarding = profile.value?.onboarding
  const planId = onboarding?.plan_id ?? session.user?.client_plan?.plan?.id

  if (!planId) {
    notifyError('No encontramos la informacion necesaria para actualizar tu cuenta.')
    return
  }

  isSaving.value = true
  try {
    const response = await updatePublicOnboardingProfile({
      plan_id: planId,
      template_id: onboarding?.template_id ?? null,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      country_code: form.country_code.trim().toUpperCase(),
      register_method:
        (profile.value?.registration?.register_method as 'email' | 'google' | 'facebook' | undefined) ?? 'email',
    })

    profile.value = response.profile
    syncForm(response.profile)
    patchSessionName(form.full_name, form.email)
    notifySuccess(response.message ?? 'Tus cambios se guardaron correctamente.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos guardar tus cambios.')
  } finally {
    isSaving.value = false
  }
}

const requestPasswordReset = () => {
  if (
    !securityForm.current_password.trim() ||
    !securityForm.new_password.trim() ||
    !securityForm.confirm_password.trim()
  ) {
    notifyWarning('Completa los tres campos para continuar.')
    return
  }

  if (securityForm.new_password !== securityForm.confirm_password) {
    notifyWarning('La nueva contraseña y la confirmación deben coincidir.')
    return
  }

  notifyWarning('Estamos terminando esta función. Muy pronto podrás cambiar tu contraseña desde aquí.')
}

const toggleTwoFactor = () => {
  isTwoFactorEnabled.value = !isTwoFactorEnabled.value
  notifyWarning('La verificación en dos pasos estará disponible próximamente.')
}

onMounted(() => {
  void catalogStore.ensureCountries()
  void loadProfile()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-settings-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Cuenta y setup</p>
        <h1 id="client-settings-title">Configuracion</h1>
        <p class="client-lead">
          Aqui puedes revisar tus datos, el estado de tu plan y la informacion clave para seguir avanzando con tu evento.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel" variant="ghost">Volver al panel</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando configuracion...</p>

    <section class="summary-grid" aria-label="Resumen de configuracion">
      <article v-for="item in summaryCards" :key="item.label" class="bo-card summary-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <section class="settings-grid">
      <article class="bo-card settings-card">
        <header class="section-head">
          <div>
            <h2>Datos de la cuenta</h2>
            <p>Informacion principal de tu cuenta.</p>
          </div>
        </header>

        <form class="settings-form" @submit.prevent="saveProfile">
          <label class="field">
            <span>Nombre completo</span>
            <input v-model="form.full_name" type="text" autocomplete="name" placeholder="Ej: Alan Sanchez" />
          </label>

          <label class="field">
            <span>Email</span>
            <input v-model="form.email" type="email" autocomplete="email" placeholder="correo@evento.com" />
          </label>

          <label class="field">
            <span>Pais</span>
            <select v-model="form.country_code">
              <option value="">Selecciona un pais</option>
              <option v-for="country in countries" :key="country.iso ?? country.id" :value="country.iso">
                {{ country.nicename ?? country.name }}
              </option>
            </select>
          </label>

          <div class="form-actions">
            <BaseButton type="submit" variant="primary" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
            </BaseButton>
          </div>
        </form>
      </article>

      <article class="bo-card settings-card">
        <header class="section-head">
          <div>
            <h2>Resumen de tu cuenta</h2>
            <p>Informacion general sobre tu acceso y el estado actual de tu proceso.</p>
          </div>
        </header>

        <ul class="structure-list">
          <li>
            <strong>Estado del espacio</strong>
            <span>{{ session.user?.tenant?.status ? 'Listo' : 'En preparacion' }}</span>
          </li>
          <li>
            <strong>Ultima invitacion detectada</strong>
            <span>{{ lastInvitationTitle }}</span>
          </li>
          <li>
            <strong>Invitaciones publicadas</strong>
            <span>{{ tenantSummary.published_invitations }}</span>
          </li>
          <li>
            <strong>Ultima actualizacion</strong>
            <span>{{ tenantSummary.last_updated_at ? new Date(tenantSummary.last_updated_at).toLocaleString() : 'Sin actividad' }}</span>
          </li>
        </ul>
      </article>

      <article class="bo-card settings-card">
        <header class="section-head">
          <div>
            <h2>Seguridad de acceso</h2>
            <p>Administra la contraseña de tu cuenta y la protección adicional.</p>
          </div>
        </header>

        <form class="settings-form" @submit.prevent="requestPasswordReset">
          <label class="field">
            <span>Contraseña actual</span>
            <input
              v-model="securityForm.current_password"
              type="password"
              autocomplete="current-password"
              placeholder="Ingresa tu contraseña actual" />
          </label>

          <label class="field">
            <span>Nueva contraseña</span>
            <input
              v-model="securityForm.new_password"
              type="password"
              autocomplete="new-password"
              placeholder="Crea una nueva contraseña" />
          </label>

          <label class="field">
            <span>Confirmar nueva contraseña</span>
            <input
              v-model="securityForm.confirm_password"
              type="password"
              autocomplete="new-password"
              placeholder="Repite la nueva contraseña" />
          </label>

          <div class="form-actions">
            <BaseButton type="submit" variant="ghost">Actualizar contraseña</BaseButton>
          </div>
        </form>

        <div class="security-two-factor">
          <div class="security-two-factor__head">
            <div>
              <h3>Verificación en dos pasos</h3>
              <p>Opción de seguridad adicional para proteger tu cuenta. Próximamente.</p>
            </div>
            <label class="switch">
              <input type="checkbox" :checked="isTwoFactorEnabled" @change="toggleTwoFactor" />
              <span class="switch-track"></span>
            </label>
          </div>
        </div>
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
.summary-card,
.settings-card {
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

.client-page-head h1,
.section-head h2 {
  margin: 0;
}

.client-lead,
.client-inline-note,
.summary-card p,
.section-head p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  gap: 0.75rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 0.45rem;
}

.summary-card span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.summary-card strong,
.structure-list strong {
  color: var(--brand-ink);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.section-head {
  margin-bottom: 1rem;
}

.settings-form {
  display: grid;
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

.field input {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.85rem 1rem;
  color: var(--brand-ink);
}

.field select {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.85rem 1rem;
  color: var(--brand-ink);
}

.field input:focus-visible {
  outline: 2px solid rgba(123, 78, 224, 0.24);
  border-color: rgba(123, 78, 224, 0.5);
}

.field select:focus-visible {
  outline: 2px solid rgba(123, 78, 224, 0.24);
  border-color: rgba(123, 78, 224, 0.5);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 0.25rem;
}

.structure-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.structure-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(248, 243, 255, 0.88);
  border: 1px solid rgba(155, 107, 255, 0.14);
}

.structure-list span {
  text-align: right;
  color: #5a308c;
  font-weight: 700;
}

.security-two-factor {
  margin-top: 8px;
  border-top: 1px solid rgba(155, 107, 255, 0.16);
  padding-top: 12px;
}

.security-two-factor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.security-two-factor h3 {
  margin: 0;
  color: var(--brand-ink);
  font-size: 1rem;
}

.security-two-factor p {
  margin: 0;
  color: #6a5a84;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 46px;
  height: 28px;
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
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.switch input:checked + .switch-track {
  background: #2563eb;
}

.switch input:checked + .switch-track::before {
  transform: translateX(18px);
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .client-actions,
  .client-actions :deep(.btn),
  .form-actions,
  .form-actions :deep(.btn) {
    width: 100%;
  }

  .structure-list li {
    flex-direction: column;
  }

  .structure-list span {
    text-align: left;
  }

  .security-two-factor__head {
    align-items: flex-start;
  }
}
</style>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { notifyWarning } from '@/utils/toast'

const securityForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const isTwoFactorEnabled = ref(false)

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
</script>

<template>
  <section class="client-page container" aria-labelledby="client-security-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Cuenta</p>
        <h1 id="client-security-title">Seguridad</h1>
        <p class="client-lead">
          Gestiona la protección de tu cuenta y deja preparada esta sección para futuras opciones de seguridad.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ver datos de cuenta</BaseButton>
      </div>
    </header>

    <section class="security-grid">
      <article class="bo-card security-card">
        <header class="section-head">
          <div>
            <h2>Contraseña de acceso</h2>
            <p>Actualiza tu contraseña para mantener tu cuenta protegida.</p>
          </div>
        </header>

        <form class="security-form" @submit.prevent="requestPasswordReset">
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
            <BaseButton type="submit" variant="primary">Actualizar contraseña</BaseButton>
          </div>
        </form>
      </article>

      <article class="bo-card security-card">
        <header class="section-head">
          <div>
            <h2>Verificación en dos pasos</h2>
            <p>Añade una capa extra para proteger tu ingreso. Próximamente.</p>
          </div>
        </header>

        <div class="security-two-factor">
          <div class="security-two-factor__head">
            <div>
              <h3>Activar verificación en dos pasos</h3>
              <p>Cuando esta opción esté lista, podrás recibir un código de verificación adicional.</p>
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
.security-card {
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
.section-head p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  gap: 0.75rem;
}

.security-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.section-head {
  margin-bottom: 1rem;
}

.security-form {
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

.field input:focus-visible {
  outline: 2px solid rgba(123, 78, 224, 0.24);
  border-color: rgba(123, 78, 224, 0.5);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 0.25rem;
}

.security-two-factor {
  border-radius: 16px;
  border: 1px solid rgba(155, 107, 255, 0.14);
  background: rgba(248, 243, 255, 0.82);
  padding: 14px;
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
  .security-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn),
  .form-actions,
  .form-actions :deep(.btn) {
    width: 100%;
  }

  .security-two-factor__head {
    align-items: flex-start;
  }
}
</style>


<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getPanelHomePath } from '@/config/panelModules'
import type { PublicNavItem } from './types'

const props = defineProps<{
  items: PublicNavItem[]
  isAuthenticated: boolean
  isMaster: boolean
  hasActivePlan?: boolean
}>()

const emit = defineEmits<{
  close: []
  login: []
  logout: []
}>()

const resolveNavItemProps = (item: PublicNavItem) => {
  if (item.to) return { to: item.to }
  return { href: item.href ?? '/' }
}

const handleClose = () => emit('close')
const handleLogin = () => emit('login')
const handleLogout = () => emit('logout')
const dashboardPath = computed(() =>
  props.isMaster ? getPanelHomePath(true) : props.hasActivePlan ? '/panel' : '/onboarding/public',
)
const dashboardLabel = computed(() => {
  if (props.isMaster) return 'Ir a backoffice'
  return props.hasActivePlan ? 'Ir a mi panel' : 'Finalizar compra'
})
</script>

<template>
  <div id="mobile-menu" class="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu principal">
    <button type="button" class="mobile-menu-scrim" aria-label="Cerrar menu" @click="handleClose"></button>
    <aside class="mobile-menu-panel">
      <div class="mobile-menu-head">
        <div class="mobile-brand-icon-wrap">
          <img
            class="brand-logo-mobile brand-logo-mobile-icon"
            src="/brand/logo_icon.png"
            alt="InvitaSR"
            width="256"
            height="256"
            loading="lazy"
            decoding="async" />
        </div>
        <button type="button" class="mobile-menu-close" aria-label="Cerrar menu" @click="handleClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6 18 18" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      </div>

      <p class="mobile-menu-caption">
        Crea una invitacion profesional en minutos, sin complicaciones.
      </p>

      <nav class="mobile-links" aria-label="Navegacion principal">
        <component
          v-for="item in items"
          :key="item.label"
          :is="item.to ? RouterLink : 'a'"
          class="mobile-link-card"
          v-bind="resolveNavItemProps(item)"
          @click="handleClose">
          <span class="mobile-link-title">{{ item.label }}</span>
          <span class="mobile-link-subtitle">{{ item.subtitle }}</span>
        </component>
      </nav>

      <div class="mobile-menu-actions" :class="{ 'mobile-menu-actions--guest': !props.isAuthenticated }">
        <template v-if="!props.isAuthenticated">
          <BaseButton variant="ghost" type="button" @click="handleLogin">
            Iniciar sesion
          </BaseButton>
          <BaseButton as="RouterLink" to="/planes" variant="primary" @click="handleClose">
            Ver planes
          </BaseButton>
        </template>
        <template v-else>
          <BaseButton as="RouterLink" :to="dashboardPath" variant="primary" @click="handleClose">
            {{ dashboardLabel }}
          </BaseButton>
          <button type="button" class="mobile-logout-btn" @click="handleLogout">
            <span class="logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </span>
            <span class="logout-label">Cerrar sesion</span>
          </button>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: 1fr min(430px, 92vw);
}

.mobile-menu-scrim {
  width: 100%;
  height: 100%;
  border: none;
  margin: 0;
  padding: 0;
  background: rgba(17, 10, 30, 0.45);
  backdrop-filter: blur(3px);
  cursor: pointer;
}

.mobile-menu-panel {
  height: 100dvh;
  max-height: 100dvh;
  padding: calc(clamp(12px, 2.4dvh, 20px) + env(safe-area-inset-top)) clamp(14px, 3vw, 18px)
    calc(clamp(12px, 2.2dvh, 18px) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.7dvh, 14px);
  background: linear-gradient(170deg, #fff 0%, #f9f4ff 100%);
  border-left: 1px solid rgba(233, 220, 255, 0.9);
  box-shadow: -22px 0 44px rgba(36, 22, 60, 0.18);
  overflow: hidden;
}

.mobile-menu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-logo-mobile {
  width: 160px;
  height: 50px;
  object-fit: contain;
}

.brand-logo-mobile-icon {
  width: 42px;
  height: 42px;
}

.mobile-brand-icon-wrap {
  width: clamp(38px, 6dvh, 44px);
  height: clamp(38px, 6dvh, 44px);
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(122, 79, 217, 0.1);
  border: 1px solid rgba(155, 107, 255, 0.22);
}

.mobile-menu-close {
  width: clamp(38px, 6dvh, 42px);
  height: clamp(38px, 6dvh, 42px);
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.26);
  background: #fff;
  color: #6f46c9;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: var(--shadow-card);
}

.mobile-menu-close svg {
  width: 20px;
  height: 20px;
}

.mobile-links {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.2dvh, 10px);
  overflow: visible;
  padding-right: 0;
  min-height: 0;
}

.mobile-link-card {
  display: grid;
  gap: 2px;
  padding: clamp(9px, 1.8dvh, 13px) 14px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.14);
  background: rgba(255, 255, 255, 0.74);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.mobile-link-card:hover,
.mobile-link-card:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(155, 107, 255, 0.34);
  box-shadow: 0 10px 22px rgba(90, 48, 140, 0.16);
}

.mobile-link-title {
  font-size: clamp(14px, 2.2dvh, 16px);
  line-height: 1.2;
  font-weight: 700;
  color: #2f1f47;
}

.mobile-link-subtitle {
  font-size: clamp(10.5px, 1.7dvh, 12px);
  line-height: 1.2;
  color: #6a5a84;
}

.mobile-menu-caption {
  margin: 0;
  color: #5f4f78;
  font-size: clamp(12px, 1.9dvh, 14px);
  line-height: 1.25;
  max-width: 34ch;
}

.mobile-menu-actions {
  margin-top: auto;
  display: grid;
  gap: clamp(7px, 1.3dvh, 10px);
  padding-top: clamp(7px, 1.4dvh, 10px);
  border-top: 1px solid rgba(155, 107, 255, 0.18);
}

.mobile-menu-actions--guest {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.mobile-menu-actions .btn {
  width: 100%;
  min-height: clamp(42px, 6.2dvh, 48px);
  padding-inline: 12px;
  white-space: nowrap;
}

.mobile-logout-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  padding: 11px 14px;
  border: 1px solid rgba(242, 178, 178, 0.8);
  background: #ffe8ea;
  color: #b91c1c;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.mobile-logout-btn:hover,
.mobile-logout-btn:focus-visible {
  background: #b91c1c;
  color: #fff;
  border-color: #b91c1c;
}

.logout-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logout-icon svg {
  width: 100%;
  height: 100%;
}

.logout-label {
  line-height: 1;
}

@media (max-width: 420px) {
  .mobile-links {
    gap: 8px;
  }

  .brand-logo-mobile {
    width: 42px;
    height: 42px;
  }

  .mobile-menu-panel {
    grid-column: 1 / -1;
    width: 100%;
    border-left: none;
  }

  .mobile-menu-scrim {
    display: none;
  }
}

@media (max-height: 680px) {
  .mobile-menu-caption {
    max-width: none;
  }

  .mobile-link-card {
    border-radius: 12px;
  }
}

@media (max-height: 590px) {
  .mobile-menu-caption {
    display: none;
  }

  .mobile-link-subtitle {
    display: none;
  }

  .mobile-link-card {
    min-height: 42px;
    align-content: center;
  }
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { backofficeModuleGroups } from '@/config/backofficeModules'

type ClientAccountLink = {
  label: string
  to: string
  icon: 'dashboard' | 'invitaciones' | 'configuracion'
}

const props = defineProps<{
  isMaster: boolean
  displayName: string
  initials: string
  avatarStyle: CSSProperties
  isHeroMode?: boolean
}>()

const emit = defineEmits<{
  logout: []
}>()

const route = useRoute()
const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const clientAccountLinks: ClientAccountLink[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  { label: 'Mis invitaciones', to: '/invitaciones', icon: 'invitaciones' },
  { label: 'Configuracion', to: '/configuracion', icon: 'configuracion' },
]

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

const handleLogoutClick = () => {
  closeMenu()
  emit('logout')
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!isOpen.value) return
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  closeMenu()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)
</script>

<template>
  <div ref="rootRef" class="account-menu" :class="{ 'is-hero-mode': isHeroMode }">
    <button
      class="account-trigger"
      type="button"
      @click.stop="toggleMenu"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      aria-controls="account-dropdown"
      aria-label="Abrir menu de cuenta">
      <img v-if="isMaster" class="account-logo" src="/brand/logo_icon.png" alt="Cuenta master" />
      <span v-else class="account-initials" :style="avatarStyle" aria-hidden="true">
        {{ initials }}
      </span>
    </button>

    <div
      v-if="isOpen"
      id="account-dropdown"
      class="account-dropdown"
      role="region"
      aria-label="Opciones de cuenta"
      @click.stop>
      <div class="account-user-header">
        <span class="account-user-label">Sesion activa</span>
        <p class="account-user-name">{{ displayName }}</p>
      </div>

      <template v-if="isMaster">
        <div class="account-item">
          <RouterLink class="account-link" to="/backoffice" @click="closeMenu">
            <span class="account-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="7" rx="2" />
                <rect x="14" y="3" width="7" height="7" rx="2" />
                <rect x="3" y="14" width="7" height="7" rx="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" />
              </svg>
            </span>
            <span>Dashboard</span>
          </RouterLink>
          <div class="account-submenu">
            <div v-for="group in backofficeModuleGroups" :key="group.title" class="submenu-group">
              <span class="submenu-title">{{ group.title }}</span>
              <RouterLink
                v-for="module in group.items"
                :key="module.label"
                :to="module.href"
                class="submenu-link"
                @click="closeMenu">
                <span>{{ module.label }}</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <RouterLink
          v-for="item in clientAccountLinks"
          :key="item.to"
          class="account-link"
          :to="item.to"
          @click="closeMenu">
          <span class="account-icon">
            <svg
              v-if="item.icon === 'dashboard'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
            <svg
              v-else-if="item.icon === 'invitaciones'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8">
              <path d="M4 6h16v12H4z" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34h0A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54h0a1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86v0A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
            </svg>
          </span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>

      <button type="button" class="account-logout-main" @click="handleLogoutClick">
        <span class="logout-label">Cerrar sesion</span>
        <span class="logout-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-menu {
  position: relative;
}

.account-trigger {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgb(208, 181, 253);
  background: #fff;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: background 0.35s ease;
}

.account-menu.is-hero-mode .account-trigger {
  background: rgba(255, 255, 255, 0.96);
}

.account-logo {
  margin-top: -1px;
  margin-left: -1px;
  object-fit: contain;
  filter: brightness(1.1);
}

.account-initials {
  border-radius: 50%;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #3c4043;
  background: #d7e3fc;
  border: none;
  padding: 9px;
}

.account-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  min-width: 250px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(233, 220, 255, 0.7);
  box-shadow: var(--shadow-card);
  padding: 10px;
  display: grid;
  gap: 6px;
  z-index: 10;
}

.account-user-header {
  display: grid;
  gap: 4px;
  margin: 2px 2px 8px;
  padding: 8px 10px 10px;
  border-bottom: 1px solid rgba(155, 107, 255, 0.2);
}

.account-user-label {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.58);
  font-weight: 700;
}

.account-user-name {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--brand-ink);
  text-wrap: balance;
}

.account-item {
  position: relative;
  padding-right: 12px;
}

.account-link {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--brand-ink);
  font-weight: 600;
  gap: 10px;
}

.account-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.account-icon svg {
  width: 100%;
  height: 100%;
}

.account-link:hover,
.account-link:focus-visible {
  background: var(--gradient-brand);
  color: #fff;
}

.account-submenu {
  position: absolute;
  top: 0;
  right: 100%;
  margin-right: 0;
  transform: translateX(-12px);
  min-width: 280px;
  max-width: 320px;
  max-height: 320px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(233, 220, 255, 0.7);
  box-shadow: var(--shadow-card);
  padding: 8px;
  display: grid;
  gap: 6px;
  overflow-y: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 10;
}

.account-submenu::before {
  content: '';
  position: absolute;
  right: -12px;
  top: 0;
  width: 12px;
  height: 100%;
}

.account-item:hover .account-submenu,
.account-item:focus-within .account-submenu,
.account-submenu:hover {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.submenu-group {
  display: grid;
  gap: 4px;
  padding-bottom: 6px;
  border-bottom: 1px dashed rgba(155, 107, 255, 0.2);
}

.submenu-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.submenu-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
  padding: 6px 8px 2px;
}

.submenu-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--brand-ink);
  font-weight: 600;
}

.submenu-link:hover,
.submenu-link:focus-visible {
  background: var(--gradient-brand);
  color: #fff;
}

.account-logout-main {
  margin-top: 4px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(242, 178, 178, 0.8);
  background: #ffe8ea;
  color: #b91c1c;
  font-weight: 600;
  cursor: pointer;
}

.account-logout-main:hover {
  background: #b91c1c;
  color: #fff;
  border-color: #b91c1c;
}

.logout-label {
  line-height: 1;
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
</style>


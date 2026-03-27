<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { backofficeModuleGroups, type BackofficeModuleGroup } from '@/config/backofficeModules'
import ToastStack from '@/components/ui/ToastStack.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const isMobileSidebarOpen = ref(false)
const isMobile = ref(false)
const isAccountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)
const isDesktopSidebarPinned = ref(false)
const isDesktopSidebarHovered = ref(false)
const sectionOpenState = ref<Record<string, boolean>>({})

const isAuthenticated = computed(() => session.isAuthenticated)
const isMaster = computed(() => session.isMaster)
const accountDisplayName = computed(() => {
  const fullName = [session.user?.name, session.user?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim()
  return fullName || session.user?.email || 'Mi cuenta'
})

const isDesktopSidebarOpen = computed(() => isDesktopSidebarPinned.value || isDesktopSidebarHovered.value)
const isCollapsedVisual = computed(() => !isMobile.value && !isDesktopSidebarOpen.value)
const sidebarHomePath = computed(() => (route.path.startsWith('/backoffice') ? '/backoffice' : '/dashboard'))
const moduleGroups = computed(() =>
  backofficeModuleGroups.map((group) => ({
    ...group,
    entryHref: group.items[0]?.href ?? sidebarHomePath.value,
  })),
)
const defaultSectionsOpen = computed(() => moduleGroups.value.length < 7)

const normalizePath = (value: string) => value.replace(/\/+$/, '') || '/'

const isPathActive = (href: string) => {
  const current = normalizePath(route.path)
  const target = normalizePath(href)
  return current === target || current.startsWith(`${target}/`)
}

const isGroupActive = (group: BackofficeModuleGroup) => group.items.some((item) => isPathActive(item.href))

const isDesktopHomeActive = computed(() => {
  const current = normalizePath(route.path)
  if (route.path.startsWith('/backoffice')) {
    return current === '/backoffice' || current === '/backoffice/dashboard'
  }
  return current === '/dashboard'
})

const initializeSectionState = () => {
  const next: Record<string, boolean> = {}
  for (const group of moduleGroups.value) {
    const previous = sectionOpenState.value[group.title]
    next[group.title] = previous ?? defaultSectionsOpen.value
  }
  sectionOpenState.value = next
}

const isGroupExpanded = (title: BackofficeModuleGroup['title']) => {
  return sectionOpenState.value[title] ?? defaultSectionsOpen.value
}

const getGroupId = (title: BackofficeModuleGroup['title']) => {
  return `sidebar-group-${title.toLowerCase().replace(/\s+/g, '-')}`
}

const toggleGroup = (title: BackofficeModuleGroup['title']) => {
  sectionOpenState.value = {
    ...sectionOpenState.value,
    [title]: !isGroupExpanded(title),
  }
}

const toggleMobileSidebar = () => {
  if (!isMobile.value) return
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

const closeMobileSidebar = () => {
  isMobileSidebarOpen.value = false
}

const toggleSidebarPin = () => {
  if (isMobile.value) return
  isDesktopSidebarPinned.value = !isDesktopSidebarPinned.value
  if (!isDesktopSidebarPinned.value) {
    isDesktopSidebarHovered.value = false
  }
}

const handleSidebarMouseEnter = () => {
  if (isMobile.value || isDesktopSidebarPinned.value) return
  isDesktopSidebarHovered.value = true
}

const handleSidebarMouseLeave = () => {
  if (isMobile.value || isDesktopSidebarPinned.value) return
  isDesktopSidebarHovered.value = false
}

const toggleAccountMenu = () => {
  isAccountMenuOpen.value = !isAccountMenuOpen.value
}

const closeAccountMenu = () => {
  isAccountMenuOpen.value = false
}

const handleLogout = () => {
  session.logout().finally(() => {
    closeAccountMenu()
    closeMobileSidebar()
    router.push('/')
  })
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!isAccountMenuOpen.value) return
  if (accountMenuRef.value && !accountMenuRef.value.contains(event.target as Node)) {
    closeAccountMenu()
  }
}


const updateViewport = () => {
  isMobile.value = window.matchMedia('(max-width: 1010px)').matches
  if (!isMobile.value) {
    isMobileSidebarOpen.value = false
  }
}

watch(moduleGroups, initializeSectionState, { immediate: true })

watch(
  () => route.fullPath,
  () => {
    closeAccountMenu()
    closeMobileSidebar()
  },
)

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="panel-layout" :class="{ 'is-collapsed': isCollapsedVisual }">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <aside
      class="panel-sidebar"
      id="panel-sidebar"
      :class="{ open: isMobileSidebarOpen }"
      aria-label="Menu lateral"
      @mouseenter="handleSidebarMouseEnter"
      @mouseleave="handleSidebarMouseLeave">
      <div class="sidebar-head">
        <RouterLink class="sidebar-brand" to="/">
          <img class="brand-icon" src="/brand/logo_icon.png" alt="InvitaSR" />
          <img class="brand-full" :class="{ 'is-hidden': isCollapsedVisual }" src="/brand/logo-transparent.png" alt="InvitaSR" />
        </RouterLink>
        <button
          v-if="!isMobile && !isCollapsedVisual"
          class="sidebar-pin"
          type="button"
          :aria-label="isDesktopSidebarPinned ? 'Desfijar sidebar' : 'Fijar sidebar'"
          :class="{ active: isDesktopSidebarPinned }"
          :aria-pressed="isDesktopSidebarPinned"
          :title="isDesktopSidebarPinned ? 'Desfijar sidebar' : 'Fijar sidebar'"
          @click="toggleSidebarPin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m14 4 6 6" />
            <path d="M5 13 13 5l6 6-8 8H5z" />
            <path d="M12 16v4" />
          </svg>
        </button>
      </div>

      <transition name="sidebar-content" mode="out-in">
        <nav v-if="isCollapsedVisual" key="compact" class="sidebar-nav-compact" aria-label="Navegacion lateral">
          <RouterLink
            class="sidebar-icon-link"
            :class="{ active: isDesktopHomeActive }"
            :to="sidebarHomePath"
            title="Escritorio"
            @click="closeMobileSidebar">
            <span class="group-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </span>
          </RouterLink>

          <RouterLink
            v-for="group in moduleGroups"
            :key="group.title"
            class="sidebar-icon-link"
            :class="{ active: isGroupActive(group) }"
            :to="group.entryHref"
            :title="group.title"
            @click="closeMobileSidebar">
            <span class="group-icon" aria-hidden="true">
              <svg v-if="group.title === 'Gestion'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="4" width="7" height="7" rx="2" />
                <rect x="14" y="4" width="7" height="7" rx="2" />
                <rect x="3" y="13" width="18" height="7" rx="2" />
              </svg>
              <svg v-else-if="group.title === 'Pagos'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="6" width="18" height="12" rx="3" />
                <path d="M8 12h8" />
                <path d="M12 9v6" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
              </svg>
            </span>
          </RouterLink>
        </nav>

        <div v-else key="expanded" class="sidebar-nav-expanded">
          <RouterLink
            class="sidebar-link sidebar-desktop-link"
            :class="{ active: isDesktopHomeActive }"
            :to="sidebarHomePath"
            title="Escritorio"
            @click="closeMobileSidebar">
            <span class="group-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </span>
            <span class="sidebar-link-label">Escritorio</span>
          </RouterLink>

          <nav class="sidebar-nav" aria-label="Secciones del panel">
            <div v-for="group in moduleGroups" :key="group.title" class="sidebar-group">
              <button
                class="sidebar-group-toggle"
                type="button"
                :class="{ active: isGroupActive(group) }"
                :aria-expanded="isGroupExpanded(group.title)"
                :aria-controls="getGroupId(group.title)"
                @click="toggleGroup(group.title)">
                <span class="group-toggle-left">
                  <span class="group-icon" aria-hidden="true">
                    <svg v-if="group.title === 'Gestion'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="4" width="7" height="7" rx="2" />
                      <rect x="14" y="4" width="7" height="7" rx="2" />
                      <rect x="3" y="13" width="18" height="7" rx="2" />
                    </svg>
                    <svg v-else-if="group.title === 'Pagos'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="6" width="18" height="12" rx="3" />
                      <path d="M8 12h8" />
                      <path d="M12 9v6" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
                    </svg>
                  </span>
                  <span>{{ group.title }}</span>
                </span>
                <span class="group-chevron" :class="{ open: isGroupExpanded(group.title) }" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              <transition name="group-collapse">
                <div v-show="isGroupExpanded(group.title)" class="sidebar-group-items" :id="getGroupId(group.title)">
                  <RouterLink
                    v-for="item in group.items"
                    :key="item.label"
                    :to="item.href"
                    class="sidebar-link sidebar-item-link"
                    :class="{ active: isPathActive(item.href) }"
                    :title="item.label"
                    @click="closeMobileSidebar">
                    <span class="sidebar-link-label">{{ item.label }}</span>
                  </RouterLink>
                </div>
              </transition>
            </div>
          </nav>
        </div>
      </transition>
    </aside>

    <div v-if="isMobileSidebarOpen" class="sidebar-backdrop" @click="closeMobileSidebar"></div>

    <div class="panel-main">
      <header class="panel-topbar">
        <div class="topbar-left">
          <button
            class="mobile-sidebar-toggle"
            :class="{ open: isMobileSidebarOpen }"
            type="button"
            :aria-expanded="isMobileSidebarOpen"
            aria-controls="panel-sidebar"
            aria-label="Abrir menu lateral"
            @click="toggleMobileSidebar">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <div class="topbar-right">
          <div v-if="isAuthenticated" class="account-menu" ref="accountMenuRef">
            <button
              class="account-trigger"
              type="button"
              aria-label="Abrir menu de cuenta"
              aria-haspopup="menu"
              aria-controls="account-menu"
              @click.stop="toggleAccountMenu"
              :aria-expanded="isAccountMenuOpen">
              <img class="account-logo" src="/brand/logo_icon.png" alt="Cuenta" />
            </button>
            <div v-if="isAccountMenuOpen" id="account-menu" class="account-dropdown" @click.stop>
              <div class="account-user-header">
                <span class="account-user-label">Sesion activa</span>
                <p class="account-user-name">{{ accountDisplayName }}</p>
              </div>
              <template v-if="isMaster">
                <div class="account-item">
                  <RouterLink class="account-link" to="/backoffice" @click="closeAccountMenu">
                    <span>Dashboard</span>
                  </RouterLink>
                  <div class="account-submenu">
                    <div v-for="group in backofficeModuleGroups" :key="group.title" class="submenu-group">
                      <span class="submenu-title">{{ group.title }}</span>
                      <RouterLink v-for="module in group.items" :key="module.label" :to="module.href" class="submenu-link"
                        @click="closeAccountMenu">
                        <span>{{ module.label }}</span>
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="account-item">
                  <RouterLink class="account-link" to="/dashboard" @click="closeAccountMenu">
                    <span>Dashboard</span>
                  </RouterLink>
                  <div class="account-submenu">
                    <RouterLink class="submenu-link" to="/dashboard" @click="closeAccountMenu">Resumen general</RouterLink>
                    <RouterLink class="submenu-link" to="/dashboard" @click="closeAccountMenu">Estadisticas del evento</RouterLink>
                    <RouterLink class="submenu-link" to="/dashboard" @click="closeAccountMenu">Actividad reciente</RouterLink>
                  </div>
                </div>
                <div class="account-item">
                  <RouterLink class="account-link" to="/invitaciones" @click="closeAccountMenu">
                    <span>Mis invitaciones</span>
                  </RouterLink>
                  <div class="account-submenu">
                    <RouterLink class="submenu-link" to="/invitaciones" @click="closeAccountMenu">Crear invitacion</RouterLink>
                  </div>
                </div>
                <div class="account-item">
                  <RouterLink class="account-link" to="/configuracion" @click="closeAccountMenu">
                    <span>Configuracion</span>
                  </RouterLink>
                  <div class="account-submenu">
                    <RouterLink class="submenu-link" to="/configuracion" @click="closeAccountMenu">Perfil</RouterLink>
                    <RouterLink class="submenu-link" to="/configuracion" @click="closeAccountMenu">Seguridad</RouterLink>
                  </div>
                </div>
              </template>
              <button type="button" class="account-logout-main" @click="handleLogout">Cerrar sesion</button>
            </div>
          </div>
        </div>
      </header>

      <ToastStack />

      <main id="main-content" class="panel-content" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.panel-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 274px 1fr;
  background: linear-gradient(180deg, #f8f3ff 0%, #f6f4ff 100%);
  transition: grid-template-columns 0.4s ease;
}

.panel-layout.is-collapsed {
  grid-template-columns: 94px 1fr;
}

.panel-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  background: linear-gradient(180deg, #2a1452 0%, #31195e 50%, #3a216f 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 14px 12px 18px;
  overflow-y: auto;
  transition: padding 0.4s ease;
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 4px 14px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  overflow: hidden;
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex: 0 0 auto;
}

.brand-full {
  width: 144px;
  height: 44px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  transform-origin: left center;
  transition: opacity 0.26s ease, transform 0.3s ease, max-width 0.3s ease;
  max-width: 144px;
}

.brand-full.is-hidden {
  opacity: 0;
  transform: translateX(-8px);
  max-width: 0;
}

.sidebar-pin {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.09);
  color: rgba(244, 236, 255, 0.9);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.sidebar-pin svg {
  width: 16px;
  height: 16px;
}

.sidebar-pin:hover,
.sidebar-pin.active {
  background: var(--gradient-brand);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.26);
}

.sidebar-content-enter-active,
.sidebar-content-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.sidebar-content-enter-from,
.sidebar-content-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.sidebar-nav-compact {
  display: grid;
  gap: 10px;
}

.sidebar-icon-link {
  height: 44px;
  border-radius: 12px;
  border: 1px solid transparent;
  color: rgba(245, 235, 255, 0.9);
  display: grid;
  place-items: center;
  transition: background 0.24s ease, border-color 0.24s ease, color 0.24s ease;
}

.sidebar-icon-link:hover,
.sidebar-icon-link.active {
  background: var(--gradient-brand);
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.sidebar-nav-expanded {
  display: grid;
  gap: 12px;
}

.sidebar-desktop-link {
  margin-bottom: 4px;
  gap: 14px;
}

.sidebar-nav {
  display: grid;
  gap: 12px;
}

.sidebar-group {
  display: grid;
  gap: 6px;
}

.sidebar-group-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  color: rgba(233, 224, 247, 0.9);
  cursor: pointer;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  transition: background 0.22s ease, border-color 0.22s ease, color 0.22s ease;
}

.sidebar-group-toggle.active,
.sidebar-group-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
}

.group-toggle-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.group-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: rgba(255, 236, 255, 0.9);
}

.group-icon svg {
  width: 100%;
  height: 100%;
}

.group-chevron {
  width: 16px;
  height: 16px;
  display: inline-flex;
  transition: transform 0.3s ease;
}

.group-chevron.open {
  transform: rotate(180deg);
}

.group-chevron svg {
  width: 100%;
  height: 100%;
}

.group-collapse-enter-active,
.group-collapse-leave-active {
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.24s ease, transform 0.3s ease;
}

.group-collapse-enter-from,
.group-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.group-collapse-enter-to,
.group-collapse-leave-from {
  max-height: 480px;
  opacity: 1;
  transform: translateY(0);
}

.sidebar-group-items {
  display: grid;
  gap: 4px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  color: rgba(245, 235, 255, 0.92);
  border-radius: 12px;
  min-height: 42px;
  padding: 10px 14px;
  font-weight: 600;
  border: 1px solid transparent;
  transition: background 0.24s ease, color 0.24s ease, border-color 0.24s ease, transform 0.24s ease;
}

.sidebar-item-link {
  margin-left: 8px;
  padding-left: 18px;
}

.sidebar-desktop-link {
  gap: 10px;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: var(--gradient-brand);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.22);
  transform: translateY(-1px);
}

.sidebar-link-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-layout.is-collapsed .sidebar-head {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.panel-layout.is-collapsed .sidebar-brand {
  justify-content: center;
  gap: 0;
}

.panel-main {
  min-width: 0;
}

.panel-topbar {
  position: sticky;
  top: 0;
  z-index: 15;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.66);
  border-bottom: 1px solid rgba(233, 220, 255, 0.9);
  backdrop-filter: blur(8px);
}

.topbar-left {
  min-width: 42px;
}

.mobile-sidebar-toggle {
  display: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.25);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 245, 255, 0.96));
  cursor: pointer;
  position: relative;
  box-shadow: var(--shadow-card);
}

.mobile-sidebar-toggle span {
  position: absolute;
  left: 12px;
  right: 12px;
  height: 2px;
  border-radius: 999px;
  background: var(--brand-ink);
  transition: transform 0.25s ease, opacity 0.2s ease, top 0.25s ease;
}

.mobile-sidebar-toggle span:nth-child(1) {
  top: 14px;
}

.mobile-sidebar-toggle span:nth-child(2) {
  top: 21px;
}

.mobile-sidebar-toggle span:nth-child(3) {
  top: 28px;
}

.mobile-sidebar-toggle.open span:nth-child(1) {
  top: 21px;
  transform: rotate(45deg);
}

.mobile-sidebar-toggle.open span:nth-child(2) {
  opacity: 0;
}

.mobile-sidebar-toggle.open span:nth-child(3) {
  top: 21px;
  transform: rotate(-45deg);
}

.panel-content {
  padding: 26px 24px 48px;
  min-width: 0;
}

:deep(.bo-table) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(.bo-table table) {
  width: max-content;
  min-width: 100%;
}

:deep(.bo-content) {
  min-width: 0;
}

.account-menu {
  position: relative;
}

.account-trigger {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 2px solid rgb(208, 181, 253);
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: var(--shadow-card);
}

.account-logo {
  margin-top: -3px;
  margin-left: -2px;
  object-fit: contain;
  filter: brightness(1.1);
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
  z-index: 20;
}

.account-user-header {
  display: grid;
  gap: 4px;
  margin: 2px 2px 8px;
  padding: 8px 10px 10px;
  border-bottom: 1px solid rgba(155, 107, 255, 0.2);
}

.account-user-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.58);
  font-weight: 700;
}

.account-user-name {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--brand-ink);
}

.account-item {
  position: relative;
  padding-right: 12px;
}

.account-link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--brand-ink);
  font-weight: 600;
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
  display: block;
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

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 16, 25, 0.5);
  z-index: 16;
}

@media (max-width: 1010px) {
  .panel-layout,
  .panel-layout.is-collapsed {
    grid-template-columns: 1fr;
  }

  .panel-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: min(300px, 84vw);
    transform: translateX(-100%);
    transition: transform 0.4s ease;
    z-index: 17;
  }

  .panel-sidebar.open {
    transform: translateX(0);
  }

  .panel-topbar {
    padding: 12px 16px;
  }

  .mobile-sidebar-toggle {
    display: block;
  }

  .panel-content {
    padding: 18px 14px 28px;
  }
}

@media (max-width: 1400px) {
  .panel-layout:not(.is-collapsed) .panel-content :deep(.bo-content) {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .panel-topbar {
    padding: 10px 12px;
    height: 70px;
  }

  .panel-sidebar {
    width: min(280px, 92vw);
  }

  .panel-content {
    padding: 16px 12px 24px;
  }

  .account-trigger {
    width: 44px;
    height: 44px;
  }

  .mobile-sidebar-toggle {
    width: 40px;
    height: 40px;
  }
}
</style>

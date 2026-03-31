<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthForm from '@/components/auth/AuthForm.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { backofficeModuleGroups } from '@/config/backofficeModules'
import { buildAvatarPaletteStyle, buildDisplayInitials } from '@/utils/userIdentity'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const isMenuOpen = ref(false)
const isMobile = ref(false)
const isAuthenticated = computed(() => session.isAuthenticated)
const isMaster = computed(() => session.isMaster)
const isLoginLoading = computed(() => session.isLoading)
const isHomeRoute = computed(() => route.name === 'home')
const isAccountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)
const isLoginMenuOpen = ref(false)
const loginMenuRef = ref<HTMLElement | null>(null)
const loginError = ref<string | null>(null)
const loginFieldErrors = ref<Record<string, string[]>>({})
const accountIdentitySeed = computed(() => {
    const fullName = [session.user?.name, session.user?.last_name]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' ')
        .trim()

    if (fullName) return fullName

    const emailPrefix = session.user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
    return emailPrefix || 'Cliente'
})
const accountDisplayName = computed(() => {
    const fullName = [session.user?.name, session.user?.last_name]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' ')
        .trim()
    return fullName || session.user?.email || 'Mi cuenta'
})
const accountInitials = computed(() => buildDisplayInitials(accountIdentitySeed.value, 'CU'))
const accountAvatarStyle = computed(() => buildAvatarPaletteStyle(accountIdentitySeed.value))

const toggleMenu = () => {
    if (!isMobile.value) return
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

const toggleAccountMenu = () => {
    isAccountMenuOpen.value = !isAccountMenuOpen.value
}

const closeAccountMenu = () => {
    isAccountMenuOpen.value = false
}

const toggleLoginMenu = () => {
    isLoginMenuOpen.value = !isLoginMenuOpen.value
    if (isLoginMenuOpen.value) {
        loginError.value = null
        loginFieldErrors.value = {}
    }
}

const closeLoginMenu = () => {
    isLoginMenuOpen.value = false
    loginError.value = null
    loginFieldErrors.value = {}
}

const handleMobileLoginAction = () => {
    closeMenu()
    loginError.value = null
    loginFieldErrors.value = {}
    window.setTimeout(() => {
        isLoginMenuOpen.value = true
    }, 180)
}

const handleLogout = () => {
    session.logout().finally(() => {
        closeMenu()
        closeAccountMenu()
        if (route.path.startsWith('/backoffice') || route.path.startsWith('/dashboard')) {
            router.push('/')
        }
    })
}

const handleDocumentClick = (event: MouseEvent) => {
    if (!isAccountMenuOpen.value) return
    if (accountMenuRef.value && !accountMenuRef.value.contains(event.target as Node)) {
        closeAccountMenu()
    }
}

const handleLoginDocumentClick = (event: MouseEvent) => {
    if (!isLoginMenuOpen.value) return
    if (loginMenuRef.value && !loginMenuRef.value.contains(event.target as Node)) {
        closeLoginMenu()
    }
}

const handleLoginSubmit = async (payload: { email: string; password: string; remember: boolean }) => {
    loginError.value = null
    loginFieldErrors.value = {}
    const result = await session.login(payload.email, payload.password, payload.remember)
    if (!result.ok) {
        loginError.value = result.message ?? 'No pudimos iniciar sesion.'
        loginFieldErrors.value = result.fieldErrors ?? {}
        return
    }
    closeLoginMenu()
}

const handleLoginKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    if (isLoginMenuOpen.value) {
        closeLoginMenu()
    }
}

watch(isMenuOpen, (open) => {
    const shouldLock = open && isMobile.value
    document.body.style.overflow = shouldLock ? 'hidden' : ''
    document.body.classList.toggle('mobile-menu-open', shouldLock)
})

const updateViewport = () => {
    isMobile.value = window.matchMedia('(max-width: 1010px)').matches
    if (!isMobile.value) {
        isMenuOpen.value = false
    }
}

onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('click', handleLoginDocumentClick)
    document.addEventListener('keydown', handleLoginKeydown)
})

onUnmounted(() => {
    document.body.style.overflow = ''
    document.body.classList.remove('mobile-menu-open')
    window.removeEventListener('resize', updateViewport)
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('click', handleLoginDocumentClick)
    document.removeEventListener('keydown', handleLoginKeydown)
})
</script>

<template>
    <header class="public-header" :class="{ 'menu-open': isMenuOpen && isMobile, 'is-home': isHomeRoute }">
        <div class="container nav">
            <div class="brand-row">
                <RouterLink v-show="!(isMenuOpen && isMobile)" class="brand" to="/">
                    <img class="brand-logo" src="/brand/logo-transparent.png" alt="InvitaSR" />
                </RouterLink>
                <nav class="nav-links" aria-label="Navegacion principal">
                    <RouterLink to="/noticias">Noticias</RouterLink>
                    <a href="/#como-funciona">Como funciona</a>
                    <a href="/#inspiracion">Inspiracion</a>
                    <RouterLink to="/planes">Planes</RouterLink>
                    <a href="/#demo">Demo</a>
                </nav>
                <nav class="nav-actions" aria-label="Acciones de cuenta">
                    <template v-if="!isAuthenticated">
                        <div class="login-menu" ref="loginMenuRef">
                            <BaseButton variant="ghost" type="button" @click.stop="toggleLoginMenu"
                                :aria-expanded="isLoginMenuOpen"
                                aria-haspopup="dialog"
                                aria-controls="login-dropdown">
                                Iniciar sesion
                            </BaseButton>
                            <div
                                v-if="isLoginMenuOpen"
                                id="login-dropdown"
                                class="login-dropdown"
                                role="dialog"
                                aria-label="Acceso a cuenta"
                                @click.stop>
                                <AuthForm :loading="isLoginLoading" :error-message="loginError"
                                    :field-errors="loginFieldErrors" @submit="handleLoginSubmit" />
                                <div class="auth-divider"></div>
                                <AuthProviders :providers="['google', 'facebook']" />
                            </div>
                        </div>
                        <BaseButton as="RouterLink" to="/planes" variant="primary">Ver planes</BaseButton>
                    </template>
                    <div v-else class="account-menu" ref="accountMenuRef">
                        <button class="account-trigger" type="button" @click.stop="toggleAccountMenu"
                            :aria-expanded="isAccountMenuOpen"
                            aria-haspopup="menu"
                            aria-controls="account-dropdown"
                            aria-label="Abrir menu de cuenta">
                            <img v-if="isMaster" class="account-logo" src="/brand/logo_icon.png" alt="Cuenta master" />
                            <span v-else class="account-initials" :style="accountAvatarStyle" aria-hidden="true">
                                {{ accountInitials }}
                            </span>
                        </button>
                        <div v-if="isAccountMenuOpen" id="account-dropdown" class="account-dropdown" role="region"
                            aria-label="Opciones de cuenta" @click.stop>
                            <div class="account-user-header">
                                <span class="account-user-label">Sesion activa</span>
                                <p class="account-user-name">{{ accountDisplayName }}</p>
                            </div>
                            <template v-if="isMaster">
                                <div class="account-item">
                                    <RouterLink class="account-link" to="/backoffice" @click="closeAccountMenu">
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
                                        <div v-for="group in backofficeModuleGroups" :key="group.title"
                                            class="submenu-group">
                                            <span class="submenu-title">{{ group.title }}</span>
                                            <RouterLink v-for="module in group.items" :key="module.label" :to="module.href"
                                                class="submenu-link" @click="closeAccountMenu">
                                                <span>{{ module.label }}</span>
                                            </RouterLink>
                                        </div>
                                    </div>
                                </div>
                                <div class="account-item">
                                    <a class="account-link" href="#">
                                        <span class="account-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                                <circle cx="12" cy="12" r="3" />
                                                <path
                                                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34h0A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54h0a1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86v0A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
                                            </svg>
                                        </span>
                                        <span>Configuracion</span>
                                    </a>
                                    <div class="account-submenu">
                                        <a href="#">Perfil</a>
                                        <a href="#">Seguridad</a>
                                    </div>
                                </div>
                                <button type="button" class="account-logout-main" @click="handleLogout">
                                    <span class="logout-label">Cerrar sesion</span>
                                    <span class="logout-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                            <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                                            <path d="m16 17 5-5-5-5" />
                                            <path d="M21 12H9" />
                                        </svg>
                                    </span>
                                </button>
                            </template>
                            <template v-else>
                                <div class="account-item">
                                    <a class="account-link" href="#">
                                        <span class="account-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                stroke-width="1.8">
                                                <rect x="3" y="3" width="7" height="7" rx="2" />
                                                <rect x="14" y="3" width="7" height="7" rx="2" />
                                                <rect x="3" y="14" width="7" height="7" rx="2" />
                                                <rect x="14" y="14" width="7" height="7" rx="2" />
                                            </svg>
                                        </span>
                                        <span>Dashboard</span>
                                    </a>
                                    <div class="account-submenu">
                                        <a href="#">Resumen general</a>
                                        <a href="#">Estadisticas del evento</a>
                                        <a href="#">Actividad reciente</a>
                                    </div>
                                </div>
                                <div class="account-item">
                                    <a class="account-link" href="#">
                                        <span class="account-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                stroke-width="1.8">
                                                <path d="M4 6h16v12H4z" />
                                                <path d="m4 7 8 6 8-6" />
                                            </svg>
                                        </span>
                                        <span>Mis invitaciones</span>
                                    </a>
                                    <div class="account-submenu">
                                        <a href="#">Crear invitacion</a>
                                    </div>
                                </div>
                                <div class="account-item">
                                    <a class="account-link" href="#">
                                        <span class="account-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                stroke-width="1.8">
                                                <circle cx="12" cy="12" r="3" />
                                                <path
                                                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34h0A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54h0a1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86v0A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
                                            </svg>
                                        </span>
                                        <span>Configuracion</span>
                                    </a>
                                    <div class="account-submenu">
                                        <a href="#">Perfil</a>
                                        <a href="#">Seguridad</a>
                                    </div>
                                </div>
                                <button type="button" class="account-logout-main" @click="handleLogout">
                                    <span class="logout-label">Cerrar sesion</span>
                                    <span class="logout-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                            <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                                            <path d="m16 17 5-5-5-5" />
                                            <path d="M21 12H9" />
                                        </svg>
                                    </span>
                                </button>
                            </template>
                        </div>
                    </div>
                </nav>
                <button v-show="!(isMenuOpen && isMobile)" class="menu-toggle mobile-only" type="button"
                    :aria-expanded="isMenuOpen" aria-controls="mobile-menu" aria-haspopup="menu"
                    :aria-label="isMenuOpen ? 'Cerrar menu' : 'Abrir menu'" @click="toggleMenu">
                    <span class="menu-icon">
                        <span></span>
                        <span></span>
                    </span>
                </button>
            </div>
        </div>

        <transition name="menu-slide">
            <div v-if="isMenuOpen && isMobile" id="mobile-menu" class="mobile-menu" role="dialog" aria-modal="true"
                aria-label="Menu principal">
                <button type="button" class="mobile-menu-scrim" aria-label="Cerrar menu" @click="closeMenu"></button>
                <aside class="mobile-menu-panel">
                    <div class="mobile-menu-head">
                        <div class="mobile-brand-icon-wrap">
                            <img class="brand-logo-mobile brand-logo-mobile-icon" src="/brand/logo_icon.png" alt="InvitaSR" />
                        </div>
                        <button type="button" class="mobile-menu-close" aria-label="Cerrar menu" @click="closeMenu">
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
                        <RouterLink class="mobile-link-card" to="/planes" @click="closeMenu">
                            <span class="mobile-link-title">Planes</span>
                            <span class="mobile-link-subtitle">Elige la opcion ideal para tu evento</span>
                        </RouterLink>
                        <a class="mobile-link-card" href="/#como-funciona" @click="closeMenu">
                            <span class="mobile-link-title">Como funciona</span>
                            <span class="mobile-link-subtitle">Mira lo facil que es crear y publicar</span>
                        </a>
                        <a class="mobile-link-card" href="/#inspiracion" @click="closeMenu">
                            <span class="mobile-link-title">Inspiracion</span>
                            <span class="mobile-link-subtitle">Descubre estilos para tu tipo de evento</span>
                        </a>
                        <a class="mobile-link-card" href="/#demo" @click="closeMenu">
                            <span class="mobile-link-title">Demo</span>
                            <span class="mobile-link-subtitle">Explora una vista real de la experiencia</span>
                        </a>
                        <RouterLink class="mobile-link-card" to="/noticias" @click="closeMenu">
                            <span class="mobile-link-title">Noticias</span>
                            <span class="mobile-link-subtitle">Novedades y tendencias del momento</span>
                        </RouterLink>
                    </nav>

                    <div class="mobile-menu-actions">
                        <template v-if="!isAuthenticated">
                            <BaseButton variant="ghost" type="button" @click="handleMobileLoginAction">
                                Iniciar sesion
                            </BaseButton>
                            <BaseButton as="RouterLink" to="/planes" variant="primary" @click="closeMenu">
                                Ver planes
                            </BaseButton>
                        </template>
                        <template v-else>
                            <BaseButton
                                as="RouterLink"
                                :to="isMaster ? '/backoffice' : '/dashboard'"
                                variant="primary"
                                @click="closeMenu">
                                Ir a dashboard
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
        </transition>

        <BaseModal
            v-if="isMobile"
            v-model="isLoginMenuOpen"
            overlay-class="mobile-login-overlay"
            panel-class="mobile-login-panel"
            aria-label="Iniciar sesion"
            @close="closeLoginMenu">
            <div class="mobile-login-head">
                <img class="mobile-login-brand" src="/brand/logo_icon.png" alt="InvitaSR" />
                <h3>Inicia sesion</h3>
                <p>Accede a tu cuenta y continua donde quedaste.</p>
            </div>
            <AuthForm :loading="isLoginLoading" :error-message="loginError" :field-errors="loginFieldErrors"
                @submit="handleLoginSubmit" />
            <div class="mobile-login-divider"></div>
            <AuthProviders :providers="['google', 'facebook']" />
        </BaseModal>
    </header>
</template>

<style scoped>
.public-header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(255, 255, 255, 0.7);
    border-bottom: 1px solid rgba(233, 220, 255, 0.9);
}

.public-header.is-home:not(.menu-open) {
    position: fixed;
    inset: 0 0 auto 0;
    background: linear-gradient(180deg, rgba(15, 9, 24, 0.56), rgba(15, 9, 24, 0.2) 70%, transparent);
    border-bottom-color: transparent;
    backdrop-filter: blur(4px);
}

.public-header.is-home:not(.menu-open) .brand-logo {
    filter: drop-shadow(0 8px 22px rgba(12, 8, 20, 0.4));
}

.public-header.is-home:not(.menu-open) .nav-links {
    color: rgba(255, 255, 255, 0.85);
}

.public-header.is-home:not(.menu-open) .nav-links a:hover {
    color: #fff;
}

.public-header.is-home:not(.menu-open) .account-trigger {
    background: rgba(255, 255, 255, 0.96);
}

.public-header.menu-open {
    position: fixed;
    inset: 0;
    height: 100vh;
    background: transparent;
    backdrop-filter: none;
    overflow-y: auto;
    z-index: 60;
}

.nav {
    padding: 18px 0;
}

.brand-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 24px;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-logo {
    width: 140px;
    height: 44px;
    object-fit: contain;
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
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(122, 79, 217, 0.1);
    border: 1px solid rgba(155, 107, 255, 0.22);
}

.brand-name {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.2px;
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.account-menu {
    position: relative;
}

.login-menu {
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

.account-submenu a,
.account-submenu button {
    display: block;
    padding: 10px 12px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--brand-ink);
    font-weight: 600;
    text-align: left;
    cursor: pointer;
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
}


.account-submenu a:hover,
.account-submenu a:focus-visible,
.account-submenu button:hover,
.account-submenu button:focus-visible {
    background: var(--gradient-brand);
    color: #fff;
}

.account-logout {
    color: #b91c1c;
}

.account-logout:hover {
    background: #b91c1c;
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

.login-dropdown {
    position: absolute;
    top: calc(100% + 12px);
    left: 50%;
    transform: translateX(-60%);
    width: 340px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(233, 220, 255, 0.7);
    border-radius: 20px;
    padding: 18px;
    box-shadow: var(--shadow-card);
    display: grid;
    gap: 12px;
    z-index: 12;
}


.nav-links {
    display: flex;
    justify-content: center;
    gap: 22px;
    font-weight: 600;
    color: var(--muted);
}

.nav-links a:hover {
    color: var(--brand-ink);
}

.mobile-only {
    display: none;
}

.menu-toggle {
    display: none;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gradient-brand);
    border: none;
    cursor: pointer;
    font-weight: 600;
    box-shadow: var(--shadow-card);
}

.menu-icon {
    position: relative;
    width: 22px;
    height: 12px;
    display: inline-block;
}

.menu-icon span {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: #fff;
    transition: transform 0.2s ease, top 0.2s ease;
}

.menu-icon span:first-child {
    top: 0;
}

.menu-icon span:last-child {
    top: 10px;
}


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
    height: 100%;
    padding: calc(20px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: linear-gradient(170deg, #fff 0%, #f9f4ff 100%);
    border-left: 1px solid rgba(233, 220, 255, 0.9);
    box-shadow: -22px 0 44px rgba(36, 22, 60, 0.18);
}

.mobile-menu-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.mobile-menu-close {
    width: 42px;
    height: 42px;
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
    gap: 10px;
    overflow-y: auto;
    padding-right: 4px;
    min-height: 0;
}

.mobile-link-card {
    display: grid;
    gap: 2px;
    padding: 13px 14px;
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
    font-size: 16px;
    line-height: 1.2;
    font-weight: 700;
    color: #2f1f47;
}

.mobile-link-subtitle {
    font-size: 12px;
    line-height: 1.3;
    color: #6a5a84;
}

.mobile-menu-caption {
    margin: 0;
    color: #5f4f78;
    font-size: 14px;
    line-height: 1.4;
    max-width: 32ch;
}

.mobile-menu-actions {
    margin-top: auto;
    display: grid;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(155, 107, 255, 0.18);
}

.mobile-menu-actions .btn {
    width: 100%;
}

.mobile-dashboard-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    padding: 11px 14px;
    border: 1px solid rgba(155, 107, 255, 0.24);
    color: #5d2dc2;
    font-weight: 700;
    font-size: 14px;
    background: #fff;
}

.mobile-dashboard-link:hover,
.mobile-dashboard-link:focus-visible {
    border-color: rgba(155, 107, 255, 0.4);
    background: #f8f2ff;
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

:global(.mobile-login-overlay) {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(20, 12, 34, 0.45);
    backdrop-filter: blur(8px);
}

:global(.mobile-login-panel) {
    width: min(430px, 94vw);
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(233, 220, 255, 0.82);
    border-radius: 24px;
    padding: 20px;
    display: grid;
    gap: 12px;
    box-shadow: 0 20px 44px rgba(38, 20, 66, 0.26);
}

.mobile-login-head {
    display: grid;
    gap: 4px;
    text-align: center;
}

.mobile-login-brand {
    width: 44px;
    height: 44px;
    object-fit: contain;
    margin: 0 auto 2px;
}

.mobile-login-head h3 {
    margin: 0;
    color: #2f1f47;
    font-size: 22px;
    font-weight: 700;
}

.mobile-login-head p {
    margin: 0;
    color: #6d5d87;
    font-size: 13px;
}

.mobile-login-divider {
    height: 1px;
    border-radius: 999px;
    background: rgba(155, 107, 255, 0.2);
}

.mobile-links a,
.mobile-links .link-button {
    color: var(--brand-ink);
}

.link-button {
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
}


.link-button.muted {
    color: var(--muted);
    cursor: not-allowed;
}

.mobile-cta {
    display: flex;
    justify-content: center;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
    opacity: 0;
}

.menu-slide-enter-from .mobile-menu-panel,
.menu-slide-leave-to .mobile-menu-panel {
    transform: translateX(18px);
}

.menu-slide-enter-active .mobile-menu-panel,
.menu-slide-leave-active .mobile-menu-panel {
    transition: transform 0.24s ease;
}

@media (max-width: 1010px) {
    .brand-row {
        grid-template-columns: auto 1fr auto;
        gap: 12px;
    }

    .brand-name {
        display: none;
    }

    .nav-actions {
        display: none;
    }

    .nav-links {
        display: none;
    }

    .menu-toggle {
        display: inline-flex;
    }

    .mobile-only {
        display: inline-flex;
        justify-self: end;
    }
}

@media (max-width: 420px) {
    .nav {
        padding: 14px 0;
    }

    .brand-logo {
        width: 120px;
        height: 36px;
    }

    .menu-toggle {
        padding: 10px 14px;
    }

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

:global(body) {
    --public-header-height: 80px;
}

:global(body.mobile-menu-open) {
    padding-top: var(--public-header-height);
}
</style>

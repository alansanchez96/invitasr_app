<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthForm from '@/components/auth/AuthForm.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { backofficeModuleGroups } from '@/config/backofficeModules'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const isAuthenticated = computed(() => session.isAuthenticated)
const isMaster = computed(() => session.isMaster)
const isLoginLoading = computed(() => session.isLoading)
const showBar = computed(() => route.path === '/' || route.path === '/planes')
const isPopping = ref(false)
const activeMenu = ref<'dashboard' | 'invitaciones' | 'config' | 'backoffice' | null>(null)
const loginError = ref<string | null>(null)
const loginFieldErrors = ref<Record<string, string[]>>({})
const isLoginOpen = ref(false)
const loginStep = ref<'providers' | 'email'>('providers')
const accountDisplayName = computed(() => {
    const fullName = [session.user?.name, session.user?.last_name]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' ')
        .trim()
    return fullName || session.user?.email || 'Mi cuenta'
})
const activeMenuLabel = computed(() => {
    if (activeMenu.value === 'backoffice') return 'Dashboard'
    if (activeMenu.value === 'dashboard') return 'Dashboard'
    if (activeMenu.value === 'invitaciones') return 'Mis invitaciones'
    if (activeMenu.value === 'config') return 'Configuracion'
    return 'Panel'
})

const invitations = ref<string[]>([])

let popTimer: number | undefined

const handleScroll = () => {
    if (!showBar.value) return
    if (window.scrollY < 1) return
    isPopping.value = false
    if (popTimer) {
        window.clearTimeout(popTimer)
    }
    requestAnimationFrame(() => {
        isPopping.value = true
        popTimer = window.setTimeout(() => {
            isPopping.value = false
        }, 350)
    })
}

const openMenu = (menu: 'dashboard' | 'invitaciones' | 'config' | 'backoffice') => {
    activeMenu.value = activeMenu.value === menu ? null : menu
}

const handleLogout = () => {
    session.logout().finally(() => {
        activeMenu.value = null
        if (route.path.startsWith('/backoffice') || route.path.startsWith('/dashboard')) {
            router.push('/')
        }
    })
}

const openLogin = () => {
    isLoginOpen.value = true
    loginStep.value = 'providers'
    loginError.value = null
    loginFieldErrors.value = {}
}

const closeLogin = () => {
    isLoginOpen.value = false
    loginError.value = null
    loginFieldErrors.value = {}
}

const openEmailLogin = () => {
    loginStep.value = 'email'
}

const goBackToProviders = () => {
    loginStep.value = 'providers'
}

type ProviderKey = 'email' | 'google' | 'facebook'

const handleProviderSelect = (provider: ProviderKey) => {
    if (provider === 'email') {
        openEmailLogin()
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
    closeLogin()
}

watch(activeMenu, (value) => {
    document.body.classList.toggle('mobile-cta-open', Boolean(value))
})

watch(isLoginOpen, (value) => {
    document.body.style.overflow = value ? 'hidden' : ''
})

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    if (popTimer) {
        window.clearTimeout(popTimer)
    }
    document.body.classList.remove('mobile-cta-open')
    document.body.style.overflow = ''
})
</script>

<template>
    <div v-if="showBar" class="mobile-cta-bar" :class="{ 'is-animated': isPopping, 'has-popover': activeMenu }">
        <div class="container mobile-cta-wrap">
            <div v-if="!isAuthenticated" class="mobile-cta-inner">
                <BaseButton variant="ghost" type="button" @click="openLogin">Iniciar sesion</BaseButton>
                <BaseButton as="RouterLink" variant="primary" to="/planes">Ver planes</BaseButton>
            </div>
            <div v-else class="mobile-cta-inner icon-nav" :class="{ 'is-master': isMaster }">
                <div class="mobile-identity" :class="{ 'is-master': isMaster }">
                    <img class="mobile-identity-logo" src="/brand/logo_icon.png" alt="Cuenta de usuario" />
                    <div class="mobile-identity-copy">
                        <span class="mobile-identity-kicker">Sesion activa</span>
                        <strong class="mobile-identity-name">{{ accountDisplayName }}</strong>
                    </div>
                </div>
                <template v-if="isMaster">
                    <button class="icon-link" type="button" @click="openMenu('backoffice')" title="Dashboard"
                        aria-label="Dashboard">
                        <span class="icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="url(#icon-gradient)" stroke-width="1.8">
                                <defs>
                                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#7a4fd9" />
                                        <stop offset="50%" stop-color="#9b6bff" />
                                        <stop offset="100%" stop-color="#f06aa6" />
                                    </linearGradient>
                                </defs>
                                <rect x="3" y="3" width="7" height="7" rx="2" />
                                <rect x="14" y="3" width="7" height="7" rx="2" />
                                <rect x="3" y="14" width="7" height="7" rx="2" />
                                <rect x="14" y="14" width="7" height="7" rx="2" />
                            </svg>
                        </span>
                        <span class="icon-label">Dashboard</span>
                    </button>
                    <button class="icon-link" type="button" @click="openMenu('config')" title="Configuracion"
                        aria-label="Configuracion">
                        <span class="icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="url(#icon-gradient)" stroke-width="1.8">
                                <defs>
                                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#7a4fd9" />
                                        <stop offset="50%" stop-color="#9b6bff" />
                                        <stop offset="100%" stop-color="#f06aa6" />
                                    </linearGradient>
                                </defs>
                                <circle cx="12" cy="12" r="3" />
                                <path
                                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34h0A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54h0a1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86v0A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
                            </svg>
                        </span>
                        <span class="icon-label">Configuracion</span>
                    </button>
                </template>
                <template v-else>
                    <button class="icon-link" type="button" @click="openMenu('dashboard')" title="Ir al dashboard"
                        aria-label="Ir al Dashboard">
                        <span class="icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="url(#icon-gradient)" stroke-width="1.8">
                                <defs>
                                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#7a4fd9" />
                                        <stop offset="50%" stop-color="#9b6bff" />
                                        <stop offset="100%" stop-color="#f06aa6" />
                                    </linearGradient>
                                </defs>
                                <rect x="3" y="3" width="7" height="7" rx="2" />
                                <rect x="14" y="3" width="7" height="7" rx="2" />
                                <rect x="3" y="14" width="7" height="7" rx="2" />
                                <rect x="14" y="14" width="7" height="7" rx="2" />
                            </svg>
                        </span>
                        <span class="icon-label">Dashboard</span>
                    </button>
                    <button class="icon-link" type="button" @click="openMenu('invitaciones')"
                        title="Ver mis invitaciones" aria-label="Ver mis invitaciones">
                        <span class="icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="url(#icon-gradient)" stroke-width="1.8">
                                <defs>
                                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#7a4fd9" />
                                        <stop offset="50%" stop-color="#9b6bff" />
                                        <stop offset="100%" stop-color="#f06aa6" />
                                    </linearGradient>
                                </defs>
                                <path d="M4 6h16v12H4z" />
                                <path d="m4 7 8 6 8-6" />
                            </svg>
                        </span>
                        <span class="icon-label">Invitaciones</span>
                    </button>
                    <button class="icon-link" type="button" @click="openMenu('config')" title="Configuracion"
                        aria-label="Configuracion">
                        <span class="icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="url(#icon-gradient)" stroke-width="1.8">
                                <defs>
                                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#7a4fd9" />
                                        <stop offset="50%" stop-color="#9b6bff" />
                                        <stop offset="100%" stop-color="#f06aa6" />
                                    </linearGradient>
                                </defs>
                                <circle cx="12" cy="12" r="3" />
                                <path
                                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.86.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.86l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.86.34h0A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.54h0a1.7 1.7 0 0 0 1.86-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.86v0A1.7 1.7 0 0 0 20.92 10H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.54 1Z" />
                            </svg>
                        </span>
                        <span class="icon-label">Configuracion</span>
                    </button>
                </template>
            </div>

            <div v-if="activeMenu" class="cta-popover-backdrop" @click="activeMenu = null"></div>
            <div v-if="activeMenu" class="cta-popover" :class="`is-${activeMenu}`">
                <div class="cta-popover-inner">
                    <div class="cta-popover-head">
                        <span class="cta-popover-section">{{ activeMenuLabel }}</span>
                        <p class="cta-popover-user">{{ accountDisplayName }}</p>
                    </div>
                    <div v-if="activeMenu === 'backoffice'" class="cta-options scrollable">
                        <div v-for="group in backofficeModuleGroups" :key="group.title" class="cta-group">
                            <span class="cta-group-title">{{ group.title }}</span>
                            <RouterLink v-for="module in group.items" :key="module.label" :to="module.href"
                                class="cta-group-link cta-nav-link" @click="activeMenu = null">
                                <span>{{ module.label }}</span>
                            </RouterLink>
                        </div>
                    </div>
                    <div v-else-if="activeMenu === 'dashboard'" class="cta-options">
                        <button type="button">Resumen general</button>
                        <button type="button">Estadisticas del evento</button>
                        <button type="button">Actividad reciente</button>
                    </div>
                    <div v-else-if="activeMenu === 'invitaciones'" class="cta-options">
                        <template v-if="invitations.length">
                            <button v-for="invitation in invitations.slice(0, 3)" :key="invitation" type="button">
                                {{ invitation }}
                            </button>
                        </template>
                        <button v-else type="button" class="cta-create">+ Crear invitacion</button>
                    </div>
                    <div v-else-if="activeMenu === 'config'" class="cta-options">
                        <button type="button">Perfil</button>
                        <button type="button">Seguridad</button>
                        <button type="button" class="cta-logout" @click="handleLogout">Cerrar sesion</button>
                    </div>
                </div>
            </div>
        </div>

        <BaseModal v-model="isLoginOpen" overlay-class="login-overlay" panel-class="login-card" @close="closeLogin">
            <button v-if="loginStep === 'email'" class="login-back" type="button" @click="goBackToProviders"
                aria-label="Volver a opciones de acceso">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M15 18 9 12l6-6" />
                </svg>
            </button>
            <div class="login-head">
                <img class="login-brand" src="/brand/logo_icon.png" alt="InvitaSR" />
                <h3 class="login-title">Accede a tu panel</h3>
                <p class="login-subtitle">Invitaciones, invitados y estadisticas en un solo lugar.</p>
            </div>
            <AuthProviders v-if="loginStep === 'providers'" variant="stack" :providers="['email', 'google', 'facebook']"
                @select="handleProviderSelect" />
            <AuthForm v-else :loading="isLoginLoading" :error-message="loginError" :field-errors="loginFieldErrors"
                @submit="handleLoginSubmit" />
            <div v-if="loginStep === 'providers'" class="login-proof">
                <span>+1,200 organizadores confian en InvitaSR</span>
                <span>Mas de 1,200 eventos creados este mes</span>
            </div>
            <div v-if="loginStep === 'providers'" class="login-foot">
                <a href="#">Todavia no tienes tu cuenta?</a>
            </div>
        </BaseModal>
    </div>
</template>

<style scoped>
.mobile-cta-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 16px;
    z-index: 30;
    display: none;
}

:global(body.mobile-menu-open) .mobile-cta-bar {
    z-index: 5;
}

.mobile-cta-inner {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 10px;
    box-shadow: var(--shadow-card);
    backdrop-filter: blur(10px);
}

.mobile-cta-inner .btn {
    width: 100%;
}

.mobile-cta-wrap {
    position: relative;
}

.icon-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    text-align: center;
    padding: 8px 10px 10px;
    border-radius: 26px;
    row-gap: 8px;
}

.icon-nav.is-master {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mobile-identity {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    padding: 7px 10px 8px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(122, 79, 217, 0.12), rgba(240, 106, 166, 0.08));
    border: 1px solid rgba(155, 107, 255, 0.18);
}

.mobile-identity-logo {
    width: 30px;
    height: 30px;
    object-fit: contain;
    border-radius: 999px;
    border: 1px solid rgba(155, 107, 255, 0.22);
    background: #fff;
    padding: 4px;
}

.mobile-identity-copy {
    display: grid;
    min-width: 0;
}

.mobile-identity-kicker {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(90, 48, 140, 0.66);
    font-weight: 700;
}

.mobile-identity-name {
    font-size: 13px;
    color: var(--brand-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.icon-link {
    display: grid;
    place-items: center;
    gap: 4px;
    color: var(--brand-ink);
    position: relative;
    padding: 8px 0;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(155, 107, 255, 0.16);
    border-radius: 12px;
    cursor: pointer;
}

.icon {
    width: 24px;
    height: 24px;
}

.icon svg {
    width: 100%;
    height: 100%;
}

.icon-label {
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: rgba(90, 48, 140, 0.88);
}

.icon-link:hover,
.icon-link:focus-visible {
    background: var(--gradient-brand);
    border-color: rgba(155, 107, 255, 0.2);
    color: #fff;
}

.icon-link:hover .icon-label,
.icon-link:focus-visible .icon-label {
    color: #fff;
}

.mobile-cta-bar.is-animated .mobile-cta-inner {
    animation: cta-pop 0.35s ease;
}

@keyframes cta-pop {
    0% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-6px);
    }

    100% {
        transform: translateY(0);
    }
}

.cta-popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 4;
    background: transparent;
}

.cta-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    width: 80%;
    z-index: 5;
}

.cta-popover-inner {
    background: rgba(255, 255, 255, 0.88);
    border-radius: 20px;
    border: 1px solid rgba(233, 220, 255, 0.6);
    box-shadow: 0 16px 36px rgba(90, 48, 140, 0.18);
    padding: 12px;
    display: grid;
    gap: 10px;
    backdrop-filter: blur(10px);
    animation: pop-in 0.24s ease;
}

.cta-popover-head {
    display: grid;
    gap: 2px;
    text-align: left;
    padding: 2px 6px 10px;
    border-bottom: 1px solid rgba(155, 107, 255, 0.2);
}

.cta-popover-section {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(90, 48, 140, 0.65);
    font-weight: 700;
}

.cta-popover-user {
    margin: 0;
    font-size: 14px;
    color: var(--brand-ink);
    font-weight: 700;
}

.cta-popover.is-dashboard {
    left: 0;
}

.cta-popover.is-backoffice {
    left: 0;
}

.cta-popover.is-invitaciones {
    left: 50%;
    transform: translateX(-50%);
}

.cta-popover.is-config {
    right: 0;
}

.cta-options {
    display: grid;
    gap: 4px;
}

.cta-options.scrollable {
    max-height: 260px;
    overflow-y: auto;
}

.cta-group {
    display: grid;
    gap: 6px;
    padding-bottom: 8px;
    border-bottom: 1px dashed rgba(155, 107, 255, 0.2);
}

.cta-group:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.cta-group-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(90, 48, 140, 0.65);
    font-weight: 700;
    text-align: left;
    padding-left: 8px;
}

.cta-group-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}


.cta-options button {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(155, 107, 255, 0.14);
    background: rgba(255, 255, 255, 0.76);
    font-weight: 600;
    text-align: left;
    color: var(--brand-ink);
    cursor: pointer;
    text-align: left;
}

.cta-options .cta-nav-link {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(155, 107, 255, 0.14);
    background: rgba(255, 255, 255, 0.76);
    font-weight: 600;
    color: var(--brand-ink);
    text-align: left;
}

.cta-options button:hover,
.cta-options button:focus-visible,
.cta-options .cta-nav-link:hover,
.cta-options .cta-nav-link:focus-visible {
    color: var(--bg);
    background: var(--gradient-brand);
    border-color: rgba(155, 107, 255, 0.2);
}

.cta-create {
    border: 1px dashed rgba(155, 107, 255, 0.4);
    background: rgba(255, 255, 255, 0.7);
    text-align: center;
}

.cta-create:hover,
.cta-create:focus-visible {
    background: var(--gradient-brand) !important;
    color: #fff;
    box-shadow: var(--shadow-soft) !important;
}

.cta-logout {
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(242, 178, 178, 0.8) !important;
    background: #ffe8ea !important;
    color: #b91c1c !important;
    font-weight: 600;
    cursor: pointer;
}

.cta-logout:hover,
.cta-logout:focus-visible {
    background: #b91c1c !important;
    color: #fff !important;
    border-color: #b91c1c !important;
}

@keyframes pop-in {
    0% {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

:global(.login-overlay) {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(245, 240, 255, 0.7);
    backdrop-filter: blur(8px);
}

:global(.login-card) {
    width: min(420px, 92vw);
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(233, 220, 255, 0.7);
    border-radius: 28px;
    padding: 26px 22px;
    box-shadow: 0 24px 50px rgba(90, 48, 140, 0.2);
    display: grid;
    gap: 16px;
    position: relative;
}

:global(.login-back) {
    position: absolute;
    top: 14px;
    left: 14px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(155, 107, 255, 0.25);
    background: #fff;
    color: #7a4fd9;
    display: grid;
    place-items: center;
    cursor: pointer;
}

:global(.login-back svg) {
    width: 18px;
    height: 18px;
}

:global(.login-back:hover),
:global(.login-back:focus-visible) {
    background: var(--gradient-brand);
    color: #fff;
}

:global(.login-head) {
    display: grid;
    justify-items: center;
    gap: 6px;
    text-align: center;
}

:global(.login-brand) {
    width: 52px;
    height: 52px;
    object-fit: contain;
}

:global(.login-title) {
    font-size: 20px;
    font-weight: 700;
    color: var(--brand-ink);
}

:global(.login-subtitle) {
    font-size: 13px;
    color: var(--muted);
}


:global(.login-proof) {
    display: grid;
    gap: 8px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
}

:global(.login-foot) {
    text-align: center;
    font-size: 13px;
}

:global(.login-foot a) {
    color: var(--brand-ink);
    font-weight: 600;
}

:global(.login-foot a:hover) {
    color: #7a4fd9;
}

@media (max-width: 1010px) {
    .mobile-cta-bar {
        display: block;
    }
}

@media (max-width: 468px) {
    .cta-popover {
        width: 70%;
    }
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthForm from '@/components/auth/AuthForm.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const isMenuOpen = ref(false)
const isMobile = ref(false)
const isAuthenticated = computed(() => session.isAuthenticated)
const isLoginLoading = computed(() => session.isLoading)
const isAccountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)
const isLoginMenuOpen = ref(false)
const loginMenuRef = ref<HTMLElement | null>(null)
const loginError = ref<string | null>(null)
const loginFieldErrors = ref<Record<string, string[]>>({})

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

const handleLogout = () => {
    session.logout().finally(() => {
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
    <header class="public-header" :class="{ 'menu-open': isMenuOpen && isMobile }">
        <div class="container nav">
            <div class="brand-row">
                <RouterLink v-show="!(isMenuOpen && isMobile)" class="brand" to="/">
                    <img class="brand-logo" src="/brand/logo-transparent.png" alt="InvitaSR" />
                </RouterLink>
                <nav class="nav-links">
                    <RouterLink to="/noticias">Noticias</RouterLink>
                    <a href="/#como-funciona">Como funciona</a>
                    <a href="/#inspiracion">Inspiracion</a>
                    <RouterLink to="/planes">Planes</RouterLink>
                    <a href="/#demo">Demo</a>
                </nav>
                <nav class="nav-actions">
                    <template v-if="!isAuthenticated">
                        <div class="login-menu" ref="loginMenuRef">
                            <BaseButton variant="ghost" type="button" @click.stop="toggleLoginMenu"
                                :aria-expanded="isLoginMenuOpen">
                                Iniciar sesion
                            </BaseButton>
                            <div v-if="isLoginMenuOpen" class="login-dropdown" @click.stop>
                                <AuthForm :loading="isLoginLoading" :error-message="loginError"
                                    :field-errors="loginFieldErrors" @submit="handleLoginSubmit" />
                                <div class="auth-divider"></div>
                                <AuthProviders :providers="['google', 'facebook']" />
                            </div>
                        </div>
                        <BaseButton as="a" href="/planes" variant="primary">Ver planes</BaseButton>
                    </template>
                    <div v-else class="account-menu" ref="accountMenuRef">
                        <button class="account-trigger" type="button" @click.stop="toggleAccountMenu"
                            :aria-expanded="isAccountMenuOpen">
                            <img class="account-logo" src="/brand/logo_icon.png" alt="Cuenta" />
                        </button>
                        <div v-if="isAccountMenuOpen" class="account-dropdown" @click.stop>
                            <div class="account-item">
                                <a class="account-link" href="#">
                                    <span class="account-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
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
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
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
                            <button type="button" class="account-logout-main" @click="handleLogout">Cerrar sesion</button>
                        </div>
                    </div>
                </nav>
                <button v-show="!(isMenuOpen && isMobile)" class="menu-toggle mobile-only" type="button"
                    :aria-expanded="isMenuOpen" aria-controls="mobile-menu"
                    :aria-label="isMenuOpen ? 'Cerrar menu' : 'Abrir menu'" @click="toggleMenu">
                    <span class="menu-icon">
                        <span></span>
                        <span></span>
                    </span>
                </button>
            </div>
        </div>

        <transition name="menu-slide">
            <div v-if="isMenuOpen && isMobile" id="mobile-menu" class="mobile-menu">
                <div class="mobile-menu-inner">
                    <div class="mobile-brand">
                        <img class="brand-logo-mobile" src="/brand/logo_icon.png" alt="InvitaSR" />
                    </div>
                    <nav class="mobile-links">
                        <RouterLink to="/noticias" @click="closeMenu">Noticias</RouterLink>
                        <RouterLink to="/planes" @click="closeMenu">Planes</RouterLink>
                        <a href="/#como-funciona" @click="closeMenu">Como funciona</a>
                        <a href="/#inspiracion" @click="closeMenu">Inspiracion</a>
                        <a href="/#demo" @click="closeMenu">Ver demo</a>
                    </nav>
                    <button class="menu-close-fab" type="button" aria-label="Cerrar menu" @click="closeMenu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path d="M12 5v14" />
                            <path d="m6 11 6-6 6 6" />
                        </svg>
                    </button>
                </div>
            </div>
        </transition>
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

.public-header.menu-open {
    position: fixed;
    inset: 0;
    height: 100vh;
    background: rgba(247, 243, 255, 0.72);
    backdrop-filter: blur(5px);
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
    width: 240px;
    height: 120px;
    object-fit: contain;
    margin-top: -50px;
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
    min-width: 220px;
    background: #fff;
    border-radius: 16px;
    border: 1px solid rgba(233, 220, 255, 0.7);
    box-shadow: var(--shadow-card);
    padding: 10px;
    display: grid;
    gap: 6px;
    z-index: 10;
}

.account-item {
    position: relative;
    padding-right: 8px;
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
    margin-right: 8px;
    min-width: 220px;
    background: #fff;
    border-radius: 14px;
    border: 1px solid rgba(233, 220, 255, 0.7);
    box-shadow: var(--shadow-card);
    padding: 8px;
    display: grid;
    gap: 6px;
    opacity: 0;
    visibility: hidden;
    transform: translateX(-6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 10;
}

.account-submenu::before {
    content: '';
    position: absolute;
    right: -8px;
    top: 0;
    width: 8px;
    height: 100%;
}

.account-item:hover .account-submenu {
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
    position: absolute;
    inset: 0;
    background: transparent;
    z-index: 40;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 120px 20px 40px;
}

.menu-close-fab {
    position: absolute;
    right: 34px;
    bottom: 100px;
    width: 54px;
    height: 54px;
    border-radius: 16px;
    border: none;
    background: var(--gradient-brand);
    color: #fff;
    box-shadow: var(--shadow-soft);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: bottom 0.25s ease;
    z-index: 50;
}

.menu-close-fab svg {
    width: 22px;
    height: 22px;
}

.mobile-menu-inner {
    width: min(420px, 90vw);
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.mobile-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    justify-content: center;
}

.mobile-links {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 18px;
    font-weight: 600;
    text-align: center;
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

:global(body.mobile-menu-open) .menu-close-fab {
    bottom: calc(140px + env(safe-area-inset-bottom));
}

:global(body.mobile-cta-open) .menu-close-fab {
    bottom: clamp(280px, 38vh, 520px);
}

:global(body) {
    --public-header-height: 80px;
}

:global(body.mobile-menu-open) {
    padding-top: var(--public-header-height);
}
</style>

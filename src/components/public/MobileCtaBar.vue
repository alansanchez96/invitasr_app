<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()
const isAuthenticated = computed(() => session.isAuthenticated)
const showBar = computed(() => route.path === '/' || route.path === '/planes')
const isPopping = ref(false)
const activeMenu = ref<'dashboard' | 'invitaciones' | 'config' | null>(null)
const isLoginOpen = ref(false)
const loginStep = ref<'providers' | 'email'>('providers')

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

const openMenu = (menu: 'dashboard' | 'invitaciones' | 'config') => {
    activeMenu.value = activeMenu.value === menu ? null : menu
}

const handleLogout = () => {
    session.clearSession()
    activeMenu.value = null
}

const openLogin = () => {
    isLoginOpen.value = true
    loginStep.value = 'providers'
}

const closeLogin = () => {
    isLoginOpen.value = false
}

const openEmailLogin = () => {
    loginStep.value = 'email'
}

const goBackToProviders = () => {
    loginStep.value = 'providers'
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
                <button class="btn btn-ghost" type="button" @click="openLogin">Iniciar sesion</button>
                <RouterLink class="btn btn-primary" to="/planes">Ver planes</RouterLink>
            </div>
            <div v-else class="mobile-cta-inner icon-nav">
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
                    <span class="tooltip">Ir al dashboard</span>
                </button>
                <button class="icon-link" type="button" @click="openMenu('invitaciones')" title="Ver mis invitaciones"
                    aria-label="Ver mis invitaciones">
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
                    <span class="tooltip">Ver mis invitaciones</span>
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
                    <span class="tooltip">Configuracion</span>
                </button>
            </div>

            <div v-if="activeMenu" class="cta-popover-backdrop" @click="activeMenu = null"></div>
            <div v-if="activeMenu" class="cta-popover" :class="`is-${activeMenu}`">
                <div class="cta-popover-inner">
                    <div v-if="activeMenu === 'dashboard'" class="cta-options">
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

        <teleport to="body">
            <div v-if="isLoginOpen" class="login-overlay" @click="closeLogin">
                <div class="login-card" @click.stop>
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
                    <div v-if="loginStep === 'providers'" class="login-methods">
                        <button class="auth-provider auth-provider--stack" type="button" @click="openEmailLogin">
                            <span class="auth-provider-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M4 6h16v12H4z" />
                                    <path d="m4 7 8 6 8-6" />
                                </svg>
                            </span>
                            <span>Email</span>
                        </button>
                        <button class="auth-provider auth-provider--stack" type="button">
                            <span class="auth-provider-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                                    <path d="M21 12h-8" />
                                </svg>
                            </span>
                            <span>Google</span>
                        </button>
                        <button class="auth-provider auth-provider--stack" type="button">
                            <span class="auth-provider-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" />
                                </svg>
                            </span>
                            <span>Facebook</span>
                        </button>
                    </div>
                    <div v-else class="login-form">
                        <label class="auth-field">
                            <span>Correo</span>
                            <input type="email" placeholder="tu@email.com" autocomplete="email" />
                        </label>
                        <label class="auth-field">
                            <span>Contrasena</span>
                            <input type="password" placeholder="Tu clave segura" autocomplete="current-password" />
                        </label>
                        <label class="auth-check">
                            <input type="checkbox" />
                            <span>Recordarme en este dispositivo</span>
                        </label>
                        <button class="btn btn-primary auth-cta" type="button">
                            <span class="cta-text">Entrar a mi cuenta</span>
                            <span class="cta-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14" />
                                    <path d="m13 6 6 6-6 6" />
                                </svg>
                            </span>
                        </button>
                        <div class="auth-links">
                            <a href="#">Olvidaste tu password?</a>
                            <a href="#">Todavia no tienes tu cuenta?</a>
                        </div>
                    </div>
                    <div v-if="loginStep === 'providers'" class="login-proof">
                        <span>+1,200 organizadores confian en InvitaSR</span>
                        <span>Mas de 1,200 eventos creados este mes</span>
                    </div>
                    <div v-if="loginStep === 'providers'" class="login-foot">
                        <a href="#">Todavia no tienes tu cuenta?</a>
                    </div>
                </div>
            </div>
        </teleport>
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
    padding: 6px 10px;
}

.icon-link {
    display: grid;
    place-items: center;
    gap: 6px;
    color: var(--brand-ink);
    position: relative;
    padding: 10px 0;
    background: none;
    border: none;
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

.tooltip {
    position: absolute;
    bottom: 100%;
    background: var(--brand-ink);
    color: #fff;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    white-space: nowrap;
}

.icon-link:hover .tooltip,
.icon-link:focus-visible .tooltip {
    opacity: 1;
    transform: translateY(-2px);
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
    padding: 10px;
    display: grid;
    gap: 12px;
    backdrop-filter: blur(10px);
    animation: pop-in 0.24s ease;
}

.cta-popover.is-dashboard {
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

.cta-options button {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid transparent;
    background: transparent;
    font-weight: 600;
    text-align: left;
    color: var(--brand-ink);
    cursor: pointer;
    text-align: center;
}

.cta-options button:hover,
.cta-options button:focus-visible {
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

.has-popover .tooltip {
    display: none;
}

.login-overlay {
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

.login-card {
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

.login-back {
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

.login-back svg {
    width: 18px;
    height: 18px;
}

.login-back:hover,
.login-back:focus-visible {
    background: var(--gradient-brand);
    color: #fff;
}

.login-head {
    display: grid;
    justify-items: center;
    gap: 6px;
    text-align: center;
}

.login-brand {
    width: 52px;
    height: 52px;
    object-fit: contain;
}

.login-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--brand-ink);
}

.login-subtitle {
    font-size: 13px;
    color: var(--muted);
}

.login-methods {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.login-form {
    display: grid;
    gap: 12px;
}

.login-proof {
    display: grid;
    gap: 8px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
}

.login-foot {
    text-align: center;
    font-size: 13px;
}

.login-foot a {
    color: var(--brand-ink);
    font-weight: 600;
}

.login-foot a:hover {
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

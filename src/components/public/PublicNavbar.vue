<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthForm from '@/components/auth/AuthForm.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { buildAvatarPaletteStyle, buildDisplayInitials } from '@/utils/userIdentity'
import PublicAccountMenu from '@/components/public/navbar/PublicAccountMenu.vue'
import PublicMobileMenu from '@/components/public/navbar/PublicMobileMenu.vue'
import type { PublicNavItem } from '@/components/public/navbar/types'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const isMenuOpen = ref(false)
const isMobile = ref(false)
const isAuthenticated = computed(() => session.isAuthenticated)
const isMaster = computed(() => session.isMaster)
const hasActiveClientPlan = computed(() => session.hasActiveClientPlan)
const isLoginLoading = computed(() => session.isLoading)
const isHomeRoute = computed(() => route.name === 'home')
const isHomeHeroZone = ref(false)
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
const clientEntryPath = computed(() =>
    session.isMaster ? '/backoffice' : session.hasActiveClientPlan ? '/panel' : '/onboarding/public',
)
const defaultDesktopNavItems: PublicNavItem[] = [
    { label: 'Noticias', to: '/noticias' },
    { label: 'Como funciona', href: '/#como-funciona' },
    { label: 'Inspiracion', href: '/#inspiracion' },
    { label: 'Planes', to: '/planes' },
]
const defaultMobileNavItems: PublicNavItem[] = [
    { label: 'Planes', to: '/planes', subtitle: 'Elige la opcion ideal para tu evento' },
    { label: 'Como funciona', href: '/#como-funciona', subtitle: 'Mira lo facil que es crear y publicar' },
    { label: 'Inspiracion', href: '/#inspiracion', subtitle: 'Descubre estilos para tu tipo de evento' },
    { label: 'Noticias', to: '/noticias', subtitle: 'Novedades y tendencias del momento' },
]
const desktopNavItems = computed(() => defaultDesktopNavItems)
const mobileNavItems = computed(() => defaultMobileNavItems)
let homeHeroElement: HTMLElement | null = null

const resetLoginState = () => {
    loginError.value = null
    loginFieldErrors.value = {}
}

const resolveNavItemProps = (item: PublicNavItem) => {
    if (item.to) return { to: item.to }
    return { href: item.href ?? '/' }
}

const toggleMenu = () => {
    if (!isMobile.value) return
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

const toggleLoginMenu = () => {
    isLoginMenuOpen.value = !isLoginMenuOpen.value
    if (isLoginMenuOpen.value) {
        resetLoginState()
    }
}

const closeLoginMenu = () => {
    isLoginMenuOpen.value = false
    resetLoginState()
}

const handleMobileLoginAction = () => {
    closeMenu()
    resetLoginState()
    window.setTimeout(() => {
        isLoginMenuOpen.value = true
    }, 180)
}

const handleLogout = () => {
    session.logout().finally(() => {
        closeMenu()
        if (route.path.startsWith('/backoffice') || route.path.startsWith('/panel')) {
            router.push('/')
        }
    })
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
    await router.push(clientEntryPath.value)
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
    updateHomeHeaderState()
}

const resolveHomeHeroElement = () => {
    if (!isHomeRoute.value) {
        homeHeroElement = null
        return
    }
    homeHeroElement = document.querySelector('.hero-only') as HTMLElement | null
}

const updateHomeHeaderState = () => {
    if (!isHomeRoute.value) {
        isHomeHeroZone.value = false
        return
    }

    if (!homeHeroElement) {
        resolveHomeHeroElement()
    }

    if (!homeHeroElement) {
        isHomeHeroZone.value = false
        return
    }

    const rect = homeHeroElement.getBoundingClientRect()
    const triggerOffset = Number.parseInt(
        getComputedStyle(document.body).getPropertyValue('--public-header-height') || '80',
        10,
    )
    isHomeHeroZone.value = rect.bottom > Math.max(64, triggerOffset)
}

onMounted(() => {
    updateViewport()
    resolveHomeHeroElement()
    updateHomeHeaderState()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('scroll', updateHomeHeaderState, { passive: true })
    document.addEventListener('click', handleLoginDocumentClick)
    document.addEventListener('keydown', handleLoginKeydown)
})

onUnmounted(() => {
    document.body.style.overflow = ''
    document.body.classList.remove('mobile-menu-open')
    window.removeEventListener('resize', updateViewport)
    window.removeEventListener('scroll', updateHomeHeaderState)
    document.removeEventListener('click', handleLoginDocumentClick)
    document.removeEventListener('keydown', handleLoginKeydown)
})

watch(
    () => route.name,
    async () => {
        await nextTick()
        resolveHomeHeroElement()
        updateHomeHeaderState()
    },
    { immediate: true },
)

watch(
    () => route.fullPath,
    () => {
        closeMenu()
        closeLoginMenu()
    },
)
</script>

<template>
    <header class="public-header" :class="{ 'menu-open': isMenuOpen && isMobile, 'is-home-route': isHomeRoute, 'is-home-hero': isHomeHeroZone }">
        <div class="container nav">
            <div class="brand-row">
                <RouterLink v-show="!(isMenuOpen && isMobile)" class="brand" to="/">
                    <img class="brand-logo" src="/brand/logo-transparent.png" alt="InvitaSR" />
                </RouterLink>
                <nav class="nav-links" aria-label="Navegacion principal">
                    <component
                        v-for="item in desktopNavItems"
                        :key="item.label"
                        :is="item.to ? RouterLink : 'a'"
                        v-bind="resolveNavItemProps(item)">
                        {{ item.label }}
                    </component>
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
                    <PublicAccountMenu
                        v-else
                        :is-master="isMaster"
                        :has-active-plan="hasActiveClientPlan"
                        :display-name="accountDisplayName"
                        :initials="accountInitials"
                        :avatar-style="accountAvatarStyle"
                        :is-hero-mode="isHomeHeroZone && !(isMenuOpen && isMobile)"
                        @logout="handleLogout" />
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
            <PublicMobileMenu
                v-if="isMenuOpen && isMobile"
                :items="mobileNavItems"
                :is-authenticated="isAuthenticated"
                :is-master="isMaster"
                :has-active-plan="hasActiveClientPlan"
                @close="closeMenu"
                @login="handleMobileLoginAction"
                @logout="handleLogout" />
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
    backdrop-filter: blur(4px);
    transition: background 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease;
}

.public-header.is-home-route:not(.menu-open) {
    position: fixed;
    inset: 0 0 auto 0;
}

.public-header.is-home-hero:not(.menu-open) {
    background: linear-gradient(180deg, rgba(15, 9, 24, 0.56), rgba(15, 9, 24, 0.2) 70%, transparent);
    border-bottom-color: transparent;
    backdrop-filter: blur(4px);
}

.public-header.is-home-hero:not(.menu-open) .brand-logo {
    filter: drop-shadow(0 8px 22px rgba(12, 8, 20, 0.4));
}

.public-header.is-home-hero:not(.menu-open) .nav-links {
    color: rgba(255, 255, 255, 0.85);
}

.public-header.is-home-hero:not(.menu-open) .nav-links a:hover {
    color: #fff;
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
    transition: filter 0.35s ease;
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.login-menu {
    position: relative;
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
    transition: color 0.35s ease;
}

.nav-links a {
    transition: color 0.35s ease;
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

.menu-slide-enter-from,
.menu-slide-leave-to {
    opacity: 0;
}

:deep(.menu-slide-enter-from .mobile-menu-panel),
:deep(.menu-slide-leave-to .mobile-menu-panel) {
    transform: translateX(18px);
}

:deep(.menu-slide-enter-active .mobile-menu-panel),
:deep(.menu-slide-leave-active .mobile-menu-panel) {
    transition: transform 0.24s ease;
}

@media (max-width: 1010px) {
    .brand-row {
        grid-template-columns: auto 1fr auto;
        gap: 12px;
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
}

:global(body) {
    --public-header-height: 80px;
}

:global(body.mobile-menu-open) {
    padding-top: var(--public-header-height);
}
</style>

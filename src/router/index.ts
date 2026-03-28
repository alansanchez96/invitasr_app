import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import PublicLayout from '@/layouts/PublicLayout.vue'
import PanelLayout from '@/layouts/PanelLayout.vue'
import HomePage from '@/pages/public/HomePage.vue'
import PlansPage from '@/pages/public/PlansPage.vue'
import NewsPage from '@/pages/public/NewsPage.vue'
import PublicOnboarding from '@/pages/public/PublicOnboarding.vue'
import PublicCommercialOnboarding from '@/pages/public/PublicCommercialOnboarding.vue'
import ClientPlaceholder from '@/pages/public/ClientPlaceholder.vue'
import BackofficeHome from '@/pages/backoffice/BackofficeHome.vue'
import BackofficeDashboard from '@/pages/backoffice/BackofficeDashboard.vue'
import BackofficeClients from '@/pages/backoffice/BackofficeClients.vue'
import BackofficeModulePlaceholder from '@/pages/backoffice/BackofficeModulePlaceholder.vue'
import BackofficeUsers from '@/pages/backoffice/BackofficeUsers.vue'
import BackofficeOnboarding from '@/pages/backoffice/BackofficeOnboarding.vue'
import BackofficePayments from '@/pages/backoffice/BackofficePayments.vue'
import BackofficeSubscriptions from '@/pages/backoffice/BackofficeSubscriptions.vue'
import BackofficePlans from '@/pages/backoffice/BackofficePlans.vue'
import BackofficeFeatures from '@/pages/backoffice/BackofficeFeatures.vue'
import BackofficePlanFeatures from '@/pages/backoffice/BackofficePlanFeatures.vue'
import BackofficeEventTypes from '@/pages/backoffice/BackofficeEventTypes.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomePage,
          meta: { title: 'Inicio' },
        },
        {
          path: 'planes',
          name: 'planes',
          component: PlansPage,
          meta: { title: 'Planes' },
        },
        {
          path: 'noticias',
          name: 'noticias',
          component: NewsPage,
          meta: { title: 'Noticias' },
        },
        {
          path: 'onboarding/public',
          name: 'public-onboarding-flow',
          component: PublicCommercialOnboarding,
          meta: { title: 'Onboarding publico', requiresAuth: true, requiresClient: true },
        },
        {
          path: 'onboarding/:code',
          name: 'public-onboarding',
          component: PublicOnboarding,
          meta: { title: 'Onboarding' },
        },
      ],
    },
    {
      path: '/',
      component: PanelLayout,
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: ClientPlaceholder,
          meta: {
            title: 'Dashboard',
            requiresAuth: true,
            requiresClient: true,
            requiresActivePlan: true,
          },
        },
        {
          path: 'invitaciones',
          name: 'invitaciones',
          component: ClientPlaceholder,
          meta: {
            title: 'Mis invitaciones',
            requiresAuth: true,
            requiresClient: true,
            requiresActivePlan: true,
          },
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          component: ClientPlaceholder,
          meta: {
            title: 'Configuracion',
            requiresAuth: true,
            requiresClient: true,
            requiresActivePlan: true,
          },
        },
      ],
    },
    {
      path: '/backoffice',
      component: PanelLayout,
      children: [
        {
          path: '',
          name: 'backoffice-home',
          component: BackofficeHome,
          meta: { title: 'Dashboard', requiresAuth: true, requiresMaster: true },
        },
        {
          path: 'dashboard',
          name: 'backoffice-dashboard',
          component: BackofficeDashboard,
          meta: { title: 'Dashboard · Vista general', requiresAuth: true, requiresMaster: true },
        },
        {
          path: 'clients',
          name: 'backoffice-clients',
          component: BackofficeClients,
          meta: { title: 'Dashboard · Clientes', requiresAuth: true, requiresMaster: true },
        },
        {
          path: 'users',
          name: 'backoffice-users',
          component: BackofficeUsers,
          meta: {
            title: 'Dashboard · Usuarios',
            moduleLabel: 'Usuarios',
            moduleDescription: 'Gestion de usuarios y sus niveles de acceso.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'onboarding',
          name: 'backoffice-onboarding',
          component: BackofficeOnboarding,
          meta: {
            title: 'Dashboard · Onboarding',
            moduleLabel: 'Onboarding',
            moduleDescription: 'Flujos de activacion y configuracion inicial de clientes.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'templates',
          name: 'backoffice-templates',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Plantillas',
            moduleLabel: 'Plantillas',
            moduleDescription: 'Biblioteca de plantillas y estructura de contenido.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'payments',
          name: 'backoffice-payments',
          component: BackofficePayments,
          meta: {
            title: 'Dashboard · Pagos',
            moduleLabel: 'Pagos',
            moduleDescription: 'Seguimiento de cobros, intentos y estado de transacciones.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'subscriptions',
          name: 'backoffice-subscriptions',
          component: BackofficeSubscriptions,
          meta: {
            title: 'Dashboard · Suscripciones',
            moduleLabel: 'Suscripciones',
            moduleDescription: 'Control de planes activos, renovaciones y bajas.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'plans',
          name: 'backoffice-plans',
          component: BackofficePlans,
          meta: {
            title: 'Dashboard · Planes',
            moduleLabel: 'Planes',
            moduleDescription: 'Definicion de oferta comercial y estructura de precios.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'features',
          name: 'backoffice-features',
          component: BackofficeFeatures,
          meta: {
            title: 'Dashboard · Funcionalidades',
            moduleLabel: 'Funcionalidades',
            moduleDescription: 'Catalogo global de capacidades habilitables por modulo.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'plan-features',
          name: 'backoffice-plan-features',
          component: BackofficePlanFeatures,
          meta: {
            title: 'Dashboard · Funcionalidades por plan',
            moduleLabel: 'Funcionalidades por plan',
            moduleDescription: 'Asignacion de funcionalidades segun cada plan comercial.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
        {
          path: 'event-types',
          name: 'backoffice-event-types',
          component: BackofficeEventTypes,
          meta: {
            title: 'Dashboard · Tipos de evento',
            moduleLabel: 'Tipos de evento',
            moduleDescription: 'Configuracion de tipos de evento y sus reglas base.',
            requiresAuth: true,
            requiresMaster: true,
          },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const session = useSessionStore()

  if (to.meta.requiresAuth) {
    if (!session.isAuthenticated) {
      const refreshed = await session.refreshMe()
      if (!refreshed.ok) return { name: 'home' }
    }

    if (!session.isTenantActive) {
      session.clearSession()
      return { name: 'home' }
    }
  }

  if (to.meta.requiresMaster && !session.isMaster) {
    return session.isClient ? { name: 'dashboard' } : { name: 'home' }
  }

  if (to.meta.requiresClient && !session.isClient) {
    return session.isMaster ? { name: 'backoffice-home' } : { name: 'home' }
  }

  if (to.meta.requiresActivePlan && !session.hasActiveClientPlan) {
    return { name: 'planes', query: { reason: 'plan_required' } }
  }

  return true
})

router.afterEach((to) => {
  const appName = import.meta.env.VITE_APP_NAME ?? 'InvitaSR'
  const section = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = section ? `${appName} - ${section}` : appName
})

export default router

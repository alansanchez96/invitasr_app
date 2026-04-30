import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import PublicLayout from '@/layouts/PublicLayout.vue'
import PanelLayout from '@/layouts/PanelLayout.vue'
import PublicEntryPage from '@/pages/public/PublicEntryPage.vue'
import PlansPage from '@/pages/public/PlansPage.vue'
import NewsPage from '@/pages/public/NewsPage.vue'
import PublicOnboarding from '@/pages/public/PublicOnboarding.vue'
import PublicCommercialOnboarding from '@/pages/public/PublicCommercialOnboarding.vue'
import PaymentReturnPage from '@/pages/public/PaymentReturnPage.vue'
import TemplatePreviewPage from '@/pages/public/TemplatePreviewPage.vue'
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
import ClientHome from '@/pages/client/ClientHome.vue'
import ClientStats from '@/pages/client/ClientStats.vue'
import ClientInvitations from '@/pages/client/ClientInvitations.vue'
import ClientInvitationEditor from '@/pages/client/ClientInvitationEditor.vue'
import ClientSettings from '@/pages/client/ClientSettings.vue'
import ClientSecurity from '@/pages/client/ClientSecurity.vue'
import ClientBilling from '@/pages/client/ClientBilling.vue'
import ClientBuyCredits from '@/pages/client/ClientBuyCredits.vue'
import ClientSubscriptions from '@/pages/client/ClientSubscriptions.vue'
import ClientRenewSubscription from '@/pages/client/ClientRenewSubscription.vue'
import ClientGuestList from '@/pages/client/ClientGuestList.vue'
import ClientNotifications from '@/pages/client/ClientNotifications.vue'
import ClientUpgradePlan from '@/pages/client/ClientUpgradePlan.vue'

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
          component: PublicEntryPage,
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
        {
          path: 'templates/:templateId/preview',
          name: 'template-preview',
          component: TemplatePreviewPage,
          meta: { title: 'Preview de template' },
        },
        {
          path: 'payment/success',
          name: 'payment-success',
          component: PaymentReturnPage,
          meta: { title: 'Pago confirmado', paymentReturnStatus: 'success' },
        },
        {
          path: 'payment/cancel',
          name: 'payment-cancel',
          component: PaymentReturnPage,
          meta: { title: 'Pago cancelado', paymentReturnStatus: 'cancel' },
        },
        {
          path: 'billing/success',
          name: 'billing-success',
          component: PaymentReturnPage,
          meta: { title: 'Pago confirmado', paymentReturnStatus: 'success' },
        },
        {
          path: 'billing/failure',
          name: 'billing-failure',
          component: PaymentReturnPage,
          meta: { title: 'Pago rechazado', paymentReturnStatus: 'failure' },
        },
        {
          path: 'billing/pending',
          name: 'billing-pending',
          component: PaymentReturnPage,
          meta: { title: 'Pago pendiente', paymentReturnStatus: 'pending' },
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
          meta: {
            title: 'Dashboard · Observabilidad',
            moduleLabel: 'Observabilidad',
            moduleDescription: 'Salud operativa de acceso, activaciones y cobros.',
            requiresAuth: true,
            requiresMaster: true,
          },
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
      path: '/panel',
      component: PanelLayout,
      children: [
        {
          path: '',
          name: 'client-home',
          component: ClientHome,
          meta: { title: 'Mi panel', requiresAuth: true, requiresClient: true, requiresActiveClientPlan: true },
        },
        {
          path: 'dashboard',
          name: 'client-dashboard',
          component: ClientHome,
          meta: {
            title: 'Mi panel · Vista general',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'estadisticas',
          name: 'client-stats',
          component: ClientStats,
          meta: {
            title: 'Mi panel · Estadisticas',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'invitaciones',
          name: 'client-invitations',
          component: ClientInvitations,
          meta: {
            title: 'Mi panel · Mis invitaciones',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'invitados',
          name: 'client-guests',
          component: ClientGuestList,
          meta: {
            title: 'Mi panel · Lista de invitados',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'invitaciones/:invitationId/editor',
          name: 'client-invitation-editor',
          component: ClientInvitationEditor,
          meta: {
            title: 'Mi panel · Editor de invitacion',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'configuracion',
          name: 'client-settings',
          component: ClientSettings,
          meta: {
            title: 'Mi panel · Configuracion',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'seguridad',
          name: 'client-security',
          component: ClientSecurity,
          meta: {
            title: 'Mi panel · Seguridad',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'notificaciones',
          name: 'client-notifications',
          component: ClientNotifications,
          meta: {
            title: 'Mi panel · Notificaciones',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'mejorar-plan',
          name: 'client-upgrade-plan',
          component: ClientUpgradePlan,
          meta: {
            title: 'Mi panel · Mejorar plan',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'pagos',
          name: 'client-payments',
          component: ClientBilling,
          meta: {
            title: 'Mi panel · Mis pagos',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'comprar-creditos',
          name: 'client-buy-credits',
          component: ClientBuyCredits,
          meta: {
            title: 'Mi panel · Comprar créditos',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'suscripciones',
          name: 'client-subscriptions',
          component: ClientSubscriptions,
          meta: {
            title: 'Mi panel · Suscripciones',
            requiresAuth: true,
            requiresClient: true,
            requiresActiveClientPlan: true,
          },
        },
        {
          path: 'renovar-suscripcion',
          name: 'client-renew-subscription',
          component: ClientRenewSubscription,
          meta: {
            title: 'Mi panel · Renovar suscripción',
            requiresAuth: true,
            requiresClient: true,
          },
        },
        {
          path: 'facturaciones',
          redirect: { name: 'client-payments' },
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
  }

  if (to.meta.requiresMaster && !session.isMaster) {
    return session.isClient ? { name: 'client-home' } : { name: 'home' }
  }

  if (to.meta.requiresClient && !session.isClient) {
    return session.isMaster ? { name: 'backoffice-home' } : { name: 'home' }
  }

  if (to.meta.requiresActiveClientPlan && session.isClient && !session.hasActiveClientPlan) {
    if (session.requiresSubscriptionRenewal) {
      return {
        name: 'client-renew-subscription',
        query: {
          next: typeof to.fullPath === 'string' ? to.fullPath : '/panel',
        },
      }
    }

    return {
      name: 'public-onboarding-flow',
      query: {
        reason: session.hasClientPlan ? 'checkout_required' : 'plan_required',
        next: typeof to.fullPath === 'string' ? to.fullPath : '/panel',
      },
    }
  }

  const activePlanName = String(session.user?.client_plan?.plan?.name ?? '').trim().toLowerCase()
  if (
    session.isClient
    && activePlanName === 'planner'
    && (to.name === 'client-buy-credits' || to.name === 'client-upgrade-plan')
  ) {
    return { name: 'client-home' }
  }

  if (
    session.isClient
    && to.name === 'client-renew-subscription'
    && !session.canRenewSubscription
  ) {
    return { name: session.hasActiveClientPlan ? 'client-home' : 'public-onboarding-flow' }
  }

  return true
})

router.afterEach((to) => {
  const appName = import.meta.env.VITE_APP_NAME ?? 'InvitaSR'
  const section = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = section ? `${appName} - ${section}` : appName
})

export default router

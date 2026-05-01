import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import PublicLayout from '@/layouts/PublicLayout.vue'
import PanelLayout from '@/layouts/PanelLayout.vue'

const PublicEntryPage = () => import('@/pages/public/PublicEntryPage.vue')
const DemoPage = () => import('@/pages/public/DemoPage.vue')
const DemoEditorPage = () => import('@/pages/public/DemoEditorPage.vue')
const PublicDemoInvitationPage = () => import('@/pages/public/PublicDemoInvitationPage.vue')
const PlansPage = () => import('@/pages/public/PlansPage.vue')
const NewsPage = () => import('@/pages/public/NewsPage.vue')
const PublicOnboarding = () => import('@/pages/public/PublicOnboarding.vue')
const PublicCommercialOnboarding = () => import('@/pages/public/PublicCommercialOnboarding.vue')
const PaymentReturnPage = () => import('@/pages/public/PaymentReturnPage.vue')
const TemplatePreviewPage = () => import('@/pages/public/TemplatePreviewPage.vue')
const InactiveClientPage = () => import('@/pages/public/InactiveClientPage.vue')
const BackofficeHome = () => import('@/pages/backoffice/BackofficeHome.vue')
const BackofficeDashboard = () => import('@/pages/backoffice/BackofficeDashboard.vue')
const BackofficeClients = () => import('@/pages/backoffice/BackofficeClients.vue')
const BackofficeModulePlaceholder = () => import('@/pages/backoffice/BackofficeModulePlaceholder.vue')
const BackofficeUsers = () => import('@/pages/backoffice/BackofficeUsers.vue')
const BackofficeOnboarding = () => import('@/pages/backoffice/BackofficeOnboarding.vue')
const BackofficePayments = () => import('@/pages/backoffice/BackofficePayments.vue')
const BackofficeSubscriptions = () => import('@/pages/backoffice/BackofficeSubscriptions.vue')
const BackofficePlans = () => import('@/pages/backoffice/BackofficePlans.vue')
const BackofficeFeatures = () => import('@/pages/backoffice/BackofficeFeatures.vue')
const BackofficePlanFeatures = () => import('@/pages/backoffice/BackofficePlanFeatures.vue')
const BackofficeEventTypes = () => import('@/pages/backoffice/BackofficeEventTypes.vue')
const ClientHome = () => import('@/pages/client/ClientHome.vue')
const ClientStats = () => import('@/pages/client/ClientStats.vue')
const ClientInvitations = () => import('@/pages/client/ClientInvitations.vue')
const ClientInvitationEditor = () => import('@/pages/client/ClientInvitationEditor.vue')
const ClientSettings = () => import('@/pages/client/ClientSettings.vue')
const ClientSecurity = () => import('@/pages/client/ClientSecurity.vue')
const ClientBilling = () => import('@/pages/client/ClientBilling.vue')
const ClientBuyCredits = () => import('@/pages/client/ClientBuyCredits.vue')
const ClientSubscriptions = () => import('@/pages/client/ClientSubscriptions.vue')
const ClientRenewSubscription = () => import('@/pages/client/ClientRenewSubscription.vue')
const ClientGuestList = () => import('@/pages/client/ClientGuestList.vue')
const ClientNotifications = () => import('@/pages/client/ClientNotifications.vue')
const ClientUpgradePlan = () => import('@/pages/client/ClientUpgradePlan.vue')

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
          meta: {
            title: 'Inicio',
            description: 'Crea invitaciones digitales elegantes, personalizables y listas para compartir con InvitaSR.',
          },
        },
        {
          path: 'demo',
          name: 'demo',
          component: DemoPage,
          meta: {
            title: 'Demo interactiva',
            description: 'Explora plantillas reales, filtra por tipo de evento y descubre como se crea una invitacion digital en InvitaSR.',
          },
        },
        {
          path: 'demo/editor/:templateId',
          name: 'demo-editor',
          component: DemoEditorPage,
          meta: {
            title: 'Editor demo',
            description: 'Prueba una plantilla editable de InvitaSR y descubre como puedes personalizar tu invitacion digital antes de elegir un plan.',
          },
        },
        {
          path: 'us_:userId/invitaciones/:demoSlug',
          name: 'public-demo-invitation',
          component: PublicDemoInvitationPage,
          meta: {
            title: 'Demo publicada',
            description: 'Demo publicada de una invitacion digital creada con InvitaSR.',
          },
        },
        {
          path: 'planes',
          name: 'planes',
          component: PlansPage,
          meta: {
            title: 'Planes',
            description: 'Compara los planes de InvitaSR y elige la opcion ideal para crear tu invitacion digital.',
          },
        },
        {
          path: 'noticias',
          name: 'noticias',
          component: NewsPage,
          meta: {
            title: 'Noticias',
            description: 'Consejos, ideas y tendencias para crear invitaciones digitales con mejor experiencia para tus invitados.',
          },
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
          path: 'cuenta-inactiva',
          name: 'client-inactive',
          component: InactiveClientPage,
          meta: { title: 'Cuenta dada de baja' },
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
  const demoRouteNames = new Set(['demo', 'demo-editor'])

  if (demoRouteNames.has(String(to.name))) {
    if (!session.isAuthenticated) {
      await session.hydrateSession()
    }

    if (session.isClient) {
      return {
        name: 'client-invitations',
        query: { demo_restricted: '1' },
      }
    }
  }

  if (to.meta.requiresAuth) {
    if (!session.isAuthenticated) {
      const refreshed = await session.refreshMe()
      if (!refreshed.ok) return { name: 'home' }
    }
  }

  if (to.meta.requiresClient && session.isAuthenticated) {
    const refreshed = await session.refreshMe()
    if (!refreshed.ok) return { name: 'home' }
  }

  if (session.isClientInactive && to.name !== 'client-inactive') {
    return { name: 'client-inactive' }
  }

  if (to.name === 'client-inactive' && session.isClient && !session.isClientInactive) {
    return { name: session.hasActiveClientPlan ? 'client-home' : 'public-onboarding-flow' }
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
  const description = typeof to.meta.description === 'string'
    ? to.meta.description
    : 'InvitaSR te ayuda a crear invitaciones digitales modernas, personalizables y faciles de compartir.'
  let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]')

  if (!descriptionTag) {
    descriptionTag = document.createElement('meta')
    descriptionTag.name = 'description'
    document.head.append(descriptionTag)
  }

  document.title = section ? `${appName} - ${section}` : appName
  descriptionTag.content = description
})

export default router

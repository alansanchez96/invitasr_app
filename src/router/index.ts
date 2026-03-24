import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import PanelLayout from '@/layouts/PanelLayout.vue'
import HomePage from '@/pages/public/HomePage.vue'
import PlansPage from '@/pages/public/PlansPage.vue'
import NewsPage from '@/pages/public/NewsPage.vue'
import ClientPlaceholder from '@/pages/public/ClientPlaceholder.vue'
import BackofficeHome from '@/pages/backoffice/BackofficeHome.vue'
import BackofficeDashboard from '@/pages/backoffice/BackofficeDashboard.vue'
import BackofficeClients from '@/pages/backoffice/BackofficeClients.vue'
import BackofficeModulePlaceholder from '@/pages/backoffice/BackofficeModulePlaceholder.vue'
import BackofficeUsers from '@/pages/backoffice/BackofficeUsers.vue'

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
          meta: { title: 'Dashboard' },
        },
        {
          path: 'invitaciones',
          name: 'invitaciones',
          component: ClientPlaceholder,
          meta: { title: 'Mis invitaciones' },
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          component: ClientPlaceholder,
          meta: { title: 'Configuracion' },
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
          meta: { title: 'Dashboard' },
        },
        {
          path: 'dashboard',
          name: 'backoffice-dashboard',
          component: BackofficeDashboard,
          meta: { title: 'Dashboard · Vista general' },
        },
        {
          path: 'clients',
          name: 'backoffice-clients',
          component: BackofficeClients,
          meta: { title: 'Dashboard · Clientes' },
        },
        {
          path: 'users',
          name: 'backoffice-users',
          component: BackofficeUsers,
          meta: {
            title: 'Dashboard · Usuarios',
            moduleLabel: 'Usuarios',
            moduleDescription: 'Gestion de usuarios y sus niveles de acceso.',
          },
        },
        {
          path: 'onboarding',
          name: 'backoffice-onboarding',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Onboarding',
            moduleLabel: 'Onboarding',
            moduleDescription: 'Flujos de activacion y configuracion inicial de clientes.',
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
          },
        },
        {
          path: 'payments',
          name: 'backoffice-payments',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Pagos',
            moduleLabel: 'Pagos',
            moduleDescription: 'Seguimiento de cobros, intentos y estado de transacciones.',
          },
        },
        {
          path: 'subscriptions',
          name: 'backoffice-subscriptions',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Suscripciones',
            moduleLabel: 'Suscripciones',
            moduleDescription: 'Control de planes activos, renovaciones y bajas.',
          },
        },
        {
          path: 'plans',
          name: 'backoffice-plans',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Planes',
            moduleLabel: 'Planes',
            moduleDescription: 'Definicion de oferta comercial y estructura de precios.',
          },
        },
        {
          path: 'features',
          name: 'backoffice-features',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Funcionalidades',
            moduleLabel: 'Funcionalidades',
            moduleDescription: 'Catalogo global de capacidades habilitables por modulo.',
          },
        },
        {
          path: 'plan-features',
          name: 'backoffice-plan-features',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Funcionalidades por plan',
            moduleLabel: 'Funcionalidades por plan',
            moduleDescription: 'Asignacion de funcionalidades segun cada plan comercial.',
          },
        },
        {
          path: 'event-types',
          name: 'backoffice-event-types',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Tipos de evento',
            moduleLabel: 'Tipos de evento',
            moduleDescription: 'Configuracion de tipos de evento y sus reglas base.',
          },
        },
        {
          path: 'modules',
          name: 'backoffice-modules',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Modulos',
            moduleLabel: 'Modulos',
            moduleDescription: 'Administracion de modulos funcionales disponibles.',
          },
        },
        {
          path: 'permissions',
          name: 'backoffice-permissions',
          component: BackofficeModulePlaceholder,
          meta: {
            title: 'Dashboard · Permisos',
            moduleLabel: 'Permisos',
            moduleDescription: 'Matriz de permisos, roles y niveles de autorizacion.',
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

router.afterEach((to) => {
  const appName = import.meta.env.VITE_APP_NAME ?? 'InvitaSR'
  const section = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = section ? `${appName} - ${section}` : appName
})

export default router

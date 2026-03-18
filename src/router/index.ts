import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import BackofficeLayout from '@/layouts/BackofficeLayout.vue'
import HomePage from '@/pages/public/HomePage.vue'
import PlansPage from '@/pages/public/PlansPage.vue'
import NewsPage from '@/pages/public/NewsPage.vue'
import ClientPlaceholder from '@/pages/public/ClientPlaceholder.vue'
import BackofficeHome from '@/pages/backoffice/BackofficeHome.vue'
import BackofficeDashboard from '@/pages/backoffice/BackofficeDashboard.vue'
import BackofficeClients from '@/pages/backoffice/BackofficeClients.vue'

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
          meta: { title: 'Configuración' },
        },
      ],
    },
    {
      path: '/backoffice',
      component: BackofficeLayout,
      children: [
        {
          path: '',
          name: 'backoffice-home',
          component: BackofficeHome,
          meta: { title: 'Backoffice' },
        },
        {
          path: 'dashboard',
          name: 'backoffice-dashboard',
          component: BackofficeDashboard,
          meta: { title: 'Backoffice · Dashboard' },
        },
        {
          path: 'clients',
          name: 'backoffice-clients',
          component: BackofficeClients,
          meta: { title: 'Backoffice · Clientes' },
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

import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import BackofficeLayout from '@/layouts/BackofficeLayout.vue'
import HomePage from '@/pages/public/HomePage.vue'
import PlansPage from '@/pages/public/PlansPage.vue'
import NewsPage from '@/pages/public/NewsPage.vue'
import ClientPlaceholder from '@/pages/public/ClientPlaceholder.vue'
import BackofficeHome from '@/pages/backoffice/BackofficeHome.vue'

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
        },
        {
          path: 'planes',
          name: 'planes',
          component: PlansPage,
        },
        {
          path: 'noticias',
          name: 'noticias',
          component: NewsPage,
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: ClientPlaceholder,
        },
        {
          path: 'invitaciones',
          name: 'invitaciones',
          component: ClientPlaceholder,
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          component: ClientPlaceholder,
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

export default router

export type BackofficeModule = {
  label: string
  href: string
}

export type BackofficeModuleGroup = {
  title: 'Gestion' | 'Pagos' | 'Configuracion'
  items: BackofficeModule[]
}

export const backofficeModuleGroups: BackofficeModuleGroup[] = [
  {
    title: 'Gestion',
    items: [
      { label: 'Clientes', href: '/backoffice/clients' },
      { label: 'Usuarios', href: '/backoffice/users' },
      { label: 'Onboarding', href: '/backoffice/onboarding' },
      { label: 'Plantillas', href: '/backoffice/templates' },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { label: 'Pagos', href: '/backoffice/payments' },
      { label: 'Suscripciones', href: '/backoffice/subscriptions' },
    ],
  },
  {
    title: 'Configuracion',
    items: [
      { label: 'Planes', href: '/backoffice/plans' },
      { label: 'Funcionalidades', href: '/backoffice/features' },
      { label: 'Funcionalidades por plan', href: '/backoffice/plan-features' },
      { label: 'Tipos de evento', href: '/backoffice/event-types' },
    ],
  },
]

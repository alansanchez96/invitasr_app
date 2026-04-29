export type PanelModule = {
  label: string
  href: string
}

export type PanelModuleGroup = {
  title: string
  items: PanelModule[]
}

export const backofficeModuleGroups: PanelModuleGroup[] = [
  {
    title: 'Monitoreo',
    items: [{ label: 'Observabilidad', href: '/backoffice/dashboard' }],
  },
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

export const clientModuleGroups: PanelModuleGroup[] = [
  {
    title: 'Gestion',
    items: [
      { label: 'Mis invitaciones', href: '/panel/invitaciones' },
      { label: 'Lista de invitados', href: '/panel/invitados' },
    ],
  },
  {
    title: 'Analitica',
    items: [{ label: 'Estadisticas', href: '/panel/estadisticas' }],
  },
  {
    title: 'Cuenta',
    items: [
      { label: 'Datos de la cuenta', href: '/panel/configuracion' },
      { label: 'Seguridad', href: '/panel/seguridad' },
      { label: 'Notificaciones', href: '/panel/notificaciones' },
    ],
  },
  {
    title: 'Plan',
    items: [{ label: 'Mejorar plan', href: '/panel/mejorar-plan' }],
  },
]

export const getPanelModuleGroups = (isMaster: boolean) =>
  isMaster ? backofficeModuleGroups : clientModuleGroups

export const getPanelHomePath = (isMaster: boolean) => (isMaster ? '/backoffice' : '/panel')

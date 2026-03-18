export type BackofficeModule = {
  label: string
  href: string
}

export type BackofficeModuleGroup = {
  title: 'Gestion' | 'Cobros' | 'Configuracion'
  items: BackofficeModule[]
}

export const backofficeModuleGroups: BackofficeModuleGroup[] = [
  {
    title: 'Gestion',
    items: [
      { label: 'Clientes', href: '/backoffice/clients' },
      { label: 'Usuarios', href: '#' },
      { label: 'Onboarding', href: '#' },
      { label: 'Plantillas', href: '#' },
    ],
  },
  {
    title: 'Cobros',
    items: [
      { label: 'Pagos', href: '#' },
      { label: 'Suscripciones', href: '#' },
    ],
  },
  {
    title: 'Configuracion',
    items: [
      { label: 'Planes', href: '#' },
      { label: 'Funcionalidades', href: '#' },
      { label: 'Funcionalidades por plan', href: '#' },
      { label: 'Tipos de evento', href: '#' },
      { label: 'Modulos', href: '#' },
      { label: 'Permisos', href: '#' },
    ],
  },
]

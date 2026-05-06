import type { CatalogPlanFeatureItem, CatalogPlanListItem } from '@/services/catalogs'

export type MarketingFeature = {
  key: string
  title: string
  summary: string
  badge: string
  priority: number
}

const COMMERCIAL_PLAN_ORDER = ['basic', 'pro', 'planner', 'premium']

const FEATURE_COPY: Record<
  string,
  {
    title: string
    priority: number
    summary: (feature: CatalogPlanFeatureItem) => string
  }
> = {
  template_selection_limit: {
    title: 'Catalogo de plantillas',
    priority: 100,
    summary: (feature) => `${formatLimitCount(feature.limit, 'template', 'templates')} listas para comparar y elegir rapido.`,
  },
  rsvp_enabled: {
    title: 'RSVP inteligente',
    priority: 98,
    summary: () => 'Confirma asistentes desde la invitacion sin friccion extra.',
  },
  companions_enabled: {
    title: 'Acompanantes por invitado',
    priority: 94,
    summary: () => 'Cada invitado puede gestionar acompanantes con mas contexto.',
  },
  whatsapp_confirmations_enabled: {
    title: 'Confirmaciones por WhatsApp',
    priority: 96,
    summary: () => 'Reduce friccion y acelera respuestas desde el canal que mas usan.',
  },
  whatsapp_reminders_enabled: {
    title: 'Recordatorios por WhatsApp',
    priority: 92,
    summary: () => 'Mantiene asistencia y seguimiento activo sin perseguir a mano.',
  },
  wall_enabled: {
    title: 'Muro de mensajes',
    priority: 90,
    summary: () => 'Convierte la invitacion en una experiencia emocional y participativa.',
  },
  wall_moderation_enabled: {
    title: 'Moderacion del muro',
    priority: 82,
    summary: () => 'Controla lo que se publica antes de mostrarlo al resto de invitados.',
  },
  custom_domain_enabled: {
    title: 'Dominio personalizado',
    priority: 95,
    summary: () => 'Refuerza valor premium y una experiencia mucho mas propia.',
  },
  remove_platform_branding: {
    title: 'Sin branding de plataforma',
    priority: 91,
    summary: () => 'La experiencia se siente completamente tuya y mas premium.',
  },
  background_music_enabled: {
    title: 'Musica de fondo',
    priority: 86,
    summary: () => 'Suma atmosfera desde el primer segundo y eleva la emocion.',
  },
  custom_music_upload_enabled: {
    title: 'Musica personalizada',
    priority: 72,
    summary: () => 'Permite subir una cancion propia para ambientar cada historia.',
  },
  dj_song_requests_enabled: {
    title: 'Pedidos de canciones',
    priority: 76,
    summary: () => 'Activa interaccion previa y hace participar a los invitados.',
  },
  gallery_enabled: {
    title: 'Galeria visual',
    priority: 88,
    summary: () => 'Muestra moodboard, fotos o recuerdos dentro de la misma experiencia.',
  },
  gallery_items_limit: {
    title: 'Capacidad de galeria',
    priority: 84,
    summary: (feature) => `${formatLimitCount(feature.limit, 'foto', 'fotos')} para mostrar detalles sin quedarte corto.`,
  },
  maps_and_uber_enabled: {
    title: 'Mapa y transporte',
    priority: 82,
    summary: () => 'Ubicacion clara y acceso mas simple para llegar al evento.',
  },
  location_limit: {
    title: 'Multiples ubicaciones',
    priority: 66,
    summary: (feature) => `${formatLimitCount(feature.limit, 'ubicacion', 'ubicaciones')} para ceremonia, fiesta y extras.`,
  },
  save_date_calendar_enabled: {
    title: 'Guardar en calendario',
    priority: 74,
    summary: () => 'Aumenta recordacion y reduce olvidos del evento.',
  },
  faq_enabled: {
    title: 'FAQ integrada',
    priority: 64,
    summary: () => 'Resuelve dudas recurrentes sin llenar chats privados.',
  },
  dress_code_enabled: {
    title: 'Dress code',
    priority: 70,
    summary: () => 'Aclara estilo esperado y evita preguntas repetidas.',
  },
  dress_code_visual_enabled: {
    title: 'Dress code visual',
    priority: 68,
    summary: () => 'Presenta el estilo con mas impacto y menos texto.',
  },
  dietary_restrictions_enabled: {
    title: 'Restricciones alimentarias',
    priority: 80,
    summary: () => 'Captura informacion util para organizar mejor la experiencia.',
  },
  guest_export_basic_enabled: {
    title: 'Exportacion de invitados',
    priority: 65,
    summary: () => 'Saca listados basicos para operar sin copiar y pegar manualmente.',
  },
  guest_export_advanced_enabled: {
    title: 'Exportacion avanzada',
    priority: 78,
    summary: () => 'Mas control operativo para planners o eventos con mas volumen.',
  },
  analytics_basic_enabled: {
    title: 'Metricas basicas',
    priority: 73,
    summary: () => 'Visibilidad inicial sobre rendimiento y uso del evento.',
  },
  analytics_medium_enabled: {
    title: 'Metricas medias',
    priority: 85,
    summary: () => 'Mas lectura comercial y operativa para tomar decisiones reales.',
  },
  analytics_advanced_enabled: {
    title: 'Metricas avanzadas',
    priority: 89,
    summary: () => 'Lectura profunda para quienes gestionan varios eventos a la vez.',
  },
  emotional_analytics_enabled: {
    title: 'Analitica emocional',
    priority: 83,
    summary: () => 'Una capa diferencial para entender engagement mas alla del clic.',
  },
  multi_language_enabled: {
    title: 'Multilenguaje',
    priority: 77,
    summary: () => 'Ideal para invitados internacionales o eventos multiculturales.',
  },
  gift_options_enabled: {
    title: 'Mesa de regalos',
    priority: 79,
    summary: () => 'Ordena regalos u opciones de aporte desde la propia invitacion.',
  },
  popup_confirmation_enabled: {
    title: 'Confirmacion visual',
    priority: 60,
    summary: () => 'Refuerza accion y feedback despues de completar pasos clave.',
  },
  interactive_checkin_enabled: {
    title: 'Check-in interactivo',
    priority: 67,
    summary: () => 'Crea una llegada mas inmersiva antes del contenido principal.',
  },
  countdown_enabled: {
    title: 'Cuenta regresiva',
    priority: 71,
    summary: () => 'Mantiene expectativa alta antes del gran dia.',
  },
  invitation_retention_days: {
    title: 'Tiempo de acceso',
    priority: 58,
    summary: (feature) => `${formatLimitCount(feature.limit, 'dia', 'dias')} de retencion para volver a compartir o revisar.`,
  },
  active_invitations_limit: {
    title: 'Invitaciones activas',
    priority: 93,
    summary: (feature) => `${formatLimitCount(feature.limit, 'evento activo', 'eventos activos')} al mismo tiempo para escalar operacion.`,
  },
  public_profile_enabled: {
    title: 'Perfil publico',
    priority: 57,
    summary: () => 'Abre presencia publica para planners o marcas del evento.',
  },
  guest_token_delivery_enabled: {
    title: 'Entrega con token',
    priority: 69,
    summary: () => 'Mas control sobre accesos y trazabilidad por invitado.',
  },
  guest_media_upload_enabled: {
    title: 'Carga de contenido por invitados',
    priority: 81,
    summary: () => 'Invitados aportan recuerdos y amplian la experiencia post evento.',
  },
  priority_support_enabled: {
    title: 'Soporte prioritario',
    priority: 87,
    summary: () => 'Menos espera cuando necesitas resolver algo importante.',
  },
  invitation_access_password_enabled: {
    title: 'Acceso con contrasena',
    priority: 63,
    summary: () => 'Control adicional para eventos privados o mas sensibles.',
  },
  predefined_music_limit: {
    title: 'Pistas disponibles',
    priority: 55,
    summary: (feature) => `${formatLimitCount(feature.limit, 'pista', 'pistas')} predefinidas para elegir ambientacion rapida.`,
  },
  wall_message_limit: {
    title: 'Mensajes en el muro',
    priority: 75,
    summary: (feature) => `${formatLimitCount(feature.limit, 'mensaje', 'mensajes')} visibles para mantener participacion activa.`,
  },
  rsvp_response_limit: {
    title: 'Capacidad RSVP',
    priority: 83,
    summary: (feature) => `${formatLimitCount(feature.limit, 'respuesta', 'respuestas')} para controlar confirmaciones del evento.`,
  },
  preview_view_limit: {
    title: 'Vistas de preview',
    priority: 42,
    summary: (feature) => `${formatLimitCount(feature.limit, 'vista', 'vistas')} para experiencias de previsualizacion controlada.`,
  },
  auto_reset_hours: {
    title: 'Reinicio automatico',
    priority: 40,
    summary: (feature) => `Reinicio cada ${formatLimitCount(feature.limit, 'hora', 'horas')} para pruebas temporales o recorridos guiados.`,
  },
  wall_preview_enabled: {
    title: 'Preview del muro',
    priority: 45,
    summary: () => 'Anticipa la experiencia social antes de habilitarla completa.',
  },
}

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const slugifyName = (value?: string) => String(value ?? '').trim().toLowerCase()

const isUnlimited = (limit?: number | null) => limit !== null && limit !== undefined && Number(limit) >= 999

export const formatLimitCount = (
  limit: number | null | undefined,
  singular: string,
  plural: string,
) => {
  if (isUnlimited(limit)) return `Ilimitados ${plural}`
  if (!limit || Number(limit) <= 0) return `Incluye ${plural}`
  if (Number(limit) === 1) return `1 ${singular}`
  return `${Number(limit)} ${plural}`
}

export const formatPlanName = (name?: string) => {
  const normalized = slugifyName(name)
  if (normalized === 'basic') return 'Basic'
  if (normalized === 'pro') return 'Pro'
  if (normalized === 'planner') return 'Planner'
  if (normalized === 'premium') return 'Premium'
  return toTitleCase(String(name ?? 'Plan'))
}

export const formatBillingLabel = (billingType?: string) =>
  String(billingType ?? '').trim().toLowerCase() === 'subscription' ? 'Suscripcion' : 'Pago unico'

export const formatPlanPrice = (price: number | string | null | undefined, billingType?: string) => {
  const amount = Number(price ?? 0)
  const label = `US$ ${amount.toFixed(2)}`
  return String(billingType ?? '').trim().toLowerCase() === 'subscription' ? `${label} / mes` : label
}

const planOrderIndex = (plan: CatalogPlanListItem) => {
  const normalized = slugifyName(plan.name)
  const knownIndex = COMMERCIAL_PLAN_ORDER.indexOf(normalized)
  if (knownIndex >= 0) return knownIndex
  return 99
}

export const selectCommercialPlans = (plans: CatalogPlanListItem[]) => {
  const active = plans.filter((plan) => String(plan.status ?? 'active').toLowerCase() === 'active')
  const paid = active.filter((plan) => Number(plan.price_usd ?? 0) > 0 || slugifyName(plan.name) === 'planner')
  const source = paid.length >= 3 ? paid : active

  return [...source]
    .sort((left, right) => {
      const orderGap = planOrderIndex(left) - planOrderIndex(right)
      if (orderGap !== 0) return orderGap
      return Number(left.price_usd ?? 0) - Number(right.price_usd ?? 0)
    })
    .slice(0, 3)
}

export const resolvePlanBadge = (plan: CatalogPlanListItem, index: number) => {
  const normalized = slugifyName(plan.name)
  if (normalized === 'pro') return 'Mas elegido'
  if (normalized === 'planner') return 'Escala sin techo'
  if (normalized === 'basic') return 'Entrada premium'
  return index === 1 ? 'Recomendado' : 'Listo para activar'
}

export const isFeaturedCommercialPlan = (plan: CatalogPlanListItem, index: number) => {
  const normalized = slugifyName(plan.name)
  return normalized === 'pro' || (normalized !== 'planner' && index === 1)
}

export const resolvePlanNarrative = (plan: CatalogPlanListItem) => {
  const normalized = slugifyName(plan.name)
  if (normalized === 'basic') return 'Ideal para empezar con una invitacion elegante, clara y lista para compartir.'
  if (normalized === 'pro') return 'La mejor combinacion entre impacto visual, gestion RSVP y valor percibido.'
  if (normalized === 'planner') return 'Pensado para quienes necesitan vender, operar y escalar varios eventos.'
  if (String(plan.billing_type ?? '').toLowerCase() === 'subscription') {
    return 'Pensado para una operacion continua con mas soporte y mas control.'
  }
  return 'Activa una experiencia visual potente sin cargar tu operacion con complejidad.'
}

export const resolvePlanMeta = (plan: CatalogPlanListItem) => {
  const credits = Number(plan.event_credits ?? 0)
  const expirationDays = Number(plan.credit_expiration_days ?? 0)
  const parts: string[] = []

  if (String(plan.billing_type ?? '').toLowerCase() === 'subscription') {
    parts.push('Suscripcion recurrente')
  } else if (credits > 0) {
    parts.push(formatLimitCount(credits, 'evento', 'eventos'))
  }

  if (expirationDays > 0) {
    parts.push(`${expirationDays} dias de vigencia`)
  }

  return parts.join(' · ')
}

const fallbackFeatureTitle = (feature: CatalogPlanFeatureItem) => {
  const key = String(feature.key ?? '')
    .replace(/_enabled$/i, '')
    .replace(/_/g, ' ')
    .trim()
  return toTitleCase(key || 'Funcionalidad')
}

export const toMarketingFeature = (feature: CatalogPlanFeatureItem): MarketingFeature => {
  const key = String(feature.key ?? '').trim()
  const mapping = FEATURE_COPY[key]
  const title = mapping?.title ?? fallbackFeatureTitle(feature)
  const summary = mapping?.summary(feature) ?? feature.description?.trim() ?? 'Incluida dentro del plan.'
  const badge = isUnlimited(feature.limit)
    ? 'Ilimitado'
    : feature.limit && Number(feature.limit) > 0
      ? `Hasta ${Number(feature.limit)}`
      : 'Incluido'

  return {
    key,
    title,
    summary,
    badge,
    priority: mapping?.priority ?? (feature.type === 'limit' ? 52 : 50),
  }
}

export const sortMarketingFeatures = (features: CatalogPlanFeatureItem[]) =>
  [...features]
    .map(toMarketingFeature)
    .sort((left, right) => {
      const priorityGap = right.priority - left.priority
      if (priorityGap !== 0) return priorityGap
      return left.title.localeCompare(right.title, 'es')
    })

export const buildTopPlanHighlights = (features: CatalogPlanFeatureItem[], max = 3) =>
  sortMarketingFeatures(features).slice(0, max)

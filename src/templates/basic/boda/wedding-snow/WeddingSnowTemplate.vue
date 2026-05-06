<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createPublicInvitationRsvpResponse, createPublicInvitationWallMessage } from '@/services/publicInvitations'
import type { InvitationTemplateRendererProps } from '@/templates/types'
import { notifyError, notifySuccess } from '@/utils/toast'

type TemplateProps = InvitationTemplateRendererProps<'wedding'> & {
  editable?: boolean
  activeField?: string | null
  sectionVisibility?: Record<string, boolean>
  checkinPreview?: boolean
  constrainedOverlay?: boolean
  invitationTitle?: string
  typeEventName?: string
  previewViewport?: 'mobile' | 'tablet' | 'desktop' | null
  previewZoomPercent?: number | null
  demoMode?: boolean
}

const props = withDefaults(defineProps<TemplateProps>(), {
  editable: false,
  activeField: null,
  sectionVisibility: () => ({}),
  checkinPreview: false,
  constrainedOverlay: false,
  previewViewport: null,
  previewZoomPercent: null,
  demoMode: false,
})

const emit = defineEmits<{
  (event: 'start-edit', field: string): void
  (event: 'update-field', payload: { field: string; value: string }): void
  (event: 'finish-edit'): void
  (event: 'checkin-preview-closed'): void
}>()

const faqModalOpen = ref(false)
const musicMuted = ref(Boolean(props.data.music?.muted ?? true))
const countdownNow = ref(Date.now())
const checkinOverlayVisible = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const galleryCarouselIndex = ref(0)
const galleryLightboxOpen = ref(false)
const galleryLightboxIndex = ref(0)
const galleryViewportMode = ref<'mobile' | 'tablet' | 'desktop'>('desktop')
const wallComposerOpen = ref(false)
const wallSubmitting = ref(false)
const wallGuestName = ref('')
const wallGuestMessage = ref('')
const wallReceivedCount = ref(0)
const rsvpSubmitting = ref(false)
const rsvpFirstName = ref('')
const rsvpLastName = ref('')
const rsvpDietaryRestrictions = ref('')
const rsvpSuccessMessage = ref<string | null>(null)
const faqReviewedForRsvp = ref(false)
let timerId: ReturnType<typeof setInterval> | null = null
const MOBILE_GALLERY_BREAKPOINT = 640
const TABLET_GALLERY_BREAKPOINT = 900
const WALL_MESSAGE_MAX_LENGTH = 250
const WALL_MESSAGE_PREVIEW_LENGTH = 120

type GalleryDisplaySlideRole = 'left' | 'center' | 'right'

type GalleryDisplaySlide = {
  index: number
  item: (typeof props.data.gallery)[number]
  role: GalleryDisplaySlideRole
}

type WallMessage = {
  id: string
  guestName: string
  message: string
  status?: string
  isVisible?: boolean
  postedAt?: string | null
}

const demoWallMessages: WallMessage[] = [
  {
    id: 'demo-wall-1',
    guestName: 'Sofía',
    message: 'Qué invitación tan elegante. Se siente cuidada, clara y muy especial.',
    postedAt: '2026-09-01T14:20:00-03:00',
  },
  {
    id: 'demo-wall-2',
    guestName: 'Martín',
    message: 'Me encantó la experiencia. Todo se entiende rápido y dan ganas de confirmar en el momento.',
    postedAt: '2026-09-01T14:34:00-03:00',
  },
  {
    id: 'demo-wall-3',
    guestName: 'Valentina',
    message: 'La galería, la música y los detalles hacen que la invitación se sienta muy personal.',
    postedAt: '2026-09-01T15:02:00-03:00',
  },
  {
    id: 'demo-wall-4',
    guestName: 'Nico',
    message: 'Hermosa forma de presentar un evento. Simple, moderna y con mucha emoción.',
    postedAt: '2026-09-01T15:18:00-03:00',
  },
]

const resolveText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  return value.trim().length ? value : fallback
}

const toDate = (value: string): Date | null => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const dressCodeByCode: Record<string, { title: string; description: string }> = {
  elegant_sport: {
    title: 'Dress code',
    description: 'Elegante sport en tonos claros.',
  },
  formal_black_tie: {
    title: 'Vestimenta formal',
    description: 'Traje oscuro y vestido largo. Se sugiere etiqueta de gala.',
  },
  semi_formal: {
    title: 'Semi formal',
    description: 'Look prolijo y elegante, sin llegar a etiqueta completa.',
  },
  cocktail: {
    title: 'Estilo cóctel',
    description: 'Vestido corto o midi y traje liviano. Chic y cómodo.',
  },
  casual_chic: {
    title: 'Casual chic',
    description: 'Estilo relajado y cuidado. Evita ropa deportiva.',
  },
  boho: {
    title: 'Boho',
    description: 'Tonos naturales y telas livianas con estilo bohemio.',
  },
  beach_white: {
    title: 'Playa en blanco',
    description: 'Outfit fresco en tonos blancos o arena.',
  },
  country_chic: {
    title: 'Campo chic',
    description: 'Ropa elegante y cómoda para exterior, ideal para jardín/campo.',
  },
  gala: {
    title: 'Gala',
    description: 'Etiqueta máxima para una noche especial.',
  },
  thematic: {
    title: 'Temática especial',
    description: 'Sigue la temática del evento indicada por los anfitriones.',
  },
}

const normalizeExternalUrl = (rawValue: string): string => {
  const value = rawValue.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.includes('.') && !/\s/.test(value)) {
    return `https://${value}`
  }
  return value
}

const isValidHttpUrl = (rawValue: string): boolean => {
  try {
    const parsed = new URL(rawValue)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const buildUberUrl = (input: {
  mapsUrl: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
}): string => {
  const payload: Record<string, unknown> = {}

  const latitude = toFiniteNumber(input.latitude)
  const longitude = toFiniteNumber(input.longitude)
  if (latitude !== null && longitude !== null) {
    payload.latitude = latitude
    payload.longitude = longitude
  }

  if (input.name.trim()) {
    payload.addressLine1 = input.name.trim()
  }
  if (input.address.trim()) {
    payload.addressLine2 = input.address.trim()
  }

  if (!Object.keys(payload).length) {
    const mapsUrl = normalizeExternalUrl(input.mapsUrl)
    if (!mapsUrl || !isValidHttpUrl(mapsUrl)) {
      return 'https://m.uber.com/ul/?action=setPickup'
    }

    try {
      const parsedMapsUrl = new URL(mapsUrl)
      const queryValue = parsedMapsUrl.searchParams.get('q')
        || parsedMapsUrl.searchParams.get('query')
        || parsedMapsUrl.searchParams.get('destination')
        || parsedMapsUrl.searchParams.get('daddr')
        || ''

      if (queryValue.trim()) {
        payload.addressLine1 = queryValue.trim()
      } else {
        payload.addressLine1 = mapsUrl
      }
    } catch {
      return 'https://m.uber.com/ul/?action=setPickup'
    }
  }

  return `https://m.uber.com/looking?drop[0]=${encodeURIComponent(JSON.stringify(payload))}`
}

const toCalendarFormat = (date: Date): string => {
  const iso = date.toISOString()
  return iso.replace(/[-:]/g, '').split('.')[0] + 'Z'
}

const formatDateTimeLabel24h = (date: Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(',', ' ·') + ' hs'

const heroContent = computed(() => {
  const raw = props.data as Record<string, unknown> & {
    hero?: { title?: string; subtitle?: string }
  }
  const hero = raw.hero ?? {}

  return {
    title: resolveText(hero.title, resolveText(props.data.couple?.headline, 'Nos casamos')),
    subtitle: resolveText(
      hero.subtitle,
      'Diseñada para que puedas personalizarla en minutos y compartirla con tu gente.',
    ),
  }
})

const brideName = computed(() => resolveText(props.data.couple?.brideName, 'Nombre 1'))
const groomName = computed(() => resolveText(props.data.couple?.groomName, 'Nombre 2'))
const eventDateLabel = computed(() => {
  const explicit = resolveText(props.data.event?.date?.label, '')
  if (explicit) return explicit

  const iso = resolveText(props.data.event?.date?.iso, '')
  if (!iso) return 'Fecha del evento'
  const parsed = toDate(iso)
  if (!parsed) return 'Fecha del evento'
  return formatDateTimeLabel24h(parsed)
})
const eventVenue = computed(() => resolveText(props.data.event?.venue, 'Lugar del evento'))
const eventCity = computed(() => resolveText(props.data.event?.city, 'Ciudad'))
const storyPrimary = computed(() => {
  const first = Array.isArray(props.data.story) ? props.data.story[0] : null
  return {
    title: resolveText(first?.title, 'Nuestra historia'),
    description: resolveText(first?.description, 'Comparte tu historia con un texto breve y emocional.'),
  }
})

const countdownTarget = computed(() => {
  const targetIso = props.data.countdown?.targetDateIso || props.data.event?.date?.iso
  return targetIso ? toDate(targetIso) : null
})

const countdown = computed(() => ({
  note: resolveText(props.data.countdown?.note, 'Cada detalle está preparado para este gran día.'),
  title: resolveText(props.data.countdown?.title, 'Falta muy poco'),
}))

const countdownMetrics = computed(() => {
  const target = countdownTarget.value
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }
  }

  const diff = Math.max(target.getTime() - countdownNow.value, 0)
  const ended = diff <= 0
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds, ended }
})

const rsvpLabel = computed(() => resolveText(props.data.rsvp?.submitLabel, 'Confirmar asistencia'))
const rsvpLabels = computed(() => ({
  firstName: resolveText(props.data.rsvp?.formLabels?.firstName, 'Nombre'),
  lastName: resolveText(props.data.rsvp?.formLabels?.lastName, 'Apellido'),
  dietaryRestrictions: resolveText(props.data.rsvp?.formLabels?.dietaryRestrictions, 'Restricción alimentaria'),
}))
const rsvpEnabled = computed(() => props.data.rsvp?.enabled !== false)
const faqReadRequiredForRsvp = computed(() => {
  const rawFaq = Array.isArray(props.data.faq) ? props.data.faq : []
  const hasFaqItems = rawFaq.some((item) => Boolean(item?.question) && Boolean(item?.answer))
  return !props.editable && isSectionVisible('faq') && hasFaqItems
})
const rsvpNeedsFaqReview = computed(() =>
  faqReadRequiredForRsvp.value
  && !faqReviewedForRsvp.value,
)
const rsvpCanSubmit = computed(() => {
  if (props.editable) return false
  if (props.demoMode) return false
  if (!isSectionVisible('rsvp')) return false
  if (!rsvpEnabled.value) return false
  if (rsvpNeedsFaqReview.value) return false
  if (rsvpSubmitting.value) return false
  return rsvpFirstName.value.trim().length >= 2 && rsvpLastName.value.trim().length >= 2
})
const rsvpGateHint = computed(() =>
  rsvpNeedsFaqReview.value
    ? 'Antes de confirmar, abre las preguntas importantes para evitar dudas de último momento.'
    : (
      props.demoMode
        ? 'En esta prueba el botón es solo visual. Al crear tu invitación real podrás recibir confirmaciones.'
        : 'Confirma tu asistencia para que podamos esperarte mejor.'
    ),
)

type TemplateLocationCard = {
  id: string
  name: string
  address: string
  mapsUrl: string
  uberEnabled: boolean
  uberUrl: string
  latitude: number | null
  longitude: number | null
}

const toTemplateLocationCard = (source: unknown, index: number): TemplateLocationCard => {
  const row = source && typeof source === 'object' ? (source as Record<string, unknown>) : {}
  const name = resolveText(row.name, `Ubicación ${index + 1}`)
  const address = resolveText(row.address, resolveText(row.formattedAddress, 'Dirección del evento'))
  const latitude = toFiniteNumber(row.latitude)
  const longitude = toFiniteNumber(row.longitude)

  const resolvedMapsUrl = normalizeExternalUrl(
    resolveText(
      row.mapsCanonicalUrl,
      resolveText(row.mapsUrl, 'https://maps.google.com'),
    ),
  )
  const mapsUrl = resolvedMapsUrl && isValidHttpUrl(resolvedMapsUrl)
    ? resolvedMapsUrl
    : 'https://maps.google.com'

  const uberEnabled = row.uberEnabled !== false
  const explicitUberUrl = normalizeExternalUrl(resolveText(row.uberUrl, ''))
  const uberUrl = explicitUberUrl && isValidHttpUrl(explicitUberUrl)
    ? explicitUberUrl
    : buildUberUrl({
      mapsUrl,
      name,
      address,
      latitude,
      longitude,
    })

  return {
    id: resolveText(row.id, `loc-${index + 1}`),
    name,
    address,
    mapsUrl,
    uberEnabled,
    uberUrl,
    latitude,
    longitude,
  }
}

const locationCards = computed<TemplateLocationCard[]>(() => {
  const rawLocations = Array.isArray((props.data as Record<string, unknown>).locations)
    ? ((props.data as Record<string, unknown>).locations as unknown[])
    : []

  const source = rawLocations.length > 0
    ? rawLocations
    : [props.data.location]

  return source
    .filter((item) => item && typeof item === 'object')
    .slice(0, 2)
    .map((item, index) => toTemplateLocationCard(item, index))
})

const primaryLocation = computed<TemplateLocationCard>(() =>
  locationCards.value[0] ?? toTemplateLocationCard(props.data.location, 0),
)

const locationName = computed(() => primaryLocation.value.name)
const locationAddress = computed(() => primaryLocation.value.address)

const dressCode = computed(() => {
  const code = resolveText(props.data.dressCode?.code, '')
  const preset = code ? dressCodeByCode[code] : null

  return {
    title: resolveText(props.data.dressCode?.title, preset?.title ?? 'Dress code'),
    description: resolveText(props.data.dressCode?.description, preset?.description ?? 'Elegante sport en tonos claros.'),
  }
})

const faqItems = computed(() => (Array.isArray(props.data.faq) ? props.data.faq : []).filter((item) => item.question && item.answer))

const wallConfig = computed(() => {
  const source = props.data.wall && typeof props.data.wall === 'object'
    ? props.data.wall
    : {}

  const rawLimit = Number((source as Record<string, unknown>).limit)
  const normalizedLimit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.floor(rawLimit)
    : null

  return {
    title: resolveText((source as Record<string, unknown>).title, 'Muro de mensajes'),
    description: resolveText(
      (source as Record<string, unknown>).description,
      'Deja unas palabras lindas para este gran día.',
    ),
    addLabel: resolveText((source as Record<string, unknown>).addLabel, 'Añadir mensaje'),
    emptyStateLabel: resolveText(
      (source as Record<string, unknown>).emptyStateLabel,
      'Sé la primera persona en dejar un mensaje.',
    ),
    limit: normalizedLimit,
    receivedCount: Number.isFinite(Number((source as Record<string, unknown>).receivedCount))
      ? Math.max(0, Math.floor(Number((source as Record<string, unknown>).receivedCount)))
      : null,
  }
})

const normalizeWallMessage = (value: unknown, fallbackIndex: number): WallMessage => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    id: resolveText(source.id, `wall-${fallbackIndex + 1}`),
    guestName: resolveText(source.guestName, 'Invitado'),
    message: resolveText(source.message, ''),
    status: resolveText(source.status, 'visible'),
    isVisible: source.isVisible === false ? false : true,
    postedAt: resolveText(source.postedAt, '') || null,
  }
}

const wallMessages = ref<WallMessage[]>([])
const wallExpandedMessageIds = ref<Record<string, boolean>>({})

const hydrateWallMessagesFromProps = () => {
  if (props.demoMode) {
    wallMessages.value = demoWallMessages
    wallExpandedMessageIds.value = {}
    wallReceivedCount.value = demoWallMessages.length
    return
  }

  const source = Array.isArray(props.data.wall?.messages) ? props.data.wall?.messages : []
  wallMessages.value = source
    .map((item, index) => normalizeWallMessage(item, index))
    .filter((item) => item.message.trim().length > 0 && item.isVisible !== false)
  wallExpandedMessageIds.value = {}

  const explicitReceived = Number(props.data.wall?.receivedCount)
  if (Number.isFinite(explicitReceived) && explicitReceived >= 0) {
    wallReceivedCount.value = Math.floor(explicitReceived)
  } else {
    wallReceivedCount.value = wallMessages.value.length
  }
}

const wallHasMessages = computed(() => wallMessages.value.length > 0)

const wallPreviewMessages = computed(() => wallMessages.value.slice(0, 4))

const wallMessageLimit = computed(() => {
  if (wallConfig.value.limit !== null) return wallConfig.value.limit
  return 4
})

const wallReachedLimit = computed(() => {
  if (props.demoMode) return true
  const limit = wallMessageLimit.value
  if (limit === null) return false
  return wallReceivedCount.value >= limit
})

const wallUsageLabel = computed(() => {
  if (props.demoMode) {
    return 'Mensajes de ejemplo'
  }

  const used = Math.max(0, wallReceivedCount.value)
  const limit = wallMessageLimit.value
  if (limit === null) {
    return `${used} ${used === 1 ? 'mensaje' : 'mensajes'}`
  }

  return `${used}/${limit} mensajes`
})

const wallLimitTooltip = computed(() => {
  if (props.demoMode) {
    return 'En la demo los mensajes son de ejemplo. En tu invitación real tus invitados podrán escribirte.'
  }

  if (!wallReachedLimit.value) return wallConfig.value.addLabel

  const messages = [
    'Llegaste tarde 😅. Ya no entran más mensajes para esta invitación.',
    'Te ganaron de mano 😅. El muro ya está completo.',
    '¡Misión cumplida! 😅 Otros invitados llenaron el muro antes.',
  ]

  return messages[wallReceivedCount.value % messages.length] ?? messages[0]
})

const wallCanSubmit = computed(() => {
  if (props.editable) return false
  if (props.demoMode) return false
  if (!isSectionVisible('wall')) return false
  if (wallReachedLimit.value) return false
  return wallGuestName.value.trim().length >= 2
    && wallGuestMessage.value.trim().length >= 2
    && wallGuestMessage.value.length <= WALL_MESSAGE_MAX_LENGTH
    && !wallSubmitting.value
})

const wallGuestMessageLength = computed(() => wallGuestMessage.value.length)

const wallGuestInitial = (name: string): string => {
  const normalized = name.trim()
  if (!normalized) return '?'
  return normalized.charAt(0).toUpperCase()
}

const wallMessageKey = (item: WallMessage, index: number): string => `${item.id}-${index}`

const wallIsExpanded = (item: WallMessage, index: number): boolean =>
  Boolean(wallExpandedMessageIds.value[wallMessageKey(item, index)])

const toggleWallMessageExpanded = (item: WallMessage, index: number): void => {
  const key = wallMessageKey(item, index)
  wallExpandedMessageIds.value[key] = !Boolean(wallExpandedMessageIds.value[key])
}

const wallMessageToCodePoints = (value: string): string[] => Array.from(value ?? '')

const wallMessageIsLong = (message: string): boolean =>
  wallMessageToCodePoints(message).length > WALL_MESSAGE_PREVIEW_LENGTH

const wallMessageDisplayText = (message: string, expanded: boolean): string => {
  if (expanded || !wallMessageIsLong(message)) {
    return message
  }

  const truncated = wallMessageToCodePoints(message).slice(0, WALL_MESSAGE_PREVIEW_LENGTH).join('').trimEnd()
  return `${truncated}…`
}

const isPreviewViewportForced = computed(() =>
  props.previewViewport === 'mobile'
  || props.previewViewport === 'tablet'
  || props.previewViewport === 'desktop',
)

const usesEmbeddedOverlay = computed(() => props.editable || props.constrainedOverlay)

const previewViewportClassName = computed(() => {
  if (!isPreviewViewportForced.value) return ''
  const viewport = props.previewViewport
  if (viewport !== 'mobile' && viewport !== 'tablet' && viewport !== 'desktop') return ''
  return `snow-template--preview-${viewport}`
})

const previewZoomValue = computed(() => {
  const value = Number(props.previewZoomPercent ?? 100)
  if (!Number.isFinite(value)) return 100
  return value
})

const previewButtonsFontClass = computed(() => {
  if (!isPreviewViewportForced.value) return ''
  const viewport = props.previewViewport
  const isTabletOrDesktop = viewport === 'tablet' || viewport === 'desktop'
  if (!isTabletOrDesktop) return ''
  return previewZoomValue.value <= 80 ? 'snow-template--preview-buttons-16' : ''
})

const galleryItems = computed(() => {
  if (Array.isArray(props.data.gallery) && props.data.gallery.length) {
    return props.data.gallery
  }

  return []
})

const normalizeGalleryIndex = (index: number, total: number): number => {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

const resolveGalleryDisplayUrl = (item: (typeof props.data.gallery)[number]): string =>
  resolveText(item.galleryUrl, resolveText(item.imageUrl, ''))

const resolveGalleryThumbnailUrl = (item: (typeof props.data.gallery)[number]): string =>
  resolveText(item.thumbnailUrl, resolveGalleryDisplayUrl(item))

const resolveGalleryLightboxUrl = (item: (typeof props.data.gallery)[number]): string =>
  resolveText(item.lightboxUrl, resolveText(item.imageUrl, resolveGalleryDisplayUrl(item)))

const normalizedGalleryCarouselIndex = computed(() =>
  normalizeGalleryIndex(galleryCarouselIndex.value, galleryItems.value.length),
)

const normalizedGalleryLightboxIndex = computed(() =>
  normalizeGalleryIndex(galleryLightboxIndex.value, galleryItems.value.length),
)

const galleryHasMultipleItems = computed(() => galleryItems.value.length > 1)
const galleryIsCompactSet = computed(() => galleryItems.value.length <= 2)
const galleryIsSingleItem = computed(() => galleryItems.value.length === 1)
const galleryIsMobileMode = computed(() => galleryViewportMode.value === 'mobile')
const galleryIsTabletMode = computed(() => galleryViewportMode.value === 'tablet')
const galleryDesktopSlides = computed<GalleryDisplaySlide[]>(() => {
  const total = galleryItems.value.length
  if (total <= 0) return []

  const centerIndex = normalizedGalleryCarouselIndex.value

  if (galleryViewportMode.value === 'mobile') {
    return [{ index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' }]
  }

  if (galleryViewportMode.value === 'tablet') {
    if (total === 1) {
      return [{ index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' }]
    }

    const nextIndex = normalizeGalleryIndex(centerIndex + 1, total)
    return [
      { index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'left' },
      { index: nextIndex, item: galleryItems.value[nextIndex]!, role: 'right' },
    ]
  }

  if (total === 1) {
    return [{ index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' }]
  }

  if (total === 2) {
    const nextIndex = normalizeGalleryIndex(centerIndex + 1, total)
    return [
      { index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'left' },
      { index: nextIndex, item: galleryItems.value[nextIndex]!, role: 'right' },
    ]
  }

  const leftIndex = normalizeGalleryIndex(centerIndex - 1, total)
  const rightIndex = normalizeGalleryIndex(centerIndex + 1, total)

  return [
    { index: leftIndex, item: galleryItems.value[leftIndex]!, role: 'left' },
    { index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' },
    { index: rightIndex, item: galleryItems.value[rightIndex]!, role: 'right' },
  ]
})

const activeLightboxItem = computed(() => {
  if (!galleryItems.value.length) return null
  return galleryItems.value[normalizedGalleryLightboxIndex.value] ?? null
})

const galleryCounterLabel = computed(() => {
  const total = galleryItems.value.length
  if (!total) return '0 / 0'
  return `${normalizedGalleryCarouselIndex.value + 1} / ${total}`
})

const galleryLightboxCounterLabel = computed(() => {
  const total = galleryItems.value.length
  if (!total) return '0 / 0'
  return `${normalizedGalleryLightboxIndex.value + 1} / ${total}`
})

const galleryLightboxStyle = computed<Record<string, string>>(() => {
  if (props.editable || props.constrainedOverlay) {
    return {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      minHeight: '100%',
    }
  }

  return {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    minHeight: '100vh',
  }
})

const musicAudioUrl = computed(() => {
  const configured = resolveText(props.data.music?.audioUrl, '')
  if (configured) return configured

  return ''
})

const saveDateLabel = computed(() => resolveText(props.data.saveDate?.label, 'Guardar fecha'))
const branding = computed(() => {
  const source = props.data.branding && typeof props.data.branding === 'object'
    ? props.data.branding
    : { visible: false, label: 'Creado con InvitaSR' }

  return {
    visible: props.demoMode && Boolean(source.visible),
    label: resolveText(source.label, 'Creado con InvitaSR'),
    ctaLabel: resolveText((source as Record<string, unknown>).ctaLabel, 'Crear mi invitación'),
  }
})
const saveDateTitle = computed(() => {
  const eventTypeName = resolveText(props.typeEventName, 'Evento')
  const invitationName = resolveText(
    props.invitationTitle,
    `${brideName.value} y ${groomName.value}`,
  )

  return `${eventTypeName}: ${invitationName}`
})

const saveDateUrl = computed(() => {
  const target = toDate(props.data.event?.date?.iso ?? '') ?? countdownTarget.value
  if (!target) return '#'
  const endDate = new Date(target.getTime() + 1000 * 60 * 60 * 2)
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: saveDateTitle.value,
    dates: `${toCalendarFormat(target)}/${toCalendarFormat(endDate)}`,
    details: storyPrimary.value.description,
    location: `${locationName.value}, ${locationAddress.value}`,
  })

  return `https://calendar.google.com/calendar/render?${query.toString()}`
})

const checkinTitle = computed(() => resolveText(props.data.checkin?.title, 'Bienvenida interactiva'))
const checkinMessage = computed(() => resolveText(props.data.checkin?.message, 'Tu experiencia comienza aquí.'))
const checkinButton = computed(() => resolveText(props.data.checkin?.buttonLabel, 'Entrar'))
const checkinShowEventDate = computed(() => Boolean(props.data.checkin?.showEventDate ?? false))
const checkinShowEntryValue = computed(() => Boolean(props.data.checkin?.showEntryValue ?? false))
const checkinEventDateText = computed(() => {
  if (!checkinShowEventDate.value) return ''

  const eventDateIso = resolveText(props.data.checkin?.eventDateIso, resolveText(props.data.event?.date?.iso, ''))
  if (!eventDateIso) return ''

  const date = new Date(eventDateIso)
  if (Number.isNaN(date.getTime())) return ''

  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return formattedDate
})

const checkinEntryText = computed(() => {
  if (!checkinShowEntryValue.value) return ''

  const amount = Number(props.data.checkin?.entry?.amount ?? 0)
  if (!Number.isFinite(amount) || amount <= 0) return ''

  const currencyCode = resolveText(props.data.checkin?.entry?.currency, 'USD').toUpperCase()
  let formattedAmount = ''
  try {
    formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    formattedAmount = `${currencyCode} ${amount.toFixed(2)}`
  }

  return `Valor de la entrada: ${formattedAmount}.`
})

const checkinOverlayStyle = computed<Record<string, string>>(() => {
  if (props.editable || props.constrainedOverlay) {
    return {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      minHeight: '100%',
    }
  }

  return {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    minHeight: '100vh',
  }
})

const isEditing = (field: string) => props.editable && props.activeField === field

const isSectionVisible = (key: string) => props.sectionVisibility[key] !== false

const startEdit = (field: string) => {
  if (!props.editable) return
  emit('start-edit', field)
}

const updateText = (field: string, event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('update-field', {
    field,
    value: target?.value ?? '',
  })
}

const finishEdit = () => {
  emit('finish-edit')
}

const selectGallerySlide = (index: number) => {
  const total = galleryItems.value.length
  if (!total) return
  galleryCarouselIndex.value = normalizeGalleryIndex(index, total)
}

const goToPreviousGallerySlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectGallerySlide(normalizedGalleryCarouselIndex.value - 1)
}

const goToNextGallerySlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectGallerySlide(normalizedGalleryCarouselIndex.value + 1)
}

const openGalleryLightbox = (index = normalizedGalleryCarouselIndex.value) => {
  const total = galleryItems.value.length
  if (!total) return
  galleryLightboxIndex.value = normalizeGalleryIndex(index, total)
  galleryLightboxOpen.value = true
}

const closeGalleryLightbox = () => {
  galleryLightboxOpen.value = false
}

const selectLightboxSlide = (index: number) => {
  const total = galleryItems.value.length
  if (!total) return
  galleryLightboxIndex.value = normalizeGalleryIndex(index, total)
}

const goToPreviousLightboxSlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectLightboxSlide(normalizedGalleryLightboxIndex.value - 1)
}

const goToNextLightboxSlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectLightboxSlide(normalizedGalleryLightboxIndex.value + 1)
}

const toggleMute = () => {
  musicMuted.value = !musicMuted.value
  if (!musicMuted.value) {
    void startBackgroundMusic()
  }
}

const openFaq = () => {
  faqReviewedForRsvp.value = true
  faqModalOpen.value = true
}

const closeFaq = () => {
  faqModalOpen.value = false
}

const submitRsvp = async () => {
  if (props.editable) return
  if (props.demoMode) {
    if (rsvpNeedsFaqReview.value) {
      notifyError(rsvpGateHint.value)
      openFaq()
      return
    }

    notifyError('En esta prueba el botón es solo visual. Al crear tu invitación real podrás recibir confirmaciones.')
    return
  }

  if (!rsvpEnabled.value) {
    notifyError('La confirmación de asistencia no está disponible para esta invitación.')
    return
  }

  if (rsvpNeedsFaqReview.value) {
    notifyError(rsvpGateHint.value)
    return
  }

  if (!rsvpCanSubmit.value) {
    notifyError('Completa nombre y apellido para confirmar asistencia.')
    return
  }

  rsvpSubmitting.value = true
  try {
    const response = await createPublicInvitationRsvpResponse({
      first_name: rsvpFirstName.value.trim(),
      last_name: rsvpLastName.value.trim(),
      dietary_restrictions: rsvpDietaryRestrictions.value.trim() || null,
    })

    const fullName = response.response.fullName || `${response.response.firstName} ${response.response.lastName}`.trim()
    rsvpSuccessMessage.value = `¡Gracias ${fullName}! Tu asistencia quedó confirmada.`
    rsvpFirstName.value = ''
    rsvpLastName.value = ''
    rsvpDietaryRestrictions.value = ''
    notifySuccess('Tu asistencia quedó confirmada.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos registrar tu confirmación en este momento.')
  } finally {
    rsvpSubmitting.value = false
  }
}

const handleRsvpPrimaryAction = () => {
  if (props.editable) return
  void submitRsvp()
}

const formatWallDate = (rawIso?: string | null): string => {
  if (!rawIso) return 'Sin fecha'
  const parsed = new Date(rawIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed).replace(',', ' ·')
}

const openWallComposer = () => {
  if (props.editable) return
  if (props.demoMode) {
    notifyError(wallLimitTooltip.value)
    return
  }

  if (wallReachedLimit.value) {
    notifyError(wallLimitTooltip.value)
    return
  }
  wallComposerOpen.value = true
}

const closeWallComposer = () => {
  wallComposerOpen.value = false
}

const clearWallComposer = () => {
  wallGuestName.value = ''
  wallGuestMessage.value = ''
}

const submitWallMessage = async () => {
  if (!wallCanSubmit.value) return
  if (wallReachedLimit.value) {
    notifyError(wallLimitTooltip.value)
    return
  }
  wallSubmitting.value = true

  try {
    const response = await createPublicInvitationWallMessage({
      guest_name: wallGuestName.value.trim(),
      message: wallGuestMessage.value.trim(),
    })

    const nextMessage: WallMessage = {
      id: response.message.id,
      guestName: response.message.guestName,
      message: response.message.message,
      status: response.message.status,
      isVisible: response.message.isVisible,
      postedAt: response.message.postedAt,
    }

    wallMessages.value = [nextMessage, ...wallMessages.value]
    wallReceivedCount.value += 1
    notifySuccess('Tu mensaje se publicó correctamente.')
    clearWallComposer()
    closeWallComposer()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos publicar tu mensaje ahora.')
  } finally {
    wallSubmitting.value = false
  }
}

const openCheckinOverlay = () => {
  checkinOverlayVisible.value = true
}

const closeCheckinOverlay = () => {
  checkinOverlayVisible.value = false
  if (props.editable && props.checkinPreview) {
    emit('checkin-preview-closed')
  }
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (!galleryLightboxOpen.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeGalleryLightbox()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goToPreviousLightboxSlide()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goToNextLightboxSlide()
  }
}

const syncGalleryViewportMode = () => {
  if (isPreviewViewportForced.value) {
    const viewport = props.previewViewport
    if (viewport === 'mobile' || viewport === 'tablet' || viewport === 'desktop') {
      galleryViewportMode.value = viewport
      return
    }
    galleryViewportMode.value = 'desktop'
    return
  }

  const width = window.innerWidth
  if (width <= MOBILE_GALLERY_BREAKPOINT) {
    galleryViewportMode.value = 'mobile'
    return
  }

  if (width <= TABLET_GALLERY_BREAKPOINT) {
    galleryViewportMode.value = 'tablet'
    return
  }

  galleryViewportMode.value = 'desktop'
}

const startBackgroundMusic = async () => {
  const audio = audioRef.value
  if (!audio || !musicAudioUrl.value || !isSectionVisible('music')) return

  audio.muted = musicMuted.value
  audio.loop = true

  if (audio.src !== musicAudioUrl.value) {
    audio.src = musicAudioUrl.value
  }

  try {
    await audio.play()
  } catch {
    // Browser autoplay policies may block playback until user interaction.
  }
}

const pauseBackgroundMusic = () => {
  const audio = audioRef.value
  if (!audio) return
  audio.pause()
}

const syncMusicState = async () => {
  const audio = audioRef.value
  if (!audio) return

  if (!isSectionVisible('music') || !musicAudioUrl.value) {
    pauseBackgroundMusic()
    return
  }

  audio.muted = musicMuted.value
  await startBackgroundMusic()
}

onMounted(() => {
  hydrateWallMessagesFromProps()
  syncGalleryViewportMode()
  timerId = setInterval(() => {
    countdownNow.value = Date.now()
  }, 1000)
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', syncGalleryViewportMode, { passive: true })

  if (!props.editable && isSectionVisible('checkin')) {
    checkinOverlayVisible.value = true
  }

  void syncMusicState()
})

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId)
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', syncGalleryViewportMode)
  pauseBackgroundMusic()
  if (!props.editable && !props.constrainedOverlay) {
    document.body.style.overflow = ''
  }
})

watch(galleryItems, (items) => {
  if (!items.length) {
    galleryCarouselIndex.value = 0
    galleryLightboxIndex.value = 0
    galleryLightboxOpen.value = false
    return
  }

  galleryCarouselIndex.value = normalizedGalleryCarouselIndex.value
  galleryLightboxIndex.value = normalizedGalleryLightboxIndex.value
})

watch(galleryLightboxOpen, (isOpen) => {
  if (props.editable || props.constrainedOverlay) return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(
  () => props.data.music?.muted,
  (value) => {
    musicMuted.value = Boolean(value ?? true)
  },
)

watch(
  () => props.checkinPreview,
  (value) => {
    if (value) {
      openCheckinOverlay()
    } else if (props.editable) {
      closeCheckinOverlay()
    }
  },
  { immediate: true },
)

watch(
  () => [props.previewViewport, props.editable, props.constrainedOverlay],
  () => {
    syncGalleryViewportMode()
  },
)

watch([musicAudioUrl, () => props.sectionVisibility.music], () => {
  void syncMusicState()
})

watch(musicMuted, () => {
  void syncMusicState()
})

watch(
  () => props.data.wall?.messages,
  () => {
    hydrateWallMessagesFromProps()
  },
  { deep: true },
)
</script>

<template>
  <article
    class="snow-template"
    :class="[{ 'snow-template--public': !editable }, previewViewportClassName, previewButtonsFontClass]">
    <header v-if="isSectionVisible('hero')" class="snow-hero">
      <p class="snow-tag">Wedding Snow</p>

      <h1 v-if="!isEditing('hero_title')" class="snow-title editable" @dblclick="startEdit('hero_title')">
        {{ heroContent.title }}
      </h1>
      <input v-else class="inline-input inline-input--title" :value="heroContent.title" autofocus
        @input="updateText('hero_title', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

      <p v-if="!isEditing('hero_subtitle')" class="snow-subtitle editable" @dblclick="startEdit('hero_subtitle')">
        {{ heroContent.subtitle }}
      </p>
      <textarea v-else class="inline-input inline-input--multiline" :value="heroContent.subtitle" autofocus rows="2"
        @input="updateText('hero_subtitle', $event)" @blur="finishEdit" @keydown.esc.prevent="finishEdit" />

      <div class="snow-names">
        <p v-if="!isEditing('bride_name')" class="editable" @dblclick="startEdit('bride_name')">{{ brideName }}</p>
        <input v-else class="inline-input" :value="brideName" autofocus @input="updateText('bride_name', $event)"
          @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

        <span>&</span>

        <p v-if="!isEditing('groom_name')" class="editable" @dblclick="startEdit('groom_name')">{{ groomName }}</p>
        <input v-else class="inline-input" :value="groomName" autofocus @input="updateText('groom_name', $event)"
          @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
      </div>

      <div class="snow-meta">
        <p v-if="!isEditing('event_date_label')" class="editable" @dblclick="startEdit('event_date_label')">
          {{ eventDateLabel }}
        </p>
        <input v-else class="inline-input" :value="eventDateLabel" autofocus
          @input="updateText('event_date_label', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

        <p v-if="!isEditing('event_venue')" class="editable" @dblclick="startEdit('event_venue')">{{ eventVenue }}</p>
        <input v-else class="inline-input" :value="eventVenue" autofocus @input="updateText('event_venue', $event)"
          @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

        <p v-if="!isEditing('event_city')" class="editable" @dblclick="startEdit('event_city')">{{ eventCity }}</p>
        <input v-else class="inline-input" :value="eventCity" autofocus @input="updateText('event_city', $event)"
          @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
      </div>
    </header>

    <section v-if="isSectionVisible('countdown')" class="snow-card">
      <h2>{{ countdown.title }}</h2>
      <p v-if="!isEditing('countdown_note')" class="editable" @dblclick="startEdit('countdown_note')">
        {{ countdown.note }}
      </p>
      <textarea v-else class="inline-input inline-input--multiline" :value="countdown.note" autofocus rows="2"
        @input="updateText('countdown_note', $event)" @blur="finishEdit" @keydown.esc.prevent="finishEdit" />
      <div class="snow-countdown">
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.days }}</strong>
          <span>días</span>
        </div>
        <span class="snow-countdown__divider">:</span>
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.hours }}</strong>
          <span>horas</span>
        </div>
        <span class="snow-countdown__divider">:</span>
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.minutes }}</strong>
          <span>min</span>
        </div>
        <span class="snow-countdown__divider">:</span>
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.seconds }}</strong>
          <span>seg</span>
        </div>
      </div>
    </section>

    <section v-if="isSectionVisible('story')" class="snow-card">
      <p class="section-kicker">Historia</p>
      <h2 v-if="!isEditing('story_title')" class="editable" @dblclick="startEdit('story_title')">
        {{ storyPrimary.title }}
      </h2>
      <input v-else class="inline-input" :value="storyPrimary.title" autofocus
        @input="updateText('story_title', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

      <p v-if="!isEditing('story_description')" class="editable" @dblclick="startEdit('story_description')">
        {{ storyPrimary.description }}
      </p>
      <textarea v-else class="inline-input inline-input--multiline" :value="storyPrimary.description" autofocus rows="4"
        @input="updateText('story_description', $event)" @blur="finishEdit" @keydown.esc.prevent="finishEdit" />
    </section>

    <section v-if="isSectionVisible('gallery') && galleryItems.length > 0" class="snow-card">
      <p class="section-kicker">Galería</p>
      <div class="snow-gallery-carousel">
        <div class="snow-gallery-carousel__stage">
          <button v-if="galleryHasMultipleItems" type="button" class="snow-gallery-nav snow-gallery-nav--prev"
            aria-label="Imagen anterior" @click="goToPreviousGallerySlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 6-6 6 6 6" />
            </svg>
          </button>

          <button v-if="galleryHasMultipleItems" type="button" class="snow-gallery-nav snow-gallery-nav--next"
            aria-label="Imagen siguiente" @click="goToNextGallerySlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m10 6 6 6-6 6" />
            </svg>
          </button>

          <div class="snow-gallery-strip" :class="{
            'snow-gallery-strip--compact': galleryIsCompactSet,
            'snow-gallery-strip--single': galleryIsSingleItem,
            'snow-gallery-strip--tablet': galleryIsTabletMode,
            'snow-gallery-strip--mobile': galleryIsMobileMode,
          }">
            <button v-for="slide in galleryDesktopSlides"
              :key="`gallery-slide-${slide.item.id}-${slide.role}-${slide.index}`" type="button"
              class="snow-gallery-card" :class="`snow-gallery-card--${slide.role}`"
              :aria-label="`Abrir imagen ${slide.index + 1}`" @click="openGalleryLightbox(slide.index)">
              <img :src="resolveGalleryDisplayUrl(slide.item)" :alt="slide.item.alt" loading="lazy" />
            </button>
          </div>
        </div>

        <div class="snow-gallery-carousel__meta">
          <span>{{ galleryCounterLabel }}</span>
          <button type="button" class="snow-gallery-carousel__open" @click="openGalleryLightbox()">
            Ver en pantalla completa
          </button>
        </div>
      </div>
    </section>

    <section v-if="isSectionVisible('wall')" class="snow-card snow-wall">
      <div class="snow-wall__head">
        <p class="section-kicker">{{ wallConfig.title }}</p>
        <button v-if="!editable && !props.demoMode && (wallHasMessages || wallReachedLimit)" type="button" class="snow-wall__add"
          :class="{ 'is-disabled': wallReachedLimit }"
          :aria-label="wallReachedLimit ? 'Muro completo' : wallConfig.addLabel"
          :aria-disabled="wallReachedLimit ? 'true' : 'false'" :title="wallLimitTooltip"
          :data-tooltip="wallReachedLimit ? wallLimitTooltip : null" @click="openWallComposer">
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <p class="snow-wall__description">{{ wallConfig.description }}</p>
      <div class="snow-wall__meta">
        <span class="snow-wall__chip">{{ wallUsageLabel }}</span>
        <span v-if="!wallReachedLimit && !props.demoMode" class="snow-wall__chip snow-wall__chip--soft">Espacio para dedicatorias</span>
      </div>

      <form v-if="!wallHasMessages && !editable && !props.demoMode && !wallReachedLimit" class="snow-wall__form"
        @submit.prevent="submitWallMessage">
        <label>
          <span>Nombre</span>
          <input v-model="wallGuestName" type="text" maxlength="120" placeholder="Tu nombre" />
        </label>
        <label>
          <span>Mensaje</span>
          <textarea v-model="wallGuestMessage" rows="3" :maxlength="WALL_MESSAGE_MAX_LENGTH"
            placeholder="Escribe aquí tu mensaje"></textarea>
          <small class="snow-wall__counter">{{ wallGuestMessageLength }}/{{ WALL_MESSAGE_MAX_LENGTH }}</small>
        </label>
        <button type="submit" class="snow-action" :disabled="!wallCanSubmit">
          {{ wallSubmitting ? 'Publicando...' : 'Publicar mensaje' }}
        </button>
      </form>

      <p v-if="!wallHasMessages && !editable && !props.demoMode && wallReachedLimit" class="snow-wall__empty">
        {{ wallLimitTooltip }}
      </p>

      <p v-if="!wallHasMessages && editable" class="snow-wall__empty">
        {{ wallConfig.emptyStateLabel }}
      </p>

      <div v-if="wallHasMessages" class="snow-wall__grid">
        <article v-for="(item, index) in wallPreviewMessages" :key="`wall-${item.id}-${index}`" class="snow-wall-note">
          <header>
            <div class="snow-wall-note__author">
              <span class="snow-wall-note__avatar">{{ wallGuestInitial(item.guestName) }}</span>
              <strong>{{ item.guestName }}</strong>
            </div>
            <time>{{ formatWallDate(item.postedAt) }}</time>
          </header>
          <p>{{ wallMessageDisplayText(item.message, wallIsExpanded(item, index)) }}</p>
          <button v-if="wallMessageIsLong(item.message)" type="button" class="snow-wall-note__more"
            @click="toggleWallMessageExpanded(item, index)">
            {{ wallIsExpanded(item, index) ? 'Ver menos' : 'Ver más' }}
          </button>
        </article>
      </div>
    </section>

    <section v-if="isSectionVisible('location')" class="snow-card snow-location">
      <p class="section-kicker">Ubicación</p>
      <div class="snow-location-grid" :class="{ 'snow-location-grid--single': locationCards.length <= 1 }">
        <article v-for="(locationCard, index) in locationCards" :key="locationCard.id || `location-${index}`"
          class="snow-location-card">
          <strong>{{ locationCard.name }}</strong>
          <p>{{ locationCard.address }}</p>
          <div class="snow-actions-inline">
            <a class="snow-link" :href="locationCard.mapsUrl" target="_blank" rel="noopener noreferrer">Google Maps</a>
            <a v-if="locationCard.uberEnabled" class="snow-link" :href="locationCard.uberUrl" target="_blank"
              rel="noopener noreferrer">
              Pedir Uber
            </a>
          </div>
        </article>
      </div>
    </section>

    <div v-if="isSectionVisible('saveDate') || isSectionVisible('dressCode')" class="snow-dual-grid">
      <section v-if="isSectionVisible('saveDate')" class="snow-card snow-card--half">
        <p class="section-kicker">Save the date</p>
        <a v-if="!editable" class="snow-link" :href="saveDateUrl" target="_blank" rel="noopener noreferrer">
          {{ saveDateLabel }}
        </a>
        <button v-else type="button" class="snow-action" disabled>
          {{ saveDateLabel }} (se activa al publicar)
        </button>
      </section>

      <section v-if="isSectionVisible('dressCode')" class="snow-card snow-card--half">
        <p class="section-kicker">Dress code</p>
        <h2>{{ dressCode.title }}</h2>
        <p>{{ dressCode.description }}</p>
      </section>
    </div>

    <section v-if="isSectionVisible('rsvp')" class="snow-card snow-rsvp">
      <p class="section-kicker">Confirmación</p>
      <div class="snow-rsvp-layout">
        <div class="snow-rsvp-main">
          <p class="snow-rsvp__intro">
            Confirma tu asistencia para que podamos prepararlo todo para ti.
          </p>

          <form class="snow-rsvp-form" @submit.prevent="submitRsvp">
            <label>
              <span>{{ rsvpLabels.firstName }}</span>
              <input v-model="rsvpFirstName" type="text" maxlength="120" :disabled="props.editable || props.demoMode || rsvpSubmitting" />
            </label>
            <label>
              <span>{{ rsvpLabels.lastName }}</span>
              <input v-model="rsvpLastName" type="text" maxlength="120" :disabled="props.editable || props.demoMode || rsvpSubmitting" />
            </label>
            <label>
              <span>{{ rsvpLabels.dietaryRestrictions }}</span>
              <input v-model="rsvpDietaryRestrictions" type="text" maxlength="255"
                :disabled="props.editable || props.demoMode || rsvpSubmitting" />
            </label>

            <p class="snow-rsvp__hint">{{ rsvpGateHint }}</p>
          </form>

          <button v-if="!isEditing('rsvp_label')" class="snow-rsvp__button editable" type="button"
            :disabled="!props.editable && !props.demoMode && !rsvpCanSubmit"
            :aria-disabled="!props.editable && !props.demoMode && !rsvpCanSubmit ? 'true' : 'false'"
            :title="!props.editable && !rsvpCanSubmit ? rsvpGateHint : rsvpLabel" @click="handleRsvpPrimaryAction"
            @dblclick="startEdit('rsvp_label')">
            {{
              props.editable
                ? rsvpLabel
                : (rsvpSubmitting ? 'Confirmando...' : rsvpLabel)
            }}
          </button>
          <input v-else class="inline-input" :value="rsvpLabel" autofocus @input="updateText('rsvp_label', $event)"
            @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

          <p v-if="rsvpSuccessMessage && !props.editable" class="snow-rsvp__success">{{ rsvpSuccessMessage }}</p>
        </div>

        <aside v-if="isSectionVisible('faq')" class="snow-rsvp-side">
          <div v-if="faqReadRequiredForRsvp && !faqReviewedForRsvp" class="snow-rsvp__faq-gate">
            <strong>Antes de confirmar, revisa las preguntas importantes.</strong>
            <p>Así evitamos dudas de último momento y tu experiencia será más simple.</p>
            <button type="button" class="snow-action snow-action--cta" @click="openFaq">
              Leer preguntas importantes
            </button>
          </div>

          <div v-else class="snow-faq snow-faq--side">
            <h3>Preguntas frecuentes</h3>
            <p class="snow-faq__lead">
              Ya puedes revisar toda la información clave antes de confirmar.
            </p>
            <button class="snow-action snow-action--cta" type="button" @click="openFaq">
              Abrir preguntas frecuentes
            </button>
          </div>
        </aside>
      </div>
    </section>

    <audio ref="audioRef" preload="auto" loop playsinline></audio>

    <button v-if="isSectionVisible('music')" type="button" class="snow-music-fab" :class="{ active: !musicMuted }"
      :aria-label="musicMuted ? 'Activar música' : 'Silenciar música'" @click="toggleMute">
      <span class="music-wave">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span>{{ musicMuted ? 'Activar música' : 'Silenciar música' }}</span>
    </button>

    <RouterLink v-if="branding.visible" class="snow-brand-watermark" to="/planes">
      <span>{{ branding.label }}</span>
      <strong>{{ branding.ctaLabel }}</strong>
    </RouterLink>

    <section v-if="isSectionVisible('faq') && !isSectionVisible('rsvp')" class="snow-card snow-faq">
      <p class="section-kicker">Información importante</p>
      <h3>Preguntas frecuentes que conviene leer antes de confirmar</h3>
      <p class="snow-faq__lead">
        Te recomendamos leerlas para llegar al evento con todo claro.
      </p>
      <button class="snow-action snow-action--cta" type="button" @click="openFaq">
        Leer preguntas frecuentes
      </button>
    </section>

    <div
      v-if="faqModalOpen"
      class="snow-modal-backdrop"
      :class="{ 'snow-modal-backdrop--embedded': usesEmbeddedOverlay }"
      @click.self="closeFaq">
      <div class="snow-modal" :class="{ 'snow-modal--embedded': usesEmbeddedOverlay }">
        <header class="snow-modal__head">
          <h3>Preguntas frecuentes</h3>
          <button type="button" aria-label="Salir de preguntas frecuentes" title="Salir" @click="closeFaq">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <div class="snow-modal__body">
          <article v-for="item in faqItems" :key="item.id">
            <h4>{{ item.question }}</h4>
            <p>{{ item.answer }}</p>
          </article>
          <p v-if="!faqItems.length">Aún no hay preguntas cargadas.</p>
        </div>
      </div>
    </div>

    <div
      v-if="wallComposerOpen"
      class="snow-modal-backdrop"
      :class="{ 'snow-modal-backdrop--embedded': usesEmbeddedOverlay }"
      @click.self="closeWallComposer">
      <div class="snow-modal snow-modal--wall" :class="{ 'snow-modal--embedded': usesEmbeddedOverlay }">
        <header class="snow-modal__head">
          <h3>{{ wallConfig.addLabel }}</h3>
          <button type="button" aria-label="Salir de añadir mensaje" title="Salir" @click="closeWallComposer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <div class="snow-modal__body">
          <form class="snow-wall__form" @submit.prevent="submitWallMessage">
            <label>
              <span>Nombre</span>
              <input v-model="wallGuestName" type="text" maxlength="120" placeholder="Tu nombre" />
            </label>
            <label>
              <span>Mensaje</span>
              <textarea v-model="wallGuestMessage" rows="4" :maxlength="WALL_MESSAGE_MAX_LENGTH"
                placeholder="Escribe aquí tu mensaje"></textarea>
              <small class="snow-wall__counter">{{ wallGuestMessageLength }}/{{ WALL_MESSAGE_MAX_LENGTH }}</small>
            </label>
            <button type="submit" class="snow-action" :disabled="!wallCanSubmit">
              {{ wallSubmitting ? 'Publicando...' : 'Publicar mensaje' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <div v-if="galleryLightboxOpen" class="snow-gallery-lightbox" :style="galleryLightboxStyle"
      @click.self="closeGalleryLightbox">
      <div class="snow-gallery-lightbox__panel">
        <header class="snow-gallery-lightbox__head">
          <p>Galería · {{ galleryLightboxCounterLabel }}</p>
          <button type="button" aria-label="Salir de galería" title="Salir" @click="closeGalleryLightbox">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div class="snow-gallery-lightbox__stage">
          <button v-if="galleryHasMultipleItems" type="button"
            class="snow-gallery-lightbox__nav snow-gallery-lightbox__nav--prev" aria-label="Imagen anterior"
            @click="goToPreviousLightboxSlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 6-6 6 6 6" />
            </svg>
          </button>

          <figure v-if="activeLightboxItem">
            <img :src="resolveGalleryLightboxUrl(activeLightboxItem)" :alt="activeLightboxItem.alt" loading="eager" />
          </figure>

          <button v-if="galleryHasMultipleItems" type="button"
            class="snow-gallery-lightbox__nav snow-gallery-lightbox__nav--next" aria-label="Imagen siguiente"
            @click="goToNextLightboxSlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m10 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div class="snow-gallery-lightbox__thumbs" role="tablist" aria-label="Miniaturas en visor">
          <button v-for="(item, index) in galleryItems" :key="`lightbox-${item.id}`" type="button"
            class="snow-gallery-lightbox__thumb" :class="{ 'is-active': index === normalizedGalleryLightboxIndex }"
            :aria-label="`Ir a imagen ${index + 1}`" @click="selectLightboxSlide(index)">
            <img :src="resolveGalleryThumbnailUrl(item)" :alt="item.alt" loading="lazy" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="checkinOverlayVisible" class="snow-checkin-overlay" :style="checkinOverlayStyle" :class="{
      'snow-checkin-overlay--editor': editable,
      'snow-checkin-overlay--embedded': constrainedOverlay,
    }">
      <div class="snow-checkin-overlay__glow snow-checkin-overlay__glow--one"></div>
      <div class="snow-checkin-overlay__glow snow-checkin-overlay__glow--two"></div>
      <div class="snow-checkin-overlay__card">
        <p class="section-kicker">{{ props.checkinPreview ? 'Vista previa check-in' : 'Bienvenida interactiva' }}</p>
        <h3>{{ checkinTitle }}</h3>
        <p>{{ checkinMessage }}</p>
        <p v-if="checkinEventDateText" class="snow-checkin-overlay__meta">Te esperamos para celebrar juntos el <span
            style="display: block">{{ checkinEventDateText }}</span></p>
        <p v-if="checkinEntryText" class="snow-checkin-overlay__meta">{{ checkinEntryText }}</p>
        <button class="snow-action" type="button" @click="closeCheckinOverlay">{{ checkinButton }}</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.snow-template {
  --snow-thumb-size: 64px;
  --snow-thumb-gap: 8px;
  display: grid;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.95), rgba(248, 251, 255, 0.9)),
    linear-gradient(180deg, #f6f7fb 0%, #f2f5fa 100%);
  color: #1f2937;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: auto;
}

.snow-template--public {
  min-height: 100vh;
}

.snow-hero,
.snow-card {
  border-radius: 16px;
  border: 1px solid rgba(31, 41, 55, 0.08);
  background: white;
  padding: 16px;
}

.snow-wall {
  position: relative;
  overflow: hidden;
  border-color: rgba(122, 79, 217, 0.24);
  background: linear-gradient(180deg, #f8fbff 0%, #eef2ff 100%);
}

.snow-wall::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.2) 0 1px, transparent 1px 24px),
    radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.4), transparent 34%),
    radial-gradient(circle at 82% 76%, rgba(255, 255, 255, 0.28), transparent 31%);
  opacity: 0.66;
  pointer-events: none;
}

.snow-wall>* {
  position: relative;
  z-index: 1;
}

.snow-wall__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.snow-wall__description {
  margin: 0;
  color: rgba(45, 24, 10, 0.88);
}

.snow-wall__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0.62rem 0 0.85rem;
}

.snow-wall__chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.3rem 0.58rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #3b1f63;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(122, 79, 217, 0.22);
}

.snow-wall__chip--soft {
  color: #6a557e;
  border-color: rgba(110, 90, 136, 0.22);
}

.snow-wall__add {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}

.snow-wall__add:hover,
.snow-wall__add:focus-visible {
  transform: translateY(-1px) scale(1.04);
  background: rgba(15, 23, 42, 0.12);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
}

.snow-wall__add.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  background: rgba(15, 23, 42, 0.08);
  box-shadow: none;
}

.snow-wall__add.is-disabled:hover,
.snow-wall__add.is-disabled:focus-visible {
  transform: none;
  background: rgba(15, 23, 42, 0.08);
  box-shadow: none;
}

.snow-wall__add[data-tooltip] {
  position: relative;
}

.snow-wall__add[data-tooltip]::after,
.snow-wall__add[data-tooltip]::before {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.snow-wall__add[data-tooltip]::after {
  content: attr(data-tooltip);
  right: 0;
  top: calc(100% + 10px);
  transform: translateY(-4px);
  min-width: 220px;
  max-width: min(300px, 72vw);
  white-space: normal;
  text-align: left;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.94);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.01em;
  padding: 0.42rem 0.56rem;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.34);
  z-index: 4;
}

.snow-wall__add[data-tooltip]::before {
  content: '';
  right: 10px;
  top: calc(100% + 4px);
  transform: translateY(-4px);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(15, 23, 42, 0.94);
  z-index: 4;
}

.snow-wall__add[data-tooltip]:hover::after,
.snow-wall__add[data-tooltip]:hover::before,
.snow-wall__add[data-tooltip]:focus-visible::after,
.snow-wall__add[data-tooltip]:focus-visible::before {
  opacity: 1;
  transform: translateY(0);
}

.snow-wall__empty {
  margin: 0;
  padding: 0.8rem;
  border-radius: 12px;
  border: 1px dashed rgba(119, 82, 49, 0.45);
  color: rgba(57, 34, 14, 0.9);
  background: rgba(255, 252, 245, 0.85);
}

.snow-wall__form {
  display: grid;
  gap: 10px;
}

.snow-wall__form label {
  display: grid;
  gap: 6px;
}

.snow-wall__form span {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 700;
}

.snow-wall__counter {
  justify-self: end;
  margin-top: -2px;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}

.snow-wall__form input,
.snow-wall__form textarea {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 0.65rem 0.75rem;
  font-size: 0.9rem;
  color: #0f172a;
  background: #fff;
}

.snow-wall__form textarea {
  resize: vertical;
  min-height: 96px;
}

.snow-wall__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 0.25rem;
}

.snow-wall-note {
  --note-bg: #fff9b4;
  --note-edge: #f4eb8d;
  --pin-color: #db4f57;
  --note-paper-rotation: -1.4deg;
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  border: 0;
  padding: 16px 14px 14px;
  background: transparent;
  box-shadow:
    0 18px 28px rgba(45, 24, 10, 0.22),
    0 5px 12px rgba(45, 24, 10, 0.14);
  transition: transform 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease;
  transform: translateY(0);
}

.snow-wall-note>* {
  position: relative;
  z-index: 2;
}

.snow-wall-note::before {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 15px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0px, transparent 34px),
    repeating-linear-gradient(0deg, rgba(105, 78, 47, 0.08) 0 1px, transparent 1px 23px),
    linear-gradient(180deg, var(--note-bg) 0%, var(--note-edge) 100%);
  border: 1px solid rgba(102, 70, 43, 0.12);
  z-index: 0;
  transform: rotate(var(--note-paper-rotation));
  box-shadow: 0 10px 18px rgba(45, 24, 10, 0.12);
}

.snow-wall-note::after {
  content: '';
  position: absolute;
  top: 9px;
  left: 50%;
  width: 13px;
  height: 13px;
  margin-left: -6.5px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 35% 32%, rgba(255, 255, 255, 0.8), transparent 40%),
    var(--pin-color);
  box-shadow:
    0 2px 3px rgba(15, 23, 42, 0.25),
    inset 0 -2px 2px rgba(0, 0, 0, 0.22);
  z-index: 3;
  pointer-events: none;
}

.snow-wall-note__author::after {
  content: none;
}

.snow-wall-note:nth-child(2n) {
  --note-bg: #c7ecff;
  --note-edge: #afe2fa;
  --pin-color: #2f65cc;
  --note-paper-rotation: 1.4deg;
}

.snow-wall-note:nth-child(3n) {
  --note-bg: #ffe6ee;
  --note-edge: #ffd8e5;
  --pin-color: #f0d43f;
  --note-paper-rotation: -0.9deg;
}

.snow-wall-note:nth-child(4n) {
  --note-bg: #d8f6cf;
  --note-edge: #c6edbc;
  --pin-color: #2f65cc;
  --note-paper-rotation: 1.1deg;
}

.snow-wall-note:hover,
.snow-wall-note:focus-within {
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 24px 34px rgba(45, 24, 10, 0.3),
    0 8px 16px rgba(45, 24, 10, 0.2);
  filter: saturate(1.06);
}

.snow-wall-note header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding-top: 8px;
}

.snow-wall-note__author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snow-wall-note__avatar {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.74rem;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(130deg, #7a4fd9 0%, #f06aa6 100%);
  box-shadow: 0 4px 10px rgba(122, 79, 217, 0.38);
}

.snow-wall-note strong {
  font-size: 0.83rem;
  color: rgba(44, 23, 8, 0.96);
}

.snow-wall-note time {
  font-size: 0.71rem;
  color: rgba(84, 58, 35, 0.8);
  padding-top: 2px;
}

.snow-wall-note p {
  margin: 0;
  color: rgba(44, 23, 8, 0.92);
  white-space: pre-wrap;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.52;
}

.snow-wall-note__more {
  margin-top: 0.5rem;
  border: 0;
  background: transparent;
  color: #40207a;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(64, 32, 122, 0.45);
  text-underline-offset: 2px;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.snow-wall-note__more:hover,
.snow-wall-note__more:focus-visible {
  color: #2f65cc;
  text-decoration-color: rgba(47, 101, 204, 0.6);
}

.snow-modal--wall {
  max-width: 460px;
}

.snow-tag,
.section-kicker {
  margin: 0 0 0.5rem;
  font-size: 0.74rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #64748b;
}

.snow-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.snow-action {
  border: 0;
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: #0f172a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.62rem;
}

.snow-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.snow-subtitle {
  margin: 0.75rem 0 0;
  color: #4b5563;
  max-width: 52ch;
}

.snow-names {
  margin-top: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
  font-weight: 700;
}

.snow-names p {
  margin: 0;
}

.snow-meta {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  color: #475569;
}

.snow-meta p {
  margin: 0;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.5);
}

.snow-card h2 {
  margin: 0 0 0.45rem;
  font-size: 1.2rem;
}

.snow-card p {
  margin: 0;
  color: #374151;
}

.snow-countdown {
  margin-top: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, #f8fbff 0%, #eef2ff 100%);
}

.snow-countdown__unit {
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  padding: 0.46rem 0.56rem;
  text-align: center;
  min-width: 64px;
}

.snow-countdown__unit strong {
  display: block;
  font-size: 1.03rem;
  line-height: 1.1;
}

.snow-countdown__unit span {
  font-size: 0.72rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.snow-countdown__divider {
  color: #64748b;
  font-size: 1.2rem;
  font-weight: 700;
  padding-bottom: 0.26rem;
}

.snow-gallery-carousel {
  display: grid;
  gap: 0.78rem;
}

.snow-gallery-carousel__stage {
  position: relative;
  display: grid;
  gap: 0.65rem;
  overflow: visible;
}

.snow-gallery-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 0.75rem;
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
  padding: 0 54px;
}

.snow-gallery-strip--single {
  grid-template-columns: minmax(0, 1fr);
  max-width: 620px;
}

.snow-gallery-strip--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 820px;
}

.snow-gallery-strip--tablet {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 860px;
  padding: 0 18px;
}

.snow-gallery-strip--mobile {
  grid-template-columns: 1fr;
  max-width: none;
  padding: 0 12px;
}

.snow-gallery-strip--mobile .snow-gallery-card--left,
.snow-gallery-strip--mobile .snow-gallery-card--right {
  display: none;
}

.snow-gallery-card {
  border: 0;
  margin: 0;
  padding: 0;
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  cursor: zoom-in;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  transition: transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
  aspect-ratio: 3 / 4;
  filter: saturate(0.92);
}

.snow-gallery-card::after {
  content: '';
  position: absolute;
  left: 16%;
  right: 16%;
  bottom: 6px;
  height: 14px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0) 75%);
  filter: blur(5px);
  opacity: 0.45;
  transform: translateY(8px) scale(0.9);
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.snow-gallery-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.snow-gallery-card:hover img {
  transform: scale(1.06);
}

.snow-gallery-card:hover::after {
  opacity: 0.62;
  transform: translateY(10px) scale(1);
}

.snow-gallery-card--left,
.snow-gallery-card--right {
  opacity: 0.82;
  transform: translateY(22px) scale(0.88);
}

.snow-gallery-card--center {
  z-index: 2;
  transform: translateY(12px) scale(1.04);
  filter: saturate(1.03);
  box-shadow: 0 26px 44px rgba(15, 23, 42, 0.3);
}

.snow-gallery-card--center:hover {
  transform: translateY(8px) scale(1.06);
}

.snow-gallery-strip--compact .snow-gallery-card,
.snow-gallery-strip--single .snow-gallery-card,
.snow-gallery-strip--tablet .snow-gallery-card,
.snow-gallery-strip--mobile .snow-gallery-card {
  opacity: 1;
  transform: none;
  aspect-ratio: 3 / 4;
  filter: saturate(1);
}

.snow-gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(226, 232, 240, 0.72);
  background: rgba(15, 23, 42, 0.76);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    background 0.3s ease,
    box-shadow 0.3s ease,
    opacity 0.3s ease,
    visibility 0.3s ease;
  z-index: 4;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.snow-gallery-nav svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.snow-gallery-nav:hover {
  transform: translateY(-50%) scale(1.05);
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.35);
}

.snow-gallery-nav--prev {
  left: 8px;
}

.snow-gallery-nav--next {
  right: 8px;
}

.snow-gallery-carousel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.snow-gallery-carousel__meta span {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}

.snow-gallery-carousel__open {
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 999px;
  background: #fff;
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.72rem;
  cursor: pointer;
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s ease;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(4px);
}

.snow-gallery-carousel:hover .snow-gallery-nav,
.snow-gallery-carousel:focus-within .snow-gallery-nav {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.snow-gallery-carousel:hover .snow-gallery-carousel__open,
.snow-gallery-carousel:focus-within .snow-gallery-carousel__open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.snow-gallery-lightbox {
  z-index: 130;
  background: rgba(2, 6, 23, 0.84);
  display: grid;
  place-items: center;
  padding: 0.9rem;
}

.snow-gallery-lightbox__panel {
  width: min(1080px, calc(100vw - 1.6rem));
  max-height: calc(100dvh - 1.6rem);
  height: min(900px, calc(100dvh - 1.6rem));
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.snow-gallery-lightbox__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.snow-gallery-lightbox__head p {
  margin: 0;
  color: rgba(226, 232, 240, 0.95);
  font-size: 0.8rem;
  font-weight: 700;
}

.snow-gallery-lightbox__head button {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.7);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snow-gallery-lightbox__head button svg,
.snow-gallery-lightbox__nav svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.snow-gallery-lightbox__stage {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  min-height: 0;
}

.snow-gallery-lightbox__stage figure {
  position: relative;
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.2);
  min-height: 0;
  display: block;
  box-shadow: 0 24px 44px rgba(2, 6, 23, 0.44);
}

.snow-gallery-lightbox__stage figure::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 10px;
  height: 18px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.34) 0%, rgba(15, 23, 42, 0) 74%);
  filter: blur(7px);
  opacity: 0.5;
  pointer-events: none;
}

.snow-gallery-lightbox__stage img {
  width: 100%;
  max-height: min(70vh, 760px);
  object-fit: contain;
  background: rgba(2, 6, 23, 0.85);
  display: block;
}

.snow-gallery-lightbox__nav {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snow-gallery-lightbox__thumbs {
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding: 0.7rem 0.8rem 0.8rem;
  display: flex;
  align-items: center;
  gap: var(--snow-thumb-gap);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.snow-gallery-lightbox__thumb {
  position: relative;
  inline-size: var(--snow-thumb-size);
  block-size: var(--snow-thumb-size);
  flex: 0 0 var(--snow-thumb-size);
  border: 2px solid transparent;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.56);
  padding: 0;
  margin: 0;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.snow-gallery-lightbox__thumb::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: -8px;
  height: 12px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0) 74%);
  filter: blur(5px);
  opacity: 0.5;
  pointer-events: none;
}

.snow-gallery-lightbox__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.snow-gallery-lightbox__thumb.is-active {
  border-color: #60a5fa;
  box-shadow: 0 14px 26px rgba(96, 165, 250, 0.3);
}

.snow-gallery-lightbox__thumb:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 26px rgba(2, 6, 23, 0.4);
}

.snow-location strong {
  display: block;
  margin-bottom: 0.35rem;
}

.snow-location-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.snow-location-grid--single {
  grid-template-columns: 1fr;
}

.snow-location-card {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0.75rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
}

.snow-dual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.snow-card--half {
  min-height: 100%;
}

.snow-actions-inline {
  margin-top: 0.7rem;
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.snow-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  color: #0f172a;
  text-decoration: none;
  font-weight: 700;
  margin-top: 0.42rem;
}

.snow-rsvp__button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.1rem;
  background: linear-gradient(120deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.92rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  min-height: 44px;
}

.snow-rsvp__button.editable,
.snow-rsvp__button.editable:hover,
.snow-rsvp__button.editable:focus-visible {
  cursor: pointer !important;
  outline: none;
}

.snow-rsvp__button:not(:disabled):hover,
.snow-rsvp__button:not(:disabled):focus-visible {
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(15, 23, 42, 0.24);
}

.snow-rsvp__button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
  box-shadow: none;
}

.snow-rsvp-form {
  display: grid;
  gap: 0.72rem;
  margin-top: 0.6rem;
}

.snow-rsvp-layout {
  display: grid;
  gap: 14px;
}

.snow-rsvp-main,
.snow-rsvp-side {
  min-width: 0;
}

.snow-rsvp__intro {
  margin: 0;
  color: #475569;
}

.snow-rsvp__faq-gate {
  margin-top: 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  background:
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.2), transparent 45%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.93));
  padding: 0.8rem 0.85rem;
  display: grid;
  gap: 0.35rem;
}

.snow-rsvp__faq-gate strong {
  color: #1e293b;
}

.snow-rsvp__faq-gate p {
  margin: 0;
  color: #475569;
  font-size: 0.9rem;
}

.snow-rsvp__hint {
  margin: 0.2rem 0 0;
  font-size: 0.86rem;
  color: #64748b;
}

.snow-rsvp__success {
  margin: 0.65rem 0 0 !important;
  border-radius: 12px;
  padding: 0.62rem 0.75rem;
  border: 1px solid rgba(34, 197, 94, 0.24);
  background: rgba(240, 253, 244, 0.94);
  color: #166534;
  font-weight: 700;
}

.snow-rsvp-form label {
  display: grid;
  gap: 0.3rem;
}

.snow-rsvp-form span {
  font-size: 0.84rem;
  color: #475569;
  font-weight: 600;
}

.snow-rsvp-form input {
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 10px;
  min-height: 40px;
  padding: 0.5rem 0.65rem;
  font: inherit;
  margin-top: 0.12rem;
}

.snow-rsvp-form input:disabled {
  background: rgba(148, 163, 184, 0.12);
}

.snow-faq h3 {
  margin: 0.2rem 0 0;
  color: #0f172a;
  font-size: 1.15rem;
}

.snow-faq--side {
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 12px;
  padding: 0.85rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.94));
}

.snow-faq__lead {
  margin: 0.55rem 0 0;
  color: #475569;
}

.snow-action--cta {
  margin-top: 0.74rem;
  box-shadow: 0 0 0 rgba(15, 23, 42, 0.18);
  animation: faq-cta-pulse 2.2s ease-in-out infinite;
}

@keyframes faq-cta-pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.18);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(15, 23, 42, 0);
  }
}

.editable {
  cursor: text;
}

.editable:hover {
  outline: 1px dashed rgba(15, 23, 42, 0.3);
  outline-offset: 3px;
}

.snow-template--public .editable,
.snow-template--public .editable:hover,
.snow-template--public .editable:focus-visible {
  cursor: inherit;
  outline: none;
}

.inline-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: white;
  min-height: 40px;
  padding: 0.5rem 0.7rem;
  font: inherit;
  color: inherit;
}

.inline-input--title {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  font-weight: 700;
}

.inline-input--multiline {
  resize: vertical;
  min-height: 70px;
}

.snow-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.snow-modal-backdrop--embedded {
  position: absolute;
  z-index: 130;
  border-radius: inherit;
}

.snow-modal {
  width: min(640px, 94vw);
  max-height: min(82vh, 760px);
  border-radius: 16px;
  background: #fff;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.snow-modal--embedded {
  width: min(640px, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
}

.snow-modal--checkin {
  width: min(460px, 94vw);
  max-height: none;
  grid-template-rows: auto;
  gap: 0.75rem;
  padding: 1.1rem;
}

.snow-music-fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 90;
  border: 0;
  border-radius: 999px;
  padding: 0.56rem 0.9rem 0.56rem 0.72rem;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.36);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.snow-music-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 34px rgba(15, 23, 42, 0.44);
}

.snow-music-fab.active {
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
}

.music-wave {
  width: 22px;
  height: 18px;
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
}

.music-wave i {
  display: block;
  width: 4px;
  border-radius: 999px;
  background: #fff;
  animation: music-wave-idle 1.1s ease-in-out infinite;
}

.music-wave i:nth-child(1) {
  height: 7px;
  animation-delay: 0s;
}

.music-wave i:nth-child(2) {
  height: 12px;
  animation-delay: 0.1s;
}

.music-wave i:nth-child(3) {
  height: 9px;
  animation-delay: 0.2s;
}

.snow-music-fab:not(.active) .music-wave i {
  animation: none;
  opacity: 0.55;
}

.snow-brand-watermark {
  position: fixed;
  left: 22px;
  bottom: 22px;
  z-index: 91;
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  max-width: min(260px, calc(100vw - 44px));
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 18px;
  padding: 0.62rem 0.82rem;
  color: #fff;
  text-decoration: none;
  background: linear-gradient(135deg, rgba(122, 79, 217, 0.92), rgba(240, 106, 166, 0.9));
  box-shadow: 0 18px 36px rgba(66, 36, 105, 0.28);
  backdrop-filter: blur(14px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.snow-brand-watermark:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 42px rgba(66, 36, 105, 0.36);
}

.snow-brand-watermark span {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.82;
}

.snow-brand-watermark strong {
  font-size: 0.82rem;
  line-height: 1.1;
}

.snow-checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 1rem;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 20% 20%, rgba(191, 219, 254, 0.4), transparent 45%),
    radial-gradient(circle at 80% 18%, rgba(221, 214, 254, 0.35), transparent 42%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.86) 0%, rgba(30, 41, 59, 0.92) 100%);
  overflow: hidden;
}

.snow-checkin-overlay--editor {
  position: absolute;
  z-index: 50;
  inset: 0;
  height: 100%;
  min-height: 100%;
}

.snow-checkin-overlay--embedded {
  position: absolute;
  z-index: 50;
  inset: 0;
  height: 100%;
  min-height: 100%;
  border-radius: inherit;
}

.snow-checkin-overlay__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(4px);
  opacity: 0.55;
  pointer-events: none;
  animation: checkin-glow 3.6s ease-in-out infinite;
}

.snow-checkin-overlay__glow--one {
  width: 240px;
  height: 240px;
  background: rgba(125, 211, 252, 0.5);
  top: -40px;
  left: -30px;
}

.snow-checkin-overlay__glow--two {
  width: 300px;
  height: 300px;
  background: rgba(196, 181, 253, 0.44);
  bottom: -85px;
  right: -40px;
  animation-delay: 0.6s;
}

.snow-checkin-overlay__card {
  width: min(560px, calc(100vw - 1.2rem));
  max-height: calc(100dvh - 1.5rem);
  overflow: auto;
  border-radius: 24px;
  padding: 1.4rem 1.35rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 32px 62px rgba(15, 23, 42, 0.5);
  display: grid;
  gap: 0.86rem;
  text-align: center;
  animation: checkin-card-in 0.35s ease;
}

.snow-checkin-overlay--editor .snow-checkin-overlay__card {
  width: min(560px, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
}

.snow-checkin-overlay--embedded .snow-checkin-overlay__card {
  width: min(560px, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
}

.snow-checkin-overlay__card h3 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  color: #0f172a;
}

.snow-checkin-overlay__card p {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}

.snow-checkin-overlay__meta {
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  background: rgba(219, 234, 254, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-weight: 600;
}

.snow-modal__head {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.snow-modal__head h3 {
  margin: 0;
}

.snow-modal__head button {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #334155;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snow-modal__head button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.snow-modal__body {
  overflow: auto;
  padding: 0.95rem 1rem 1.1rem;
  display: grid;
  gap: 0.8rem;
}

.snow-modal__body h4 {
  margin: 0 0 0.25rem;
}

.snow-modal__body p {
  margin: 0;
}

@keyframes music-wave-idle {

  0%,
  100% {
    transform: scaleY(0.5);
    opacity: 0.65;
  }

  50% {
    transform: scaleY(1.2);
    opacity: 1;
  }
}

@keyframes checkin-card-in {
  from {
    transform: translateY(12px) scale(0.98);
    opacity: 0;
  }

  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes checkin-glow {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.46;
  }

  50% {
    transform: scale(1.08);
    opacity: 0.72;
  }
}

.snow-template--preview-tablet,
.snow-template--preview-mobile {
  --snow-thumb-size: 56px;
}

.snow-template--preview-tablet .snow-location-grid,
.snow-template--preview-tablet .snow-dual-grid,
.snow-template--preview-tablet .snow-rsvp-layout,
.snow-template--preview-mobile .snow-location-grid,
.snow-template--preview-mobile .snow-dual-grid,
.snow-template--preview-mobile .snow-rsvp-layout {
  grid-template-columns: 1fr;
}

.snow-template--preview-tablet .snow-rsvp__button,
.snow-template--preview-mobile .snow-rsvp__button {
  width: 100%;
}

.snow-template--preview-tablet .snow-gallery-strip,
.snow-template--preview-mobile .snow-gallery-strip {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: none;
  padding: 0 12px;
}

.snow-template--preview-mobile .snow-gallery-strip:not(.snow-gallery-strip--compact) .snow-gallery-card--left,
.snow-template--preview-mobile .snow-gallery-strip:not(.snow-gallery-strip--compact) .snow-gallery-card--right {
  display: none;
}

.snow-template--preview-tablet .snow-gallery-strip--compact,
.snow-template--preview-mobile .snow-gallery-strip--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 0 12px;
}

.snow-template--preview-tablet .snow-gallery-strip--single,
.snow-template--preview-mobile .snow-gallery-strip--single {
  grid-template-columns: 1fr;
  padding: 0 12px;
}

.snow-template--preview-tablet .snow-gallery-card,
.snow-template--preview-mobile .snow-gallery-card {
  aspect-ratio: 3 / 4;
}

.snow-template--preview-tablet .snow-gallery-card--left,
.snow-template--preview-tablet .snow-gallery-card--right,
.snow-template--preview-tablet .snow-gallery-card--center,
.snow-template--preview-mobile .snow-gallery-card--left,
.snow-template--preview-mobile .snow-gallery-card--right,
.snow-template--preview-mobile .snow-gallery-card--center {
  transform: none;
  opacity: 1;
  filter: saturate(1);
}

.snow-template--preview-tablet .snow-gallery-nav,
.snow-template--preview-mobile .snow-gallery-nav {
  width: 34px;
  height: 34px;
}

.snow-template--preview-tablet .snow-gallery-nav--prev,
.snow-template--preview-mobile .snow-gallery-nav--prev {
  left: 2px;
}

.snow-template--preview-tablet .snow-gallery-nav--next,
.snow-template--preview-mobile .snow-gallery-nav--next {
  right: 2px;
}

.snow-template--preview-tablet .snow-gallery-lightbox,
.snow-template--preview-mobile .snow-gallery-lightbox {
  padding: 0.45rem;
}

.snow-template--preview-tablet .snow-gallery-lightbox__panel,
.snow-template--preview-mobile .snow-gallery-lightbox__panel {
  width: min(100%, calc(100% - 0.4rem));
  max-height: calc(100% - 0.4rem);
  height: calc(100% - 0.4rem);
  border-radius: 12px;
}

.snow-template--preview-tablet .snow-gallery-lightbox__stage,
.snow-template--preview-mobile .snow-gallery-lightbox__stage {
  grid-template-columns: 1fr;
  gap: 0.6rem;
  padding: 0.55rem;
}

.snow-template--preview-tablet .snow-gallery-lightbox__stage figure,
.snow-template--preview-mobile .snow-gallery-lightbox__stage figure {
  border-radius: 10px;
  padding-inline: 2rem;
}

.snow-template--preview-tablet .snow-gallery-lightbox__nav,
.snow-template--preview-mobile .snow-gallery-lightbox__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  z-index: 2;
}

.snow-template--preview-tablet .snow-gallery-nav,
.snow-template--preview-tablet .snow-gallery-carousel__open,
.snow-template--preview-mobile .snow-gallery-nav,
.snow-template--preview-mobile .snow-gallery-carousel__open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.snow-template--preview-tablet .snow-gallery-lightbox__nav--prev,
.snow-template--preview-mobile .snow-gallery-lightbox__nav--prev {
  left: 0.45rem;
}

.snow-template--preview-tablet .snow-gallery-lightbox__nav--next,
.snow-template--preview-mobile .snow-gallery-lightbox__nav--next {
  right: 0.45rem;
}

.snow-template--preview-tablet .snow-gallery-lightbox__stage img,
.snow-template--preview-mobile .snow-gallery-lightbox__stage img {
  max-height: min(62vh, 520px);
  border-radius: 10px;
}

.snow-template--preview-tablet .snow-gallery-lightbox__thumbs,
.snow-template--preview-mobile .snow-gallery-lightbox__thumbs {
  padding: 0.58rem 0.62rem 0.65rem;
}

.snow-template--preview-tablet .snow-countdown,
.snow-template--preview-mobile .snow-countdown {
  width: 100%;
  justify-content: space-between;
  gap: 0.25rem;
  padding: 0.45rem 0.42rem;
}

.snow-template--preview-tablet .snow-countdown__unit,
.snow-template--preview-mobile .snow-countdown__unit {
  min-width: 0;
  flex: 1 1 0;
  padding: 0.42rem 0.4rem;
}

.snow-template--preview-tablet .snow-countdown__divider,
.snow-template--preview-mobile .snow-countdown__divider {
  font-size: 0.9rem;
  padding-bottom: 0.2rem;
}

.snow-template--preview-tablet .snow-wall__grid,
.snow-template--preview-mobile .snow-wall__grid {
  grid-template-columns: 1fr;
}

.snow-template--preview-tablet .snow-wall-note,
.snow-template--preview-mobile .snow-wall-note {
  transform: none;
}

.snow-template--preview-tablet .snow-music-fab,
.snow-template--preview-mobile .snow-music-fab {
  right: 12px;
  bottom: 12px;
  padding: 0.55rem 0.7rem;
}

.snow-template--preview-tablet .snow-music-fab span:last-child,
.snow-template--preview-mobile .snow-music-fab span:last-child {
  display: none;
}

.snow-template--preview-tablet .snow-brand-watermark,
.snow-template--preview-mobile .snow-brand-watermark {
  left: 12px;
  bottom: 12px;
  max-width: 190px;
  border-radius: 14px;
  padding: 0.52rem 0.64rem;
}

.snow-template--preview-tablet .snow-checkin-overlay,
.snow-template--preview-mobile .snow-checkin-overlay {
  padding: 0.7rem;
}

.snow-template--preview-tablet .snow-checkin-overlay__card,
.snow-template--preview-mobile .snow-checkin-overlay__card {
  width: min(520px, calc(100% - 0.75rem));
  max-height: calc(100% - 0.75rem);
  border-radius: 18px;
  padding: 1rem 0.9rem;
}

.snow-template--preview-tablet .snow-checkin-overlay__card h3,
.snow-template--preview-mobile .snow-checkin-overlay__card h3 {
  font-size: clamp(1.3rem, 5.4vw, 1.9rem);
}

.snow-template--preview-mobile {
  --snow-thumb-size: 52px;
}

.snow-template--preview-mobile .snow-gallery-strip,
.snow-template--preview-mobile .snow-gallery-strip--compact,
.snow-template--preview-mobile .snow-gallery-strip--single {
  grid-template-columns: 1fr;
  padding: 0 4px;
}

.snow-template--preview-tablet .snow-gallery-strip--tablet {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 0 12px;
}

.snow-template--preview-mobile .snow-gallery-strip--tablet,
.snow-template--preview-mobile .snow-gallery-strip--mobile {
  grid-template-columns: 1fr;
  padding: 0 4px;
}

.snow-template--preview-mobile .snow-gallery-nav {
  width: 32px;
  height: 32px;
}

.snow-template--preview-mobile .snow-gallery-lightbox {
  padding: 0;
}

.snow-template--preview-mobile .snow-gallery-lightbox__panel {
  width: 100%;
  height: 100%;
  max-height: 100%;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
}

.snow-template--preview-mobile .snow-gallery-lightbox__head {
  padding: 0.62rem;
}

.snow-template--preview-mobile .snow-gallery-lightbox__stage {
  padding: 0.5rem;
  gap: 0.45rem;
}

.snow-template--preview-mobile .snow-gallery-lightbox__stage figure {
  padding-inline: 1.75rem;
}

.snow-template--preview-mobile .snow-gallery-lightbox__stage img {
  max-height: min(64vh, 460px);
}

.snow-template--preview-mobile .snow-gallery-lightbox__nav {
  width: 32px;
  height: 32px;
}

.snow-template--preview-mobile .snow-gallery-lightbox__nav--prev {
  left: 0.3rem;
}

.snow-template--preview-mobile .snow-gallery-lightbox__nav--next {
  right: 0.3rem;
}

.snow-template--preview-mobile .snow-gallery-lightbox__thumbs {
  padding: 0.5rem;
  gap: 6px;
}

.snow-template--preview-mobile .snow-wall__form input,
.snow-template--preview-mobile .snow-wall__form textarea {
  font-size: 0.88rem;
}

.snow-template--preview-desktop .snow-location-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.snow-template--preview-desktop .snow-location-grid--single {
  grid-template-columns: 1fr;
}

.snow-template--preview-desktop .snow-dual-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.snow-template--preview-desktop .snow-rsvp-layout {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.snow-template--preview-desktop .snow-rsvp__button {
  width: auto;
  min-width: 220px;
}

.snow-template--preview-desktop .snow-gallery-strip {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 980px;
  padding: 0 54px;
}

.snow-template--preview-desktop .snow-gallery-strip--single {
  grid-template-columns: 1fr;
  max-width: 620px;
}

.snow-template--preview-desktop .snow-gallery-strip--compact,
.snow-template--preview-desktop .snow-gallery-strip--tablet {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 820px;
  padding: 0 12px;
}

.snow-template--preview-desktop .snow-gallery-card--left,
.snow-template--preview-desktop .snow-gallery-card--right {
  opacity: 0.82;
  transform: translateY(22px) scale(0.88);
}

.snow-template--preview-desktop .snow-gallery-card--center {
  z-index: 2;
  transform: translateY(12px) scale(1.04);
  filter: saturate(1.03);
  box-shadow: 0 26px 44px rgba(15, 23, 42, 0.3);
}

.snow-template--preview-desktop .snow-gallery-card--center:hover {
  transform: translateY(8px) scale(1.06);
}

.snow-template--preview-buttons-16 .snow-action,
.snow-template--preview-buttons-16 .snow-link,
.snow-template--preview-buttons-16 .snow-rsvp__button,
.snow-template--preview-buttons-16 .snow-gallery-carousel__open {
  font-size: 16px;
}

@media (min-width: 980px) {
  .snow-rsvp-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .snow-rsvp__button {
    width: auto;
    min-width: 220px;
  }
}

@media (max-width: 900px) {
  .snow-template {
    --snow-thumb-size: 56px;
  }

  .snow-location-grid,
  .snow-dual-grid,
  .snow-rsvp-layout {
    grid-template-columns: 1fr;
  }

  .snow-rsvp__button {
    width: 100%;
  }

  .snow-gallery-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: none;
    padding: 0 12px;
  }

  .snow-gallery-strip--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 12px;
  }

  .snow-gallery-strip--tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 12px;
  }

  .snow-gallery-strip--mobile {
    grid-template-columns: 1fr;
    padding: 0 4px;
  }

  .snow-gallery-strip--single {
    grid-template-columns: 1fr;
    padding: 0 12px;
  }

  .snow-gallery-card {
    aspect-ratio: 3 / 4;
  }

  .snow-gallery-card--left,
  .snow-gallery-card--right,
  .snow-gallery-card--center {
    transform: none;
    opacity: 1;
    filter: saturate(1);
  }

  .snow-gallery-nav {
    width: 34px;
    height: 34px;
  }

  .snow-gallery-nav--prev {
    left: 2px;
  }

  .snow-gallery-nav--next {
    right: 2px;
  }

  .snow-gallery-lightbox {
    padding: 0.45rem;
  }

  .snow-gallery-lightbox__panel {
    width: min(100vw, calc(100vw - 0.4rem));
    max-height: calc(100dvh - 0.4rem);
    height: calc(100dvh - 0.4rem);
    border-radius: 12px;
  }

  .snow-gallery-lightbox__stage {
    grid-template-columns: 1fr;
    gap: 0.6rem;
    padding: 0.55rem;
  }

  .snow-gallery-lightbox__stage figure {
    border-radius: 10px;
    padding-inline: 2rem;
  }

  .snow-gallery-lightbox__nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    z-index: 2;
  }

  .snow-gallery-nav,
  .snow-gallery-carousel__open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .snow-gallery-lightbox__nav--prev {
    left: 0.45rem;
  }

  .snow-gallery-lightbox__nav--next {
    right: 0.45rem;
  }

  .snow-gallery-lightbox__stage img {
    max-height: min(62vh, 520px);
    border-radius: 10px;
  }

  .snow-gallery-lightbox__thumbs {
    padding: 0.58rem 0.62rem 0.65rem;
  }

  .snow-countdown {
    width: 100%;
    justify-content: space-between;
    gap: 0.25rem;
    padding: 0.45rem 0.42rem;
  }

  .snow-countdown__unit {
    min-width: 0;
    flex: 1 1 0;
    padding: 0.42rem 0.4rem;
  }

  .snow-countdown__divider {
    font-size: 0.9rem;
    padding-bottom: 0.2rem;
  }

  .snow-wall__grid {
    grid-template-columns: 1fr;
  }

  .snow-wall-note {
    transform: none;
  }

  .snow-music-fab {
    right: 12px;
    bottom: 12px;
    padding: 0.55rem 0.7rem;
  }

  .snow-music-fab span:last-child {
    display: none;
  }

  .snow-checkin-overlay {
    padding: 0.7rem;
  }

  .snow-checkin-overlay__card {
    width: min(520px, calc(100vw - 1rem));
    max-height: calc(100dvh - 1rem);
    border-radius: 18px;
    padding: 1rem 0.9rem;
  }

  .snow-checkin-overlay--editor .snow-checkin-overlay__card {
    width: min(520px, calc(100% - 0.75rem));
    max-height: calc(100% - 0.75rem);
  }

  .snow-checkin-overlay--embedded .snow-checkin-overlay__card {
    width: min(520px, calc(100% - 0.75rem));
    max-height: calc(100% - 0.75rem);
  }

  .snow-checkin-overlay__card h3 {
    font-size: clamp(1.3rem, 5.4vw, 1.9rem);
  }
}

@media (max-width: 640px) {
  .snow-template {
    --snow-thumb-size: 52px;
  }

  .snow-gallery-strip,
  .snow-gallery-strip--compact,
  .snow-gallery-strip--single {
    grid-template-columns: 1fr;
    padding: 0 4px;
  }

  .snow-gallery-nav {
    width: 32px;
    height: 32px;
  }

  .snow-gallery-lightbox {
    padding: 0;
  }

  .snow-gallery-lightbox__panel {
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }

  .snow-gallery-lightbox__head {
    padding: 0.62rem;
  }

  .snow-gallery-lightbox__stage {
    padding: 0.5rem;
    gap: 0.45rem;
  }

  .snow-gallery-lightbox__stage figure {
    padding-inline: 1.75rem;
  }

  .snow-gallery-lightbox__stage img {
    max-height: min(64vh, 460px);
  }

  .snow-gallery-lightbox__nav {
    width: 32px;
    height: 32px;
  }

  .snow-gallery-lightbox__nav--prev {
    left: 0.3rem;
  }

  .snow-gallery-lightbox__nav--next {
    right: 0.3rem;
  }

  .snow-gallery-lightbox__thumbs {
    padding: 0.5rem;
    gap: 6px;
  }

  .snow-wall__form input,
  .snow-wall__form textarea {
    font-size: 0.88rem;
  }
}

/* Preview tabs (Mis invitaciones / editor) must match published grid semantics exactly,
   regardless of the real device viewport running the UI shell. */
.snow-template.snow-template--preview-desktop .snow-location-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

.snow-template.snow-template--preview-desktop .snow-location-grid--single {
  grid-template-columns: 1fr !important;
}

.snow-template.snow-template--preview-desktop .snow-dual-grid,
.snow-template.snow-template--preview-desktop .snow-rsvp-layout,
.snow-template.snow-template--preview-desktop .snow-wall__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

.snow-template.snow-template--preview-desktop .snow-gallery-strip {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
}

.snow-template.snow-template--preview-desktop .snow-gallery-strip--compact,
.snow-template.snow-template--preview-desktop .snow-gallery-strip--tablet {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

.snow-template.snow-template--preview-desktop .snow-gallery-strip--single,
.snow-template.snow-template--preview-desktop .snow-gallery-strip--mobile {
  grid-template-columns: 1fr !important;
}

.snow-template.snow-template--preview-tablet .snow-location-grid,
.snow-template.snow-template--preview-tablet .snow-dual-grid,
.snow-template.snow-template--preview-tablet .snow-rsvp-layout,
.snow-template.snow-template--preview-tablet .snow-wall__grid {
  grid-template-columns: 1fr !important;
}

.snow-template.snow-template--preview-tablet .snow-gallery-strip,
.snow-template.snow-template--preview-tablet .snow-gallery-strip--compact,
.snow-template.snow-template--preview-tablet .snow-gallery-strip--tablet {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

.snow-template.snow-template--preview-tablet .snow-gallery-strip--single,
.snow-template.snow-template--preview-tablet .snow-gallery-strip--mobile {
  grid-template-columns: 1fr !important;
}

.snow-template.snow-template--preview-mobile .snow-location-grid,
.snow-template.snow-template--preview-mobile .snow-dual-grid,
.snow-template.snow-template--preview-mobile .snow-rsvp-layout,
.snow-template.snow-template--preview-mobile .snow-wall__grid {
  grid-template-columns: 1fr !important;
}

.snow-template.snow-template--preview-mobile .snow-gallery-strip,
.snow-template.snow-template--preview-mobile .snow-gallery-strip--compact,
.snow-template.snow-template--preview-mobile .snow-gallery-strip--single,
.snow-template.snow-template--preview-mobile .snow-gallery-strip--tablet,
.snow-template.snow-template--preview-mobile .snow-gallery-strip--mobile {
  grid-template-columns: 1fr !important;
}
</style>

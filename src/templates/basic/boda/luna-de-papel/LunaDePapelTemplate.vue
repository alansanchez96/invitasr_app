<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PhoneCountrySelect from '@/components/ui/PhoneCountrySelect.vue'
import {
  createPublicInvitationDjSongRequest,
  createPublicInvitationRsvpResponse,
  createPublicInvitationWallMessage,
  trackPublicInvitationInteraction,
  type PublicInvitationInteractionType,
} from '@/services/publicInvitations'
import type {
  InvitationGalleryItem,
  InvitationTemplateRendererProps,
  InvitationThemeGradientConfig,
  InvitationThemeSectionConfig,
} from '@/templates/types'
import {
  buildInternationalPhoneValue,
  DEFAULT_PHONE_COUNTRY,
  detectPreferredPhoneCountry,
  formatNationalPhoneInput,
  nationalPhoneInputMaxLength,
  PHONE_COUNTRY_OPTIONS,
  type PhoneCountryOption,
} from '@/utils/phoneNumbers'
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

const countdownNow = ref(Date.now())
const musicMuted = ref(Boolean(props.data.music?.muted ?? true))
const rsvpSubmitting = ref(false)
const rsvpFirstName = ref('')
const rsvpLastName = ref('')
const rsvpDietaryRestrictions = ref('')
const rsvpWhatsappCountry = ref(DEFAULT_PHONE_COUNTRY)
const rsvpWhatsapp = ref('')
const rsvpCompanionsCount = ref<number | null>(null)
const rsvpSuccessMessage = ref<string | null>(null)
const rsvpConfirmationModalOpen = ref(false)
const rsvpConfirmationAccepted = ref(false)
const faqReviewedForRsvp = ref(false)
const checkinOverlayVisible = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const faqSectionRef = ref<HTMLElement | null>(null)
const galleryLightboxOpen = ref(false)
const galleryLightboxIndex = ref(0)
const galleryViewportWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth)
const wallComposerOpen = ref(false)
const wallArchiveOpen = ref(false)
const wallClouds = ref<WallCloudMessage[]>([])
const wallSubmitting = ref(false)
const wallGuestName = ref('')
const wallGuestMessage = ref('')
const wallReceivedCount = ref(0)
const djSongModalOpen = ref(false)
const djSongSubmitting = ref(false)
const djSongName = ref('')
const djSongReferenceUrl = ref('')
const djSongSuccessMessage = ref<string | null>(null)
const giftOptionsModalOpen = ref(false)
let timerId: ReturnType<typeof setInterval> | null = null
const WALL_MESSAGE_MAX_LENGTH = 250
const WALL_MESSAGE_PREVIEW_LENGTH = 120
const WALL_VISIBLE_PREVIEW_LIMIT = 2
const WALL_CLOUD_SCROLL_COOLDOWN_MS = 1600
const WALL_CLOUD_LIFETIME_MS = 4600

type WallMessage = {
  id: string
  guestName: string
  message: string
  displayOrder?: number | null
  status?: string
  isVisible?: boolean
  postedAt?: string | null
}

type WallCloudMessage = {
  key: string
  messageId: string
  guestName: string
  message: string
  side: 'left' | 'right'
  top: number
}

const wallCloudShownIds = new Set<string>()
const wallCloudTimeouts: ReturnType<typeof window.setTimeout>[] = []
let lastWallCloudAt = 0
let nextWallCloudSide: WallCloudMessage['side'] = 'left'

const demoWallMessages: WallMessage[] = [
  {
    id: 'luna-demo-wall-1',
    guestName: 'Sofía',
    message: 'Se siente íntima, cálida y muy de ustedes. Me encantó leer cada detalle.',
    postedAt: '2026-09-01T14:20:00-03:00',
  },
  {
    id: 'luna-demo-wall-2',
    guestName: 'Martín',
    message: 'Qué lindo poder dejarles unas palabras antes del gran día. Ahí estaremos.',
    postedAt: '2026-09-01T14:34:00-03:00',
  },
  {
    id: 'luna-demo-wall-3',
    guestName: 'Valentina',
    message: 'La invitación transmite mucho amor. Que sea una noche inolvidable.',
    postedAt: '2026-09-01T15:02:00-03:00',
  },
]

const resolveText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  return value.trim().length ? value : fallback
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/
type ThemeGradientType = 'linear' | 'radial' | 'conic'

const resolveColor = (value: unknown, fallback = ''): string => {
  const color = typeof value === 'string' ? value.trim() : ''
  return HEX_COLOR_PATTERN.test(color) ? color : fallback
}

const parseHexColor = (color: string): { r: number; g: number; b: number } | null => {
  if (!HEX_COLOR_PATTERN.test(color)) return null
  const hex = color.slice(1, 7)
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

const relativeLuminance = (color: string): number | null => {
  const rgb = parseHexColor(color)
  if (!rgb) return null
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return (0.2126 * channel(rgb.r)) + (0.7152 * channel(rgb.g)) + (0.0722 * channel(rgb.b))
}

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  if (foregroundLuminance === null || backgroundLuminance === null) return 1
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

const resolveReadableColor = (
  background: string,
  preferred: string,
  darkFallback = '#241b17',
  lightFallback = '#fffaf2',
  minimumRatio = 4.5,
): string => {
  if (preferred && contrastRatio(preferred, background) >= minimumRatio) return preferred
  return contrastRatio(darkFallback, background) >= contrastRatio(lightFallback, background)
    ? darkFallback
    : lightFallback
}

const isThemeGradientType = (value: unknown): value is ThemeGradientType =>
  value === 'linear' || value === 'radial' || value === 'conic'

const resolveGradientAngle = (value: unknown): number => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 135
  return Math.min(360, Math.max(0, Math.round(numericValue)))
}

const resolveGradientPaint = (
  config: InvitationThemeGradientConfig | undefined,
  fallbackColors: string[],
  fallbackPaint = '',
): string => {
  if (!config?.enabled) return fallbackPaint

  const colors = Array.isArray(config.colors)
    ? config.colors.map((color) => resolveColor(color)).filter(Boolean).slice(0, 5)
    : []
  const resolvedColors = colors.length >= 2 ? colors : fallbackColors.filter(Boolean)

  if (resolvedColors.length < 2) return fallbackPaint

  const type = isThemeGradientType(config.type) ? config.type : 'linear'
  const angle = resolveGradientAngle(config.angle)
  const colorStops = resolvedColors.join(', ')

  if (type === 'radial') return `radial-gradient(circle, ${colorStops})`
  if (type === 'conic') return `conic-gradient(from ${angle}deg, ${colorStops})`
  return `linear-gradient(${angle}deg, ${colorStops})`
}

const isSectionVisible = (key: string) => props.sectionVisibility[key] !== false
const isEditing = (field: string) => props.editable && props.activeField === field

const startEdit = (field: string) => {
  if (!props.editable) return
  emit('start-edit', field)
}

const updateText = (field: string, event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('update-field', { field, value: target?.value ?? '' })
}

const finishEdit = () => emit('finish-edit')

const heroTitle = computed(() => resolveText(props.data.hero?.title ?? props.data.couple.headline, 'Nos casamos'))
const heroSubtitle = computed(() => resolveText(props.data.hero?.subtitle, 'Una celebración pensada para compartir.'))
const brideName = computed(() => resolveText(props.data.couple.brideName, 'Nombre 1'))
const groomName = computed(() => resolveText(props.data.couple.groomName, 'Nombre 2'))
const eventDateLabel = computed(() => resolveText(props.data.event.date.label, 'Fecha por confirmar'))
const eventVenue = computed(() => resolveText(props.data.event.venue, 'Lugar del evento'))
const eventCity = computed(() => resolveText(props.data.event.city, 'Ciudad'))
const storyTitle = computed(() => resolveText(props.data.story?.[0]?.title, 'Nuestra historia'))
const storyDescription = computed(() => resolveText(props.data.story?.[0]?.description, 'Comparte una historia breve y personal.'))
const rsvpLabel = computed(() => resolveText(props.data.rsvp?.submitLabel, 'Confirmar asistencia'))
const rsvpLabels = computed(() => ({
  firstName: resolveText(props.data.rsvp?.formLabels?.firstName, 'Nombre'),
  lastName: resolveText(props.data.rsvp?.formLabels?.lastName, 'Apellido'),
  dietaryRestrictions: resolveText(props.data.rsvp?.formLabels?.dietaryRestrictions, 'Restricción alimentaria'),
  whatsapp: resolveText(props.data.rsvp?.formLabels?.whatsapp, 'WhatsApp'),
  companions: resolveText(props.data.rsvp?.formLabels?.companions, 'Acompañantes'),
}))
const djSongConfig = computed(() => {
  const source = props.data.djSongRequests ?? {}
  return {
    enabled: source.enabled !== false,
    buttonLabel: resolveText(source.buttonLabel, 'Sugerir canción'),
    modalTitle: resolveText(source.modalTitle, 'Sugerir canción para la fiesta'),
    songLabel: resolveText(source.songLabel, 'Nombre de la canción'),
    referenceLabel: resolveText(source.referenceLabel, 'Enlace de referencia'),
    submitLabel: resolveText(source.submitLabel, 'Enviar sugerencia'),
    features: source.features ?? {},
  }
})
const djSongRequestsEnabled = computed(() => {
  const features = djSongConfig.value.features
  return djSongConfig.value.enabled
    && Boolean(features.enabled ?? features.djSongRequestsEnabled ?? features.dj_song_requests_enabled)
})
const djSongCanSubmit = computed(() =>
  !props.editable
  && !props.demoMode
  && djSongRequestsEnabled.value
  && !djSongSubmitting.value
  && djSongName.value.trim().length >= 2,
)
const giftOptionsConfig = computed(() => {
  const source = props.data.giftOptions ?? {}
  const rawItems = Array.isArray(source.items) ? source.items : []
  return {
    enabled: source.enabled === true,
    title: resolveText(source.title, 'Opciones de regalos'),
    description: resolveText(source.description, 'Ideas simples para quienes quieran tener un detalle con nosotros.'),
    buttonLabel: resolveText(source.buttonLabel, 'Ver opciones de regalos'),
    modalTitle: resolveText(source.modalTitle, 'Opciones de regalos'),
    emptyLabel: resolveText(source.emptyLabel, 'Aún no agregaste opciones de regalos.'),
    features: source.features ?? {},
    items: rawItems
      .map((item, index) => ({
        id: resolveText(item.id, `gift-${index + 1}`),
        category: resolveText(item.category, 'Regalo'),
        name: resolveText(item.name, ''),
      }))
      .filter((item) => item.name.trim().length > 0),
  }
})
const giftOptionsEnabled = computed(() => {
  const features = giftOptionsConfig.value.features
  return giftOptionsConfig.value.enabled
    && isSectionVisible('giftOptions')
    && Boolean(features.enabled ?? features.giftOptionsEnabled ?? features.gift_options_enabled)
})
const rsvpFields = computed(() => Array.isArray(props.data.rsvp?.features?.fields) ? props.data.rsvp.features.fields : [])
const phoneCountryOptions = PHONE_COUNTRY_OPTIONS
const rsvpWhatsappEnabled = computed(() =>
  Boolean(props.data.rsvp?.features?.whatsappEnabled ?? props.data.rsvp?.features?.whatsapp_enabled)
  || rsvpFields.value.includes('whatsapp'),
)
const rsvpCompanionsEnabled = computed(() =>
  Boolean(props.data.rsvp?.features?.companionsEnabled ?? props.data.rsvp?.features?.companions_enabled)
  || rsvpFields.value.includes('companions'),
)
const rsvpPopupConfirmationEnabled = computed(() =>
  Boolean(props.data.rsvp?.features?.popupConfirmationEnabled ?? props.data.rsvp?.features?.popup_confirmation_enabled),
)
const rsvpWhatsappMaxLength = computed(() => nationalPhoneInputMaxLength(rsvpWhatsappCountry.value))
const countdownNote = computed(() => resolveText(props.data.countdown?.note, 'Falta poco para encontrarnos.'))

const galleryItems = computed(() => (Array.isArray(props.data.gallery) ? props.data.gallery : []))
const galleryVisibleLimit = computed(() => {
  if (props.previewViewport === 'mobile') return 3
  if (props.previewViewport === 'tablet' || props.previewViewport === 'desktop') return 5
  if (galleryViewportWidth.value <= 640) return 3
  if (galleryViewportWidth.value <= 900) return 4
  return 5
})
const galleryPreviewItems = computed(() =>
  galleryItems.value.slice(0, galleryVisibleLimit.value).map((item, index) => ({ item, index })),
)
const faqItems = computed(() =>
  (Array.isArray(props.data.faq) ? props.data.faq : [])
    .filter((item) => Boolean(item.question) && Boolean(item.answer))
    .slice(0, 3),
)
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
    displayOrder: Number.isFinite(Number(source.displayOrder)) ? Number(source.displayOrder) : null,
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

  const source = Array.isArray(props.data.wall?.messages) ? props.data.wall.messages : []
  wallMessages.value = source
    .map((item, index) => normalizeWallMessage(item, index))
    .filter((item) => item.message.trim().length > 0 && item.isVisible !== false)
  wallExpandedMessageIds.value = {}

  const explicitReceived = Number(props.data.wall?.receivedCount)
  wallReceivedCount.value = Number.isFinite(explicitReceived) && explicitReceived >= 0
    ? Math.floor(explicitReceived)
    : wallMessages.value.length
}
const wallHasMessages = computed(() => wallMessages.value.length > 0)
const wallPreviewMessages = computed(() => wallMessages.value.slice(0, WALL_VISIBLE_PREVIEW_LIMIT))
const wallHasOverflow = computed(() => wallMessages.value.length > WALL_VISIBLE_PREVIEW_LIMIT)
const wallArchiveCountLabel = computed(() => {
  const count = wallMessages.value.length
  return `${count} ${count === 1 ? 'mensaje recibido' : 'mensajes recibidos'}`
})
const wallCloudMessagesEnabled = computed(() =>
  !props.editable
  && !props.demoMode
  && isSectionVisible('wall')
  && wallMessages.value.length > 0
  && Boolean(
    props.data.wall?.features?.cloudMessagesEnabled
    ?? props.data.wall?.features?.cloud_messages_enabled
    ?? props.data.wall?.cloudMessagesEnabled
    ?? props.data.wall?.cloud_messages_enabled,
  ),
)
const wallMessageLimit = computed(() => wallConfig.value.limit ?? 4)
const wallReachedLimit = computed(() => {
  if (props.demoMode) return true
  const limit = wallMessageLimit.value
  if (limit === null) return false
  return wallReceivedCount.value >= limit
})
const wallUsageLabel = computed(() => {
  if (props.demoMode) return 'Mensajes de ejemplo'

  const used = Math.max(0, wallReceivedCount.value)
  const limit = wallMessageLimit.value
  if (limit === null) return `${used} ${used === 1 ? 'mensaje' : 'mensajes'}`
  return `${used}/${limit} mensajes`
})
const wallLimitTooltip = computed(() => {
  if (props.demoMode) {
    return 'En la demo los mensajes son de ejemplo. En tu invitación real tus invitados podrán escribirte.'
  }

  if (!wallReachedLimit.value) return wallConfig.value.addLabel
  return 'El muro ya está completo.'
})
const wallCanSubmit = computed(() => {
  if (props.editable || props.demoMode) return false
  if (!isSectionVisible('wall') || wallReachedLimit.value) return false
  return wallGuestName.value.trim().length >= 2
    && wallGuestMessage.value.trim().length >= 2
    && wallGuestMessage.value.length <= WALL_MESSAGE_MAX_LENGTH
    && !wallSubmitting.value
})
const wallGuestMessageLength = computed(() => wallGuestMessage.value.length)
const wallGuestInitial = (name: string): string => {
  const normalized = name.trim()
  return normalized ? normalized.charAt(0).toUpperCase() : '?'
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
  if (expanded || !wallMessageIsLong(message)) return message
  const truncated = wallMessageToCodePoints(message).slice(0, WALL_MESSAGE_PREVIEW_LENGTH).join('').trimEnd()
  return `${truncated}...`
}
const cleanupWallClouds = () => {
  wallCloudTimeouts.splice(0).forEach((timeoutId) => window.clearTimeout(timeoutId))
  wallClouds.value = []
}
const showNextWallCloud = () => {
  if (!wallCloudMessagesEnabled.value) return

  const now = Date.now()
  if (now - lastWallCloudAt < WALL_CLOUD_SCROLL_COOLDOWN_MS) return

  const candidates = wallMessages.value.filter((item) => !wallCloudShownIds.has(item.id))
  if (!candidates.length) return

  const next = candidates[Math.floor(Math.random() * candidates.length)]
  if (!next) return

  lastWallCloudAt = now
  wallCloudShownIds.add(next.id)
  const side = nextWallCloudSide
  nextWallCloudSide = side === 'left' ? 'right' : 'left'

  const cloud: WallCloudMessage = {
    key: `${next.id}-${now}`,
    messageId: next.id,
    guestName: next.guestName,
    message: next.message,
    side,
    top: Math.round(window.innerHeight * 0.75),
  }

  wallClouds.value = [...wallClouds.value, cloud]
  const timeoutId = window.setTimeout(() => {
    wallClouds.value = wallClouds.value.filter((item) => item.key !== cloud.key)
  }, WALL_CLOUD_LIFETIME_MS)
  wallCloudTimeouts.push(timeoutId)
}
const handleWallCloudScroll = () => {
  showNextWallCloud()
}
const syncGalleryViewportWidth = () => {
  galleryViewportWidth.value = window.innerWidth
}
const usesEmbeddedOverlay = computed(() => props.editable || props.constrainedOverlay)
const galleryHasMultipleItems = computed(() => galleryItems.value.length > 1)
const normalizedGalleryLightboxIndex = computed(() =>
  galleryItems.value.length
    ? ((galleryLightboxIndex.value % galleryItems.value.length) + galleryItems.value.length) % galleryItems.value.length
    : 0,
)
const activeGalleryItem = computed(() => galleryItems.value[normalizedGalleryLightboxIndex.value] ?? null)

const resolveGalleryDisplayUrl = (item: InvitationGalleryItem): string =>
  resolveText(item.galleryUrl, resolveText(item.imageUrl, ''))

const resolveGalleryLightboxUrl = (item: InvitationGalleryItem): string =>
  resolveText(item.lightboxUrl, resolveText(item.imageUrl, resolveGalleryDisplayUrl(item)))

const templateThemeStyle = computed<Record<string, string>>(() => {
  const theme = props.data.theme ?? {}
  const background = resolveColor(theme.background, '#fbf4ea')
  const backgroundAccent = resolveColor(theme.backgroundAccent, '#eef0df')
  const text = resolveColor(theme.text, '#241b17')
  const paper = resolveColor(theme.sectionBackground, '#fffaf2')
  const primary = resolveColor(theme.primary, '#3f5f55')
  const defaultBackgroundPaint = `linear-gradient(180deg, ${background}, ${backgroundAccent} 52%, #f7e6da)`
  const backgroundGradient = theme.gradients?.background?.enabled
    ? theme.gradients.background
    : theme.gradients?.backgroundAccent
  const buttonBackground = resolveColor(theme.buttonBackground, '#3f5f55')
  const buttonBackgroundAlt = resolveColor(theme.buttonBackgroundAlt, '#9d6255')
  const buttonBackgroundPaint = resolveGradientPaint(
    theme.gradients?.buttonBackground,
    [buttonBackground, buttonBackgroundAlt],
    buttonBackground,
  )
  const cloudText = resolveReadableColor(paper, text)
  const cloudAccent = resolveReadableColor(paper, primary, cloudText, buttonBackgroundAlt, 3)

  return {
    '--luna-ink': text,
    '--luna-paper': paper,
    '--luna-bg': background,
    '--luna-bg-accent': backgroundAccent,
    '--luna-bg-paint': resolveGradientPaint(
      backgroundGradient,
      [background, backgroundAccent],
      defaultBackgroundPaint,
    ),
    '--luna-moss': primary,
    '--luna-clay': resolveColor(theme.secondary, '#b97865'),
    '--luna-gold': buttonBackgroundAlt,
    '--luna-button-bg': buttonBackground,
    '--luna-button-bg-paint': buttonBackgroundPaint,
    '--luna-button-text': resolveColor(theme.buttonText, '#fffaf2'),
    '--luna-cloud-surface': paper,
    '--luna-cloud-text': cloudText,
    '--luna-cloud-accent': cloudAccent,
  }
})

const sectionThemeStyle = (sectionKey: string): Record<string, string> => {
  const sections = props.data.theme?.sections ?? {}
  const config = sections[sectionKey] as InvitationThemeSectionConfig | undefined
  if (!config) return {}

  const style: Record<string, string> = {}

  if (sectionKey === 'hero') {
    const text = resolveColor(config.text, resolveColor(config.primaryText))
    const secondaryText = resolveColor(config.secondaryText)
    const accent = resolveColor(config.accent)

    if (text) style['--section-text'] = text
    if (secondaryText) style['--section-muted'] = secondaryText
    if (accent) style['--section-accent'] = accent

    return style
  }

  if (sectionKey === 'countdown') {
    const surface = resolveColor(config.surface, resolveColor(config.background))
    const counterText = resolveColor(config.counterText)
    const accent = resolveColor(config.accent)

    if (surface) style['--section-surface'] = surface
    if (counterText) style['--section-counter-text'] = counterText
    if (accent) style['--section-accent'] = accent

    return style
  }

  return {}
}

const previewViewportClass = computed(() => {
  if (props.previewViewport === 'mobile') return 'luna-template--preview-mobile'
  if (props.previewViewport === 'tablet') return 'luna-template--preview-tablet'
  if (props.previewViewport === 'desktop') return 'luna-template--preview-desktop'
  return ''
})

const previewButtonsFontClass = computed(() => {
  if (props.previewViewport === 'mobile') return ''
  const zoom = Number(props.previewZoomPercent ?? 100)
  return zoom >= 50 && zoom <= 80 ? 'luna-template--compact-buttons' : ''
})

const publishedOverlayOpen = computed(() =>
  !props.editable
  && !props.constrainedOverlay
  && (
    checkinOverlayVisible.value
    || galleryLightboxOpen.value
    || wallComposerOpen.value
    || wallArchiveOpen.value
    || djSongModalOpen.value
    || giftOptionsModalOpen.value
    || rsvpConfirmationModalOpen.value
  ),
)

const targetDate = computed(() => {
  const raw = props.data.countdown?.targetDateIso || props.data.event.date.iso
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
})

const countdownParts = computed(() => {
  const target = targetDate.value
  if (!target) return { days: '00', hours: '00', minutes: '00' }
  const diff = Math.max(0, target.getTime() - countdownNow.value)
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
  }
})

const saveDateUrl = computed(() => {
  const start = targetDate.value
  if (!start) return ''
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const text = encodeURIComponent(`${brideName.value} & ${groomName.value}`)
  const location = encodeURIComponent(`${eventVenue.value}, ${eventCity.value}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${format(start)}/${format(end)}&location=${location}`
})

const checkinShowEventDate = computed(() => Boolean(props.data.checkin?.showEventDate ?? false))
const checkinShowEntryValue = computed(() => Boolean(props.data.checkin?.showEntryValue ?? false))
const checkinEventDateText = computed(() => {
  if (!checkinShowEventDate.value) return ''

  const eventDateIso = resolveText(props.data.checkin?.eventDateIso, resolveText(props.data.event.date.iso, ''))
  if (!eventDateIso) return ''

  const date = new Date(eventDateIso)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})

const checkinEntryText = computed(() => {
  if (!checkinShowEntryValue.value) return ''

  const amount = Number(props.data.checkin?.entry?.amount ?? 0)
  if (!Number.isFinite(amount) || amount <= 0) return ''

  const currencyCode = resolveText(props.data.checkin?.entry?.currency, 'USD').toUpperCase()
  try {
    return `Valor de la entrada: ${new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount)}.`
  } catch {
    return `Valor de la entrada: ${currencyCode} ${amount.toFixed(2)}.`
  }
})

const rsvpPopupConfirmationMessage = computed(() => {
  const amount = checkinEntryText.value
    .replace('Valor de la entrada:', '')
    .replace(/\.$/, '')
    .trim()
  const time = checkinEventDateText.value.trim()

  if (!amount && !time) {
    return 'Antes de enviar tu confirmación, revisa que tus datos estén correctos. ¿Quieres continuar?'
  }

  const amountText = amount ? `el valor de la tarjeta es ${amount}` : ''
  const timeText = time ? `la recepción comienza el ${time}` : ''
  const joined = [amountText, timeText].filter(Boolean).join(' y ')

  return `¡Genial! Recuerda que ${joined}. ¿Deseas continuar?`
})

const closeRsvpConfirmationModal = () => {
  if (rsvpSubmitting.value) return
  rsvpConfirmationModalOpen.value = false
}

const confirmRsvpSubmission = () => {
  rsvpConfirmationAccepted.value = true
  rsvpConfirmationModalOpen.value = false
  void handleRsvp()
}

const musicAudioUrl = computed(() => resolveText(props.data.music?.audioUrl, ''))

const syncAudioPlayback = async () => {
  const audio = audioRef.value
  if (!audio || !musicAudioUrl.value || !isSectionVisible('music')) return

  audio.muted = musicMuted.value
  audio.loop = true
  if (audio.src !== musicAudioUrl.value) {
    audio.src = musicAudioUrl.value
  }

  if (!musicMuted.value) {
    try {
      await audio.play()
    } catch {
      musicMuted.value = true
    }
  } else {
    audio.pause()
  }
}

const faqReadRequiredForRsvp = computed(() =>
  !props.editable
  && !props.demoMode
  && isSectionVisible('faq')
  && faqItems.value.length > 0,
)

const rsvpNeedsFaqReview = computed(() =>
  faqReadRequiredForRsvp.value && !faqReviewedForRsvp.value,
)

const rsvpCanSubmit = computed(() => {
  if (rsvpNeedsFaqReview.value) return false
  if (rsvpSubmitting.value) return false
  return rsvpFirstName.value.trim().length > 1 && rsvpLastName.value.trim().length > 1
})

const rsvpGateHint = computed(() =>
  rsvpNeedsFaqReview.value
    ? 'Antes de confirmar, abre las preguntas importantes para evitar dudas de último momento.'
    : 'Confirma tu asistencia para que podamos esperarte mejor.',
)

const trackInteraction = (eventType: PublicInvitationInteractionType, metadata?: Record<string, unknown>) => {
  if (props.editable || props.demoMode) return

  void trackPublicInvitationInteraction({
    event_type: eventType,
    metadata: metadata ?? null,
  }).catch(() => undefined)
}

const onFaqToggle = (event: Event) => {
  const target = event.target as HTMLDetailsElement | null
  if (target?.open) {
    faqReviewedForRsvp.value = true
    trackInteraction('faq_open')
  }
}

const goToFaqBeforeRsvp = () => {
  faqSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const updateRsvpWhatsappCountry = (nextCountry: string) => {
  const match = phoneCountryOptions.find((country): country is PhoneCountryOption => country.iso === nextCountry)
  if (!match) return

  rsvpWhatsappCountry.value = match.iso
  rsvpWhatsapp.value = formatNationalPhoneInput(rsvpWhatsapp.value, match.iso)
}

const updateRsvpWhatsapp = (event: Event) => {
  const value = (event.target as HTMLInputElement | null)?.value ?? ''
  rsvpWhatsapp.value = formatNationalPhoneInput(value, rsvpWhatsappCountry.value)
}

const handleRsvp = async () => {
  if (props.editable) return
  if (props.demoMode) {
    notifySuccess('Confirmación de ejemplo lista.')
    return
  }
  if (rsvpNeedsFaqReview.value) {
    notifyError(rsvpGateHint.value)
    goToFaqBeforeRsvp()
    return
  }
  if (!rsvpCanSubmit.value) {
    notifyError('Completa nombre y apellido para confirmar.')
    return
  }

  if (rsvpPopupConfirmationEnabled.value && !rsvpConfirmationAccepted.value) {
    rsvpConfirmationModalOpen.value = true
    return
  }
  rsvpConfirmationAccepted.value = false

  rsvpSubmitting.value = true
  try {
    const payload: Parameters<typeof createPublicInvitationRsvpResponse>[0] = {
      first_name: rsvpFirstName.value.trim(),
      last_name: rsvpLastName.value.trim(),
      dietary_restrictions: rsvpDietaryRestrictions.value.trim() || null,
    }
    if (rsvpWhatsappEnabled.value) {
      payload.whatsapp = buildInternationalPhoneValue(rsvpWhatsappCountry.value, rsvpWhatsapp.value) || null
    }
    if (rsvpCompanionsEnabled.value) {
      payload.companions_count = Math.max(0, Number(rsvpCompanionsCount.value) || 0)
    }

    await createPublicInvitationRsvpResponse(payload)
    trackInteraction('rsvp_submit')
    rsvpSuccessMessage.value = 'Gracias. Tu asistencia quedó confirmada.'
    rsvpFirstName.value = ''
    rsvpLastName.value = ''
    rsvpDietaryRestrictions.value = ''
    rsvpWhatsapp.value = ''
    rsvpCompanionsCount.value = null
    notifySuccess('Confirmación recibida.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos registrar tu confirmación.')
  } finally {
    rsvpSubmitting.value = false
  }
}

const openDjSongModal = () => {
  if (props.demoMode) {
    notifyError('En la demo este botón es solo visual. En una invitación Pro tus invitados podrán sugerir canciones.')
    return
  }

  if (!djSongRequestsEnabled.value) return
  djSongSuccessMessage.value = null
  djSongModalOpen.value = true
}

const closeDjSongModal = () => {
  if (djSongSubmitting.value) return
  djSongModalOpen.value = false
}

const openGiftOptionsModal = () => {
  if (!giftOptionsEnabled.value) return
  giftOptionsModalOpen.value = true
}

const closeGiftOptionsModal = () => {
  giftOptionsModalOpen.value = false
}

const clearDjSongForm = () => {
  djSongName.value = ''
  djSongReferenceUrl.value = ''
}

const submitDjSongRequest = async () => {
  if (props.editable) return
  if (!djSongCanSubmit.value) {
    notifyError('Escribe el nombre de la canción para enviarla.')
    return
  }

  djSongSubmitting.value = true
  try {
    await createPublicInvitationDjSongRequest({
      song_name: djSongName.value.trim(),
      reference_url: djSongReferenceUrl.value.trim() || null,
    })
    clearDjSongForm()
    djSongSuccessMessage.value = 'Listo. La canción quedó sugerida.'
    notifySuccess('Tu canción quedó sugerida.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos guardar tu canción ahora.')
  } finally {
    djSongSubmitting.value = false
  }
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
  if (props.demoMode || wallReachedLimit.value) {
    notifyError(wallLimitTooltip.value)
    return
  }

  wallComposerOpen.value = true
}

const closeWallComposer = () => {
  wallComposerOpen.value = false
}

const openWallArchive = () => {
  wallArchiveOpen.value = true
}

const closeWallArchive = () => {
  wallArchiveOpen.value = false
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

const toggleMusic = () => {
  musicMuted.value = !musicMuted.value
  void syncAudioPlayback()
}

const openCheckin = () => {
  if (props.editable) return
  checkinOverlayVisible.value = false
}

const closeEditorCheckin = () => {
  emit('checkin-preview-closed')
}

const openGalleryLightbox = (index: number) => {
  if (!galleryItems.value.length) return
  galleryLightboxIndex.value = index
  galleryLightboxOpen.value = true
  trackInteraction('gallery_open', { index })
}

const closeGalleryLightbox = () => {
  galleryLightboxOpen.value = false
}

const selectLightboxSlide = (index: number) => {
  if (!galleryItems.value.length) return
  galleryLightboxIndex.value = index
  trackInteraction('gallery_navigate', { index })
}

const goToPreviousLightboxSlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectLightboxSlide(normalizedGalleryLightboxIndex.value - 1)
}

const goToNextLightboxSlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectLightboxSlide(normalizedGalleryLightboxIndex.value + 1)
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

onMounted(() => {
  rsvpWhatsappCountry.value = detectPreferredPhoneCountry()
  hydrateWallMessagesFromProps()
  syncGalleryViewportWidth()
  timerId = setInterval(() => {
    countdownNow.value = Date.now()
  }, 60000)
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', syncGalleryViewportWidth, { passive: true })
  window.addEventListener('scroll', handleWallCloudScroll, { passive: true })

  if (!props.editable && isSectionVisible('checkin')) {
    checkinOverlayVisible.value = true
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', syncGalleryViewportWidth)
  window.removeEventListener('scroll', handleWallCloudScroll)
  cleanupWallClouds()
  if (!props.editable && !props.constrainedOverlay && typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
})

watch(galleryItems, (items) => {
  if (!items.length) {
    galleryLightboxOpen.value = false
    galleryLightboxIndex.value = 0
    return
  }

  galleryLightboxIndex.value = normalizedGalleryLightboxIndex.value
})

watch([musicAudioUrl, musicMuted], () => {
  void syncAudioPlayback()
})

watch(publishedOverlayOpen, (isOpen) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isOpen ? 'hidden' : ''
}, { immediate: true })

watch(
  () => props.data.wall?.messages,
  () => {
    hydrateWallMessagesFromProps()
    wallCloudShownIds.clear()
    nextWallCloudSide = 'left'
    cleanupWallClouds()
  },
  { deep: true },
)
</script>

<template>
  <article
    class="luna-template"
    :class="[{ 'luna-template--public': !editable }, previewViewportClass, previewButtonsFontClass]"
    :style="templateThemeStyle"
  >
    <section v-if="isSectionVisible('hero')" class="luna-hero" :style="sectionThemeStyle('hero')">
      <div class="luna-hero__paper">
        <p class="luna-eyebrow">Invitación de boda</p>
        <h1 v-if="!isEditing('hero_title')" class="editable" @dblclick="startEdit('hero_title')">{{ heroTitle }}</h1>
        <input v-else class="inline-input inline-input--title" :value="heroTitle" autofocus @input="updateText('hero_title', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />

        <p v-if="!isEditing('hero_subtitle')" class="luna-hero__subtitle editable" @dblclick="startEdit('hero_subtitle')">{{ heroSubtitle }}</p>
        <textarea v-else class="inline-input inline-input--area" :value="heroSubtitle" autofocus rows="3" @input="updateText('hero_subtitle', $event)" @blur="finishEdit" @keydown.esc.prevent="finishEdit" />

        <div class="luna-couple">
          <span v-if="!isEditing('bride_name')" class="editable" @dblclick="startEdit('bride_name')">{{ brideName }}</span>
          <input v-else class="inline-input" :value="brideName" autofocus @input="updateText('bride_name', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
          <i aria-hidden="true">&</i>
          <span v-if="!isEditing('groom_name')" class="editable" @dblclick="startEdit('groom_name')">{{ groomName }}</span>
          <input v-else class="inline-input" :value="groomName" autofocus @input="updateText('groom_name', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
        </div>

        <div class="luna-event-card">
          <p v-if="!isEditing('event_date_label')" class="editable" @dblclick="startEdit('event_date_label')">{{ eventDateLabel }}</p>
          <input v-else class="inline-input" :value="eventDateLabel" autofocus @input="updateText('event_date_label', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
          <strong v-if="!isEditing('event_venue')" class="editable" @dblclick="startEdit('event_venue')">{{ eventVenue }}</strong>
          <input v-else class="inline-input" :value="eventVenue" autofocus @input="updateText('event_venue', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
          <small v-if="!isEditing('event_city')" class="editable" @dblclick="startEdit('event_city')">{{ eventCity }}</small>
          <input v-else class="inline-input" :value="eventCity" autofocus @input="updateText('event_city', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
        </div>
      </div>
    </section>

    <section v-if="isSectionVisible('countdown')" class="luna-countdown luna-section" :style="sectionThemeStyle('countdown')">
      <div>
        <p class="luna-eyebrow">{{ data.countdown?.eyebrow || 'Cuenta regresiva' }}</p>
        <h2>{{ data.countdown?.title || 'La noche se acerca' }}</h2>
        <p v-if="!isEditing('countdown_note')" class="editable" @dblclick="startEdit('countdown_note')">{{ countdownNote }}</p>
        <textarea v-else class="inline-input inline-input--area" :value="countdownNote" autofocus rows="2" @input="updateText('countdown_note', $event)" @blur="finishEdit" @keydown.esc.prevent="finishEdit" />
      </div>
      <div class="luna-countdown__grid" aria-label="Cuenta regresiva">
        <span><strong>{{ countdownParts.days }}</strong><small>días</small></span>
        <span><strong>{{ countdownParts.hours }}</strong><small>horas</small></span>
        <span><strong>{{ countdownParts.minutes }}</strong><small>min</small></span>
      </div>
    </section>

    <section v-if="isSectionVisible('story')" class="luna-story luna-section" :style="sectionThemeStyle('story')">
      <div class="luna-story__number">01</div>
      <div>
        <p class="luna-eyebrow">Nuestra historia</p>
        <h2 v-if="!isEditing('story_title')" class="editable" @dblclick="startEdit('story_title')">{{ storyTitle }}</h2>
        <input v-else class="inline-input inline-input--title" :value="storyTitle" autofocus @input="updateText('story_title', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
        <p v-if="!isEditing('story_description')" class="editable" @dblclick="startEdit('story_description')">{{ storyDescription }}</p>
        <textarea v-else class="inline-input inline-input--area" :value="storyDescription" autofocus rows="4" @input="updateText('story_description', $event)" @blur="finishEdit" @keydown.esc.prevent="finishEdit" />
      </div>
    </section>

    <section v-if="isSectionVisible('gallery') && galleryPreviewItems.length" class="luna-gallery luna-section" aria-label="Galería" :style="sectionThemeStyle('gallery')">
      <figure v-for="previewItem in galleryPreviewItems" :key="previewItem.item.id || previewItem.index">
        <button type="button" :aria-label="`Abrir imagen ${previewItem.index + 1}`" @click="openGalleryLightbox(previewItem.index)">
          <img :src="resolveGalleryDisplayUrl(previewItem.item)" :alt="previewItem.item.alt || 'Foto de la pareja'" />
        </button>
      </figure>
    </section>

    <section v-if="isSectionVisible('wall')" class="luna-wall luna-section" :style="sectionThemeStyle('wall')">
      <div class="luna-wall__intro">
        <p class="luna-eyebrow">{{ wallConfig.title }}</p>
        <h2>Palabras que quedan</h2>
        <p>{{ wallConfig.description }}</p>
        <div class="luna-wall__meta">
          <span>{{ wallUsageLabel }}</span>
          <button
            v-if="!editable && !demoMode && (wallHasMessages || wallReachedLimit)"
            type="button"
            :class="{ 'is-disabled': wallReachedLimit }"
            :aria-disabled="wallReachedLimit ? 'true' : 'false'"
            :title="wallLimitTooltip"
            @click="openWallComposer"
          >
            {{ wallReachedLimit ? 'Muro completo' : wallConfig.addLabel }}
          </button>
        </div>
      </div>

      <form v-if="!wallHasMessages && !editable && !demoMode && !wallReachedLimit" class="luna-wall__form" @submit.prevent="submitWallMessage">
        <input v-model="wallGuestName" type="text" maxlength="120" placeholder="Tu nombre" />
        <textarea v-model="wallGuestMessage" rows="3" :maxlength="WALL_MESSAGE_MAX_LENGTH" placeholder="Escribe aquí tu mensaje"></textarea>
        <small>{{ wallGuestMessageLength }}/{{ WALL_MESSAGE_MAX_LENGTH }}</small>
        <button type="submit" :disabled="!wallCanSubmit">
          {{ wallSubmitting ? 'Publicando...' : 'Publicar mensaje' }}
        </button>
      </form>

      <p v-if="!wallHasMessages && editable" class="luna-wall__empty">{{ wallConfig.emptyStateLabel }}</p>
      <p v-if="!wallHasMessages && !editable && !demoMode && wallReachedLimit" class="luna-wall__empty">{{ wallLimitTooltip }}</p>

      <div v-if="wallHasMessages" class="luna-wall__messages">
        <div class="luna-wall__grid">
          <article v-for="(item, index) in wallPreviewMessages" :key="`luna-wall-${item.id}-${index}`" class="luna-wall-note">
            <header>
              <span>{{ wallGuestInitial(item.guestName) }}</span>
              <div>
                <strong>{{ item.guestName }}</strong>
                <time>{{ formatWallDate(item.postedAt) }}</time>
              </div>
            </header>
            <p>{{ wallMessageDisplayText(item.message, wallIsExpanded(item, index)) }}</p>
            <button v-if="wallMessageIsLong(item.message)" type="button" @click="toggleWallMessageExpanded(item, index)">
              {{ wallIsExpanded(item, index) ? 'Ver menos' : 'Ver más' }}
            </button>
          </article>
        </div>

        <button v-if="wallHasOverflow" type="button" class="luna-wall__view-all" @click="openWallArchive">
          Ver más comentarios
        </button>
      </div>
    </section>

    <section v-if="isSectionVisible('location')" class="luna-location luna-section" :style="sectionThemeStyle('location')">
      <div>
        <p class="luna-eyebrow">Ubicación</p>
        <h2>{{ data.location.name }}</h2>
        <p>{{ data.location.address }}</p>
      </div>
      <div class="luna-actions">
        <a :href="data.location.mapsUrl" target="_blank" rel="noopener noreferrer" @click="trackInteraction('maps_click')">Ver mapa</a>
        <a v-if="data.location.uberEnabled && data.location.uberUrl" :href="data.location.uberUrl" target="_blank" rel="noopener noreferrer" @click="trackInteraction('uber_click')">Pedir viaje</a>
      </div>
    </section>

    <section class="luna-details luna-section">
      <article v-if="isSectionVisible('dressCode') && data.dressCode?.enabled" :style="sectionThemeStyle('dressCode')">
        <p class="luna-eyebrow">{{ data.dressCode.title || 'Dress code' }}</p>
        <p>{{ data.dressCode.description }}</p>
      </article>
      <article v-if="isSectionVisible('saveDate') && data.saveDate?.enabled" :style="sectionThemeStyle('saveDate')">
        <p class="luna-eyebrow">Agenda</p>
        <a v-if="saveDateUrl && !editable" :href="saveDateUrl" target="_blank" rel="noopener noreferrer" @click="trackInteraction('save_date_click')">{{ data.saveDate.label || 'Guardar fecha' }}</a>
        <span v-else>{{ data.saveDate.label || 'Guardar fecha' }}</span>
      </article>
    </section>

    <section v-if="isSectionVisible('faq') && faqItems.length" ref="faqSectionRef" class="luna-faq luna-section" :style="sectionThemeStyle('faq')">
      <p class="luna-eyebrow">Preguntas</p>
      <details v-for="item in faqItems" :key="item.id" @toggle="onFaqToggle">
        <summary>{{ item.question }}</summary>
        <p>{{ item.answer }}</p>
      </details>
    </section>

    <section v-if="isSectionVisible('rsvp') && data.rsvp?.enabled" class="luna-rsvp luna-section" :style="sectionThemeStyle('rsvp')">
      <div>
        <p class="luna-eyebrow">Confirmación</p>
        <h2>¿Nos acompañas?</h2>
      </div>
      <form @submit.prevent="handleRsvp">
        <input v-model="rsvpFirstName" type="text" :placeholder="rsvpLabels.firstName" :disabled="editable || demoMode || rsvpSubmitting" />
        <input v-model="rsvpLastName" type="text" :placeholder="rsvpLabels.lastName" :disabled="editable || demoMode || rsvpSubmitting" />
        <textarea v-model="rsvpDietaryRestrictions" rows="2" :placeholder="rsvpLabels.dietaryRestrictions" :disabled="editable || demoMode || rsvpSubmitting"></textarea>
        <div v-if="rsvpWhatsappEnabled" class="luna-rsvp-phone">
          <PhoneCountrySelect
            :model-value="rsvpWhatsappCountry"
            :options="phoneCountryOptions"
            :disabled="editable || demoMode || rsvpSubmitting"
            @update:model-value="updateRsvpWhatsappCountry" />
          <input
            :value="rsvpWhatsapp"
            type="text"
            inputmode="numeric"
            autocomplete="tel-national"
            :maxlength="rsvpWhatsappMaxLength"
            :placeholder="rsvpLabels.whatsapp"
            :disabled="editable || demoMode || rsvpSubmitting"
            @input="updateRsvpWhatsapp" />
        </div>
        <input v-if="rsvpCompanionsEnabled" v-model.number="rsvpCompanionsCount" type="number" min="0" max="20" :placeholder="rsvpLabels.companions" :disabled="editable || demoMode || rsvpSubmitting" />
        <div v-if="rsvpNeedsFaqReview" class="luna-rsvp__faq-gate">
          <p>{{ rsvpGateHint }}</p>
          <button type="button" @click="goToFaqBeforeRsvp">Leer preguntas importantes</button>
        </div>
        <p v-else class="luna-rsvp__hint">{{ rsvpGateHint }}</p>
        <button v-if="!isEditing('rsvp_label')" type="submit" class="editable" :disabled="(!editable && !demoMode && !rsvpCanSubmit) || rsvpSubmitting" @dblclick="startEdit('rsvp_label')">
          {{ rsvpSubmitting ? 'Enviando...' : rsvpLabel }}
        </button>
        <input v-else class="inline-input" :value="rsvpLabel" autofocus @input="updateText('rsvp_label', $event)" @blur="finishEdit" @keydown.enter.prevent="finishEdit" />
        <p v-if="rsvpSuccessMessage && !editable" class="luna-rsvp__success">{{ rsvpSuccessMessage }}</p>
      </form>
    </section>

    <footer v-if="data.branding?.visible" class="luna-branding">{{ data.branding.label }}</footer>

    <audio ref="audioRef" preload="auto" loop playsinline></audio>

    <div v-if="wallCloudMessagesEnabled" class="luna-wall-cloud-layer" aria-hidden="true">
      <article
        v-for="cloud in wallClouds"
        :key="cloud.key"
        class="luna-wall-cloud"
        :class="`luna-wall-cloud--${cloud.side}`"
        :style="{ top: `${cloud.top}px` }"
      >
        <strong>{{ cloud.guestName }}</strong>
        <p>{{ wallMessageDisplayText(cloud.message, false) }}</p>
      </article>
    </div>

    <button
      v-if="isSectionVisible('music')"
      type="button"
      class="luna-music-fab"
      :class="{ active: !musicMuted, 'luna-music-fab--embedded': usesEmbeddedOverlay }"
      :aria-label="musicMuted ? 'Activar música' : 'Silenciar música'"
      @click="toggleMusic"
    >
      <span class="luna-music-wave" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>{{ musicMuted ? 'Activar música' : 'Silenciar música' }}</span>
    </button>

    <button
      v-if="djSongRequestsEnabled"
      type="button"
      class="luna-dj-song-fab"
      :class="{ 'luna-dj-song-fab--with-music': isSectionVisible('music'), 'luna-dj-song-fab--embedded': usesEmbeddedOverlay }"
      @click="openDjSongModal"
    >
      {{ djSongConfig.buttonLabel }}
    </button>

    <button
      v-if="giftOptionsEnabled"
      type="button"
      class="luna-gift-fab"
      :class="{ 'luna-gift-fab--stacked': djSongRequestsEnabled || isSectionVisible('music'), 'luna-gift-fab--embedded': usesEmbeddedOverlay }"
      @click="openGiftOptionsModal"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 12v8H4v-8" />
        <path d="M2 7h20v5H2z" />
        <path d="M12 7v13" />
        <path d="M12 7H8.5a2 2 0 1 1 0-4C11 3 12 7 12 7Z" />
        <path d="M12 7h3.5a2 2 0 1 0 0-4C13 3 12 7 12 7Z" />
      </svg>
      {{ giftOptionsConfig.buttonLabel }}
    </button>

    <div
      v-if="(checkinOverlayVisible || (editable && checkinPreview)) && isSectionVisible('checkin')"
      class="luna-checkin"
      :class="{ 'luna-checkin--embedded': usesEmbeddedOverlay }"
      :style="sectionThemeStyle('checkin')"
    >
      <div class="luna-checkin__panel">
        <p class="luna-eyebrow">{{ data.checkin?.eyebrow || 'Bienvenida' }}</p>
        <h2>{{ data.checkin?.title || 'Gracias por estar cerca' }}</h2>
        <p>{{ data.checkin?.message || 'Tu experiencia comienza aquí.' }}</p>
        <p v-if="checkinEventDateText" class="luna-checkin__meta">
          Te esperamos el <span>{{ checkinEventDateText }}</span>
        </p>
        <p v-if="checkinEntryText" class="luna-checkin__meta">{{ checkinEntryText }}</p>
        <button type="button" @click="editable ? closeEditorCheckin() : openCheckin()">{{ data.checkin?.buttonLabel || 'Entrar' }}</button>
      </div>
    </div>

    <div
      v-if="galleryLightboxOpen && activeGalleryItem"
      class="luna-lightbox"
      :class="{ 'luna-lightbox--embedded': usesEmbeddedOverlay }"
      @click.self="closeGalleryLightbox"
    >
      <div class="luna-lightbox__panel">
        <header class="luna-lightbox__head">
          <p>Galería · {{ normalizedGalleryLightboxIndex + 1 }}/{{ galleryItems.length }}</p>
          <button type="button" aria-label="Salir de galería" title="Salir" @click="closeGalleryLightbox">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div class="luna-lightbox__stage">
          <button v-if="galleryHasMultipleItems" type="button" class="luna-lightbox__nav luna-lightbox__nav--prev" aria-label="Imagen anterior" @click="goToPreviousLightboxSlide">
            ‹
          </button>
          <figure>
            <img :src="resolveGalleryLightboxUrl(activeGalleryItem)" :alt="activeGalleryItem.alt || 'Foto de la pareja'" />
          </figure>
          <button v-if="galleryHasMultipleItems" type="button" class="luna-lightbox__nav luna-lightbox__nav--next" aria-label="Imagen siguiente" @click="goToNextLightboxSlide">
            ›
          </button>
        </div>
        <div v-if="galleryHasMultipleItems" class="luna-lightbox__thumbs" role="tablist" aria-label="Miniaturas en visor">
          <button
            v-for="(item, index) in galleryItems"
            :key="`luna-lightbox-${item.id || index}`"
            type="button"
            :class="{ 'is-active': index === normalizedGalleryLightboxIndex }"
            :aria-label="`Ver imagen ${index + 1}`"
            @click="selectLightboxSlide(index)"
          >
            <img :src="resolveGalleryDisplayUrl(item)" :alt="item.alt || 'Miniatura de galería'" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="djSongModalOpen"
      class="luna-wall-modal"
      :class="{ 'luna-wall-modal--embedded': usesEmbeddedOverlay }"
      @click.self="closeDjSongModal"
    >
      <div class="luna-wall-modal__panel luna-wall-modal__panel--dj-song">
        <header>
          <div>
            <p class="luna-eyebrow">Música</p>
            <h3>{{ djSongConfig.modalTitle }}</h3>
          </div>
          <button type="button" aria-label="Salir de sugerir canción" title="Salir" @click="closeDjSongModal">×</button>
        </header>
        <form class="luna-wall__form luna-dj-song__form" @submit.prevent="submitDjSongRequest">
          <input v-model="djSongName" type="text" maxlength="180" :placeholder="djSongConfig.songLabel" :disabled="props.editable || props.demoMode || djSongSubmitting" required />
          <input v-model="djSongReferenceUrl" type="url" maxlength="2048" placeholder="YouTube, Spotify u otro enlace" :disabled="props.editable || props.demoMode || djSongSubmitting" />
          <button type="submit" :disabled="!djSongCanSubmit">
            {{ djSongSubmitting ? 'Enviando...' : djSongConfig.submitLabel }}
          </button>
          <p v-if="djSongSuccessMessage" class="luna-dj-song__success">{{ djSongSuccessMessage }}</p>
        </form>
      </div>
    </div>

    <div
      v-if="giftOptionsModalOpen"
      class="luna-wall-modal"
      :class="{ 'luna-wall-modal--embedded': usesEmbeddedOverlay }"
      @click.self="closeGiftOptionsModal"
    >
      <div class="luna-wall-modal__panel luna-wall-modal__panel--gifts">
        <header>
          <div>
            <p class="luna-eyebrow">{{ giftOptionsConfig.title }}</p>
            <h3>{{ giftOptionsConfig.modalTitle }}</h3>
          </div>
          <button type="button" aria-label="Salir de opciones de regalos" title="Salir" @click="closeGiftOptionsModal">×</button>
        </header>
        <div class="luna-gifts">
          <p>{{ giftOptionsConfig.description }}</p>
          <article v-for="item in giftOptionsConfig.items" :key="item.id" class="luna-gift-item">
            <span>{{ item.category }}</span>
            <strong>{{ item.name }}</strong>
          </article>
          <p v-if="!giftOptionsConfig.items.length">{{ giftOptionsConfig.emptyLabel }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="rsvpConfirmationModalOpen"
      class="luna-wall-modal"
      :class="{ 'luna-wall-modal--embedded': usesEmbeddedOverlay }"
      @click.self="closeRsvpConfirmationModal"
    >
      <div class="luna-wall-modal__panel luna-wall-modal__panel--rsvp-confirm">
        <header>
          <div>
            <p class="luna-eyebrow">Confirmación</p>
            <h3>Antes de enviar</h3>
          </div>
          <button type="button" aria-label="Cerrar confirmación" @click="closeRsvpConfirmationModal">×</button>
        </header>

        <div class="luna-rsvp-confirm">
          <p>{{ rsvpPopupConfirmationMessage }}</p>
          <div class="luna-rsvp-confirm__actions">
            <button type="button" class="luna-rsvp-confirm__secondary" @click="closeRsvpConfirmationModal">
              Revisar
            </button>
            <button type="button" @click="confirmRsvpSubmission">
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="wallComposerOpen"
      class="luna-wall-modal"
      :class="{ 'luna-wall-modal--embedded': usesEmbeddedOverlay }"
      @click.self="closeWallComposer"
    >
      <div class="luna-wall-modal__panel">
        <header>
          <div>
            <p class="luna-eyebrow">{{ wallConfig.title }}</p>
            <h3>{{ wallConfig.addLabel }}</h3>
          </div>
          <button type="button" aria-label="Cerrar mensaje" @click="closeWallComposer">×</button>
        </header>

        <form class="luna-wall__form" @submit.prevent="submitWallMessage">
          <input v-model="wallGuestName" type="text" maxlength="120" placeholder="Tu nombre" />
          <textarea v-model="wallGuestMessage" rows="4" :maxlength="WALL_MESSAGE_MAX_LENGTH" placeholder="Escribe aquí tu mensaje"></textarea>
          <small>{{ wallGuestMessageLength }}/{{ WALL_MESSAGE_MAX_LENGTH }}</small>
          <button type="submit" :disabled="!wallCanSubmit">
            {{ wallSubmitting ? 'Publicando...' : 'Publicar mensaje' }}
          </button>
        </form>
      </div>
    </div>

    <div
      v-if="wallArchiveOpen"
      class="luna-wall-modal"
      :class="{ 'luna-wall-modal--embedded': usesEmbeddedOverlay }"
      @click.self="closeWallArchive"
    >
      <div class="luna-wall-modal__panel luna-wall-modal__panel--archive">
        <header>
          <div>
            <p class="luna-eyebrow">{{ wallConfig.title }}</p>
            <small>{{ wallArchiveCountLabel }}</small>
          </div>
          <button type="button" aria-label="Cerrar mural" @click="closeWallArchive">×</button>
        </header>

        <div class="luna-wall__grid luna-wall__grid--archive">
          <article v-for="(item, index) in wallMessages" :key="`luna-wall-archive-${item.id}-${index}`" class="luna-wall-note">
            <header>
              <span>{{ wallGuestInitial(item.guestName) }}</span>
              <div>
                <strong>{{ item.guestName }}</strong>
                <time>{{ formatWallDate(item.postedAt) }}</time>
              </div>
            </header>
            <p>{{ wallMessageDisplayText(item.message, wallIsExpanded(item, index)) }}</p>
            <button v-if="wallMessageIsLong(item.message)" type="button" @click="toggleWallMessageExpanded(item, index)">
              {{ wallIsExpanded(item, index) ? 'Ver menos' : 'Ver más' }}
            </button>
          </article>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.luna-template {
  --luna-ink: #241b17;
  --luna-paper: #fffaf2;
  --luna-bg: #fbf4ea;
  --luna-bg-accent: #eef0df;
  --luna-bg-paint: linear-gradient(180deg, #fbf4ea, #eef0df 52%, #f7e6da);
  --luna-moss: #3f5f55;
  --luna-clay: #b97865;
  --luna-gold: #ba965b;
  --luna-button-bg: var(--luna-moss);
  --luna-button-bg-paint: var(--luna-button-bg);
  --luna-button-text: #fffaf2;
  color: var(--luna-ink);
  position: relative;
  isolation: isolate;
  width: 100%;
  background:
    linear-gradient(90deg, rgba(63, 95, 85, 0.08) 1px, transparent 1px),
    var(--luna-bg-paint);
  background-size: 34px 34px, auto;
  font-family: var(--font-body, Inter, system-ui, sans-serif);
  min-height: 100vh;
  overflow-x: hidden;
  overflow-y: visible;
}

.luna-template *,
.luna-template *::before,
.luna-template *::after {
  box-sizing: border-box;
}

.luna-section,
.luna-hero {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  color: var(--section-text, var(--luna-ink));
}

.luna-hero {
  min-height: 92vh;
  display: grid;
  place-items: center;
  padding: 56px 0 34px;
}

.luna-hero__paper {
  width: min(820px, 100%);
  min-height: 620px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 24px;
  position: relative;
  padding: clamp(34px, 7vw, 76px);
  background: var(--section-surface, var(--luna-paper));
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 32%, transparent);
  box-shadow: 0 26px 70px rgba(45, 34, 27, 0.18);
  text-align: center;
}

.luna-hero__paper::before,
.luna-hero__paper::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.luna-hero__paper::before {
  inset: 18px;
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-gold)) 45%, transparent);
}

.luna-hero__paper::after {
  width: 180px;
  height: 180px;
  top: 34px;
  right: 38px;
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 28%, transparent);
  border-radius: 999px;
  box-shadow: inset 26px -10px 0 rgba(63, 95, 85, 0.08);
}

.luna-eyebrow {
  margin: 0;
  color: var(--section-accent, var(--luna-moss));
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1,
h2 {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: 0;
}

h1 {
  max-width: 10ch;
  margin-bottom: 0;
  font-size: clamp(3.2rem, 10vw, 8.5rem);
  overflow-wrap: anywhere;
}

h2 {
  margin-bottom: 14px;
  font-size: clamp(2.1rem, 5vw, 4.2rem);
}

.luna-hero__subtitle {
  max-width: 48ch;
  margin-bottom: 0;
  color: var(--section-muted, color-mix(in srgb, var(--luna-ink) 72%, transparent));
  font-size: clamp(1rem, 2vw, 1.22rem);
  line-height: 1.7;
}

.luna-couple {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--section-accent, var(--luna-clay));
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(1.7rem, 4vw, 3.4rem);
}

.luna-couple i {
  color: var(--section-accent, var(--luna-gold));
  font-style: italic;
}

.luna-event-card {
  display: grid;
  gap: 6px;
  min-width: min(100%, 420px);
  padding: 18px 22px;
  border-top: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 32%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 32%, transparent);
}

.luna-event-card p,
.luna-event-card small {
  margin: 0;
  color: var(--section-muted, color-mix(in srgb, var(--luna-ink) 68%, transparent));
}

.luna-event-card strong {
  color: var(--section-text, var(--luna-ink));
  font-size: 1.1rem;
}

.luna-section {
  padding: clamp(44px, 8vw, 96px) 0;
}

.luna-countdown,
.luna-story,
.luna-wall,
.luna-location,
.luna-rsvp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.82fr);
  gap: clamp(24px, 5vw, 72px);
  align-items: center;
}

.luna-countdown p,
.luna-story p,
.luna-wall p,
.luna-location p {
  color: var(--section-muted, color-mix(in srgb, var(--luna-ink) 72%, transparent));
  font-size: 1rem;
  line-height: 1.75;
}

.luna-countdown__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 32%, transparent);
  background: var(--section-surface, var(--luna-paper));
}

.luna-countdown__grid span {
  display: grid;
  gap: 6px;
  place-items: center;
  min-height: 142px;
  border-right: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 24%, transparent);
}

.luna-countdown__grid span:last-child {
  border-right: 0;
}

.luna-countdown__grid strong {
  color: var(--section-counter-text, var(--section-text, var(--luna-ink)));
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
}

.luna-countdown__grid small {
  color: var(--section-counter-text, var(--section-accent, var(--luna-moss)));
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.luna-story {
  align-items: start;
}

.luna-story__number {
  width: min(100%, 340px);
  color: color-mix(in srgb, var(--section-text, var(--luna-ink)) 24%, transparent);
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(8rem, 18vw, 15rem);
  line-height: 0.8;
}

.luna-gallery {
  display: grid;
  grid-template-columns: 1.1fr 0.82fr 0.82fr;
  grid-auto-rows: 240px;
  gap: 14px;
}

.luna-gallery figure {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  background: #e7dccf;
}

.luna-gallery button {
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.luna-gallery figure:first-child {
  grid-row: span 2;
}

.luna-gallery img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.luna-schedule__list {
  display: grid;
  gap: 12px;
}

.luna-schedule article {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: 20px 0;
  border-top: 1px solid rgba(63, 95, 85, 0.18);
}

.luna-schedule time {
  color: var(--luna-clay);
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.65rem;
}

.luna-schedule h3,
.luna-schedule p {
  margin-bottom: 4px;
}

.luna-location,
.luna-wall,
.luna-rsvp,
.luna-details article,
.luna-faq details {
  padding: clamp(22px, 4vw, 34px);
  background: var(--section-surface, var(--luna-paper));
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 28%, transparent);
  color: var(--section-text, var(--luna-ink));
}

.luna-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.luna-actions a,
.luna-details a,
.luna-details button,
.luna-wall button,
.luna-wall-modal .luna-wall__form button,
.luna-rsvp button,
.luna-checkin button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0;
  background: var(--section-button-bg, var(--luna-button-bg-paint));
  color: var(--section-button-text, var(--luna-button-text));
  padding: 0 18px;
  font: inherit;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.luna-wall {
  align-items: start;
}

.luna-wall__intro {
  display: grid;
  gap: 12px;
}

.luna-wall__intro h2 {
  margin-bottom: 0;
}

.luna-wall__intro p {
  margin-bottom: 0;
}

.luna-wall__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.luna-wall__meta span {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 26%, transparent);
  background: color-mix(in srgb, var(--section-surface, var(--luna-paper)) 72%, transparent);
  color: var(--section-accent, var(--luna-moss));
  padding: 0 12px;
  font-size: 0.82rem;
  font-weight: 900;
}

.luna-wall__meta button.is-disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.luna-wall__form {
  display: grid;
  gap: 10px;
}

.luna-wall__form input,
.luna-wall__form textarea {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 24%, transparent);
  background: color-mix(in srgb, var(--section-surface, var(--luna-paper)) 72%, white);
  color: var(--section-text, var(--luna-ink));
  padding: 12px 13px;
  font: inherit;
}

.luna-wall__form textarea {
  resize: vertical;
}

.luna-wall__form small {
  color: var(--section-muted, color-mix(in srgb, var(--section-text, var(--luna-ink)) 62%, transparent));
  font-size: 0.78rem;
  font-weight: 800;
  text-align: right;
}

.luna-dj-song__success {
  margin: 0;
  color: var(--luna-moss);
  font-size: 0.9rem;
  font-weight: 900;
}

.luna-wall__empty {
  margin: 0;
  padding: 18px;
  border: 1px dashed color-mix(in srgb, var(--section-accent, var(--luna-moss)) 30%, transparent);
  background: color-mix(in srgb, var(--section-surface, var(--luna-paper)) 66%, transparent);
}

.luna-wall__messages {
  display: grid;
  gap: 14px;
  align-self: start;
}

.luna-wall__grid {
  display: grid;
  gap: 14px;
}

.luna-wall__grid--archive {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.luna-wall__view-all {
  justify-self: start;
  margin-top: 4px;
}

.luna-wall-note {
  position: relative;
  display: grid;
  gap: 12px;
  box-sizing: border-box;
  min-width: 0;
  padding: 18px;
  background: var(--section-surface, var(--luna-paper));
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 24%, transparent);
  box-shadow: 0 16px 36px rgba(45, 34, 27, 0.12);
}

.luna-wall-note::before {
  content: "";
  position: absolute;
  top: 12px;
  right: 14px;
  width: 38px;
  height: 38px;
  border-top: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-gold)) 42%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-gold)) 42%, transparent);
}

.luna-wall-note header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.luna-wall-note header > span {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--section-accent, var(--luna-moss)) 14%, var(--section-surface, var(--luna-paper)));
  color: var(--section-accent, var(--luna-moss));
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.25rem;
  font-weight: 800;
}

.luna-wall-note strong,
.luna-wall-note time {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
  white-space: nowrap;
}

.luna-wall-note header > div {
  min-width: 0;
}

.luna-wall-note strong {
  color: var(--section-text, var(--luna-ink));
}

.luna-wall-note time {
  margin-top: 2px;
  color: var(--section-muted, color-mix(in srgb, var(--section-text, var(--luna-ink)) 58%, transparent));
  font-size: 0.74rem;
  font-weight: 800;
}

.luna-wall-note p {
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--section-muted, color-mix(in srgb, var(--section-text, var(--luna-ink)) 74%, transparent));
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;
}

.luna-wall-note button {
  justify-self: start;
  min-height: auto;
  border: 0;
  background: transparent;
  color: var(--section-accent, var(--luna-moss));
  padding: 0;
  font-size: 0.84rem;
  font-weight: 900;
}

.luna-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 14px;
}

.luna-details article {
  min-height: 170px;
}

.luna-faq {
  display: grid;
  gap: 12px;
}

.luna-faq summary {
  cursor: pointer;
  font-weight: 800;
}

.luna-rsvp form {
  display: grid;
  gap: 10px;
}

.luna-rsvp input,
.luna-rsvp select,
.luna-rsvp textarea,
.inline-input {
  width: 100%;
  border: 1px solid rgba(63, 95, 85, 0.24);
  background: rgba(255, 255, 255, 0.72);
  color: var(--luna-ink);
  padding: 12px 13px;
  font: inherit;
}

.luna-rsvp-phone {
  display: grid;
  grid-template-columns: minmax(92px, 104px) minmax(0, 1fr);
  gap: 8px;
  align-items: stretch;
}

.luna-rsvp-phone input {
  min-height: 44px;
}

.luna-rsvp-phone :deep(.phone-country-select__button) {
  min-height: 44px;
  border: 1px solid rgba(63, 95, 85, 0.24);
  border-radius: 0;
  background: rgba(255, 255, 255, 0.72);
  color: var(--section-text, var(--luna-ink));
  font-weight: 800;
  padding-inline: 9px;
}

.luna-rsvp__hint,
.luna-rsvp__faq-gate p {
  margin: 0;
  color: var(--section-muted, color-mix(in srgb, var(--section-text, var(--luna-ink)) 72%, transparent));
  font-size: 0.92rem;
  line-height: 1.55;
}

.luna-rsvp__faq-gate {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-moss)) 28%, transparent);
  background: color-mix(in srgb, var(--section-surface, var(--luna-paper)) 78%, transparent);
}

.inline-input--title {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.8rem;
  text-align: center;
}

.inline-input--area {
  resize: vertical;
}

.luna-rsvp__success {
  margin: 0;
  color: var(--luna-moss);
  font-weight: 800;
}

.luna-branding {
  padding: 22px;
  text-align: center;
  color: rgba(36, 27, 23, 0.55);
  font-size: 0.82rem;
}

.editable {
  outline-offset: 4px;
}

.editable:hover {
  outline: 1px dashed rgba(63, 95, 85, 0.45);
}

.luna-template--public .editable:hover {
  outline: 0;
}

.luna-checkin {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(36, 27, 23, 0.58);
}

.luna-checkin--embedded {
  position: absolute;
  z-index: 50;
  height: 100%;
  min-height: 100%;
  place-items: start center;
  padding-top: clamp(24px, 8%, 72px);
  overflow: auto;
}

.luna-checkin__panel {
  width: min(520px, 100%);
  max-height: calc(100% - 16px);
  overflow: auto;
  padding: clamp(30px, 6vw, 54px);
  background: var(--section-surface, var(--luna-paper));
  border: 1px solid color-mix(in srgb, var(--section-accent, var(--luna-gold)) 45%, transparent);
  color: var(--section-text, var(--luna-ink));
  text-align: center;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

.luna-checkin__meta {
  margin: 0 0 14px;
  color: var(--section-muted, color-mix(in srgb, var(--section-text, var(--luna-ink)) 72%, transparent));
  font-weight: 700;
  line-height: 1.5;
}

.luna-checkin__meta span {
  display: block;
}

.luna-music-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 18;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(36, 27, 23, 0.14);
  border-radius: 999px;
  background: var(--luna-paper);
  color: var(--luna-moss);
  padding: 0 16px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 900;
  box-shadow: 0 18px 42px rgba(45, 34, 27, 0.2);
  cursor: pointer;
}

.luna-music-fab.active {
  background: var(--luna-button-bg-paint);
  color: var(--luna-button-text);
}

.luna-dj-song-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 19;
  min-height: 46px;
  border: 1px solid rgba(36, 27, 23, 0.16);
  border-radius: 999px;
  background: var(--luna-button-bg-paint);
  color: var(--luna-button-text);
  padding: 0 17px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 900;
  box-shadow: 0 20px 44px rgba(45, 34, 27, 0.22);
  cursor: pointer;
}

.luna-dj-song-fab--with-music {
  bottom: 76px;
}

.luna-dj-song-fab--embedded {
  position: absolute;
}

.luna-gift-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 19;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--luna-moss) 24%, transparent);
  border-radius: 999px;
  background: var(--luna-paper);
  color: var(--luna-moss);
  padding: 0 17px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 900;
  box-shadow: 0 20px 44px rgba(45, 34, 27, 0.18);
  cursor: pointer;
}

.luna-gift-fab--stacked {
  bottom: 132px;
}

.luna-gift-fab--embedded {
  position: absolute;
}

.luna-gift-fab svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.luna-music-wave {
  width: 22px;
  height: 18px;
  display: inline-flex;
  align-items: end;
  justify-content: center;
  gap: 3px;
}

.luna-music-wave i {
  width: 4px;
  height: 8px;
  display: block;
  border-radius: 999px;
  background: currentColor;
  animation: luna-music-wave 1.1s ease-in-out infinite;
}

.luna-music-wave i:nth-child(2) {
  height: 15px;
  animation-delay: 0.16s;
}

.luna-music-wave i:nth-child(3) {
  height: 11px;
  animation-delay: 0.32s;
}

.luna-music-fab:not(.active) .luna-music-wave i {
  animation-play-state: paused;
}

.luna-lightbox {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(22, 18, 16, 0.84);
}

.luna-lightbox--embedded {
  position: absolute;
}

.luna-lightbox__panel {
  width: min(980px, 100%);
  max-height: min(92dvh, 860px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px;
  background: var(--luna-paper);
  border: 1px solid rgba(186, 150, 91, 0.35);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.38);
}

.luna-lightbox__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.luna-lightbox__head p {
  margin: 0;
  color: var(--luna-moss);
  font-weight: 900;
}

.luna-lightbox__head button,
.luna-lightbox__nav,
.luna-lightbox__thumbs button {
  border: 0;
  cursor: pointer;
}

.luna-lightbox__head button {
  width: 38px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(63, 95, 85, 0.1);
  color: var(--luna-ink);
  font-size: 1.55rem;
  line-height: 1;
}

.luna-lightbox__stage {
  position: relative;
  min-height: 0;
  display: grid;
  place-items: center;
  background: #1f1712;
  overflow: hidden;
}

.luna-lightbox__stage figure {
  width: 100%;
  height: min(68dvh, 620px);
  margin: 0;
}

.luna-lightbox__stage img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.luna-lightbox__nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  transform: translateY(-50%);
  border-radius: 999px;
  background: rgba(255, 250, 242, 0.9);
  color: var(--luna-ink);
  font-size: 2rem;
  line-height: 1;
}

.luna-lightbox__nav--prev {
  left: 14px;
}

.luna-lightbox__nav--next {
  right: 14px;
}

.luna-lightbox__thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.luna-lightbox__thumbs button {
  width: 74px;
  height: 58px;
  flex: 0 0 auto;
  padding: 0;
  background: #e7dccf;
  opacity: 0.72;
}

.luna-lightbox__thumbs button.is-active {
  outline: 3px solid var(--luna-moss);
  opacity: 1;
}

.luna-lightbox__thumbs img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.luna-wall-modal {
  position: fixed;
  inset: 0;
  z-index: 62;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(36, 27, 23, 0.52);
  backdrop-filter: blur(5px);
}

.luna-wall-modal--embedded {
  position: absolute;
}

.luna-wall-modal__panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(560px, 100%);
  max-height: min(88dvh, 820px);
  overflow: hidden;
  padding: clamp(22px, 4vw, 34px);
  background: var(--luna-paper);
  border: 1px solid color-mix(in srgb, var(--luna-gold) 42%, transparent);
  color: var(--luna-ink);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.32);
}

.luna-wall-modal__panel--archive {
  width: min(920px, 100%);
}

.luna-wall-modal__panel--dj-song {
  width: min(460px, 100%);
}

.luna-wall-modal__panel--gifts {
  width: min(560px, 100%);
}

.luna-wall-modal__panel--rsvp-confirm {
  width: min(460px, 100%);
}

.luna-wall-modal__panel > :not(header) {
  min-height: 0;
  overflow: auto;
}

.luna-gifts {
  display: grid;
  gap: 12px;
}

.luna-gifts p {
  margin: 0;
}

.luna-gift-item {
  display: grid;
  gap: 5px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--luna-clay) 30%, transparent);
  background: color-mix(in srgb, var(--luna-bg) 64%, var(--luna-paper));
}

.luna-gift-item span {
  color: var(--luna-clay);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.luna-gift-item strong {
  color: var(--luna-ink);
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.35rem;
  line-height: 1.05;
}

.luna-wall-modal__panel header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  min-height: 0;
}

.luna-wall-modal__panel h3 {
  margin: 4px 0 0;
  color: var(--luna-ink);
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(1.7rem, 4vw, 2.4rem);
  line-height: 1;
}

.luna-wall-modal__panel small {
  display: block;
  margin-top: 6px;
  color: color-mix(in srgb, var(--luna-ink) 62%, transparent);
  font-weight: 800;
}

.luna-wall-modal__panel header button {
  width: 38px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--luna-moss) 10%, transparent);
  color: var(--luna-ink);
  font-size: 1.5rem;
  cursor: pointer;
}

.luna-rsvp-confirm {
  display: grid;
  gap: 18px;
}

.luna-rsvp-confirm p {
  margin: 0;
  color: var(--luna-ink);
  font-size: 0.98rem;
  line-height: 1.58;
}

.luna-rsvp-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.luna-rsvp-confirm__actions button {
  border: 0;
  background: var(--luna-ink);
  color: var(--luna-paper);
  font-weight: 900;
  padding: 12px 18px;
  cursor: pointer;
}

.luna-rsvp-confirm__actions .luna-rsvp-confirm__secondary {
  border: 1px solid color-mix(in srgb, var(--luna-clay) 34%, transparent);
  background: transparent;
  color: var(--luna-ink);
}

.luna-wall-cloud-layer {
  position: fixed;
  inset: 0;
  z-index: 16;
  pointer-events: none;
  overflow: hidden;
}

.luna-wall-cloud {
  position: absolute;
  box-sizing: border-box;
  width: min(300px, calc(100vw - 36px));
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--luna-cloud-accent) 24%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--luna-cloud-accent) 7%, transparent), transparent 56%),
    var(--luna-cloud-surface);
  color: var(--luna-cloud-text);
  box-shadow:
    0 24px 58px rgba(45, 34, 27, 0.14),
    inset 0 0 0 1px color-mix(in srgb, var(--luna-cloud-text) 6%, transparent);
  animation: luna-wall-cloud-rise 4.6s ease-out forwards;
}

.luna-wall-cloud::before,
.luna-wall-cloud::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--luna-cloud-accent) 5%, transparent), transparent 60%),
    var(--luna-cloud-surface);
  border: inherit;
  z-index: -1;
}

.luna-wall-cloud::before {
  width: 54px;
  height: 54px;
  left: 20px;
  top: -24px;
}

.luna-wall-cloud::after {
  width: 74px;
  height: 74px;
  right: 18px;
  top: -34px;
}

.luna-wall-cloud--left {
  left: clamp(12px, 4vw, 58px);
  border-radius: 30px 34px 36px 24px;
}

.luna-wall-cloud--right {
  right: clamp(12px, 4vw, 58px);
  border-radius: 34px 28px 24px 36px;
}

.luna-wall-cloud strong {
  display: block;
  margin-bottom: 0.28rem;
  max-width: 100%;
  overflow: hidden;
  color: var(--luna-cloud-accent);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
  white-space: nowrap;
}

.luna-wall-cloud p {
  display: -webkit-box;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: var(--luna-cloud-text);
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

@keyframes luna-wall-cloud-rise {
  0% {
    opacity: 0;
    transform: translate3d(0, 30px, 0) scale(0.96);
    filter: blur(4px);
  }

  16% {
    opacity: 1;
    filter: blur(0);
  }

  70% {
    opacity: 1;
    transform: translate3d(0, calc(-50vh + 30px), 0) scale(1);
    filter: blur(0);
  }

  100% {
    opacity: 0;
    transform: translate3d(0, -62vh, 0) scale(1.03);
    filter: blur(7px);
  }
}

@keyframes luna-music-wave {
  0%,
  100% {
    transform: scaleY(0.62);
  }

  50% {
    transform: scaleY(1);
  }
}

.luna-template--compact-buttons button,
.luna-template--compact-buttons a {
  font-size: 16px;
}

.luna-template--preview-tablet .luna-countdown,
.luna-template--preview-tablet .luna-story,
.luna-template--preview-tablet .luna-wall,
.luna-template--preview-tablet .luna-location,
.luna-template--preview-tablet .luna-rsvp,
.luna-template--preview-mobile .luna-countdown,
.luna-template--preview-mobile .luna-story,
.luna-template--preview-mobile .luna-wall,
.luna-template--preview-mobile .luna-location,
.luna-template--preview-mobile .luna-rsvp {
  grid-template-columns: 1fr;
}

.luna-template--preview-tablet .luna-gallery {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.luna-template--preview-tablet .luna-gallery figure:first-child {
  grid-row: span 1;
}

.luna-template--preview-mobile .luna-gallery {
  grid-template-columns: 1fr;
  grid-auto-rows: 300px;
}

.luna-template--preview-mobile .luna-gallery figure:first-child {
  grid-row: span 1;
}

.luna-template--preview-tablet .luna-details,
.luna-template--preview-mobile .luna-details {
  grid-template-columns: 1fr;
}

.luna-template--preview-mobile .luna-wall__grid--archive {
  grid-template-columns: 1fr;
}

.luna-template--preview-mobile .luna-hero {
  min-height: auto;
  padding: 18px 0 24px;
}

.luna-template--preview-mobile .luna-hero__paper {
  min-height: min(620px, calc(100dvh - 36px));
  gap: 16px;
  padding: 28px 18px;
}

.luna-template--preview-mobile .luna-hero__paper::before {
  inset: 10px;
}

.luna-template--preview-mobile .luna-hero__paper::after {
  width: 118px;
  height: 118px;
  top: 22px;
  right: 22px;
}

.luna-template--preview-mobile h1 {
  max-width: 9ch;
  font-size: clamp(2.7rem, 16vw, 4rem);
}

.luna-template--preview-mobile h2 {
  font-size: clamp(1.85rem, 10vw, 2.8rem);
}

.luna-template--preview-mobile .luna-couple {
  display: grid;
  gap: 8px;
  font-size: clamp(1.55rem, 8vw, 2.2rem);
}

.luna-template--preview-mobile .luna-countdown__grid {
  grid-template-columns: 1fr;
}

.luna-template--preview-mobile .luna-countdown__grid span {
  min-height: 104px;
  border-right: 0;
  border-bottom: 1px solid rgba(63, 95, 85, 0.18);
}

.luna-template--preview-mobile .luna-countdown__grid span:last-child {
  border-bottom: 0;
}

.luna-template--preview-mobile .luna-schedule article {
  grid-template-columns: 1fr;
}

.luna-template--preview-mobile .luna-checkin {
  padding: 12px;
}

.luna-template--preview-mobile .luna-checkin__panel {
  padding: 26px 18px;
}

@media (max-width: 900px) {
  .luna-countdown,
  .luna-story,
  .luna-wall,
  .luna-location,
  .luna-rsvp {
    grid-template-columns: 1fr;
  }

  .luna-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .luna-gallery figure:first-child {
    grid-row: span 1;
  }

  .luna-details {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .luna-section,
  .luna-hero {
    width: min(100% - 20px, 1120px);
  }

  .luna-hero {
    min-height: auto;
    padding: 20px 0 24px;
  }

  .luna-hero__paper {
    min-height: min(660px, calc(100dvh - 40px));
    gap: 16px;
    padding: 30px 20px;
  }

  .luna-hero__paper::before {
    inset: 10px;
  }

  .luna-hero__paper::after {
    width: 118px;
    height: 118px;
    top: 22px;
    right: 22px;
  }

  h1 {
    max-width: 9ch;
    font-size: clamp(2.7rem, 16vw, 4rem);
  }

  h2 {
    font-size: clamp(1.85rem, 10vw, 2.8rem);
  }

  .luna-couple {
    display: grid;
    gap: 8px;
    font-size: clamp(1.55rem, 8vw, 2.2rem);
  }

  .luna-countdown__grid {
    grid-template-columns: 1fr;
  }

  .luna-countdown__grid span {
    border-right: 0;
    border-bottom: 1px solid rgba(63, 95, 85, 0.18);
  }

  .luna-gallery {
    grid-template-columns: 1fr;
    grid-auto-rows: 300px;
  }

  .luna-wall__grid--archive {
    grid-template-columns: 1fr;
  }

  .luna-dj-song-fab {
    right: 12px;
    bottom: 12px;
    max-width: calc(100% - 24px);
  }

  .luna-dj-song-fab--with-music {
    bottom: 72px;
  }

  .luna-schedule article {
    grid-template-columns: 1fr;
  }

}
</style>

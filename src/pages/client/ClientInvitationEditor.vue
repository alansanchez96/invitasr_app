<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import CanvaColorStudio from '@/components/invitation-editor/CanvaColorStudio.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  useInvitationEditorViewport,
  type InvitationEditorResponsiveDevice as ResponsiveDevice,
} from '@/composables/invitation-editor/useInvitationEditorViewport'
import {
  useInvitationEditorGallery,
  type PendingGallerySnapshotItem,
} from '@/composables/invitation-editor/useInvitationEditorGallery'
import { useInvitationEditorWallPreview } from '@/composables/invitation-editor/useInvitationEditorWallPreview'
import { useInvitationEditorHistory } from '@/composables/invitation-editor/useInvitationEditorHistory'
import { useInvitationEditorWall } from '@/composables/invitation-editor/useInvitationEditorWall'
import {
  useInvitationEditorPersistence,
  useInvitationEditorSaveWorkflow,
} from '@/composables/invitation-editor/useInvitationEditorPersistence'
import { useInvitationEditorTemplateCapabilities } from '@/composables/invitation-editor/useInvitationEditorTemplateCapabilities'
import { listCatalogTemplates, type CatalogTemplateItem } from '@/services/catalogs'
import {
  checkTenantInvitationSubdomainAvailability,
  getTenantInvitation,
  publishTenantInvitation,
  resolveTenantInvitationLocation,
  updateTenantInvitation,
  uploadTenantInvitationMusicTrack,
  type TenantInvitationItem,
  type TenantTemplateSummary,
  type TenantTypeEventSummary,
} from '@/services/tenantInvitations'
import { useSessionStore } from '@/stores/session'
import { loadTemplateModule, loadTemplateModuleByRendererKey } from '@/templates/registry'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'
import { notifyError, notifySuccess } from '@/utils/toast'

type JsonRecord = Record<string, unknown>
type TextOverridesMap = Record<string, string>

type EditorSection = {
  key: string
  label: string
  optional: boolean
  featureKey?: string
}

type ConfigBarItem = {
  key: string
  label: string
  target: string
  icon: string
}

type EditableFieldBinding = {
  paths: string[]
  fallback: string
}

type MusicOption = {
  id: string
  label: string
  title: string
  artist: string
  audioUrl: string
}

type DressCodeOption = {
  code: string
  label: string
  title: string
  description: string
}

type CurrencyOption = {
  code: string
  label: string
}

type ThemeColorField = {
  key: string
  label: string
  description?: string
  path: string
  gradientPath: string
  fallback: string
  sectionKey?: string
  supportsGradient?: boolean
}

type ThemeGradientType = 'linear' | 'radial' | 'conic'

type ThemeGradientConfig = {
  enabled: boolean
  type: ThemeGradientType
  angle: number
  colors: string[]
}

type EditorSnapshot = {
  title: string
  slug: string
  selectedTemplateId: string
  content: JsonRecord
  textOverrides: TextOverridesMap
  settings: JsonRecord
  featureOverrides: JsonRecord
  sectionVisibility: Record<string, boolean>
  activeTextField: string | null
  showCheckinPreview: boolean
  isCheckinConfigEditing: boolean
  pendingGallerySignature: string[]
  pendingGalleryItems: PendingGallerySnapshotItem[]
  removedGalleryImageIds: number[]
  pendingDeleteWallMessageIds: number[]
  pendingWallMessageVisibilityById: Record<number, boolean>
}

type DraftLocationItem = {
  name: string
  address: string
  mapsUrl: string
  mapsCanonicalUrl: string
  mapsSourceUrl: string
  placeId: string
  formattedAddress: string
  latitude: number | null
  longitude: number | null
  uberEnabled: boolean
  uberUrl: string
}

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const invitation = ref<TenantInvitationItem | null>(null)
const template = ref<TenantTemplateSummary | null>(null)
const typeEvent = ref<TenantTypeEventSummary | null>(null)
const templateModule = ref<InvitationTemplateModule<'wedding'> | null>(null)
const availableTemplates = ref<CatalogTemplateItem[]>([])

const title = ref('')
const slug = ref('')
const selectedTemplateId = ref('')
const contentDraft = ref<JsonRecord>({})
const textOverridesDraft = ref<TextOverridesMap>({})
const settingsDraft = ref<JsonRecord>({})
const featureOverridesDraft = ref<JsonRecord>({})
const sectionVisibilityDraft = ref<Record<string, boolean>>({})
const activeTextField = ref<string | null>(null)
const {
  previewDevice,
  previewZoomPercent,
  effectivePreviewDevice,
  effectivePreviewDeviceLabel,
  isZoomShiftingViewport,
  previewZoomLabel,
  previewViewportClass,
  previewFrameStyle,
  deviceOptions,
  zoomMinPercent: ZOOM_MIN_PERCENT,
  zoomMaxPercent: ZOOM_MAX_PERCENT,
  zoomStepPercent: ZOOM_STEP_PERCENT,
  adjustPreviewZoom,
  resetPreviewZoom,
  handleZoomInput,
  selectPreviewDevice,
  handlePreviewWheelZoom,
} = useInvitationEditorViewport()
const showCheckinPreview = ref(false)
const isCheckinConfigEditing = ref(false)
const isSidebarOpen = ref(false)
const isConfigBarCollapsed = ref(false)
const activeConfigTarget = ref('config-content')
const hoveredConfigTooltip = ref<{ label: string; left: number } | null>(null)
const configBarScrollRef = ref<HTMLElement | null>(null)
const activeThemeColorFieldKey = ref<string | null>(null)
const expandedSectionColorPanels = ref<Record<string, boolean>>({})

const isLoading = ref(false)
const isLoadingTemplates = ref(false)
const loadError = ref<string | null>(null)
const editorValidationError = ref<string | null>(null)
const slugInputError = ref<string | null>(null)
const slugAvailabilityState = ref<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'>('idle')
const slugAvailabilityReason = ref<string | null>(null)
const isHydratingSnapshot = ref(true)
const isApplyingUndo = ref(false)
const skipNextLeaveConfirm = ref(false)
const showLeavePrompt = ref(false)
const pendingNavigationPath = ref<string | null>(null)
const showHelpModal = ref(false)
const showDeleteWallPrompt = ref(false)
const pendingDeleteWallMessageId = ref<number | null>(null)
const pendingDeleteWallMessageGuestName = ref('')
const pendingDeleteWallMessageText = ref('')
const isImmersivePreviewOpen = ref(false)
const wallEditorExpandedMessageIds = ref<Record<number, boolean>>({})
const {
  wallEditorMessageIsLong,
  wallEditorMessageExpanded,
  wallEditorDisplayText,
  toggleWallEditorMessageExpanded,
} = useInvitationEditorWallPreview(wallEditorExpandedMessageIds)
const galleryInputRef = ref<HTMLInputElement | null>(null)
const musicInputRef = ref<HTMLInputElement | null>(null)
const isUploadingMusic = ref(false)
let slugAvailabilityTimer: ReturnType<typeof setTimeout> | null = null
let slugAvailabilityCheckId = 0

const invitationId = computed(() => Number(route.params.invitationId))
const invitationRecordId = computed(() => invitation.value?.id ?? null)
const isDraft = computed(() => String(invitation.value?.status ?? '').toLowerCase() === 'draft')
const canUploadCustomMusic = computed(() => {
  const planName = String(session.user?.client_plan?.plan?.name ?? '').trim().toLowerCase()
  return planName === 'pro' || planName === 'planner'
})
const {
  isLoadingGallery,
  isUploadingGallery,
  gallerySummary,
  galleryImages,
  pendingGalleryImages,
  removedGalleryImageIds,
  activeGalleryImages,
  hasPendingGalleryChanges,
  galleryRemainingSlots,
  canAddGalleryImages,
  galleryCounterLabel,
  galleryVisualItems,
  galleryProcessingHint,
  resolveGalleryVariantUrl,
  getGalleryItemStatusTitle,
  clonePendingGallerySnapshotItems,
  toPendingGallerySnapshotItems,
  hydratePendingGalleryImages,
  replacePendingGalleryImages,
  clearGalleryPendingChanges,
  restoreAllRemovedGalleryImages,
  removeGalleryVisualItem,
  loadGalleryData,
  persistPendingGalleryImages,
  queueGalleryFiles,
  liveGalleryItems,
} = useInvitationEditorGallery({
  invitationId: invitationRecordId,
  notifyError,
})
const {
  isLoadingWallMessages,
  wallMessages,
  wallSummary,
  updatingWallMessageIds,
  pendingDeleteWallMessageIds,
  pendingWallMessageVisibilityById,
  wallMessagesInEditor,
  wallUsedCountInEditor,
  wallVisibleCountInEditor,
  hasPendingWallMessageDeletes,
  hasPendingWallMessageVisibilityChanges,
  syncWallSummaryWithEditorState,
  syncWallMessagesIntoContent,
  setPendingDeleteWallMessageIds,
  setPendingWallMessageVisibilityById,
  loadWallMessagesData,
  updateWallMessageVisibility,
  queueDeleteWallMessage: queueDeleteWallMessageById,
  persistPendingWallMessageDeletes,
  persistPendingWallMessageVisibilityChanges,
} = useInvitationEditorWall({
  invitationId: invitationRecordId,
  contentDraft,
  notifyError,
  toRecord: (value) => toRecord(value),
  cloneRecord: (value) => cloneRecord(value),
  getByPath: (source, path) => getByPath(source, path),
  setByPath: (source, path, value) => setByPath(source, path, value),
  asText: (value, fallback = '') => asText(value, fallback),
})
const isDeletingPendingWallMessage = computed(() => {
  const messageId = pendingDeleteWallMessageId.value
  if (!messageId) return false
  return updatingWallMessageIds.value.includes(messageId)
})

const { supportsInlineEditor } = useInvitationEditorTemplateCapabilities(templateModule, template)

const musicOptions: MusicOption[] = [
  {
    id: 'song_1',
    label: 'Canción base',
    title: 'Can’t Help Falling in Love',
    artist: 'Elvis Presley',
    audioUrl: '',
  },
  {
    id: 'song_2',
    label: 'Canción romántica',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    audioUrl: '',
  },
  {
    id: 'song_3',
    label: 'Canción 3 (próximamente)',
    title: 'Próximamente',
    artist: 'InvitaSR',
    audioUrl: '',
  },
]

const dressCodeOptions: DressCodeOption[] = [
  {
    code: 'elegant_sport',
    label: 'Elegante sport',
    title: 'Dress code',
    description: 'Elegante sport en tonos claros.',
  },
  {
    code: 'formal_black_tie',
    label: 'Formal Black Tie',
    title: 'Vestimenta formal',
    description: 'Traje oscuro y vestido largo. Se sugiere etiqueta de gala.',
  },
  {
    code: 'semi_formal',
    label: 'Semi formal',
    title: 'Semi formal',
    description: 'Look prolijo y elegante, sin llegar a etiqueta completa.',
  },
  {
    code: 'cocktail',
    label: 'Cóctel',
    title: 'Estilo cóctel',
    description: 'Vestido corto o midi y traje liviano. Chic y cómodo.',
  },
  {
    code: 'casual_chic',
    label: 'Casual chic',
    title: 'Casual chic',
    description: 'Estilo relajado y cuidado. Evita ropa deportiva.',
  },
  {
    code: 'boho',
    label: 'Boho',
    title: 'Boho',
    description: 'Tonos naturales y telas livianas con estilo bohemio.',
  },
  {
    code: 'beach_white',
    label: 'Playa en blanco',
    title: 'Playa en blanco',
    description: 'Outfit fresco en tonos blancos o arena.',
  },
  {
    code: 'country_chic',
    label: 'Campo chic',
    title: 'Campo chic',
    description: 'Ropa elegante y cómoda para exterior, ideal para jardín/campo.',
  },
  {
    code: 'gala',
    label: 'Gala',
    title: 'Gala',
    description: 'Etiqueta máxima para una noche especial.',
  },
  {
    code: 'thematic',
    label: 'Temático',
    title: 'Temática especial',
    description: 'Sigue la temática del evento indicada por los anfitriones.',
  },
]

const checkinCurrencyOptions: CurrencyOption[] = [
  { code: 'USD', label: 'USD · Dólar estadounidense' },
  { code: 'ARS', label: 'ARS · Peso argentino' },
  { code: 'EUR', label: 'EUR · Euro' },
  { code: 'BRL', label: 'BRL · Real brasileño' },
  { code: 'CLP', label: 'CLP · Peso chileno' },
  { code: 'MXN', label: 'MXN · Peso mexicano' },
]

const MAX_LOCATIONS_PER_INVITATION = 2
const DEFAULT_LOCATION_MAPS_URL = 'https://maps.google.com/?q=Estancia+Nevada+Bariloche'
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/
const MAX_THEME_GRADIENT_COLORS = 5

const themePresetColors = [
  '#7A4FD9',
  '#F06AA6',
  '#1D0F2F',
  '#FFFFFF',
  '#F6F7FB',
  '#EEF2FF',
  '#E0F2FE',
  '#DCFCE7',
  '#FEF3C7',
  '#FFE4E6',
  '#C4B5FD',
  '#111827',
]

const themeGradientTypeOptions: Array<{ value: ThemeGradientType; label: string }> = [
  { value: 'linear', label: 'Lineal' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Circular' },
]

const globalThemeColorFields: ThemeColorField[] = [
  {
    key: 'background',
    label: 'Fondo de la invitación',
    path: 'theme.background',
    gradientPath: 'theme.gradients.background',
    fallback: '#f6f7fb',
    supportsGradient: true,
  },
  {
    key: 'text',
    label: 'Texto general',
    description: 'Color base de la invitación. Cada sección puede ajustar textos especiales desde su propio icono.',
    path: 'theme.text',
    gradientPath: 'theme.gradients.text',
    fallback: '#1d0f2f',
    supportsGradient: false,
  },
  {
    key: 'buttonBackground',
    label: 'Color de botones',
    description: 'Color base de los botones de la invitación.',
    path: 'theme.buttonBackground',
    gradientPath: 'theme.gradients.buttonBackground',
    fallback: '#7a4fd9',
    supportsGradient: true,
  },
  {
    key: 'buttonText',
    label: 'Texto de botones',
    description: 'Color base del texto dentro de los botones.',
    path: 'theme.buttonText',
    gradientPath: 'theme.gradients.buttonText',
    fallback: '#ffffff',
    supportsGradient: false,
  },
]

const createSectionThemeColorField = (
  sectionKey: string,
  colorKey: string,
  label: string,
  description: string,
  fallback: string,
  supportsGradient = false,
): ThemeColorField => ({
  key: `${sectionKey}.${colorKey}`,
  label,
  description,
  path: `theme.sections.${sectionKey}.${colorKey}`,
  gradientPath: `theme.sections.${sectionKey}.gradients.${colorKey}`,
  fallback,
  sectionKey,
  supportsGradient,
})

const sectionThemeColorGroups: Record<string, ThemeColorField[]> = {
  hero: [],
  countdown: [
    createSectionThemeColorField('countdown', 'surface', 'Fondo del contador', 'Color de los bloques de días, horas, minutos y segundos.', '#ffffff'),
    createSectionThemeColorField('countdown', 'counterText', 'Texto del contador', 'Color de números, etiquetas y separadores.', '#1d0f2f'),
    createSectionThemeColorField('countdown', 'accent', 'Bordes del contador', 'Color de bordes y detalles internos.', '#7a4fd9'),
  ],
  story: [],
  gallery: [],
  wall: [
    createSectionThemeColorField('wall', 'surface', 'Fondo de mensajes', 'Color de las tarjetas donde aparecen los mensajes.', '#ffffff'),
    createSectionThemeColorField('wall', 'accent', 'Detalles de mensajes', 'Color de pines, bordes y detalles visuales.', '#7a4fd9'),
  ],
  location: [
    createSectionThemeColorField('location', 'surface', 'Fondo de ubicaciones', 'Color de las tarjetas de cada lugar.', '#ffffff'),
    createSectionThemeColorField('location', 'accent', 'Detalles de ubicación', 'Color de bordes y detalles internos.', '#7a4fd9'),
  ],
  saveDate: [],
  dressCode: [],
  rsvp: [
    createSectionThemeColorField('rsvp', 'surface', 'Fondo de preguntas', 'Color del bloque de preguntas importantes.', '#ffffff'),
    createSectionThemeColorField('rsvp', 'accent', 'Detalles de confirmación', 'Color de bordes y detalles internos.', '#7a4fd9'),
  ],
  faq: [],
}

const sectionThemeColorFields = Object.values(sectionThemeColorGroups).flat()

const allThemeColorFields = [...globalThemeColorFields, ...sectionThemeColorFields]

const editableFieldBindings: Record<string, EditableFieldBinding> = {
  hero_title: { paths: ['hero.title', 'couple.headline'], fallback: 'Nos casamos' },
  hero_subtitle: {
    paths: ['hero.subtitle'],
    fallback: 'Diseñada para que puedas personalizarla en minutos y compartirla con tu gente.',
  },
  bride_name: { paths: ['couple.brideName'], fallback: 'Nombre 1' },
  groom_name: { paths: ['couple.groomName'], fallback: 'Nombre 2' },
  event_date_label: { paths: ['event.date.label'], fallback: '24 de agosto de 2026 · 18:00 hs' },
  event_venue: { paths: ['event.venue'], fallback: 'Lugar del evento' },
  event_city: { paths: ['event.city'], fallback: 'Ciudad' },
  countdown_note: { paths: ['countdown.note'], fallback: 'Cada detalle está preparado para este gran día.' },
  story_title: { paths: ['story.0.title'], fallback: 'Nuestra historia' },
  story_description: { paths: ['story.0.description'], fallback: 'Comparte tu historia con un texto breve y emocional.' },
  rsvp_label: { paths: ['rsvp.submitLabel'], fallback: 'Confirmar asistencia' },
}

const toRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}

const isEmptyRecord = (value: unknown): boolean =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)

const cloneRecord = (value: unknown): JsonRecord => {
  const source = toRecord(value)
  try {
    return JSON.parse(JSON.stringify(source)) as JsonRecord
  } catch {
    return { ...source }
  }
}

const normalizeTextOverrides = (value: unknown): TextOverridesMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const source = value as Record<string, unknown>
  const normalized: TextOverridesMap = {}

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = rawKey.trim()
    if (!key) continue
    normalized[key] = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '')
  }

  return normalized
}

const normalizeSubdomain = (value: string): string => {
  const lowered = value.toLowerCase()
  const collapsedSpaces = lowered.replace(/\s+/g, '-').replace(/_+/g, '-')
  const cleaned = collapsedSpaces.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
  return cleaned.replace(/^-+/, '').replace(/-+$/, '').slice(0, 63)
}

const isValidSubdomain = (value: string): boolean =>
  /^(?!-)[a-z0-9]+(?:-[a-z0-9]+)*(?<!-)$/.test(value) && value.length >= 3 && value.length <= 63

const normalizeExternalUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.includes('.') && !/\s/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const asText = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback
  return value.trim().length ? value : fallback
}

const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const createDefaultDraftLocation = (index: number): DraftLocationItem => ({
  name: `Ubicación ${index + 1}`,
  address: 'Dirección del evento',
  mapsUrl: DEFAULT_LOCATION_MAPS_URL,
  mapsCanonicalUrl: DEFAULT_LOCATION_MAPS_URL,
  mapsSourceUrl: DEFAULT_LOCATION_MAPS_URL,
  placeId: '',
  formattedAddress: 'Dirección del evento',
  latitude: null,
  longitude: null,
  uberEnabled: true,
  uberUrl: '',
})

const normalizeDraftLocationItem = (rawValue: unknown, index: number): DraftLocationItem => {
  const source = toRecord(rawValue)
  const fallback = createDefaultDraftLocation(index)

  return {
    name: asText(source.name, fallback.name),
    address: asText(source.address, asText(source.formattedAddress, fallback.address)),
    mapsUrl: asText(source.mapsUrl, fallback.mapsUrl),
    mapsCanonicalUrl: asText(source.mapsCanonicalUrl, asText(source.mapsUrl, fallback.mapsCanonicalUrl)),
    mapsSourceUrl: asText(source.mapsSourceUrl, asText(source.mapsUrl, fallback.mapsSourceUrl)),
    placeId: asText(source.placeId),
    formattedAddress: asText(source.formattedAddress, asText(source.address, fallback.formattedAddress)),
    latitude: toNullableNumber(source.latitude),
    longitude: toNullableNumber(source.longitude),
    uberEnabled: source.uberEnabled === false ? false : true,
    uberUrl: asText(source.uberUrl),
  }
}

const extractDraftLocations = (content: JsonRecord): DraftLocationItem[] => {
  const rawLocations = getByPath(content, 'locations')
  let sourceRows: unknown[] = Array.isArray(rawLocations) ? rawLocations : []

  if (!sourceRows.length) {
    const legacyLocation = getByPath(content, 'location')
    if (legacyLocation && typeof legacyLocation === 'object') {
      sourceRows = [legacyLocation]
    }
  }

  if (!sourceRows.length) {
    sourceRows = [createDefaultDraftLocation(0)]
  }

  return sourceRows
    .slice(0, MAX_LOCATIONS_PER_INVITATION)
    .map((row, index) => normalizeDraftLocationItem(row, index))
}

const writeDraftLocations = (content: JsonRecord, locations: DraftLocationItem[]): JsonRecord => {
  const nextContent = cloneRecord(content)
  const normalizedLocations = (locations.length ? locations : [createDefaultDraftLocation(0)])
    .slice(0, MAX_LOCATIONS_PER_INVITATION)
    .map((row, index) => normalizeDraftLocationItem(row, index))

  setByPath(nextContent, 'locations', normalizedLocations)
  setByPath(nextContent, 'location', normalizedLocations[0] ?? createDefaultDraftLocation(0))

  return nextContent
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

const formatWallMessageDate = (rawIso: string | null | undefined): string => {
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

const isWallMessageUpdating = (messageId: number): boolean =>
  updatingWallMessageIds.value.includes(messageId)

const pathTokens = (path: string): Array<string | number> =>
  path
    .split('.')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (/^\d+$/.test(token) ? Number(token) : token))

const getByPath = (source: unknown, path: string): unknown => {
  const tokens = pathTokens(path)
  let current: unknown = source

  for (const token of tokens) {
    if (typeof token === 'number') {
      if (!Array.isArray(current)) return undefined
      current = current[token]
      continue
    }

    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[token]
  }

  return current
}

const setByPath = (source: JsonRecord, path: string, value: unknown): void => {
  const tokens = pathTokens(path)
  if (!tokens.length) return

  let current: unknown = source

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index]!
    const nextToken = tokens[index + 1]

    if (typeof token === 'number') {
      if (!Array.isArray(current)) return

      if (!current[token] || typeof current[token] !== 'object') {
        current[token] = typeof nextToken === 'number' ? [] : {}
      }

      current = current[token]
      continue
    }

    if (!current || typeof current !== 'object') return
    const record = current as Record<string, unknown>
    const existing = record[token]
    const expectsArray = typeof nextToken === 'number'

    if (!existing || typeof existing !== 'object') {
      record[token] = expectsArray ? [] : {}
    } else if (expectsArray && !Array.isArray(existing)) {
      record[token] = [existing as Record<string, unknown>]
    } else if (!expectsArray && Array.isArray(existing)) {
      record[token] = toRecord(existing[0])
    }

    current = record[token]
  }

  const lastToken = tokens[tokens.length - 1]
  if (lastToken === undefined) return

  if (typeof lastToken === 'number') {
    if (!Array.isArray(current)) return
    current[lastToken] = value
    return
  }

  if (!current || typeof current !== 'object') return
    ; (current as Record<string, unknown>)[lastToken] = value
}

const ensureDefaultFeatureData = () => {
  let nextContent = cloneRecord(contentDraft.value)
  const nextSettings = cloneRecord(settingsDraft.value)

  if (!asText(getByPath(nextContent, 'music.title'))) {
    const defaultSong = musicOptions[0]!
    setByPath(nextContent, 'music.youtubeUrl', null)
    setByPath(nextContent, 'music.audioUrl', defaultSong.audioUrl)
    setByPath(nextContent, 'music.title', defaultSong.title)
    setByPath(nextContent, 'music.artist', defaultSong.artist)
    setByPath(nextContent, 'music.muted', true)
  }

  const normalizedLocations = extractDraftLocations(nextContent).map((locationItem, index) => ({
    ...locationItem,
    mapsCanonicalUrl: asText(locationItem.mapsCanonicalUrl, locationItem.mapsUrl || DEFAULT_LOCATION_MAPS_URL),
    mapsSourceUrl: asText(locationItem.mapsSourceUrl, locationItem.mapsUrl || DEFAULT_LOCATION_MAPS_URL),
    uberEnabled: typeof locationItem.uberEnabled === 'boolean' ? locationItem.uberEnabled : true,
    name: asText(locationItem.name, `Ubicación ${index + 1}`),
  }))
  nextContent = writeDraftLocations(nextContent, normalizedLocations)

  if (!asText(getByPath(nextContent, 'saveDate.label'))) {
    setByPath(nextContent, 'saveDate.enabled', true)
    setByPath(nextContent, 'saveDate.label', 'Guardar fecha')
  }

  if (!asText(getByPath(nextContent, 'dressCode.title'))) {
    const defaultDressCode = dressCodeOptions[0]!
    setByPath(nextContent, 'dressCode.enabled', true)
    setByPath(nextContent, 'dressCode.code', defaultDressCode.code)
    setByPath(nextContent, 'dressCode.title', defaultDressCode.title)
    setByPath(nextContent, 'dressCode.description', defaultDressCode.description)
  }

  const dressCodeCode = asText(getByPath(nextContent, 'dressCode.code'))
  if (dressCodeCode) {
    const selectedDressCode = dressCodeOptions.find((option) => option.code === dressCodeCode)
    if (selectedDressCode) {
      setByPath(nextContent, 'dressCode.title', selectedDressCode.title)
      setByPath(nextContent, 'dressCode.description', selectedDressCode.description)
    }
  }

  if (!asText(getByPath(nextContent, 'rsvp.formLabels.firstName'))) {
    setByPath(nextContent, 'rsvp.formLabels.firstName', 'Nombre')
    setByPath(nextContent, 'rsvp.formLabels.lastName', 'Apellido')
    setByPath(nextContent, 'rsvp.formLabels.dietaryRestrictions', 'Restricción alimentaria')
  }

  if (!asText(getByPath(nextContent, 'wall.title'))) {
    setByPath(nextContent, 'wall.title', 'Muro de mensajes')
  }

  if (!asText(getByPath(nextContent, 'wall.description'))) {
    setByPath(nextContent, 'wall.description', 'Deja unas palabras lindas para este gran día.')
  }

  if (!asText(getByPath(nextContent, 'wall.addLabel'))) {
    setByPath(nextContent, 'wall.addLabel', 'Añadir mensaje')
  }

  if (!asText(getByPath(nextContent, 'wall.emptyStateLabel'))) {
    setByPath(nextContent, 'wall.emptyStateLabel', 'Sé la primera persona en dejar un mensaje.')
  }

  if (!Array.isArray(getByPath(nextContent, 'wall.messages'))) {
    setByPath(nextContent, 'wall.messages', [])
  }

  if (!Array.isArray(getByPath(nextContent, 'faq'))) {
    const rawFaq = getByPath(nextContent, 'faq')
    if (rawFaq && typeof rawFaq === 'object') {
      const normalizedFaq = Object.values(toRecord(rawFaq))
        .map((item, index) => {
          const row = toRecord(item)
          return {
            id: asText(row.id, `faq-${index + 1}`),
            question: asText(row.question),
            answer: asText(row.answer),
          }
        })
        .filter((item) => item.question || item.answer)
      setByPath(nextContent, 'faq', normalizedFaq)
    } else {
      setByPath(nextContent, 'faq', [])
    }
  }

  const countdownTarget = asText(getByPath(nextContent, 'countdown.targetDateIso'))
  if (!countdownTarget) {
    const fallbackIso = asText(getByPath(nextContent, 'event.date.iso'), new Date().toISOString())
    setByPath(nextContent, 'countdown.targetDateIso', fallbackIso)
  }

  if (typeof getByPath(nextContent, 'checkin.showEventDate') !== 'boolean') {
    setByPath(nextContent, 'checkin.showEventDate', false)
  }

  if (!asText(getByPath(nextContent, 'checkin.eventDateIso'))) {
    const fallbackIso = asText(getByPath(nextContent, 'event.date.iso'), new Date().toISOString())
    setByPath(nextContent, 'checkin.eventDateIso', fallbackIso)
  }

  if (typeof getByPath(nextContent, 'checkin.showEntryValue') !== 'boolean') {
    setByPath(nextContent, 'checkin.showEntryValue', false)
  }

  if (!asText(getByPath(nextContent, 'checkin.entry.currency'))) {
    setByPath(nextContent, 'checkin.entry.currency', checkinCurrencyOptions[0]?.code ?? 'USD')
  }

  const entryAmount = Number(getByPath(nextContent, 'checkin.entry.amount') ?? 0)
  if (!Number.isFinite(entryAmount) || entryAmount < 0) {
    setByPath(nextContent, 'checkin.entry.amount', 0)
  }

  if (!toRecord(nextSettings).section_visibility || typeof toRecord(nextSettings).section_visibility !== 'object') {
    setByPath(nextSettings, 'section_visibility', {})
  }

  contentDraft.value = nextContent
  settingsDraft.value = nextSettings
}

const templateSections = computed<EditorSection[]>(() => {
  const normalizeSectionKey = (rawKey: string, rawFeatureKey = ''): string => {
    const normalized = (rawFeatureKey || rawKey).toLowerCase().replace(/[\s_]+/g, '-')

    if (['hero', 'header', 'cover', 'portada'].includes(normalized)) return 'hero'
    if (['checkin', 'check-in', 'welcome', 'welcome-screen', 'bienvenida'].includes(normalized)) return 'checkin'
    if (['countdown', 'count-down', 'timer'].includes(normalized)) return 'countdown'
    if (['story', 'history', 'historia'].includes(normalized)) return 'story'
    if (['gallery', 'galeria', 'photos'].includes(normalized)) return 'gallery'
    if (['location', 'maps', 'map', 'ubicacion'].includes(normalized)) return 'location'
    if (['save-date', 'save-the-date', 'savedate'].includes(normalized)) return 'saveDate'
    if (['dress-code', 'dresscode', 'attire'].includes(normalized)) return 'dressCode'
    if (['music', 'audio', 'song', 'soundtrack'].includes(normalized)) return 'music'
    if (['faq', 'frequently-asked-questions', 'preguntas-frecuentes'].includes(normalized)) return 'faq'
    if (['rsvp', 'confirm', 'attendance'].includes(normalized)) return 'rsvp'
    if (['wall', 'messages', 'message-wall', 'muro'].includes(normalized)) return 'wall'
    return rawKey
  }

  const definition = toRecord(template.value?.definition)
  const rawSections = Array.isArray(definition.sections) ? definition.sections : []

  const byKey = new Map<string, EditorSection>()

  rawSections.forEach((item) => {
    const section = toRecord(item)
    const key = asText(section.key)
    const featureKey = asText(section.feature_key)
    const normalizedKey = normalizeSectionKey(key, featureKey)
    const label = asText(section.label, key)
    if (!normalizedKey || !label) return

    byKey.set(normalizedKey, {
      key: normalizedKey,
      label,
      optional: Boolean(section.optional),
      featureKey,
    })
  })

  const defaults: EditorSection[] = [
    { key: 'hero', label: 'Portada', optional: false },
    { key: 'checkin', label: 'Bienvenida interactiva', optional: true },
    { key: 'countdown', label: 'Cuenta regresiva', optional: true },
    { key: 'story', label: 'Historia', optional: false },
    { key: 'gallery', label: 'Galería', optional: true },
    { key: 'location', label: 'Ubicación y cómo llegar', optional: true },
    { key: 'saveDate', label: 'Guardar fecha', optional: true },
    { key: 'dressCode', label: 'Vestimenta sugerida', optional: true },
    { key: 'music', label: 'Música', optional: true },
    { key: 'faq', label: 'Preguntas frecuentes', optional: true },
    { key: 'rsvp', label: 'Confirmación de asistencia', optional: true },
    { key: 'wall', label: 'Muro de mensajes', optional: true },
  ]

  for (const section of defaults) {
    if (!byKey.has(section.key)) {
      byKey.set(section.key, section)
    }
  }

  return Array.from(byKey.values())
})

const optionalSections = computed(() => {
  const unique = new Set<string>()
  const list: EditorSection[] = []

  for (const section of templateSections.value) {
    if (!section.optional) continue
    if (unique.has(section.key)) continue
    unique.add(section.key)
    list.push(section)
  }

  return list
})

const baseConfigBarItems: ConfigBarItem[] = [
  { key: 'content', label: 'Datos', target: 'config-content', icon: 'content' },
  { key: 'style', label: 'Estilo', target: 'config-style', icon: 'style' },
]

const configBarItems = computed<ConfigBarItem[]>(() => [
  ...baseConfigBarItems,
  ...optionalSections.value.map((section) => ({
    key: section.key,
    label: section.label,
    target: `config-section-${section.key}`,
    icon: section.key,
  })),
])

const selectedOptionalSectionKey = computed(() =>
  activeConfigTarget.value.startsWith('config-section-')
    ? activeConfigTarget.value.replace('config-section-', '')
    : '',
)

const selectedOptionalSections = computed(() =>
  selectedOptionalSectionKey.value
    ? optionalSections.value.filter((section) => section.key === selectedOptionalSectionKey.value)
    : [],
)

const activeConfigItem = computed(() =>
  configBarItems.value.find((item) => item.target === activeConfigTarget.value) ?? configBarItems.value[0] ?? null,
)

const activeThemeColorField = computed(() =>
  allThemeColorFields.find((field) => field.key === activeThemeColorFieldKey.value) ?? null,
)

const isThemeColorModalOpen = computed(() => Boolean(activeThemeColorField.value))
const activeThemeColorStudioTitle = computed(() => activeThemeColorField.value?.label ?? 'Color')
const activeThemeColorStudioColor = computed(() =>
  activeThemeColorField.value ? readThemeColor(activeThemeColorField.value) : '#FFFFFF',
)
const activeThemeColorStudioGradient = computed<ThemeGradientConfig>(() =>
  activeThemeColorField.value
    ? readThemeGradient(activeThemeColorField.value)
    : { enabled: false, type: 'linear', angle: 135, colors: ['#FFFFFF', '#F06AA6'] },
)
const activeThemeCustomColors = computed(() => readThemeCustomPalette())

const configDrawerTitle = computed(() => activeConfigItem.value?.label ?? 'Personaliza tu invitación')
const configDrawerSubtitle = computed(() => {
  if (activeConfigTarget.value === 'config-content') {
    return 'Ajusta el nombre y el enlace que compartirás.'
  }

  if (activeConfigTarget.value === 'config-style') {
    return 'Define la base visual de tu invitación.'
  }

  return 'Elige qué mostrar y personaliza esta parte.'
})

const configBarIconPaths: Record<string, string[]> = {
  content: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  style: ['M12 3l7 4v10l-7 4-7-4V7l7-4Z', 'M12 8v8'],
  checkin: ['M12 3l7 7-7 11-7-11 7-7Z', 'M9.5 10h5'],
  countdown: ['M12 8v5l3 2', 'M5 3h14', 'M7 21h10', 'M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z'],
  music: ['M9 18V5l10-2v13', 'M9 18a3 3 0 1 1-2-2.83', 'M19 16a3 3 0 1 1-2-2.83'],
  gallery: ['M4 5h16v14H4z', 'M8 11l3 3 2-2 3 4', 'M8 8h.01'],
  faq: ['M12 18h.01', 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2', 'M4 4h16v16H4z'],
  wall: ['M4 5h16v11H8l-4 4V5Z', 'M8 9h8', 'M8 13h5'],
  rsvp: ['M4 6h16', 'M4 12h10', 'M4 18h8', 'M16 17l2 2 4-5'],
  location: ['M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z', 'M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  saveDate: ['M7 3v4', 'M17 3v4', 'M4 7h16v14H4z', 'M8 13h8'],
  dressCode: ['M8 4l4 3 4-3 3 5-3 1v10H8V10L5 9l3-5Z'],
  default: ['M12 5v14', 'M5 12h14'],
}

const getConfigBarIconPaths = (icon: string): string[] =>
  configBarIconPaths[icon] ?? ['M12 5v14', 'M5 12h14']

const normalizeHexColor = (value: unknown, fallback: string): string => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (HEX_COLOR_PATTERN.test(text)) return text.toUpperCase()
  return fallback
}

const isThemeGradientType = (value: unknown): value is ThemeGradientType =>
  value === 'linear' || value === 'radial' || value === 'conic'

const clampThemeGradientAngle = (value: unknown): number => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 135
  return Math.min(360, Math.max(0, Math.round(numericValue)))
}

const readThemeColor = (field: ThemeColorField): string =>
  normalizeHexColor(getByPath(contentDraft.value, field.path), field.fallback)

const normalizeThemeGradientColors = (colors: unknown, fallbackColor: string): string[] => {
  const rawColors = Array.isArray(colors) ? colors : []
  const normalizedColors = rawColors
    .map((item) => normalizeHexColor(item, ''))
    .filter(Boolean)
    .slice(0, MAX_THEME_GRADIENT_COLORS)

  if (normalizedColors.length >= 2) return normalizedColors

  const firstColor = normalizeHexColor(fallbackColor, '#FFFFFF')
  const secondColor = firstColor === '#F06AA6' ? '#7A4FD9' : '#F06AA6'
  return [firstColor, secondColor]
}

const readThemeGradient = (field: ThemeColorField): ThemeGradientConfig => {
  const source = toRecord(getByPath(contentDraft.value, field.gradientPath))
  const baseColor = readThemeColor(field)

  return {
    enabled: Boolean(source.enabled),
    type: isThemeGradientType(source.type) ? source.type : 'linear',
    angle: clampThemeGradientAngle(source.angle),
    colors: normalizeThemeGradientColors(source.colors, baseColor),
  }
}

const themeGradientCss = (gradient: ThemeGradientConfig): string => {
  const colors = gradient.colors.join(', ')
  if (gradient.type === 'radial') return `radial-gradient(circle, ${colors})`
  if (gradient.type === 'conic') return `conic-gradient(from ${gradient.angle}deg, ${colors})`
  return `linear-gradient(${gradient.angle}deg, ${colors})`
}

const themeColorPreview = (field: ThemeColorField): string => {
  const gradient = readThemeGradient(field)
  return gradient.enabled ? themeGradientCss(gradient) : readThemeColor(field)
}

const readThemeCustomPalette = (): string[] => {
  const rawPalette = getByPath(contentDraft.value, 'theme.customPalette')
  if (!Array.isArray(rawPalette)) return []

  const colors: string[] = []
  const seen = new Set<string>()

  for (const item of rawPalette) {
    const color = normalizeHexColor(item, '')
    if (!color || seen.has(color)) continue
    seen.add(color)
    colors.push(color)
  }

  return colors.slice(0, 36)
}

const updateThemeCustomPalette = (colors: string[]) => {
  const nextContent = cloneRecord(contentDraft.value)
  const normalizedColors = colors
    .map((color) => normalizeHexColor(color, ''))
    .filter(Boolean)
    .slice(0, 36)

  if (normalizedColors.length) {
    setByPath(nextContent, 'theme.customPalette', normalizedColors)
  } else {
    const theme = cloneRecord(getByPath(nextContent, 'theme'))
    delete theme.customPalette
    if (isEmptyRecord(theme)) {
      delete nextContent.theme
    } else {
      nextContent.theme = theme
    }
  }

  contentDraft.value = nextContent
}

const writeThemeGradient = (field: ThemeColorField, patch: Partial<ThemeGradientConfig>) => {
  const current = readThemeGradient(field)
  const nextGradient: ThemeGradientConfig = {
    ...current,
    ...patch,
    colors: normalizeThemeGradientColors(patch.colors ?? current.colors, readThemeColor(field)),
  }

  const nextContent = cloneRecord(contentDraft.value)
  setByPath(nextContent, field.gradientPath, nextGradient)
  contentDraft.value = nextContent
}

const updateThemeColor = (field: ThemeColorField, value: string) => {
  const nextColor = value.trim()
  if (!HEX_COLOR_PATTERN.test(nextColor)) return

  const normalizedColor = nextColor.toUpperCase()
  const currentGradient = readThemeGradient(field)
  const nextContent = cloneRecord(contentDraft.value)
  setByPath(nextContent, field.path, normalizedColor)

  if (currentGradient.enabled) {
    const nextColors = [...currentGradient.colors]
    nextColors[0] = normalizedColor
    setByPath(nextContent, field.gradientPath, {
      ...currentGradient,
      colors: normalizeThemeGradientColors(nextColors, normalizedColor),
    })
  }

  contentDraft.value = nextContent
}

const getSectionThemeColorFields = (sectionKey: string): ThemeColorField[] =>
  sectionThemeColorGroups[sectionKey] ?? []

const getVisibleSectionThemeColorFields = (sectionKey: string): ThemeColorField[] =>
  getSectionThemeColorFields(sectionKey)

const hasSectionThemeColorFields = (sectionKey: string): boolean =>
  getSectionThemeColorFields(sectionKey).length > 0

const isSectionColorPanelOpen = (sectionKey: string): boolean =>
  Boolean(expandedSectionColorPanels.value[sectionKey])

const toggleSectionColorPanel = (sectionKey: string) => {
  expandedSectionColorPanels.value = {
    ...expandedSectionColorPanels.value,
    [sectionKey]: !isSectionColorPanelOpen(sectionKey),
  }
}

const openThemeColorModal = (field: ThemeColorField) => {
  activeThemeColorFieldKey.value = activeThemeColorFieldKey.value === field.key ? null : field.key
}

const closeThemeColorModal = () => {
  activeThemeColorFieldKey.value = null
}

const updateActiveThemeColor = (color: string) => {
  if (!activeThemeColorField.value) return
  updateThemeColor(activeThemeColorField.value, color)
}

const updateActiveThemeGradient = (gradient: ThemeGradientConfig) => {
  if (!activeThemeColorField.value) return
  if (activeThemeColorField.value.supportsGradient === false) return
  writeThemeGradient(activeThemeColorField.value, gradient)
}

const resetThemeColorsToTemplateDefaults = () => {
  const nextContent = cloneRecord(contentDraft.value)
  const theme = cloneRecord(getByPath(nextContent, 'theme'))
  const themeColorKeys = [
    'primary',
    'secondary',
    'text',
    'background',
    'backgroundAccent',
    'sectionBackground',
    'buttonBackground',
    'buttonBackgroundAlt',
    'buttonText',
    'backgroundGradient',
    'buttonGradient',
    'gradients',
    'customPalette',
  ]

  for (const key of themeColorKeys) {
    delete theme[key]
  }

  const sections = cloneRecord(theme.sections)
  for (const sectionKey of Object.keys(sections)) {
    const section = cloneRecord(sections[sectionKey])
    delete section.background
    delete section.surface
    delete section.text
    delete section.primaryText
    delete section.secondaryText
    delete section.counterText
    delete section.accent
    delete section.buttonBackground
    delete section.buttonText
    delete section.gradients

    if (isEmptyRecord(section)) {
      delete sections[sectionKey]
    } else {
      sections[sectionKey] = section
    }
  }

  if (isEmptyRecord(sections)) {
    delete theme.sections
  } else {
    theme.sections = sections
  }

  if (isEmptyRecord(theme)) {
    delete nextContent.theme
  } else {
    nextContent.theme = theme
  }

  activeThemeColorFieldKey.value = null
  contentDraft.value = nextContent
}

const resolvedSectionVisibility = computed(() => {
  const visibility: Record<string, boolean> = {}
  for (const section of templateSections.value) {
    const currentValue = sectionVisibilityDraft.value[section.key]
    visibility[section.key] = typeof currentValue === 'boolean' ? currentValue : true
  }
  return visibility
})

const previewSectionVisibility = computed<Record<string, boolean>>(() => ({
  ...resolvedSectionVisibility.value,
}))

const selectedTemplate = computed(() =>
  availableTemplates.value.find((item) => String(item.id) === selectedTemplateId.value),
)

const hasPendingTemplateChange = computed(() => {
  if (!invitation.value?.template_id) return false
  if (!selectedTemplateId.value) return false
  return Number(selectedTemplateId.value) !== Number(invitation.value.template_id)
})

watch(wallMessages, () => {
  const activeIds = new Set(wallMessages.value.map((item) => Number(item.id)))

  if (Object.keys(wallEditorExpandedMessageIds.value).length) {
    const nextExpandedMap = Object.entries(wallEditorExpandedMessageIds.value).reduce<Record<number, boolean>>(
      (carry, [rawId, rawExpanded]) => {
        const id = Number(rawId)
        if (!Number.isFinite(id) || !activeIds.has(id)) return carry
        if (!rawExpanded) return carry
        carry[id] = true
        return carry
      },
      {},
    )

    const currentEntries = Object.keys(wallEditorExpandedMessageIds.value).length
    const nextEntries = Object.keys(nextExpandedMap).length
    if (currentEntries !== nextEntries) {
      wallEditorExpandedMessageIds.value = nextExpandedMap
    }
  }
})

const slugAvailabilityMessage = computed(() => {
  if (slugInputError.value) return slugInputError.value
  if (!slug.value.trim()) return 'Define un subdominio de 3 a 63 caracteres.'

  if (slugAvailabilityState.value === 'checking') return 'Verificando disponibilidad...'
  if (slugAvailabilityState.value === 'available') return 'Subdominio disponible.'
  if (slugAvailabilityState.value === 'unavailable') {
    return slugAvailabilityReason.value === 'reserved'
      ? 'Ese subdominio está reservado. Elige otro nombre.'
      : 'Ese subdominio ya está en uso.'
  }
  if (slugAvailabilityState.value === 'invalid') {
    return 'Solo se permiten letras minúsculas, números y guiones.'
  }

  if (slugAvailabilityReason.value === 'error') {
    return 'No pudimos validar el subdominio ahora. Intenta de nuevo.'
  }

  return 'Solo se permiten letras minúsculas, números y guiones.'
})

const slugAvailabilityClass = computed(() => {
  if (slugInputError.value || slugAvailabilityState.value === 'invalid' || slugAvailabilityState.value === 'unavailable') {
    return 'field-alert--error'
  }
  if (slugAvailabilityState.value === 'available') return 'field-alert--success'
  return 'field-alert--info'
})

const subdomainChangeHelp = computed(() => {
  const remaining = invitation.value?.subdomain_changes_remaining
  const limit = invitation.value?.subdomain_change_limit
  if (remaining === null || remaining === undefined || limit === null || limit === undefined) {
    return 'Puedes ajustar el subdominio antes de guardar.'
  }

  const normalizedRemaining = Math.max(0, Number(remaining) || 0)
  const normalizedLimit = Math.max(0, Number(limit) || 0)
  const plural = normalizedRemaining === 1 ? 'cambio disponible' : 'cambios disponibles'
  return `Te quedan ${normalizedRemaining} de ${normalizedLimit} ${plural} para este subdominio.`
})

const createSnapshot = (): EditorSnapshot => ({
  title: title.value,
  slug: slug.value,
  selectedTemplateId: selectedTemplateId.value,
  content: cloneRecord(contentDraft.value),
  textOverrides: { ...textOverridesDraft.value },
  settings: cloneRecord(settingsDraft.value),
  featureOverrides: cloneRecord(featureOverridesDraft.value),
  sectionVisibility: { ...sectionVisibilityDraft.value },
  activeTextField: activeTextField.value,
  showCheckinPreview: showCheckinPreview.value,
  isCheckinConfigEditing: isCheckinConfigEditing.value,
  pendingGallerySignature: pendingGalleryImages.value.map((item) => `${item.name}:${item.sizeBytes}`),
  pendingGalleryItems: toPendingGallerySnapshotItems(pendingGalleryImages.value),
  removedGalleryImageIds: [...removedGalleryImageIds.value],
  pendingDeleteWallMessageIds: [...pendingDeleteWallMessageIds.value],
  pendingWallMessageVisibilityById: { ...pendingWallMessageVisibilityById.value },
})

const cloneSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => ({
  title: snapshot.title,
  slug: snapshot.slug,
  selectedTemplateId: snapshot.selectedTemplateId,
  content: cloneRecord(snapshot.content),
  textOverrides: normalizeTextOverrides(snapshot.textOverrides),
  settings: cloneRecord(snapshot.settings),
  featureOverrides: cloneRecord(snapshot.featureOverrides),
  sectionVisibility: { ...snapshot.sectionVisibility },
  activeTextField: snapshot.activeTextField,
  showCheckinPreview: Boolean(snapshot.showCheckinPreview),
  isCheckinConfigEditing: Boolean(snapshot.isCheckinConfigEditing),
  pendingGallerySignature: Array.isArray(snapshot.pendingGallerySignature)
    ? snapshot.pendingGallerySignature.map((item) => String(item))
    : [],
  pendingGalleryItems: Array.isArray(snapshot.pendingGalleryItems)
    ? clonePendingGallerySnapshotItems(snapshot.pendingGalleryItems)
    : [],
  removedGalleryImageIds: Array.isArray(snapshot.removedGalleryImageIds)
    ? snapshot.removedGalleryImageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : [],
  pendingDeleteWallMessageIds: Array.isArray(snapshot.pendingDeleteWallMessageIds)
    ? snapshot.pendingDeleteWallMessageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : [],
  pendingWallMessageVisibilityById: snapshot.pendingWallMessageVisibilityById && typeof snapshot.pendingWallMessageVisibilityById === 'object'
    ? Object.entries(snapshot.pendingWallMessageVisibilityById).reduce<Record<number, boolean>>((carry, [rawId, rawValue]) => {
      const id = Number(rawId)
      if (!Number.isFinite(id) || id <= 0) return carry
      carry[id] = Boolean(rawValue)
      return carry
    }, {})
    : {},
})

const applySnapshot = async (snapshot: EditorSnapshot) => {
  title.value = snapshot.title
  slug.value = snapshot.slug
  selectedTemplateId.value = snapshot.selectedTemplateId
  contentDraft.value = cloneRecord(snapshot.content)
  textOverridesDraft.value = normalizeTextOverrides(snapshot.textOverrides)
  settingsDraft.value = cloneRecord(snapshot.settings)
  featureOverridesDraft.value = cloneRecord(snapshot.featureOverrides)
  sectionVisibilityDraft.value = { ...snapshot.sectionVisibility }
  activeTextField.value = snapshot.activeTextField
  showCheckinPreview.value = snapshot.showCheckinPreview
  isCheckinConfigEditing.value = Boolean(snapshot.isCheckinConfigEditing)
  const nextPendingGalleryItems = Array.isArray(snapshot.pendingGalleryItems)
    ? hydratePendingGalleryImages(snapshot.pendingGalleryItems)
    : []
  replacePendingGalleryImages(nextPendingGalleryItems)
  removedGalleryImageIds.value = Array.isArray(snapshot.removedGalleryImageIds)
    ? snapshot.removedGalleryImageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : []
  setPendingDeleteWallMessageIds(Array.isArray(snapshot.pendingDeleteWallMessageIds)
    ? snapshot.pendingDeleteWallMessageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : [])
  setPendingWallMessageVisibilityById(snapshot.pendingWallMessageVisibilityById && typeof snapshot.pendingWallMessageVisibilityById === 'object'
    ? Object.entries(snapshot.pendingWallMessageVisibilityById).reduce<Record<number, boolean>>((carry, [rawId, rawValue]) => {
      const id = Number(rawId)
      if (!Number.isFinite(id) || id <= 0) return carry
      carry[id] = Boolean(rawValue)
      return carry
    }, {})
    : {})
  syncWallSummaryWithEditorState()
  syncWallMessagesIntoContent()
  await loadTemplateRenderer()
}

const snapshotFromSerializedState = (state: string): EditorSnapshot | null => {
  try {
    const parsed = JSON.parse(state) as EditorSnapshot
    return {
      title: String(parsed.title ?? ''),
      slug: String(parsed.slug ?? ''),
      selectedTemplateId: String(parsed.selectedTemplateId ?? ''),
      content: cloneRecord(parsed.content),
      textOverrides: normalizeTextOverrides(parsed.textOverrides),
      settings: cloneRecord(parsed.settings),
      featureOverrides: cloneRecord(parsed.featureOverrides),
      sectionVisibility: { ...toRecord(parsed.sectionVisibility) } as Record<string, boolean>,
      activeTextField: typeof parsed.activeTextField === 'string' ? parsed.activeTextField : null,
      showCheckinPreview: Boolean(parsed.showCheckinPreview),
      isCheckinConfigEditing: Boolean(parsed.isCheckinConfigEditing),
      pendingGallerySignature: Array.isArray(parsed.pendingGallerySignature)
        ? parsed.pendingGallerySignature.map((item) => String(item))
        : [],
      pendingGalleryItems: [],
      removedGalleryImageIds: Array.isArray(parsed.removedGalleryImageIds)
        ? parsed.removedGalleryImageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
        : [],
      pendingDeleteWallMessageIds: Array.isArray(parsed.pendingDeleteWallMessageIds)
        ? parsed.pendingDeleteWallMessageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
        : [],
      pendingWallMessageVisibilityById:
        parsed.pendingWallMessageVisibilityById && typeof parsed.pendingWallMessageVisibilityById === 'object'
          ? Object.entries(parsed.pendingWallMessageVisibilityById).reduce<Record<number, boolean>>((carry, [rawId, rawValue]) => {
            const id = Number(rawId)
            if (!Number.isFinite(id) || id <= 0) return carry
            carry[id] = Boolean(rawValue)
            return carry
          }, {})
          : {},
    }
  } catch {
    return null
  }
}

const closeSidebar = () => {
  isSidebarOpen.value = false
  closeThemeColorModal()
}

const toggleConfigBarCollapsed = () => {
  isConfigBarCollapsed.value = !isConfigBarCollapsed.value
  if (isConfigBarCollapsed.value) {
    closeSidebar()
  }
}

const openConfigTarget = (target: string) => {
  if (isSidebarOpen.value && activeConfigTarget.value === target) {
    closeSidebar()
    return
  }

  activeConfigTarget.value = target
  isConfigBarCollapsed.value = false

  isSidebarOpen.value = true
}

const showConfigTooltip = (item: ConfigBarItem, event: MouseEvent | FocusEvent) => {
  const button = event.currentTarget as HTMLElement | null
  const bar = button?.closest('.editor-config-bar__inner') as HTMLElement | null
  const buttonRect = button?.getBoundingClientRect()
  const barRect = bar?.getBoundingClientRect()

  hoveredConfigTooltip.value = {
    label: item.label,
    left: buttonRect && barRect ? buttonRect.left - barRect.left + buttonRect.width / 2 : 48,
  }
}

const hideConfigTooltip = () => {
  hoveredConfigTooltip.value = null
}

const scrollConfigBar = (direction: 'left' | 'right') => {
  const rail = configBarScrollRef.value
  if (!rail) return

  const distance = Math.max(rail.clientWidth * 0.72, 180)
  rail.scrollBy({
    left: direction === 'left' ? -distance : distance,
    behavior: 'smooth',
  })
}

const closeLeavePrompt = () => {
  showLeavePrompt.value = false
  pendingNavigationPath.value = null
}

const leaveWithoutSaving = () => {
  const targetPath = pendingNavigationPath.value ?? '/panel/invitaciones'
  showLeavePrompt.value = false
  pendingNavigationPath.value = null
  skipNextLeaveConfirm.value = true
  void router.push(targetPath)
}

const requestNavigation = (targetPath: string) => {
  if (!hasUnsavedChanges.value) {
    skipNextLeaveConfirm.value = true
    void router.push(targetPath)
    return
  }

  pendingNavigationPath.value = targetPath
  showLeavePrompt.value = true
}

const goBackToInvitations = () => {
  requestNavigation('/panel/invitaciones')
}

const openHelpModal = () => {
  showHelpModal.value = true
}

const closeHelpModal = () => {
  showHelpModal.value = false
}

const openImmersivePreview = () => {
  isImmersivePreviewOpen.value = true
}

const closeImmersivePreview = () => {
  isImmersivePreviewOpen.value = false
}

const faqItems = computed(() => {
  const raw = getByPath(contentDraft.value, 'faq')
  if (!Array.isArray(raw)) return [] as Array<{ id: string; question: string; answer: string }>

  return raw.map((item, index) => {
    const row = toRecord(item)
    return {
      id: asText(row.id, `faq-${index + 1}`),
      question: asText(row.question),
      answer: asText(row.answer),
    }
  })
})

const musicSelection = computed({
  get: () => {
    const audioUrl = asText(getByPath(contentDraft.value, 'music.audioUrl'))
    if (audioUrl) {
      const byAudio = musicOptions.find((item) => item.audioUrl === audioUrl)
      if (byAudio) return byAudio.id
      return 'custom'
    }

    return musicOptions[0]!.id
  },
  set: (optionId: string) => {
    if (optionId === 'custom') return
    const option = musicOptions.find((item) => item.id === optionId)
    if (!option) return

    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'music.youtubeUrl', null)
    setByPath(nextContent, 'music.audioUrl', option.audioUrl)
    setByPath(nextContent, 'music.title', option.title)
    setByPath(nextContent, 'music.artist', option.artist)
    contentDraft.value = nextContent
  },
})

const countdownDatetime = computed({
  get: () => {
    const iso = asText(getByPath(contentDraft.value, 'countdown.targetDateIso')) || asText(getByPath(contentDraft.value, 'event.date.iso'))
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''

    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  },
  set: (value: string) => {
    if (!value) return
    const selectedDate = new Date(value)
    const now = new Date()
    const safeDate = selectedDate.getTime() < now.getTime() ? now : selectedDate
    const iso = safeDate.toISOString()

    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'countdown.targetDateIso', iso)
    setByPath(nextContent, 'event.date.iso', iso)
    setByPath(nextContent, 'event.date.label', formatDateTimeLabel24h(safeDate))
    contentDraft.value = nextContent
  },
})

const minAllowedCountdownDatetime = computed(() => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
})

const selectedDressCode = computed({
  get: () => {
    const currentCode = asText(getByPath(contentDraft.value, 'dressCode.code'))
    if (currentCode && dressCodeOptions.some((option) => option.code === currentCode)) {
      return currentCode
    }
    return dressCodeOptions[0]!.code
  },
  set: (code: string) => {
    const option = dressCodeOptions.find((item) => item.code === code)
    if (!option) return

    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'dressCode.enabled', true)
    setByPath(nextContent, 'dressCode.code', option.code)
    setByPath(nextContent, 'dressCode.title', option.title)
    setByPath(nextContent, 'dressCode.description', option.description)
    contentDraft.value = nextContent
  },
})

const locationItemsDraft = computed<DraftLocationItem[]>(() => extractDraftLocations(contentDraft.value))

const canAddLocationDraft = computed(() => locationItemsDraft.value.length < MAX_LOCATIONS_PER_INVITATION)

const updateLocationDraftField = (
  index: number,
  field: keyof DraftLocationItem,
  value: string | number | boolean | null,
) => {
  const locations = [...locationItemsDraft.value]
  if (!locations[index]) return

  const nextItem = { ...locations[index], [field]: value } as DraftLocationItem
  if (field === 'mapsUrl') {
    nextItem.mapsCanonicalUrl = asText(nextItem.mapsCanonicalUrl, String(value || nextItem.mapsUrl || DEFAULT_LOCATION_MAPS_URL))
    nextItem.mapsSourceUrl = asText(nextItem.mapsSourceUrl, String(value || nextItem.mapsSourceUrl || DEFAULT_LOCATION_MAPS_URL))
  }

  locations[index] = normalizeDraftLocationItem(nextItem, index)
  contentDraft.value = writeDraftLocations(contentDraft.value, locations)
}

const addLocationDraft = () => {
  if (!canAddLocationDraft.value) return
  const nextLocations = [...locationItemsDraft.value, createDefaultDraftLocation(locationItemsDraft.value.length)]
  contentDraft.value = writeDraftLocations(contentDraft.value, nextLocations)
}

const removeLocationDraft = (index: number) => {
  if (locationItemsDraft.value.length <= 1) return
  const nextLocations = locationItemsDraft.value.filter((_, currentIndex) => currentIndex !== index)
  contentDraft.value = writeDraftLocations(contentDraft.value, nextLocations)
}

const checkinActionLabel = computed(() => {
  if (!showCheckinPreview.value) return 'Probar'
  if (isCheckinConfigEditing.value) return 'Editando'
  return 'Editar'
})

const checkinShowEventDate = computed({
  get: () => Boolean(getByPath(contentDraft.value, 'checkin.showEventDate') ?? false),
  set: (value: boolean) => {
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'checkin.showEventDate', value)
    contentDraft.value = nextContent
  },
})

const checkinEventDatetime = computed({
  get: () => {
    const iso = asText(getByPath(contentDraft.value, 'checkin.eventDateIso')) || asText(getByPath(contentDraft.value, 'event.date.iso'))
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  },
  set: (value: string) => {
    if (!value) return
    const selectedDate = new Date(value)
    if (Number.isNaN(selectedDate.getTime())) return
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'checkin.eventDateIso', selectedDate.toISOString())
    contentDraft.value = nextContent
  },
})

const checkinShowEntryValue = computed({
  get: () => Boolean(getByPath(contentDraft.value, 'checkin.showEntryValue') ?? false),
  set: (value: boolean) => {
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'checkin.showEntryValue', value)
    contentDraft.value = nextContent
  },
})

const checkinEntryCurrency = computed({
  get: () => {
    const current = asText(getByPath(contentDraft.value, 'checkin.entry.currency')).toUpperCase()
    if (checkinCurrencyOptions.some((option) => option.code === current)) return current
    return checkinCurrencyOptions[0]?.code ?? 'USD'
  },
  set: (value: string) => {
    const normalized = value.toUpperCase()
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'checkin.entry.currency', normalized)
    contentDraft.value = nextContent
  },
})

const checkinEntryAmount = computed({
  get: () => {
    const value = Number(getByPath(contentDraft.value, 'checkin.entry.amount') ?? 0)
    return Number.isFinite(value) && value >= 0 ? value : 0
  },
  set: (value: number) => {
    const safeValue = Number.isFinite(value) && value >= 0 ? Number(value) : 0
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'checkin.entry.amount', safeValue)
    contentDraft.value = nextContent
  },
})

const onCheckinAction = () => {
  if (!showCheckinPreview.value) {
    showCheckinPreview.value = true
    isCheckinConfigEditing.value = false
    return
  }

  if (!isCheckinConfigEditing.value) {
    isCheckinConfigEditing.value = true
  }
}

const onCheckinPreviewClosed = () => {
  showCheckinPreview.value = false
  isCheckinConfigEditing.value = false
}

const readFieldValue = (fieldKey: string): string => {
  const binding = editableFieldBindings[fieldKey]
  if (!binding) return ''

  if (Object.prototype.hasOwnProperty.call(textOverridesDraft.value, fieldKey)) {
    return textOverridesDraft.value[fieldKey] ?? ''
  }

  for (const path of binding.paths) {
    const value = getByPath(contentDraft.value, path)
    const normalized = asText(value)
    if (normalized) return normalized
  }

  return binding.fallback
}

const projectTextOverridesIntoContent = (
  content: JsonRecord,
  overrides: TextOverridesMap = textOverridesDraft.value,
): JsonRecord => {
  const nextContent = cloneRecord(content)

  for (const [fieldKey, binding] of Object.entries(editableFieldBindings)) {
    if (!Object.prototype.hasOwnProperty.call(overrides, fieldKey)) continue
    const value = overrides[fieldKey] ?? ''

    for (const path of binding.paths) {
      setByPath(nextContent, path, value)
    }
  }

  return nextContent
}

const normalizeStory = (value: unknown): WeddingTemplateData['story'] => {
  if (!Array.isArray(value) || !value.length) {
    return [{ title: readFieldValue('story_title'), description: readFieldValue('story_description') }]
  }

  const primaryStoryTitle = readFieldValue('story_title')
  const primaryStoryDescription = readFieldValue('story_description')

  return value.map((item, index) => {
    const source = toRecord(item)
    return {
      title: index === 0 ? primaryStoryTitle : asText(source.title, `Historia ${index + 1}`),
      description: index === 0 ? primaryStoryDescription : asText(source.description, 'Comparte este momento.'),
    }
  })
}

const normalizeGallery = (): WeddingTemplateData['gallery'] => {
  if (liveGalleryItems.value.length) {
    return liveGalleryItems.value
  }

  return []
}

const normalizeSchedule = (value: unknown): WeddingTemplateData['schedule'] => {
  if (!Array.isArray(value) || !value.length) {
    return [{ id: 'schedule-1', time: '18:00', title: 'Recepción', description: 'Inicio del evento' }]
  }

  return value.map((item, index) => {
    const source = toRecord(item)
    return {
      id: asText(source.id, `schedule-${index + 1}`),
      time: asText(source.time, '--:--'),
      title: asText(source.title, `Momento ${index + 1}`),
      description: asText(source.description, 'Detalle del momento'),
    }
  })
}

const previewData = computed<WeddingTemplateData>(() => {
  const story = normalizeStory(getByPath(contentDraft.value, 'story'))
  const gallery = normalizeGallery()
  const schedule = normalizeSchedule(getByPath(contentDraft.value, 'schedule'))
  const previewLocations = locationItemsDraft.value
    .slice(0, MAX_LOCATIONS_PER_INVITATION)
    .map((item, index) => normalizeDraftLocationItem(item, index))
  const primaryLocation = previewLocations[0] ?? createDefaultDraftLocation(0)

  return {
    theme: cloneRecord(getByPath(contentDraft.value, 'theme')),
    hero: {
      title: readFieldValue('hero_title'),
      subtitle: readFieldValue('hero_subtitle'),
    },
    couple: {
      headline: readFieldValue('hero_title'),
      brideName: readFieldValue('bride_name'),
      groomName: readFieldValue('groom_name'),
    },
    event: {
      date: {
        iso: asText(getByPath(contentDraft.value, 'event.date.iso'), new Date().toISOString()),
        label: readFieldValue('event_date_label'),
      },
      venue: readFieldValue('event_venue'),
      city: readFieldValue('event_city'),
    },
    story,
    gallery,
    schedule,
    location: {
      name: asText(primaryLocation.name, 'Ubicación del evento'),
      address: asText(primaryLocation.address, 'Dirección del evento'),
      mapsUrl: asText(primaryLocation.mapsUrl, DEFAULT_LOCATION_MAPS_URL),
      mapsCanonicalUrl: asText(primaryLocation.mapsCanonicalUrl),
      mapsSourceUrl: asText(primaryLocation.mapsSourceUrl),
      placeId: asText(primaryLocation.placeId),
      formattedAddress: asText(primaryLocation.formattedAddress),
      latitude: primaryLocation.latitude,
      longitude: primaryLocation.longitude,
      uberEnabled: primaryLocation.uberEnabled,
      uberUrl: asText(primaryLocation.uberUrl),
    },
    locations: previewLocations.map((locationItem) => ({
      name: asText(locationItem.name, 'Ubicación del evento'),
      address: asText(locationItem.address, 'Dirección del evento'),
      mapsUrl: asText(locationItem.mapsUrl, DEFAULT_LOCATION_MAPS_URL),
      mapsCanonicalUrl: asText(locationItem.mapsCanonicalUrl),
      mapsSourceUrl: asText(locationItem.mapsSourceUrl),
      placeId: asText(locationItem.placeId),
      formattedAddress: asText(locationItem.formattedAddress),
      latitude: locationItem.latitude,
      longitude: locationItem.longitude,
      uberEnabled: locationItem.uberEnabled,
      uberUrl: asText(locationItem.uberUrl),
    })),
    music: {
      title: asText(getByPath(contentDraft.value, 'music.title'), 'Canción principal'),
      artist: asText(getByPath(contentDraft.value, 'music.artist'), 'Artista'),
      audioUrl: asText(getByPath(contentDraft.value, 'music.audioUrl')),
      youtubeUrl: asText(getByPath(contentDraft.value, 'music.youtubeUrl')),
      muted: Boolean(getByPath(contentDraft.value, 'music.muted') ?? true),
    },
    rsvp: {
      endpoint: asText(getByPath(contentDraft.value, 'rsvp.endpoint'), '/api/public/invitations/rsvp'),
      enabled: Boolean(getByPath(contentDraft.value, 'rsvp.enabled') ?? true),
      submitLabel: readFieldValue('rsvp_label'),
      formLabels: {
        firstName: asText(getByPath(contentDraft.value, 'rsvp.formLabels.firstName'), 'Nombre'),
        lastName: asText(getByPath(contentDraft.value, 'rsvp.formLabels.lastName'), 'Apellido'),
        dietaryRestrictions: asText(getByPath(contentDraft.value, 'rsvp.formLabels.dietaryRestrictions'), 'Restricción alimentaria'),
      },
    },
    countdown: {
      eyebrow: asText(getByPath(contentDraft.value, 'countdown.eyebrow'), 'Cuenta regresiva'),
      title: asText(getByPath(contentDraft.value, 'countdown.title'), 'Falta muy poco'),
      note: readFieldValue('countdown_note'),
      daysLabel: asText(getByPath(contentDraft.value, 'countdown.daysLabel'), '90 días'),
      hoursLabel: asText(getByPath(contentDraft.value, 'countdown.hoursLabel'), '06 horas'),
      targetDateIso: asText(getByPath(contentDraft.value, 'countdown.targetDateIso'), asText(getByPath(contentDraft.value, 'event.date.iso'))),
    },
    checkin: {
      eyebrow: asText(getByPath(contentDraft.value, 'checkin.eyebrow'), 'Bienvenida'),
      title: asText(getByPath(contentDraft.value, 'checkin.title'), 'Te esperamos para celebrar'),
      message: asText(getByPath(contentDraft.value, 'checkin.message'), 'Confirma tu asistencia cuando quieras.'),
      buttonLabel: asText(getByPath(contentDraft.value, 'checkin.buttonLabel'), 'Entrar'),
      showEventDate: Boolean(getByPath(contentDraft.value, 'checkin.showEventDate') ?? false),
      eventDateIso: asText(
        getByPath(contentDraft.value, 'checkin.eventDateIso'),
        asText(getByPath(contentDraft.value, 'event.date.iso')),
      ),
      showEntryValue: Boolean(getByPath(contentDraft.value, 'checkin.showEntryValue') ?? false),
      entry: {
        currency: asText(getByPath(contentDraft.value, 'checkin.entry.currency'), checkinCurrencyOptions[0]?.code ?? 'USD'),
        amount: Number(getByPath(contentDraft.value, 'checkin.entry.amount') ?? 0),
      },
    },
    saveDate: {
      enabled: Boolean(getByPath(contentDraft.value, 'saveDate.enabled') ?? true),
      label: asText(getByPath(contentDraft.value, 'saveDate.label'), 'Guardar fecha'),
    },
    dressCode: {
      enabled: Boolean(getByPath(contentDraft.value, 'dressCode.enabled') ?? true),
      code: asText(getByPath(contentDraft.value, 'dressCode.code')),
      title: asText(getByPath(contentDraft.value, 'dressCode.title'), 'Dress code'),
      description: asText(getByPath(contentDraft.value, 'dressCode.description'), 'Elegante sport en tonos claros.'),
    },
    faq: faqItems.value.map((item) => ({ id: item.id, question: item.question, answer: item.answer })),
    wall: {
      title: asText(getByPath(contentDraft.value, 'wall.title'), 'Muro de mensajes'),
      description: asText(getByPath(contentDraft.value, 'wall.description'), 'Deja unas palabras lindas para este gran día.'),
      addLabel: asText(getByPath(contentDraft.value, 'wall.addLabel'), 'Añadir mensaje'),
      emptyStateLabel: asText(getByPath(contentDraft.value, 'wall.emptyStateLabel'), 'Sé la primera persona en dejar un mensaje.'),
      messages: wallMessages.value
        .filter((item) => item.is_visible)
        .map((item) => ({
          id: String(item.id),
          guestName: item.guest_name,
          message: item.message,
          status: item.status,
          isVisible: item.is_visible,
          postedAt: item.posted_at,
        })),
    },
    branding: {
      visible: false,
      label: asText(getByPath(contentDraft.value, 'branding.label'), 'Creado con InvitaSR'),
    },
  }
})

const rsvpLabelsDraft = computed({
  get: () => ({
    firstName: asText(getByPath(contentDraft.value, 'rsvp.formLabels.firstName'), 'Nombre'),
    lastName: asText(getByPath(contentDraft.value, 'rsvp.formLabels.lastName'), 'Apellido'),
    dietaryRestrictions: asText(getByPath(contentDraft.value, 'rsvp.formLabels.dietaryRestrictions'), 'Restricción alimentaria'),
  }),
  set: (value: { firstName: string; lastName: string; dietaryRestrictions: string }) => {
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'rsvp.formLabels.firstName', value.firstName)
    setByPath(nextContent, 'rsvp.formLabels.lastName', value.lastName)
    setByPath(nextContent, 'rsvp.formLabels.dietaryRestrictions', value.dietaryRestrictions)
    contentDraft.value = nextContent
  },
})

const hydrateSectionVisibility = () => {
  const currentSettings = toRecord(settingsDraft.value)
  const storedVisibility = toRecord(currentSettings.section_visibility)

  const nextVisibility: Record<string, boolean> = {}
  for (const section of templateSections.value) {
    const rawValue = storedVisibility[section.key]
    nextVisibility[section.key] = typeof rawValue === 'boolean' ? rawValue : true
  }

  sectionVisibilityDraft.value = nextVisibility
  const nextSettings = cloneRecord(settingsDraft.value)
  setByPath(nextSettings, 'section_visibility', nextVisibility)
  settingsDraft.value = nextSettings
}

const loadAvailableTemplates = async () => {
  const planId = template.value?.plan_id ?? session.user?.client_plan?.plan?.id
  if (!planId) {
    availableTemplates.value = []
    return
  }

  isLoadingTemplates.value = true
  try {
    const response = await listCatalogTemplates({
      plan_id: planId,
      perPage: 100,
      page: 1,
    })

    availableTemplates.value = response.list.filter(
      (item) => String(item.status ?? 'active').toLowerCase() === 'active',
    )
  } catch {
    availableTemplates.value = []
  } finally {
    isLoadingTemplates.value = false
  }
}

const loadTemplateRenderer = async () => {
  templateModule.value = null
  const selected = selectedTemplate.value

  let loaded = null as InvitationTemplateModule<'wedding'> | null

  if (selected?.renderer_key) {
    loaded = (await loadTemplateModuleByRendererKey(selected.renderer_key)) as InvitationTemplateModule<'wedding'> | null
  }

  if (!loaded && selected?.id) {
    loaded = (await loadTemplateModule(Number(selected.id))) as InvitationTemplateModule<'wedding'> | null
  }

  if (!loaded && template.value?.renderer_key) {
    loaded = (await loadTemplateModuleByRendererKey(template.value.renderer_key)) as InvitationTemplateModule<'wedding'> | null
  }

  if (!loaded && invitation.value?.template_id) {
    loaded = (await loadTemplateModule(Number(invitation.value.template_id))) as InvitationTemplateModule<'wedding'> | null
  }

  templateModule.value = loaded
}

const syncEditor = async () => {
  isHydratingSnapshot.value = true
  try {
    title.value = String(invitation.value?.title ?? '')
    slug.value = String(invitation.value?.slug ?? '')
    selectedTemplateId.value = String(invitation.value?.template_id ?? '')
    textOverridesDraft.value = normalizeTextOverrides(invitation.value?.text_overrides)
    contentDraft.value = projectTextOverridesIntoContent(cloneRecord(invitation.value?.content), textOverridesDraft.value)
    settingsDraft.value = cloneRecord(invitation.value?.settings)
    featureOverridesDraft.value = cloneRecord(invitation.value?.feature_overrides)
    activeTextField.value = null
    showCheckinPreview.value = false
    isCheckinConfigEditing.value = false
    clearGalleryPendingChanges()
    ensureDefaultFeatureData()
    hydrateSectionVisibility()
    await loadAvailableTemplates()
    await loadTemplateRenderer()
    await loadGalleryData()
    await loadWallMessagesData()
    markStateAsSaved()
  } finally {
    isHydratingSnapshot.value = false
  }

  scheduleSlugAvailabilityCheck()
}

const loadData = async () => {
  if (!Number.isFinite(invitationId.value) || invitationId.value <= 0) {
    loadError.value = 'La invitación solicitada no es válida.'
    return
  }

  isLoading.value = true
  loadError.value = null
  editorValidationError.value = null

  try {
    const detail = await getTenantInvitation(invitationId.value)
    invitation.value = detail.invitation
    template.value = detail.template
    typeEvent.value = detail.type_event
    await syncEditor()
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar esta invitación.'
  } finally {
    isLoading.value = false
  }
}

const openDeleteWallMessagePrompt = (messageId: number) => {
  if (pendingDeleteWallMessageIds.value.includes(messageId)) return

  const message = wallMessagesInEditor.value.find((item) => item.id === messageId)
  if (!message) return
  if (updatingWallMessageIds.value.includes(messageId)) return

  pendingDeleteWallMessageId.value = messageId
  pendingDeleteWallMessageGuestName.value = message.guest_name
  pendingDeleteWallMessageText.value = message.message
  showDeleteWallPrompt.value = true
}

const closeDeleteWallMessagePrompt = () => {
  showDeleteWallPrompt.value = false
  pendingDeleteWallMessageId.value = null
  pendingDeleteWallMessageGuestName.value = ''
  pendingDeleteWallMessageText.value = ''
}

const queueDeleteWallMessage = () => {
  const messageId = pendingDeleteWallMessageId.value
  if (!messageId) return
  if (pendingDeleteWallMessageIds.value.includes(messageId)) {
    closeDeleteWallMessagePrompt()
    return
  }

  const queued = queueDeleteWallMessageById(messageId)
  closeDeleteWallMessagePrompt()
  if (queued) {
    notifySuccess('Mensaje marcado para eliminar. Se aplicará al guardar cambios.')
  }
}

const setSectionVisibility = (sectionKey: string, enabled: boolean) => {
  const nextVisibility = { ...sectionVisibilityDraft.value, [sectionKey]: enabled }
  sectionVisibilityDraft.value = nextVisibility

  const nextSettings = cloneRecord(settingsDraft.value)
  setByPath(nextSettings, 'section_visibility', nextVisibility)
  settingsDraft.value = nextSettings
}

const onSectionToggle = (sectionKey: string, event: Event) => {
  const target = event.target as HTMLInputElement | null
  const enabled = Boolean(target?.checked)
  setSectionVisibility(sectionKey, enabled)

  if (sectionKey === 'checkin' && !enabled) {
    showCheckinPreview.value = false
    isCheckinConfigEditing.value = false
  }

  if (sectionKey === 'gallery' && !enabled) {
    clearGalleryPendingChanges()
  }
}

const startTextEdit = (fieldKey: string) => {
  if (!supportsInlineEditor.value) return
  if (!editableFieldBindings[fieldKey]) return
  activeTextField.value = fieldKey
}

const finishTextEdit = () => {
  activeTextField.value = null
}

const updateFieldValue = (payload: { field: string; value: string }) => {
  const binding = editableFieldBindings[payload.field]
  if (!binding) return

  const nextContent = cloneRecord(contentDraft.value)
  const safeValue = payload.value ?? ''

  for (const path of binding.paths) {
    setByPath(nextContent, path, safeValue)
  }

  contentDraft.value = nextContent
  textOverridesDraft.value = {
    ...textOverridesDraft.value,
    [payload.field]: safeValue,
  }
}

const addFaqItem = () => {
  const nextFaq = [...faqItems.value, { id: `faq-${Date.now()}`, question: '', answer: '' }]
  const nextContent = cloneRecord(contentDraft.value)
  setByPath(nextContent, 'faq', nextFaq)
  contentDraft.value = nextContent
}

const removeFaqItem = (index: number) => {
  const nextFaq = faqItems.value.filter((_, currentIndex) => currentIndex !== index)
  const nextContent = cloneRecord(contentDraft.value)
  setByPath(nextContent, 'faq', nextFaq)
  contentDraft.value = nextContent
}

const updateFaqItem = (index: number, key: 'question' | 'answer', value: string) => {
  const nextFaq = faqItems.value.map((item, currentIndex) =>
    currentIndex === index ? { ...item, [key]: value } : item,
  )
  const nextContent = cloneRecord(contentDraft.value)
  setByPath(nextContent, 'faq', nextFaq)
  contentDraft.value = nextContent
}

const updateRsvpLabel = (key: 'firstName' | 'lastName' | 'dietaryRestrictions', value: string) => {
  rsvpLabelsDraft.value = { ...rsvpLabelsDraft.value, [key]: value }
}

const openGalleryFilePicker = () => {
  if (!canAddGalleryImages.value) return
  galleryInputRef.value?.click()
}

const clearGalleryInputValue = () => {
  if (galleryInputRef.value) {
    galleryInputRef.value.value = ''
  }
}

const onGalleryFilesSelected = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const selectedFiles = target?.files ? Array.from(target.files) : []
  if (selectedFiles.length) {
    queueGalleryFiles(selectedFiles)
  }
  clearGalleryInputValue()
}

const clearMusicInputValue = () => {
  if (musicInputRef.value) {
    musicInputRef.value.value = ''
  }
}

const openMusicFilePicker = () => {
  if (!canUploadCustomMusic.value || isUploadingMusic.value) return
  musicInputRef.value?.click()
}

const onMusicFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] ?? null
  clearMusicInputValue()
  if (!file || !invitationId.value) return

  isUploadingMusic.value = true
  try {
    const response = await uploadTenantInvitationMusicTrack(invitationId.value, file)
    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'music.title', response.music.title)
    setByPath(nextContent, 'music.artist', response.music.artist ?? 'Canción personalizada')
    setByPath(nextContent, 'music.audioUrl', response.music.public_url)
    setByPath(nextContent, 'music.youtubeUrl', null)
    setByPath(nextContent, 'music.source', 'custom_upload')
    setByPath(nextContent, 'music.trackId', response.music.id)
    contentDraft.value = nextContent
    invitation.value = response.invitation
      ? { ...(invitation.value ?? {}), ...response.invitation, content: nextContent }
      : invitation.value
    notifySuccess(response.message ?? 'Música actualizada.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos subir la música.')
  } finally {
    isUploadingMusic.value = false
  }
}

const checkSlugAvailability = async (targetSlug?: string) => {
  const value = (targetSlug ?? slug.value).trim()
  if (!value) {
    slugAvailabilityState.value = 'idle'
    slugAvailabilityReason.value = null
    return null
  }

  if (!isValidSubdomain(value)) {
    slugAvailabilityState.value = 'invalid'
    slugAvailabilityReason.value = 'invalid_format'
    return false
  }

  const currentCheckId = ++slugAvailabilityCheckId
  slugAvailabilityState.value = 'checking'
  slugAvailabilityReason.value = null

  try {
    const availability = await checkTenantInvitationSubdomainAvailability({
      slug: value,
      invitation_id: invitation.value?.id,
    })

    if (currentCheckId !== slugAvailabilityCheckId) return null

    if (availability.subdomain && availability.subdomain !== slug.value) {
      slug.value = availability.subdomain
    }

    slugAvailabilityState.value = availability.available ? 'available' : 'unavailable'
    slugAvailabilityReason.value = availability.reason
    return availability.available
  } catch {
    if (currentCheckId !== slugAvailabilityCheckId) return null
    slugAvailabilityState.value = 'idle'
    slugAvailabilityReason.value = 'error'
    return null
  }
}

const scheduleSlugAvailabilityCheck = () => {
  if (slugAvailabilityTimer) {
    clearTimeout(slugAvailabilityTimer)
    slugAvailabilityTimer = null
  }

  slugAvailabilityTimer = setTimeout(() => {
    slugAvailabilityTimer = null
    void checkSlugAvailability()
  }, 320)
}

const validateSlugBeforeSave = async (): Promise<string | null> => {
  const normalized = normalizeSubdomain(slug.value)
  if (normalized !== slug.value) {
    slug.value = normalized
  }

  if (!slug.value.trim()) {
    return 'Ingresa un subdominio para continuar.'
  }

  if (!isValidSubdomain(slug.value.trim())) {
    return 'El subdominio solo permite letras minúsculas, números y guiones (3 a 63 caracteres).'
  }

  const available = await checkSlugAvailability(slug.value.trim())
  if (available === false) {
    return slugAvailabilityReason.value === 'reserved'
      ? 'Ese subdominio está reservado. Elige otro nombre.'
      : 'Ese subdominio ya está en uso. Elige otro.'
  }
  if (available === null) {
    return 'No pudimos validar el subdominio. Intenta nuevamente.'
  }

  return null
}
const { validateBeforeSave, buildProjectedContentForSave } = useInvitationEditorSaveWorkflow({
  resolvedSectionVisibility,
  faqItems,
  countdownDatetime,
  contentDraft,
  locationItemsDraft,
  checkinShowEventDate,
  checkinShowEntryValue,
  checkinCurrencyCodes: checkinCurrencyOptions.map((option) => option.code),
  maxLocationsPerInvitation: MAX_LOCATIONS_PER_INVITATION,
  defaultLocationMapsUrl: DEFAULT_LOCATION_MAPS_URL,
  getByPath,
  setByPath,
  cloneRecord,
  asText,
  normalizeExternalUrl,
  isValidHttpUrl,
  formatDateTimeLabel24h,
  normalizeDraftLocationItem,
  createDefaultDraftLocation,
  projectTextOverridesIntoContent,
  resolveLocation: resolveTenantInvitationLocation,
})

const performSaveChanges = async () => {
  if (!invitation.value?.id) return
  const slugValidationError = await validateSlugBeforeSave()
  if (slugValidationError) {
    editorValidationError.value = slugValidationError
    notifyError(slugValidationError)
    return
  }

  editorValidationError.value = validateBeforeSave()
  if (editorValidationError.value) {
    notifyError(editorValidationError.value)
    return
  }

  try {
    const hadGalleryChanges = hasPendingGalleryChanges.value
    const hadPendingWallVisibilityChanges = hasPendingWallMessageVisibilityChanges.value
    const hadPendingWallDeletes = hasPendingWallMessageDeletes.value

    const projectedContent = await buildProjectedContentForSave()
    contentDraft.value = projectedContent

    const response = await updateTenantInvitation(invitation.value.id, {
      title: title.value.trim() || null,
      slug: slug.value.trim(),
      content: cloneRecord(projectedContent),
      text_overrides: { ...textOverridesDraft.value },
      settings: cloneRecord(settingsDraft.value),
      feature_overrides: cloneRecord(featureOverridesDraft.value),
    })

    const mergedTextOverrides = normalizeTextOverrides(response.invitation?.text_overrides ?? textOverridesDraft.value)
    const mergedContent = projectTextOverridesIntoContent(
      cloneRecord(response.invitation?.content ?? projectedContent),
      mergedTextOverrides,
    )

    const mergedInvitation: TenantInvitationItem = {
      ...(invitation.value ?? {}),
      ...(response.invitation ?? {}),
      content: cloneRecord(mergedContent),
      text_overrides: mergedTextOverrides,
      settings: cloneRecord(settingsDraft.value),
      feature_overrides: cloneRecord(featureOverridesDraft.value),
    }

    invitation.value = mergedInvitation
    textOverridesDraft.value = normalizeTextOverrides(mergedInvitation.text_overrides)
    title.value = String(mergedInvitation.title ?? title.value)
    slug.value = String(mergedInvitation.slug ?? slug.value)
    selectedTemplateId.value = String(mergedInvitation.template_id ?? selectedTemplateId.value)

    if (hadGalleryChanges) {
      try {
        await persistPendingGalleryImages()
      } catch (error) {
        const payload = error as { message?: string }
        notifyError(payload?.message ?? 'Guardamos los cambios de texto, pero no pudimos actualizar la galería.')
        return
      }
    }

    if (hadPendingWallDeletes) {
      try {
        await persistPendingWallMessageDeletes()
      } catch (error) {
        const payload = error as { message?: string }
        notifyError(payload?.message ?? 'Guardamos tus cambios, pero no pudimos eliminar uno o más mensajes del muro.')
        return
      }
    }

    if (hadPendingWallVisibilityChanges) {
      try {
        await persistPendingWallMessageVisibilityChanges()
      } catch (error) {
        const payload = error as { message?: string }
        notifyError(payload?.message ?? 'Guardamos tus cambios, pero no pudimos actualizar la visibilidad de uno o más mensajes.')
        return
      }
    }

    markStateAsSaved()
    notifySuccess(response.message ?? 'Cambios guardados.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos guardar la invitación.')
  }
}

const performApplyTemplateChange = async () => {
  if (!invitation.value?.id || !selectedTemplateId.value || !isDraft.value || !hasPendingTemplateChange.value) return

  try {
    const response = await updateTenantInvitation(invitation.value.id, {
      template_id: Number(selectedTemplateId.value),
      reset_content: true,
      text_overrides: {},
    })
    invitation.value = response.invitation
    await loadData()
    notifySuccess('Estilo actualizado. Ya puedes seguir editando.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos cambiar el estilo de la invitación.')
  }
}

const performPublishInvitation = async () => {
  if (!invitation.value?.id) return

  try {
    const response = await publishTenantInvitation(invitation.value.id)
    invitation.value = response.invitation
    await syncEditor()
    notifySuccess(response.message ?? 'Invitación publicada.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos publicar la invitación.')
  }
}
const {
  isSaving,
  isPublishing,
  isChangingTemplate,
  saveChanges,
  applyTemplateChange,
  publishInvitation,
} = useInvitationEditorPersistence({
  save: performSaveChanges,
  applyTemplateChange: performApplyTemplateChange,
  publishInvitation: performPublishInvitation,
})

const serializedEditorState = computed(() =>
  JSON.stringify({
    title: title.value,
    slug: slug.value,
    selectedTemplateId: selectedTemplateId.value,
    content: contentDraft.value,
    textOverrides: textOverridesDraft.value,
    settings: settingsDraft.value,
    featureOverrides: featureOverridesDraft.value,
    sectionVisibility: sectionVisibilityDraft.value,
    activeTextField: activeTextField.value,
    showCheckinPreview: showCheckinPreview.value,
    isCheckinConfigEditing: isCheckinConfigEditing.value,
    pendingGallerySignature: pendingGalleryImages.value.map((item) => `${item.name}:${item.sizeBytes}`),
    removedGalleryImageIds: removedGalleryImageIds.value,
    pendingDeleteWallMessageIds: pendingDeleteWallMessageIds.value,
    pendingWallMessageVisibilityById: pendingWallMessageVisibilityById.value,
  }),
)
const {
  canUndo,
  hasUnsavedChanges,
  markStateAsSaved,
  undoLastChange,
} = useInvitationEditorHistory<EditorSnapshot>({
  serializedState: serializedEditorState,
  isHydratingSnapshot,
  isApplyingUndo,
  isLoading,
  createSnapshot,
  cloneSnapshot,
  resolveSnapshotFromSerializedState: snapshotFromSerializedState,
  applySnapshot,
})

const isTargetEditable = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

const handleEditorHotkeys = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isThemeColorModalOpen.value) {
    event.preventDefault()
    closeThemeColorModal()
    return
  }

  if (event.key === 'Escape' && isImmersivePreviewOpen.value) {
    event.preventDefault()
    closeImmersivePreview()
    return
  }

  if (event.key === 'Escape' && showHelpModal.value) {
    event.preventDefault()
    closeHelpModal()
    return
  }

  if (event.key === 'Escape' && showDeleteWallPrompt.value) {
    event.preventDefault()
    closeDeleteWallMessagePrompt()
    return
  }

  if (event.key === 'Escape' && isSidebarOpen.value) {
    event.preventDefault()
    closeSidebar()
    return
  }

  const isSaveKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
  if (isSaveKey) {
    event.preventDefault()
    if (!isSaving.value && !isLoading.value) {
      void saveChanges()
    }
    return
  }

  const isPublishKey = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p'
  if (isPublishKey) {
    event.preventDefault()
    if (isDraft.value && !isPublishing.value && !isLoading.value) {
      void publishInvitation()
    }
    return
  }

  const isUndoKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey
  if (!isUndoKey) return
  if (isTargetEditable(event.target)) return
  if (!canUndo.value) return

  event.preventDefault()
  void undoLastChange()
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(selectedTemplateId, () => {
  void loadTemplateRenderer()
})

watch(slug, (nextValue, previousValue) => {
  if (nextValue === previousValue) return

  const normalized = normalizeSubdomain(nextValue)
  if (normalized !== nextValue) {
    slugInputError.value = 'Solo se permiten letras minúsculas, números y guiones.'
    slug.value = normalized
    return
  }

  slugInputError.value = null
  if (!normalized) {
    slugAvailabilityState.value = 'idle'
    slugAvailabilityReason.value = null
    return
  }

  if (!isValidSubdomain(normalized)) {
    slugAvailabilityState.value = 'invalid'
    slugAvailabilityReason.value = 'invalid_format'
    return
  }

  scheduleSlugAvailabilityCheck()
})

watch(effectivePreviewDevice, (nextDevice) => {
  if (previewDevice.value === nextDevice) return
  previewDevice.value = nextDevice
})

watch(isImmersivePreviewOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(showCheckinPreview, (isOpen) => {
  if (!isOpen) {
    isCheckinConfigEditing.value = false
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleEditorHotkeys)
  window.addEventListener('beforeunload', handleBeforeUnload)
  void loadData()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEditorHotkeys)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (slugAvailabilityTimer) {
    clearTimeout(slugAvailabilityTimer)
    slugAvailabilityTimer = null
  }
  document.body.style.overflow = ''
})

onBeforeRouteLeave((to) => {
  if (skipNextLeaveConfirm.value) {
    skipNextLeaveConfirm.value = false
    return true
  }
  if (!hasUnsavedChanges.value) return true
  pendingNavigationPath.value = to.fullPath
  showLeavePrompt.value = true
  return false
})
</script>

<template>
  <Teleport to="#panel-topbar-left-slot">
    <button type="button" class="editor-topbar-back" @click="goBackToInvitations">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m14 6-6 6 6 6" />
      </svg>
      <span>Volver</span>
    </button>
  </Teleport>

  <Teleport to="#panel-topbar-right-slot">
    <button type="button" class="editor-topbar-help" aria-label="Ayuda del editor" title="Ayuda del editor"
      @click="openHelpModal">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1-1.3 2"></path>
        <circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none"></circle>
      </svg>
      <span>Ayuda</span>
    </button>
    <button type="button" class="editor-topbar-undo" :disabled="!canUndo || isLoading" aria-label="Deshacer"
      title="Deshacer (Ctrl/Cmd + Z)" @click="undoLastChange">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 14-5-5 5-5" />
        <path d="M20 20a8 8 0 0 0-8-8H4" />
      </svg>
    </button>
    <BaseButton type="button" variant="primary" class="editor-topbar-action editor-topbar-action--save"
      :disabled="isSaving || isLoading || isUploadingGallery" aria-label="Guardar cambios"
      title="Guardar (Ctrl/Cmd + S)" @click="saveChanges">
      <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4" />
        <path d="M8 20v-6h8v6" />
      </svg>
      <span class="action-label">{{ isSaving || isUploadingGallery ? 'Guardando...' : 'Guardar cambios' }}</span>
    </BaseButton>
    <BaseButton v-if="isDraft" type="button" variant="primary"
      class="editor-topbar-action editor-topbar-action--publish" :disabled="isPublishing || isLoading"
      aria-label="Publicar invitación" title="Publicar (Ctrl/Cmd + Shift + P)" @click="publishInvitation">
      <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11.5 21 3l-6.8 18-2.8-6.7L3 11.5Z" />
        <path d="m21 3-9.6 11.3" />
      </svg>
      <span class="action-label">{{ isPublishing ? 'Publicando...' : 'Publicar invitación' }}</span>
    </BaseButton>
  </Teleport>

  <section class="client-page" aria-labelledby="client-editor-kicker">
    <header class="editor-head bo-card">
      <div>
        <p id="client-editor-kicker" class="client-kicker">Editor de invitación</p>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note error">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando editor...</p>
    <p v-if="editorValidationError" class="client-inline-note error">{{ editorValidationError }}</p>

    <section v-if="!isLoading && !loadError" class="editor-layout">
      <div class="editor-main">
        <div class="bo-card preview-toolbar">
          <div class="preview-toolbar-main">
            <div class="device-tabs" role="tablist" aria-label="Vista responsive">
              <button v-for="option in deviceOptions" :key="option.value" type="button" class="device-tab"
                :class="{ active: previewDevice === option.value }" @click="selectPreviewDevice(option.value)">
                {{ option.label }}
              </button>
            </div>
            <div class="preview-zoom-controls" role="group" aria-label="Controles de zoom del editor">
              <button type="button" class="preview-zoom-btn" aria-label="Reducir zoom"
                @click="adjustPreviewZoom(-ZOOM_STEP_PERCENT)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <input class="preview-zoom-slider" type="range" :min="ZOOM_MIN_PERCENT" :max="ZOOM_MAX_PERCENT"
                :step="ZOOM_STEP_PERCENT" :value="previewZoomPercent" aria-label="Zoom del editor"
                @input="handleZoomInput" />
              <button type="button" class="preview-zoom-btn" aria-label="Aumentar zoom"
                @click="adjustPreviewZoom(ZOOM_STEP_PERCENT)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button type="button" class="preview-zoom-reset" aria-label="Restablecer zoom" @click="resetPreviewZoom">
                {{ previewZoomLabel }}
              </button>
            </div>
            <p class="preview-zoom-hint" :class="{ 'preview-zoom-hint--active': isZoomShiftingViewport }">
              Vista activa: {{ effectivePreviewDeviceLabel }}
            </p>
          </div>
          <button type="button" class="editor-immersive-trigger" aria-label="Abrir vista inmersiva"
            title="Abrir vista inmersiva" @click="openImmersivePreview">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5" />
              <path d="M20 9V4h-5" />
              <path d="M4 15v5h5" />
              <path d="M20 15v5h-5" />
            </svg>
            <span>Vista inmersiva</span>
          </button>
        </div>

        <article class="bo-card preview-card">
          <p v-if="supportsInlineEditor" class="preview-help">
            Doble click sobre cualquier texto para editarlo.
          </p>
          <p v-else class="preview-help">
            Esta plantilla aún no tiene edición visual directa.
          </p>

          <p v-if="!templateModule" class="preview-note">No encontramos una vista para este estilo.</p>

          <div v-else class="preview-stage" @wheel="handlePreviewWheelZoom">
            <div class="preview-frame" :class="previewViewportClass" :style="previewFrameStyle">
              <component :is="templateModule.component" v-if="supportsInlineEditor"
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest" :data="previewData"
                :invitation-title="title || invitation?.title || ''" :type-event-name="typeEvent?.name || ''"
                :editable="true" :constrained-overlay="true" :preview-viewport="effectivePreviewDevice"
                :preview-zoom-percent="previewZoomPercent" :active-field="activeTextField"
                :section-visibility="previewSectionVisibility"
                :checkin-preview="showCheckinPreview && previewSectionVisibility['checkin']" @start-edit="startTextEdit"
                @update-field="updateFieldValue" @finish-edit="finishTextEdit"
                @checkin-preview-closed="onCheckinPreviewClosed" />
              <component :is="templateModule.component" v-else
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest" :data="previewData"
                :invitation-title="title || invitation?.title || ''" :type-event-name="typeEvent?.name || ''"
                :preview-viewport="effectivePreviewDevice" :preview-zoom-percent="previewZoomPercent" />
            </div>
          </div>
        </article>
      </div>

      <Transition name="config-overlay">
        <button v-if="isSidebarOpen" type="button" class="config-overlay" aria-label="Ocultar configuración"
          @click="closeSidebar"></button>
      </Transition>

      <Transition name="config-drawer">
        <aside v-if="isSidebarOpen" class="config-drawer" role="dialog" aria-modal="true"
          aria-label="Configuración del editor">
          <div class="config-drawer__shell">
            <header class="config-drawer__header">
              <div class="config-drawer__title-wrap">
                <p class="config-drawer__eyebrow">Modo editor</p>
                <h2>{{ configDrawerTitle }}</h2>
                <p class="config-drawer__subtitle">{{ configDrawerSubtitle }}</p>
              </div>
              <button type="button" class="config-drawer__close" aria-label="Cerrar configuración"
                title="Cerrar configuración" @click="closeSidebar">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <div class="config-drawer__body">
              <input ref="galleryInputRef" class="gallery-file-input-hidden" type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple @change="onGalleryFilesSelected" />
              <input ref="musicInputRef" class="gallery-file-input-hidden" type="file"
                accept=".mp3,.m4a,.mp4,.aac,.ogg,.wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav"
                @change="onMusicFileSelected" />

              <Transition name="config-panel-swap" mode="out-in">
                <div :key="activeConfigTarget" class="config-panel-slot">
                  <section v-if="activeConfigTarget === 'config-content'" id="config-content"
                    class="config-block config-block--content">
                    <label class="field">
                      <span>Título</span>
                      <input v-model="title" type="text" placeholder="Ej: Boda de Sofía y Mateo" />
                    </label>

                    <label class="field">
                      <span>Enlace corto (Subdominio)</span>
                      <input v-model="slug" type="text" maxlength="63" autocapitalize="off" autocomplete="off"
                        spellcheck="false" placeholder="boda-sofia-mateo" />
                      <small class="field-hint">Usa solo letras minúsculas, números y guiones.</small>
                      <small class="field-hint field-hint--subdomain">{{ subdomainChangeHelp }}</small>
                      <small class="field-alert" :class="slugAvailabilityClass">{{ slugAvailabilityMessage }}</small>
                    </label>
                  </section>

                  <section v-else-if="activeConfigTarget === 'config-style'" id="config-style"
                    class="config-block config-block--style">
                    <h3>Estilo de plantilla</h3>
                    <p v-if="isDraft">Puedes cambiar el estilo mientras sea borrador.</p>
                    <p v-else>El estilo queda fijo después de publicar.</p>

                    <label class="field">
                      <span>Plantilla</span>
                      <select v-model="selectedTemplateId"
                        :disabled="!isDraft || isChangingTemplate || isLoadingTemplates">
                        <option v-for="item in availableTemplates" :key="String(item.id)" :value="String(item.id)">
                          {{ item.name ?? `Plantilla #${item.id}` }}
                        </option>
                      </select>
                    </label>

                    <BaseButton v-if="isDraft" type="button" variant="ghost"
                      :disabled="!hasPendingTemplateChange || isChangingTemplate" @click="applyTemplateChange">
                      {{ isChangingTemplate ? 'Aplicando estilo...' : 'Aplicar estilo' }}
                    </BaseButton>

                    <div class="theme-color-panel">
                      <div class="theme-color-panel__head theme-color-panel__head--action">
                        <div>
                          <h4>Colores</h4>
                          <p>Define la base visual de toda la invitación.</p>
                        </div>
                        <button type="button" class="theme-reset-colors-button" aria-label="Restablecer colores"
                          title="Restablecer colores" @click="resetThemeColorsToTemplateDefaults">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 4v6h6" />
                            <path d="M20 12a8 8 0 0 1-13.66 5.66L4 15.32" />
                            <path d="M4 10a8 8 0 0 1 13.66-5.66L20 6.68" />
                          </svg>
                        </button>
                      </div>

                      <article v-for="field in globalThemeColorFields" :key="field.key"
                        class="theme-color-card theme-color-card--row">
                        <button type="button" class="theme-color-card__button"
                          :aria-label="`Personalizar ${field.label}`" @click="openThemeColorModal(field)">
                          <span class="theme-color-card__content">
                            <strong>{{ field.label }}</strong>
                            <small v-if="field.description">{{ field.description }}</small>
                          </span>
                          <span class="theme-color-card__visual">
                            <span class="theme-color-card__preview"
                              :style="{ background: themeColorPreview(field) }"></span>
                            <span class="theme-color-card__chevron" aria-hidden="true">›</span>
                          </span>
                        </button>

                        <CanvaColorStudio v-if="activeThemeColorField?.key === field.key" inline
                          :title="activeThemeColorStudioTitle" :color="activeThemeColorStudioColor"
                          :gradient="activeThemeColorStudioGradient" :preset-colors="themePresetColors"
                          :custom-colors="activeThemeCustomColors"
                          :gradient-types="themeGradientTypeOptions"
                          :max-gradient-colors="MAX_THEME_GRADIENT_COLORS"
                          :allow-gradient="field.supportsGradient !== false"
                          @close="closeThemeColorModal" @update-color="updateActiveThemeColor"
                          @update-custom-colors="updateThemeCustomPalette"
                          @update-gradient="updateActiveThemeGradient" />
                      </article>
                    </div>
                  </section>

                  <section v-else-if="selectedOptionalSections.length" id="config-sections"
                    class="config-block config-block--sections">
                    <div class="option-group">
                      <article v-for="section in selectedOptionalSections" :id="`config-section-${section.key}`"
                        :key="section.key" class="feature-item">
                        <div class="feature-switch-panel"
                          :class="{ 'is-active': resolvedSectionVisibility[section.key] }">
                          <div>
                            <strong>{{ resolvedSectionVisibility[section.key] ? 'Visible en la invitación' : 'Oculto por ahora' }}</strong>
                            <p>{{ resolvedSectionVisibility[section.key] ? 'Tus invitados podrán ver esta parte.' : 'Actívalo cuando quieras mostrarlo.' }}</p>
                          </div>
                          <label class="switch" @click.stop>
                            <input type="checkbox" :checked="resolvedSectionVisibility[section.key]" @click.stop
                              @change="onSectionToggle(section.key, $event)" />
                            <span class="switch-track"></span>
                          </label>
                        </div>

                    <div class="feature-body"
                      :class="{ 'feature-body--disabled': !resolvedSectionVisibility[section.key] }">
                      <div v-if="hasSectionThemeColorFields(section.key)"
                        class="option-panel option-panel--section-color">
                        <button type="button" class="section-color-toggle"
                          :aria-expanded="isSectionColorPanelOpen(section.key) ? 'true' : 'false'"
                          @click="toggleSectionColorPanel(section.key)">
                          <span>Colores</span>
                          <svg :class="{ 'is-open': isSectionColorPanelOpen(section.key) }" viewBox="0 0 24 24"
                            aria-hidden="true">
                            <path d="m7 10 5 5 5-5" />
                          </svg>
                        </button>

                        <div v-if="isSectionColorPanelOpen(section.key)" class="section-color-list">
                          <article v-for="field in getVisibleSectionThemeColorFields(section.key)" :key="field.key"
                            class="theme-color-card theme-color-card--row">
                            <button type="button" class="theme-color-card__button"
                              :aria-label="`Personalizar ${field.label}`" @click="openThemeColorModal(field)">
                              <span class="theme-color-card__content">
                                <strong>{{ field.label }}</strong>
                                <small v-if="field.description">{{ field.description }}</small>
                              </span>
                              <span class="theme-color-card__visual">
                                <span class="theme-color-card__preview"
                                  :style="{ background: themeColorPreview(field) }"></span>
                                <span class="theme-color-card__chevron" aria-hidden="true">›</span>
                              </span>
                            </button>
                            <CanvaColorStudio v-if="activeThemeColorField?.key === field.key" inline
                              :title="activeThemeColorStudioTitle" :color="activeThemeColorStudioColor"
                              :gradient="activeThemeColorStudioGradient" :preset-colors="themePresetColors"
                              :custom-colors="activeThemeCustomColors"
                              :gradient-types="themeGradientTypeOptions"
                              :max-gradient-colors="MAX_THEME_GRADIENT_COLORS"
                              :allow-gradient="field.supportsGradient !== false"
                              @close="closeThemeColorModal" @update-color="updateActiveThemeColor"
                              @update-custom-colors="updateThemeCustomPalette"
                              @update-gradient="updateActiveThemeGradient" />
                          </article>
                        </div>
                      </div>
                      <div v-if="section.key === 'checkin'" class="option-panel">
                        <BaseButton type="button" variant="ghost" :disabled="isCheckinConfigEditing"
                          @click="onCheckinAction">
                          {{ checkinActionLabel }}
                        </BaseButton>

                        <p v-if="showCheckinPreview && !isCheckinConfigEditing" class="field-hint">
                          La vista previa está activa. Pulsa <strong>Editar</strong> para personalizarla.
                        </p>

                        <div v-if="isCheckinConfigEditing" class="checkin-config-grid">
                          <div class="feature-inline-switch">
                            <span>Mostrar fecha del evento</span>
                            <label class="switch">
                              <input v-model="checkinShowEventDate" type="checkbox" />
                              <span class="switch-track"></span>
                            </label>
                          </div>

                          <label v-if="checkinShowEventDate" class="field">
                            <span>Fecha del evento</span>
                            <input v-model="checkinEventDatetime" type="datetime-local" />
                          </label>

                          <div class="feature-inline-switch">
                            <span>Mostrar valor de entrada</span>
                            <label class="switch">
                              <input v-model="checkinShowEntryValue" type="checkbox" />
                              <span class="switch-track"></span>
                            </label>
                          </div>

                          <template v-if="checkinShowEntryValue">
                            <label class="field">
                              <span>Moneda</span>
                              <select v-model="checkinEntryCurrency">
                                <option v-for="currency in checkinCurrencyOptions" :key="currency.code"
                                  :value="currency.code">
                                  {{ currency.label }}
                                </option>
                              </select>
                            </label>

                            <label class="field">
                              <span>Monto</span>
                              <input v-model.number="checkinEntryAmount" type="number" step="0.01" min="0"
                                placeholder="0.00" />
                            </label>
                          </template>
                        </div>
                      </div>

                      <div v-else-if="section.key === 'countdown'" class="option-panel">
                        <label class="field">
                          <span>Fecha objetivo</span>
                          <input v-model="countdownDatetime" type="datetime-local" :min="minAllowedCountdownDatetime" />
                        </label>
                      </div>

                      <div v-else-if="section.key === 'music'" class="option-panel">
                        <label class="field">
                          <span>Canción</span>
                          <select v-model="musicSelection">
                            <option v-if="asText(getByPath(contentDraft, 'music.audioUrl'))" value="custom">
                              Canción personalizada cargada
                            </option>
                            <option v-for="song in musicOptions" :key="song.id" :value="song.id">
                              {{ song.label }}
                            </option>
                          </select>
                        </label>
                        <div class="music-upload-panel">
                          <p v-if="asText(getByPath(contentDraft, 'music.audioUrl'))">
                            Sonará: <strong>{{ asText(getByPath(contentDraft, 'music.title'), 'Mi canción') }}</strong>
                          </p>
                          <p v-else>
                            Todavía no hay un archivo de audio cargado para reproducir.
                          </p>
                          <button
                            type="button"
                            class="config-secondary-action"
                            :disabled="!canUploadCustomMusic || isUploadingMusic"
                            @click="openMusicFilePicker">
                            {{ isUploadingMusic ? 'Subiendo...' : 'Subir música personalizada' }}
                          </button>
                          <small v-if="!canUploadCustomMusic">La música personalizada está disponible en Pro y Planner.</small>
                          <small v-else>Formatos permitidos: MP3, M4A, AAC, OGG o WAV. Máximo 15 MB.</small>
                        </div>
                      </div>

                      <div v-else-if="section.key === 'gallery'" class="option-panel">
                        <div class="gallery-panel-head">
                          <p>{{ galleryCounterLabel }}</p>
                          <button type="button" class="gallery-add-btn"
                            :disabled="!canAddGalleryImages || isUploadingGallery" aria-label="Agregar imagen"
                            title="Agregar imagen" @click="openGalleryFilePicker">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                        </div>
                        <p class="gallery-panel-copy">Sube JPG, JPEG o PNG. Las imágenes se guardan al pulsar Guardar
                          cambios.</p>
                        <p v-if="!isLoadingGallery && !gallerySummary.enabled" class="gallery-panel-copy">
                          Tu plan actual no incluye galería de imágenes.
                        </p>
                        <p v-if="galleryProcessingHint" class="gallery-panel-copy gallery-panel-copy--processing">
                          {{ galleryProcessingHint }}
                        </p>
                        <p v-if="isLoadingGallery" class="gallery-panel-copy">Cargando galería...</p>
                        <p v-else-if="galleryRemainingSlots !== null" class="gallery-panel-copy">
                          Puedes agregar {{ galleryRemainingSlots }} imagen{{ galleryRemainingSlots === 1 ? '' : 'es' }}
                          más.
                        </p>

                        <div class="gallery-pill-grid">
                          <article v-for="item in galleryVisualItems" :key="item.id" class="gallery-pill" :class="[
                            item.kind === 'pending' ? 'gallery-pill--pending' : '',
                            item.statusClass === 'processing' ? 'gallery-pill--processing' : '',
                            item.statusClass === 'failed' ? 'gallery-pill--failed' : '',
                          ]" :title="item.name">
                            <div class="gallery-pill-main">
                              <span>{{ item.shortName }}</span>
                              <small :title="getGalleryItemStatusTitle(item)">{{ item.statusLabel }}</small>
                            </div>
                            <button type="button" class="gallery-pill-remove" aria-label="Quitar imagen"
                              title="Quitar imagen" @click="removeGalleryVisualItem(item)">
                              <span aria-hidden="true">×</span>
                            </button>
                          </article>
                        </div>

                        <div v-if="removedGalleryImageIds.length" class="gallery-removed-actions">
                          <button type="button" class="link-button" @click="restoreAllRemovedGalleryImages">
                            Deshacer eliminaciones ({{ removedGalleryImageIds.length }})
                          </button>
                        </div>
                      </div>

                      <div v-else-if="section.key === 'faq'" class="option-panel">
                        <div class="faq-editor">
                          <article v-for="(item, index) in faqItems" :key="item.id" class="faq-item">
                            <label class="field">
                              <span>Pregunta</span>
                              <input :value="item.question" type="text" placeholder="Ej: ¿Hay dress code?"
                                @input="updateFaqItem(index, 'question', ($event.target as HTMLInputElement).value)" />
                            </label>

                            <label class="field">
                              <span>Respuesta</span>
                              <textarea :value="item.answer" rows="2" placeholder="Ej: Sí, elegante sport."
                                @input="updateFaqItem(index, 'answer', ($event.target as HTMLTextAreaElement).value)" />
                            </label>

                            <button type="button" class="link-button" @click="removeFaqItem(index)">Quitar</button>
                          </article>
                        </div>
                        <BaseButton type="button" variant="ghost" @click="addFaqItem">Agregar pregunta</BaseButton>
                      </div>

                      <div v-else-if="section.key === 'wall'" class="option-panel">
                        <p class="gallery-panel-copy">
                          {{ isLoadingWallMessages
                            ? 'Cargando mensajes...'
                            : `Mensajes recibidos: ${wallUsedCountInEditor}${wallSummary.limit === null ? '' : ` /
                          ${wallSummary.limit}`}` }}
                        </p>
                        <p v-if="!isLoadingWallMessages" class="gallery-panel-copy">
                          Visibles en la invitación: {{ wallVisibleCountInEditor }}
                        </p>
                        <p v-if="!isLoadingWallMessages && hasPendingWallMessageDeletes" class="gallery-panel-copy">
                          Tienes {{ pendingDeleteWallMessageIds.length }} mensaje{{ pendingDeleteWallMessageIds.length
                          === 1 ? '' : 's' }}
                          pendiente{{ pendingDeleteWallMessageIds.length === 1 ? '' : 's' }} de eliminación. Se aplicará
                          al guardar cambios.
                        </p>
                        <p v-if="!isLoadingWallMessages && hasPendingWallMessageVisibilityChanges"
                          class="gallery-panel-copy">
                          Tienes cambios de visibilidad pendientes. Se aplicarán al guardar cambios.
                        </p>
                        <p v-if="!wallSummary.enabled && !isLoadingWallMessages" class="gallery-panel-copy">
                          Tu plan actual no tiene activo el muro de mensajes.
                        </p>

                        <div class="faq-editor">
                          <article v-for="item in wallMessagesInEditor" :key="item.id"
                            class="faq-item wall-message-item">
                            <div class="wall-message-item__head">
                              <strong>{{ item.guest_name }}</strong>
                              <small>{{ formatWallMessageDate(item.posted_at) }}</small>
                            </div>
                            <p class="wall-message-item__text">
                              {{ wallEditorDisplayText(item.id, item.message) }}
                            </p>
                            <button v-if="wallEditorMessageIsLong(item.message)" type="button"
                              class="wall-message-item__more" @click="toggleWallEditorMessageExpanded(item.id)">
                              {{ wallEditorMessageExpanded(item.id) ? 'Ver menos' : 'Ver más' }}
                            </button>

                            <div class="wall-message-item__actions">
                              <div class="feature-inline-switch feature-inline-switch--compact">
                                <label class="switch" title="Mostrar u ocultar mensaje en la invitación">
                                  <span class="sr-only">
                                    {{ item.is_visible ? 'Desactivar mensaje en la invitación' : 'Activar mensaje en la invitación' }}
                                  </span>
                                  <input type="checkbox" :checked="item.is_visible"
                                    :aria-label="item.is_visible ? 'Desactivar mensaje en invitación' : 'Activar mensaje en invitación'"
                                    :disabled="isSaving || isWallMessageUpdating(item.id)"
                                    @change="updateWallMessageVisibility(item.id, ($event.target as HTMLInputElement).checked)" />
                                  <span class="switch-track"></span>
                                </label>
                              </div>
                              <button type="button" class="wall-message-delete-btn"
                                :disabled="isSaving || isWallMessageUpdating(item.id)" aria-label="Eliminar mensaje"
                                title="Eliminar mensaje" @click="openDeleteWallMessagePrompt(item.id)">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M4 7h16" />
                                  <path d="M9 7V5h6v2" />
                                  <path d="M8 7v12h8V7" />
                                  <path d="M11 11v5" />
                                  <path d="M13 11v5" />
                                </svg>
                              </button>
                            </div>
                          </article>
                        </div>

                        <p v-if="!isLoadingWallMessages && !wallMessagesInEditor.length" class="gallery-panel-copy">
                          Aún no llegaron mensajes de invitados.
                        </p>
                      </div>

                      <div v-else-if="section.key === 'rsvp'" class="option-panel">
                        <p>Campos del plan Basic: Nombre, Apellido y Restricción alimentaria.</p>

                        <label class="field">
                          <span>Etiqueta Nombre</span>
                          <input :value="rsvpLabelsDraft.firstName" type="text"
                            @input="updateRsvpLabel('firstName', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <label class="field">
                          <span>Etiqueta Apellido</span>
                          <input :value="rsvpLabelsDraft.lastName" type="text"
                            @input="updateRsvpLabel('lastName', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <label class="field">
                          <span>Etiqueta Restricción alimentaria</span>
                          <input :value="rsvpLabelsDraft.dietaryRestrictions" type="text"
                            @input="updateRsvpLabel('dietaryRestrictions', ($event.target as HTMLInputElement).value)" />
                        </label>
                      </div>

                      <div v-else-if="section.key === 'location'" class="option-panel option-panel--location">
                        <div class="location-panel-head">
                          <p class="location-panel-title">
                            Puedes agregar hasta {{ MAX_LOCATIONS_PER_INVITATION }} ubicaciones.
                          </p>
                          <button type="button" class="location-add-btn" :disabled="!canAddLocationDraft"
                            @click="addLocationDraft">
                            + Añadir
                          </button>
                        </div>

                        <p class="gallery-panel-copy">
                          Ubicaciones configuradas: {{ locationItemsDraft.length }} / {{ MAX_LOCATIONS_PER_INVITATION }}
                        </p>

                        <article v-for="(locationItem, locationIndex) in locationItemsDraft"
                          :key="`location-${locationIndex}`" class="location-item-card">
                          <header class="location-item-card__head">
                            <strong>Ubicación {{ locationIndex + 1 }}</strong>
                            <button type="button" class="location-remove-btn" :disabled="locationItemsDraft.length <= 1"
                              @click="removeLocationDraft(locationIndex)">
                              Quitar
                            </button>
                          </header>

                          <label class="field">
                            <span>Enlace de Google Maps</span>
                            <input :value="locationItem.mapsUrl" type="url" inputmode="url"
                              placeholder="https://maps.google.com/..."
                              @input="updateLocationDraftField(locationIndex, 'mapsUrl', ($event.target as HTMLInputElement).value)" />
                            <small class="field-hint field-hint--location">
                              Pega el enlace del lugar. Al guardar, convertimos la ubicación a formato compatible para
                              Maps y Uber.
                            </small>
                          </label>

                          <div
                            v-if="locationItem.placeId || (locationItem.latitude !== null && locationItem.longitude !== null) || locationItem.mapsCanonicalUrl"
                            class="location-meta">
                            <p v-if="locationItem.placeId" class="field-hint field-hint--location">
                              <strong>Destino detectado:</strong> {{ locationItem.placeId }}
                            </p>
                            <p v-if="locationItem.latitude !== null && locationItem.longitude !== null"
                              class="field-hint field-hint--location">
                              <strong>Coordenadas:</strong> {{ locationItem.latitude.toFixed(6) }}, {{
                              locationItem.longitude.toFixed(6) }}
                            </p>
                            <p v-if="locationItem.mapsCanonicalUrl" class="field-hint field-hint--location">
                              <strong>Enlace canónico:</strong>
                              <code>{{ locationItem.mapsCanonicalUrl }}</code>
                            </p>
                          </div>

                          <div class="feature-inline-switch">
                            <span>Mostrar botón de Uber</span>
                            <label class="switch">
                              <input :checked="locationItem.uberEnabled" type="checkbox"
                                @change="updateLocationDraftField(locationIndex, 'uberEnabled', ($event.target as HTMLInputElement).checked)" />
                              <span class="switch-track"></span>
                            </label>
                          </div>

                          <label v-if="locationItem.uberEnabled" class="field">
                            <span>Enlace de Uber (opcional)</span>
                            <input :value="locationItem.uberUrl" type="url" inputmode="url"
                              placeholder="https://m.uber.com/ul/?action=setPickup"
                              @input="updateLocationDraftField(locationIndex, 'uberUrl', ($event.target as HTMLInputElement).value)" />
                            <small class="field-hint field-hint--location">
                              Si lo dejas vacío, se arma automáticamente desde Google Maps.
                            </small>
                          </label>
                        </article>
                      </div>

                      <div v-else-if="section.key === 'saveDate'" class="option-panel">
                        <p>Se activará para invitados cuando publiques la invitación.</p>
                      </div>

                      <div v-else-if="section.key === 'dressCode'" class="option-panel">
                        <label class="field">
                          <span>Tipo de vestimenta</span>
                          <select v-model="selectedDressCode">
                            <option v-for="option in dressCodeOptions" :key="option.code" :value="option.code">
                              {{ option.label }}
                            </option>
                          </select>
                        </label>
                        <p>
                          {{dressCodeOptions.find((option) => option.code === selectedDressCode)?.description}}
                        </p>
                      </div>

                      <div v-else class="option-panel">
                        <h4>{{ section.label }}</h4>
                      </div>

                    </div>
                      </article>
                    </div>
                  </section>
                </div>
              </Transition>
            </div>
          </div>
        </aside>
      </Transition>

      <nav class="editor-config-bar" :class="{ 'is-collapsed': isConfigBarCollapsed }"
        aria-label="Configuración rápida de la invitación">
        <div class="editor-config-bar__inner">
          <span v-if="hoveredConfigTooltip" class="editor-config-bar__tooltip"
            :style="{ left: `${hoveredConfigTooltip.left}px` }">
            {{ hoveredConfigTooltip.label }}
          </span>

          <button type="button" class="editor-config-bar__toggle"
            :aria-label="isConfigBarCollapsed ? 'Mostrar configuración' : 'Minimizar configuración'"
            :title="isConfigBarCollapsed ? 'Mostrar configuración' : 'Minimizar configuración'"
            @click="toggleConfigBarCollapsed">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path :d="isConfigBarCollapsed ? 'm7 14 5-5 5 5' : 'm7 10 5 5 5-5'" />
            </svg>
          </button>

          <div class="editor-config-bar__scroll-wrap">
            <button type="button" class="editor-config-bar__scroll-btn editor-config-bar__scroll-btn--left"
              aria-label="Ver opciones anteriores" title="Ver opciones anteriores" @click="scrollConfigBar('left')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <div ref="configBarScrollRef" class="editor-config-bar__scroll" role="list">
              <button v-for="item in configBarItems" :key="item.key" type="button" class="editor-config-bar__item"
                :class="{ 'is-active': isSidebarOpen && activeConfigTarget === item.target }" :data-label="item.label"
                :aria-label="item.label" :title="item.label" role="listitem" @mouseenter="showConfigTooltip(item, $event)"
                @focus="showConfigTooltip(item, $event)" @mouseleave="hideConfigTooltip" @blur="hideConfigTooltip"
                @click="openConfigTarget(item.target)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path v-for="path in getConfigBarIconPaths(item.icon)" :key="path" :d="path" />
                </svg>
              </button>
            </div>
            <button type="button" class="editor-config-bar__scroll-btn editor-config-bar__scroll-btn--right"
              aria-label="Ver más opciones" title="Ver más opciones" @click="scrollConfigBar('right')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </section>

    <Transition name="leave-modal">
      <div v-if="showLeavePrompt" class="leave-modal-backdrop" role="dialog" aria-modal="true">
        <div class="leave-modal-card">
          <p class="leave-modal-kicker">Salir sin guardar</p>
          <h3>Si sales ahora, perderás los cambios de esta edición.</h3>
          <p>¿Quieres volver de todos modos?</p>
          <div class="leave-modal-actions">
            <BaseButton type="button" variant="ghost" @click="closeLeavePrompt">Seguir editando</BaseButton>
            <BaseButton type="button" variant="primary" @click="leaveWithoutSaving">Salir sin guardar</BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="leave-modal">
      <div v-if="showDeleteWallPrompt" class="leave-modal-backdrop" role="dialog" aria-modal="true">
        <div class="leave-modal-card delete-message-modal-card">
          <p class="leave-modal-kicker">Eliminar mensaje</p>
          <h3>¿Quieres eliminar este mensaje del muro?</h3>
          <p>El mensaje se eliminará cuando guardes los cambios.</p>
          <div class="delete-message-preview">
            <strong>{{ pendingDeleteWallMessageGuestName }}</strong>
            <p>{{ pendingDeleteWallMessageText }}</p>
          </div>
          <div class="leave-modal-actions">
            <BaseButton type="button" variant="ghost" :disabled="isDeletingPendingWallMessage"
              @click="closeDeleteWallMessagePrompt">
              Cancelar
            </BaseButton>
            <button type="button" class="danger-confirm-btn" :disabled="isDeletingPendingWallMessage"
              @click="queueDeleteWallMessage">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M9 7V5h6v2" />
                <path d="M8 7v12h8V7" />
                <path d="M11 11v5" />
                <path d="M13 11v5" />
              </svg>
              <span>{{ isDeletingPendingWallMessage ? 'Procesando...' : 'Marcar para eliminar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="leave-modal">
      <div v-if="showHelpModal" class="leave-modal-backdrop" role="dialog" aria-modal="true">
        <div class="leave-modal-card help-modal-card">
          <p class="leave-modal-kicker">Ayuda del editor</p>
          <h3>Consejos rápidos para editar tu invitación</h3>
          <ul class="help-list">
            <li>Haz doble click sobre los textos para editarlos directamente.</li>
            <li>Usa la vista Mobile, Tablet y Desktop para revisar el diseño final.</li>
            <li>Activa o desactiva secciones desde Configuración según tu estilo.</li>
            <li>Guarda antes de publicar para no perder ajustes.</li>
          </ul>
          <p class="help-shortcuts-title">Atajos de teclado</p>
          <ul class="help-list">
            <li><strong>Ctrl/Cmd + Z:</strong> deshacer último cambio.</li>
            <li><strong>Ctrl/Cmd + S:</strong> guardar cambios.</li>
            <li><strong>Ctrl/Cmd + Shift + P:</strong> publicar invitación.</li>
            <li><strong>Ctrl/Cmd + Scroll:</strong> ajustar zoom y explorar otras vistas.</li>
            <li><strong>Esc:</strong> cerrar panel de configuración o ayuda.</li>
          </ul>
          <div class="leave-modal-actions">
            <button type="button" class="modal-icon-close" aria-label="Salir de ayuda" title="Salir"
              data-tooltip="Salir" @click="closeHelpModal">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="immersive-preview">
      <div v-if="isImmersivePreviewOpen" class="immersive-preview-overlay" role="dialog" aria-modal="true">
        <div class="immersive-preview-shell">
          <div class="immersive-preview-controls">
            <header class="immersive-preview-head">
              <div>
                <p class="leave-modal-kicker">Vista inmersiva</p>
                <p class="immersive-preview-copy">Explora la invitación en tamaño real. Puedes desplazarte para recorrer
                  toda la vista.</p>
              </div>
              <button type="button" class="immersive-preview-close" aria-label="Salir de vista inmersiva" title="Salir"
                data-tooltip="Salir" @click="closeImmersivePreview">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <div class="immersive-preview-device-tabs" role="tablist" aria-label="Vista responsive inmersiva">
              <button v-for="option in deviceOptions" :key="`immersive-${option.value}`" type="button"
                class="immersive-device-tab" :class="{ active: previewDevice === option.value }"
                @click="selectPreviewDevice(option.value)">
                {{ option.label }}
              </button>
            </div>

            <div class="immersive-preview-zoom">
              <div class="preview-zoom-controls" role="group" aria-label="Controles de zoom de la vista inmersiva">
                <button type="button" class="preview-zoom-btn" aria-label="Reducir zoom"
                  @click="adjustPreviewZoom(-ZOOM_STEP_PERCENT)">
                  −
                </button>
                <input type="range" class="preview-zoom-slider" :min="ZOOM_MIN_PERCENT" :max="ZOOM_MAX_PERCENT"
                  :step="ZOOM_STEP_PERCENT" :value="previewZoomPercent" aria-label="Zoom de la vista inmersiva"
                  @input="handleZoomInput" />
                <button type="button" class="preview-zoom-btn" aria-label="Aumentar zoom"
                  @click="adjustPreviewZoom(ZOOM_STEP_PERCENT)">
                  +
                </button>
                <button type="button" class="preview-zoom-reset" aria-label="Restablecer zoom"
                  @click="resetPreviewZoom">
                  {{ previewZoomLabel }}
                </button>
              </div>
            </div>
          </div>

          <div class="immersive-preview-stage" @wheel="handlePreviewWheelZoom">
            <div class="immersive-preview-canvas" :class="`immersive-preview-canvas--${effectivePreviewDevice}`"
              :style="previewFrameStyle">
              <component :is="templateModule.component" v-if="templateModule && supportsInlineEditor"
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest" :data="previewData"
                :invitation-title="title || invitation?.title || ''" :type-event-name="typeEvent?.name || ''"
                :editable="true" :constrained-overlay="true" :preview-viewport="effectivePreviewDevice"
                :preview-zoom-percent="previewZoomPercent" :active-field="activeTextField"
                :section-visibility="previewSectionVisibility"
                :checkin-preview="showCheckinPreview && previewSectionVisibility['checkin']" @start-edit="startTextEdit"
                @update-field="updateFieldValue" @finish-edit="finishTextEdit"
                @checkin-preview-closed="onCheckinPreviewClosed" />
              <component :is="templateModule.component" v-else-if="templateModule"
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest" :data="previewData"
                :invitation-title="title || invitation?.title || ''" :type-event-name="typeEvent?.name || ''"
                :preview-viewport="effectivePreviewDevice" :preview-zoom-percent="previewZoomPercent" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 12px;
}

.editor-head {
  padding: 10px 12px;
}

.client-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(37, 99, 235, 0.72);
  font-weight: 700;
}

.client-inline-note {
  margin: 0;
  color: #475569;
}

.client-inline-note.error {
  color: #9f1239;
}

.editor-layout {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 165px);
}

.editor-main {
  display: grid;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.preview-toolbar {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 62px;
}

.preview-toolbar-main {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: min(840px, calc(100% - 128px));
}

.editor-immersive-trigger {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #fff;
  color: #0f172a;
  border-radius: 999px;
  min-height: 40px;
  padding: 0.45rem 0.72rem;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.editor-immersive-trigger svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.device-tabs {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  padding: 0.26rem;
  background: #f8fafc;
}

.device-tab {
  border: 0;
  border-radius: 999px;
  padding: 0.43rem 0.85rem;
  background: transparent;
  color: #475569;
  font-weight: 700;
  cursor: pointer;
}

.device-tab.active {
  background: #0f172a;
  color: #fff;
}

.preview-zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.32rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(248, 250, 252, 0.94);
}

.preview-zoom-btn {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.preview-zoom-btn:hover,
.preview-zoom-btn:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.preview-zoom-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.preview-zoom-slider {
  width: min(180px, 36vw);
  accent-color: #2563eb;
  cursor: pointer;
}

.preview-zoom-reset {
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  min-height: 30px;
  padding: 0 0.55rem;
  background: #fff;
  color: #1e293b;
  font-weight: 700;
  font-size: 0.76rem;
  cursor: pointer;
}

.preview-zoom-reset:hover,
.preview-zoom-reset:focus-visible {
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.preview-zoom-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.preview-zoom-hint--active {
  color: #0f172a;
}

.editor-config-bar {
  position: fixed;
  left: 94px;
  right: 0;
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 82;
  display: grid;
  justify-items: center;
  padding: 0 14px;
  pointer-events: none;
}

.editor-config-bar__inner {
  width: min(1040px, 100%);
  min-width: 0;
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(219, 203, 255, 0.74);
  border-radius: 999px;
  background:
    radial-gradient(circle at 10% 0%, rgba(219, 91, 182, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(250, 246, 255, 0.92));
  box-shadow:
    0 22px 46px rgba(45, 24, 84, 0.2),
    0 1px 0 rgba(255, 255, 255, 0.92) inset;
  backdrop-filter: blur(18px);
  pointer-events: auto;
  transition: transform 0.28s ease, opacity 0.28s ease, max-width 0.28s ease;
}

.editor-config-bar.is-collapsed .editor-config-bar__inner {
  max-width: 64px;
  grid-template-columns: auto;
  padding-inline: 8px;
}

.editor-config-bar__toggle,
.editor-config-bar__item {
  border: 0;
  color: #2b1748;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.editor-config-bar__toggle {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7a4fd9, #db5bb6);
  color: #fff;
  box-shadow: 0 14px 26px rgba(122, 79, 217, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.editor-config-bar__toggle:hover,
.editor-config-bar__toggle:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(122, 79, 217, 0.34);
}

.editor-config-bar__toggle svg,
.editor-config-bar__item svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.editor-config-bar__toggle svg {
  width: 18px;
  height: 18px;
}

.editor-config-bar__scroll-wrap {
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.editor-config-bar.is-collapsed .editor-config-bar__scroll-wrap {
  display: none;
}

.editor-config-bar__scroll-wrap::before,
.editor-config-bar__scroll-wrap::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 34px;
  z-index: 2;
  pointer-events: none;
}

.editor-config-bar__scroll-wrap::before {
  left: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.96), transparent);
}

.editor-config-bar__scroll-wrap::after {
  right: 0;
  background: linear-gradient(270deg, rgba(250, 246, 255, 0.96), transparent);
}

.editor-config-bar__scroll {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  padding: 3px 44px;
  scroll-snap-type: x proximity;
}

.editor-config-bar__scroll::-webkit-scrollbar {
  display: none;
}

.editor-config-bar__scroll-btn {
  position: absolute;
  top: 50%;
  z-index: 5;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(155, 107, 255, 0.22);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 246, 255, 0.9));
  color: #4b2a73;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 10px 22px rgba(45, 24, 84, 0.14),
    0 1px 0 rgba(255, 255, 255, 0.9) inset;
  transform: translateY(-50%);
  transition: transform 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.editor-config-bar__scroll-btn--left {
  left: 3px;
}

.editor-config-bar__scroll-btn--right {
  right: 3px;
}

.editor-config-bar__scroll-btn:hover,
.editor-config-bar__scroll-btn:focus-visible {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.7);
  background: linear-gradient(135deg, #7a4fd9, #db5bb6);
  box-shadow: 0 14px 26px rgba(122, 79, 217, 0.28);
  transform: translateY(-50%) scale(1.04);
}

.editor-config-bar__scroll-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.editor-config-bar__item {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  position: relative;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 245, 255, 0.84));
  border: 1px solid rgba(155, 107, 255, 0.17);
  box-shadow: 0 8px 18px rgba(45, 24, 84, 0.08);
  scroll-snap-align: center;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.editor-config-bar__item:hover,
.editor-config-bar__item:focus-visible,
.editor-config-bar__item.is-active {
  transform: translateY(-3px);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.72);
  background: linear-gradient(135deg, #7a4fd9, #db5bb6);
  box-shadow:
    0 16px 30px rgba(122, 79, 217, 0.3),
    0 8px 16px rgba(219, 91, 182, 0.16);
}

.editor-config-bar__item svg {
  width: 19px;
  height: 19px;
}

.editor-config-bar__tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  transform: translate(-50%, 6px);
  max-width: 190px;
  width: max-content;
  padding: 0.42rem 0.6rem;
  border-radius: 999px;
  background: rgba(31, 18, 53, 0.94);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 900;
  white-space: nowrap;
  opacity: 1;
  pointer-events: none;
  box-shadow: 0 12px 26px rgba(24, 15, 42, 0.24);
  animation: editor-config-tooltip-in 0.18s ease forwards;
}

@keyframes editor-config-tooltip-in {
  to {
    transform: translate(-50%, 0);
  }
}

.preview-card {
  padding: 10px;
  display: grid;
  gap: 8px;
  min-height: calc(100vh - 225px);
}

.preview-help,
.preview-note {
  margin: 0;
  color: #475569;
}

.preview-stage {
  width: 100%;
  overflow: auto;
  min-height: clamp(760px, 82vh, 1180px);
}

.preview-frame {
  position: relative;
  isolation: isolate;
  transform: translateZ(0);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  background: #f1f5f9;
  overflow: auto;
  min-height: clamp(740px, 80vh, 1100px);
  max-height: none;
  width: 100%;
}

.preview-frame--mobile {
  width: min(390px, 100%);
  margin: 0 auto;
}

.preview-frame--tablet {
  width: min(860px, 100%);
  margin: 0 auto;
}

.preview-frame--desktop {
  width: 100%;
  margin: 0 auto;
}

.config-overlay {
  position: fixed;
  inset: 0;
  z-index: 79;
  border: 0;
  background:
    radial-gradient(circle at 82% 12%, rgba(219, 91, 182, 0.2), transparent 28%),
    radial-gradient(circle at 10% 88%, rgba(122, 79, 217, 0.18), transparent 34%),
    rgba(24, 15, 42, 0.48);
  backdrop-filter: blur(6px);
}

.config-drawer {
  position: fixed;
  left: 94px;
  right: 0;
  bottom: 118px;
  max-height: min(64dvh, 680px);
  padding: 0 16px;
  z-index: 80;
  min-width: 0;
  display: grid;
  justify-items: center;
  pointer-events: none;
}

.config-drawer,
.config-drawer *,
.config-drawer *::before,
.config-drawer *::after {
  box-sizing: border-box;
}

.config-drawer__shell {
  width: min(920px, 100%);
  max-height: min(64dvh, 680px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(219, 203, 255, 0.82);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.96), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(251, 247, 255, 0.97) 100%);
  box-shadow:
    0 34px 70px rgba(24, 15, 42, 0.32),
    0 1px 0 rgba(255, 255, 255, 0.95) inset;
  backdrop-filter: blur(16px);
  pointer-events: auto;
}

.config-panel-slot {
  min-width: 0;
  display: grid;
  gap: 14px;
}

.config-panel-swap-enter-active,
.config-panel-swap-leave-active {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.config-panel-swap-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.992);
}

.config-panel-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.992);
}

.config-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 18px 15px;
  border-bottom: 1px solid rgba(219, 203, 255, 0.66);
  background:
    radial-gradient(circle at 14% 0%, rgba(219, 91, 182, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 246, 255, 0.92));
}

.config-drawer__title-wrap {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.config-drawer__eyebrow {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7b5aa7;
  font-weight: 900;
}

.config-drawer h2 {
  margin: 0;
  color: #1f1235;
  font-size: clamp(1.2rem, 2.6vw, 1.5rem);
  font-weight: 950;
  letter-spacing: -0.04em;
}

.config-drawer__subtitle {
  margin: 2px 0 0;
  max-width: 34ch;
  color: #76658f;
  font-size: 0.82rem;
  line-height: 1.32;
}

.config-drawer__body {
  position: relative;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 14px 14px 26px;
  display: grid;
  gap: 14px;
  align-content: start;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(122, 79, 217, 0.44) transparent;
}

.config-drawer__body::-webkit-scrollbar {
  width: 8px;
}

.config-drawer__body::-webkit-scrollbar-track {
  background: transparent;
}

.config-drawer__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(122, 79, 217, 0.5), rgba(219, 91, 182, 0.44));
}

.config-drawer__body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(122, 79, 217, 0.68), rgba(219, 91, 182, 0.58));
}

.config-block {
  width: 100%;
  min-width: 0;
  position: relative;
  border: 1px solid rgba(219, 203, 255, 0.72);
  border-radius: 22px;
  padding: 14px;
  background:
    radial-gradient(circle at top right, rgba(240, 106, 166, 0.09), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(250, 247, 255, 0.88));
  box-shadow:
    0 14px 30px rgba(45, 24, 84, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.88) inset;
  display: grid;
  gap: 12px;
  scroll-margin-top: 82px;
  overflow: visible;
}

.config-block::before {
  content: '';
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7a4fd9, #db5bb6);
  box-shadow: 0 6px 14px rgba(122, 79, 217, 0.22);
}

.config-block h3 {
  margin: 0;
  color: #1f1235;
  font-size: 1rem;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.config-block p {
  margin: 0;
  color: #76658f;
  font-size: 0.82rem;
  line-height: 1.36;
}

.field {
  display: grid;
  gap: 0.34rem;
  min-width: 0;
}

.field span {
  color: #2b1a44;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.field input,
.field select,
.field textarea {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  min-height: 44px;
  border-radius: 15px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.9));
  padding: 0.68rem 0.78rem;
  color: #24133b;
  font-family: inherit;
  box-shadow: 0 8px 18px rgba(45, 24, 84, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.field input:hover,
.field select:hover,
.field textarea:hover {
  border-color: rgba(122, 79, 217, 0.32);
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: rgba(122, 79, 217, 0.52);
  box-shadow:
    0 0 0 4px rgba(122, 79, 217, 0.1),
    0 12px 24px rgba(45, 24, 84, 0.1);
  outline: none;
  transform: translateY(-1px);
}

.field textarea {
  resize: vertical;
}

.field-hint {
  font-size: 0.74rem;
  color: #7b6b8f;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.field-hint--subdomain {
  color: #6d28d9;
  font-weight: 700;
}

.field-alert {
  display: inline-flex;
  align-items: center;
  min-height: 1.15rem;
  font-size: 0.74rem;
  font-weight: 600;
}

.field-alert--info {
  color: #475569;
}

.field-alert--success {
  color: #0f766e;
}

.field-alert--error {
  color: #b91c1c;
}

.option-group {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.feature-item {
  width: 100%;
  min-width: 0;
  display: grid;
  gap: 12px;
  background: transparent;
  padding: 0;
}

.feature-switch-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(219, 203, 255, 0.76);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(148, 163, 184, 0.12), transparent 34%),
    rgba(255, 255, 255, 0.72);
  box-shadow:
    0 8px 18px rgba(45, 24, 84, 0.05),
    0 1px 0 rgba(255, 255, 255, 0.84) inset;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.feature-switch-panel.is-active {
  border-color: rgba(155, 107, 255, 0.34);
  background:
    radial-gradient(circle at top right, rgba(240, 106, 166, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(250, 247, 255, 0.86));
  box-shadow:
    0 12px 24px rgba(45, 24, 84, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.feature-switch-panel strong {
  display: block;
  color: #2b1a44;
  font-size: 0.83rem;
  font-weight: 950;
  line-height: 1.25;
}

.feature-switch-panel p {
  margin: 2px 0 0;
  color: #806c98;
  font-size: 0.74rem;
  font-weight: 750;
  line-height: 1.3;
}

.feature-switch-panel:not(.is-active) strong {
  color: #62516f;
}

.feature-switch-panel:not(.is-active) p {
  color: #91849e;
}

.feature-switch-panel .switch {
  justify-self: end;
  flex: 0 0 auto;
}

.feature-body {
  display: grid;
  gap: 11px;
  min-width: 0;
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.feature-body--disabled {
  opacity: 0.48;
  filter: grayscale(0.24);
  pointer-events: none;
}

.feature-body--disabled .option-panel,
.feature-body--disabled .gallery-panel-copy {
  border-color: rgba(148, 163, 184, 0.24);
  background:
    radial-gradient(circle at 100% 0%, rgba(148, 163, 184, 0.08), transparent 34%),
    rgba(248, 250, 252, 0.72);
  box-shadow: none;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 48px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.switch-track {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(196, 181, 253, 0.66), rgba(148, 163, 184, 0.52));
  border-radius: 999px;
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.13),
    0 6px 14px rgba(45, 24, 84, 0.08);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.switch-track::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.22);
  transition: transform 0.2s ease;
}

.switch input:checked+.switch-track {
  background: linear-gradient(135deg, #7a4fd9, #db5bb6);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.24),
    0 10px 18px rgba(122, 79, 217, 0.22);
}

.switch input:checked+.switch-track::before {
  transform: translateX(20px);
}

.option-panel {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(155, 107, 255, 0.16);
  border-radius: 18px;
  padding: 12px;
  display: grid;
  gap: 11px;
  background:
    radial-gradient(circle at 100% 0%, rgba(219, 91, 182, 0.08), transparent 34%),
    rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 22px rgba(45, 24, 84, 0.05);
}

.option-panel h4 {
  margin: 0;
  font-size: 0.89rem;
}

.theme-color-panel {
  display: grid;
  gap: 16px;
  padding: 13px;
  border: 1px solid rgba(155, 107, 255, 0.16);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(240, 106, 166, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(250, 247, 255, 0.86));
  box-shadow: 0 10px 22px rgba(45, 24, 84, 0.05);
}

.theme-color-panel__head {
  display: grid;
  gap: 3px;
}

.theme-color-panel__head--action {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.theme-color-panel__head--compact {
  padding-top: 2px;
}

.theme-color-panel__head h4 {
  margin: 0;
  color: #24133b;
  font-size: 0.92rem;
  font-weight: 950;
}

.theme-color-panel__head p {
  margin: 0;
  color: #76658f;
  font-size: 0.78rem;
  line-height: 1.35;
}

.theme-reset-colors-button {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(155, 107, 255, 0.22);
  border-radius: 14px;
  background:
    radial-gradient(circle at 78% 18%, rgba(240, 106, 166, 0.16), transparent 42%),
    rgba(255, 255, 255, 0.86);
  color: #6d3fd0;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  box-shadow:
    0 10px 20px rgba(45, 24, 84, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.92) inset;
  transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.theme-reset-colors-button:hover,
.theme-reset-colors-button:focus-visible {
  color: #f06aa6;
  transform: translateY(-1px) rotate(-18deg);
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.15),
    0 16px 26px rgba(45, 24, 84, 0.14);
  outline: none;
}

.theme-reset-colors-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.theme-color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.theme-color-card {
  min-width: 0;
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 10px;
  border: 1px solid rgba(219, 203, 255, 0.78);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(240, 106, 166, 0.08), transparent 34%),
    rgba(255, 255, 255, 0.82);
  box-shadow:
    0 10px 20px rgba(45, 24, 84, 0.06),
    0 1px 0 rgba(255, 255, 255, 0.88) inset;
}

.theme-color-card--embedded {
  background: rgba(255, 255, 255, 0.7);
}

.theme-color-card--row {
  background:
    radial-gradient(circle at top right, rgba(122, 79, 217, 0.06), transparent 34%),
    rgba(255, 255, 255, 0.78);
}

.theme-color-card__button {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.theme-color-card__button:hover .theme-color-card__preview,
.theme-color-card__button:focus-visible .theme-color-card__preview {
  transform: translateY(-1px);
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.18),
    0 14px 24px rgba(45, 24, 84, 0.16);
}

.theme-color-card__button:focus-visible {
  outline: 2px solid rgba(122, 79, 217, 0.28);
  outline-offset: 5px;
  border-radius: 14px;
}

.theme-color-card__content {
  min-width: 0;
  display: grid;
}

.theme-color-card__content strong {
  color: #2b1a44;
  font-size: 0.82rem;
  font-weight: 950;
  line-height: 1.2;
}

.theme-color-card__content small {
  color: #806c98;
  font-size: 0.72rem;
  font-weight: 760;
  line-height: 1.28;
}

.theme-color-card__visual {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.theme-color-card__preview {
  width: 38px;
  height: 38px;
  border: 2px solid rgba(255, 255, 255, 0.94);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(155, 107, 255, 0.18),
    0 10px 18px rgba(45, 24, 84, 0.12);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.theme-color-card__chevron {
  color: #8b5cf6;
  font-size: 1.3rem;
  font-weight: 950;
  line-height: 1;
}

.option-panel--section-color {
  gap: 10px;
  background:
    radial-gradient(circle at top right, rgba(122, 79, 217, 0.07), transparent 34%),
    rgba(255, 255, 255, 0.86);
}

.section-color-toggle {
  width: 100%;
  min-height: 42px;
  border: 0;
  background: transparent;
  color: #24133b;
  cursor: pointer;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0;
  text-align: left;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 950;
}

.section-color-toggle:focus-visible {
  outline: 2px solid rgba(122, 79, 217, 0.28);
  outline-offset: 4px;
  border-radius: 12px;
}

.section-color-toggle svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.62;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.section-color-toggle svg.is-open {
  transform: rotate(180deg);
  opacity: 1;
}

.section-color-list {
  display: grid;
  gap: 9px;
}

.theme-color-modal-enter-active,
.theme-color-modal-leave-active {
  transition: opacity 0.2s ease;
}

.theme-color-modal-enter-from,
.theme-color-modal-leave-to {
  opacity: 0;
}

.option-panel--location {
  gap: 12px;
}

.location-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.location-panel-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 900;
  color: #2b1a44;
}

.location-add-btn {
  border: 1px solid rgba(122, 79, 217, 0.22);
  border-radius: 999px;
  background: rgba(122, 79, 217, 0.08);
  color: #5b2fb8;
  font-size: 0.75rem;
  font-weight: 900;
  line-height: 1;
  padding: 0.5rem 0.72rem;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.location-add-btn:hover:not(:disabled),
.location-add-btn:focus-visible:not(:disabled) {
  background: rgba(122, 79, 217, 0.14);
  color: #4b259b;
  transform: translateY(-1px);
}

.location-add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.location-item-card {
  border: 1px solid rgba(219, 203, 255, 0.72);
  border-radius: 16px;
  padding: 12px;
  display: grid;
  gap: 10px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 247, 255, 0.9));
  box-shadow: 0 10px 22px rgba(45, 24, 84, 0.06);
}

.location-item-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.location-item-card__head strong {
  color: #2b1a44;
  font-size: 0.84rem;
  font-weight: 950;
}

.location-remove-btn {
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.4rem 0.65rem;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.location-remove-btn:hover:not(:disabled),
.location-remove-btn:focus-visible:not(:disabled) {
  background: rgba(220, 38, 38, 0.14);
  color: #991b1b;
}

.location-remove-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.location-meta {
  border: 1px solid rgba(155, 107, 255, 0.16);
  border-radius: 14px;
  padding: 10px;
  background: linear-gradient(180deg, rgba(248, 245, 255, 0.88), rgba(255, 255, 255, 0.78));
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field-hint--location {
  margin: 0;
  line-height: 1.35;
}

.field-hint--location strong {
  color: #334155;
  font-weight: 700;
}

.field-hint--location code {
  display: block;
  margin-top: 4px;
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 0.36rem 0.42rem;
  background: #fff;
  color: #334155;
  font-size: 0.7rem;
  line-height: 1.35;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.checkin-config-grid {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.feature-inline-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.feature-inline-switch span {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.82rem;
  font-weight: 900;
  color: #2b1a44;
  line-height: 1.3;
}

.feature-inline-switch .switch {
  flex: 0 0 auto;
}

.gallery-file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.gallery-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.gallery-panel-head p {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 900;
  color: #2b1a44;
}

.gallery-panel-copy {
  margin: 0;
  font-size: 0.76rem;
  color: #7b6b8f;
  line-height: 1.35;
}

.gallery-panel-copy--processing {
  color: #1d4ed8;
  font-weight: 600;
}

.music-upload-panel {
  display: grid;
  gap: 8px;
  padding: 11px;
  border-radius: 16px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  background:
    radial-gradient(circle at top right, rgba(219, 91, 182, 0.1), transparent 36%),
    linear-gradient(180deg, rgba(250, 245, 255, 0.94), rgba(255, 255, 255, 0.76));
}

.music-upload-panel p,
.music-upload-panel small {
  margin: 0;
  color: #64748b;
  font-size: 0.76rem;
  line-height: 1.35;
}

.music-upload-panel strong {
  color: #2e1065;
}

.config-secondary-action {
  width: 100%;
  border: 1px solid rgba(124, 58, 237, 0.24);
  border-radius: 11px;
  padding: 0.62rem 0.85rem;
  background: linear-gradient(135deg, #7c3aed, #db5bb6);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.config-secondary-action:hover:not(:disabled),
.config-secondary-action:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(124, 58, 237, 0.22);
}

.config-secondary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gallery-add-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.28);
  background: linear-gradient(180deg, #ffffff 0%, #eef3ff 100%);
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.gallery-add-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
}

.gallery-add-btn:hover:not(:disabled),
.gallery-add-btn:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(29, 78, 216, 0.18);
}

.gallery-add-btn:disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.gallery-pill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.gallery-pill {
  min-height: 42px;
  border-radius: 9px;
  border: 1px solid rgba(30, 64, 175, 0.2);
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.86), rgba(191, 219, 254, 0.72));
  padding: 0 8px 0 10px;
  display: inline-grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.gallery-pill:hover {
  border-color: rgba(30, 64, 175, 0.42);
  box-shadow: 0 8px 14px rgba(30, 64, 175, 0.12);
}

.gallery-pill-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.gallery-pill span {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1e3a8a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery-pill small {
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgba(30, 58, 138, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery-pill-remove {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(15, 23, 42, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.gallery-pill-remove span {
  font-size: 1rem;
  line-height: 1;
  font-weight: 700;
  color: inherit;
}

.gallery-pill:hover .gallery-pill-remove,
.gallery-pill:focus-within .gallery-pill-remove {
  opacity: 1;
  transform: scale(1);
}

@media (hover: none) {
  .gallery-pill-remove {
    opacity: 1;
    transform: scale(1);
  }
}

.gallery-pill-remove:hover,
.gallery-pill-remove:focus-visible {
  background: rgba(225, 29, 72, 0.12);
  color: #be123c;
}

.gallery-pill--pending {
  border-color: rgba(168, 85, 247, 0.24);
  background: linear-gradient(180deg, rgba(243, 232, 255, 0.86), rgba(233, 213, 255, 0.72));
}

.gallery-pill--pending span {
  color: #7e22ce;
}

.gallery-pill--pending small {
  color: rgba(107, 33, 168, 0.8);
}

.gallery-pill--processing {
  border-color: rgba(14, 116, 144, 0.32);
  background: linear-gradient(180deg, rgba(236, 254, 255, 0.88), rgba(207, 250, 254, 0.8));
}

.gallery-pill--processing span {
  color: #0f766e;
}

.gallery-pill--processing small {
  color: rgba(15, 118, 110, 0.78);
}

.gallery-pill--failed {
  border-color: rgba(190, 24, 93, 0.32);
  background: linear-gradient(180deg, rgba(255, 241, 242, 0.9), rgba(255, 228, 230, 0.86));
}

.gallery-pill--failed span {
  color: #be123c;
}

.gallery-pill--failed small {
  color: rgba(190, 24, 93, 0.86);
}

.gallery-removed-actions {
  display: flex;
  justify-content: flex-end;
}

.faq-editor {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.faq-item {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 8px;
  background: #fff;
}

.wall-message-item {
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.9));
}

.wall-message-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wall-message-item__head strong {
  font-size: 0.82rem;
  color: #0f172a;
}

.wall-message-item__head small {
  color: #64748b;
  font-size: 0.74rem;
}

.wall-message-item__text {
  margin: 0;
  font-size: 0.8rem;
  color: #334155;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wall-message-item__more {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #3730a3;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  margin-top: -1px;
  cursor: pointer;
}

.wall-message-item__more:hover,
.wall-message-item__more:focus-visible {
  color: #312e81;
  text-decoration: underline;
}

.wall-message-item__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.feature-inline-switch--compact {
  justify-content: flex-start;
}

.feature-inline-switch--compact .switch {
  width: 44px;
}

.link-button {
  border: 0;
  background: transparent;
  color: #be123c;
  font-weight: 700;
  cursor: pointer;
  justify-self: end;
  min-height: 30px;
}

.link-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wall-message-delete-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(239, 68, 68, 0.34);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(254, 242, 242, 0.94));
  color: #b91c1c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.wall-message-delete-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wall-message-delete-btn:hover:not(:disabled),
.wall-message-delete-btn:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(185, 28, 28, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(254, 226, 226, 0.98));
}

.wall-message-delete-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.config-drawer__close {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 245, 255, 0.9));
  color: #2b1a44;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 10px 20px rgba(45, 24, 84, 0.08);
}

.config-drawer__close:hover,
.config-drawer__close:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(45, 24, 84, 0.14);
  background: #fff;
}

.config-drawer__close svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.editor-topbar-back {
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  min-height: 40px;
  padding: 0.42rem 0.68rem;
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 700;
  cursor: pointer;
}

.editor-topbar-back svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.editor-topbar-help {
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  min-height: 40px;
  padding: 0.42rem 0.68rem;
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 700;
  cursor: pointer;
}

.editor-topbar-help svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.editor-topbar-undo {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  background: linear-gradient(160deg, #ffffff 0%, #e0f2fe 100%);
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(14, 116, 144, 0.18);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.editor-topbar-undo:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
  background: #fff;
}

.editor-topbar-undo:not(:disabled):hover {
  transform: translateY(-1px);
  background: linear-gradient(160deg, #ffffff 0%, #bae6fd 100%);
  box-shadow: 0 12px 22px rgba(3, 105, 161, 0.28);
}

.editor-topbar-undo:not(:disabled):active {
  transform: translateY(0);
}

.editor-topbar-undo svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.editor-topbar-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.36rem;
}

.editor-topbar-action .action-icon {
  display: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.editor-topbar-action .action-label {
  white-space: nowrap;
}

.config-overlay-enter-active,
.config-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.config-overlay-enter-from,
.config-overlay-leave-to {
  opacity: 0;
}

.config-drawer-enter-active,
.config-drawer-leave-active {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
}

.config-drawer-enter-from,
.config-drawer-leave-to {
  transform: translateY(34px) scale(0.985);
  opacity: 0;
}

.leave-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(15, 23, 42, 0.5);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.leave-modal-card {
  width: min(480px, 94vw);
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 30px 54px rgba(15, 23, 42, 0.3);
  padding: 16px;
  display: grid;
  gap: 10px;
}

.leave-modal-kicker {
  margin: 0;
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #475569;
  font-weight: 700;
}

.leave-modal-card h3 {
  margin: 0;
  font-size: 1.08rem;
  color: #0f172a;
}

.leave-modal-card p {
  margin: 0;
  color: #475569;
}

.delete-message-modal-card {
  border-color: rgba(239, 68, 68, 0.24);
  box-shadow: 0 30px 54px rgba(127, 29, 29, 0.26);
}

.delete-message-preview {
  border: 1px solid rgba(239, 68, 68, 0.22);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(254, 242, 242, 0.92));
  padding: 10px;
  display: grid;
  gap: 4px;
}

.delete-message-preview strong {
  color: #7f1d1d;
  font-size: 0.82rem;
}

.delete-message-preview p {
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.36;
  max-height: 108px;
  overflow: auto;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.danger-confirm-btn {
  border: 1px solid rgba(185, 28, 28, 0.4);
  border-radius: 10px;
  min-height: 40px;
  padding: 0.46rem 0.72rem;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: #fff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.danger-confirm-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.danger-confirm-btn:hover:not(:disabled),
.danger-confirm-btn:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(185, 28, 28, 0.35);
}

.danger-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.leave-modal-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-icon-close {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.modal-icon-close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.help-modal-card {
  gap: 12px;
}

.help-list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.4rem;
  color: #334155;
}

.help-list li {
  line-height: 1.4;
}

.help-shortcuts-title {
  margin: 0;
  font-size: 0.87rem;
  color: #0f172a;
  font-weight: 700;
}

.modal-icon-close[data-tooltip]::after,
.modal-icon-close[data-tooltip]::before,
.immersive-preview-close[data-tooltip]::after,
.immersive-preview-close[data-tooltip]::before {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.modal-icon-close[data-tooltip]::after,
.immersive-preview-close[data-tooltip]::after {
  content: attr(data-tooltip);
  left: 50%;
  top: calc(100% + 11px);
  transform: translate(-50%, -4px);
  white-space: nowrap;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  color: #fff;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 0.38rem 0.55rem;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.28);
  z-index: 4;
}

.modal-icon-close[data-tooltip]::before,
.immersive-preview-close[data-tooltip]::before {
  content: '';
  left: 50%;
  top: calc(100% + 5px);
  transform: translate(-50%, -4px);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(15, 23, 42, 0.95);
  z-index: 4;
}

.modal-icon-close[data-tooltip]:hover::after,
.modal-icon-close[data-tooltip]:hover::before,
.modal-icon-close[data-tooltip]:focus-visible::after,
.modal-icon-close[data-tooltip]:focus-visible::before,
.immersive-preview-close[data-tooltip]:hover::after,
.immersive-preview-close[data-tooltip]:hover::before,
.immersive-preview-close[data-tooltip]:focus-visible::after,
.immersive-preview-close[data-tooltip]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, 0);
}

.leave-modal-enter-active,
.leave-modal-leave-active {
  transition: opacity 0.22s ease;
}

.leave-modal-enter-from,
.leave-modal-leave-to {
  opacity: 0;
}

.immersive-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 130;
  background:
    radial-gradient(circle at 15% 20%, rgba(148, 163, 184, 0.28), transparent 50%),
    rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(9px);
  padding: 12px;
}

.immersive-preview-shell {
  height: calc(100dvh - 24px);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 44%, #f1f5ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 34px 70px rgba(2, 6, 23, 0.48);
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.immersive-preview-controls {
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 251, 255, 0.95) 100%);
  backdrop-filter: blur(8px);
}

.immersive-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px 9px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.26);
}

.immersive-preview-copy {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
}

.immersive-preview-close {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
  color: #0f172a;
  border-radius: 999px;
  width: 40px;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.immersive-preview-close:hover {
  transform: translateY(-1px);
  background: #ffffff;
  box-shadow: 0 9px 18px rgba(15, 23, 42, 0.15);
}

.immersive-preview-close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.immersive-preview-device-tabs {
  padding: 8px 12px 10px;
  display: flex;
  gap: 0.45rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  overflow: auto;
}

.immersive-device-tab {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  min-height: 40px;
  padding: 0.44rem 0.95rem;
  background: rgba(248, 250, 252, 0.95);
  color: #334155;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.immersive-device-tab:hover {
  transform: translateY(-1px);
}

.immersive-device-tab.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

.immersive-preview-zoom {
  padding: 0 12px 10px;
  display: flex;
  justify-content: center;
}

.immersive-preview-stage {
  overflow: auto;
  padding: 14px;
}

.immersive-preview-canvas {
  position: relative;
  isolation: isolate;
  transform: translateZ(0);
  margin: 0 auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  background: #f1f5f9;
  overflow: auto;
  min-height: calc(100dvh - 254px);
}

.immersive-preview-canvas--mobile {
  width: 390px;
  max-width: none;
}

.immersive-preview-canvas--tablet {
  width: 860px;
  max-width: none;
}

.immersive-preview-canvas--desktop {
  width: 1366px;
  max-width: none;
}

.immersive-preview-enter-active,
.immersive-preview-leave-active {
  transition: opacity 0.34s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.immersive-preview-enter-from,
.immersive-preview-leave-to {
  opacity: 0;
}

.immersive-preview-enter-active .immersive-preview-shell,
.immersive-preview-leave-active .immersive-preview-shell {
  transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.34s ease;
}

.immersive-preview-enter-from .immersive-preview-shell,
.immersive-preview-leave-to .immersive-preview-shell {
  transform: translateY(26px) scale(0.965);
  opacity: 0.8;
}

@media (max-width: 920px) {
  .preview-toolbar {
    min-height: 0;
    align-items: stretch;
    padding-top: 10px;
    padding-bottom: 10px;
    flex-direction: column;
    gap: 8px;
  }

  .preview-toolbar-main {
    width: 100%;
    justify-items: stretch;
    gap: 7px;
  }

  .device-tabs {
    width: 100%;
    justify-content: space-between;
  }

  .device-tab {
    flex: 1;
    min-width: 0;
  }

  .preview-zoom-controls {
    width: 100%;
    justify-content: center;
    gap: 0.35rem;
  }

  .preview-zoom-slider {
    width: min(180px, 42vw);
  }

  .preview-zoom-hint {
    text-align: center;
  }

  .editor-config-bar {
    left: 0;
    padding: 0 8px;
    bottom: max(10px, env(safe-area-inset-bottom));
  }

  .editor-config-bar__inner {
    width: 100%;
    gap: 8px;
    padding: 8px;
  }

  .editor-config-bar__toggle,
  .editor-config-bar__item {
    width: 40px;
    height: 40px;
  }

  .editor-config-bar__item {
    flex-basis: 40px;
    border-radius: 14px;
  }

  .editor-config-bar__scroll {
    padding-inline: 40px;
  }

  .editor-config-bar__scroll-btn {
    width: 30px;
    height: 30px;
  }

  .editor-config-bar__tooltip {
    display: none;
  }

  .config-drawer {
    left: 0;
    right: 0;
    bottom: 88px;
    width: auto;
    height: auto;
    max-height: min(70dvh, calc(100dvh - 146px));
    padding: 0 8px;
  }

  .config-drawer__shell {
    max-height: min(70dvh, calc(100dvh - 146px));
  }

  .config-drawer__header {
    padding: 10px 10px 9px 12px;
  }

  .config-drawer__body {
    padding: 10px 10px 16px;
  }

  .config-block {
    padding: 10px;
  }

  .theme-color-grid {
    grid-template-columns: 1fr;
  }

  .theme-color-card__button {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .editor-topbar-back span,
  .editor-topbar-help span {
    display: none;
  }

  .editor-immersive-trigger span {
    display: none;
  }

  .editor-immersive-trigger {
    position: static;
    transform: none;
    margin-left: auto;
    width: 40px;
    min-width: 40px;
    padding: 0;
    justify-content: center;
  }

  .editor-topbar-action {
    min-width: 56px;
    width: 56px;
    padding-left: 0;
    padding-right: 0;
  }

  .editor-topbar-action .action-icon {
    display: inline-flex;
  }

  .editor-topbar-action .action-label {
    display: none;
  }

  .immersive-preview-overlay {
    padding: 8px;
  }

  .immersive-preview-shell {
    height: calc(100dvh - 16px);
    border-radius: 14px;
  }

  .immersive-preview-controls {
    position: sticky;
    top: 0;
  }

  .immersive-preview-head {
    padding: 8px 10px;
  }

  .immersive-preview-copy {
    display: none;
  }

  .immersive-preview-device-tabs {
    padding: 8px 10px 10px;
    gap: 0.4rem;
  }

  .immersive-device-tab {
    flex: 1;
    min-height: 42px;
    padding: 0.45rem 0.55rem;
  }

  .immersive-preview-close {
    padding: 0;
    width: 40px;
    justify-content: center;
  }

  .immersive-preview-zoom {
    padding: 0 10px 10px;
  }

  .immersive-preview-stage {
    padding: 8px;
  }

  .immersive-preview-canvas--tablet {
    width: 860px;
    max-width: none;
  }

  .immersive-preview-canvas--desktop {
    width: 1366px;
    max-width: none;
  }
}
</style>

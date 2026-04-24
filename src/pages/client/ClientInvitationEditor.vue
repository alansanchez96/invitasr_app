<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { listCatalogTemplates, type CatalogTemplateItem } from '@/services/catalogs'
import {
  checkTenantInvitationSubdomainAvailability,
  getTenantInvitation,
  getTenantInvitationGallery,
  getTenantInvitationWallMessages,
  publishTenantInvitation,
  syncTenantInvitationGalleryImages,
  deleteTenantInvitationWallMessage,
  resolveTenantInvitationLocation,
  updateTenantInvitationWallMessage,
  updateTenantInvitation,
  type TenantInvitationItem,
  type TenantInvitationGalleryImage,
  type TenantInvitationGallerySummary,
  type TenantInvitationWallMessage,
  type TenantInvitationWallSummary,
  type TenantTemplateSummary,
  type TenantTypeEventSummary,
} from '@/services/tenantInvitations'
import { useSessionStore } from '@/stores/session'
import { loadTemplateModule, loadTemplateModuleByRendererKey } from '@/templates/registry'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'
import { notifyError, notifySuccess } from '@/utils/toast'

type ResponsiveDevice = 'mobile' | 'tablet' | 'desktop'
type JsonRecord = Record<string, unknown>
type TextOverridesMap = Record<string, string>

type EditorSection = {
  key: string
  label: string
  optional: boolean
  featureKey?: string
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
  youtubeUrl: string
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

type PendingGallerySnapshotItem = {
  id: string
  file: File
  name: string
  shortName: string
  extension: string
  sizeBytes: number
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

type PendingGalleryImage = {
  id: string
  file: File
  previewUrl: string
  name: string
  shortName: string
  extension: string
  sizeBytes: number
}

type GalleryVisualItem = {
  id: string
  kind: 'persisted' | 'pending'
  imageId?: number
  name: string
  shortName: string
  statusLabel: string
  statusClass: 'ready' | 'processing' | 'failed' | 'pending'
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

const ZOOM_MIN_PERCENT = 50
const ZOOM_MAX_PERCENT = 140
const ZOOM_STEP_PERCENT = 5
const DEVICE_ZOOM_PRESET: Record<ResponsiveDevice, number> = {
  mobile: 130,
  tablet: 115,
  desktop: 100,
}

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
const previewDevice = ref<ResponsiveDevice>('mobile')
const previewZoomPercent = ref(DEVICE_ZOOM_PRESET.mobile)
const showCheckinPreview = ref(false)
const isCheckinConfigEditing = ref(false)
const isSidebarOpen = ref(false)
const collapsedOptionalSections = ref<Record<string, boolean>>({})
const lastSavedSerializedState = ref('')

const isLoading = ref(false)
const isSaving = ref(false)
const isPublishing = ref(false)
const isChangingTemplate = ref(false)
const isLoadingTemplates = ref(false)
const loadError = ref<string | null>(null)
const editorValidationError = ref<string | null>(null)
const slugInputError = ref<string | null>(null)
const slugAvailabilityState = ref<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'>('idle')
const slugAvailabilityReason = ref<string | null>(null)
const undoStack = ref<EditorSnapshot[]>([])
const isHydratingSnapshot = ref(true)
const isApplyingUndo = ref(false)
const snapshotRegistry = new Map<string, EditorSnapshot>()
const skipNextLeaveConfirm = ref(false)
const showLeavePrompt = ref(false)
const pendingNavigationPath = ref<string | null>(null)
const showHelpModal = ref(false)
const showDeleteWallPrompt = ref(false)
const pendingDeleteWallMessageId = ref<number | null>(null)
const pendingDeleteWallMessageGuestName = ref('')
const pendingDeleteWallMessageText = ref('')
const isImmersivePreviewOpen = ref(false)
const isLoadingGallery = ref(false)
const isUploadingGallery = ref(false)
const isLoadingWallMessages = ref(false)
const wallMessages = ref<TenantInvitationWallMessage[]>([])
const wallSummary = ref<TenantInvitationWallSummary>({
  enabled: false,
  limit: null,
  used: 0,
  visible_count: 0,
  remaining: null,
})
const wallEditorExpandedMessageIds = ref<Record<number, boolean>>({})
const updatingWallMessageIds = ref<number[]>([])
const pendingDeleteWallMessageIds = ref<number[]>([])
const pendingWallMessageVisibilityById = ref<Record<number, boolean>>({})
const galleryInputRef = ref<HTMLInputElement | null>(null)
const gallerySummary = ref<TenantInvitationGallerySummary>({
  enabled: false,
  limit: null,
  used: 0,
  remaining: null,
})
const galleryImages = ref<TenantInvitationGalleryImage[]>([])
const pendingGalleryImages = ref<PendingGalleryImage[]>([])
const removedGalleryImageIds = ref<number[]>([])
let slugAvailabilityTimer: ReturnType<typeof setTimeout> | null = null
let slugAvailabilityCheckId = 0
let galleryProcessingRefreshTimer: ReturnType<typeof setTimeout> | null = null

const invitationId = computed(() => Number(route.params.invitationId))
const isDraft = computed(() => String(invitation.value?.status ?? '').toLowerCase() === 'draft')
const isDeletingPendingWallMessage = computed(() => {
  const messageId = pendingDeleteWallMessageId.value
  if (!messageId) return false
  return updatingWallMessageIds.value.includes(messageId)
})
const wallMessagesInEditor = computed(() =>
  wallMessages.value
    .filter((item) => !pendingDeleteWallMessageIds.value.includes(item.id))
    .map((item) => {
      const override = pendingWallMessageVisibilityById.value[item.id]
      if (typeof override !== 'boolean') return item

      const nextStatus = override ? 'visible' : 'hidden'
      return {
        ...item,
        status: nextStatus,
        is_visible: override,
      }
    }),
)
const wallUsedCountInEditor = computed(() => wallMessagesInEditor.value.length)
const wallVisibleCountInEditor = computed(() =>
  wallMessagesInEditor.value.filter((item) => item.is_visible).length,
)
const hasPendingWallMessageDeletes = computed(() => pendingDeleteWallMessageIds.value.length > 0)
const hasPendingWallMessageVisibilityChanges = computed(
  () => Object.keys(pendingWallMessageVisibilityById.value).length > 0,
)

const supportsInlineEditor = computed(() => {
  const rendererKey = String(template.value?.renderer_key ?? '').trim()
  return rendererKey === 'wedding_snow' || rendererKey === 'wedding_base_basic'
})

const deviceOptions: Array<{ value: ResponsiveDevice; label: string }> = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
]

const musicOptions: MusicOption[] = [
  {
    id: 'song_1',
    label: 'Canción 1 (por defecto)',
    title: 'Can’t Help Falling in Love',
    artist: 'Elvis Presley',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    youtubeUrl: 'https://www.youtube.com/watch?v=VEgwXzfKen8',
  },
  {
    id: 'song_2',
    label: 'Canción 2',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    youtubeUrl: 'https://www.youtube.com/watch?v=uh5jGOkodw8',
  },
  {
    id: 'song_3',
    label: 'Canción 3 (próximamente)',
    title: 'Próximamente',
    artist: 'InvitaSR',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    youtubeUrl: '',
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
const WALL_EDITOR_MESSAGE_PREVIEW_LENGTH = 160

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

const wallEditorMessageToCodePoints = (value: string): string[] => Array.from(value ?? '')

const wallEditorMessageIsLong = (message: string): boolean =>
  wallEditorMessageToCodePoints(message).length > WALL_EDITOR_MESSAGE_PREVIEW_LENGTH

const wallEditorMessageExpanded = (messageId: number): boolean =>
  Boolean(wallEditorExpandedMessageIds.value[messageId])

const wallEditorDisplayText = (messageId: number, message: string): string => {
  if (wallEditorMessageExpanded(messageId) || !wallEditorMessageIsLong(message)) {
    return message
  }

  const truncated = wallEditorMessageToCodePoints(message)
    .slice(0, WALL_EDITOR_MESSAGE_PREVIEW_LENGTH)
    .join('')
    .trimEnd()

  return truncated ? `${truncated}…` : ''
}

const toggleWallEditorMessageExpanded = (messageId: number) => {
  wallEditorExpandedMessageIds.value = {
    ...wallEditorExpandedMessageIds.value,
    [messageId]: !wallEditorMessageExpanded(messageId),
  }
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
  ;(current as Record<string, unknown>)[lastToken] = value
}

const ensureDefaultFeatureData = () => {
  let nextContent = cloneRecord(contentDraft.value)
  const nextSettings = cloneRecord(settingsDraft.value)

  if (!asText(getByPath(nextContent, 'music.youtubeUrl'))) {
    const defaultSong = musicOptions[0]!
    setByPath(nextContent, 'music.youtubeUrl', defaultSong.youtubeUrl)
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
    { key: 'location', label: 'Google Maps y Uber', optional: true },
    { key: 'saveDate', label: 'Save the date', optional: true },
    { key: 'dressCode', label: 'Dress code', optional: true },
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

const isOptionalSectionExpanded = (sectionKey: string): boolean =>
  !Boolean(collapsedOptionalSections.value[sectionKey])

const toggleOptionalSectionPanel = (sectionKey: string) => {
  collapsedOptionalSections.value = {
    ...collapsedOptionalSections.value,
    [sectionKey]: isOptionalSectionExpanded(sectionKey),
  }
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

const canUndo = computed(() => undoStack.value.length > 0)
const activeGalleryImages = computed(() =>
  galleryImages.value.filter((image) => !removedGalleryImageIds.value.includes(Number(image.id))),
)
const hasPendingGalleryChanges = computed(
  () => pendingGalleryImages.value.length > 0 || removedGalleryImageIds.value.length > 0,
)
const galleryUsedCount = computed(() => activeGalleryImages.value.length + pendingGalleryImages.value.length)
const galleryLimit = computed(() => gallerySummary.value.limit)
const galleryRemainingSlots = computed(() => {
  if (galleryLimit.value === null || galleryLimit.value >= 999) return null
  return Math.max(0, galleryLimit.value - galleryUsedCount.value)
})
const canAddGalleryImages = computed(() => {
  if (!gallerySummary.value.enabled) return false
  if (galleryRemainingSlots.value === null) return true
  return galleryRemainingSlots.value > 0
})
const galleryCounterLabel = computed(() => {
  if (galleryLimit.value === null || galleryLimit.value >= 999) {
    return `${galleryUsedCount.value} imágenes`
  }
  return `${galleryUsedCount.value} / ${galleryLimit.value} imágenes`
})

const resolveGalleryVariantUrl = (
  image: TenantInvitationGalleryImage,
  keys: string[],
): string => {
  const variants = image.variant_urls ?? null
  for (const key of keys) {
    const candidate = typeof variants?.[key] === 'string' ? variants[key] : ''
    if (candidate.trim()) return candidate
  }
  return String(image.public_url ?? '').trim()
}

const liveGalleryItems = computed<WeddingTemplateData['gallery']>(() => {
  const persisted: WeddingTemplateData['gallery'] = []
  activeGalleryImages.value.forEach((image, index) => {
    const galleryUrl = resolveGalleryVariantUrl(image, [
      'gallery_medium',
      'hero_banner',
      'product_image',
      'lightbox_max',
      'thumbnail_large',
    ])
    if (!galleryUrl.trim()) return

    const thumbnailUrl = resolveGalleryVariantUrl(image, [
      'thumbnail_small',
      'thumbnail_medium',
      'thumbnail_large',
      'gallery_medium',
    ])
    const lightboxUrl = resolveGalleryVariantUrl(image, [
      'lightbox_max',
      'hero_banner',
      'product_image',
      'gallery_medium',
    ])

    persisted.push({
      id: `gallery-db-${image.id}`,
      imageUrl: galleryUrl,
      galleryUrl,
      thumbnailUrl,
      lightboxUrl,
      alt: asText(image.original_name, `Foto ${index + 1}`),
    })
  })

  const queued: WeddingTemplateData['gallery'] = []
  pendingGalleryImages.value.forEach((image, index) => {
    if (!image.previewUrl.trim()) return
    queued.push({
      id: image.id,
      imageUrl: image.previewUrl,
      galleryUrl: image.previewUrl,
      thumbnailUrl: image.previewUrl,
      lightboxUrl: image.previewUrl,
      alt: asText(image.name, `Foto ${persisted.length + index + 1}`),
    })
  })

  return [...persisted, ...queued]
})
const galleryVisualItems = computed<GalleryVisualItem[]>(() => {
  const persisted: GalleryVisualItem[] = activeGalleryImages.value.map((image): GalleryVisualItem => {
    const status = String(image.processing_status ?? 'pending').toLowerCase()
    const statusClass: GalleryVisualItem['statusClass'] = status === 'ready'
      ? 'ready'
      : status === 'failed'
        ? 'failed'
        : status === 'processing'
          ? 'processing'
          : 'pending'
    const statusLabel = statusClass === 'ready'
      ? 'Lista'
      : statusClass === 'failed'
        ? 'Error'
        : statusClass === 'processing'
          ? 'Procesando'
          : 'Pendiente'

    return {
      id: `saved-${image.id}`,
      kind: 'persisted',
      imageId: image.id,
      name: image.original_name,
      shortName: truncateGalleryFileName(image.original_name),
      statusClass,
      statusLabel,
    }
  })

  const queued: GalleryVisualItem[] = pendingGalleryImages.value.map((image): GalleryVisualItem => ({
    id: image.id,
    kind: 'pending',
    name: image.name,
    shortName: image.shortName,
    statusClass: 'pending',
    statusLabel: 'Sin guardar',
  }))

  return [...persisted, ...queued]
})

const hasGalleryProcessingPending = computed(() =>
  activeGalleryImages.value.some((image) => {
    const status = String(image.processing_status ?? 'pending').toLowerCase()
    return status === 'pending' || status === 'processing'
  }),
)

const galleryProcessingHint = computed(() => {
  if (!hasGalleryProcessingPending.value) return null
  return 'Estamos optimizando tus imágenes en segundo plano. Esta lista se actualizará sola.'
})

const getGalleryItemStatusTitle = (item: GalleryVisualItem): string => {
  if (item.statusClass === 'failed') {
    const image = item.kind === 'persisted'
      ? galleryImages.value.find((row) => Number(row.id) === Number(item.imageId))
      : null
    const reason = image?.processing_error?.trim()
    return reason ? `Error al procesar: ${reason}` : 'No pudimos procesar esta imagen.'
  }

  if (item.statusClass === 'processing' || item.statusClass === 'pending') {
    return 'Estamos preparando esta imagen para optimizar la carga.'
  }

  return 'Imagen lista.'
}

const clonePendingGallerySnapshotItems = (items: PendingGallerySnapshotItem[]): PendingGallerySnapshotItem[] =>
  items.map((item) => ({
    id: item.id,
    file: item.file,
    name: item.name,
    shortName: item.shortName,
    extension: item.extension,
    sizeBytes: item.sizeBytes,
  }))

const toPendingGallerySnapshotItems = (items: PendingGalleryImage[]): PendingGallerySnapshotItem[] =>
  items.map((item) => ({
    id: item.id,
    file: item.file,
    name: item.name,
    shortName: item.shortName,
    extension: item.extension,
    sizeBytes: item.sizeBytes,
  }))

const hydratePendingGalleryImages = (items: PendingGallerySnapshotItem[]): PendingGalleryImage[] =>
  clonePendingGallerySnapshotItems(items).map((item) => ({
    ...item,
    previewUrl: URL.createObjectURL(item.file),
  }))

const replacePendingGalleryImages = (items: PendingGalleryImage[]) => {
  const nextPreviewUrls = new Set(items.map((item) => item.previewUrl))
  for (const image of pendingGalleryImages.value) {
    if (image.previewUrl && !nextPreviewUrls.has(image.previewUrl)) {
      URL.revokeObjectURL(image.previewUrl)
    }
  }
  pendingGalleryImages.value = items
}

const removeGalleryVisualItem = (item: GalleryVisualItem) => {
  if (item.kind === 'pending') {
    const pendingRow = pendingGalleryImages.value.find((row) => row.id === item.id)
    if (pendingRow?.previewUrl) {
      URL.revokeObjectURL(pendingRow.previewUrl)
    }
    pendingGalleryImages.value = pendingGalleryImages.value.filter((row) => row.id !== item.id)
    return
  }

  const imageId = Number(item.imageId)
  if (!Number.isFinite(imageId) || imageId <= 0) return
  if (removedGalleryImageIds.value.includes(imageId)) return
  removedGalleryImageIds.value = [...removedGalleryImageIds.value, imageId]
}

const clearGalleryPendingChanges = () => {
  replacePendingGalleryImages([])
  removedGalleryImageIds.value = []
}

const restoreAllRemovedGalleryImages = () => {
  removedGalleryImageIds.value = []
}

const scheduleGalleryProcessingRefresh = () => {
  if (galleryProcessingRefreshTimer) {
    clearTimeout(galleryProcessingRefreshTimer)
    galleryProcessingRefreshTimer = null
  }

  if (!hasGalleryProcessingPending.value) return
  if (hasPendingGalleryChanges.value) return
  if (!invitation.value?.id) return

  galleryProcessingRefreshTimer = setTimeout(async () => {
    await loadGalleryData({ silent: true })
  }, 4000)
}

watch([hasGalleryProcessingPending, hasPendingGalleryChanges], () => {
  scheduleGalleryProcessingRefresh()
})

watch(removedGalleryImageIds, (nextValue) => {
  if (nextValue.length === 0) return

  const activeIds = new Set(galleryImages.value.map((item) => Number(item.id)))
  const validIds = nextValue.filter((id, index, collection) =>
    activeIds.has(Number(id)) && collection.indexOf(id) === index,
  )

  if (validIds.length !== nextValue.length) {
    removedGalleryImageIds.value = validIds
  }
})

watch(galleryImages, () => {
  if (!removedGalleryImageIds.value.length) return

  const activeIds = new Set(galleryImages.value.map((item) => Number(item.id)))
  const validIds = removedGalleryImageIds.value.filter((id) => activeIds.has(Number(id)))
  if (validIds.length !== removedGalleryImageIds.value.length) {
    removedGalleryImageIds.value = validIds
  }
})

watch(wallMessages, () => {
  const activeIds = new Set(wallMessages.value.map((item) => Number(item.id)))
  if (pendingDeleteWallMessageIds.value.length) {
    const validDeleteIds = pendingDeleteWallMessageIds.value.filter((id) => activeIds.has(Number(id)))
    if (validDeleteIds.length !== pendingDeleteWallMessageIds.value.length) {
      pendingDeleteWallMessageIds.value = validDeleteIds
    }
  }

  if (Object.keys(pendingWallMessageVisibilityById.value).length) {
    const nextVisibilityMap = Object.entries(pendingWallMessageVisibilityById.value).reduce<Record<number, boolean>>(
      (carry, [rawId, rawVisible]) => {
        const id = Number(rawId)
        if (!Number.isFinite(id) || !activeIds.has(id)) return carry
        carry[id] = Boolean(rawVisible)
        return carry
      },
      {},
    )

    const currentEntries = Object.keys(pendingWallMessageVisibilityById.value).length
    const nextEntries = Object.keys(nextVisibilityMap).length
    if (currentEntries !== nextEntries) {
      pendingWallMessageVisibilityById.value = nextVisibilityMap
    }
  }

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

const resolvePreviewDeviceByZoom = (zoomValue: number): ResponsiveDevice => {
  if (zoomValue <= 100) return 'desktop'
  if (zoomValue <= 125) return 'tablet'
  return 'mobile'
}

const effectivePreviewDevice = computed<ResponsiveDevice>(() => resolvePreviewDeviceByZoom(previewZoomPercent.value))

const effectivePreviewDeviceLabel = computed(() => {
  const row = deviceOptions.find((item) => item.value === effectivePreviewDevice.value)
  return row?.label ?? 'Desktop'
})

const isZoomShiftingViewport = computed(() => previewZoomPercent.value !== DEVICE_ZOOM_PRESET[previewDevice.value])
const previewZoomScale = computed(() => previewZoomPercent.value / 100)
const previewZoomLabel = computed(() => `${previewZoomPercent.value}%`)
const previewViewportClass = computed(() => `preview-frame--${previewDevice.value}`)
const previewFrameStyle = computed(() => ({ zoom: String(previewZoomScale.value) }))

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

const registerSnapshotState = (serializedState: string, snapshot?: EditorSnapshot) => {
  if (!serializedState) return
  snapshotRegistry.set(serializedState, snapshot ? cloneSnapshot(snapshot) : createSnapshot())
  if (snapshotRegistry.size <= 220) return

  const overflow = snapshotRegistry.size - 220
  for (let index = 0; index < overflow; index += 1) {
    const oldest = snapshotRegistry.keys().next()
    if (oldest.done) break
    snapshotRegistry.delete(oldest.value)
  }
}

const clampZoom = (value: number): number => {
  const bounded = Math.min(ZOOM_MAX_PERCENT, Math.max(ZOOM_MIN_PERCENT, value))
  return Math.round(bounded / ZOOM_STEP_PERCENT) * ZOOM_STEP_PERCENT
}

const setPreviewZoom = (value: number) => {
  previewZoomPercent.value = clampZoom(value)
}

const adjustPreviewZoom = (delta: number) => {
  setPreviewZoom(previewZoomPercent.value + delta)
}

const resetPreviewZoom = () => {
  setPreviewZoom(DEVICE_ZOOM_PRESET[previewDevice.value])
}

const handleZoomInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (!Number.isFinite(value)) return
  setPreviewZoom(value)
}

const selectPreviewDevice = (device: ResponsiveDevice) => {
  previewDevice.value = device
  setPreviewZoom(DEVICE_ZOOM_PRESET[device])
}

const handlePreviewWheelZoom = (event: WheelEvent) => {
  if (!(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  if (event.deltaY === 0) return
  adjustPreviewZoom(event.deltaY > 0 ? -ZOOM_STEP_PERCENT : ZOOM_STEP_PERCENT)
}

const resolveSnapshotBySerializedState = (serializedState: string): EditorSnapshot | null => {
  const registered = snapshotRegistry.get(serializedState)
  if (registered) return cloneSnapshot(registered)
  return snapshotFromSerializedState(serializedState)
}

const pushUndoSnapshot = (snapshot: EditorSnapshot | null) => {
  if (!snapshot) return
  undoStack.value.push(cloneSnapshot(snapshot))
  if (undoStack.value.length > 80) {
    undoStack.value.splice(0, undoStack.value.length - 80)
  }
}

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
  pendingDeleteWallMessageIds.value = Array.isArray(snapshot.pendingDeleteWallMessageIds)
    ? snapshot.pendingDeleteWallMessageIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : []
  pendingWallMessageVisibilityById.value = snapshot.pendingWallMessageVisibilityById && typeof snapshot.pendingWallMessageVisibilityById === 'object'
    ? Object.entries(snapshot.pendingWallMessageVisibilityById).reduce<Record<number, boolean>>((carry, [rawId, rawValue]) => {
      const id = Number(rawId)
      if (!Number.isFinite(id) || id <= 0) return carry
      carry[id] = Boolean(rawValue)
      return carry
    }, {})
    : {}
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

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

const undoLastChange = async () => {
  const snapshot = undoStack.value.pop()
  if (!snapshot) return

  isApplyingUndo.value = true
  try {
    await applySnapshot(snapshot)
    registerSnapshotState(serializedEditorState.value, snapshot)
  } finally {
    isApplyingUndo.value = false
  }
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

const truncateGalleryFileName = (fileName: string): string => {
  const normalized = String(fileName ?? '').trim()
  if (!normalized) return 'imagen'
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 8)}...`
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
    }

    const url = asText(getByPath(contentDraft.value, 'music.youtubeUrl'))
    const option = musicOptions.find((item) => item.youtubeUrl === url)
    return option?.id ?? musicOptions[0]!.id
  },
  set: (optionId: string) => {
    const option = musicOptions.find((item) => item.id === optionId)
    if (!option) return

    const nextContent = cloneRecord(contentDraft.value)
    setByPath(nextContent, 'music.youtubeUrl', option.youtubeUrl)
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
      visible: Boolean(getByPath(contentDraft.value, 'branding.visible') ?? true),
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
    undoStack.value = []
    lastSavedSerializedState.value = serializedEditorState.value
    snapshotRegistry.clear()
    registerSnapshotState(lastSavedSerializedState.value)
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

const loadGalleryData = async (options?: { silent?: boolean }) => {
  if (!invitation.value?.id) return

  if (!options?.silent) {
    isLoadingGallery.value = true
  }
  try {
    const response = await getTenantInvitationGallery(invitation.value.id)
    gallerySummary.value = response.gallery
    galleryImages.value = response.items
    scheduleGalleryProcessingRefresh()
  } catch (error) {
    if (!options?.silent) {
      const payload = error as { message?: string }
      notifyError(payload?.message ?? 'No pudimos cargar la galería.')
    }
  } finally {
    if (!options?.silent) {
      isLoadingGallery.value = false
    }
  }
}

const syncWallMessagesIntoContent = () => {
  const nextContent = cloneRecord(contentDraft.value)
  const currentWall = toRecord(getByPath(nextContent, 'wall'))

  const visibleMessages = wallMessagesInEditor.value
    .filter((item) => item.is_visible)
    .map((item) => ({
      id: String(item.id),
      guestName: item.guest_name,
      message: item.message,
      status: item.status,
      isVisible: item.is_visible,
      postedAt: item.posted_at,
    }))

  const nextWall = {
    title: asText(currentWall.title, 'Muro de mensajes'),
    description: asText(currentWall.description, 'Deja unas palabras lindas para este gran día.'),
    addLabel: asText(currentWall.addLabel, 'Añadir mensaje'),
    emptyStateLabel: asText(currentWall.emptyStateLabel, 'Sé la primera persona en dejar un mensaje.'),
    limit: wallSummary.value.limit,
    receivedCount: wallUsedCountInEditor.value,
    messages: visibleMessages,
  }

  setByPath(nextContent, 'wall', nextWall)
  contentDraft.value = nextContent
}

const syncWallSummaryWithEditorState = () => {
  wallSummary.value = {
    ...wallSummary.value,
    used: wallUsedCountInEditor.value,
    visible_count: wallVisibleCountInEditor.value,
    remaining: wallSummary.value.limit === null
      ? null
      : Math.max(0, Number(wallSummary.value.limit ?? 0) - wallUsedCountInEditor.value),
  }
}

const loadWallMessagesData = async (options?: { silent?: boolean }) => {
  if (!invitation.value?.id) return

  if (!options?.silent) {
    isLoadingWallMessages.value = true
  }

  try {
    const response = await getTenantInvitationWallMessages(invitation.value.id)
    pendingDeleteWallMessageIds.value = []
    pendingWallMessageVisibilityById.value = {}
    wallSummary.value = response.wall
    wallMessages.value = response.items
    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
  } catch (error) {
    if (!options?.silent) {
      const payload = error as { message?: string }
      notifyError(payload?.message ?? 'No pudimos cargar el muro de mensajes.')
    }
  } finally {
    if (!options?.silent) {
      isLoadingWallMessages.value = false
    }
  }
}

const updateWallMessageVisibility = async (messageId: number, visible: boolean) => {
  const source = wallMessages.value.find((item) => item.id === messageId)
  if (!source) return
  if (pendingDeleteWallMessageIds.value.includes(messageId)) return

  if (visible === source.is_visible) {
    const nextMap = { ...pendingWallMessageVisibilityById.value }
    delete nextMap[messageId]
    pendingWallMessageVisibilityById.value = nextMap
  } else {
    pendingWallMessageVisibilityById.value = {
      ...pendingWallMessageVisibilityById.value,
      [messageId]: visible,
    }
  }

  syncWallSummaryWithEditorState()
  syncWallMessagesIntoContent()
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

  pendingDeleteWallMessageIds.value = [...pendingDeleteWallMessageIds.value, messageId]
  syncWallSummaryWithEditorState()
  syncWallMessagesIntoContent()
  closeDeleteWallMessagePrompt()
  notifySuccess('Mensaje marcado para eliminar. Se aplicará al guardar cambios.')
}

const persistPendingWallMessageDeletes = async () => {
  if (!invitation.value?.id) return
  const pendingIds = pendingDeleteWallMessageIds.value
    .map((item) => Number(item))
    .filter((item, index, list) => Number.isFinite(item) && item > 0 && list.indexOf(item) === index)
  if (!pendingIds.length) return

  const deletedIds: number[] = []
  let firstError: unknown = null

  for (const messageId of pendingIds) {
    try {
      await deleteTenantInvitationWallMessage(invitation.value.id, messageId)
      deletedIds.push(messageId)
    } catch (error) {
      if (!firstError) {
        firstError = error
      }
    }
  }

  if (deletedIds.length) {
    wallMessages.value = wallMessages.value.filter((item) => !deletedIds.includes(item.id))
    pendingDeleteWallMessageIds.value = pendingDeleteWallMessageIds.value.filter((id) => !deletedIds.includes(id))
    const nextVisibilityMap = { ...pendingWallMessageVisibilityById.value }
    for (const id of deletedIds) {
      delete nextVisibilityMap[id]
    }
    pendingWallMessageVisibilityById.value = nextVisibilityMap
    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
  }

  if (firstError) {
    throw firstError
  }
}

const persistPendingWallMessageVisibilityChanges = async () => {
  if (!invitation.value?.id) return

  const pendingEntries = Object.entries(pendingWallMessageVisibilityById.value)
    .map(([rawId, rawVisible]) => ({ id: Number(rawId), visible: Boolean(rawVisible) }))
    .filter(({ id }) => Number.isFinite(id) && id > 0)
    .filter(({ id }) => !pendingDeleteWallMessageIds.value.includes(id))
    .filter(({ id }) => wallMessages.value.some((item) => item.id === id))

  if (!pendingEntries.length) return

  const updatedIds: number[] = []
  let firstError: unknown = null

  for (const entry of pendingEntries) {
    try {
      const response = await updateTenantInvitationWallMessage(invitation.value.id, entry.id, entry.visible)
      wallMessages.value = wallMessages.value.map((item) => (
        item.id === entry.id ? response.message : item
      ))
      updatedIds.push(entry.id)
    } catch (error) {
      if (!firstError) {
        firstError = error
      }
    }
  }

  if (updatedIds.length) {
    const nextMap = { ...pendingWallMessageVisibilityById.value }
    for (const id of updatedIds) {
      delete nextMap[id]
    }
    pendingWallMessageVisibilityById.value = nextMap
    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
  }

  if (firstError) {
    throw firstError
  }
}

const persistPendingGalleryImages = async () => {
  if (!invitation.value?.id) return
  if (!hasPendingGalleryChanges.value) return

  isUploadingGallery.value = true
  try {
    const response = await syncTenantInvitationGalleryImages(invitation.value.id, {
      files: pendingGalleryImages.value.map((item) => item.file),
      removeImageIds: removedGalleryImageIds.value,
    })

    gallerySummary.value = response.gallery
    galleryImages.value = response.items
    clearGalleryPendingChanges()
    scheduleGalleryProcessingRefresh()
  } finally {
    isUploadingGallery.value = false
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

  if (enabled) {
    collapsedOptionalSections.value = {
      ...collapsedOptionalSections.value,
      [sectionKey]: false,
    }
  }

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

const validateGalleryFileType = (file: File): boolean => {
  const mime = String(file.type ?? '').toLowerCase()
  const lowerName = file.name.toLowerCase()
  const extension = lowerName.includes('.') ? lowerName.split('.').pop() ?? '' : ''
  const validMime = mime === 'image/jpeg' || mime === 'image/png'
  const validExtension = extension === 'jpg' || extension === 'jpeg' || extension === 'png'
  return validMime || validExtension
}

const onGalleryFilesSelected = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const selectedFiles = target?.files ? Array.from(target.files) : []
  if (!selectedFiles.length) return

  if (!gallerySummary.value.enabled) {
    notifyError('Activa la galería para agregar imágenes.')
    clearGalleryInputValue()
    return
  }

  const validatedFiles = selectedFiles.filter((file) => validateGalleryFileType(file))
  if (validatedFiles.length !== selectedFiles.length) {
    notifyError('Solo se permiten imágenes JPG, JPEG o PNG.')
  }

  const remainingSlots = galleryRemainingSlots.value
  const allowedFiles = remainingSlots === null
    ? validatedFiles
    : validatedFiles.slice(0, Math.max(0, remainingSlots))

  if (!allowedFiles.length) {
    notifyError('Ya alcanzaste el límite de imágenes de tu plan.')
    clearGalleryInputValue()
    return
  }

  if (allowedFiles.length < validatedFiles.length) {
    notifyError('Algunas imágenes quedaron fuera por el límite de tu plan.')
  }

  const pendingRows = allowedFiles.map((file) => {
    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    return {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      shortName: truncateGalleryFileName(file.name),
      extension,
      sizeBytes: file.size,
    } as PendingGalleryImage
  })

  pendingGalleryImages.value = [...pendingGalleryImages.value, ...pendingRows]
  clearGalleryInputValue()
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

const validateBeforeSave = (): string | null => {
  if (resolvedSectionVisibility.value.faq) {
    if (!faqItems.value.length) {
      return 'Agrega al menos una pregunta y respuesta en FAQ o desactiva esa sección.'
    }

    const hasInvalidFaq = faqItems.value.some(
      (item) => !item.question.trim() || !item.answer.trim(),
    )

    if (hasInvalidFaq) {
      return 'Cada pregunta frecuente debe tener pregunta y respuesta.'
    }
  }

  if (resolvedSectionVisibility.value.countdown && !countdownDatetime.value) {
    return 'Selecciona una fecha para la cuenta regresiva.'
  }

  if (resolvedSectionVisibility.value.countdown) {
    const countdownTargetIso = asText(getByPath(contentDraft.value, 'countdown.targetDateIso'))
    const countdownDate = countdownTargetIso ? new Date(countdownTargetIso) : null
    if (!countdownDate || Number.isNaN(countdownDate.getTime()) || countdownDate.getTime() < Date.now()) {
      return 'La cuenta regresiva debe tener una fecha futura.'
    }
  }

  if (resolvedSectionVisibility.value.location) {
    const draftLocations = locationItemsDraft.value.slice(0, MAX_LOCATIONS_PER_INVITATION)
    if (!draftLocations.length) {
      return 'Agrega al menos una ubicación para continuar.'
    }

    for (let index = 0; index < draftLocations.length; index += 1) {
      const locationItem = draftLocations[index]
      if (!locationItem) continue

      const suffix = draftLocations.length > 1 ? ` en la ubicación ${index + 1}` : ''
      const mapsUrl = normalizeExternalUrl(asText(locationItem.mapsUrl))
      if (!mapsUrl) {
        return `Agrega el enlace de Google Maps${suffix}.`
      }
      if (!isValidHttpUrl(mapsUrl)) {
        return `El enlace de Google Maps${suffix} no es válido.`
      }

      if (locationItem.uberEnabled) {
        const uberUrl = normalizeExternalUrl(asText(locationItem.uberUrl))
        if (uberUrl && !isValidHttpUrl(uberUrl)) {
          return `El enlace de Uber${suffix} no es válido.`
        }
      }
    }
  }

  if (resolvedSectionVisibility.value.checkin) {
    if (checkinShowEventDate.value) {
      const checkinDateIso = asText(getByPath(contentDraft.value, 'checkin.eventDateIso')) || asText(getByPath(contentDraft.value, 'event.date.iso'))
      const checkinDate = checkinDateIso ? new Date(checkinDateIso) : null
      if (!checkinDate || Number.isNaN(checkinDate.getTime())) {
        return 'La fecha del check-in interactivo no es válida.'
      }
    }

    if (checkinShowEntryValue.value) {
      const amount = Number(getByPath(contentDraft.value, 'checkin.entry.amount') ?? 0)
      if (!Number.isFinite(amount) || amount <= 0) {
        return 'Ingresa un valor de entrada mayor a 0 para el check-in interactivo.'
      }

      const currency = asText(getByPath(contentDraft.value, 'checkin.entry.currency')).toUpperCase()
      const allowed = checkinCurrencyOptions.map((option) => option.code)
      if (!allowed.includes(currency)) {
        return 'Selecciona una moneda válida para el valor de entrada.'
      }
    }
  }

  return null
}

const markStateAsSaved = () => {
  lastSavedSerializedState.value = serializedEditorState.value
  undoStack.value = []
  snapshotRegistry.clear()
  registerSnapshotState(lastSavedSerializedState.value)
}

const saveChanges = async () => {
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

  isSaving.value = true

  try {
    const hadGalleryChanges = hasPendingGalleryChanges.value
    const hadPendingWallVisibilityChanges = hasPendingWallMessageVisibilityChanges.value
    const hadPendingWallDeletes = hasPendingWallMessageDeletes.value

    const projectedContent = projectTextOverridesIntoContent(cloneRecord(contentDraft.value))
    setByPath(
      projectedContent,
      'faq',
      faqItems.value.map((item, index) => ({
        id: asText(item.id, `faq-${index + 1}`),
        question: item.question,
        answer: item.answer,
      })),
    )

    const countdownIso = asText(getByPath(projectedContent, 'countdown.targetDateIso'))
    if (countdownIso) {
      const countdownDate = new Date(countdownIso)
      if (!Number.isNaN(countdownDate.getTime())) {
        setByPath(projectedContent, 'event.date.iso', countdownDate.toISOString())
        setByPath(projectedContent, 'event.date.label', formatDateTimeLabel24h(countdownDate))
      }
    }

    if (resolvedSectionVisibility.value.location) {
      const draftLocations = locationItemsDraft.value.slice(0, MAX_LOCATIONS_PER_INVITATION)
      const normalizedLocations: DraftLocationItem[] = []

      for (let index = 0; index < draftLocations.length; index += 1) {
        const draftLocation = normalizeDraftLocationItem(draftLocations[index], index)
        const normalizedMapsUrl = normalizeExternalUrl(asText(draftLocation.mapsUrl))
        const normalizedUberUrl = normalizeExternalUrl(asText(draftLocation.uberUrl))

        const nextLocation: DraftLocationItem = {
          ...draftLocation,
          mapsUrl: normalizedMapsUrl || draftLocation.mapsUrl,
          mapsCanonicalUrl: asText(
            draftLocation.mapsCanonicalUrl,
            normalizedMapsUrl || draftLocation.mapsUrl || DEFAULT_LOCATION_MAPS_URL,
          ),
          mapsSourceUrl: asText(
            draftLocation.mapsSourceUrl,
            normalizedMapsUrl || draftLocation.mapsUrl || DEFAULT_LOCATION_MAPS_URL,
          ),
          uberUrl: normalizedUberUrl || '',
        }

        try {
          const resolvedLocation = await resolveTenantInvitationLocation({
            maps_url: normalizedMapsUrl || null,
            place_id: asText(nextLocation.placeId) || null,
            name: asText(nextLocation.name) || null,
            address: asText(nextLocation.address) || null,
            formatted_address: asText(nextLocation.formattedAddress) || null,
            latitude: nextLocation.latitude,
            longitude: nextLocation.longitude,
            uber_enabled: nextLocation.uberEnabled,
            uber_url: normalizedUberUrl || null,
          })

          if (resolvedLocation.name) nextLocation.name = resolvedLocation.name
          if (resolvedLocation.address) nextLocation.address = resolvedLocation.address
          if (resolvedLocation.formattedAddress) nextLocation.formattedAddress = resolvedLocation.formattedAddress
          if (resolvedLocation.mapsUrl) nextLocation.mapsUrl = resolvedLocation.mapsUrl
          if (resolvedLocation.mapsCanonicalUrl) nextLocation.mapsCanonicalUrl = resolvedLocation.mapsCanonicalUrl
          if (resolvedLocation.mapsSourceUrl) nextLocation.mapsSourceUrl = resolvedLocation.mapsSourceUrl
          if (resolvedLocation.placeId) nextLocation.placeId = resolvedLocation.placeId
          if (typeof resolvedLocation.latitude === 'number') nextLocation.latitude = resolvedLocation.latitude
          if (typeof resolvedLocation.longitude === 'number') nextLocation.longitude = resolvedLocation.longitude
          if (typeof resolvedLocation.uberEnabled === 'boolean') nextLocation.uberEnabled = resolvedLocation.uberEnabled
          if (resolvedLocation.uberUrl) nextLocation.uberUrl = resolvedLocation.uberUrl
        } catch {
          // Si falla la resolución canónica, continúa con la URL enviada por el cliente.
        }

        normalizedLocations.push(normalizeDraftLocationItem(nextLocation, index))
      }

      const persistedLocations = normalizedLocations.length
        ? normalizedLocations
        : [createDefaultDraftLocation(0)]

      setByPath(projectedContent, 'locations', persistedLocations)
      setByPath(projectedContent, 'location', persistedLocations[0] ?? createDefaultDraftLocation(0))
    }
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
  } finally {
    isSaving.value = false
  }
}

const applyTemplateChange = async () => {
  if (!invitation.value?.id || !selectedTemplateId.value || !isDraft.value || !hasPendingTemplateChange.value) return

  isChangingTemplate.value = true
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
  } finally {
    isChangingTemplate.value = false
  }
}

const publishInvitation = async () => {
  if (!invitation.value?.id) return
  isPublishing.value = true

  try {
    const response = await publishTenantInvitation(invitation.value.id)
    invitation.value = response.invitation
    await syncEditor()
    notifySuccess(response.message ?? 'Invitación publicada.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos publicar la invitación.')
  } finally {
    isPublishing.value = false
  }
}

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

const hasUnsavedChanges = computed(
  () => Boolean(lastSavedSerializedState.value) && serializedEditorState.value !== lastSavedSerializedState.value,
)

const isTargetEditable = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

const handleEditorHotkeys = (event: KeyboardEvent) => {
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

watch(serializedEditorState, (nextState, previousState) => {
  if (!nextState) return
  registerSnapshotState(nextState)
  if (!previousState) return
  if (isHydratingSnapshot.value || isApplyingUndo.value || isLoading.value) return
  const previousSnapshot = resolveSnapshotBySerializedState(previousState)
  pushUndoSnapshot(previousSnapshot)
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
  if (galleryProcessingRefreshTimer) {
    clearTimeout(galleryProcessingRefreshTimer)
    galleryProcessingRefreshTimer = null
  }
  for (const image of pendingGalleryImages.value) {
    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl)
    }
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
    <button
      type="button"
      class="editor-topbar-help"
      aria-label="Ayuda del editor"
      title="Ayuda del editor"
      @click="openHelpModal">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1-1.3 2"></path>
        <circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none"></circle>
      </svg>
      <span>Ayuda</span>
    </button>
    <button
      type="button"
      class="editor-topbar-undo"
      :disabled="!canUndo || isLoading"
      aria-label="Deshacer"
      title="Deshacer (Ctrl/Cmd + Z)"
      @click="undoLastChange">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 14-5-5 5-5" />
        <path d="M20 20a8 8 0 0 0-8-8H4" />
      </svg>
    </button>
    <BaseButton
      type="button"
      variant="primary"
      class="editor-topbar-action editor-topbar-action--save"
      :disabled="isSaving || isLoading || isUploadingGallery"
      aria-label="Guardar cambios"
      title="Guardar (Ctrl/Cmd + S)"
      @click="saveChanges">
      <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4" />
        <path d="M8 20v-6h8v6" />
      </svg>
      <span class="action-label">{{ isSaving || isUploadingGallery ? 'Guardando...' : 'Guardar cambios' }}</span>
    </BaseButton>
    <BaseButton
      v-if="isDraft"
      type="button"
      variant="primary"
      class="editor-topbar-action editor-topbar-action--publish"
      :disabled="isPublishing || isLoading"
      aria-label="Publicar invitación"
      title="Publicar (Ctrl/Cmd + Shift + P)"
      @click="publishInvitation">
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
              <button
                v-for="option in deviceOptions"
                :key="option.value"
                type="button"
                class="device-tab"
                :class="{ active: previewDevice === option.value }"
                @click="selectPreviewDevice(option.value)">
                {{ option.label }}
              </button>
            </div>
            <div class="preview-zoom-controls" role="group" aria-label="Controles de zoom del editor">
              <button
                type="button"
                class="preview-zoom-btn"
                aria-label="Reducir zoom"
                @click="adjustPreviewZoom(-ZOOM_STEP_PERCENT)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <input
                class="preview-zoom-slider"
                type="range"
                :min="ZOOM_MIN_PERCENT"
                :max="ZOOM_MAX_PERCENT"
                :step="ZOOM_STEP_PERCENT"
                :value="previewZoomPercent"
                aria-label="Zoom del editor"
                @input="handleZoomInput" />
              <button
                type="button"
                class="preview-zoom-btn"
                aria-label="Aumentar zoom"
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
          <button
            type="button"
            class="editor-immersive-trigger"
            aria-label="Abrir vista inmersiva"
            title="Abrir vista inmersiva"
            @click="openImmersivePreview">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5" />
              <path d="M20 9V4h-5" />
              <path d="M4 15v5h5" />
              <path d="M20 15v5h-5" />
            </svg>
            <span>Vista inmersiva</span>
          </button>
          <button type="button" class="editor-settings-fab" :aria-expanded="isSidebarOpen" @click="toggleSidebar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M19.14 12.94a7.96 7.96 0 0 0 .06-.94 7.96 7.96 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.34 7.34 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.57.22-1.11.53-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.07.62-.07.94s.03.63.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.41 1.05.72 1.62.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.57-.22 1.12-.53 1.62-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
            </svg>
            <span>{{ isSidebarOpen ? 'Ocultar configuración' : 'Configuración' }}</span>
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
              <component
                :is="templateModule.component"
                v-if="supportsInlineEditor"
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest"
                :data="previewData"
                :invitation-title="title || invitation?.title || ''"
                :type-event-name="typeEvent?.name || ''"
                :editable="true"
                :constrained-overlay="true"
                :preview-viewport="previewDevice"
                :preview-zoom-percent="previewZoomPercent"
                :active-field="activeTextField"
                :section-visibility="previewSectionVisibility"
                :checkin-preview="showCheckinPreview && previewSectionVisibility['checkin']"
                @start-edit="startTextEdit"
                @update-field="updateFieldValue"
                @finish-edit="finishTextEdit"
                @checkin-preview-closed="onCheckinPreviewClosed" />
              <component
                :is="templateModule.component"
                v-else
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest"
                :data="previewData"
                :invitation-title="title || invitation?.title || ''"
                :type-event-name="typeEvent?.name || ''"
                :preview-viewport="previewDevice"
                :preview-zoom-percent="previewZoomPercent" />
            </div>
          </div>
        </article>
      </div>

      <Transition name="config-overlay">
        <button
          v-if="isSidebarOpen"
          type="button"
          class="config-overlay"
          aria-label="Ocultar configuración"
          @click="closeSidebar"></button>
      </Transition>

      <Transition name="config-drawer">
        <aside
          v-if="isSidebarOpen"
          class="config-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Configuración del editor">
          <div class="config-drawer__shell">
            <header class="config-drawer__header">
              <div class="config-drawer__title-wrap">
                <p class="config-drawer__eyebrow">Modo editor</p>
                <h2>Configuración</h2>
              </div>
              <button
                type="button"
                class="config-drawer__close"
                aria-label="Cerrar configuración"
                title="Cerrar configuración"
                @click="closeSidebar">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <div class="config-drawer__body">
              <input
                ref="galleryInputRef"
                class="gallery-file-input-hidden"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                multiple
                @change="onGalleryFilesSelected" />

              <section class="config-block">
                <label class="field">
                  <span>Título</span>
                  <input v-model="title" type="text" placeholder="Ej: Boda de Sofía y Mateo" />
                </label>

                <label class="field">
                  <span>Enlace corto (Subdominio)</span>
                  <input
                    v-model="slug"
                    type="text"
                    maxlength="63"
                    autocapitalize="off"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="boda-sofia-mateo" />
                  <small class="field-hint">Usa solo letras minúsculas, números y guiones.</small>
                  <small class="field-alert" :class="slugAvailabilityClass">{{ slugAvailabilityMessage }}</small>
                </label>
              </section>

              <section class="config-block">
                <h3>Estilo de plantilla</h3>
                <p v-if="isDraft">Puedes cambiar el estilo mientras sea borrador.</p>
                <p v-else>El estilo queda fijo después de publicar.</p>

                <label class="field">
                  <span>Plantilla</span>
                  <select v-model="selectedTemplateId" :disabled="!isDraft || isChangingTemplate || isLoadingTemplates">
                    <option
                      v-for="item in availableTemplates"
                      :key="String(item.id)"
                      :value="String(item.id)">
                      {{ item.name ?? `Plantilla #${item.id}` }}
                    </option>
                  </select>
                </label>

                <BaseButton
                  v-if="isDraft"
                  type="button"
                  variant="ghost"
                  :disabled="!hasPendingTemplateChange || isChangingTemplate"
                  @click="applyTemplateChange">
                  {{ isChangingTemplate ? 'Aplicando estilo...' : 'Aplicar estilo' }}
                </BaseButton>
              </section>

              <section class="config-block">
                <h3>Opcionales</h3>
                <p>Activa o desactiva secciones y configura cada bloque.</p>

                <div class="option-group">
                  <article v-for="section in optionalSections" :key="section.key" class="feature-item">
                    <div class="feature-header">
                      <button
                        type="button"
                        class="feature-accordion-toggle"
                        :aria-expanded="isOptionalSectionExpanded(section.key) ? 'true' : 'false'"
                        @click="toggleOptionalSectionPanel(section.key)">
                        <span>{{ section.label }}</span>
                        <svg class="feature-accordion-icon" :class="{ 'is-open': isOptionalSectionExpanded(section.key) }" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m7 10 5 5 5-5" />
                        </svg>
                      </button>
                      <label class="switch" @click.stop>
                        <input
                          type="checkbox"
                          :checked="resolvedSectionVisibility[section.key]"
                          @click.stop
                          @change="onSectionToggle(section.key, $event)" />
                        <span class="switch-track"></span>
                      </label>
                    </div>

                    <div v-if="resolvedSectionVisibility[section.key] && isOptionalSectionExpanded(section.key)" class="feature-body">
                      <div v-if="section.key === 'checkin'" class="option-panel">
                        <BaseButton
                          type="button"
                          variant="ghost"
                          :disabled="isCheckinConfigEditing"
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
                                <option v-for="currency in checkinCurrencyOptions" :key="currency.code" :value="currency.code">
                                  {{ currency.label }}
                                </option>
                              </select>
                            </label>

                            <label class="field">
                              <span>Monto</span>
                              <input v-model.number="checkinEntryAmount" type="number" step="0.01" min="0" placeholder="0.00" />
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
                            <option v-for="song in musicOptions" :key="song.id" :value="song.id">
                              {{ song.label }}
                            </option>
                          </select>
                        </label>
                      </div>

                      <div v-else-if="section.key === 'gallery'" class="option-panel">
                        <div class="gallery-panel-head">
                          <p>{{ galleryCounterLabel }}</p>
                          <button
                            type="button"
                            class="gallery-add-btn"
                            :disabled="!canAddGalleryImages || isUploadingGallery"
                            aria-label="Agregar imagen"
                            title="Agregar imagen"
                            @click="openGalleryFilePicker">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                        </div>
                        <p class="gallery-panel-copy">Sube JPG, JPEG o PNG. Las imágenes se guardan al pulsar Guardar cambios.</p>
                        <p v-if="!isLoadingGallery && !gallerySummary.enabled" class="gallery-panel-copy">
                          Tu plan actual no incluye galería de imágenes.
                        </p>
                        <p v-if="galleryProcessingHint" class="gallery-panel-copy gallery-panel-copy--processing">
                          {{ galleryProcessingHint }}
                        </p>
                        <p v-if="isLoadingGallery" class="gallery-panel-copy">Cargando galería...</p>
                        <p v-else-if="galleryRemainingSlots !== null" class="gallery-panel-copy">
                          Puedes agregar {{ galleryRemainingSlots }} imagen{{ galleryRemainingSlots === 1 ? '' : 'es' }} más.
                        </p>

                        <div class="gallery-pill-grid">
                          <article
                            v-for="item in galleryVisualItems"
                            :key="item.id"
                            class="gallery-pill"
                            :class="[
                              item.kind === 'pending' ? 'gallery-pill--pending' : '',
                              item.statusClass === 'processing' ? 'gallery-pill--processing' : '',
                              item.statusClass === 'failed' ? 'gallery-pill--failed' : '',
                            ]"
                            :title="item.name">
                            <div class="gallery-pill-main">
                              <span>{{ item.shortName }}</span>
                              <small :title="getGalleryItemStatusTitle(item)">{{ item.statusLabel }}</small>
                            </div>
                            <button
                              type="button"
                              class="gallery-pill-remove"
                              aria-label="Quitar imagen"
                              title="Quitar imagen"
                              @click="removeGalleryVisualItem(item)">
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
                              <input
                                :value="item.question"
                                type="text"
                                placeholder="Ej: ¿Hay dress code?"
                                @input="updateFaqItem(index, 'question', ($event.target as HTMLInputElement).value)" />
                            </label>

                            <label class="field">
                              <span>Respuesta</span>
                              <textarea
                                :value="item.answer"
                                rows="2"
                                placeholder="Ej: Sí, elegante sport."
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
                            : `Mensajes recibidos: ${wallUsedCountInEditor}${wallSummary.limit === null ? '' : ` / ${wallSummary.limit}`}` }}
                        </p>
                        <p v-if="!isLoadingWallMessages" class="gallery-panel-copy">
                          Visibles en la invitación: {{ wallVisibleCountInEditor }}
                        </p>
                        <p v-if="!isLoadingWallMessages && hasPendingWallMessageDeletes" class="gallery-panel-copy">
                          Tienes {{ pendingDeleteWallMessageIds.length }} mensaje{{ pendingDeleteWallMessageIds.length === 1 ? '' : 's' }} pendiente{{ pendingDeleteWallMessageIds.length === 1 ? '' : 's' }} de eliminación. Se aplicará al guardar cambios.
                        </p>
                        <p v-if="!isLoadingWallMessages && hasPendingWallMessageVisibilityChanges" class="gallery-panel-copy">
                          Tienes cambios de visibilidad pendientes. Se aplicarán al guardar cambios.
                        </p>
                        <p v-if="!wallSummary.enabled && !isLoadingWallMessages" class="gallery-panel-copy">
                          Tu plan actual no tiene activo el muro de mensajes.
                        </p>

                        <div class="faq-editor">
                          <article
                            v-for="item in wallMessagesInEditor"
                            :key="item.id"
                            class="faq-item wall-message-item">
                            <div class="wall-message-item__head">
                              <strong>{{ item.guest_name }}</strong>
                              <small>{{ formatWallMessageDate(item.posted_at) }}</small>
                            </div>
                            <p class="wall-message-item__text">
                              {{ wallEditorDisplayText(item.id, item.message) }}
                            </p>
                            <button
                              v-if="wallEditorMessageIsLong(item.message)"
                              type="button"
                              class="wall-message-item__more"
                              @click="toggleWallEditorMessageExpanded(item.id)">
                              {{ wallEditorMessageExpanded(item.id) ? 'Ver menos' : 'Ver más' }}
                            </button>

                            <div class="wall-message-item__actions">
                              <div class="feature-inline-switch feature-inline-switch--compact">
                                <label
                                  class="switch"
                                  title="Mostrar u ocultar mensaje en la invitación">
                                  <span class="sr-only">
                                    {{ item.is_visible ? 'Desactivar mensaje en la invitación' : 'Activar mensaje en la invitación' }}
                                  </span>
                                  <input
                                    type="checkbox"
                                    :checked="item.is_visible"
                                    :aria-label="item.is_visible ? 'Desactivar mensaje en invitación' : 'Activar mensaje en invitación'"
                                    :disabled="isSaving || isWallMessageUpdating(item.id)"
                                    @change="updateWallMessageVisibility(item.id, ($event.target as HTMLInputElement).checked)" />
                                  <span class="switch-track"></span>
                                </label>
                              </div>
                              <button
                                type="button"
                                class="wall-message-delete-btn"
                                :disabled="isSaving || isWallMessageUpdating(item.id)"
                                aria-label="Eliminar mensaje"
                                title="Eliminar mensaje"
                                @click="openDeleteWallMessagePrompt(item.id)">
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
                          <input
                            :value="rsvpLabelsDraft.firstName"
                            type="text"
                            @input="updateRsvpLabel('firstName', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <label class="field">
                          <span>Etiqueta Apellido</span>
                          <input
                            :value="rsvpLabelsDraft.lastName"
                            type="text"
                            @input="updateRsvpLabel('lastName', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <label class="field">
                          <span>Etiqueta Restricción alimentaria</span>
                          <input
                            :value="rsvpLabelsDraft.dietaryRestrictions"
                            type="text"
                            @input="updateRsvpLabel('dietaryRestrictions', ($event.target as HTMLInputElement).value)" />
                        </label>
                      </div>

                      <div v-else-if="section.key === 'location'" class="option-panel option-panel--location">
                        <div class="location-panel-head">
                          <p class="location-panel-title">
                            Puedes agregar hasta {{ MAX_LOCATIONS_PER_INVITATION }} ubicaciones.
                          </p>
                          <button
                            type="button"
                            class="location-add-btn"
                            :disabled="!canAddLocationDraft"
                            @click="addLocationDraft">
                            + Añadir
                          </button>
                        </div>

                        <p class="gallery-panel-copy">
                          Ubicaciones configuradas: {{ locationItemsDraft.length }} / {{ MAX_LOCATIONS_PER_INVITATION }}
                        </p>

                        <article
                          v-for="(locationItem, locationIndex) in locationItemsDraft"
                          :key="`location-${locationIndex}`"
                          class="location-item-card">
                          <header class="location-item-card__head">
                            <strong>Ubicación {{ locationIndex + 1 }}</strong>
                            <button
                              type="button"
                              class="location-remove-btn"
                              :disabled="locationItemsDraft.length <= 1"
                              @click="removeLocationDraft(locationIndex)">
                              Quitar
                            </button>
                          </header>

                          <label class="field">
                            <span>Enlace de Google Maps</span>
                            <input
                              :value="locationItem.mapsUrl"
                              type="url"
                              inputmode="url"
                              placeholder="https://maps.google.com/..."
                              @input="updateLocationDraftField(locationIndex, 'mapsUrl', ($event.target as HTMLInputElement).value)" />
                            <small class="field-hint field-hint--location">
                              Pega el enlace del lugar. Al guardar, convertimos la ubicación a formato compatible para Maps y Uber.
                            </small>
                          </label>

                          <div
                            v-if="locationItem.placeId || (locationItem.latitude !== null && locationItem.longitude !== null) || locationItem.mapsCanonicalUrl"
                            class="location-meta">
                            <p v-if="locationItem.placeId" class="field-hint field-hint--location">
                              <strong>Destino detectado:</strong> {{ locationItem.placeId }}
                            </p>
                            <p v-if="locationItem.latitude !== null && locationItem.longitude !== null" class="field-hint field-hint--location">
                              <strong>Coordenadas:</strong> {{ locationItem.latitude.toFixed(6) }}, {{ locationItem.longitude.toFixed(6) }}
                            </p>
                            <p v-if="locationItem.mapsCanonicalUrl" class="field-hint field-hint--location">
                              <strong>Enlace canónico:</strong>
                              <code>{{ locationItem.mapsCanonicalUrl }}</code>
                            </p>
                          </div>

                          <div class="feature-inline-switch">
                            <span>Mostrar botón de Uber</span>
                            <label class="switch">
                              <input
                                :checked="locationItem.uberEnabled"
                                type="checkbox"
                                @change="updateLocationDraftField(locationIndex, 'uberEnabled', ($event.target as HTMLInputElement).checked)" />
                              <span class="switch-track"></span>
                            </label>
                          </div>

                          <label v-if="locationItem.uberEnabled" class="field">
                            <span>Enlace de Uber (opcional)</span>
                            <input
                              :value="locationItem.uberUrl"
                              type="url"
                              inputmode="url"
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
                          {{ dressCodeOptions.find((option) => option.code === selectedDressCode)?.description }}
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
          </div>
        </aside>
      </Transition>
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
            <BaseButton type="button" variant="ghost" :disabled="isDeletingPendingWallMessage" @click="closeDeleteWallMessagePrompt">
              Cancelar
            </BaseButton>
            <button
              type="button"
              class="danger-confirm-btn"
              :disabled="isDeletingPendingWallMessage"
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
            <button
              type="button"
              class="modal-icon-close"
              aria-label="Salir de ayuda"
              title="Salir"
              data-tooltip="Salir"
              @click="closeHelpModal">
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
                <p class="immersive-preview-copy">Explora la invitación en tamaño real. Puedes desplazarte para recorrer toda la vista.</p>
              </div>
              <button
                type="button"
                class="immersive-preview-close"
                aria-label="Salir de vista inmersiva"
                title="Salir"
                data-tooltip="Salir"
                @click="closeImmersivePreview">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <div class="immersive-preview-device-tabs" role="tablist" aria-label="Vista responsive inmersiva">
              <button
                v-for="option in deviceOptions"
                :key="`immersive-${option.value}`"
                type="button"
                class="immersive-device-tab"
                :class="{ active: previewDevice === option.value }"
                @click="previewDevice = option.value">
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="immersive-preview-stage">
            <div class="immersive-preview-canvas" :class="`immersive-preview-canvas--${previewDevice}`">
              <component
                :is="templateModule.component"
                v-if="templateModule && supportsInlineEditor"
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest"
                :data="previewData"
                :invitation-title="title || invitation?.title || ''"
                :type-event-name="typeEvent?.name || ''"
                :editable="true"
                :constrained-overlay="true"
                :preview-viewport="previewDevice"
                :active-field="activeTextField"
                :section-visibility="previewSectionVisibility"
                :checkin-preview="showCheckinPreview && previewSectionVisibility['checkin']"
                @start-edit="startTextEdit"
                @update-field="updateFieldValue"
                @finish-edit="finishTextEdit"
                @checkin-preview-closed="onCheckinPreviewClosed" />
              <component
                :is="templateModule.component"
                v-else-if="templateModule"
                :template-id="Number(selectedTemplateId || invitation?.template_id || templateModule.manifest.id)"
                :manifest="templateModule.manifest"
                :data="previewData"
                :invitation-title="title || invitation?.title || ''"
                :type-event-name="typeEvent?.name || ''" />
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

.editor-settings-fab {
  position: fixed;
  right: 32px;
  bottom: 88px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: linear-gradient(160deg, #ffffff 0%, #eef4ff 100%);
  color: #0f172a;
  border-radius: 999px;
  min-height: 40px;
  padding: 0.45rem 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.2);
  z-index: 78;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.editor-settings-fab:hover {
  transform: translateY(-1px);
  background: linear-gradient(160deg, #ffffff 0%, #dbeafe 100%);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.24);
}

.editor-settings-fab svg {
  width: 17px;
  height: 17px;
  fill: currentColor;
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
    radial-gradient(circle at 84% 18%, rgba(56, 189, 248, 0.18), transparent 35%),
    rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(3px);
}

.config-drawer {
  position: fixed;
  top: 84px;
  right: 12px;
  width: min(446px, calc(100vw - 24px));
  height: calc(100dvh - 96px);
  z-index: 80;
  min-width: 0;
}

.config-drawer,
.config-drawer *,
.config-drawer *::before,
.config-drawer *::after {
  box-sizing: border-box;
}

.config-drawer__shell {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(246, 250, 255, 0.98) 100%);
  box-shadow:
    0 28px 52px rgba(2, 6, 23, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
  backdrop-filter: blur(8px);
}

.config-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 252, 255, 0.95) 100%);
}

.config-drawer__title-wrap {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.config-drawer__eyebrow {
  margin: 0;
  font-size: 0.69rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.config-drawer h2 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: #0f172a;
}

.config-drawer__body {
  position: relative;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 12px 24px;
  display: grid;
  gap: 12px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.62) transparent;
}

.config-drawer__body::-webkit-scrollbar {
  width: 8px;
}

.config-drawer__body::-webkit-scrollbar-track {
  background: transparent;
}

.config-drawer__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.55);
}

.config-drawer__body::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.74);
}

.config-block {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 14px;
  padding: 11px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.94));
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
  display: grid;
  gap: 10px;
}

.config-block h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.config-block p {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.36;
}

.field {
  display: grid;
  gap: 0.28rem;
  min-width: 0;
}

.field span {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--brand-ink);
}

.field input,
.field select,
.field textarea {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  min-height: 38px;
  border-radius: 9px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  background: #fff;
  padding: 0.52rem 0.6rem;
  color: var(--brand-ink);
  font-family: inherit;
}

.field textarea {
  resize: vertical;
}

.field-hint {
  font-size: 0.74rem;
  color: #64748b;
  overflow-wrap: anywhere;
  word-break: break-word;
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
  gap: 10px;
  min-width: 0;
}

.feature-item {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: 10px;
  display: grid;
  gap: 10px;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
}

.feature-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  justify-content: initial;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 700;
}

.feature-accordion-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.feature-accordion-toggle span {
  min-width: 0;
  line-height: 1.3;
}

.feature-accordion-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.65;
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.feature-accordion-icon.is-open {
  transform: rotate(180deg);
  opacity: 0.95;
}

.feature-accordion-toggle:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
  outline-offset: 3px;
  border-radius: 10px;
}

.feature-header .switch {
  justify-self: end;
  flex: 0 0 auto;
}

.feature-body {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 44px;
  height: 26px;
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
  background: rgba(148, 163, 184, 0.55);
  border-radius: 999px;
  transition: background 0.2s ease;
}

.switch-track::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.switch input:checked + .switch-track {
  background: #2563eb;
}

.switch input:checked + .switch-track::before {
  transform: translateX(18px);
}

.option-panel {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: #ffffff;
}

.option-panel h4 {
  margin: 0;
  font-size: 0.89rem;
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
  font-weight: 700;
  color: #1e293b;
}

.location-add-btn {
  border: 1px solid rgba(37, 99, 235, 0.25);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.5rem 0.72rem;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.location-add-btn:hover:not(:disabled),
.location-add-btn:focus-visible:not(:disabled) {
  background: rgba(37, 99, 235, 0.16);
  color: #1e40af;
  transform: translateY(-1px);
}

.location-add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.location-item-card {
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}

.location-item-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.location-item-card__head strong {
  font-size: 0.82rem;
  color: #0f172a;
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
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  padding: 8px 9px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.82));
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
  font-size: 0.8rem;
  font-weight: 700;
  color: #1f2937;
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
  font-weight: 700;
  color: #1e293b;
}

.gallery-panel-copy {
  margin: 0;
  font-size: 0.76rem;
  color: #64748b;
  line-height: 1.35;
}

.gallery-panel-copy--processing {
  color: #1d4ed8;
  font-weight: 600;
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
  width: 34px;
  height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #eef4ff 100%);
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.config-drawer__close:hover,
.config-drawer__close:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.16);
  background: linear-gradient(180deg, #ffffff 0%, #e8f0ff 100%);
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
  transform: translateX(28px) scale(0.985);
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

  .config-drawer {
    top: 68px;
    right: 8px;
    width: calc(100vw - 16px);
    height: calc(100dvh - 78px);
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

  .editor-settings-fab {
    right: 12px;
    bottom: 72px;
  }

  .editor-settings-fab span,
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

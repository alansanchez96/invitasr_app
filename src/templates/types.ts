import type { Component } from 'vue'

export type InvitationTemplateEventType = 'wedding'

export type InvitationTemplateFeature =
  | 'hero'
  | 'checkin'
  | 'countdown'
  | 'story'
  | 'gallery'
  | 'faq'
  | 'schedule'
  | 'location'
  | 'save-date'
  | 'dress-code'
  | 'music'
  | 'rsvp'
  | 'wall-preview'
  | 'dj-song-requests'
  | 'gift-options'
  | 'branding'

export type InvitationTemplateManifest = {
  id: number
  slug: string
  name: string
  eventType: InvitationTemplateEventType
  summary: string
  tone: string
  previewLabel: string
  featureFlags: InvitationTemplateFeature[]
}

export type InvitationEventDate = {
  iso: string
  label: string
}

export type InvitationStoryMoment = {
  title: string
  description: string
}

export type InvitationGalleryItem = {
  id: string
  imageUrl: string
  galleryUrl?: string
  thumbnailUrl?: string
  lightboxUrl?: string
  alt: string
}

export type InvitationFaqItem = {
  id: string
  question: string
  answer: string
}

export type InvitationScheduleItem = {
  id: string
  time: string
  title: string
  description: string
}

export type InvitationLocation = {
  name: string
  address: string
  mapsUrl: string
  mapsCanonicalUrl?: string
  mapsSourceUrl?: string
  placeId?: string
  formattedAddress?: string
  latitude?: number | null
  longitude?: number | null
  uberEnabled?: boolean
  uberUrl?: string
}

export type InvitationMusic = {
  title: string
  artist: string
  audioUrl?: string
  youtubeUrl?: string
  muted?: boolean
}

export type InvitationRsvpConfig = {
  endpoint: string
  enabled: boolean
  submitLabel: string
  features?: {
    enabled?: boolean
    limit?: number | null
    fields?: string[]
    companionsEnabled?: boolean
    companions_enabled?: boolean
    whatsappEnabled?: boolean
    whatsapp_enabled?: boolean
    whatsappConfirmationsEnabled?: boolean
    whatsapp_confirmations_enabled?: boolean
    popupConfirmationEnabled?: boolean
    popup_confirmation_enabled?: boolean
  }
  formLabels?: {
    firstName?: string
    lastName?: string
    dietaryRestrictions?: string
    whatsapp?: string
    companions?: string
  }
}

export type InvitationCheckinConfig = {
  eyebrow: string
  title: string
  message: string
  buttonLabel: string
  guestLabel?: string
  showEventDate?: boolean
  eventDateIso?: string
  showEntryValue?: boolean
  entry?: {
    currency?: string
    amount?: number
  }
}

export type InvitationCountdownConfig = {
  eyebrow: string
  title: string
  note: string
  daysLabel: string
  hoursLabel: string
  targetDateIso?: string
}

export type InvitationWallPreviewMessage = {
  id: string
  author: string
  message: string
}

export type InvitationWallPreviewConfig = {
  title: string
  description: string
  messages: InvitationWallPreviewMessage[]
}

export type InvitationWallMessage = {
  id: string
  guestName: string
  message: string
  displayOrder?: number | null
  status?: string
  isVisible?: boolean
  postedAt?: string | null
}

export type InvitationWallConfig = {
  title?: string
  description?: string
  addLabel?: string
  emptyStateLabel?: string
  cloudMessagesEnabled?: boolean
  cloud_messages_enabled?: boolean
  features?: {
    enabled?: boolean
    limit?: number | null
    cloudMessagesEnabled?: boolean
    cloud_messages_enabled?: boolean
  }
  limit?: number | null
  receivedCount?: number | null
  messages: InvitationWallMessage[]
}

export type InvitationDjSongRequestsConfig = {
  enabled?: boolean
  buttonLabel?: string
  modalTitle?: string
  songLabel?: string
  referenceLabel?: string
  submitLabel?: string
  features?: {
    enabled?: boolean
    djSongRequestsEnabled?: boolean
    dj_song_requests_enabled?: boolean
  }
}

export type InvitationGiftOption = {
  id: string
  category: string
  name: string
}

export type InvitationGiftOptionsConfig = {
  enabled?: boolean
  title?: string
  description?: string
  buttonLabel?: string
  modalTitle?: string
  emptyLabel?: string
  items?: InvitationGiftOption[]
  features?: {
    enabled?: boolean
    giftOptionsEnabled?: boolean
    gift_options_enabled?: boolean
  }
}

export type InvitationBrandingConfig = {
  visible: boolean
  label: string
}

export type InvitationSaveDateConfig = {
  enabled: boolean
  label: string
}

export type InvitationDressCodeConfig = {
  enabled: boolean
  code?: string
  title: string
  description: string
}

export type InvitationThemeSectionConfig = {
  background?: string
  surface?: string
  text?: string
  primaryText?: string
  secondaryText?: string
  counterText?: string
  accent?: string
  buttonBackground?: string
  buttonText?: string
  gradients?: Record<string, InvitationThemeGradientConfig>
}

export type InvitationThemeGradientConfig = {
  enabled?: boolean
  type?: 'linear' | 'radial' | 'conic'
  angle?: number
  colors?: string[]
}

export type InvitationThemeConfig = {
  primary?: string
  secondary?: string
  text?: string
  background?: string
  backgroundAccent?: string
  sectionBackground?: string
  buttonBackground?: string
  buttonBackgroundAlt?: string
  buttonText?: string
  backgroundGradient?: boolean
  buttonGradient?: boolean
  customPalette?: string[]
  gradients?: Record<string, InvitationThemeGradientConfig>
  sections?: Record<string, InvitationThemeSectionConfig>
}

export type WeddingTemplateData = {
  theme?: InvitationThemeConfig
  hero?: {
    title?: string
    subtitle?: string
  }
  couple: {
    headline: string
    brideName: string
    groomName: string
  }
  event: {
    date: InvitationEventDate
    venue: string
    city: string
  }
  story: InvitationStoryMoment[]
  gallery: InvitationGalleryItem[]
  faq?: InvitationFaqItem[]
  schedule: InvitationScheduleItem[]
  location: InvitationLocation
  locations?: InvitationLocation[]
  music: InvitationMusic
  rsvp: InvitationRsvpConfig
  branding?: InvitationBrandingConfig
  checkin?: InvitationCheckinConfig
  countdown?: InvitationCountdownConfig
  saveDate?: InvitationSaveDateConfig
  dressCode?: InvitationDressCodeConfig
  wall?: InvitationWallConfig
  wallPreview?: InvitationWallPreviewConfig
  djSongRequests?: InvitationDjSongRequestsConfig
  giftOptions?: InvitationGiftOptionsConfig
}

export type InvitationTemplateDataMap = {
  wedding: WeddingTemplateData
}

export type InvitationTemplateRendererProps<TEventType extends InvitationTemplateEventType = InvitationTemplateEventType> = {
  templateId: number
  manifest: InvitationTemplateManifest
  data: InvitationTemplateDataMap[TEventType]
}

export type InvitationTemplatePreviewDataContext = {
  invitationTitle?: string
  typeEventName?: string
}

export type InvitationTemplateCapabilities = {
  inlineEditor?: boolean
}

export type InvitationTemplateModule<TEventType extends InvitationTemplateEventType = InvitationTemplateEventType> = {
  manifest: InvitationTemplateManifest
  component: Component<InvitationTemplateRendererProps<TEventType>>
  capabilities?: InvitationTemplateCapabilities
  createPreviewData?: (context?: InvitationTemplatePreviewDataContext) => InvitationTemplateDataMap[TEventType]
}

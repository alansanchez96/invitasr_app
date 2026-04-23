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
  formLabels?: {
    firstName?: string
    lastName?: string
    dietaryRestrictions?: string
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
  status?: string
  isVisible?: boolean
  postedAt?: string | null
}

export type InvitationWallConfig = {
  title?: string
  description?: string
  addLabel?: string
  emptyStateLabel?: string
  limit?: number | null
  receivedCount?: number | null
  messages: InvitationWallMessage[]
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

export type WeddingTemplateData = {
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
  music: InvitationMusic
  rsvp: InvitationRsvpConfig
  branding?: InvitationBrandingConfig
  checkin?: InvitationCheckinConfig
  countdown?: InvitationCountdownConfig
  saveDate?: InvitationSaveDateConfig
  dressCode?: InvitationDressCodeConfig
  wall?: InvitationWallConfig
  wallPreview?: InvitationWallPreviewConfig
}

export type InvitationTemplateDataMap = {
  wedding: WeddingTemplateData
}

export type InvitationTemplateRendererProps<TEventType extends InvitationTemplateEventType = InvitationTemplateEventType> = {
  templateId: number
  manifest: InvitationTemplateManifest
  data: InvitationTemplateDataMap[TEventType]
}

export type InvitationTemplateModule<TEventType extends InvitationTemplateEventType = InvitationTemplateEventType> = {
  manifest: InvitationTemplateManifest
  component: Component<InvitationTemplateRendererProps<TEventType>>
}

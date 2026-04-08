import type { Component } from 'vue'

export type InvitationTemplateEventType = 'wedding'

export type InvitationTemplateFeature =
  | 'hero'
  | 'countdown'
  | 'story'
  | 'gallery'
  | 'schedule'
  | 'location'
  | 'music'
  | 'rsvp'

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
  alt: string
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
}

export type InvitationMusic = {
  title: string
  artist: string
  audioUrl?: string
}

export type InvitationRsvpConfig = {
  endpoint: string
  enabled: boolean
  submitLabel: string
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
  schedule: InvitationScheduleItem[]
  location: InvitationLocation
  music: InvitationMusic
  rsvp: InvitationRsvpConfig
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

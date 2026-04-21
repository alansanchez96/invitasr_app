import type { InvitationTemplateManifest } from '@/templates/types'

export const weddingSnowManifest: InvitationTemplateManifest = {
  id: 1001,
  slug: 'wedding-snow-basic',
  name: 'Wedding Snow',
  eventType: 'wedding',
  summary: 'Estilo limpio y emocional para bodas del plan Basic.',
  tone: 'Romantico minimalista',
  previewLabel: 'Boda · Wedding Snow',
  featureFlags: ['hero', 'checkin', 'countdown', 'story', 'gallery', 'location', 'save-date', 'dress-code', 'music', 'faq', 'rsvp'],
}

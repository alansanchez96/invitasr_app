import type { InvitationTemplateManifest } from '@/templates/types'

export const romanceLightManifest: InvitationTemplateManifest = {
  id: 2,
  slug: 'romance-light',
  name: 'Romance Light',
  eventType: 'wedding',
  summary: 'Template de pago para bodas con hero luminoso, galeria, FAQ y RSVP elegante.',
  tone: 'Romantico, limpio y editorial',
  previewLabel: 'Boda · Romance Light',
  featureFlags: ['hero', 'checkin', 'countdown', 'gallery', 'faq', 'music', 'rsvp', 'branding'],
}

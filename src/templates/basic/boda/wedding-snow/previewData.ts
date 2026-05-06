import heroBoda from '@/assets/img/hero/boda.webp'
import type { InvitationTemplatePreviewDataContext, WeddingTemplateData } from '@/templates/types'

const resolveText = (value: string | undefined, fallback: string): string => {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export const createWeddingSnowPreviewData = (
  context: InvitationTemplatePreviewDataContext = {},
): WeddingTemplateData => {
  const invitationTitle = resolveText(context.invitationTitle, 'Mi invitación de boda')

  return {
    couple: {
      headline: 'Nos casamos',
      brideName: 'Alan',
      groomName: 'Andrea',
    },
    event: {
      date: {
        iso: '2026-09-12T17:00:00-03:00',
        label: '12 de septiembre de 2026 · 17:00 hs',
      },
      venue: 'Estancia Nevada',
      city: 'Bariloche',
    },
    story: [
      {
        title: 'Un nuevo capítulo',
        description: `Una propuesta simple para personalizar ${invitationTitle.toLowerCase()} en pocos minutos.`,
      },
    ],
    gallery: [
      { id: 'ws-1', imageUrl: heroBoda, alt: 'Foto principal de la pareja' },
      { id: 'ws-2', imageUrl: heroBoda, alt: 'Foto detalle de la pareja' },
      { id: 'ws-3', imageUrl: heroBoda, alt: 'Foto ambiente nevado' },
    ],
    faq: [
      { id: 'ws-faq-1', question: '¿Hay dress code?', answer: 'Sí, elegante sport en tonos claros.' },
      { id: 'ws-faq-2', question: '¿A qué hora empieza?', answer: 'La recepción inicia a las 17:00 hs.' },
    ],
    schedule: [
      { id: 'welcome', time: '17:00', title: 'Recepción', description: 'Ingreso de invitados y brindis inicial.' },
      { id: 'ceremony', time: '18:00', title: 'Ceremonia', description: 'Celebración central junto a familia y amigos.' },
    ],
    location: {
      name: 'Estancia Nevada',
      address: 'Ruta 40 km 24, Bariloche',
      mapsUrl: 'https://maps.google.com/?q=Bariloche+Argentina',
      uberEnabled: true,
      uberUrl: 'https://m.uber.com/ul/?action=setPickup',
    },
    music: {
      title: 'Can’t Help Falling in Love',
      artist: 'Elvis Presley',
      audioUrl: '',
      youtubeUrl: '',
      muted: true,
    },
    rsvp: {
      endpoint: '/api/public/invitations/wedding-snow/rsvp',
      enabled: true,
      submitLabel: 'Confirmar asistencia',
      formLabels: {
        firstName: 'Nombre',
        lastName: 'Apellido',
        dietaryRestrictions: 'Restricción alimentaria',
      },
    },
    checkin: {
      eyebrow: 'Bienvenida',
      title: 'Bienvenida interactiva',
      message: 'Tu experiencia comienza aquí.',
      buttonLabel: 'Entrar',
      showEventDate: false,
      eventDateIso: '2026-09-12T17:00:00-03:00',
      showEntryValue: false,
      entry: {
        currency: 'USD',
        amount: 0,
      },
    },
    countdown: {
      eyebrow: 'Cuenta regresiva',
      title: 'Falta muy poco',
      note: 'Cada detalle está preparado para este gran día.',
      daysLabel: '90 días',
      hoursLabel: '06 horas',
      targetDateIso: '2026-09-12T17:00:00-03:00',
    },
    saveDate: {
      enabled: true,
      label: 'Guardar fecha',
    },
    dressCode: {
      enabled: true,
      title: 'Dress code',
      description: 'Elegante sport en tonos claros.',
    },
    branding: {
      visible: false,
      label: 'InvitaSR',
    },
  }
}

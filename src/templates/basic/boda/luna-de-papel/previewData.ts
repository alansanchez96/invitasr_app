import heroBoda from '@/assets/img/hero/boda.webp'
import type { InvitationTemplatePreviewDataContext, WeddingTemplateData } from '@/templates/types'

const resolveText = (value: string | undefined, fallback: string): string => {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export const createLunaDePapelPreviewData = (
  context: InvitationTemplatePreviewDataContext = {},
): WeddingTemplateData => {
  const invitationTitle = resolveText(context.invitationTitle, 'nuestra boda')

  return {
    theme: {
      primary: '#3f5f55',
      secondary: '#b97865',
      text: '#241b17',
      background: '#fbf4ea',
      backgroundAccent: '#eef0df',
      sectionBackground: '#fffaf2',
      buttonBackground: '#3f5f55',
      buttonBackgroundAlt: '#9d6255',
      buttonText: '#fffaf2',
    },
    hero: {
      title: 'Lo nuestro, en papel y luna',
      subtitle: 'Una noche para celebrar lo que fuimos, lo que somos y todo lo que viene.',
    },
    couple: {
      headline: 'Lo nuestro, en papel y luna',
      brideName: 'Emilia',
      groomName: 'Tomás',
    },
    event: {
      date: {
        iso: '2026-10-17T18:30:00-03:00',
        label: '17 de octubre de 2026 · 18:30 hs',
      },
      venue: 'Casa del Lago',
      city: 'San Isidro',
    },
    story: [
      {
        title: 'Una historia escrita despacio',
        description: `Creamos ${invitationTitle.toLowerCase()} para reunir a las personas que caminaron con nosotros hasta este momento. Queremos que cada detalle se sienta cercano, simple y lleno de significado.`,
      },
    ],
    gallery: [
      { id: 'luna-1', imageUrl: heroBoda, alt: 'Retrato editorial de la pareja' },
      { id: 'luna-2', imageUrl: heroBoda, alt: 'Detalle cálido de la boda' },
      { id: 'luna-3', imageUrl: heroBoda, alt: 'Momento íntimo de la pareja' },
      { id: 'luna-4', imageUrl: heroBoda, alt: 'Escena de celebración' },
      { id: 'luna-5', imageUrl: heroBoda, alt: 'Detalle floral de la boda' },
    ],
    faq: [
      { id: 'luna-faq-1', question: '¿Podemos llevar niños?', answer: 'Será una celebración pensada para adultos.' },
      { id: 'luna-faq-2', question: '¿Hay estacionamiento?', answer: 'Sí, el lugar cuenta con estacionamiento para invitados.' },
    ],
    schedule: [],
    location: {
      name: 'Casa del Lago',
      address: 'Av. del Libertador 1200, San Isidro',
      mapsUrl: 'https://maps.google.com/?q=San+Isidro+Buenos+Aires',
      uberEnabled: true,
      uberUrl: 'https://m.uber.com/ul/?action=setPickup',
    },
    music: {
      title: 'La Vie en Rose',
      artist: 'Louis Armstrong',
      audioUrl: '',
      youtubeUrl: '',
      muted: true,
    },
    rsvp: {
      endpoint: '/api/public/invitations/luna-de-papel/rsvp',
      enabled: true,
      submitLabel: 'Confirmar asistencia',
      formLabels: {
        firstName: 'Nombre',
        lastName: 'Apellido',
        dietaryRestrictions: 'Restricción alimentaria',
        whatsapp: 'WhatsApp',
        companions: 'Acompañantes',
      },
    },
    checkin: {
      eyebrow: 'Bienvenida',
      title: 'Gracias por estar cerca',
      message: 'Antes de entrar, respira un segundo: esta celebración también es tuya.',
      buttonLabel: 'Entrar',
      showEventDate: false,
      eventDateIso: '2026-10-17T18:30:00-03:00',
      showEntryValue: false,
      entry: {
        currency: 'USD',
        amount: 0,
      },
    },
    countdown: {
      eyebrow: 'Cuenta regresiva',
      title: 'La noche se acerca',
      note: 'Faltan pocos pasos para encontrarnos bajo la misma luna.',
      daysLabel: '120 días',
      hoursLabel: '08 horas',
      targetDateIso: '2026-10-17T18:30:00-03:00',
    },
    saveDate: {
      enabled: true,
      label: 'Guardar fecha',
    },
    dressCode: {
      enabled: true,
      title: 'Dress code',
      description: 'Elegante, con tonos naturales o acentos cálidos.',
    },
    branding: {
      visible: false,
      label: 'InvitaSR',
    },
  }
}

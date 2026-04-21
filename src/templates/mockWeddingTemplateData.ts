import heroBautismo from '@/assets/img/hero/bautismo.webp'
import heroBabyShower from '@/assets/img/hero/babyshower.webp'
import heroBoda from '@/assets/img/hero/boda.webp'
import heroEgresados from '@/assets/img/hero/egresados.webp'
import heroXv from '@/assets/img/hero/xv.webp'
import type { WeddingTemplateData } from '@/templates/types'

export const weddingTemplateMocks: Record<number, WeddingTemplateData> = {
  1001: {
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
        description: 'Elegimos un estilo simple para que personalices cada texto y compartas este momento con tu gente.',
      },
    ],
    gallery: [
      { id: 'ws-1', imageUrl: heroBoda, alt: 'Foto principal de la pareja' },
      { id: 'ws-2', imageUrl: heroBabyShower, alt: 'Foto detalle de la pareja' },
      { id: 'ws-3', imageUrl: heroXv, alt: 'Foto ambiente nevado' },
    ],
    schedule: [
      { id: 'welcome', time: '17:00', title: 'Recepción', description: 'Ingreso de invitados y brindis inicial.' },
      { id: 'ceremony', time: '18:00', title: 'Ceremonia', description: 'Celebración central junto a familia y amigos.' },
    ],
    location: {
      name: 'Estancia Nevada',
      address: 'Ruta 40 km 24, Bariloche',
      mapsUrl: 'https://maps.google.com/?q=Bariloche+Argentina',
      uberUrl: 'https://m.uber.com/ul/?action=setPickup',
    },
    music: {
      title: 'Can’t Help Falling in Love',
      artist: 'Elvis Presley',
      youtubeUrl: 'https://www.youtube.com/watch?v=VEgwXzfKen8',
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
  },
  2: {
    couple: {
      headline: 'Nos casamos',
      brideName: 'Alan',
      groomName: 'Andrea',
    },
    event: {
      date: {
        iso: '2026-08-24T18:00:00-03:00',
        label: '24 de agosto de 2026 · 18:00 hs',
      },
      venue: 'Estancia Romance',
      city: 'Buenos Aires',
    },
    story: [
      {
        title: 'Nuestra historia',
        description: 'Una invitacion elegante, luminosa y clara para compartir el momento mas importante de nuestra vida.',
      },
    ],
    gallery: [
      { id: 'rl-1', imageUrl: heroBoda, alt: 'Sesion editorial de pareja' },
      { id: 'rl-2', imageUrl: heroBabyShower, alt: 'Foto luminosa de pareja' },
      { id: 'rl-3', imageUrl: heroXv, alt: 'Detalle romantico' },
    ],
    faq: [
      { id: 'rl-faq-1', question: 'Hay dress code?', answer: 'Si, elegante sport en tonos claros.' },
      { id: 'rl-faq-2', question: 'Puedo llevar acompanante?', answer: 'Si figura en tu invitacion, te esperamos con gusto.' },
    ],
    schedule: [],
    location: {
      name: 'Estancia Romance',
      address: 'Ruta 2 km 40, Buenos Aires',
      mapsUrl: 'https://maps.google.com/?q=Estancia+Romance',
    },
    music: {
      title: 'Perfect',
      artist: 'Ed Sheeran',
    },
    rsvp: {
      endpoint: '/api/public/invitations/romance-light/rsvp',
      enabled: true,
      submitLabel: 'Confirmar asistencia',
    },
    branding: {
      visible: false,
      label: 'InvitaSR',
    },
    checkin: {
      eyebrow: 'Antes de entrar',
      title: 'Nos encantaria compartir este momento contigo',
      message: 'Revisa la fecha del evento y continua.',
      buttonLabel: 'Entrar',
    },
    countdown: {
      eyebrow: 'Cuenta regresiva',
      title: 'Cada detalle ya esta en marcha',
      note: 'Una experiencia editorial pensada para bodas elegantes.',
      daysLabel: '86 dias',
      hoursLabel: '04 horas',
    },
  },
  42: {
    couple: {
      headline: 'Nos casamos',
      brideName: 'Camila',
      groomName: 'Santiago',
    },
    event: {
      date: {
        iso: '2026-11-14T18:30:00-03:00',
        label: '14 de noviembre de 2026 · 18:30 hs',
      },
      venue: 'Estancia La Emilia',
      city: 'Posadas, Misiones',
    },
    story: [
      {
        title: 'Nuestro comienzo',
        description: 'Una historia que empezo con una charla simple y termino convirtiendose en un proyecto de vida juntos.',
      },
      {
        title: 'El gran si',
        description: 'Queremos compartir este momento con quienes fueron parte de cada paso, cada viaje y cada alegria.',
      },
    ],
    gallery: [
      { id: 'w-42-1', imageUrl: heroBoda, alt: 'Sesion romantica al aire libre' },
      { id: 'w-42-2', imageUrl: heroBabyShower, alt: 'Foto editorial con flores' },
      { id: 'w-42-3', imageUrl: heroXv, alt: 'Detalle de celebracion elegante' },
    ],
    schedule: [
      { id: 'ceremony', time: '18:30', title: 'Ceremonia', description: 'Ingreso y ceremonia central en el jardin principal.' },
      { id: 'cocktail', time: '19:30', title: 'Recepcion', description: 'Brindis de bienvenida y primeras fotos con invitados.' },
      { id: 'party', time: '21:00', title: 'Fiesta', description: 'Cena, baile y una noche para celebrar con todos.' },
    ],
    location: {
      name: 'Estancia La Emilia',
      address: 'Ruta 12 km 7, Posadas, Misiones',
      mapsUrl: 'https://maps.google.com/?q=Posadas+Misiones',
    },
    music: {
      title: 'Perfect',
      artist: 'Ed Sheeran',
    },
    rsvp: {
      endpoint: '/api/invitations/rsvp',
      enabled: true,
      submitLabel: 'Confirmar asistencia',
    },
  },
  43: {
    couple: {
      headline: 'Celebremos nuestro gran dia',
      brideName: 'Julieta',
      groomName: 'Mateo',
    },
    event: {
      date: {
        iso: '2026-12-05T17:00:00-03:00',
        label: '5 de diciembre de 2026 · 17:00 hs',
      },
      venue: 'Casa del Lago',
      city: 'Encarnacion, Paraguay',
    },
    story: [
      {
        title: 'Un encuentro inesperado',
        description: 'La complicidad, la paciencia y las ganas de construir juntos nos trajeron hasta aca.',
      },
      {
        title: 'Queremos celebrarlo con vos',
        description: 'Preparamos una experiencia calida y cercana para compartir este momento con la gente que mas queremos.',
      },
    ],
    gallery: [
      { id: 'w-43-1', imageUrl: heroBoda, alt: 'Retrato editorial de pareja' },
      { id: 'w-43-2', imageUrl: heroEgresados, alt: 'Detalle romantico de manos' },
      { id: 'w-43-3', imageUrl: heroBautismo, alt: 'Ambiente elegante junto al lago' },
    ],
    schedule: [
      { id: 'welcome', time: '17:00', title: 'Bienvenida', description: 'Recepcion inicial con vista al lago y musica en vivo.' },
      { id: 'vows', time: '18:00', title: 'Votos', description: 'Ceremonia central y brindis con nuestras familias.' },
      { id: 'after', time: '20:30', title: 'Celebracion', description: 'Cena, barra abierta y fiesta hasta la medianoche.' },
    ],
    location: {
      name: 'Casa del Lago',
      address: 'Avenida Costanera 1240, Encarnacion',
      mapsUrl: 'https://maps.google.com/?q=Encarnacion+Paraguay',
    },
    music: {
      title: 'A Thousand Years',
      artist: 'Christina Perri',
    },
    rsvp: {
      endpoint: '/api/invitations/rsvp',
      enabled: true,
      submitLabel: 'Reservar mi lugar',
    },
  },
}

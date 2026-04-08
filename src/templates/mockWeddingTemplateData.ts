import heroBautismo from '@/assets/img/hero/bautismo.webp'
import heroBabyShower from '@/assets/img/hero/babyshower.webp'
import heroBoda from '@/assets/img/hero/boda.webp'
import heroEgresados from '@/assets/img/hero/egresados.webp'
import heroXv from '@/assets/img/hero/xv.webp'
import type { WeddingTemplateData } from '@/templates/types'

export const weddingTemplateMocks: Record<number, WeddingTemplateData> = {
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

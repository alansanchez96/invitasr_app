<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { InvitationTemplateRendererProps } from '@/templates/types'

type TemplateProps = InvitationTemplateRendererProps<'wedding'> & {
  editable?: boolean
  activeField?: string | null
  sectionVisibility?: Record<string, boolean>
  checkinPreview?: boolean
  constrainedOverlay?: boolean
}

const props = withDefaults(defineProps<TemplateProps>(), {
  editable: false,
  activeField: null,
  sectionVisibility: () => ({}),
  checkinPreview: false,
  constrainedOverlay: false,
})

const emit = defineEmits<{
  (event: 'start-edit', field: string): void
  (event: 'update-field', payload: { field: string; value: string }): void
  (event: 'finish-edit'): void
}>()

const faqModalOpen = ref(false)
const musicMuted = ref(Boolean(props.data.music?.muted ?? true))
const countdownNow = ref(Date.now())
const checkinOverlayVisible = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const galleryCarouselIndex = ref(0)
const galleryLightboxOpen = ref(false)
const galleryLightboxIndex = ref(0)
const isMobileGalleryViewport = ref(false)
let timerId: ReturnType<typeof setInterval> | null = null
const MOBILE_GALLERY_BREAKPOINT = 640

type GalleryDisplaySlideRole = 'left' | 'center' | 'right'

type GalleryDisplaySlide = {
  index: number
  item: (typeof props.data.gallery)[number]
  role: GalleryDisplaySlideRole
}

const resolveText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  return value.trim().length ? value : fallback
}

const toDate = (value: string): Date | null => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const fallbackAudioByYoutubeId: Record<string, string> = {
  VEgwXzfKen8: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  uh5jGOkodw8: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
}

const dressCodeByCode: Record<string, { title: string; description: string }> = {
  elegant_sport: {
    title: 'Dress code',
    description: 'Elegante sport en tonos claros.',
  },
  formal_black_tie: {
    title: 'Vestimenta formal',
    description: 'Traje oscuro y vestido largo. Se sugiere etiqueta de gala.',
  },
  semi_formal: {
    title: 'Semi formal',
    description: 'Look prolijo y elegante, sin llegar a etiqueta completa.',
  },
  cocktail: {
    title: 'Estilo cóctel',
    description: 'Vestido corto o midi y traje liviano. Chic y cómodo.',
  },
  casual_chic: {
    title: 'Casual chic',
    description: 'Estilo relajado y cuidado. Evita ropa deportiva.',
  },
  boho: {
    title: 'Boho',
    description: 'Tonos naturales y telas livianas con estilo bohemio.',
  },
  beach_white: {
    title: 'Playa en blanco',
    description: 'Outfit fresco en tonos blancos o arena.',
  },
  country_chic: {
    title: 'Campo chic',
    description: 'Ropa elegante y cómoda para exterior, ideal para jardín/campo.',
  },
  gala: {
    title: 'Gala',
    description: 'Etiqueta máxima para una noche especial.',
  },
  thematic: {
    title: 'Temática especial',
    description: 'Sigue la temática del evento indicada por los anfitriones.',
  },
}

const extractYoutubeVideoId = (url: string): string | null => {
  const trimmed = url.trim()
  if (!trimmed) return null

  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (youtuBeMatch?.[1]) return youtuBeMatch[1]

  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (watchMatch?.[1]) return watchMatch[1]

  const embedMatch = trimmed.match(/embed\/([a-zA-Z0-9_-]{6,})/)
  if (embedMatch?.[1]) return embedMatch[1]

  return null
}

const toCalendarFormat = (date: Date): string => {
  const iso = date.toISOString()
  return iso.replace(/[-:]/g, '').split('.')[0] + 'Z'
}

const heroContent = computed(() => {
  const raw = props.data as Record<string, unknown> & {
    hero?: { title?: string; subtitle?: string }
  }
  const hero = raw.hero ?? {}

  return {
    title: resolveText(hero.title, resolveText(props.data.couple?.headline, 'Nos casamos')),
    subtitle: resolveText(
      hero.subtitle,
      'Diseñada para que puedas personalizarla en minutos y compartirla con tu gente.',
    ),
  }
})

const brideName = computed(() => resolveText(props.data.couple?.brideName, 'Nombre 1'))
const groomName = computed(() => resolveText(props.data.couple?.groomName, 'Nombre 2'))
const eventDateLabel = computed(() => resolveText(props.data.event?.date?.label, 'Fecha del evento'))
const eventVenue = computed(() => resolveText(props.data.event?.venue, 'Lugar del evento'))
const eventCity = computed(() => resolveText(props.data.event?.city, 'Ciudad'))
const storyPrimary = computed(() => {
  const first = Array.isArray(props.data.story) ? props.data.story[0] : null
  return {
    title: resolveText(first?.title, 'Nuestra historia'),
    description: resolveText(first?.description, 'Comparte tu historia con un texto breve y emocional.'),
  }
})

const countdownTarget = computed(() => {
  const targetIso = props.data.countdown?.targetDateIso || props.data.event?.date?.iso
  return targetIso ? toDate(targetIso) : null
})

const countdown = computed(() => ({
  note: resolveText(props.data.countdown?.note, 'Cada detalle está preparado para este gran día.'),
  title: resolveText(props.data.countdown?.title, 'Falta muy poco'),
}))

const countdownMetrics = computed(() => {
  const target = countdownTarget.value
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }
  }

  const diff = Math.max(target.getTime() - countdownNow.value, 0)
  const ended = diff <= 0
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds, ended }
})

const rsvpLabel = computed(() => resolveText(props.data.rsvp?.submitLabel, 'Confirmar asistencia'))
const rsvpLabels = computed(() => ({
  firstName: resolveText(props.data.rsvp?.formLabels?.firstName, 'Nombre'),
  lastName: resolveText(props.data.rsvp?.formLabels?.lastName, 'Apellido'),
  dietaryRestrictions: resolveText(props.data.rsvp?.formLabels?.dietaryRestrictions, 'Restricción alimentaria'),
}))

const locationName = computed(() => resolveText(props.data.location?.name, 'Ubicación del evento'))
const locationAddress = computed(() => resolveText(props.data.location?.address, 'Dirección'))
const mapsUrl = computed(() => resolveText(props.data.location?.mapsUrl, 'https://maps.google.com'))
const uberUrl = computed(() => resolveText(props.data.location?.uberUrl, 'https://m.uber.com/ul/'))

const dressCode = computed(() => {
  const code = resolveText(props.data.dressCode?.code, '')
  const preset = code ? dressCodeByCode[code] : null

  return {
    title: resolveText(props.data.dressCode?.title, preset?.title ?? 'Dress code'),
    description: resolveText(props.data.dressCode?.description, preset?.description ?? 'Elegante sport en tonos claros.'),
  }
})

const faqItems = computed(() => (Array.isArray(props.data.faq) ? props.data.faq : []).filter((item) => item.question && item.answer))

const galleryItems = computed(() => {
  if (Array.isArray(props.data.gallery) && props.data.gallery.length) {
    return props.data.gallery
  }

  return [
    {
      id: 'placeholder-1',
      imageUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=80',
      alt: 'Foto de muestra 1',
    },
    {
      id: 'placeholder-2',
      imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=80',
      alt: 'Foto de muestra 2',
    },
    {
      id: 'placeholder-3',
      imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      alt: 'Foto de muestra 3',
    },
  ]
})

const normalizeGalleryIndex = (index: number, total: number): number => {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

const resolveGalleryDisplayUrl = (item: (typeof props.data.gallery)[number]): string =>
  resolveText(item.galleryUrl, resolveText(item.imageUrl, ''))

const resolveGalleryThumbnailUrl = (item: (typeof props.data.gallery)[number]): string =>
  resolveText(item.thumbnailUrl, resolveGalleryDisplayUrl(item))

const resolveGalleryLightboxUrl = (item: (typeof props.data.gallery)[number]): string =>
  resolveText(item.lightboxUrl, resolveText(item.imageUrl, resolveGalleryDisplayUrl(item)))

const normalizedGalleryCarouselIndex = computed(() =>
  normalizeGalleryIndex(galleryCarouselIndex.value, galleryItems.value.length),
)

const normalizedGalleryLightboxIndex = computed(() =>
  normalizeGalleryIndex(galleryLightboxIndex.value, galleryItems.value.length),
)

const galleryHasMultipleItems = computed(() => galleryItems.value.length > 1)
const galleryIsCompactSet = computed(() => galleryItems.value.length <= 2)
const galleryIsSingleItem = computed(() => galleryItems.value.length === 1)
const galleryDesktopSlides = computed<GalleryDisplaySlide[]>(() => {
  const total = galleryItems.value.length
  if (total <= 0) return []

  const centerIndex = normalizedGalleryCarouselIndex.value

  if (isMobileGalleryViewport.value) {
    return [{ index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' }]
  }

  if (total === 1) {
    return [{ index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' }]
  }

  if (total === 2) {
    const nextIndex = normalizeGalleryIndex(centerIndex + 1, total)
    return [
      { index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'left' },
      { index: nextIndex, item: galleryItems.value[nextIndex]!, role: 'right' },
    ]
  }

  const leftIndex = normalizeGalleryIndex(centerIndex - 1, total)
  const rightIndex = normalizeGalleryIndex(centerIndex + 1, total)

  return [
    { index: leftIndex, item: galleryItems.value[leftIndex]!, role: 'left' },
    { index: centerIndex, item: galleryItems.value[centerIndex]!, role: 'center' },
    { index: rightIndex, item: galleryItems.value[rightIndex]!, role: 'right' },
  ]
})

const activeLightboxItem = computed(() => {
  if (!galleryItems.value.length) return null
  return galleryItems.value[normalizedGalleryLightboxIndex.value] ?? null
})

const galleryCounterLabel = computed(() => {
  const total = galleryItems.value.length
  if (!total) return '0 / 0'
  return `${normalizedGalleryCarouselIndex.value + 1} / ${total}`
})

const galleryLightboxCounterLabel = computed(() => {
  const total = galleryItems.value.length
  if (!total) return '0 / 0'
  return `${normalizedGalleryLightboxIndex.value + 1} / ${total}`
})

const galleryLightboxStyle = computed<Record<string, string>>(() => {
  if (props.editable || props.constrainedOverlay) {
    return {
      position: 'absolute',
      inset: '0',
      height: '100%',
      minHeight: '100%',
    }
  }

  return {
    position: 'fixed',
    inset: '0',
    height: '100dvh',
    minHeight: '100dvh',
  }
})

const musicAudioUrl = computed(() => {
  const configured = resolveText(props.data.music?.audioUrl, '')
  if (configured) return configured

  const youtubeUrl = resolveText(props.data.music?.youtubeUrl, '')
  const videoId = extractYoutubeVideoId(youtubeUrl)
  if (videoId && fallbackAudioByYoutubeId[videoId]) {
    return fallbackAudioByYoutubeId[videoId]
  }

  return fallbackAudioByYoutubeId.VEgwXzfKen8
})

const saveDateLabel = computed(() => resolveText(props.data.saveDate?.label, 'Guardar fecha'))

const saveDateUrl = computed(() => {
  const target = countdownTarget.value ?? toDate(props.data.event?.date?.iso ?? '')
  if (!target) return '#'
  const endDate = new Date(target.getTime() + 1000 * 60 * 60 * 2)
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Boda de ${brideName.value} y ${groomName.value}`,
    dates: `${toCalendarFormat(target)}/${toCalendarFormat(endDate)}`,
    details: storyPrimary.value.description,
    location: `${locationName.value}, ${locationAddress.value}`,
  })

  return `https://calendar.google.com/calendar/render?${query.toString()}`
})

const checkinTitle = computed(() => resolveText(props.data.checkin?.title, 'Bienvenida interactiva'))
const checkinMessage = computed(() => resolveText(props.data.checkin?.message, 'Tu experiencia comienza aquí.'))
const checkinButton = computed(() => resolveText(props.data.checkin?.buttonLabel, 'Entrar'))

const checkinOverlayStyle = computed<Record<string, string>>(() => {
  if (props.editable || props.constrainedOverlay) {
    return {
      position: 'absolute',
      inset: '0',
      height: '100%',
      minHeight: '100%',
    }
  }

  return {
    position: 'fixed',
    inset: '0',
    height: '100dvh',
    minHeight: '100dvh',
  }
})

const isEditing = (field: string) => props.editable && props.activeField === field

const isSectionVisible = (key: string) => props.sectionVisibility[key] !== false

const startEdit = (field: string) => {
  if (!props.editable) return
  emit('start-edit', field)
}

const updateText = (field: string, event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('update-field', {
    field,
    value: target?.value ?? '',
  })
}

const finishEdit = () => {
  emit('finish-edit')
}

const selectGallerySlide = (index: number) => {
  const total = galleryItems.value.length
  if (!total) return
  galleryCarouselIndex.value = normalizeGalleryIndex(index, total)
}

const goToPreviousGallerySlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectGallerySlide(normalizedGalleryCarouselIndex.value - 1)
}

const goToNextGallerySlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectGallerySlide(normalizedGalleryCarouselIndex.value + 1)
}

const openGalleryLightbox = (index = normalizedGalleryCarouselIndex.value) => {
  const total = galleryItems.value.length
  if (!total) return
  galleryLightboxIndex.value = normalizeGalleryIndex(index, total)
  galleryLightboxOpen.value = true
}

const closeGalleryLightbox = () => {
  galleryLightboxOpen.value = false
}

const selectLightboxSlide = (index: number) => {
  const total = galleryItems.value.length
  if (!total) return
  galleryLightboxIndex.value = normalizeGalleryIndex(index, total)
}

const goToPreviousLightboxSlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectLightboxSlide(normalizedGalleryLightboxIndex.value - 1)
}

const goToNextLightboxSlide = () => {
  if (!galleryHasMultipleItems.value) return
  selectLightboxSlide(normalizedGalleryLightboxIndex.value + 1)
}

const toggleMute = () => {
  musicMuted.value = !musicMuted.value
  if (!musicMuted.value) {
    void startBackgroundMusic()
  }
}

const openFaq = () => {
  faqModalOpen.value = true
}

const closeFaq = () => {
  faqModalOpen.value = false
}

const openCheckinOverlay = () => {
  checkinOverlayVisible.value = true
}

const closeCheckinOverlay = () => {
  checkinOverlayVisible.value = false
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (!galleryLightboxOpen.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeGalleryLightbox()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goToPreviousLightboxSlide()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goToNextLightboxSlide()
  }
}

const syncGalleryViewportMode = () => {
  isMobileGalleryViewport.value = window.innerWidth <= MOBILE_GALLERY_BREAKPOINT
}

const startBackgroundMusic = async () => {
  const audio = audioRef.value
  if (!audio || !musicAudioUrl.value || !isSectionVisible('music')) return

  audio.muted = musicMuted.value
  audio.loop = true

  if (audio.src !== musicAudioUrl.value) {
    audio.src = musicAudioUrl.value
  }

  try {
    await audio.play()
  } catch {
    // Browser autoplay policies may block playback until user interaction.
  }
}

const pauseBackgroundMusic = () => {
  const audio = audioRef.value
  if (!audio) return
  audio.pause()
}

const syncMusicState = async () => {
  const audio = audioRef.value
  if (!audio) return

  if (!isSectionVisible('music') || !musicAudioUrl.value) {
    pauseBackgroundMusic()
    return
  }

  audio.muted = musicMuted.value
  await startBackgroundMusic()
}

onMounted(() => {
  syncGalleryViewportMode()
  timerId = setInterval(() => {
    countdownNow.value = Date.now()
  }, 1000)
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', syncGalleryViewportMode, { passive: true })

  if (!props.editable && isSectionVisible('checkin')) {
    checkinOverlayVisible.value = true
  }

  void syncMusicState()
})

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId)
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', syncGalleryViewportMode)
  pauseBackgroundMusic()
  if (!props.editable && !props.constrainedOverlay) {
    document.body.style.overflow = ''
  }
})

watch(galleryItems, (items) => {
  if (!items.length) {
    galleryCarouselIndex.value = 0
    galleryLightboxIndex.value = 0
    galleryLightboxOpen.value = false
    return
  }

  galleryCarouselIndex.value = normalizedGalleryCarouselIndex.value
  galleryLightboxIndex.value = normalizedGalleryLightboxIndex.value
})

watch(galleryLightboxOpen, (isOpen) => {
  if (props.editable || props.constrainedOverlay) return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(
  () => props.data.music?.muted,
  (value) => {
    musicMuted.value = Boolean(value ?? true)
  },
)

watch(
  () => props.checkinPreview,
  (value) => {
    if (value) {
      openCheckinOverlay()
    } else if (props.editable) {
      closeCheckinOverlay()
    }
  },
  { immediate: true },
)

watch([musicAudioUrl, () => props.sectionVisibility.music], () => {
  void syncMusicState()
})

watch(musicMuted, () => {
  void syncMusicState()
})
</script>

<template>
  <article class="snow-template" :class="{ 'snow-template--public': !editable }">
    <header v-if="isSectionVisible('hero')" class="snow-hero">
      <p class="snow-tag">Wedding Snow</p>

      <h1 v-if="!isEditing('hero_title')" class="snow-title editable" @dblclick="startEdit('hero_title')">
        {{ heroContent.title }}
      </h1>
      <input
        v-else
        class="inline-input inline-input--title"
        :value="heroContent.title"
        autofocus
        @input="updateText('hero_title', $event)"
        @blur="finishEdit"
        @keydown.enter.prevent="finishEdit" />

      <p
        v-if="!isEditing('hero_subtitle')"
        class="snow-subtitle editable"
        @dblclick="startEdit('hero_subtitle')">
        {{ heroContent.subtitle }}
      </p>
      <textarea
        v-else
        class="inline-input inline-input--multiline"
        :value="heroContent.subtitle"
        autofocus
        rows="2"
        @input="updateText('hero_subtitle', $event)"
        @blur="finishEdit"
        @keydown.esc.prevent="finishEdit" />

      <div class="snow-names">
        <p v-if="!isEditing('bride_name')" class="editable" @dblclick="startEdit('bride_name')">{{ brideName }}</p>
        <input
          v-else
          class="inline-input"
          :value="brideName"
          autofocus
          @input="updateText('bride_name', $event)"
          @blur="finishEdit"
          @keydown.enter.prevent="finishEdit" />

        <span>&</span>

        <p v-if="!isEditing('groom_name')" class="editable" @dblclick="startEdit('groom_name')">{{ groomName }}</p>
        <input
          v-else
          class="inline-input"
          :value="groomName"
          autofocus
          @input="updateText('groom_name', $event)"
          @blur="finishEdit"
          @keydown.enter.prevent="finishEdit" />
      </div>

      <div class="snow-meta">
        <p v-if="!isEditing('event_date_label')" class="editable" @dblclick="startEdit('event_date_label')">
          {{ eventDateLabel }}
        </p>
        <input
          v-else
          class="inline-input"
          :value="eventDateLabel"
          autofocus
          @input="updateText('event_date_label', $event)"
          @blur="finishEdit"
          @keydown.enter.prevent="finishEdit" />

        <p v-if="!isEditing('event_venue')" class="editable" @dblclick="startEdit('event_venue')">{{ eventVenue }}</p>
        <input
          v-else
          class="inline-input"
          :value="eventVenue"
          autofocus
          @input="updateText('event_venue', $event)"
          @blur="finishEdit"
          @keydown.enter.prevent="finishEdit" />

        <p v-if="!isEditing('event_city')" class="editable" @dblclick="startEdit('event_city')">{{ eventCity }}</p>
        <input
          v-else
          class="inline-input"
          :value="eventCity"
          autofocus
          @input="updateText('event_city', $event)"
          @blur="finishEdit"
          @keydown.enter.prevent="finishEdit" />
      </div>
    </header>

    <section v-if="isSectionVisible('checkin')" class="snow-card">
      <p class="section-kicker">Bienvenida interactiva</p>
      <h2>{{ checkinTitle }}</h2>
      <p>{{ checkinMessage }}</p>
      <button class="snow-action" type="button" @click="openCheckinOverlay">{{ checkinButton }}</button>
    </section>

    <section v-if="isSectionVisible('countdown')" class="snow-card">
      <h2>{{ countdown.title }}</h2>
      <p v-if="!isEditing('countdown_note')" class="editable" @dblclick="startEdit('countdown_note')">
        {{ countdown.note }}
      </p>
      <textarea
        v-else
        class="inline-input inline-input--multiline"
        :value="countdown.note"
        autofocus
        rows="2"
        @input="updateText('countdown_note', $event)"
        @blur="finishEdit"
        @keydown.esc.prevent="finishEdit" />
      <div class="snow-countdown">
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.days }}</strong>
          <span>días</span>
        </div>
        <span class="snow-countdown__divider">:</span>
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.hours }}</strong>
          <span>horas</span>
        </div>
        <span class="snow-countdown__divider">:</span>
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.minutes }}</strong>
          <span>min</span>
        </div>
        <span class="snow-countdown__divider">:</span>
        <div class="snow-countdown__unit">
          <strong>{{ countdownMetrics.seconds }}</strong>
          <span>seg</span>
        </div>
      </div>
    </section>

    <section v-if="isSectionVisible('story')" class="snow-card">
      <p class="section-kicker">Historia</p>
      <h2 v-if="!isEditing('story_title')" class="editable" @dblclick="startEdit('story_title')">
        {{ storyPrimary.title }}
      </h2>
      <input
        v-else
        class="inline-input"
        :value="storyPrimary.title"
        autofocus
        @input="updateText('story_title', $event)"
        @blur="finishEdit"
        @keydown.enter.prevent="finishEdit" />

      <p v-if="!isEditing('story_description')" class="editable" @dblclick="startEdit('story_description')">
        {{ storyPrimary.description }}
      </p>
      <textarea
        v-else
        class="inline-input inline-input--multiline"
        :value="storyPrimary.description"
        autofocus
        rows="4"
        @input="updateText('story_description', $event)"
        @blur="finishEdit"
        @keydown.esc.prevent="finishEdit" />
    </section>

    <section v-if="isSectionVisible('gallery')" class="snow-card">
      <p class="section-kicker">Galería</p>
      <div class="snow-gallery-carousel">
        <div class="snow-gallery-carousel__stage">
          <button
            v-if="galleryHasMultipleItems"
            type="button"
            class="snow-gallery-nav snow-gallery-nav--prev"
            aria-label="Imagen anterior"
            @click="goToPreviousGallerySlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 6-6 6 6 6" />
            </svg>
          </button>

          <button
            v-if="galleryHasMultipleItems"
            type="button"
            class="snow-gallery-nav snow-gallery-nav--next"
            aria-label="Imagen siguiente"
            @click="goToNextGallerySlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m10 6 6 6-6 6" />
            </svg>
          </button>

          <div
            class="snow-gallery-strip"
            :class="{
              'snow-gallery-strip--compact': galleryIsCompactSet,
              'snow-gallery-strip--single': galleryIsSingleItem,
            }">
            <button
              v-for="slide in galleryDesktopSlides"
              :key="`gallery-slide-${slide.item.id}-${slide.role}-${slide.index}`"
              type="button"
              class="snow-gallery-card"
              :class="`snow-gallery-card--${slide.role}`"
              :aria-label="`Abrir imagen ${slide.index + 1}`"
              @click="openGalleryLightbox(slide.index)">
              <img
                :src="resolveGalleryDisplayUrl(slide.item)"
                :alt="slide.item.alt"
                loading="lazy" />
            </button>
          </div>
        </div>

        <div class="snow-gallery-carousel__meta">
          <span>{{ galleryCounterLabel }}</span>
          <button type="button" class="snow-gallery-carousel__open" @click="openGalleryLightbox()">
            Ver en pantalla completa
          </button>
        </div>
      </div>
    </section>

    <section v-if="isSectionVisible('location')" class="snow-card snow-location">
      <p class="section-kicker">Ubicación</p>
      <strong>{{ locationName }}</strong>
      <p>{{ locationAddress }}</p>
      <div class="snow-actions-inline">
        <a class="snow-link" :href="mapsUrl" target="_blank" rel="noopener noreferrer">Google Maps</a>
        <a class="snow-link" :href="uberUrl" target="_blank" rel="noopener noreferrer">Pedir Uber</a>
      </div>
    </section>

    <section v-if="isSectionVisible('saveDate')" class="snow-card">
      <p class="section-kicker">Save the date</p>
      <a
        v-if="!editable"
        class="snow-link"
        :href="saveDateUrl"
        target="_blank"
        rel="noopener noreferrer">
        {{ saveDateLabel }}
      </a>
      <button v-else type="button" class="snow-action" disabled>
        {{ saveDateLabel }} (se activa al publicar)
      </button>
    </section>

    <section v-if="isSectionVisible('dressCode')" class="snow-card">
      <p class="section-kicker">Dress code</p>
      <h2>{{ dressCode.title }}</h2>
      <p>{{ dressCode.description }}</p>
    </section>

    <section v-if="isSectionVisible('rsvp')" class="snow-card snow-rsvp">
      <p class="section-kicker">Confirmación</p>
      <form class="snow-rsvp-form" @submit.prevent>
        <label>
          <span>{{ rsvpLabels.firstName }}</span>
          <input type="text" />
        </label>
        <label>
          <span>{{ rsvpLabels.lastName }}</span>
          <input type="text" />
        </label>
        <label>
          <span>{{ rsvpLabels.dietaryRestrictions }}</span>
          <input type="text" />
        </label>
      </form>
      <button
        v-if="!isEditing('rsvp_label')"
        class="snow-rsvp__button editable"
        type="button"
        @dblclick="startEdit('rsvp_label')">
        {{ rsvpLabel }}
      </button>
      <input
        v-else
        class="inline-input"
        :value="rsvpLabel"
        autofocus
        @input="updateText('rsvp_label', $event)"
        @blur="finishEdit"
        @keydown.enter.prevent="finishEdit" />
    </section>

    <audio ref="audioRef" preload="auto" loop playsinline></audio>

    <button
      v-if="isSectionVisible('music')"
      type="button"
      class="snow-music-fab"
      :class="{ active: !musicMuted }"
      :aria-label="musicMuted ? 'Activar música' : 'Silenciar música'"
      @click="toggleMute">
      <span class="music-wave">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span>{{ musicMuted ? 'Activar música' : 'Silenciar música' }}</span>
    </button>

    <section v-if="isSectionVisible('faq')" class="snow-card">
      <p class="section-kicker">Ayuda</p>
      <button class="snow-action" type="button" @click="openFaq">
        Preguntas frecuentes
      </button>
    </section>

    <div v-if="faqModalOpen" class="snow-modal-backdrop" @click.self="closeFaq">
      <div class="snow-modal">
        <header class="snow-modal__head">
          <h3>Preguntas frecuentes</h3>
          <button type="button" aria-label="Salir de preguntas frecuentes" title="Salir" @click="closeFaq">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <div class="snow-modal__body">
          <article v-for="item in faqItems" :key="item.id">
            <h4>{{ item.question }}</h4>
            <p>{{ item.answer }}</p>
          </article>
          <p v-if="!faqItems.length">Aún no hay preguntas cargadas.</p>
        </div>
      </div>
    </div>

    <div
      v-if="galleryLightboxOpen"
      class="snow-gallery-lightbox"
      :style="galleryLightboxStyle"
      @click.self="closeGalleryLightbox">
      <div class="snow-gallery-lightbox__panel">
        <header class="snow-gallery-lightbox__head">
          <p>Galería · {{ galleryLightboxCounterLabel }}</p>
          <button type="button" aria-label="Salir de galería" title="Salir" @click="closeGalleryLightbox">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div class="snow-gallery-lightbox__stage">
          <button
            v-if="galleryHasMultipleItems"
            type="button"
            class="snow-gallery-lightbox__nav snow-gallery-lightbox__nav--prev"
            aria-label="Imagen anterior"
            @click="goToPreviousLightboxSlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 6-6 6 6 6" />
            </svg>
          </button>

          <figure v-if="activeLightboxItem">
            <img :src="resolveGalleryLightboxUrl(activeLightboxItem)" :alt="activeLightboxItem.alt" loading="eager" />
          </figure>

          <button
            v-if="galleryHasMultipleItems"
            type="button"
            class="snow-gallery-lightbox__nav snow-gallery-lightbox__nav--next"
            aria-label="Imagen siguiente"
            @click="goToNextLightboxSlide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m10 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div class="snow-gallery-lightbox__thumbs" role="tablist" aria-label="Miniaturas en visor">
          <button
            v-for="(item, index) in galleryItems"
            :key="`lightbox-${item.id}`"
            type="button"
            class="snow-gallery-lightbox__thumb"
            :class="{ 'is-active': index === normalizedGalleryLightboxIndex }"
            :aria-label="`Ir a imagen ${index + 1}`"
            @click="selectLightboxSlide(index)">
            <img :src="resolveGalleryThumbnailUrl(item)" :alt="item.alt" loading="lazy" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="checkinOverlayVisible"
      class="snow-checkin-overlay"
      :style="checkinOverlayStyle"
      :class="{
        'snow-checkin-overlay--editor': editable,
        'snow-checkin-overlay--embedded': constrainedOverlay,
      }">
      <div class="snow-checkin-overlay__glow snow-checkin-overlay__glow--one"></div>
      <div class="snow-checkin-overlay__glow snow-checkin-overlay__glow--two"></div>
      <div class="snow-checkin-overlay__card">
        <p class="section-kicker">{{ props.checkinPreview ? 'Vista previa check-in' : 'Bienvenida interactiva' }}</p>
        <h3>{{ checkinTitle }}</h3>
        <p>{{ checkinMessage }}</p>
        <button class="snow-action" type="button" @click="closeCheckinOverlay">{{ checkinButton }}</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.snow-template {
  --snow-thumb-size: 64px;
  --snow-thumb-gap: 8px;
  display: grid;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.95), rgba(248, 251, 255, 0.9)),
    linear-gradient(180deg, #f6f7fb 0%, #f2f5fa 100%);
  color: #1f2937;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
  min-height: auto;
}

.snow-template--public {
  min-height: 100vh;
}

.snow-hero,
.snow-card {
  border-radius: 16px;
  border: 1px solid rgba(31, 41, 55, 0.08);
  background: white;
  padding: 16px;
}

.snow-tag,
.section-kicker {
  margin: 0 0 0.5rem;
  font-size: 0.74rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #64748b;
}

.snow-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.snow-action {
  border: 0;
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: #0f172a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.62rem;
}

.snow-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.snow-subtitle {
  margin: 0.75rem 0 0;
  color: #4b5563;
  max-width: 52ch;
}

.snow-names {
  margin-top: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
  font-weight: 700;
}

.snow-names p {
  margin: 0;
}

.snow-meta {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  color: #475569;
}

.snow-meta p {
  margin: 0;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.5);
}

.snow-card h2 {
  margin: 0 0 0.45rem;
  font-size: 1.2rem;
}

.snow-card p {
  margin: 0;
  color: #374151;
}

.snow-countdown {
  margin-top: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, #f8fbff 0%, #eef2ff 100%);
}

.snow-countdown__unit {
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  padding: 0.46rem 0.56rem;
  text-align: center;
  min-width: 64px;
}

.snow-countdown__unit strong {
  display: block;
  font-size: 1.03rem;
  line-height: 1.1;
}

.snow-countdown__unit span {
  font-size: 0.72rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.snow-countdown__divider {
  color: #64748b;
  font-size: 1.2rem;
  font-weight: 700;
  padding-bottom: 0.26rem;
}

.snow-gallery-carousel {
  display: grid;
  gap: 0.78rem;
}

.snow-gallery-carousel__stage {
  position: relative;
  display: grid;
  gap: 0.65rem;
  overflow: visible;
}

.snow-gallery-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 0.75rem;
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
  padding: 0 54px;
}

.snow-gallery-strip--single {
  grid-template-columns: minmax(0, 1fr);
  max-width: 620px;
}

.snow-gallery-strip--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 820px;
}

.snow-gallery-card {
  border: 0;
  margin: 0;
  padding: 0;
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  cursor: zoom-in;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  transition: transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
  aspect-ratio: 3 / 4;
  filter: saturate(0.92);
}

.snow-gallery-card::after {
  content: '';
  position: absolute;
  left: 16%;
  right: 16%;
  bottom: 6px;
  height: 14px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0) 75%);
  filter: blur(5px);
  opacity: 0.45;
  transform: translateY(8px) scale(0.9);
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.snow-gallery-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.snow-gallery-card:hover img {
  transform: scale(1.06);
}

.snow-gallery-card:hover::after {
  opacity: 0.62;
  transform: translateY(10px) scale(1);
}

.snow-gallery-card--left,
.snow-gallery-card--right {
  opacity: 0.82;
  transform: translateY(22px) scale(0.88);
}

.snow-gallery-card--center {
  z-index: 2;
  transform: translateY(-12px) scale(1.04);
  filter: saturate(1.03);
  box-shadow: 0 26px 44px rgba(15, 23, 42, 0.3);
}

.snow-gallery-card--center:hover {
  transform: translateY(-14px) scale(1.06);
}

.snow-gallery-strip--compact .snow-gallery-card,
.snow-gallery-strip--single .snow-gallery-card {
  opacity: 1;
  transform: none;
  aspect-ratio: 3 / 4;
  filter: saturate(1);
}

.snow-gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(226, 232, 240, 0.72);
  background: rgba(15, 23, 42, 0.76);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    background 0.3s ease,
    box-shadow 0.3s ease,
    opacity 0.3s ease,
    visibility 0.3s ease;
  z-index: 4;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.snow-gallery-nav svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.snow-gallery-nav:hover {
  transform: translateY(-50%) scale(1.05);
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.35);
}

.snow-gallery-nav--prev {
  left: 8px;
}

.snow-gallery-nav--next {
  right: 8px;
}

.snow-gallery-carousel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.snow-gallery-carousel__meta span {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}

.snow-gallery-carousel__open {
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 999px;
  background: #fff;
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.72rem;
  cursor: pointer;
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s ease;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(4px);
}

.snow-gallery-carousel:hover .snow-gallery-nav,
.snow-gallery-carousel:focus-within .snow-gallery-nav {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.snow-gallery-carousel:hover .snow-gallery-carousel__open,
.snow-gallery-carousel:focus-within .snow-gallery-carousel__open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.snow-gallery-lightbox {
  z-index: 130;
  background: rgba(2, 6, 23, 0.84);
  display: grid;
  place-items: center;
  padding: 0.9rem;
}

.snow-gallery-lightbox__panel {
  width: min(1080px, calc(100vw - 1.6rem));
  max-height: calc(100dvh - 1.6rem);
  height: min(900px, calc(100dvh - 1.6rem));
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.snow-gallery-lightbox__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.snow-gallery-lightbox__head p {
  margin: 0;
  color: rgba(226, 232, 240, 0.95);
  font-size: 0.8rem;
  font-weight: 700;
}

.snow-gallery-lightbox__head button {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.7);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snow-gallery-lightbox__head button svg,
.snow-gallery-lightbox__nav svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.snow-gallery-lightbox__stage {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  min-height: 0;
}

.snow-gallery-lightbox__stage figure {
  position: relative;
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.2);
  min-height: 0;
  display: block;
  box-shadow: 0 24px 44px rgba(2, 6, 23, 0.44);
}

.snow-gallery-lightbox__stage figure::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 10px;
  height: 18px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.34) 0%, rgba(15, 23, 42, 0) 74%);
  filter: blur(7px);
  opacity: 0.5;
  pointer-events: none;
}

.snow-gallery-lightbox__stage img {
  width: 100%;
  max-height: min(70vh, 760px);
  object-fit: contain;
  background: rgba(2, 6, 23, 0.85);
  display: block;
}

.snow-gallery-lightbox__nav {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snow-gallery-lightbox__thumbs {
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding: 0.7rem 0.8rem 0.8rem;
  display: flex;
  align-items: center;
  gap: var(--snow-thumb-gap);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.snow-gallery-lightbox__thumb {
  position: relative;
  inline-size: var(--snow-thumb-size);
  block-size: var(--snow-thumb-size);
  flex: 0 0 var(--snow-thumb-size);
  border: 2px solid transparent;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.56);
  padding: 0;
  margin: 0;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.snow-gallery-lightbox__thumb::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: -8px;
  height: 12px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0) 74%);
  filter: blur(5px);
  opacity: 0.5;
  pointer-events: none;
}

.snow-gallery-lightbox__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.snow-gallery-lightbox__thumb.is-active {
  border-color: #60a5fa;
  box-shadow: 0 14px 26px rgba(96, 165, 250, 0.3);
}

.snow-gallery-lightbox__thumb:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 26px rgba(2, 6, 23, 0.4);
}

.snow-location strong {
  display: block;
  margin-bottom: 0.35rem;
}

.snow-actions-inline {
  margin-top: 0.7rem;
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.snow-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  color: #0f172a;
  text-decoration: none;
  font-weight: 700;
  margin-top: 0.42rem;
}

.snow-rsvp__button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.1rem;
  background: #0f172a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.92rem;
}

.snow-rsvp-form {
  display: grid;
  gap: 0.72rem;
  margin-top: 0.6rem;
}

.snow-rsvp-form label {
  display: grid;
  gap: 0.3rem;
}

.snow-rsvp-form span {
  font-size: 0.84rem;
  color: #475569;
  font-weight: 600;
}

.snow-rsvp-form input {
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 10px;
  min-height: 40px;
  padding: 0.5rem 0.65rem;
  font: inherit;
  margin-top: 0.12rem;
}

.editable {
  cursor: text;
}

.editable:hover {
  outline: 1px dashed rgba(15, 23, 42, 0.3);
  outline-offset: 3px;
}

.inline-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: white;
  min-height: 40px;
  padding: 0.5rem 0.7rem;
  font: inherit;
  color: inherit;
}

.inline-input--title {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  font-weight: 700;
}

.inline-input--multiline {
  resize: vertical;
  min-height: 70px;
}

.snow-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.snow-modal {
  width: min(640px, 94vw);
  max-height: min(82vh, 760px);
  border-radius: 16px;
  background: #fff;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.snow-modal--checkin {
  width: min(460px, 94vw);
  max-height: none;
  grid-template-rows: auto;
  gap: 0.75rem;
  padding: 1.1rem;
}

.snow-music-fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 90;
  border: 0;
  border-radius: 999px;
  padding: 0.56rem 0.9rem 0.56rem 0.72rem;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.36);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.snow-music-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 34px rgba(15, 23, 42, 0.44);
}

.snow-music-fab.active {
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
}

.music-wave {
  width: 22px;
  height: 18px;
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
}

.music-wave i {
  display: block;
  width: 4px;
  border-radius: 999px;
  background: #fff;
  animation: music-wave-idle 1.1s ease-in-out infinite;
}

.music-wave i:nth-child(1) {
  height: 7px;
  animation-delay: 0s;
}

.music-wave i:nth-child(2) {
  height: 12px;
  animation-delay: 0.1s;
}

.music-wave i:nth-child(3) {
  height: 9px;
  animation-delay: 0.2s;
}

.snow-music-fab:not(.active) .music-wave i {
  animation: none;
  opacity: 0.55;
}

.snow-checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 1rem;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 20% 20%, rgba(191, 219, 254, 0.4), transparent 45%),
    radial-gradient(circle at 80% 18%, rgba(221, 214, 254, 0.35), transparent 42%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.86) 0%, rgba(30, 41, 59, 0.92) 100%);
  overflow: hidden;
}

.snow-checkin-overlay--editor {
  position: absolute;
  z-index: 50;
  inset: 0;
  height: 100%;
  min-height: 100%;
}

.snow-checkin-overlay--embedded {
  position: absolute;
  z-index: 50;
  inset: 0;
  height: 100%;
  min-height: 100%;
  border-radius: inherit;
}

.snow-checkin-overlay__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(4px);
  opacity: 0.55;
  pointer-events: none;
  animation: checkin-glow 3.6s ease-in-out infinite;
}

.snow-checkin-overlay__glow--one {
  width: 240px;
  height: 240px;
  background: rgba(125, 211, 252, 0.5);
  top: -40px;
  left: -30px;
}

.snow-checkin-overlay__glow--two {
  width: 300px;
  height: 300px;
  background: rgba(196, 181, 253, 0.44);
  bottom: -85px;
  right: -40px;
  animation-delay: 0.6s;
}

.snow-checkin-overlay__card {
  width: min(560px, calc(100vw - 1.2rem));
  max-height: calc(100dvh - 1.5rem);
  overflow: auto;
  border-radius: 24px;
  padding: 1.4rem 1.35rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 32px 62px rgba(15, 23, 42, 0.5);
  display: grid;
  gap: 0.86rem;
  text-align: center;
  animation: checkin-card-in 0.35s ease;
}

.snow-checkin-overlay--editor .snow-checkin-overlay__card {
  width: min(560px, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
}

.snow-checkin-overlay--embedded .snow-checkin-overlay__card {
  width: min(560px, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
}

.snow-checkin-overlay__card h3 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  color: #0f172a;
}

.snow-checkin-overlay__card p {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}

.snow-modal__head {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.snow-modal__head h3 {
  margin: 0;
}

.snow-modal__head button {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #334155;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snow-modal__head button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.snow-modal__body {
  overflow: auto;
  padding: 0.95rem 1rem 1.1rem;
  display: grid;
  gap: 0.8rem;
}

.snow-modal__body h4 {
  margin: 0 0 0.25rem;
}

.snow-modal__body p {
  margin: 0;
}

@keyframes music-wave-idle {
  0%,
  100% {
    transform: scaleY(0.5);
    opacity: 0.65;
  }
  50% {
    transform: scaleY(1.2);
    opacity: 1;
  }
}

@keyframes checkin-card-in {
  from {
    transform: translateY(12px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes checkin-glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.46;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.72;
  }
}

@media (max-width: 900px) {
  .snow-template {
    --snow-thumb-size: 56px;
  }

  .snow-gallery-strip {
    grid-template-columns: 1fr;
    max-width: none;
    padding: 0 40px;
  }

  .snow-gallery-strip:not(.snow-gallery-strip--compact) .snow-gallery-card--left,
  .snow-gallery-strip:not(.snow-gallery-strip--compact) .snow-gallery-card--right {
    display: none;
  }

  .snow-gallery-strip--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 12px;
  }

  .snow-gallery-strip--single {
    grid-template-columns: 1fr;
    padding: 0 12px;
  }

  .snow-gallery-card {
    aspect-ratio: 3 / 4;
  }

  .snow-gallery-card--left,
  .snow-gallery-card--right,
  .snow-gallery-card--center {
    transform: none;
    opacity: 1;
    filter: saturate(1);
  }

  .snow-gallery-nav {
    width: 34px;
    height: 34px;
  }

  .snow-gallery-nav--prev {
    left: 2px;
  }

  .snow-gallery-nav--next {
    right: 2px;
  }

  .snow-gallery-lightbox {
    padding: 0.45rem;
  }

  .snow-gallery-lightbox__panel {
    width: min(100vw, calc(100vw - 0.4rem));
    max-height: calc(100dvh - 0.4rem);
    height: calc(100dvh - 0.4rem);
    border-radius: 12px;
  }

  .snow-gallery-lightbox__stage {
    grid-template-columns: 1fr;
    gap: 0.6rem;
    padding: 0.55rem;
  }

  .snow-gallery-lightbox__stage figure {
    border-radius: 10px;
    padding-inline: 2rem;
  }

  .snow-gallery-lightbox__nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    z-index: 2;
  }

  .snow-gallery-nav,
  .snow-gallery-carousel__open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .snow-gallery-lightbox__nav--prev {
    left: 0.45rem;
  }

  .snow-gallery-lightbox__nav--next {
    right: 0.45rem;
  }

  .snow-gallery-lightbox__stage img {
    max-height: min(62vh, 520px);
    border-radius: 10px;
  }

  .snow-gallery-lightbox__thumbs {
    padding: 0.58rem 0.62rem 0.65rem;
  }

  .snow-countdown {
    width: 100%;
    justify-content: space-between;
    gap: 0.25rem;
    padding: 0.45rem 0.42rem;
  }

  .snow-countdown__unit {
    min-width: 0;
    flex: 1 1 0;
    padding: 0.42rem 0.4rem;
  }

  .snow-countdown__divider {
    font-size: 0.9rem;
    padding-bottom: 0.2rem;
  }

  .snow-music-fab {
    right: 12px;
    bottom: 12px;
    padding: 0.55rem 0.7rem;
  }

  .snow-music-fab span:last-child {
    display: none;
  }

  .snow-checkin-overlay {
    padding: 0.7rem;
  }

  .snow-checkin-overlay__card {
    width: min(520px, calc(100vw - 1rem));
    max-height: calc(100dvh - 1rem);
    border-radius: 18px;
    padding: 1rem 0.9rem;
  }

  .snow-checkin-overlay--editor .snow-checkin-overlay__card {
    width: min(520px, calc(100% - 0.75rem));
    max-height: calc(100% - 0.75rem);
  }

  .snow-checkin-overlay--embedded .snow-checkin-overlay__card {
    width: min(520px, calc(100% - 0.75rem));
    max-height: calc(100% - 0.75rem);
  }

  .snow-checkin-overlay__card h3 {
    font-size: clamp(1.3rem, 5.4vw, 1.9rem);
  }
}

@media (max-width: 640px) {
  .snow-template {
    --snow-thumb-size: 52px;
  }

  .snow-gallery-strip,
  .snow-gallery-strip--compact,
  .snow-gallery-strip--single {
    grid-template-columns: 1fr;
    padding: 0 4px;
  }

  .snow-gallery-nav {
    width: 32px;
    height: 32px;
  }

  .snow-gallery-lightbox {
    padding: 0;
  }

  .snow-gallery-lightbox__panel {
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }

  .snow-gallery-lightbox__head {
    padding: 0.62rem;
  }

  .snow-gallery-lightbox__stage {
    padding: 0.5rem;
    gap: 0.45rem;
  }

  .snow-gallery-lightbox__stage figure {
    padding-inline: 1.75rem;
  }

  .snow-gallery-lightbox__stage img {
    max-height: min(64vh, 460px);
  }

  .snow-gallery-lightbox__nav {
    width: 32px;
    height: 32px;
  }

  .snow-gallery-lightbox__nav--prev {
    left: 0.3rem;
  }

  .snow-gallery-lightbox__nav--next {
    right: 0.3rem;
  }

  .snow-gallery-lightbox__thumbs {
    padding: 0.5rem;
    gap: 6px;
  }
}
</style>

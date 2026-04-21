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
let timerId: ReturnType<typeof setInterval> | null = null

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
  timerId = setInterval(() => {
    countdownNow.value = Date.now()
  }, 1000)

  if (!props.editable && isSectionVisible('checkin')) {
    checkinOverlayVisible.value = true
  }

  void syncMusicState()
})

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId)
  pauseBackgroundMusic()
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
      <div class="snow-gallery">
        <figure v-for="item in galleryItems" :key="item.id">
          <img :src="item.imageUrl" :alt="item.alt" loading="lazy" />
        </figure>
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

.snow-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.snow-gallery figure {
  margin: 0;
  overflow: hidden;
  border-radius: 12px;
  aspect-ratio: 4 / 5;
}

.snow-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  .snow-gallery {
    grid-template-columns: 1fr;
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
</style>

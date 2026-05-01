<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useInvitationEditorViewport } from '@/composables/invitation-editor/useInvitationEditorViewport'
import { listCatalogTemplates, listCatalogTypeEvents, type CatalogTemplateItem, type CatalogTypeEventItem } from '@/services/catalogs'
import { publishPublicDemoInvitation } from '@/services/publicInvitations'
import { loadTemplateModuleByRendererKey } from '@/templates/registry'
import type { InvitationTemplateModule, WeddingTemplateData } from '@/templates/types'
import { notifyError, notifySuccess } from '@/utils/toast'

type JsonRecord = Record<string, unknown>

type DemoSection = {
  key: string
  label: string
  hint: string
}

type DemoStoredState = {
  data: WeddingTemplateData
  sectionVisibility: Record<string, boolean>
  updatedAt: string
}

const route = useRoute()
const router = useRouter()

const templateModule = shallowRef<InvitationTemplateModule<'wedding'> | null>(null)
const catalogTemplate = ref<CatalogTemplateItem | null>(null)
const typeEvent = ref<CatalogTypeEventItem | null>(null)
const demoData = ref<WeddingTemplateData | null>(null)
const sectionVisibility = ref<Record<string, boolean>>({})
const activeField = ref<string | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const savedAt = ref<string | null>(null)
const showCheckinPreview = ref(false)
const hasLoadedStoredState = ref(false)
const publicSlug = ref('')
const isPublishing = ref(false)
const publishUrl = ref('')
const galleryInputRef = ref<HTMLInputElement | null>(null)
const publishedDemoRef = ref<{ userPath: string; slug: string } | null>(null)

const {
  previewDevice,
  previewZoomPercent,
  effectivePreviewDevice,
  previewZoomLabel,
  previewViewportClass,
  previewFrameStyle,
  deviceOptions,
  zoomMinPercent,
  zoomMaxPercent,
  zoomStepPercent,
  adjustPreviewZoom,
  resetPreviewZoom,
  handleZoomInput,
  selectPreviewDevice,
  handlePreviewWheelZoom,
} = useInvitationEditorViewport()

const demoSections: DemoSection[] = [
  { key: 'hero', label: 'Portada', hint: 'Título, nombres y datos principales.' },
  { key: 'countdown', label: 'Cuenta regresiva', hint: 'Marca la emoción antes del evento.' },
  { key: 'story', label: 'Historia', hint: 'Cuenta una historia breve y memorable.' },
  { key: 'gallery', label: 'Galería', hint: 'Muestra fotos de referencia.' },
  { key: 'wall', label: 'Muro de mensajes', hint: 'Espacio para dedicatorias.' },
  { key: 'location', label: 'Ubicación', hint: 'Botones de Maps y Uber.' },
  { key: 'saveDate', label: 'Guardar fecha', hint: 'Acceso para calendario.' },
  { key: 'dressCode', label: 'Dress code', hint: 'Indica cómo vestir.' },
  { key: 'rsvp', label: 'Confirmación', hint: 'Formulario para invitados.' },
  { key: 'faq', label: 'Preguntas importantes', hint: 'Resuelve dudas antes de confirmar.' },
  { key: 'music', label: 'Música', hint: 'Botón flotante dentro de la invitación.' },
  { key: 'checkin', label: 'Bienvenida interactiva', hint: 'Primera pantalla de experiencia.' },
]

const templateId = computed(() => String(route.params.templateId ?? '').trim())
const rendererQuery = computed(() => String(route.query.renderer ?? '').trim())
const storageKey = computed(() => `invitasr.demo-editor.${templateId.value || rendererQuery.value || 'template'}`)
const publishedDemoStorageKey = 'invitasr.demo-publication'
const activeComponent = computed(() => templateModule.value?.component ?? null)
const manifest = computed(() => templateModule.value?.manifest ?? null)
const typeEventName = computed(() => String(typeEvent.value?.name ?? catalogTemplate.value?.type_event?.name ?? 'Evento'))
const invitationTitle = computed(() => String(catalogTemplate.value?.name ?? 'Mi invitación demo'))
const canRenderTemplate = computed(() => Boolean(activeComponent.value && manifest.value && demoData.value))
const publicPathPreview = computed(() => {
  const slug = normalizeSlug(publicSlug.value)
  return slug ? `@${slug}` : 'se generará automáticamente'
})

const musicOptions = [
  {
    id: 'song_1',
    label: 'Can’t Help Falling in Love',
    title: 'Can’t Help Falling in Love',
    artist: 'Elvis Presley',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    youtubeUrl: 'https://www.youtube.com/watch?v=VEgwXzfKen8',
  },
  {
    id: 'song_2',
    label: 'Until I Found You',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    youtubeUrl: 'https://www.youtube.com/watch?v=uh5jGOkodw8',
  },
  {
    id: 'song_3',
    label: 'Instrumental suave',
    title: 'Instrumental suave',
    artist: 'InvitaSR',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    youtubeUrl: '',
  },
]

const dressCodeOptions = [
  { code: 'elegant_sport', label: 'Elegante sport', description: 'Elegante sport en tonos claros.' },
  { code: 'formal', label: 'Formal', description: 'Look formal para una celebración especial.' },
  { code: 'cocktail', label: 'Cóctel', description: 'Vestimenta cóctel, cómoda y elegante.' },
  { code: 'white', label: 'Tonos claros', description: 'Te esperamos con tonos claros para acompañar el estilo del evento.' },
  { code: 'free', label: 'Libre', description: 'Ven con el look que más te represente.' },
]

const formattedSavedAt = computed(() => {
  if (!savedAt.value) return 'Aún no guardaste cambios'
  const date = new Date(savedAt.value)
  if (Number.isNaN(date.getTime())) return 'Cambios guardados'

  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110)

const toRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}

const ensureRecordPath = (root: JsonRecord, path: string[]): JsonRecord => {
  let current = root
  for (const segment of path) {
    const next = toRecord(current[segment])
    current[segment] = next
    current = next
  }
  return current
}

const setPath = (source: WeddingTemplateData, path: string[], value: string) => {
  const root = source as unknown as JsonRecord
  const parent = ensureRecordPath(root, path.slice(0, -1))
  const last = path[path.length - 1]
  if (last) parent[last] = value
}

const editableFieldPaths: Record<string, string[]> = {
  hero_title: ['hero', 'title'],
  hero_subtitle: ['hero', 'subtitle'],
  bride_name: ['couple', 'brideName'],
  groom_name: ['couple', 'groomName'],
  event_date_label: ['event', 'date', 'label'],
  event_venue: ['event', 'venue'],
  event_city: ['event', 'city'],
  countdown_note: ['countdown', 'note'],
  story_title: ['story', '0', 'title'],
  story_description: ['story', '0', 'description'],
  rsvp_label: ['rsvp', 'submitLabel'],
}

const applyTextUpdate = (field: string, value: string) => {
  if (!demoData.value) return
  const path = editableFieldPaths[field]
  if (!path) return

  if (path[0] === 'story') {
    const story = Array.isArray(demoData.value.story) ? demoData.value.story : []
    if (!story[0]) {
      story[0] = { title: 'Nuestra historia', description: 'Comparte una historia breve y emocional.' }
    }
    const targetKey = path[2]
    if (targetKey === 'title' || targetKey === 'description') {
      story[0][targetKey] = value
    }
    demoData.value.story = story
    return
  }

  setPath(demoData.value, path, value)
}

const buildDefaultSectionVisibility = (): Record<string, boolean> =>
  demoSections.reduce<Record<string, boolean>>((acc, section) => {
    acc[section.key] = true
    return acc
  }, {})

const loadStoredState = (): DemoStoredState | null => {
  try {
    const raw = window.sessionStorage.getItem(storageKey.value)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DemoStoredState>
    if (!parsed.data || !parsed.sectionVisibility) return null
    return {
      data: parsed.data as WeddingTemplateData,
      sectionVisibility: parsed.sectionVisibility,
      updatedAt: String(parsed.updatedAt ?? ''),
    }
  } catch {
    return null
  }
}

const persistDemoState = (showToast = false) => {
  if (!demoData.value) return
  const updatedAt = new Date().toISOString()
  const payload: DemoStoredState = {
    data: clone(demoData.value),
    sectionVisibility: { ...sectionVisibility.value },
    updatedAt,
  }

  window.sessionStorage.setItem(storageKey.value, JSON.stringify(payload))
  savedAt.value = updatedAt

  if (showToast) {
    notifySuccess('Guardamos tu demo en este navegador.')
  }
}

const triggerGalleryInput = () => {
  galleryInputRef.value?.click()
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const handleGalleryFiles = async (event: Event) => {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  if (!demoData.value || !files.length) return

  const allowed = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
  if (allowed.length !== files.length) {
    notifyError('Solo puedes subir imágenes JPG, PNG o WEBP.')
  }

  const current = Array.isArray(demoData.value.gallery) ? demoData.value.gallery : []
  const remaining = Math.max(0, 5 - current.length)
  const selected = allowed.slice(0, remaining)
  if (!selected.length) {
    notifyError('La demo permite hasta 5 imágenes.')
    if (input) input.value = ''
    return
  }

  const nextItems = await Promise.all(selected.map(async (file, index) => {
    const dataUrl = await readFileAsDataUrl(file)

    return {
      id: `demo-upload-${Date.now()}-${index}`,
      imageUrl: dataUrl,
      galleryUrl: dataUrl,
      thumbnailUrl: dataUrl,
      lightboxUrl: dataUrl,
      alt: file.name,
    }
  }))

  demoData.value.gallery = [...current, ...nextItems].slice(0, 5)
  if (input) input.value = ''
}

const removeGalleryItem = (itemId: string) => {
  if (!demoData.value) return
  demoData.value.gallery = (demoData.value.gallery ?? []).filter((item) => item.id !== itemId)
}

const ensurePrimaryLocation = () => {
  if (!demoData.value) return null
  demoData.value.location = {
    name: demoData.value.location?.name ?? 'Estancia Nevada',
    address: demoData.value.location?.address ?? 'Dirección del evento',
    mapsUrl: demoData.value.location?.mapsUrl ?? '',
    uberEnabled: demoData.value.location?.uberEnabled !== false,
    uberUrl: demoData.value.location?.uberUrl ?? 'https://m.uber.com/ul/?action=setPickup',
  }

  return demoData.value.location
}

const locationName = computed({
  get: () => demoData.value?.location?.name ?? '',
  set: (value: string) => {
    const location = ensurePrimaryLocation()
    if (location) location.name = value
  },
})

const locationAddress = computed({
  get: () => demoData.value?.location?.address ?? '',
  set: (value: string) => {
    const location = ensurePrimaryLocation()
    if (location) location.address = value
  },
})

const locationMapsUrl = computed({
  get: () => demoData.value?.location?.mapsUrl ?? '',
  set: (value: string) => {
    const location = ensurePrimaryLocation()
    if (location) location.mapsUrl = value
  },
})

const locationUberEnabled = computed({
  get: () => demoData.value?.location?.uberEnabled !== false,
  set: (value: boolean) => {
    const location = ensurePrimaryLocation()
    if (location) location.uberEnabled = value
  },
})

const selectedDressCode = computed({
  get: () => demoData.value?.dressCode?.code ?? 'elegant_sport',
  set: (value: string) => {
    if (!demoData.value) return
    const option = dressCodeOptions.find((item) => item.code === value) ?? {
      code: 'elegant_sport',
      label: 'Elegante sport',
      description: 'Elegante sport en tonos claros.',
    }
    demoData.value.dressCode = {
      enabled: true,
      code: option.code,
      title: 'Dress code',
      description: option.description,
    }
  },
})

const addFaqItem = () => {
  if (!demoData.value) return
  const current = Array.isArray(demoData.value.faq) ? demoData.value.faq : []
  demoData.value.faq = [
    ...current,
    {
      id: `demo-faq-${Date.now()}`,
      question: '',
      answer: '',
    },
  ]
}

const removeFaqItem = (itemId: string) => {
  if (!demoData.value) return
  demoData.value.faq = (demoData.value.faq ?? []).filter((item) => item.id !== itemId)
}

const selectedMusicUrl = computed({
  get: () => demoData.value?.music?.audioUrl ?? musicOptions[0]?.audioUrl ?? '',
  set: (value: string) => {
    if (!demoData.value) return
    const option = musicOptions.find((item) => item.audioUrl === value) ?? musicOptions[0]
    demoData.value.music = {
      title: option?.title ?? 'Canción principal',
      artist: option?.artist ?? 'InvitaSR',
      audioUrl: option?.audioUrl ?? '',
      youtubeUrl: option?.youtubeUrl ?? '',
      muted: true,
    }
  },
})

const countdownDateValue = computed({
  get: () => {
    const raw = demoData.value?.countdown?.targetDateIso || demoData.value?.event?.date?.iso || ''
    if (!raw) return ''
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  },
  set: (value: string) => {
    if (!demoData.value || !value) return
    const iso = new Date(value).toISOString()
    demoData.value.countdown = {
      ...(demoData.value.countdown ?? {
        eyebrow: 'Cuenta regresiva',
        title: 'Falta muy poco',
        note: 'Cada detalle está preparado para este gran día.',
        daysLabel: 'días',
        hoursLabel: 'horas',
      }),
      targetDateIso: iso,
    }
    demoData.value.event.date.iso = iso
    demoData.value.event.date.label = new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso)).replace(',', ' ·') + ' hs'
  },
})

const dataUrlToFile = async (dataUrl: string, fallbackName: string): Promise<File | null> => {
  if (!dataUrl.startsWith('data:image/')) return null
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
  return new File([blob], `${fallbackName}.${extension}`, { type: blob.type || 'image/jpeg' })
}

const publishDemo = async () => {
  if (!demoData.value || !catalogTemplate.value) return

  const slug = normalizeSlug(publicSlug.value)

  isPublishing.value = true
  publishUrl.value = ''

  try {
    persistDemoState(false)
    const formData = new FormData()
    const payload = {
      template_id: catalogTemplate.value.id,
      type_event_id: catalogTemplate.value.type_event_id ?? typeEvent.value?.id,
      title: `${demoData.value.couple?.brideName ?? 'Alan'} y ${demoData.value.couple?.groomName ?? 'Andrea'}`,
      slug: slug || null,
      content: demoData.value,
      settings: {
        section_visibility: sectionVisibility.value,
      },
      feature_overrides: [],
      section_visibility: sectionVisibility.value,
    }

    formData.append('payload', JSON.stringify(payload))

    const gallery = Array.isArray(demoData.value.gallery) ? demoData.value.gallery : []
    for (const [index, item] of gallery.entries()) {
      const file = await dataUrlToFile(item.imageUrl, `demo-gallery-${index + 1}`)
      if (file) {
        formData.append('images[]', file)
      }
    }

    const response = await publishPublicDemoInvitation(formData)
    publishUrl.value = response.url
    publishedDemoRef.value = {
      userPath: response.publication.userPath,
      slug: response.publication.slug,
    }
    window.sessionStorage.setItem(publishedDemoStorageKey, JSON.stringify(publishedDemoRef.value))
    notifySuccess('Tu demo quedó publicada por 24 horas.')
    window.open(response.url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos publicar la demo.')
  } finally {
    isPublishing.value = false
  }
}

const resetDemo = () => {
  if (!templateModule.value?.createPreviewData) return
  demoData.value = templateModule.value.createPreviewData({
    invitationTitle: invitationTitle.value,
    typeEventName: typeEventName.value,
  })
  sectionVisibility.value = buildDefaultSectionVisibility()
  activeField.value = null
  showCheckinPreview.value = false
  window.sessionStorage.removeItem(storageKey.value)
  savedAt.value = null
  notifySuccess('La demo volvió a su versión inicial.')
}

const continueToPlans = () => {
  persistDemoState(false)
  router.push({
    name: 'planes',
    query: {
      template: catalogTemplate.value?.id ? String(catalogTemplate.value.id) : undefined,
      type_event: catalogTemplate.value?.type_event_id ? String(catalogTemplate.value.type_event_id) : undefined,
      from: 'demo-editor',
      demo_key: storageKey.value,
      demo_user: publishedDemoRef.value?.userPath,
      demo_slug: publishedDemoRef.value?.slug,
    },
  })
}

const toggleSection = (sectionKey: string) => {
  sectionVisibility.value = {
    ...sectionVisibility.value,
    [sectionKey]: sectionVisibility.value[sectionKey] === false,
  }
}

const handleStartEdit = (field: string) => {
  activeField.value = field
}

const handleUpdateField = (payload: { field: string; value: string }) => {
  applyTextUpdate(payload.field, payload.value)
}

const handleFinishEdit = () => {
  activeField.value = null
}

const resolveCatalogTemplate = async () => {
  const response = await listCatalogTemplates({ page: 1, perPage: 200 })
  const templates = response.list
  const byId = templates.find((template) => String(template.id ?? '') === templateId.value)
  if (byId) return byId

  const renderer = rendererQuery.value
  if (renderer) {
    return templates.find((template) => String(template.renderer_key ?? '') === renderer) ?? null
  }

  return null
}

const resolveTypeEvent = async (template: CatalogTemplateItem | null) => {
  if (template?.type_event) {
    typeEvent.value = template.type_event
    return
  }

  const typeEventId = String(template?.type_event_id ?? route.query.type_event ?? '').trim()
  if (!typeEventId) return

  const response = await listCatalogTypeEvents({ page: 1, perPage: 80 })
  typeEvent.value = response.list.find((item) => String(item.id ?? '') === typeEventId) ?? null
}

const loadDemo = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const template = await resolveCatalogTemplate()
    catalogTemplate.value = template
    await resolveTypeEvent(template)

    const rendererKey = String(template?.renderer_key ?? rendererQuery.value ?? '').trim()
    if (!rendererKey) {
      throw new Error('template_not_available')
    }

    const module = await loadTemplateModuleByRendererKey(rendererKey)
    if (!module?.component) {
      throw new Error('template_not_available')
    }

    templateModule.value = module as InvitationTemplateModule<'wedding'>

    const stored = loadStoredState()
    if (stored) {
      demoData.value = stored.data
      sectionVisibility.value = {
        ...buildDefaultSectionVisibility(),
        ...stored.sectionVisibility,
      }
      savedAt.value = stored.updatedAt || null
      hasLoadedStoredState.value = true
    } else {
      demoData.value = module.createPreviewData?.({
        invitationTitle: invitationTitle.value,
        typeEventName: typeEventName.value,
      }) as WeddingTemplateData | undefined ?? null
      sectionVisibility.value = buildDefaultSectionVisibility()
    }

    if (!demoData.value) {
      throw new Error('template_not_available')
    }
  } catch {
    loadError.value = 'No pudimos abrir esta demo. Vuelve a la galería y prueba nuevamente.'
    notifyError(loadError.value)
  } finally {
    isLoading.value = false
  }
}

watch(
  [demoData, sectionVisibility],
  () => {
    if (isLoading.value || !demoData.value) return
    persistDemoState(false)
  },
  { deep: true },
)

watch(effectivePreviewDevice, (nextDevice) => {
  if (previewDevice.value === nextDevice) return
  previewDevice.value = nextDevice
})

onMounted(loadDemo)
</script>

<template>
  <main class="demo-editor-page">
    <section class="demo-editor-hero">
      <div class="container demo-editor-hero__inner">
        <div>
          <p class="demo-editor-kicker">Modo demo</p>
          <h1>Prueba tu invitación como si ya estuvieras editándola</h1>
          <p>
            Haz doble click sobre los textos, activa o desactiva secciones y guarda esta prueba en tu navegador.
          </p>
        </div>
        <div class="demo-editor-hero__actions">
          <BaseButton as="RouterLink" to="/demo" variant="ghost">Volver a plantillas</BaseButton>
          <BaseButton variant="ghost" :disabled="isPublishing" @click="publishDemo">
            {{ isPublishing ? 'Publicando...' : 'Publicar demo 24h' }}
          </BaseButton>
          <BaseButton variant="primary" @click="continueToPlans">Conservar este diseño</BaseButton>
        </div>
      </div>
    </section>

    <section class="demo-editor-workspace">
      <div v-if="isLoading" class="demo-editor-state">
        <span></span>
        <p>Preparando tu demo editable...</p>
      </div>

      <div v-else-if="loadError" class="container demo-editor-error">
        <h2>No pudimos abrir esta demo</h2>
        <p>{{ loadError }}</p>
        <BaseButton as="RouterLink" to="/demo" variant="primary">Volver a la galería</BaseButton>
      </div>

      <div v-else class="demo-editor-shell">
        <aside class="demo-editor-panel" aria-label="Configuración de la demo">
          <div class="demo-editor-panel__head">
            <p>Configuración</p>
            <h2>{{ catalogTemplate?.name ?? 'Plantilla demo' }}</h2>
            <span>{{ hasLoadedStoredState ? 'Recuperamos tus últimos cambios.' : 'Empieza desde una base editable.'
              }}</span>
          </div>

          <div class="demo-editor-save-card">
            <span>Estado</span>
            <strong>{{ formattedSavedAt }}</strong>
            <small>Tu enlace de prueba será {{ publicPathPreview }}</small>
            <div class="demo-editor-save-actions">
              <button type="button" @click="persistDemoState(true)">Guardar</button>
              <button type="button" @click="resetDemo">Reiniciar</button>
            </div>
          </div>

          <div class="demo-editor-control-card">
            <label>
              <span>Enlace público de prueba</span>
              <input v-model="publicSlug" type="text" inputmode="text" placeholder="Opcional: mi-fiesta-soñada"
                @blur="publicSlug = normalizeSlug(publicSlug)" />
            </label>
            <p>Se publica como {{ publicPathPreview }} por 24 horas o hasta llegar a 8 visitas.</p>
          </div>

          <div class="demo-editor-control-card">
            <label>
              <span>Música</span>
              <select v-model="selectedMusicUrl">
                <option v-for="option in musicOptions" :key="option.id" :value="option.audioUrl">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="demo-editor-control-card">
            <label>
              <span>Fecha para la cuenta regresiva</span>
              <input v-model="countdownDateValue" type="datetime-local" />
            </label>
          </div>

          <div class="demo-editor-control-card">
            <label>
              <span>Ubicación</span>
              <input v-model="locationName" type="text" placeholder="Nombre del lugar" />
            </label>
            <label>
              <span>Dirección visible</span>
              <input v-model="locationAddress" type="text" placeholder="Dirección del evento" />
            </label>
            <label>
              <span>Enlace de Google Maps</span>
              <input v-model="locationMapsUrl" type="url" placeholder="https://www.google.com/maps/..." />
            </label>
            <label class="demo-editor-check-row">
              <span>Mostrar botón de Uber</span>
              <input v-model="locationUberEnabled" type="checkbox" />
            </label>
          </div>

          <div class="demo-editor-control-card">
            <label>
              <span>Dress code</span>
              <select v-model="selectedDressCode">
                <option v-for="option in dressCodeOptions" :key="option.code" :value="option.code">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <p>{{ demoData?.dressCode?.description }}</p>
          </div>

          <div class="demo-editor-control-card">
            <div class="demo-editor-gallery-head">
              <div>
                <span>Preguntas importantes</span>
                <strong>{{ demoData?.faq?.length ?? 0 }} cargadas</strong>
              </div>
              <button type="button" @click="addFaqItem">+</button>
            </div>
            <div v-if="demoData?.faq?.length" class="demo-editor-faq-list">
              <article v-for="(item, index) in demoData.faq" :key="item.id">
                <div>
                  <strong>Pregunta {{ index + 1 }}</strong>
                  <button type="button" aria-label="Quitar pregunta" @click="removeFaqItem(item.id)">×</button>
                </div>
                <input v-model="item.question" type="text" placeholder="Ej: ¿Hay estacionamiento?" />
                <textarea v-model="item.answer" rows="3"
                  placeholder="Respuesta breve y clara para tus invitados."></textarea>
              </article>
            </div>
            <p v-else>Agrega dudas frecuentes para que tus invitados lleguen con todo claro.</p>
          </div>

          <div class="demo-editor-control-card">
            <div class="demo-editor-gallery-head">
              <div>
                <span>Galería</span>
                <strong>{{ demoData?.gallery?.length ?? 0 }}/5 imágenes</strong>
              </div>
              <button type="button" :disabled="(demoData?.gallery?.length ?? 0) >= 5" @click="triggerGalleryInput">
                +
              </button>
            </div>
            <input ref="galleryInputRef" class="demo-editor-file-input" type="file"
              accept="image/jpeg,image/png,image/webp" multiple @change="handleGalleryFiles" />
            <div v-if="demoData?.gallery?.length" class="demo-editor-gallery-list">
              <article v-for="item in demoData.gallery" :key="item.id">
                <img :src="item.imageUrl" :alt="item.alt" />
                <span>{{ item.alt }}</span>
                <button type="button" aria-label="Quitar imagen" @click="removeGalleryItem(item.id)">×</button>
              </article>
            </div>
          </div>

          <div v-if="publishUrl" class="demo-editor-published-card">
            <span>Demo publicada</span>
            <a :href="publishUrl" target="_blank" rel="noopener noreferrer">{{ publishUrl }}</a>
          </div>

          <div class="demo-editor-section-list">
            <article v-for="section in demoSections" :key="section.key" class="demo-editor-section-row">
              <div>
                <strong>{{ section.label }}</strong>
                <span>{{ section.hint }}</span>
              </div>
              <button type="button" class="demo-switch" :class="{ active: sectionVisibility[section.key] !== false }"
                :aria-label="`${sectionVisibility[section.key] !== false ? 'Ocultar' : 'Mostrar'} ${section.label}`"
                @click="toggleSection(section.key)">
                <span></span>
              </button>

              <button v-if="section.key === 'checkin' && sectionVisibility.checkin !== false" type="button"
                class="demo-editor-inline-action" @click="showCheckinPreview = true">
                Probar bienvenida
              </button>
            </article>
          </div>
        </aside>

        <div class="demo-editor-canvas">
          <header class="demo-editor-toolbar">
            <div class="demo-editor-device-tabs" role="tablist" aria-label="Vista responsive">
              <button v-for="option in deviceOptions" :key="option.value" type="button"
                :class="{ active: previewDevice === option.value }" @click="selectPreviewDevice(option.value)">
                {{ option.label }}
              </button>
            </div>

            <div class="demo-editor-zoom">
              <button type="button" aria-label="Alejar" @click="adjustPreviewZoom(-zoomStepPercent)">−</button>
              <input type="range" :min="zoomMinPercent" :max="zoomMaxPercent" :step="zoomStepPercent"
                :value="previewZoomPercent" aria-label="Zoom de la demo" @input="handleZoomInput" />
              <button type="button" aria-label="Acercar" @click="adjustPreviewZoom(zoomStepPercent)">+</button>
              <button type="button" class="demo-editor-zoom__label" @click="resetPreviewZoom">{{ previewZoomLabel
                }}</button>
            </div>
          </header>

          <p class="demo-editor-help">Doble click sobre cualquier texto marcado para editarlo.</p>

          <div class="demo-editor-stage" @wheel="handlePreviewWheelZoom">
            <div class="demo-editor-frame" :class="previewViewportClass" :style="previewFrameStyle">
              <component :is="activeComponent" v-if="canRenderTemplate && manifest && demoData"
                :template-id="manifest.id" :manifest="manifest" :data="demoData" editable constrained-overlay
                :active-field="activeField" :section-visibility="sectionVisibility"
                :checkin-preview="showCheckinPreview && sectionVisibility.checkin !== false"
                :invitation-title="invitationTitle" :type-event-name="typeEventName"
                :preview-viewport="effectivePreviewDevice" :preview-zoom-percent="previewZoomPercent"
                @start-edit="handleStartEdit" @update-field="handleUpdateField" @finish-edit="handleFinishEdit"
                @checkin-preview-closed="showCheckinPreview = false" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.demo-editor-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 8%, rgba(240, 106, 166, 0.12), transparent 32%),
    radial-gradient(circle at 86% 4%, rgba(122, 79, 217, 0.16), transparent 34%),
    linear-gradient(180deg, #fff 0%, #f8f2ff 100%);
}

.demo-editor-hero {
  padding: calc(var(--public-header-height, 80px) + 42px) 0 28px;
}

.demo-editor-hero__inner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.demo-editor-kicker {
  margin: 0 0 8px;
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.demo-editor-hero h1 {
  max-width: 13ch;
  margin: 0;
  color: #241337;
  font-size: clamp(38px, 6vw, 70px);
  line-height: 0.92;
  letter-spacing: -0.07em;
}

.demo-editor-hero p:not(.demo-editor-kicker) {
  max-width: 62ch;
  margin: 16px 0 0;
  color: #675577;
  font-size: 16px;
  line-height: 1.58;
}

.demo-editor-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.demo-editor-workspace {
  padding: 0 20px 46px;
}

.demo-editor-shell {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 18px;
  width: min(1540px, 100%);
  margin: 0 auto;
}

.demo-editor-panel,
.demo-editor-canvas,
.demo-editor-state,
.demo-editor-error {
  border: 1px solid rgba(226, 214, 246, 0.88);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 22px 56px rgba(72, 43, 118, 0.12);
  backdrop-filter: blur(18px);
}

.demo-editor-panel {
  position: sticky;
  top: calc(var(--public-header-height, 80px) + 14px);
  max-height: calc(100vh - var(--public-header-height, 80px) - 28px);
  overflow: auto;
  border-radius: 28px;
  padding: 18px;
  display: grid;
  align-content: start;
  gap: 14px;
}

.demo-editor-panel__head {
  display: grid;
  gap: 4px;
}

.demo-editor-panel__head p,
.demo-editor-save-card>span {
  margin: 0;
  color: #8a67c5;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.demo-editor-panel__head h2 {
  margin: 0;
  color: #241337;
  font-size: 1.55rem;
  line-height: 1.05;
}

.demo-editor-panel__head span {
  color: #6d5b7e;
  font-size: 13px;
}

.demo-editor-save-card {
  display: grid;
  gap: 10px;
  border-radius: 20px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  background: linear-gradient(135deg, #fff, #f7f0ff);
  padding: 14px;
}

.demo-editor-save-card strong {
  color: #2b1a44;
}

.demo-editor-save-card small {
  color: #7a6a8d;
  font-weight: 700;
}

.demo-editor-save-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.demo-editor-control-card,
.demo-editor-published-card {
  display: grid;
  gap: 10px;
  border-radius: 20px;
  border: 1px solid rgba(226, 214, 246, 0.86);
  background: rgba(255, 255, 255, 0.78);
  padding: 14px;
}

.demo-editor-control-card label {
  display: grid;
  gap: 7px;
}

.demo-editor-control-card label>span,
.demo-editor-gallery-head span,
.demo-editor-published-card span {
  color: #7b5aa7;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.demo-editor-control-card input,
.demo-editor-control-card select,
.demo-editor-control-card textarea {
  width: 100%;
  border: 1px solid rgba(155, 107, 255, 0.22);
  border-radius: 14px;
  background: #fff;
  color: #2b1a44;
  padding: 11px 12px;
  font: inherit;
  font-weight: 700;
}

.demo-editor-control-card textarea {
  min-height: 84px;
  resize: vertical;
  line-height: 1.45;
}

.demo-editor-check-row {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 14px;
  background: #f8f3ff;
  padding: 10px 12px;
}

.demo-editor-check-row input {
  width: 18px;
  height: 18px;
  accent-color: #7a4fd9;
}

.demo-editor-control-card p {
  margin: 0;
  color: #7a6a8d;
  font-size: 12px;
  line-height: 1.4;
}

.demo-editor-gallery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.demo-editor-gallery-head>div {
  display: grid;
  gap: 2px;
}

.demo-editor-gallery-head strong {
  color: #2b1a44;
  font-size: 14px;
}

.demo-editor-gallery-head button {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 14px;
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
  cursor: pointer;
}

.demo-editor-gallery-head button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.demo-editor-file-input {
  display: none;
}

.demo-editor-gallery-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.demo-editor-gallery-list article {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  background: #fff;
}

.demo-editor-gallery-list img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.demo-editor-gallery-list article>span {
  display: block;
  overflow: hidden;
  padding: 7px 8px;
  color: #5e4a78;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-editor-gallery-list article>button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}

.demo-editor-faq-list {
  display: grid;
  gap: 10px;
}

.demo-editor-faq-list article {
  display: grid;
  gap: 8px;
  border-radius: 16px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  background: #fff;
  padding: 10px;
}

.demo-editor-faq-list article>div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.demo-editor-faq-list strong {
  color: #2b1a44;
  font-size: 13px;
}

.demo-editor-faq-list button {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: 999px;
  background: #fff5f5;
  color: #dc2626;
  cursor: pointer;
  font-weight: 900;
}

.demo-editor-published-card a {
  overflow-wrap: anywhere;
  color: #7a4fd9;
  font-weight: 900;
}

.demo-editor-save-actions button,
.demo-editor-inline-action {
  border: 1px solid rgba(155, 107, 255, 0.24);
  border-radius: 13px;
  background: #fff;
  color: #4d2b76;
  font-weight: 900;
  padding: 10px 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.demo-editor-save-actions button:hover,
.demo-editor-inline-action:hover {
  transform: translateY(-1px);
  border-color: rgba(122, 79, 217, 0.44);
  box-shadow: 0 12px 24px rgba(72, 43, 118, 0.12);
}

.demo-editor-section-list {
  display: grid;
  gap: 10px;
}

.demo-editor-section-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  border-radius: 18px;
  border: 1px solid rgba(226, 214, 246, 0.86);
  background: rgba(255, 255, 255, 0.74);
  padding: 12px;
}

.demo-editor-section-row div {
  display: grid;
  gap: 3px;
}

.demo-editor-section-row strong {
  color: #29183d;
  font-size: 14px;
}

.demo-editor-section-row span {
  color: #7a6a8d;
  font-size: 12px;
  line-height: 1.35;
}

.demo-switch {
  width: 48px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  padding: 3px;
  background: #ded3ef;
  cursor: pointer;
  transition: background 0.2s ease;
}

.demo-switch span {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 5px 12px rgba(38, 20, 60, 0.16);
  transition: transform 0.2s ease;
}

.demo-switch.active {
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
}

.demo-switch.active span {
  transform: translateX(20px);
}

.demo-editor-inline-action {
  grid-column: 1 / -1;
  width: 100%;
}

.demo-editor-canvas {
  min-width: 0;
  border-radius: 30px;
  padding: 14px;
}

.demo-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-radius: 22px;
  border: 1px solid rgba(226, 214, 246, 0.84);
  background: rgba(255, 255, 255, 0.76);
  padding: 10px;
}

.demo-editor-device-tabs,
.demo-editor-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-editor-device-tabs {
  border-radius: 999px;
  background: #f1e9ff;
  padding: 4px;
}

.demo-editor-device-tabs button,
.demo-editor-zoom button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #604783;
  font-weight: 900;
  padding: 9px 13px;
  cursor: pointer;
}

.demo-editor-device-tabs button.active,
.demo-editor-zoom button:hover {
  color: #fff;
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
}

.demo-editor-zoom {
  border-radius: 999px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  background: #fff;
  padding: 4px;
}

.demo-editor-zoom input {
  width: min(180px, 18vw);
  accent-color: #7a4fd9;
}

.demo-editor-zoom__label {
  min-width: 60px;
}

.demo-editor-help {
  margin: 12px 4px;
  color: #6c5a7e;
  font-size: 13px;
  font-weight: 700;
}

.demo-editor-stage {
  overflow: auto;
  min-height: 720px;
  border-radius: 24px;
  background:
    linear-gradient(45deg, rgba(122, 79, 217, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(122, 79, 217, 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(122, 79, 217, 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(122, 79, 217, 0.08) 75%),
    #f8f5ff;
  background-size: 28px 28px;
  background-position: 0 0, 0 14px, 14px -14px, -14px 0;
  padding: 26px;
}

.demo-editor-frame {
  margin: 0 auto;
  min-height: 680px;
  transform-origin: top center;
}

.preview-frame--mobile {
  width: min(390px, 100%);
}

.preview-frame--tablet {
  width: min(760px, 100%);
}

.preview-frame--desktop {
  width: min(1120px, 100%);
}

.demo-editor-state,
.demo-editor-error {
  width: min(780px, calc(100% - 32px));
  margin: 24px auto;
  border-radius: 28px;
  padding: 28px;
  text-align: center;
  color: #4d3a67;
}

.demo-editor-state span {
  width: 42px;
  height: 42px;
  display: inline-block;
  border-radius: 999px;
  border: 4px solid rgba(122, 79, 217, 0.18);
  border-top-color: #7a4fd9;
  animation: demoSpin 0.8s linear infinite;
}

.demo-editor-error h2 {
  margin: 0 0 8px;
  color: #241337;
}

.demo-editor-error p {
  margin: 0 0 18px;
  color: #6d5b7e;
}

@keyframes demoSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {

  .demo-editor-hero__inner,
  .demo-editor-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .demo-editor-hero__actions {
    justify-content: flex-start;
  }

  .demo-editor-shell {
    grid-template-columns: 1fr;
  }

  .demo-editor-panel {
    position: relative;
    top: auto;
    max-height: none;
  }

  .demo-editor-toolbar,
  .demo-editor-device-tabs,
  .demo-editor-zoom {
    width: 100%;
  }

  .demo-editor-device-tabs {
    justify-content: space-between;
  }

  .demo-editor-zoom input {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 640px) {
  .demo-editor-workspace {
    padding: 0 12px 34px;
  }

  .demo-editor-hero__actions,
  .demo-editor-hero__actions :deep(.btn) {
    width: 100%;
  }

  .demo-editor-canvas,
  .demo-editor-panel {
    border-radius: 22px;
    padding: 12px;
  }

  .demo-editor-stage {
    min-height: 640px;
    padding: 14px;
  }

  .demo-editor-device-tabs button,
  .demo-editor-zoom button {
    padding: 8px 10px;
    font-size: 12px;
  }
}
</style>

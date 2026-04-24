import { ref, type Ref } from 'vue'
import type {
  ResolveTenantInvitationLocationPayload,
  TenantResolvedInvitationLocation,
} from '@/services/tenantInvitations'

type JsonRecord = Record<string, unknown>

export type InvitationEditorFaqDraftItem = {
  id: string
  question: string
  answer: string
}

export type InvitationEditorDraftLocation = {
  name: string
  address: string
  mapsUrl: string
  mapsCanonicalUrl: string
  mapsSourceUrl: string
  placeId: string
  formattedAddress: string
  latitude: number | null
  longitude: number | null
  uberEnabled: boolean
  uberUrl: string
}

type UseInvitationEditorSaveWorkflowOptions = {
  resolvedSectionVisibility: Ref<Record<string, boolean>>
  faqItems: Ref<InvitationEditorFaqDraftItem[]>
  countdownDatetime: Ref<string>
  contentDraft: Ref<JsonRecord>
  locationItemsDraft: Ref<InvitationEditorDraftLocation[]>
  checkinShowEventDate: Ref<boolean>
  checkinShowEntryValue: Ref<boolean>
  checkinCurrencyCodes: string[]
  maxLocationsPerInvitation: number
  defaultLocationMapsUrl: string
  getByPath: (source: unknown, path: string) => unknown
  setByPath: (source: JsonRecord, path: string, value: unknown) => void
  cloneRecord: (value: unknown) => JsonRecord
  asText: (value: unknown, fallback?: string) => string
  normalizeExternalUrl: (value: string) => string
  isValidHttpUrl: (value: string) => boolean
  formatDateTimeLabel24h: (date: Date) => string
  normalizeDraftLocationItem: (rawValue: unknown, index: number) => InvitationEditorDraftLocation
  createDefaultDraftLocation: (index: number) => InvitationEditorDraftLocation
  projectTextOverridesIntoContent: (content: JsonRecord) => JsonRecord
  resolveLocation: (payload: ResolveTenantInvitationLocationPayload) => Promise<TenantResolvedInvitationLocation>
}

type UseInvitationEditorPersistenceOptions = {
  save: () => Promise<void>
  applyTemplateChange: () => Promise<void>
  publishInvitation: () => Promise<void>
}

export const useInvitationEditorPersistence = (
  options: UseInvitationEditorPersistenceOptions,
) => {
  const isSaving = ref(false)
  const isPublishing = ref(false)
  const isChangingTemplate = ref(false)

  const saveChanges = async () => {
    if (isSaving.value) return
    isSaving.value = true
    try {
      await options.save()
    } finally {
      isSaving.value = false
    }
  }

  const applyTemplateChange = async () => {
    if (isChangingTemplate.value) return
    isChangingTemplate.value = true
    try {
      await options.applyTemplateChange()
    } finally {
      isChangingTemplate.value = false
    }
  }

  const publishInvitation = async () => {
    if (isPublishing.value) return
    isPublishing.value = true
    try {
      await options.publishInvitation()
    } finally {
      isPublishing.value = false
    }
  }

  return {
    isSaving,
    isPublishing,
    isChangingTemplate,
    saveChanges,
    applyTemplateChange,
    publishInvitation,
  }
}

export type UseInvitationEditorPersistenceReturn = ReturnType<typeof useInvitationEditorPersistence>

export const useInvitationEditorSaveWorkflow = (
  options: UseInvitationEditorSaveWorkflowOptions,
) => {
  const validateBeforeSave = (): string | null => {
    if (options.resolvedSectionVisibility.value.faq) {
      if (!options.faqItems.value.length) {
        return 'Agrega al menos una pregunta y respuesta en FAQ o desactiva esa sección.'
      }

      const hasInvalidFaq = options.faqItems.value.some(
        (item) => !item.question.trim() || !item.answer.trim(),
      )

      if (hasInvalidFaq) {
        return 'Cada pregunta frecuente debe tener pregunta y respuesta.'
      }
    }

    if (options.resolvedSectionVisibility.value.countdown && !options.countdownDatetime.value) {
      return 'Selecciona una fecha para la cuenta regresiva.'
    }

    if (options.resolvedSectionVisibility.value.countdown) {
      const countdownTargetIso = options.asText(options.getByPath(options.contentDraft.value, 'countdown.targetDateIso'))
      const countdownDate = countdownTargetIso ? new Date(countdownTargetIso) : null
      if (!countdownDate || Number.isNaN(countdownDate.getTime()) || countdownDate.getTime() < Date.now()) {
        return 'La cuenta regresiva debe tener una fecha futura.'
      }
    }

    if (options.resolvedSectionVisibility.value.location) {
      const draftLocations = options.locationItemsDraft.value.slice(0, options.maxLocationsPerInvitation)
      if (!draftLocations.length) {
        return 'Agrega al menos una ubicación para continuar.'
      }

      for (let index = 0; index < draftLocations.length; index += 1) {
        const locationItem = draftLocations[index]
        if (!locationItem) continue

        const suffix = draftLocations.length > 1 ? ` en la ubicación ${index + 1}` : ''
        const mapsUrl = options.normalizeExternalUrl(options.asText(locationItem.mapsUrl))
        if (!mapsUrl) {
          return `Agrega el enlace de Google Maps${suffix}.`
        }
        if (!options.isValidHttpUrl(mapsUrl)) {
          return `El enlace de Google Maps${suffix} no es válido.`
        }

        if (locationItem.uberEnabled) {
          const uberUrl = options.normalizeExternalUrl(options.asText(locationItem.uberUrl))
          if (uberUrl && !options.isValidHttpUrl(uberUrl)) {
            return `El enlace de Uber${suffix} no es válido.`
          }
        }
      }
    }

    if (options.resolvedSectionVisibility.value.checkin) {
      if (options.checkinShowEventDate.value) {
        const checkinDateIso =
          options.asText(options.getByPath(options.contentDraft.value, 'checkin.eventDateIso'))
          || options.asText(options.getByPath(options.contentDraft.value, 'event.date.iso'))
        const checkinDate = checkinDateIso ? new Date(checkinDateIso) : null
        if (!checkinDate || Number.isNaN(checkinDate.getTime())) {
          return 'La fecha del check-in interactivo no es válida.'
        }
      }

      if (options.checkinShowEntryValue.value) {
        const amount = Number(options.getByPath(options.contentDraft.value, 'checkin.entry.amount') ?? 0)
        if (!Number.isFinite(amount) || amount <= 0) {
          return 'Ingresa un valor de entrada mayor a 0 para el check-in interactivo.'
        }

        const currency = options.asText(options.getByPath(options.contentDraft.value, 'checkin.entry.currency')).toUpperCase()
        if (!options.checkinCurrencyCodes.includes(currency)) {
          return 'Selecciona una moneda válida para el valor de entrada.'
        }
      }
    }

    return null
  }

  const buildProjectedContentForSave = async (): Promise<JsonRecord> => {
    const projectedContent = options.projectTextOverridesIntoContent(
      options.cloneRecord(options.contentDraft.value),
    )

    options.setByPath(
      projectedContent,
      'faq',
      options.faqItems.value.map((item, index) => ({
        id: options.asText(item.id, `faq-${index + 1}`),
        question: item.question,
        answer: item.answer,
      })),
    )

    const countdownIso = options.asText(options.getByPath(projectedContent, 'countdown.targetDateIso'))
    if (countdownIso) {
      const countdownDate = new Date(countdownIso)
      if (!Number.isNaN(countdownDate.getTime())) {
        options.setByPath(projectedContent, 'event.date.iso', countdownDate.toISOString())
        options.setByPath(projectedContent, 'event.date.label', options.formatDateTimeLabel24h(countdownDate))
      }
    }

    if (options.resolvedSectionVisibility.value.location) {
      const draftLocations = options.locationItemsDraft.value.slice(0, options.maxLocationsPerInvitation)
      const normalizedLocations: InvitationEditorDraftLocation[] = []

      for (let index = 0; index < draftLocations.length; index += 1) {
        const draftLocation = options.normalizeDraftLocationItem(draftLocations[index], index)
        const normalizedMapsUrl = options.normalizeExternalUrl(options.asText(draftLocation.mapsUrl))
        const normalizedUberUrl = options.normalizeExternalUrl(options.asText(draftLocation.uberUrl))

        const nextLocation: InvitationEditorDraftLocation = {
          ...draftLocation,
          mapsUrl: normalizedMapsUrl || draftLocation.mapsUrl,
          mapsCanonicalUrl: options.asText(
            draftLocation.mapsCanonicalUrl,
            normalizedMapsUrl || draftLocation.mapsUrl || options.defaultLocationMapsUrl,
          ),
          mapsSourceUrl: options.asText(
            draftLocation.mapsSourceUrl,
            normalizedMapsUrl || draftLocation.mapsUrl || options.defaultLocationMapsUrl,
          ),
          uberUrl: normalizedUberUrl || '',
        }

        try {
          const resolvedLocation = await options.resolveLocation({
            maps_url: normalizedMapsUrl || null,
            place_id: options.asText(nextLocation.placeId) || null,
            name: options.asText(nextLocation.name) || null,
            address: options.asText(nextLocation.address) || null,
            formatted_address: options.asText(nextLocation.formattedAddress) || null,
            latitude: nextLocation.latitude,
            longitude: nextLocation.longitude,
            uber_enabled: nextLocation.uberEnabled,
            uber_url: normalizedUberUrl || null,
          })

          if (resolvedLocation.name) nextLocation.name = resolvedLocation.name
          if (resolvedLocation.address) nextLocation.address = resolvedLocation.address
          if (resolvedLocation.formattedAddress) nextLocation.formattedAddress = resolvedLocation.formattedAddress
          if (resolvedLocation.mapsUrl) nextLocation.mapsUrl = resolvedLocation.mapsUrl
          if (resolvedLocation.mapsCanonicalUrl) nextLocation.mapsCanonicalUrl = resolvedLocation.mapsCanonicalUrl
          if (resolvedLocation.mapsSourceUrl) nextLocation.mapsSourceUrl = resolvedLocation.mapsSourceUrl
          if (resolvedLocation.placeId) nextLocation.placeId = resolvedLocation.placeId
          if (typeof resolvedLocation.latitude === 'number') nextLocation.latitude = resolvedLocation.latitude
          if (typeof resolvedLocation.longitude === 'number') nextLocation.longitude = resolvedLocation.longitude
          if (typeof resolvedLocation.uberEnabled === 'boolean') nextLocation.uberEnabled = resolvedLocation.uberEnabled
          if (resolvedLocation.uberUrl) nextLocation.uberUrl = resolvedLocation.uberUrl
        } catch {
          // Si falla la resolución canónica, continúa con la URL enviada por el cliente.
        }

        normalizedLocations.push(options.normalizeDraftLocationItem(nextLocation, index))
      }

      const persistedLocations = normalizedLocations.length
        ? normalizedLocations
        : [options.createDefaultDraftLocation(0)]

      options.setByPath(projectedContent, 'locations', persistedLocations)
      options.setByPath(projectedContent, 'location', persistedLocations[0] ?? options.createDefaultDraftLocation(0))
    }

    return projectedContent
  }

  return {
    validateBeforeSave,
    buildProjectedContentForSave,
  }
}

export type UseInvitationEditorSaveWorkflowReturn = ReturnType<typeof useInvitationEditorSaveWorkflow>

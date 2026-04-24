import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { InvitationGalleryItem } from '@/templates/types'
import {
  getTenantInvitationGallery,
  syncTenantInvitationGalleryImages,
  type TenantInvitationGalleryImage,
  type TenantInvitationGallerySummary,
} from '@/services/tenantInvitations'

export type PendingGallerySnapshotItem = {
  id: string
  file: File
  name: string
  shortName: string
  extension: string
  sizeBytes: number
}

export type PendingGalleryImage = PendingGallerySnapshotItem & {
  previewUrl: string
}

export type GalleryVisualItem = {
  id: string
  kind: 'persisted' | 'pending'
  imageId?: number
  name: string
  shortName: string
  statusLabel: string
  statusClass: 'ready' | 'processing' | 'failed' | 'pending'
}

type UseInvitationEditorGalleryOptions = {
  invitationId: Ref<number | null | undefined>
  notifyError: (message: string) => void
}

const DEFAULT_GALLERY_SUMMARY: TenantInvitationGallerySummary = {
  enabled: false,
  limit: null,
  used: 0,
  remaining: null,
}

const truncateGalleryFileName = (fileName: string): string => {
  const normalized = String(fileName ?? '').trim()
  if (!normalized) return 'imagen'
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 8)}...`
}

const validateGalleryFileType = (file: File): boolean => {
  const mime = String(file.type ?? '').toLowerCase()
  const lowerName = file.name.toLowerCase()
  const extension = lowerName.includes('.') ? lowerName.split('.').pop() ?? '' : ''
  const validMime = mime === 'image/jpeg' || mime === 'image/png'
  const validExtension = extension === 'jpg' || extension === 'jpeg' || extension === 'png'
  return validMime || validExtension
}

export const useInvitationEditorGallery = (options: UseInvitationEditorGalleryOptions) => {
  const isLoadingGallery = ref(false)
  const isUploadingGallery = ref(false)
  const gallerySummary = ref<TenantInvitationGallerySummary>({ ...DEFAULT_GALLERY_SUMMARY })
  const galleryImages = ref<TenantInvitationGalleryImage[]>([])
  const pendingGalleryImages = ref<PendingGalleryImage[]>([])
  const removedGalleryImageIds = ref<number[]>([])
  let galleryProcessingRefreshTimer: ReturnType<typeof setTimeout> | null = null

  const activeGalleryImages = computed(() =>
    galleryImages.value.filter((image) => !removedGalleryImageIds.value.includes(Number(image.id))),
  )

  const hasPendingGalleryChanges = computed(
    () => pendingGalleryImages.value.length > 0 || removedGalleryImageIds.value.length > 0,
  )

  const galleryUsedCount = computed(() => activeGalleryImages.value.length + pendingGalleryImages.value.length)
  const galleryLimit = computed(() => gallerySummary.value.limit)
  const galleryRemainingSlots = computed(() => {
    if (galleryLimit.value === null || galleryLimit.value >= 999) return null
    return Math.max(0, galleryLimit.value - galleryUsedCount.value)
  })

  const canAddGalleryImages = computed(() => {
    if (!gallerySummary.value.enabled) return false
    if (galleryRemainingSlots.value === null) return true
    return galleryRemainingSlots.value > 0
  })

  const galleryCounterLabel = computed(() => {
    if (galleryLimit.value === null || galleryLimit.value >= 999) {
      return `${galleryUsedCount.value} imágenes`
    }
    return `${galleryUsedCount.value} / ${galleryLimit.value} imágenes`
  })

  const resolveGalleryVariantUrl = (
    image: TenantInvitationGalleryImage,
    keys: string[],
  ): string => {
    const variants = image.variant_urls ?? null
    for (const key of keys) {
      const candidate = typeof variants?.[key] === 'string' ? variants[key] : ''
      if (candidate.trim()) return candidate
    }
    return String(image.public_url ?? '').trim()
  }

  const liveGalleryItems = computed<InvitationGalleryItem[]>(() => {
    const persisted: InvitationGalleryItem[] = []
    activeGalleryImages.value.forEach((image, index) => {
      const galleryUrl = resolveGalleryVariantUrl(image, [
        'gallery_medium',
        'hero_banner',
        'product_image',
        'lightbox_max',
        'thumbnail_large',
      ])
      if (!galleryUrl.trim()) return

      const thumbnailUrl = resolveGalleryVariantUrl(image, [
        'thumbnail_small',
        'thumbnail_medium',
        'thumbnail_large',
        'gallery_medium',
      ])
      const lightboxUrl = resolveGalleryVariantUrl(image, [
        'lightbox_max',
        'hero_banner',
        'product_image',
        'gallery_medium',
      ])

      persisted.push({
        id: `gallery-db-${image.id}`,
        imageUrl: galleryUrl,
        galleryUrl,
        thumbnailUrl,
        lightboxUrl,
        alt: String(image.original_name ?? '').trim() || `Foto ${index + 1}`,
      })
    })

    const queued: InvitationGalleryItem[] = []
    pendingGalleryImages.value.forEach((image, index) => {
      if (!image.previewUrl.trim()) return
      queued.push({
        id: image.id,
        imageUrl: image.previewUrl,
        galleryUrl: image.previewUrl,
        thumbnailUrl: image.previewUrl,
        lightboxUrl: image.previewUrl,
        alt: image.name || `Foto ${persisted.length + index + 1}`,
      })
    })

    return [...persisted, ...queued]
  })

  const galleryVisualItems = computed<GalleryVisualItem[]>(() => {
    const persisted: GalleryVisualItem[] = activeGalleryImages.value.map((image): GalleryVisualItem => {
      const status = String(image.processing_status ?? 'pending').toLowerCase()
      const statusClass: GalleryVisualItem['statusClass'] = status === 'ready'
        ? 'ready'
        : status === 'failed'
          ? 'failed'
          : status === 'processing'
            ? 'processing'
            : 'pending'
      const statusLabel = statusClass === 'ready'
        ? 'Lista'
        : statusClass === 'failed'
          ? 'Error'
          : statusClass === 'processing'
            ? 'Procesando'
            : 'Pendiente'

      return {
        id: `saved-${image.id}`,
        kind: 'persisted',
        imageId: image.id,
        name: image.original_name,
        shortName: truncateGalleryFileName(image.original_name),
        statusClass,
        statusLabel,
      }
    })

    const queued: GalleryVisualItem[] = pendingGalleryImages.value.map((image): GalleryVisualItem => ({
      id: image.id,
      kind: 'pending',
      name: image.name,
      shortName: image.shortName,
      statusClass: 'pending',
      statusLabel: 'Sin guardar',
    }))

    return [...persisted, ...queued]
  })

  const hasGalleryProcessingPending = computed(() =>
    activeGalleryImages.value.some((image) => {
      const status = String(image.processing_status ?? 'pending').toLowerCase()
      return status === 'pending' || status === 'processing'
    }),
  )

  const galleryProcessingHint = computed(() => {
    if (!hasGalleryProcessingPending.value) return null
    return 'Estamos optimizando tus imágenes en segundo plano. Esta lista se actualizará sola.'
  })

  const getGalleryItemStatusTitle = (item: GalleryVisualItem): string => {
    if (item.statusClass === 'failed') {
      const image = item.kind === 'persisted'
        ? galleryImages.value.find((row) => Number(row.id) === Number(item.imageId))
        : null
      const reason = image?.processing_error?.trim()
      return reason ? `Error al procesar: ${reason}` : 'No pudimos procesar esta imagen.'
    }

    if (item.statusClass === 'processing' || item.statusClass === 'pending') {
      return 'Estamos preparando esta imagen para optimizar la carga.'
    }

    return 'Imagen lista.'
  }

  const clonePendingGallerySnapshotItems = (items: PendingGallerySnapshotItem[]): PendingGallerySnapshotItem[] =>
    items.map((item) => ({
      id: item.id,
      file: item.file,
      name: item.name,
      shortName: item.shortName,
      extension: item.extension,
      sizeBytes: item.sizeBytes,
    }))

  const toPendingGallerySnapshotItems = (items: PendingGalleryImage[]): PendingGallerySnapshotItem[] =>
    items.map((item) => ({
      id: item.id,
      file: item.file,
      name: item.name,
      shortName: item.shortName,
      extension: item.extension,
      sizeBytes: item.sizeBytes,
    }))

  const hydratePendingGalleryImages = (items: PendingGallerySnapshotItem[]): PendingGalleryImage[] =>
    clonePendingGallerySnapshotItems(items).map((item) => ({
      ...item,
      previewUrl: URL.createObjectURL(item.file),
    }))

  const replacePendingGalleryImages = (items: PendingGalleryImage[]) => {
    const nextPreviewUrls = new Set(items.map((item) => item.previewUrl))
    for (const image of pendingGalleryImages.value) {
      if (image.previewUrl && !nextPreviewUrls.has(image.previewUrl)) {
        URL.revokeObjectURL(image.previewUrl)
      }
    }
    pendingGalleryImages.value = items
  }

  const sanitizeRemovedGalleryImageIds = (ids: number[]): number[] => {
    const activeIds = new Set(galleryImages.value.map((item) => Number(item.id)))
    return ids
      .map((item) => Number(item))
      .filter((id, index, collection) =>
        Number.isFinite(id) && id > 0 && activeIds.has(id) && collection.indexOf(id) === index,
      )
  }

  const setRemovedGalleryImageIds = (ids: number[]) => {
    removedGalleryImageIds.value = sanitizeRemovedGalleryImageIds(ids)
  }

  const clearGalleryPendingChanges = () => {
    replacePendingGalleryImages([])
    removedGalleryImageIds.value = []
  }

  const restoreAllRemovedGalleryImages = () => {
    removedGalleryImageIds.value = []
  }

  const removeGalleryVisualItem = (item: GalleryVisualItem) => {
    if (item.kind === 'pending') {
      const pendingRow = pendingGalleryImages.value.find((row) => row.id === item.id)
      if (pendingRow?.previewUrl) {
        URL.revokeObjectURL(pendingRow.previewUrl)
      }
      pendingGalleryImages.value = pendingGalleryImages.value.filter((row) => row.id !== item.id)
      return
    }

    const imageId = Number(item.imageId)
    if (!Number.isFinite(imageId) || imageId <= 0) return
    if (removedGalleryImageIds.value.includes(imageId)) return
    removedGalleryImageIds.value = [...removedGalleryImageIds.value, imageId]
  }

  const scheduleGalleryProcessingRefresh = () => {
    if (galleryProcessingRefreshTimer) {
      clearTimeout(galleryProcessingRefreshTimer)
      galleryProcessingRefreshTimer = null
    }

    if (!hasGalleryProcessingPending.value) return
    if (hasPendingGalleryChanges.value) return
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return

    galleryProcessingRefreshTimer = setTimeout(async () => {
      await loadGalleryData({ silent: true })
    }, 4000)
  }

  const loadGalleryData = async (payload?: { silent?: boolean }) => {
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return

    if (!payload?.silent) {
      isLoadingGallery.value = true
    }
    try {
      const response = await getTenantInvitationGallery(currentInvitationId)
      gallerySummary.value = response.gallery
      galleryImages.value = response.items
      scheduleGalleryProcessingRefresh()
    } catch (error) {
      if (!payload?.silent) {
        const source = error as { message?: string }
        options.notifyError(source?.message ?? 'No pudimos cargar la galería.')
      }
    } finally {
      if (!payload?.silent) {
        isLoadingGallery.value = false
      }
    }
  }

  const persistPendingGalleryImages = async () => {
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return
    if (!hasPendingGalleryChanges.value) return

    isUploadingGallery.value = true
    try {
      const response = await syncTenantInvitationGalleryImages(currentInvitationId, {
        files: pendingGalleryImages.value.map((item) => item.file),
        removeImageIds: removedGalleryImageIds.value,
      })

      gallerySummary.value = response.gallery
      galleryImages.value = response.items
      clearGalleryPendingChanges()
      scheduleGalleryProcessingRefresh()
    } finally {
      isUploadingGallery.value = false
    }
  }

  const queueGalleryFiles = (selectedFiles: File[]) => {
    if (!selectedFiles.length) return

    if (!gallerySummary.value.enabled) {
      options.notifyError('Activa la galería para agregar imágenes.')
      return
    }

    const validatedFiles = selectedFiles.filter((file) => validateGalleryFileType(file))
    if (validatedFiles.length !== selectedFiles.length) {
      options.notifyError('Solo se permiten imágenes JPG, JPEG o PNG.')
    }

    const remainingSlots = galleryRemainingSlots.value
    const allowedFiles = remainingSlots === null
      ? validatedFiles
      : validatedFiles.slice(0, Math.max(0, remainingSlots))

    if (!allowedFiles.length) {
      options.notifyError('Ya alcanzaste el límite de imágenes de tu plan.')
      return
    }

    if (allowedFiles.length < validatedFiles.length) {
      options.notifyError('Algunas imágenes quedaron fuera por el límite de tu plan.')
    }

    const pendingRows = allowedFiles.map((file) => {
      const extension = file.name.toLowerCase().split('.').pop() ?? ''
      return {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        shortName: truncateGalleryFileName(file.name),
        extension,
        sizeBytes: file.size,
      } as PendingGalleryImage
    })

    pendingGalleryImages.value = [...pendingGalleryImages.value, ...pendingRows]
  }

  const releaseResources = () => {
    if (galleryProcessingRefreshTimer) {
      clearTimeout(galleryProcessingRefreshTimer)
      galleryProcessingRefreshTimer = null
    }
    for (const image of pendingGalleryImages.value) {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl)
      }
    }
  }

  watch([hasGalleryProcessingPending, hasPendingGalleryChanges], () => {
    scheduleGalleryProcessingRefresh()
  })

  watch(removedGalleryImageIds, (nextValue) => {
    if (nextValue.length === 0) return
    const validIds = sanitizeRemovedGalleryImageIds(nextValue)
    if (validIds.length !== nextValue.length) {
      removedGalleryImageIds.value = validIds
    }
  })

  watch(galleryImages, () => {
    if (!removedGalleryImageIds.value.length) return

    const validIds = sanitizeRemovedGalleryImageIds(removedGalleryImageIds.value)
    if (validIds.length !== removedGalleryImageIds.value.length) {
      removedGalleryImageIds.value = validIds
    }
  })

  onBeforeUnmount(() => {
    releaseResources()
  })

  return {
    isLoadingGallery,
    isUploadingGallery,
    gallerySummary,
    galleryImages,
    pendingGalleryImages,
    removedGalleryImageIds,
    activeGalleryImages,
    hasPendingGalleryChanges,
    galleryUsedCount,
    galleryLimit,
    galleryRemainingSlots,
    canAddGalleryImages,
    galleryCounterLabel,
    galleryVisualItems,
    hasGalleryProcessingPending,
    galleryProcessingHint,
    resolveGalleryVariantUrl,
    getGalleryItemStatusTitle,
    clonePendingGallerySnapshotItems,
    toPendingGallerySnapshotItems,
    hydratePendingGalleryImages,
    replacePendingGalleryImages,
    setRemovedGalleryImageIds,
    clearGalleryPendingChanges,
    restoreAllRemovedGalleryImages,
    removeGalleryVisualItem,
    loadGalleryData,
    persistPendingGalleryImages,
    queueGalleryFiles,
    liveGalleryItems,
    releaseResources,
  }
}

export type UseInvitationEditorGalleryReturn = ReturnType<typeof useInvitationEditorGallery>

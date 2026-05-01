import { computed, ref, type Ref } from 'vue'

export type InvitationEditorResponsiveDevice = 'mobile' | 'tablet' | 'desktop'

const ZOOM_MIN_PERCENT = 50
const ZOOM_MAX_PERCENT = 140
const ZOOM_STEP_PERCENT = 5
const DEVICE_ZOOM_PRESET: Record<InvitationEditorResponsiveDevice, number> = {
  mobile: 130,
  tablet: 115,
  desktop: 100,
}

const DEVICE_OPTIONS: Array<{ value: InvitationEditorResponsiveDevice; label: string }> = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
]

const resolvePreviewDeviceByZoom = (zoomValue: number): InvitationEditorResponsiveDevice => {
  if (zoomValue <= 100) return 'desktop'
  if (zoomValue <= 125) return 'tablet'
  return 'mobile'
}

const clampZoom = (value: number): number => {
  const bounded = Math.min(ZOOM_MAX_PERCENT, Math.max(ZOOM_MIN_PERCENT, value))
  return Math.round(bounded / ZOOM_STEP_PERCENT) * ZOOM_STEP_PERCENT
}

export const useInvitationEditorViewport = () => {
  const previewDevice = ref<InvitationEditorResponsiveDevice>('mobile')
  const previewZoomPercent = ref(DEVICE_ZOOM_PRESET.mobile)

  const effectivePreviewDevice = computed<InvitationEditorResponsiveDevice>(() =>
    resolvePreviewDeviceByZoom(previewZoomPercent.value),
  )

  const effectivePreviewDeviceLabel = computed(() => {
    const row = DEVICE_OPTIONS.find((item) => item.value === effectivePreviewDevice.value)
    return row?.label ?? 'Desktop'
  })

  const isZoomShiftingViewport = computed(() =>
    previewZoomPercent.value !== DEVICE_ZOOM_PRESET[previewDevice.value],
  )

  const previewZoomScale = computed(() => previewZoomPercent.value / 100)
  const previewZoomLabel = computed(() => `${previewZoomPercent.value}%`)
  const previewViewportClass = computed(() => `preview-frame--${effectivePreviewDevice.value}`)
  const previewFrameStyle = computed(() => ({ zoom: String(previewZoomScale.value) }))

  const setPreviewZoom = (value: number) => {
    previewZoomPercent.value = clampZoom(value)
  }

  const adjustPreviewZoom = (delta: number) => {
    setPreviewZoom(previewZoomPercent.value + delta)
  }

  const resetPreviewZoom = () => {
    setPreviewZoom(DEVICE_ZOOM_PRESET[previewDevice.value])
  }

  const handleZoomInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!target) return
    const value = Number(target.value)
    if (!Number.isFinite(value)) return
    setPreviewZoom(value)
  }

  const selectPreviewDevice = (device: InvitationEditorResponsiveDevice) => {
    previewDevice.value = device
    setPreviewZoom(DEVICE_ZOOM_PRESET[device])
  }

  const handlePreviewWheelZoom = (event: WheelEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    if (event.deltaY === 0) return
    adjustPreviewZoom(event.deltaY > 0 ? -ZOOM_STEP_PERCENT : ZOOM_STEP_PERCENT)
  }

  return {
    previewDevice,
    previewZoomPercent,
    effectivePreviewDevice,
    effectivePreviewDeviceLabel,
    isZoomShiftingViewport,
    previewZoomLabel,
    previewViewportClass,
    previewFrameStyle,
    deviceOptions: DEVICE_OPTIONS,
    zoomMinPercent: ZOOM_MIN_PERCENT,
    zoomMaxPercent: ZOOM_MAX_PERCENT,
    zoomStepPercent: ZOOM_STEP_PERCENT,
    setPreviewZoom,
    adjustPreviewZoom,
    resetPreviewZoom,
    handleZoomInput,
    selectPreviewDevice,
    handlePreviewWheelZoom,
  }
}

export type UseInvitationEditorViewportReturn = ReturnType<typeof useInvitationEditorViewport>
export type InvitationEditorResponsiveDeviceRef = Ref<InvitationEditorResponsiveDevice>

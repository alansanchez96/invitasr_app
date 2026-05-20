<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

type GradientType = 'linear' | 'radial' | 'conic'

type GradientConfig = {
  enabled: boolean
  type: GradientType
  angle: number
  colors: string[]
}

type GradientTypeOption = {
  value: GradientType
  label: string
}

type HsvColor = {
  h: number
  s: number
  v: number
}

type PickerContext = {
  type: 'palette' | 'gradient'
  index: number | null
}

type GradientPreset = {
  label: string
  gradient: GradientConfig
}

const props = withDefaults(defineProps<{
  title: string
  color: string
  gradient: GradientConfig
  presetColors: string[]
  customColors?: string[]
  gradientTypes: GradientTypeOption[]
  maxGradientColors: number
  inline?: boolean
  allowGradient?: boolean
}>(), {
  allowGradient: true,
})

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update-color', color: string): void
  (event: 'update-gradient', gradient: GradientConfig): void
  (event: 'update-custom-colors', colors: string[]): void
}>()

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/
const MAX_CUSTOM_PALETTE_COLORS = 36

const gradientPresets: GradientPreset[] = [
  { label: 'Grafito', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#111827', '#4B5563'] } },
  { label: 'Plata', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#F8FAFC', '#94A3B8'] } },
  { label: 'Nieve', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#FFFFFF', '#CBD5E1'] } },
  { label: 'Lima', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#D9F99D', '#84CC16'] } },
  { label: 'Dorado', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#FFF7AD', '#8A5A00'] } },
  { label: 'Atardecer', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#7C3AED', '#F97316'] } },
  { label: 'Medianoche', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#0F172A', '#312E81'] } },
  { label: 'Cielo', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#DCFCE7', '#93C5FD'] } },
  { label: 'Coral', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#FB7185', '#F97316'] } },
  { label: 'Rosa vivo', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#F43F5E', '#8B5CF6'] } },
  { label: 'Aurora', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#8B5CF6', '#22D3EE'] } },
  { label: 'Océano', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#06B6D4', '#1D4ED8'] } },
  { label: 'Jade', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#8B5CF6', '#10B981'] } },
  { label: 'Menta', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#22C55E', '#14B8A6'] } },
  { label: 'Brisa', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#2DD4BF', '#FBBF24'] } },
  { label: 'Miel', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#FDE68A', '#FB923C'] } },
  { label: 'Romance', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#FDA4AF', '#F472B6'] } },
  { label: 'Perla', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#FEF3C7', '#FBCFE8'] } },
  { label: 'Fiesta', gradient: { enabled: true, type: 'linear', angle: 135, colors: ['#A855F7', '#F97316'] } },
]

const activeStopIndex = ref(0)
const pickerContext = ref<PickerContext | null>(null)
const draftColor = ref('#FFFFFF')
const pickerPopoverRef = ref<HTMLElement | null>(null)

const normalizeHexColor = (value: unknown, fallback = '#FFFFFF'): string => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (HEX_COLOR_PATTERN.test(text)) return text.toUpperCase()
  return fallback
}

const normalizeFlexibleHexColor = (value: unknown, fallback = '#FFFFFF'): string => {
  const rawText = typeof value === 'string' ? value.trim() : ''
  const compactText = rawText.replace(/^#/, '').replace(/[^0-9A-Fa-f]/g, '').slice(0, 7)
  if (!compactText) return fallback

  let normalized = compactText

  if (compactText.length === 1) {
    normalized = compactText.repeat(6)
  } else if (compactText.length === 2) {
    normalized = compactText.repeat(3)
  } else if (compactText.length === 3) {
    normalized = compactText.split('').map((item) => item + item).join('')
  } else if (compactText.length === 4) {
    normalized = compactText.split('').map((item) => item + item).join('')
  } else if (compactText.length === 5) {
    normalized = compactText.padEnd(6, compactText.charAt(compactText.length - 1) || '0')
  } else if (compactText.length === 7) {
    normalized = `${compactText.slice(0, 6)}${compactText.slice(6).repeat(2)}`
  }

  const color = `#${normalized}`.toUpperCase()
  return HEX_COLOR_PATTERN.test(color) ? color : fallback
}

const clampHue = (value: unknown): number => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(360, Math.max(0, Math.round(numericValue)))
}

const clampPercent = (value: unknown): number => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(100, Math.max(0, Math.round(numericValue)))
}

const hexToRgb = (value: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(value).replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((value) => Math.min(255, Math.max(0, Math.round(value))))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()

const hexAlphaSuffix = (value: string): string => {
  const normalized = normalizeHexColor(value, '')
  return normalized.length === 9 ? normalized.slice(7) : ''
}

const hexToHsv = (value: string): HsvColor => {
  const rgb = hexToRgb(value)
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }

  if (h < 0) h += 360

  return {
    h: clampHue(h),
    s: max === 0 ? 0 : clampPercent((delta / max) * 100),
    v: clampPercent(max * 100),
  }
}

const hsvToHex = (hsv: HsvColor): string => {
  const h = clampHue(hsv.h)
  const s = clampPercent(hsv.s) / 100
  const v = clampPercent(hsv.v) / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

const uniqueColors = (colors: unknown[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of colors) {
    const color = normalizeHexColor(item, '')
    if (!color || seen.has(color)) continue
    seen.add(color)
    result.push(color)
  }

  return result
}

const normalizedCustomColors = computed(() =>
  uniqueColors(props.customColors ?? []).slice(0, MAX_CUSTOM_PALETTE_COLORS),
)

const basePaletteColors = computed(() =>
  uniqueColors(props.presetColors).slice(0, MAX_CUSTOM_PALETTE_COLORS),
)

const suggestedColors = computed(() =>
  normalizedCustomColors.value.length ? normalizedCustomColors.value : basePaletteColors.value,
)

const normalizedGradient = computed<GradientConfig>(() => {
  const colors = props.gradient.colors
    .map((color) => normalizeHexColor(color, ''))
    .filter(Boolean)
    .slice(0, props.maxGradientColors)

  const fallbackColor = normalizeHexColor(props.color)
  const normalizedColors = colors.length >= 2
    ? colors
    : [fallbackColor, fallbackColor === '#F06AA6' ? '#7A4FD9' : '#F06AA6']

  return {
    enabled: props.allowGradient !== false && Boolean(props.gradient.enabled),
    type: props.gradientTypes.some((option) => option.value === props.gradient.type)
      ? props.gradient.type
      : 'linear',
    angle: Math.min(360, Math.max(0, Math.round(Number(props.gradient.angle) || 135))),
    colors: normalizedColors,
  }
})

const activeColor = computed(() => {
  if (!normalizedGradient.value.enabled) return normalizeHexColor(props.color)
  return normalizedGradient.value.colors[activeStopIndex.value] ?? normalizedGradient.value.colors[0] ?? '#FFFFFF'
})

const draftColorHsv = computed(() => hexToHsv(draftColor.value))

const pickerSurfaceStyle = computed(() => ({
  background: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, hsl(${draftColorHsv.value.h} 100% 50%))`,
}))

const pickerDotStyle = computed(() => ({
  left: `${draftColorHsv.value.s}%`,
  top: `${100 - draftColorHsv.value.v}%`,
  background: draftColor.value,
}))

const gradientPaint = (gradient: GradientConfig): string => {
  const colors = gradient.colors.join(', ')
  if (gradient.type === 'radial') return `radial-gradient(circle, ${colors})`
  if (gradient.type === 'conic') return `conic-gradient(from ${gradient.angle}deg, ${colors})`
  return `linear-gradient(${gradient.angle}deg, ${colors})`
}

watch(
  () => normalizedGradient.value.colors.length,
  (length) => {
    if (activeStopIndex.value >= length) {
      activeStopIndex.value = Math.max(0, length - 1)
    }
  },
)

watch(
  () => activeColor.value,
  (color) => {
    if (!pickerContext.value) {
      draftColor.value = color
    }
  },
  { immediate: true },
)

const emitGradient = (patch: Partial<GradientConfig>) => {
  emit('update-gradient', {
    ...normalizedGradient.value,
    ...patch,
  })
}

const emitCustomPalette = (colors: string[]) => {
  emit('update-custom-colors', uniqueColors(colors).slice(0, MAX_CUSTOM_PALETTE_COLORS))
}

const editablePaletteSeed = (): string[] =>
  normalizedCustomColors.value.length ? [...normalizedCustomColors.value] : [...basePaletteColors.value]

const persistPaletteColor = (color: string, index: number | null): number | null => {
  const normalizedColor = normalizeHexColor(color, '')
  if (!normalizedColor) return index

  const nextColors = editablePaletteSeed()
  let nextIndex = index

  if (typeof index === 'number' && index >= 0 && index < nextColors.length) {
    nextColors[index] = normalizedColor
  } else if (typeof index === 'number' && index === nextColors.length) {
    nextColors.push(normalizedColor)
  } else if (!nextColors.includes(normalizedColor)) {
    nextIndex = nextColors.length
    nextColors.push(normalizedColor)
  } else {
    nextIndex = nextColors.indexOf(normalizedColor)
  }

  emitCustomPalette(nextColors)
  return nextIndex
}

const setMode = (mode: 'solid' | 'gradient') => {
  if (mode === 'gradient' && props.allowGradient === false) return
  pickerContext.value = null
  emitGradient({ enabled: mode === 'gradient' })
}

const updateActiveColor = (color: string) => {
  const normalizedColor = normalizeHexColor(color, '')
  if (!normalizedColor) return

  if (!normalizedGradient.value.enabled) {
    emit('update-color', normalizedColor)
    return
  }

  const colors = [...normalizedGradient.value.colors]
  colors[activeStopIndex.value] = normalizedColor
  emitGradient({ colors })
}

const openPalettePicker = (index: number | null) => {
  const color = typeof index === 'number' ? suggestedColors.value[index] : activeColor.value
  draftColor.value = normalizeHexColor(color, activeColor.value)
  pickerContext.value = { type: 'palette', index }
}

const openGradientPicker = (index: number | null) => {
  let nextIndex = index

  if (nextIndex === null) {
    if (normalizedGradient.value.colors.length >= props.maxGradientColors) return

    const nextColors = [...normalizedGradient.value.colors, activeColor.value]
    nextIndex = nextColors.length - 1
    emitGradient({ enabled: true, colors: nextColors })
  }

  activeStopIndex.value = nextIndex
  draftColor.value = normalizeHexColor(normalizedGradient.value.colors[nextIndex], activeColor.value)
  pickerContext.value = { type: 'gradient', index: nextIndex }
}

const applyCustomPickerColor = (color: string) => {
  const normalizedColor = normalizeHexColor(color, '')
  if (!normalizedColor) return

  draftColor.value = normalizedColor
  updateActiveColor(normalizedColor)

  if (pickerContext.value?.type === 'palette') {
    const nextIndex = persistPaletteColor(normalizedColor, pickerContext.value.index)
    pickerContext.value = { ...pickerContext.value, index: nextIndex }
  }
}

const updateDraftColorFromHsv = (patch: Partial<HsvColor>) => {
  applyCustomPickerColor(`${hsvToHex({ ...draftColorHsv.value, ...patch })}${hexAlphaSuffix(draftColor.value)}`)
}

const resolveSurfaceHsv = (event: PointerEvent): HsvColor => {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return draftColorHsv.value

  const rect = target.getBoundingClientRect()
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)

  return {
    ...draftColorHsv.value,
    s: clampPercent((x / rect.width) * 100),
    v: clampPercent(100 - (y / rect.height) * 100),
  }
}

const updateDraftColorFromSurface = (event: PointerEvent) => {
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }

  applyCustomPickerColor(hsvToHex(resolveSurfaceHsv(event)))
}

const moveDraftColorOnSurface = (event: PointerEvent) => {
  if (event.buttons !== 1) return
  applyCustomPickerColor(hsvToHex(resolveSurfaceHsv(event)))
}

const selectPresetColor = (color: string) => {
  pickerContext.value = null
  updateActiveColor(color)
}

const selectGradientPreset = (preset: GradientPreset) => {
  pickerContext.value = null
  activeStopIndex.value = 0
  emitGradient({ ...preset.gradient, enabled: true })
}

const removeGradientColor = (index: number) => {
  if (normalizedGradient.value.colors.length <= 2) return

  const nextColors = normalizedGradient.value.colors.filter((_, currentIndex) => currentIndex !== index)
  activeStopIndex.value = Math.min(activeStopIndex.value, nextColors.length - 1)
  if (pickerContext.value?.type === 'gradient' && pickerContext.value.index === index) {
    pickerContext.value = null
  }
  emitGradient({ colors: nextColors })
}

const closeFromBackdrop = () => {
  if (!props.inline) {
    emit('close')
  }
}

const closePickerFromOutside = (event: PointerEvent) => {
  if (!pickerContext.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (pickerPopoverRef.value?.contains(target)) return
  pickerContext.value = null
}

watch(
  pickerContext,
  (context) => {
    if (context) {
      window.addEventListener('pointerdown', closePickerFromOutside, { capture: true })
    } else {
      window.removeEventListener('pointerdown', closePickerFromOutside, { capture: true })
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', closePickerFromOutside, { capture: true })
})
</script>

<template>
  <div class="color-studio-host" :class="{ 'color-studio-host--inline': inline, 'color-studio-host--overlay': !inline }"
    role="dialog" :aria-modal="inline ? 'false' : 'true'" aria-label="Selector de color"
    @click.self="closeFromBackdrop" @keydown.esc="emit('close')">
    <section class="color-studio">
      <header class="color-studio__header">
        <div>
          <p>Personalización</p>
          <h3>{{ title }}</h3>
        </div>
        <button v-if="!inline" type="button" class="color-studio__close" aria-label="Cerrar selector"
          @click="emit('close')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      <div v-if="allowGradient !== false" class="color-studio__tabs" role="group" aria-label="Modo de color">
        <button type="button" :class="{ 'is-active': !normalizedGradient.enabled }" @click="setMode('solid')">
          Color
        </button>
        <button type="button" :class="{ 'is-active': normalizedGradient.enabled }" @click="setMode('gradient')">
          Degradado
        </button>
      </div>

      <div class="color-studio__body">
        <section v-if="!normalizedGradient.enabled" class="color-studio__section">
          <div class="color-studio__section-head">
            <h4>Paleta sugerida</h4>
          </div>

          <div class="color-studio__presets">
            <span v-for="(presetColor, index) in suggestedColors" :key="`${presetColor}-${index}`"
              class="color-studio__preset-wrap">
              <button type="button" class="color-studio__preset" :style="{ background: presetColor }"
                :aria-label="`Usar ${presetColor}`" @click="selectPresetColor(presetColor)"></button>
              <button type="button" class="color-studio__edit-swatch" :aria-label="`Editar ${presetColor}`"
                @click.stop="openPalettePicker(index)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
                </svg>
              </button>
            </span>

            <button type="button" class="color-studio__preset color-studio__preset--add"
              aria-label="Agregar color personalizado" data-tooltip="Agregar color personalizado"
              @click.stop="openPalettePicker(null)">
              <span>+</span>
            </button>
          </div>

          <div v-if="pickerContext?.type === 'palette'" ref="pickerPopoverRef" class="color-studio__picker-popover"
            @pointerdown.stop>
            <div class="color-studio__picker">
              <div class="color-studio__surface" :style="pickerSurfaceStyle" role="slider" tabindex="0"
                aria-label="Elegir intensidad del color" @pointerdown="updateDraftColorFromSurface"
                @pointermove="moveDraftColorOnSurface">
                <span :style="pickerDotStyle"></span>
              </div>

              <label class="color-studio__tone color-studio__tone--hue">
                <input class="color-studio__hue" type="range" min="0" max="360" :value="draftColorHsv.h"
                  aria-label="Elegir tono"
                  @input="updateDraftColorFromHsv({ h: ($event.target as HTMLInputElement).valueAsNumber })" />
              </label>

              <input class="color-studio__hex" type="text" :value="draftColor" maxlength="9" spellcheck="false"
                aria-label="Color en formato HEX" placeholder="#RRGGBBAA"
                @change="applyCustomPickerColor(normalizeFlexibleHexColor(($event.target as HTMLInputElement).value, draftColor))" />
            </div>
          </div>
        </section>

        <section v-else class="color-studio__section">
          <div class="color-studio__section-head">
            <h4>Colores degradados predeterminados</h4>
          </div>

          <div class="color-studio__gradient-presets">
            <button v-for="preset in gradientPresets" :key="preset.label" type="button"
              class="color-studio__gradient-preset" :style="{ background: gradientPaint(preset.gradient) }"
              :aria-label="`Usar degradado ${preset.label}`" @click="selectGradientPreset(preset)">
            </button>
          </div>

          <div class="color-studio__gradient-controls">
            <label>
              <span>Tipo</span>
              <select :value="normalizedGradient.type"
                @change="emitGradient({ type: ($event.target as HTMLSelectElement).value as GradientType })">
                <option v-for="option in gradientTypes" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label>
              <span>Dirección</span>
              <input type="range" min="0" max="360" :value="normalizedGradient.angle"
                :disabled="normalizedGradient.type === 'radial'"
                @input="emitGradient({ angle: ($event.target as HTMLInputElement).valueAsNumber })" />
            </label>
          </div>

          <div class="color-studio__stops" role="list" aria-label="Colores del degradado">
            <span v-for="(stopColor, index) in normalizedGradient.colors" :key="`${stopColor}-${index}`"
              class="color-studio__stop-wrap">
              <button type="button" class="color-studio__stop" :class="{ 'is-active': activeStopIndex === index }"
                :style="{ '--stop-color': stopColor }" :aria-label="`Editar color ${index + 1}`"
                @click="openGradientPicker(index)">
                <span></span>
              </button>
              <button v-if="normalizedGradient.colors.length > 2" type="button" class="color-studio__stop-remove"
                :aria-label="`Eliminar color ${index + 1}`" @click.stop="removeGradientColor(index)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </span>

            <button v-if="normalizedGradient.colors.length < maxGradientColors" type="button"
              class="color-studio__stop color-studio__stop--add" aria-label="Agregar color del degradado"
              @click="openGradientPicker(null)">
              +
            </button>
          </div>

          <div v-if="pickerContext?.type === 'gradient'" ref="pickerPopoverRef" class="color-studio__picker-popover"
            @pointerdown.stop>
            <div class="color-studio__picker">
              <div class="color-studio__surface" :style="pickerSurfaceStyle" role="slider" tabindex="0"
                aria-label="Elegir intensidad del color" @pointerdown="updateDraftColorFromSurface"
                @pointermove="moveDraftColorOnSurface">
                <span :style="pickerDotStyle"></span>
              </div>

              <label class="color-studio__tone color-studio__tone--hue">
                <input class="color-studio__hue" type="range" min="0" max="360" :value="draftColorHsv.h"
                  aria-label="Elegir tono"
                  @input="updateDraftColorFromHsv({ h: ($event.target as HTMLInputElement).valueAsNumber })" />
              </label>

              <input class="color-studio__hex" type="text" :value="draftColor" maxlength="9" spellcheck="false"
                aria-label="Color en formato HEX" placeholder="#RRGGBBAA"
                @change="applyCustomPickerColor(normalizeFlexibleHexColor(($event.target as HTMLInputElement).value, draftColor))" />
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.color-studio-host--overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 18px;
  background:
    radial-gradient(circle at 18% 12%, rgba(122, 79, 217, 0.24), transparent 34%),
    rgba(22, 12, 38, 0.48);
  backdrop-filter: blur(14px);
}

.color-studio-host--inline {
  width: 100%;
  min-width: 0;
}

.color-studio {
  width: min(480px, calc(100vw - 28px));
  max-height: min(760px, calc(100vh - 36px));
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border: 1px solid rgba(219, 203, 255, 0.86);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(240, 106, 166, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(250, 247, 255, 0.95));
  box-shadow:
    0 34px 80px rgba(35, 18, 64, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.94) inset;
}

.color-studio-host--inline .color-studio {
  width: 100%;
  max-height: none;
  border-radius: 22px;
  box-shadow:
    0 18px 34px rgba(45, 24, 84, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.92) inset;
}

.color-studio__header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 16px 10px;
}

.color-studio-host--inline .color-studio__header {
  padding: 14px 14px 8px;
}

.color-studio__header p {
  margin: 0 0 4px;
  color: #8b5cf6;
  font-size: 0.68rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.color-studio__header h3 {
  margin: 0;
  color: #24133b;
  font-size: clamp(1.1rem, 4vw, 1.34rem);
  font-weight: 950;
  line-height: 1.06;
}

.color-studio__close {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(155, 107, 255, 0.22);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.84);
  color: #2b1a44;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  transition: transform 0.18s ease, background 0.18s ease;
}

.color-studio__close:hover,
.color-studio__close:focus-visible {
  background: #fff;
  transform: translateY(-1px);
  outline: none;
}

.color-studio__close svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.color-studio__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 16px 12px;
}

.color-studio-host--inline .color-studio__tabs {
  padding: 0 14px 12px;
}

.color-studio__tabs button {
  min-height: 40px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.78);
  color: #5f457e;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 950;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.color-studio__tabs button.is-active {
  background: linear-gradient(135deg, #7a4fd9, #f06aa6);
  color: #fff;
  box-shadow: 0 14px 28px rgba(122, 79, 217, 0.22);
}

.color-studio__body {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 12px;
  padding: 0 16px 16px;
}

.color-studio-host--inline .color-studio__body {
  overflow: visible;
  padding: 0 14px 14px;
}

.color-studio__section {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(219, 203, 255, 0.72);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  padding: 13px;
}

.color-studio__section-head h4 {
  margin: 0;
  color: #24133b;
  font-size: 0.88rem;
  font-weight: 950;
}

.color-studio__presets,
.color-studio__gradient-presets,
.color-studio__stops {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.color-studio__preset-wrap {
  position: relative;
  display: inline-grid;
  place-items: center;
}

.color-studio__preset,
.color-studio__gradient-preset {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgba(155, 107, 255, 0.16),
    0 8px 16px rgba(45, 24, 84, 0.12);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.color-studio__gradient-preset {
  width: 36px;
  height: 36px;
  flex-basis: 36px;
}

.color-studio__preset:hover,
.color-studio__preset:focus-visible,
.color-studio__gradient-preset:hover,
.color-studio__gradient-preset:focus-visible {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.2),
    0 14px 24px rgba(45, 24, 84, 0.16);
  outline: none;
}

.color-studio__preset--add {
  display: inline-grid;
  place-items: center;
  color: #24133b;
  font-size: 1.2rem;
  font-weight: 950;
  background:
    conic-gradient(#ff004c, #ff7a00, #ffe600, #47d764, #00c2ff, #2458ff, #9b4dff, #ff2ea6, #ff004c);
}

.color-studio__preset--add span {
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  line-height: 1;
}

.color-studio__preset--add[data-tooltip] {
  position: relative;
}

.color-studio__preset--add[data-tooltip]::after,
.color-studio__preset--add[data-tooltip]::before {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease, transform 0.16s ease;
  z-index: 5;
}

.color-studio__preset--add[data-tooltip]::after {
  content: attr(data-tooltip);
  left: 50%;
  bottom: calc(100% + 9px);
  transform: translate(-50%, 4px);
  width: max-content;
  max-width: 210px;
  border-radius: 10px;
  background: rgba(22, 12, 38, 0.94);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1.25;
  padding: 0.42rem 0.58rem;
  box-shadow: 0 12px 24px rgba(22, 12, 38, 0.24);
}

.color-studio__preset--add[data-tooltip]::before {
  content: '';
  left: 50%;
  bottom: calc(100% + 4px);
  transform: translate(-50%, 4px);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(22, 12, 38, 0.94);
}

.color-studio__preset--add[data-tooltip]:hover::after,
.color-studio__preset--add[data-tooltip]:hover::before,
.color-studio__preset--add[data-tooltip]:focus-visible::after,
.color-studio__preset--add[data-tooltip]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, 0);
}

.color-studio__edit-swatch {
  position: absolute;
  inset: auto -7px -7px auto;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(122, 79, 217, 0.24);
  border-radius: 999px;
  background: #fff;
  color: #5b2fb8;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  opacity: 0;
  transform: scale(0.72);
  box-shadow: 0 8px 18px rgba(45, 24, 84, 0.16);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.color-studio__preset-wrap:hover .color-studio__edit-swatch,
.color-studio__preset-wrap:focus-within .color-studio__edit-swatch {
  opacity: 1;
  transform: scale(1);
}

.color-studio__edit-swatch svg {
  width: 11px;
  height: 11px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.color-studio__gradient-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.color-studio__gradient-controls label,
.color-studio__tone {
  min-width: 0;
  display: grid;
  gap: 6px;
  color: #6a5484;
  font-size: 0.75rem;
  font-weight: 950;
}

.color-studio__gradient-controls select,
.color-studio__hex {
  min-width: 0;
  width: 100%;
  min-height: 42px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #24133b;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 850;
  padding: 0.45rem 0.68rem;
  text-transform: uppercase;
}

.color-studio input[type='range'] {
  width: 100%;
  accent-color: #8b5cf6;
}

.color-studio__stop-wrap {
  position: relative;
  display: inline-grid;
  place-items: center;
}

.color-studio__stop {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.82);
  padding: 4px;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.color-studio__stop span {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: var(--stop-color);
}

.color-studio__stop.is-active {
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.22),
    0 12px 22px rgba(45, 24, 84, 0.18);
  transform: translateY(-1px);
}

.color-studio__stop--add {
  border: 1px dashed rgba(122, 79, 217, 0.34);
  color: #5b2fb8;
  font-size: 1.25rem;
  font-weight: 950;
}

.color-studio__stop-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(239, 68, 68, 0.34);
  border-radius: 999px;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  opacity: 0;
  transform: scale(0.72);
  box-shadow: 0 8px 18px rgba(127, 29, 29, 0.18);
  transition: opacity 0.16s ease, transform 0.16s ease, background 0.16s ease;
}

.color-studio__stop-wrap:hover .color-studio__stop-remove,
.color-studio__stop-wrap:focus-within .color-studio__stop-remove {
  opacity: 1;
  transform: scale(1);
}

.color-studio__stop-remove:hover,
.color-studio__stop-remove:focus-visible {
  background: #fee2e2;
  outline: none;
}

.color-studio__stop-remove svg {
  width: 11px;
  height: 11px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
}

.color-studio__picker-popover {
  width: min(292px, 100%);
  border: 1px solid rgba(219, 203, 255, 0.92);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  padding: 10px;
  box-shadow:
    0 18px 36px rgba(35, 18, 64, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.96) inset;
}

.color-studio__picker {
  display: grid;
  gap: 9px;
}

.color-studio__surface {
  height: 126px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  border-radius: 10px;
  cursor: crosshair;
  overflow: hidden;
  position: relative;
  touch-action: none;
  box-shadow:
    0 10px 20px rgba(45, 24, 84, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

.color-studio__surface span {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 3px solid #fff;
  border-radius: 999px;
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.24),
    0 8px 18px rgba(15, 23, 42, 0.18);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-studio__tone--hue {
  display: block;
}

.color-studio__hue {
  appearance: none;
  height: 14px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      #ff0000 0%,
      #ff7a00 12%,
      #ffe600 24%,
      #47d764 38%,
      #00c2ff 52%,
      #2458ff 66%,
      #9b4dff 82%,
      #ff2ea6 94%,
      #ff0000 100%
    );
  box-shadow:
    0 0 0 1px rgba(155, 107, 255, 0.18),
    0 8px 16px rgba(45, 24, 84, 0.1);
  cursor: pointer;
}

.color-studio__hue::-webkit-slider-runnable-track {
  height: 14px;
  border-radius: 999px;
  background: transparent;
}

.color-studio__hue::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  margin-top: -5px;
  border: 4px solid #fff;
  border-radius: 999px;
  background: hsl(v-bind('draftColorHsv.h') 100% 50%);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.22),
    0 8px 18px rgba(15, 23, 42, 0.22);
}

.color-studio__hue::-moz-range-track {
  height: 14px;
  border-radius: 999px;
  background: transparent;
}

.color-studio__hue::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 4px solid #fff;
  border-radius: 999px;
  background: hsl(v-bind('draftColorHsv.h') 100% 50%);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.22),
    0 8px 18px rgba(15, 23, 42, 0.22);
}

@media (max-width: 640px) {
  .color-studio-host--overlay {
    align-items: end;
    padding: 10px;
  }

  .color-studio {
    width: 100%;
    max-height: calc(100vh - 20px);
    border-radius: 24px;
  }

  .color-studio__gradient-controls {
    grid-template-columns: 1fr;
  }
}
</style>

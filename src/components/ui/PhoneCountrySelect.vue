<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CountryCode } from 'libphonenumber-js'
import type { PhoneCountryOption } from '@/utils/phoneNumbers'

const props = defineProps<{
  modelValue: CountryCode
  options: PhoneCountryOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: CountryCode): void
}>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() =>
  props.options.find((option) => option.iso === props.modelValue) ?? props.options[0] ?? null,
)

const close = () => {
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const selectOption = (option: PhoneCountryOption) => {
  emit('update:modelValue', option.iso)
  close()
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const root = rootRef.value
  if (!root || root.contains(event.target as Node)) return
  close()
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}

watch(isOpen, (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleDocumentKeydown)
    return
  }

  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div ref="rootRef" class="phone-country-select">
    <button
      type="button"
      class="phone-country-select__button"
      :disabled="disabled"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="toggle">
      <span>{{ selectedOption?.closedLabel ?? '🌐' }}</span>
    </button>

    <div v-if="isOpen" class="phone-country-select__menu" role="listbox">
      <button
        v-for="option in options"
        :key="option.iso"
        type="button"
        class="phone-country-select__option"
        :class="{ 'phone-country-select__option--active': option.iso === modelValue }"
        role="option"
        :aria-selected="option.iso === modelValue"
        @click="selectOption(option)">
        <span>{{ option.name }}</span>
        <strong>+{{ option.callingCode }}</strong>
      </button>
    </div>
  </div>
</template>

<style scoped>
.phone-country-select {
  position: relative;
  min-width: 0;
  height: 100%;
}

.phone-country-select__button {
  width: 100%;
  height: 100%;
  min-height: 40px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: inherit;
  background: #ffffff;
  color: #1f2937;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 0 0.55rem;
  white-space: nowrap;
}

.phone-country-select__button:disabled {
  cursor: not-allowed;
}

.phone-country-select__menu {
  position: absolute;
  z-index: 80;
  inset-inline-start: 0;
  top: calc(100% + 6px);
  width: min(320px, 78vw);
  max-height: 260px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  padding: 6px;
}

.phone-country-select__option {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  padding: 0 10px;
}

.phone-country-select__option:hover,
.phone-country-select__option--active {
  background: #f3ecff;
  color: #4f2d81;
}

.phone-country-select__option strong {
  white-space: nowrap;
}
</style>

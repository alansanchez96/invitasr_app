<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
const searchQuery = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const selectedOption = computed(() =>
  props.options.find((option) => option.iso === props.modelValue) ?? props.options[0] ?? null,
)

const normalizeSearchText = (value: string): string =>
  value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const filteredOptions = computed(() => {
  const query = normalizeSearchText(searchQuery.value)
  if (!query) return props.options

  return props.options.filter((option) => {
    const name = normalizeSearchText(option.name)
    return name.startsWith(query) || option.iso.toLocaleLowerCase('es').startsWith(query)
  })
})

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const toggle = () => {
  if (props.disabled) return
  if (isOpen.value) {
    close()
    return
  }

  isOpen.value = true
}

const open = async () => {
  if (props.disabled) return
  isOpen.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

const selectOption = (option: PhoneCountryOption) => {
  emit('update:modelValue', option.iso)
  close()
}

const handleButtonKeydown = async (event: KeyboardEvent) => {
  if (props.disabled) return

  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    await open()
    return
  }

  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    searchQuery.value = event.key
    await open()
  }
}

const handleSearchKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const firstOption = filteredOptions.value[0]
    if (firstOption) {
      selectOption(firstOption)
    }
  }
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
    void nextTick(() => searchInputRef.value?.focus())
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
      @click="toggle"
      @keydown="handleButtonKeydown">
      <span>{{ selectedOption?.closedLabel ?? '🌐' }}</span>
    </button>

    <div v-if="isOpen" class="phone-country-select__menu" role="listbox">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        class="phone-country-select__search"
        type="text"
        inputmode="search"
        autocomplete="off"
        placeholder="Buscar país"
        @keydown="handleSearchKeydown" />
      <button
        v-for="option in filteredOptions"
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
      <p v-if="!filteredOptions.length" class="phone-country-select__empty">Sin resultados</p>
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

.phone-country-select__search {
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 9px;
  background: #ffffff;
  color: #1f2937;
  font: inherit;
  font-size: 0.9rem;
  padding: 0 10px;
  margin: 0 0 6px;
  outline: none;
}

.phone-country-select__search:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
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

.phone-country-select__empty {
  margin: 0;
  padding: 10px;
  color: #6b7280;
  font-size: 0.86rem;
}
</style>

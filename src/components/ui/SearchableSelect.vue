<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

type SearchableSelectOption = {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string | string[]
  options: SearchableSelectOption[]
  id?: string
  disabled?: boolean
  multiple?: boolean
  placeholder?: string
  searchPlaceholder?: string
  allLabel?: string
  emptyLabel?: string
  resultLimit?: number
  required?: boolean
}>(), {
  id: '',
  disabled: false,
  multiple: false,
  placeholder: 'Seleccionar',
  searchPlaceholder: 'Buscar',
  allLabel: '',
  emptyLabel: 'No encontramos resultados.',
  resultLimit: 25,
  required: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | string[]): void
  (event: 'search-change', value: string): void
  (event: 'open'): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const search = ref('')

const selectedValues = computed(() =>
  Array.isArray(props.modelValue)
    ? props.modelValue.map(String).filter(Boolean)
    : String(props.modelValue || '').trim()
      ? [String(props.modelValue)]
      : [],
)

const selectedOptions = computed(() =>
  selectedValues.value
    .map((value) => props.options.find((option) => option.value === value) ?? null)
    .filter((option): option is SearchableSelectOption => Boolean(option)),
)

const selectedLabel = computed(() => {
  if (!selectedValues.value.length && props.allLabel) return props.allLabel
  if (!selectedValues.value.length) return props.placeholder
  if (!props.multiple) return selectedOptions.value[0]?.label || props.placeholder
  if (selectedOptions.value.length <= 2) {
    return selectedOptions.value.map((option) => option.label).join(', ')
  }

  return `${selectedOptions.value.length} invitaciones seleccionadas`
})

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase()
  const source = query
    ? props.options.filter((option) => option.label.toLowerCase().includes(query))
    : props.options

  return source.slice(0, props.resultLimit)
})

const shouldShowLimitHint = computed(() => {
  const query = search.value.trim().toLowerCase()
  const sourceLength = query
    ? props.options.filter((option) => option.label.toLowerCase().includes(query)).length
    : props.options.length

  return sourceLength >= props.resultLimit
})

const open = async () => {
  if (props.disabled) return
  isOpen.value = true
  emit('open')
  await nextTick()
  searchInputRef.value?.focus()
}

const close = () => {
  isOpen.value = false
  search.value = ''
}

const toggle = () => {
  if (isOpen.value) {
    close()
    return
  }

  void open()
}

const selectValue = (value: string) => {
  if (!props.multiple) {
    emit('update:modelValue', value)
    close()
    return
  }

  if (value === '') {
    emit('update:modelValue', [])
    return
  }

  const nextValues = selectedValues.value.includes(value)
    ? selectedValues.value.filter((item) => item !== value)
    : [...selectedValues.value, value]

  emit('update:modelValue', nextValues)
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target || rootRef.value?.contains(target)) return
  close()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}

watch(search, (value) => {
  emit('search-change', value)
})

watch(isOpen, (openState) => {
  if (typeof document === 'undefined') return

  if (openState) {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleKeydown)
    return
  }

  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="rootRef" class="searchable-select" :class="{ 'is-open': isOpen }">
    <button
      :id="id || undefined"
      type="button"
      class="searchable-select__button"
      :aria-expanded="isOpen"
      :disabled="disabled"
      :aria-required="required ? 'true' : undefined"
      @click="toggle">
      <span>{{ selectedLabel }}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-if="isOpen" class="searchable-select__menu" role="listbox">
      <input
        ref="searchInputRef"
        v-model="search"
        class="searchable-select__search"
        type="search"
        :placeholder="searchPlaceholder" />

      <button
        v-if="allLabel"
        type="button"
        class="searchable-select__option"
        :class="{ selected: !selectedValues.length }"
        @click="selectValue('')">
        {{ allLabel }}
      </button>

      <button
        v-for="option in filteredOptions"
        :key="option.value"
        type="button"
        class="searchable-select__option"
        :class="{ selected: selectedValues.includes(option.value) }"
        role="option"
        :aria-selected="selectedValues.includes(option.value)"
        @click="selectValue(option.value)">
        {{ option.label }}
      </button>

      <p v-if="!filteredOptions.length" class="searchable-select__empty">{{ emptyLabel }}</p>
      <p v-else-if="shouldShowLimitHint" class="searchable-select__empty">
        Mostramos hasta {{ resultLimit }} resultados. Escribe para afinar la búsqueda.
      </p>
    </div>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
  width: 100%;
}

.searchable-select__button {
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(155, 107, 255, 0.22);
  background: #fff;
  padding: 0 0.85rem;
  color: var(--brand-ink);
  font: inherit;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(90, 48, 140, 0.05);
}

.searchable-select__button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.searchable-select__button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.searchable-select__button svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: #7a66a5;
  stroke-width: 1.9;
  transition: transform 0.18s ease;
}

.searchable-select.is-open .searchable-select__button svg {
  transform: rotate(180deg);
}

.searchable-select__menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  gap: 4px;
  max-height: 280px;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.22);
  background: #fff;
  padding: 8px;
  box-shadow: 0 18px 42px rgba(31, 20, 66, 0.16);
}

.searchable-select__search {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  padding: 0 0.75rem;
  color: var(--brand-ink);
  font: inherit;
  font-size: 0.88rem;
}

.searchable-select__option {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #2b2242;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: left;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.searchable-select__option:hover,
.searchable-select__option:focus-visible,
.searchable-select__option.selected {
  background: rgba(247, 241, 255, 0.9);
  color: #4f2d81;
}

.searchable-select__empty {
  margin: 0;
  padding: 0.55rem 0.65rem;
  color: #6a5a84;
  font-size: 0.86rem;
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(
    defineProps<{
        modelValue: boolean
        closeOnBackdrop?: boolean
        closeOnEsc?: boolean
        overlayClass?: string
        panelClass?: string
        ariaLabel?: string
    }>(),
    {
        closeOnBackdrop: true,
        closeOnEsc: true,
        overlayClass: '',
        panelClass: '',
        ariaLabel: 'Modal',
    },
)

const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void
    (event: 'close'): void
}>()

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const handleBackdrop = () => {
    if (!props.closeOnBackdrop) return
    close()
}

const handleKeydown = (event: KeyboardEvent) => {
    if (!props.closeOnEsc) return
    if (!props.modelValue) return
    if (event.key === 'Escape') {
        close()
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
    <teleport to="body">
        <div v-if="props.modelValue" class="base-modal-overlay" :class="props.overlayClass" @click="handleBackdrop">
            <div class="base-modal-panel" :class="props.panelClass" role="dialog" :aria-label="props.ariaLabel"
                @click.stop>
                <slot />
            </div>
        </div>
    </teleport>
</template>

<style scoped>
.base-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.base-modal-panel {
    max-width: 100%;
}
</style>

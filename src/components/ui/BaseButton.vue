<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { RouterLink } from 'vue-router'

type ButtonAs = 'button' | 'a' | 'RouterLink'
type ButtonVariant = 'primary' | 'ghost' | 'base'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
    defineProps<{
        as?: ButtonAs
        variant?: ButtonVariant
        type?: ButtonType
    }>(),
    {
        as: 'button',
        variant: 'base',
        type: 'button',
    },
)

const attrs = useAttrs()
const component = computed(() => (props.as === 'RouterLink' ? RouterLink : props.as))
</script>

<template>
    <component :is="component" :class="['btn', props.variant !== 'base' ? `btn-${props.variant}` : '']"
        :type="props.as === 'button' ? props.type : undefined" v-bind="attrs">
        <slot />
    </component>
</template>

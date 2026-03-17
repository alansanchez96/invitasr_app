<script setup lang="ts">
type ProviderKey = 'email' | 'google' | 'facebook'

const props = withDefaults(
    defineProps<{
        providers: ProviderKey[]
        variant?: 'stack' | 'inline'
    }>(),
    {
        variant: 'inline',
    },
)

const emit = defineEmits<{
    (event: 'select', provider: ProviderKey): void
}>()

const labels: Record<ProviderKey, string> = {
    email: 'Email',
    google: 'Google',
    facebook: 'Facebook',
}

const handleSelect = (provider: ProviderKey) => {
    emit('select', provider)
}
</script>

<template>
    <div class="auth-providers" :class="`auth-providers--${props.variant}`">
        <button v-for="provider in props.providers" :key="provider"
            class="auth-provider" :class="{ 'auth-provider--stack': props.variant === 'stack' }" type="button"
            @click="handleSelect(provider)">
            <span class="auth-provider-icon">
                <svg v-if="provider === 'email'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                </svg>
                <svg v-else-if="provider === 'google'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 12h-8" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" />
                </svg>
            </span>
            <span>{{ labels[provider] }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
type ProviderKey = 'email' | 'google' | 'facebook'

const props = withDefaults(
    defineProps<{
        providers: ProviderKey[]
        variant?: 'stack' | 'inline' | 'column'
    }>(),
    {
        variant: 'inline',
    },
)

const emit = defineEmits<{
    (event: 'select', provider: ProviderKey): void
}>()

const labels: Record<ProviderKey, string> = {
    email: 'Continuar con email',
    google: 'Continuar con Google',
    facebook: 'Continuar con Facebook',
}

const handleSelect = (provider: ProviderKey) => {
    emit('select', provider)
}
</script>

<template>
    <div class="auth-providers" :class="`auth-providers--${props.variant}`">
        <button v-for="provider in props.providers" :key="provider"
            class="auth-provider" :class="[`auth-provider--${provider}`, { 'auth-provider--stack': props.variant === 'stack' }]" type="button"
            @click="handleSelect(provider)">
            <span class="auth-provider-icon" aria-hidden="true">
                <svg v-if="provider === 'email'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                </svg>
                <svg v-else-if="provider === 'google'" viewBox="0 0 24 24" fill="none">
                    <path fill="#4285F4"
                        d="M21.6 12.23c0-.72-.06-1.25-.19-1.8H12v3.47h5.52c-.11.86-.71 2.16-2.05 3.03l-.02.12 2.98 2.15.21.02c1.93-1.66 2.96-4.1 2.96-6.99Z" />
                    <path fill="#34A853"
                        d="M12 21.33c2.76 0 5.07-.85 6.76-2.31l-3.22-2.29c-.86.56-2.02.95-3.54.95-2.7 0-4.99-1.66-5.81-3.96l-.12.01-3.1 2.23-.04.1c1.68 3.11 5.16 5.27 9.07 5.27Z" />
                    <path fill="#FBBC05"
                        d="M6.19 13.72A5.77 5.77 0 0 1 5.87 12c0-.6.11-1.18.3-1.72l-.01-.12-3.14-2.26-.1.04A8.74 8.74 0 0 0 2 12c0 1.46.38 2.83 1.04 4.05l3.15-2.33Z" />
                    <path fill="#EA4335"
                        d="M12 6.32c1.92 0 3.22.77 3.96 1.42l2.9-2.63C17.08 3.56 14.76 2.67 12 2.67c-3.91 0-7.39 2.16-9.07 5.27l3.14 2.34c.83-2.3 3.12-3.96 5.93-3.96Z" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#1877F2" />
                    <path fill="#fff"
                        d="M15.41 14.89 15.86 12h-2.77v-1.88c0-.79.39-1.56 1.63-1.56h1.26V6.1S14.84 5.9 13.74 5.9c-2.27 0-3.75 1.38-3.75 3.87V12H7.47v2.89h2.52v6.98a10.1 10.1 0 0 0 3.1 0v-6.98h2.32Z" />
                </svg>
            </span>
            <span>{{ labels[provider] }}</span>
        </button>
    </div>
</template>

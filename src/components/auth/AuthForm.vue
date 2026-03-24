<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'

type FieldErrors = Record<string, string[]>

const props = withDefaults(
    defineProps<{
        submitLabel?: string
        showLinks?: boolean
        forgotHref?: string
        signupHref?: string
        errorMessage?: string | null
        fieldErrors?: FieldErrors
        loading?: boolean
    }>(),
    {
        submitLabel: 'Entrar a mi cuenta',
        showLinks: true,
        forgotHref: '#',
        signupHref: '#',
        errorMessage: null,
        fieldErrors: () => ({}),
        loading: false,
    },
)

const emit = defineEmits<{
    (event: 'submit', payload: { email: string; password: string; remember: boolean }): void
}>()

const email = ref('')
const password = ref('')
const uid = Math.random().toString(36).slice(2, 8)
const emailErrorId = `auth-email-error-${uid}`
const passwordErrorId = `auth-password-error-${uid}`
const remember = ref(false)

const handleSubmit = () => {
    emit('submit', {
        email: email.value.trim(),
        password: password.value,
        remember: remember.value,
    })
}
</script>

<template>
    <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="auth-field">
            <span>Correo</span>
            <input
                v-model="email"
                type="email"
                placeholder="tu@email.com"
                autocomplete="email"
                :aria-invalid="Boolean(props.fieldErrors?.email?.length)"
                :aria-describedby="props.fieldErrors?.email?.length ? emailErrorId : undefined" />
            <span v-if="props.fieldErrors?.email?.length" :id="emailErrorId" class="auth-error" role="alert">
                {{ props.fieldErrors.email[0] }}
            </span>
        </label>
        <label class="auth-field">
            <span>Contrasena</span>
            <input
                v-model="password"
                type="password"
                placeholder="Tu clave segura"
                autocomplete="current-password"
                :aria-invalid="Boolean(props.fieldErrors?.password?.length)"
                :aria-describedby="props.fieldErrors?.password?.length ? passwordErrorId : undefined" />
            <span v-if="props.fieldErrors?.password?.length" :id="passwordErrorId" class="auth-error" role="alert">
                {{ props.fieldErrors.password[0] }}
            </span>
        </label>
        <label class="auth-check">
            <input v-model="remember" type="checkbox" />
            <span>Recordarme en este dispositivo</span>
        </label>
        <BaseButton class="auth-cta" :class="{ 'is-loading': props.loading }" variant="primary" type="submit"
            :disabled="props.loading" :aria-busy="props.loading">
            <span class="cta-text">{{ props.submitLabel }}</span>
            <span v-if="props.loading" class="spinner" aria-hidden="true"></span>
            <span v-else class="cta-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                </svg>
            </span>
        </BaseButton>
        <p v-if="props.errorMessage" class="auth-error auth-error--general" role="alert">{{ props.errorMessage }}</p>
        <div v-if="props.showLinks" class="auth-links">
            <a :href="props.forgotHref">Olvidaste tu password?</a>
            <a :href="props.signupHref">Todavia no tienes tu cuenta?</a>
        </div>
    </form>
</template>

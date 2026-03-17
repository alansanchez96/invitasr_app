<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        submitLabel?: string
        showLinks?: boolean
        forgotHref?: string
        signupHref?: string
    }>(),
    {
        submitLabel: 'Entrar a mi cuenta',
        showLinks: true,
        forgotHref: '#',
        signupHref: '#',
    },
)
</script>

<template>
    <div class="auth-form">
        <label class="auth-field">
            <span>Correo</span>
            <input type="email" placeholder="tu@email.com" autocomplete="email" />
        </label>
        <label class="auth-field">
            <span>Contrasena</span>
            <input type="password" placeholder="Tu clave segura" autocomplete="current-password" />
        </label>
        <label class="auth-check">
            <input type="checkbox" />
            <span>Recordarme en este dispositivo</span>
        </label>
        <button class="btn btn-primary auth-cta" type="button">
            <span class="cta-text">{{ props.submitLabel }}</span>
            <span class="cta-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                </svg>
            </span>
        </button>
        <div v-if="props.showLinks" class="auth-links">
            <a :href="props.forgotHref">Olvidaste tu password?</a>
            <a :href="props.signupHref">Todavia no tienes tu cuenta?</a>
        </div>
    </div>
</template>

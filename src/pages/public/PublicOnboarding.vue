<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  listCatalogTemplates,
  listCatalogTypeEvents,
  type CatalogTemplateItem,
  type CatalogTypeEventItem,
} from '@/services/catalogs'
import {
  completePublicOnboarding,
  getPublicOnboarding,
  type PublicOnboardingContext,
} from '@/services/onboardings'
import { checkoutPublicOnboarding } from '@/services/publicOnboarding'
import { useCatalogStore } from '@/stores/catalogs'
import { useSessionStore } from '@/stores/session'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

type FieldErrors = Record<string, string[]>

type OnboardingForm = {
  full_name: string
  email: string
  password: string
  country_code: string
  template_id: string
  type_event_id: string
}

const route = useRoute()
const session = useSessionStore()
const catalogStore = useCatalogStore()
const { countries } = storeToRefs(catalogStore)
const isLoading = ref(true)
const isSubmitting = ref(false)
const isCheckoutLoading = ref(false)
const loadError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const fieldErrors = ref<FieldErrors>({})
const context = ref<PublicOnboardingContext | null>(null)
const checkoutUrl = ref<string | null>(null)
const checkoutCountdown = ref(7)
const checkoutPlanId = ref<string | number | null>(null)

const form = reactive<OnboardingForm>({
  full_name: '',
  email: '',
  password: '',
  country_code: 'AR',
  template_id: '',
  type_event_id: '',
})

const onboardingCode = computed(() => String(route.params.code ?? '').trim())
const statusNormalized = computed(() => context.value?.status?.toString().toLowerCase() ?? '')
const isCompleted = computed(() => statusNormalized.value === 'completed')
const isCanceled = computed(() => ['canceled', 'cancelled'].includes(statusNormalized.value))
const canSubmit = computed(
  () => !isLoading.value && !isSubmitting.value && !loadError.value && !successMessage.value && !isCompleted.value && !isCanceled.value,
)
const shouldShowCheckoutCta = computed(() => Boolean(successMessage.value) && Boolean(checkoutPlanId.value))
const isTemplateExplorerOpen = ref(false)
const explorerStep = ref<'event' | 'template'>('event')
const selectedTemplateName = ref('')
const isTemplateCatalogLoading = ref(false)
let checkoutInterval: number | undefined

type MockEventType = {
  id: string
  label: string
  description: string
}

type MockTemplateCard = {
  id: string | null
  name: string
  description: string
  event_type_id: string
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

const formatPaymentMode = (value?: string) => {
  if (!value || value === 'paid') return 'Pago'
  if (value === 'gift') return 'Regalo'
  return value
}

const formatEventTypeLabel = (value?: string) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return 'Evento'
  if (normalized === 'xv') return '15 anos'
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const describeEventType = (value?: string) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'boda') return 'Coleccion romantica para ceremonia, fiesta y RSVP.'
  if (normalized === 'xv') return 'Estilo festivo con foco en impacto visual y confirmaciones.'
  if (normalized === 'cumpleanos') return 'Experiencias agiles para compartir sin friccion.'
  if (normalized === 'empresarial') return 'Comunicacion clara para eventos con tono mas profesional.'
  if (normalized === 'baby shower') return 'Narrativa suave y emocional para momentos memorables.'
  if (normalized === 'bautismo') return 'Estetica delicada para una invitacion sobria y cercana.'
  if (normalized === 'graduacion') return 'Celebracion con narrativa visual y tono mas vibrante.'
  if (normalized === 'aniversario') return 'Diseños pensados para celebrar recuerdos y continuidad.'
  return 'Plantillas activas disponibles para este tipo de evento.'
}

const parseErrorMessage = (error: unknown) => {
  const payload = error as { message?: string }
  return payload?.message?.trim() || 'No pudimos validar este acceso.'
}

const defaultEventTypes: MockEventType[] = [
  { id: 'wedding', label: 'Boda', description: 'Invitaciones elegantes para ceremonia y fiesta.' },
  { id: 'xv', label: '15 anos', description: 'Estilo juvenil con RSVP rapido para invitados.' },
  { id: 'corporate', label: 'Corporativo', description: 'Eventos formales con comunicacion clara.' },
]

const planEventTypeMap: Record<string, MockEventType[]> = {
  '1': [{ id: 'wedding', label: 'Boda', description: 'Perfecto para eventos clasicos.' }],
  '2': [
    { id: 'wedding', label: 'Boda', description: 'Plantillas romanticas con galeria destacada.' },
    { id: 'xv', label: '15 anos', description: 'Disenos festivos y confirmacion rapida.' },
  ],
  '3': [
    { id: 'wedding', label: 'Boda', description: 'Experiencias completas con mayor personalizacion.' },
    { id: 'xv', label: '15 anos', description: 'Plantillas modernas para celebraciones especiales.' },
    { id: 'corporate', label: 'Corporativo', description: 'Formato profesional para marcas y equipos.' },
  ],
  '4': [
    { id: 'wedding', label: 'Boda', description: 'Coleccion premium para bodas memorables.' },
    { id: 'xv', label: '15 anos', description: 'Disenos premium para fiestas inolvidables.' },
    { id: 'corporate', label: 'Corporativo', description: 'Produccion profesional para eventos de alto nivel.' },
  ],
}

const mockTemplatesByPlan: Record<string, Array<{ name: string; description: string }>> = {
  '2': [
    { name: 'Garden Romance', description: 'Tonos pastel y animacion suave para boda.' },
    { name: 'Noche de Gala', description: 'Look elegante para celebraciones nocturnas.' },
    { name: 'Fiesta Brillante', description: 'Template juvenil para quinceanos.' },
  ],
  '3': [
    { name: 'Elegance Pro', description: 'Maquetacion premium orientada a conversion RSVP.' },
    { name: 'Vibrant XV', description: 'Experiencia colorida con enfoque social.' },
    { name: 'Corporate Line', description: 'Diseño sobrio para eventos empresariales.' },
  ],
  '4': [
    { name: 'Planner Signature', description: 'Estilo premium con narrativa visual completa.' },
    { name: 'Royal XV', description: 'Diseño exclusivo para celebraciones destacadas.' },
    { name: 'Board Summit', description: 'Plantilla corporativa avanzada.' },
  ],
}

const catalogEventTypes = ref<CatalogTypeEventItem[]>([])
const catalogTemplates = ref<CatalogTemplateItem[]>([])

const loadTemplateCatalogs = async () => {
  const planId = context.value?.plan_id
  if (planId === undefined || planId === null || String(planId).trim() === '') {
    catalogEventTypes.value = []
    catalogTemplates.value = []
    return
  }

  isTemplateCatalogLoading.value = true
  try {
    const [typeEventsResponse, templatesResponse] = await Promise.all([
      listCatalogTypeEvents({ page: 1, perPage: 50 }),
      listCatalogTemplates({ plan_id: planId, page: 1, perPage: 50 }),
    ])

    catalogEventTypes.value = typeEventsResponse.list.filter(
      (eventType) => String(eventType.status ?? 'active').toLowerCase() === 'active',
    )
    catalogTemplates.value = templatesResponse.list.filter(
      (template) => String(template.status ?? 'active').toLowerCase() === 'active',
    )
  } catch {
    catalogEventTypes.value = []
    catalogTemplates.value = []
    notifyWarning(
      'No pudimos cargar los estilos disponibles en este momento. Usaremos la referencia disponible para continuar.',
    )
  } finally {
    isTemplateCatalogLoading.value = false
  }
}

const templateFlow = computed(() => {
  const planId = String(context.value?.plan_id ?? '')
  const catalogEventTypeMap = new Map(
    catalogEventTypes.value.map((eventType) => [String(eventType.id ?? ''), eventType]),
  )

  if (catalogTemplates.value.length) {
    const eventTypes = Array.from(
      new Map(
        catalogTemplates.value
          .filter((template) => template.type_event_id !== undefined && template.type_event_id !== null)
          .map((template) => {
            const eventTypeId = String(template.type_event_id)
            const eventType = catalogEventTypeMap.get(eventTypeId)
            const eventTypeName = template.type_event?.name ?? eventType?.name
            return [
              eventTypeId,
              {
                id: eventTypeId,
                label: formatEventTypeLabel(eventTypeName),
                description: describeEventType(eventTypeName),
              } satisfies MockEventType,
            ]
          }),
      ).values(),
    )

    const fallbackEventTypeId = eventTypes[0]?.id ?? 'wedding'
    const templates = catalogTemplates.value.map((template) => ({
      id: template.id === undefined || template.id === null ? null : String(template.id),
      name: template.name || 'Template disponible',
      description:
        template.type_event?.name
          ? `${formatEventTypeLabel(template.type_event.name)} disponible para este plan.`
          : 'Vista previa disponible para este plan.',
      event_type_id:
        template.type_event_id === undefined || template.type_event_id === null
          ? fallbackEventTypeId
          : String(template.type_event_id),
    }))

    return { eventTypes, templates }
  }

  const eventTypes = planEventTypeMap[planId] ?? defaultEventTypes
  const fallbackEventTypeId = eventTypes[0]?.id ?? 'wedding'
  const fallbackTemplates = mockTemplatesByPlan[planId] ?? mockTemplatesByPlan['2'] ?? []
  const templates: MockTemplateCard[] = fallbackTemplates.map((template, index) => ({
    id: null,
    name: template.name,
    description: `${template.description} (Mock)`,
    event_type_id: eventTypes[index % eventTypes.length]?.id ?? fallbackEventTypeId,
  }))

  return { eventTypes, templates }
})

const selectedEventTypeLabel = computed(() => {
  if (!form.type_event_id) return 'Aun no seleccionado'
  return templateFlow.value.eventTypes.find((eventType) => eventType.id === form.type_event_id)?.label ?? 'Personalizado'
})

const templatesForSelectedEvent = computed(() =>
  templateFlow.value.templates.filter((template) => template.event_type_id === form.type_event_id),
)

const pickDefaultTemplate = () => {
  if (form.template_id) return
  const templateId = context.value?.template_id
  if (templateId !== undefined && templateId !== null && String(templateId).trim()) {
    form.template_id = String(templateId)
    return
  }
  const firstCatalogTemplate = catalogTemplates.value[0]
  if (firstCatalogTemplate?.id !== undefined && firstCatalogTemplate.id !== null) {
    form.template_id = String(firstCatalogTemplate.id)
    return
  }
  const firstTemplate = context.value?.templates?.[0]
  if (firstTemplate?.id !== undefined && firstTemplate.id !== null) {
    form.template_id = String(firstTemplate.id)
  }
}

const hydrateTemplateSelection = () => {
  if (!form.template_id) return
  const currentTemplate = templateFlow.value.templates.find((template) => template.id === form.template_id)
  if (!currentTemplate) return
  selectedTemplateName.value = currentTemplate.name
  if (!form.type_event_id) {
    form.type_event_id = currentTemplate.event_type_id
  }
}

const openTemplateExplorer = () => {
  explorerStep.value = form.type_event_id ? 'template' : 'event'
  const firstEventType = templateFlow.value.eventTypes[0]
  if (!form.type_event_id && firstEventType) {
    form.type_event_id = firstEventType.id
  }
  isTemplateExplorerOpen.value = true
}

const closeTemplateExplorer = () => {
  isTemplateExplorerOpen.value = false
}

const selectEventType = (eventTypeId: string) => {
  form.type_event_id = eventTypeId
  selectedTemplateName.value = ''
  form.template_id = ''
  explorerStep.value = 'template'
}

const selectTemplate = (template: MockTemplateCard) => {
  selectedTemplateName.value = template.name
  form.template_id = template.id ?? ''
  form.type_event_id = template.event_type_id
  isTemplateExplorerOpen.value = false
}

const clearTemplateSelection = () => {
  selectedTemplateName.value = ''
  form.template_id = ''
  form.type_event_id = ''
}

const clearCheckoutCountdown = () => {
  if (checkoutInterval) {
    window.clearInterval(checkoutInterval)
    checkoutInterval = undefined
  }
}

const ensureAuthenticatedForCheckout = async () => {
  if (session.isAuthenticated) return true

  const refreshed = await session.refreshMe()
  if (refreshed.ok) return true

  const loginResult = await session.login(form.email.trim(), form.password, false)
  if (loginResult.ok) return true

  notifyWarning(
    loginResult.message ??
      'No pudimos iniciar sesion automaticamente para continuar con el pago.',
  )
  return false
}

const redirectToCheckout = () => {
  if (!checkoutUrl.value) return
  window.location.assign(checkoutUrl.value)
}

const startCheckoutCountdown = () => {
  clearCheckoutCountdown()
  checkoutCountdown.value = 7
  checkoutInterval = window.setInterval(() => {
    checkoutCountdown.value -= 1
    if (checkoutCountdown.value <= 0) {
      clearCheckoutCountdown()
      redirectToCheckout()
    }
  }, 1000)
}

const prepareCheckout = async () => {
  if (!checkoutPlanId.value) return
  isCheckoutLoading.value = true
  checkoutUrl.value = null
  clearCheckoutCountdown()
  try {
    const isAuthenticated = await ensureAuthenticatedForCheckout()
    if (!isAuthenticated) return

    const response = await checkoutPublicOnboarding()
    checkoutUrl.value = response.checkout_url ?? null
    if (!checkoutUrl.value) {
      notifyWarning('No recibimos la URL de pago. Puedes intentarlo nuevamente.')
      return
    }
    startCheckoutCountdown()
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos iniciar el pago.')
  } finally {
    isCheckoutLoading.value = false
  }
}

const handleGoToCheckout = () => {
  if (checkoutUrl.value) {
    redirectToCheckout()
    return
  }
  void prepareCheckout()
}

const getFieldError = (key: string) => fieldErrors.value[key]?.[0] ?? ''

const validateForm = () => {
  const nextErrors: FieldErrors = {}

  if (!form.full_name.trim()) nextErrors.full_name = ['El nombre completo es obligatorio.']
  if (!form.email.trim()) nextErrors.email = ['El correo es obligatorio.']
  if (!form.password) nextErrors.password = ['La contrasena es obligatoria.']
  if (!form.country_code.trim()) nextErrors.country_code = ['Selecciona tu pais de residencia.']

  fieldErrors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

const loadOnboarding = async () => {
  isLoading.value = true
  loadError.value = null
  fieldErrors.value = {}

  if (!onboardingCode.value) {
    loadError.value = 'Este acceso no es valido.'
    isLoading.value = false
    return
  }

  try {
    const payload = await getPublicOnboarding(onboardingCode.value)
    context.value = payload
    await loadTemplateCatalogs()
    pickDefaultTemplate()
    hydrateTemplateSelection()
  } catch (error) {
    loadError.value = parseErrorMessage(error)
    notifyError(loadError.value)
  } finally {
    isLoading.value = false
  }
}

const submitOnboarding = async () => {
  fieldErrors.value = {}
  if (!validateForm()) {
    notifyWarning('Revisa los datos ingresados.')
    return
  }

  if (!onboardingCode.value) return
  isSubmitting.value = true
  try {
    checkoutUrl.value = null
    checkoutPlanId.value = null
    clearCheckoutCountdown()
    const response = await completePublicOnboarding(onboardingCode.value, {
      register_method: 'email',
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      country_code: form.country_code.trim(),
      template_id: form.template_id.trim() ? form.template_id.trim() : null,
      type_event_id: form.type_event_id.trim() ? form.type_event_id.trim() : null,
    })

    const nextStepMessage =
      response.next_step === 'payment'
        ? 'Tu cuenta ya quedo creada. Solo falta completar el pago para activar tu plan.'
        : response.next_step === 'login'
          ? 'Tu acceso ya quedo activo. Ahora puedes iniciar sesion.'
          : ''

    successMessage.value = [response.message ?? 'Tu cuenta se completo correctamente.', nextStepMessage]
      .filter(Boolean)
      .join(' ')
    notifySuccess(successMessage.value)

    if (response.next_step === 'payment') {
      checkoutPlanId.value = response.onboarding?.plan_id ?? context.value?.plan_id ?? null
      void prepareCheckout()
    }
  } catch (error) {
    const payload = error as { message?: string; errors?: FieldErrors; statusCode?: number }
    if (payload?.errors && Object.keys(payload.errors).length > 0) {
      fieldErrors.value = payload.errors
      notifyWarning('Hay datos para corregir antes de continuar.')
      return
    }
    notifyError(payload?.message ?? 'No pudimos completar tu registro.')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void catalogStore.ensureCountries().catch(() => {
    notifyWarning('No pudimos cargar el catalogo de paises.')
  })
  void loadOnboarding()
})

onUnmounted(() => {
  clearCheckoutCountdown()
})
</script>

<template>
  <section class="section onboarding-section">
    <div class="container onboarding-container">
      <header class="onboarding-headline">
        <span class="headline-kicker">InvitaSR</span>
        <h1>Activa tu cuenta en menos de 2 minutos</h1>
        <p>Confirma tus datos y deja lista tu cuenta para continuar con la experiencia del plan.</p>
      </header>

      <article v-if="isLoading" class="onboarding-card onboarding-state" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <p>Cargando tu acceso...</p>
      </article>

      <article v-else-if="loadError" class="onboarding-card onboarding-state error-state" role="alert">
        <h1>Este acceso no esta disponible</h1>
        <p>{{ loadError }}</p>
        <RouterLink class="btn btn-ghost" to="/">Volver al inicio</RouterLink>
      </article>

      <div v-else class="onboarding-grid">
        <aside class="onboarding-card onboarding-summary">
          <h2>Resumen</h2>
          <div class="summary-row">
            <span>Codigo de acceso</span>
            <strong>{{ context?.token_short_code ?? onboardingCode }}</strong>
          </div>
          <div class="summary-row">
            <span>Cliente</span>
            <strong>{{ context?.client_name ?? '-' }}</strong>
          </div>
          <div class="summary-row">
            <span>Plan</span>
            <strong>{{ context?.plan_name ?? '-' }}</strong>
          </div>
          <div class="summary-row">
            <span>Modo de pago</span>
            <strong>{{ formatPaymentMode(context?.payment_mode) }}</strong>
          </div>
          <div class="summary-row">
            <span>Vencimiento</span>
            <strong>{{ formatDateTime(context?.expires_at ?? context?.token_expire) }}</strong>
          </div>
        </aside>

        <article class="onboarding-card onboarding-form-card">
          <h1>Completa tu registro</h1>
          <p class="onboarding-lead">Completa tus datos para dejar lista tu cuenta y seguir con tu plan.</p>

          <div v-if="successMessage" class="state-banner success">
            <strong>Cuenta creada</strong>
            <p>{{ successMessage }}</p>
            <div v-if="shouldShowCheckoutCta" class="checkout-action">
              <button
                type="button"
                class="btn btn-primary"
                :disabled="isCheckoutLoading"
                @click="handleGoToCheckout">
                {{ isCheckoutLoading ? 'Preparando pago...' : 'Ir a pagar ahora' }}
              </button>
              <small v-if="checkoutUrl">
                Seras redirigido automaticamente en {{ checkoutCountdown }} segundos.
              </small>
              <small v-else-if="!isCheckoutLoading">
                No pudimos abrir el pago automaticamente. Pulsa el boton para volver a intentarlo.
              </small>
            </div>
          </div>
          <div v-else-if="isCompleted" class="state-banner neutral">
            <strong>Proceso finalizado</strong>
            <p>Este acceso ya fue usado anteriormente.</p>
          </div>
          <div v-else-if="isCanceled" class="state-banner warning">
            <strong>Acceso cancelado</strong>
            <p>Pide un nuevo acceso para continuar.</p>
          </div>

          <form v-if="canSubmit" class="onboarding-form" @submit.prevent="submitOnboarding">
            <label class="field">
              <span>Nombre completo</span>
              <input
                v-model="form.full_name"
                type="text"
                autocomplete="name"
                :aria-invalid="Boolean(getFieldError('full_name'))"
              />
              <small v-if="getFieldError('full_name')" class="field-error">{{ getFieldError('full_name') }}</small>
            </label>

            <label class="field">
              <span>Correo</span>
              <input
                v-model="form.email"
                type="email"
                autocomplete="email"
                :aria-invalid="Boolean(getFieldError('email'))"
              />
              <small v-if="getFieldError('email')" class="field-error">{{ getFieldError('email') }}</small>
            </label>

            <label class="field">
              <span>Contrasena</span>
              <input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :aria-invalid="Boolean(getFieldError('password'))"
              />
              <small v-if="getFieldError('password')" class="field-error">{{ getFieldError('password') }}</small>
            </label>

            <label class="field">
              <span>Pais de residencia</span>
              <select
                v-model="form.country_code"
                :aria-invalid="Boolean(getFieldError('country_code'))">
                <option value="">Selecciona un pais</option>
                <option
                  v-for="country in countries"
                  :key="country.iso ?? country.id"
                  :value="country.iso">
                  {{ country.nicename ?? country.name }}
                </option>
              </select>
              <small v-if="getFieldError('country_code')" class="field-error">{{ getFieldError('country_code') }}</small>
            </label>

            <div class="template-picker field-full">
              <div class="template-picker-head">
                <strong>Plantilla del plan (opcional)</strong>
                <button
                  type="button"
                  class="btn btn-ghost template-picker-btn"
                  :disabled="isTemplateCatalogLoading"
                  @click="openTemplateExplorer">
                  {{ isTemplateCatalogLoading ? 'Cargando catalogo...' : 'Explorar plantillas' }}
                </button>
              </div>
              <p>
                Primero eliges tipo de evento y luego una plantilla disponible para este plan.
              </p>
              <div class="template-picker-selection">
                <span class="selection-chip">
                  Tipo: {{ selectedEventTypeLabel }}
                </span>
                <span class="selection-chip">
                  Plantilla: {{ selectedTemplateName || 'Aun no seleccionada' }}
                </span>
                <button
                  v-if="selectedTemplateName || form.type_event_id"
                  type="button"
                  class="selection-clear"
                  @click="clearTemplateSelection">
                  Limpiar seleccion
                </button>
              </div>
            </div>

            <button class="btn btn-primary submit-btn" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
              <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
              <span>{{ isSubmitting ? 'Creando cuenta...' : 'Completar registro' }}</span>
            </button>
          </form>

          <div class="onboarding-actions">
            <RouterLink class="btn btn-ghost" to="/">Volver al inicio</RouterLink>
          </div>
        </article>
      </div>
    </div>
  </section>

  <BaseModal
    :model-value="isTemplateExplorerOpen"
    overlay-class="template-overlay"
    panel-class="template-panel"
    aria-label="Explorar plantillas del plan"
    @update:model-value="isTemplateExplorerOpen = $event">
    <div class="template-modal">
      <header class="template-modal-head">
        <div>
          <span>Explorar plantillas</span>
          <h3>Selecciona tipo de evento y plantilla</h3>
        </div>
        <button type="button" class="template-close" aria-label="Cerrar" @click="closeTemplateExplorer">&times;</button>
      </header>

      <div class="template-steps">
        <button
          type="button"
          :class="{ active: explorerStep === 'event' }"
          @click="explorerStep = 'event'">
          1. Tipo de evento
        </button>
        <button
          type="button"
          :class="{ active: explorerStep === 'template' }"
          :disabled="!form.type_event_id"
          @click="explorerStep = 'template'">
          2. Plantilla
        </button>
      </div>

      <section v-if="explorerStep === 'event'" class="template-cards">
        <button
          v-for="eventType in templateFlow.eventTypes"
          :key="eventType.id"
          type="button"
          class="template-card"
          :class="{ active: form.type_event_id === eventType.id }"
          @click="selectEventType(eventType.id)">
          <strong>{{ eventType.label }}</strong>
          <p>{{ eventType.description }}</p>
        </button>
      </section>

      <section v-else class="template-cards">
        <button
          v-for="template in templatesForSelectedEvent"
          :key="`${template.event_type_id}-${template.name}`"
          type="button"
          class="template-card"
          :class="{ active: selectedTemplateName === template.name }"
          @click="selectTemplate(template)">
          <strong>{{ template.name }}</strong>
          <p>{{ template.description }}</p>
        </button>
        <div v-if="!templatesForSelectedEvent.length" class="template-empty">
          No encontramos plantillas activas para este tipo de evento.
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.onboarding-section {
  padding-top: 30px;
}

.onboarding-container {
  width: min(1120px, 94vw);
  display: grid;
  gap: 14px;
}

.onboarding-headline {
  border: 1px solid #ebe2fb;
  border-radius: 18px;
  padding: 20px;
  background: linear-gradient(140deg, #fff, #f8f3ff);
}

.headline-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #7a4fd9;
}

.onboarding-headline h1 {
  margin: 6px 0 8px;
  font-size: clamp(24px, 3vw, 34px);
}

.onboarding-headline p {
  margin: 0;
  color: #6b5b82;
}

.onboarding-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.onboarding-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}

.onboarding-summary,
.onboarding-form-card {
  padding: 20px;
}

.onboarding-summary h2 {
  margin: 0 0 14px;
}

.summary-row {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid #f0ecfa;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row span {
  font-size: 12px;
  font-weight: 700;
  color: #6b6b80;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-row strong {
  color: #1f2937;
  font-size: 14px;
}

.onboarding-form-card h1 {
  margin: 0;
}

.onboarding-lead {
  margin: 8px 0 18px;
  color: #6b6b80;
}

.onboarding-form {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  color: #4b5563;
  font-weight: 600;
}

.field input,
.field select {
  border-radius: 12px;
  border: 1px solid #e2ddf7;
  padding: 11px 12px;
  background: #fbfaff;
}

.field input[aria-invalid='true'],
.field select[aria-invalid='true'] {
  border-color: rgba(239, 68, 68, 0.45);
  background: #fff5f5;
}

.field-full {
  grid-column: 1 / -1;
}

.template-picker {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e8def8;
  border-radius: 14px;
  background: #fcfaff;
}

.template-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.template-picker-head strong {
  color: #3f2d63;
}

.template-picker-btn {
  padding: 7px 12px;
}

.template-picker p {
  margin: 0;
  color: #6d6282;
  font-size: 13px;
}

.template-picker-selection {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.selection-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid #e1d5f7;
  color: #5b4d7a;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
}

.selection-clear {
  border: none;
  background: transparent;
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.field-error {
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
}

.submit-btn {
  grid-column: 1 / -1;
  gap: 8px;
}

.submit-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.state-banner {
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 12px;
  margin-bottom: 14px;
}

.state-banner strong {
  display: block;
  margin-bottom: 4px;
}

.state-banner p {
  margin: 0;
  color: #4b5563;
}

.state-banner.success {
  background: #f0fdf6;
  border-color: rgba(16, 185, 129, 0.25);
}

.checkout-action {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.checkout-action small {
  color: #496354;
  font-weight: 600;
}

.state-banner.warning {
  background: #fff8ed;
  border-color: rgba(245, 158, 11, 0.3);
}

.state-banner.neutral {
  background: #f6f4ff;
  border-color: rgba(122, 79, 217, 0.24);
}

.onboarding-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-start;
}

.onboarding-state {
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 20px;
}

.error-state h1 {
  margin: 0;
}

:global(.template-overlay) {
  position: fixed;
  inset: 0;
  z-index: 180;
  display: grid;
  place-items: center;
  background: rgba(247, 241, 255, 0.72);
  backdrop-filter: blur(8px);
  padding: 20px;
}

:global(.template-panel) {
  width: min(840px, 96vw);
  max-height: min(88vh, 720px);
  overflow: auto;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #e9e0fb;
  box-shadow: var(--shadow-card);
  padding: 16px;
}

.template-modal {
  display: grid;
  gap: 14px;
}

.template-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.template-modal-head span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a4fd9;
  font-weight: 700;
}

.template-modal-head h3 {
  margin: 4px 0 0;
}

.template-close {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #e1d8f6;
  background: #fff;
  color: #6b3fc6;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.template-steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-steps button {
  border: 1px solid #e3dbf7;
  border-radius: 999px;
  background: #fbfaff;
  color: #5f5276;
  font-weight: 700;
  font-size: 12px;
  padding: 7px 12px;
  cursor: pointer;
}

.template-steps button.active {
  border-color: rgba(122, 79, 217, 0.38);
  background: #f2eaff;
  color: #5b2ec0;
}

.template-steps button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.template-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.template-card {
  border: 1px solid #e7defa;
  border-radius: 14px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 6px;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.template-card:hover {
  border-color: rgba(122, 79, 217, 0.42);
  transform: translateY(-1px);
  background: #fbf8ff;
}

.template-card.active {
  border-color: rgba(122, 79, 217, 0.5);
  background: #f4ecff;
}

.template-card strong {
  color: #352457;
}

.template-card p {
  margin: 0;
  color: #6f6585;
  font-size: 13px;
}

.template-empty {
  border: 1px dashed #d8c9f4;
  border-radius: 12px;
  color: #6d6282;
  padding: 14px;
  background: #fcf9ff;
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .onboarding-grid {
    grid-template-columns: 1fr;
  }

  .template-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .onboarding-section {
    padding-top: 20px;
  }

  .onboarding-headline,
  .onboarding-summary,
  .onboarding-form-card {
    padding: 16px;
  }

  .onboarding-form {
    grid-template-columns: 1fr;
  }

  .field-full,
  .submit-btn {
    grid-column: auto;
  }
}
</style>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { CatalogPlanListItem } from '@/services/catalogs'
import { useSessionStore } from '@/stores/session'
import { notifyWarning } from '@/utils/toast'
import heroBoda from '@/assets/img/hero/boda.webp'
import heroEgresados from '@/assets/img/hero/egresados.webp'
import heroBabyShower from '@/assets/img/hero/babyshower.webp'
import heroBautismo from '@/assets/img/hero/bautismo.webp'
import heroCumpleanos from '@/assets/img/hero/cumpleanos.webp'
import heroEmpresarial from '@/assets/img/hero/empresarial.webp'
import heroXv from '@/assets/img/hero/xv.webp'

type HeroSlide = {
  image: string
  alt: string
  tag: string
  title: string
  description: string
  cta: string
}

type SocialStat = {
  value: string
  label: string
}

type SocialReview = {
  quote: string
  author: string
}

const slides: HeroSlide[] = [
  {
    image: heroBoda,
    alt: 'Invitacion digital de boda elegante',
    tag: 'Bodas',
    title: 'Haz que tu boda empiece con una invitacion que enamora.',
    description: 'Personaliza nombres, fecha y estilo en minutos para compartir una experiencia inolvidable.',
    cta: 'Crear invitacion ahora',
  },
  {
    image: heroXv,
    alt: 'Invitacion digital de quince anos',
    tag: 'XV Años',
    title: 'Convierte tus XV en una invitacion que todos quieran abrir y compartir.',
    description: 'Diseña con estilo premium y transmite la emocion del gran dia desde el primer mensaje.',
    cta: 'Quiero iniciar YA',
  },
  {
    image: heroCumpleanos,
    alt: 'Invitacion digital de cumpleaños',
    tag: 'Cumpleanos',
    title: 'Pasa de idea a invitacion lista en pocos minutos, sin complicarte.',
    description: 'InvitaSR te guia paso a paso para crear, personalizar y publicar con total confianza.',
    cta: 'Empezar sin vueltas',
  },
  {
    image: heroBabyShower,
    alt: 'Invitacion digital de baby shower',
    tag: 'Baby Shower',
    title: 'Mas emocion y cero estres: crea una invitacion dulce, clara y memorable.',
    description: 'Ajusta los detalles importantes en segundos y compartela con una imagen profesional.',
    cta: 'Activar mi cuenta',
  },
  {
    image: heroBautismo,
    alt: 'Invitacion digital de bautismo',
    tag: 'Bautismo',
    title: 'Un momento especial merece una invitacion elegante y memorable.',
    description: 'Elige una plantilla de alto impacto y adaptala a tu estilo en minutos.',
    cta: 'Comenzar ahora',
  },
  {
    image: heroEgresados,
    alt: 'Invitacion digital de egresados',
    tag: 'Egresados',
    title: 'Celebra ese logro con una invitacion tan grande como tu historia.',
    description: 'Crea una experiencia visual potente y comparte al instante para llenar tu evento.',
    cta: 'Explorar opciones',
  },
  {
    image: heroEmpresarial,
    alt: 'Invitacion digital para evento empresarial',
    tag: 'Corporativo',
    title: 'Proyecta confianza desde la primera invitacion de tu evento.',
    description: 'Comunicacion clara, diseno profesional y una experiencia moderna para tus asistentes.',
    cta: 'Potenciar mi evento',
  },
]

const fallbackHeroSlide: HeroSlide = {
  image: heroBoda,
  alt: 'Invitacion digital de boda elegante',
  tag: 'Bodas',
  title: 'Haz que tu boda empiece con una invitacion que enamora.',
  description: 'Personaliza nombres, fecha y estilo en minutos para compartir una experiencia inolvidable.',
  cta: 'Crear invitacion ahora',
}

const socialStats: SocialStat[] = [
  { value: '+1,200', label: 'Eventos activos este mes' },
  { value: '97%', label: 'Clientes satisfechos con su primera invitacion' },
  { value: '3 min', label: 'Tiempo promedio para publicar la primera version' },
]

const socialReviews: SocialReview[] = [
  { quote: '“La hicimos en minutos y todos nos escribieron para decir que estaba hermosa.”', author: '- Camila & Bruno, Boda' },
  { quote: '“No sabia nada de diseno. Igual pude personalizar todo y quedo super lindo 😍”', author: '- Ana, Cumpleanos' },
  { quote: '“Para eventos corporativos nos ahorro tiempo y mejoro la imagen de marca.”', author: '- Equipo Nexus, Corporativo' },
]

const socialTags: string[] = ['Bodas', 'XV Años', 'Baby Shower', 'Bautismo', 'Cumpleanos', 'Corporativo']

const inspirationCards: { title: string; description: string; tag: string; mark: string }[] = [
  {
    title: 'Boda elegante en la nieve',
    description: 'Una entrada emocional, música suave, galería y confirmación clara para que nadie se pierda ningún detalle.',
    tag: 'Romántica',
    mark: '1',
  },
  {
    title: 'XV con efecto wow',
    description: 'Una invitación visual, divertida y fácil de compartir para que tus invitados sientan la fiesta antes de llegar.',
    tag: 'Celebración',
    mark: '2',
  },
  {
    title: 'Evento empresarial impecable',
    description: 'Diseño sobrio, ubicación visible y respuestas ordenadas para transmitir confianza desde el primer clic.',
    tag: 'Profesional',
    mark: '3',
  },
]

const inspirationSteps: { value: string; label: string }[] = [
  { value: '1', label: 'Elige un estilo que combine con tu evento' },
  { value: '2', label: 'Personaliza textos, fotos, música y ubicación' },
  { value: '3', label: 'Publica y comparte una experiencia lista para impresionar' },
]

const faqItems: { question: string; answer: string; open?: boolean }[] = [
  {
    question: 'Realmente puedo crearla sin saber de diseño?',
    answer: 'Si. El flujo esta pensado para personas sin experiencia tecnica ni creativa.',
    open: true,
  },
  {
    question: 'Cuanto se tarda en tener una primera version lista?',
    answer: 'En promedio, entre 2 y 3 minutos puedes tener una version para compartir.',
  },
  {
    question: 'Puedo mejorarla despues de publicarla?',
    answer: 'Si. Puedes editar y actualizar detalles cuando quieras desde tu panel.',
  },
]

const activeIndex = ref(0)
const demoTeaserHost = ref<HTMLElement | null>(null)
const plansHost = ref<HTMLElement | null>(null)
const showDemoTeaser = ref(false)
const showPlanCatalog = ref(false)
const selectedPlan = ref<CatalogPlanListItem | null>(null)
const isAcquisitionModalOpen = ref(false)
let autoplayTimer: ReturnType<typeof setInterval> | null = null
let lazySectionObserver: IntersectionObserver | null = null
const preloadedHeroImages = new Set<string>()
const DemoHomeTeaser = defineAsyncComponent(() => import('@/components/public/DemoHomeTeaser.vue'))
const PublicPlanCatalogGrid = defineAsyncComponent(() => import('@/components/public/PublicPlanCatalogGrid.vue'))
const PlanAcquisitionModal = defineAsyncComponent(() => import('@/components/public/PlanAcquisitionModal.vue'))

const preloadHeroImage = (index: number) => {
  const image = slides[index]?.image
  if (!image || preloadedHeroImages.has(image)) return

  const preload = new Image()
  preload.decoding = 'async'
  preload.src = image
  preloadedHeroImages.add(image)
}

const scheduleNextHeroPreload = () => {
  window.setTimeout(() => {
    preloadHeroImage((activeIndex.value + 1) % slides.length)
  }, 1800)
}
const router = useRouter()
const session = useSessionStore()

const activeSlide = computed<HeroSlide>(() => slides[activeIndex.value] ?? slides[0] ?? fallbackHeroSlide)

const goToSlide = (index: number) => {
  activeIndex.value = index
}

const nextSlide = () => {
  activeIndex.value = (activeIndex.value + 1) % slides.length
}

const prevSlide = () => {
  activeIndex.value = (activeIndex.value - 1 + slides.length) % slides.length
}

const handleSelectHomePlan = (plan: CatalogPlanListItem) => {
  if (session.isMaster) {
    notifyWarning('Esta compra se realiza desde una cuenta cliente.')
    return
  }

  if (!session.isAuthenticated) {
    selectedPlan.value = plan
    isAcquisitionModalOpen.value = true
    return
  }

  router.push({
    name: 'public-onboarding-flow',
    query: {
      planId: plan.id === undefined || plan.id === null ? undefined : String(plan.id),
      planName: plan.name ?? undefined,
    },
  })
}

const handleRegisteredHomePlan = () => {
  const plan = selectedPlan.value
  isAcquisitionModalOpen.value = false
  if (!plan) return

  router.push({
    name: 'public-onboarding-flow',
    query: {
      planId: plan.id === undefined || plan.id === null ? undefined : String(plan.id),
      planName: plan.name ?? undefined,
    },
  })
}

const stopAutoplay = () => {
  if (!autoplayTimer) return
  clearInterval(autoplayTimer)
  autoplayTimer = null
}

const startAutoplay = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (autoplayTimer || slides.length <= 1) return
  autoplayTimer = setInterval(nextSlide, 7000)
}

const activateLazySection = (entry: IntersectionObserverEntry) => {
  if (entry.target === demoTeaserHost.value) showDemoTeaser.value = true
  if (entry.target === plansHost.value) showPlanCatalog.value = true
  lazySectionObserver?.unobserve(entry.target)
}

const setupLazySections = () => {
  if (!('IntersectionObserver' in window)) {
    showDemoTeaser.value = true
    showPlanCatalog.value = true
    return
  }

  lazySectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) activateLazySection(entry)
    })
  }, { rootMargin: '0px 0px 160px' })

  if (demoTeaserHost.value) lazySectionObserver.observe(demoTeaserHost.value)
  if (plansHost.value) lazySectionObserver.observe(plansHost.value)
}

onMounted(() => {
  startAutoplay()
  scheduleNextHeroPreload()
  setupLazySections()
})

onUnmounted(() => {
  stopAutoplay()
  lazySectionObserver?.disconnect()
  lazySectionObserver = null
})

watch(activeIndex, () => {
  scheduleNextHeroPreload()
})
</script>

<template>
  <section class="hero-only" aria-label="Hero principal">
    <div class="hero-carousel" @mouseenter="stopAutoplay" @mouseleave="startAutoplay">
      <div class="hero-media" aria-hidden="true">
        <figure :key="activeSlide.image" class="hero-slide is-active">
          <img
            :src="activeSlide.image"
            :alt="activeSlide.alt"
            width="1920"
            height="1072"
            loading="eager"
            :fetchpriority="activeIndex === 0 ? 'high' : 'auto'"
            decoding="async" />
        </figure>
        <div class="hero-overlay"></div>
      </div>

      <div class="container hero-content-shell">
        <div class="hero-content">
          <p class="hero-tag">{{ activeSlide.tag }}</p>
          <h1>{{ activeSlide.title }}</h1>
          <p class="hero-description">{{ activeSlide.description }}</p>

          <div class="hero-actions">
            <BaseButton as="RouterLink" to="/demo" variant="primary">{{ activeSlide.cta }}</BaseButton>
            <BaseButton as="RouterLink" to="/demo" variant="ghost">Explorar demos</BaseButton>
          </div>

          <div class="hero-micro-proof" aria-label="Confianza de producto">
            <span>Activacion promedio: 3 minutos</span>
            <span>Experiencia guiada de principio a fin</span>
          </div>

          <ul class="hero-proof" aria-label="Beneficios de producto">
            <li>Tu invitacion lista en 2 o 3 clicks</li>
            <li>Editable por ti, sin conocimientos tecnicos</li>
            <li>Disenos pensados para emocionar y convertir</li>
          </ul>
        </div>
      </div>

      <div class="hero-controls" aria-label="Controles del carrusel">
        <button type="button" class="hero-nav" @click="prevSlide" aria-label="Slide anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>

        <div class="hero-dots" aria-label="Seleccion de slide">
          <button v-for="(slide, index) in slides" :key="slide.tag" type="button" class="hero-dot"
            :class="{ 'is-active': index === activeIndex }" :aria-label="`Ir a slide ${index + 1}`"
            :aria-current="index === activeIndex ? 'true' : undefined" @click="goToSlide(index)">
          </button>
        </div>

        <button type="button" class="hero-nav" @click="nextSlide" aria-label="Siguiente slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </section>

  <section class="social-proof" aria-labelledby="social-proof-title">
    <div class="container social-proof-shell">
      <div class="social-proof-head">
        <p class="social-proof-kicker">Nuestra reputación</p>
        <h2 id="social-proof-title">La forma mas facil de crear invitaciones que tus invitados si quieren abrir</h2>
      </div>

      <div class="social-proof-stats">
        <article v-for="item in socialStats" :key="item.label" class="social-stat-card">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </article>
      </div>

      <div class="social-proof-reviews">
        <article v-for="item in socialReviews" :key="item.author" class="social-review-card">
          <p>{{ item.quote }}</p>
          <span>{{ item.author }}</span>
        </article>
      </div>

      <div class="social-proof-tags" aria-label="Tipos de eventos populares">
        <span v-for="tag in socialTags" :key="tag">{{ tag }}</span>
      </div>
    </div>
  </section>

  <div ref="demoTeaserHost" class="lazy-section-slot lazy-section-slot--demo">
    <DemoHomeTeaser v-if="showDemoTeaser" />
  </div>

  <section id="inspiracion" class="inspiration-section" aria-labelledby="inspiration-title">
    <div class="container inspiration-shell">
      <div class="inspiration-head">
        <div>
          <p class="inspiration-kicker">Inspiración</p>
          <h2 id="inspiration-title">Ideas listas para convertir una invitación en una experiencia que se recuerda.</h2>
        </div>
        <p>
          No necesitas saber de diseño. Empiezas con una plantilla pensada para emocionar, guiar al invitado
          y ayudarte a recibir más respuestas sin perseguir a nadie.
        </p>
      </div>

      <div class="inspiration-grid">
        <article v-for="item in inspirationCards" :key="item.title" class="inspiration-card">
          <div class="inspiration-card-top">
            <span>{{ item.tag }}</span>
            <strong aria-hidden="true">{{ item.mark }}</strong>
          </div>
          <div class="inspiration-card-body">
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
          <RouterLink to="/demo">Probar este estilo</RouterLink>
        </article>
      </div>

      <div class="inspiration-conversion">
        <div class="conversion-copy">
          <span>De idea a invitación publicada</span>
          <h3>Tu evento puede sentirse premium antes de que empiece.</h3>
          <p>
            Cada sección está pensada para reducir dudas: fecha, lugar, preguntas frecuentes,
            confirmación de asistencia y detalles importantes en una sola experiencia.
          </p>
          <div class="conversion-actions">
            <BaseButton as="RouterLink" to="/demo" variant="primary">Crear una demo gratis</BaseButton>
            <BaseButton as="RouterLink" to="/demo" variant="ghost">Ver plantillas</BaseButton>
          </div>
        </div>
        <ol class="inspiration-steps">
          <li v-for="step in inspirationSteps" :key="step.value">
            <strong>{{ step.value }}</strong>
            <span>{{ step.label }}</span>
          </li>
        </ol>
      </div>
    </div>
  </section>

  <section id="planes" class="plans-section" aria-labelledby="plans-title">
    <div class="container plans-shell">
      <div class="plans-head">
        <div>
          <p class="plans-kicker">Planes</p>
          <h2 id="plans-title">Elige el ritmo ideal para crear tu invitación</h2>
        </div>
        <p>
          Compara opciones simples, visuales y listas para activar. Puedes empezar con algo puntual,
          sumar más posibilidades o explorar una experiencia mensual más completa.
        </p>
      </div>

      <div ref="plansHost" class="lazy-section-slot lazy-section-slot--plans">
        <PublicPlanCatalogGrid
          v-if="showPlanCatalog"
          primary-action-label="Obtener plan"
          @select-plan="handleSelectHomePlan" />
      </div>
    </div>
  </section>

  <section id="faq" class="faq-section" aria-labelledby="faq-title">
    <div class="container faq-shell">
      <div class="faq-head">
        <p class="faq-kicker">Garantia y confianza</p>
        <h2 id="faq-title">Resolvemos tus dudas antes de empezar</h2>
      </div>
      <div class="faq-list">
        <details v-for="item in faqItems" :key="item.question" class="faq-item" :open="item.open">
          <summary>{{ item.question }}</summary>
          <p>{{ item.answer }}</p>
        </details>
      </div>
    </div>
  </section>

  <section class="closing-cta" aria-labelledby="closing-title">
    <div class="container closing-cta-shell">
      <div>
        <p class="closing-kicker">Ultimo paso</p>
        <h2 id="closing-title">Empieza hoy y crea una invitacion que tus invitados no olviden</h2>
        <p>Hazlo en minutos con una experiencia clara, visual y lista para vender emocion.</p>
      </div>
      <div class="closing-actions">
        <BaseButton as="RouterLink" to="/demo" variant="primary">Crear una demo gratis</BaseButton>
        <BaseButton as="RouterLink" to="/demo" variant="ghost">Explorar plantillas</BaseButton>
      </div>
    </div>
  </section>

  <PlanAcquisitionModal
    v-model="isAcquisitionModalOpen"
    :plan="selectedPlan"
    @registered="handleRegisteredHomePlan" />
</template>

<style scoped>
.hero-only {
  min-height: 100svh;
}

.hero-carousel {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: clamp(680px, 100svh, 940px);
  background: #190f2a;
}

.hero-media {
  position: absolute;
  inset: 0;
}

.hero-slide {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.hero-slide.is-active {
  opacity: 1;
}

.hero-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(112deg, rgba(18, 9, 31, 0.88) 12%, rgba(18, 9, 31, 0.54) 50%, rgba(18, 9, 31, 0.34) 100%),
    radial-gradient(circle at 78% 20%, rgba(240, 106, 166, 0.23), transparent 34%);
}

.hero-content-shell {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: flex-start;
}

.hero-content {
  width: min(700px, 100%);
  color: #fff;
  padding:
    calc(var(--public-header-height, 80px) + clamp(18px, 2.4vw, 36px)) 0 clamp(128px, 17vh, 164px);
}

.hero-tag {
  margin: 0;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.hero-content h1 {
  margin: 16px 0 12px;
  font-size: clamp(30px, 4.1vw, 52px);
  line-height: 1.06;
  max-width: 16ch;
  text-wrap: balance;
}

.hero-description {
  margin: 0;
  font-size: clamp(16px, 2vw, 20px);
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.35;
  max-width: 52ch;
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-proof {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 560px;
}

.hero-micro-proof {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-micro-proof span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(12, 8, 22, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.hero-proof li {
  width: auto;
  max-width: 100%;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(14, 9, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.hero-controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.hero-nav {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(18, 11, 29, 0.55);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.hero-nav:hover {
  background: rgba(18, 11, 29, 0.86);
}

.hero-nav:active {
  transform: translateY(1px);
}

.hero-nav svg {
  width: 18px;
  height: 18px;
}

.hero-dots {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 999px;
  background: rgba(16, 9, 27, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.hero-dot {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  background: transparent;
  transition: transform 0.2s ease, background 0.2s ease;
}

.hero-dot::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  transform: translate(-50%, -50%);
  transition: transform 0.2s ease, background 0.2s ease;
}

.hero-dot:hover::after {
  background: rgba(255, 255, 255, 0.72);
}

.hero-dot.is-active::after {
  transform: translate(-50%, -50%) scale(1.24);
  background: #fff;
}

.social-proof {
  padding: 72px 0 78px;
  background:
    radial-gradient(circle at 12% 10%, rgba(155, 107, 255, 0.14), transparent 36%),
    linear-gradient(180deg, #fff 0%, #faf6ff 100%);
}

.social-proof-shell {
  display: grid;
  gap: 22px;
}

.social-proof-head {
  display: grid;
  gap: 6px;
  max-width: 760px;
}

.social-proof-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6e48c4;
}

.social-proof-head h2 {
  margin: 0;
  font-size: clamp(28px, 3.7vw, 42px);
  line-height: 1.1;
  color: #2b1a44;
}

.social-proof-stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.social-stat-card {
  background: #fff;
  border: 1px solid rgba(233, 220, 255, 0.88);
  border-radius: 16px;
  padding: 16px 18px;
  display: grid;
  gap: 4px;
  box-shadow: 0 10px 24px rgba(90, 48, 140, 0.1);
}

.social-stat-card strong {
  font-size: 28px;
  line-height: 1;
  color: #412566;
  font-family: var(--font-display);
}

.social-stat-card span {
  font-size: 13px;
  line-height: 1.35;
  color: #6f5d89;
  font-weight: 600;
}

.social-proof-reviews {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.social-review-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(233, 220, 255, 0.8);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 10px;
}

.social-review-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #3a2856;
}

.social-review-card span {
  font-size: 12px;
  font-weight: 700;
  color: #7a5aa8;
}

.social-proof-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.social-proof-tags span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 14px;
  border: 1px solid rgba(160, 121, 222, 0.35);
  background: #fff;
  color: #614389;
  font-size: 13px;
  font-weight: 700;
}

.lazy-section-slot {
  display: block;
}

.lazy-section-slot--demo {
  min-height: 776px;
}

.lazy-section-slot--plans {
  min-height: 680px;
}

.inspiration-head {
  display: grid;
  gap: 18px;
  margin-bottom: 18px;
}

.inspiration-kicker,
.plans-kicker,
.faq-kicker,
.closing-kicker {
  margin: 0;
  color: #6e48c4;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inspiration-head h2,
.plans-head h2,
.faq-head h2,
.closing-cta-shell h2 {
  margin: 0;
  color: #2b1a44;
  font-size: clamp(26px, 3.2vw, 38px);
  line-height: 1.12;
}

.plans-section {
  padding: 104px 0 112px;
  background:
    radial-gradient(circle at 8% 12%, rgba(122, 79, 217, 0.16), transparent 34%),
    radial-gradient(circle at 88% 10%, rgba(240, 106, 166, 0.16), transparent 32%),
    linear-gradient(180deg, #fff 0%, #fff8fd 45%, #f7f0ff 100%);
}

.plans-shell {
  display: grid;
  gap: 28px;
  width: min(1320px, 92vw);
}

.plans-head {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 0.5fr);
  align-items: end;
  gap: 22px;
}

.plans-head h2 {
  max-width: 780px;
  font-size: clamp(38px, 5.4vw, 72px);
  line-height: 0.92;
  letter-spacing: -0.07em;
}

.plans-head > p {
  margin: 0;
  border: 1px solid rgba(122, 79, 217, 0.14);
  border-radius: 28px;
  padding: 22px;
  background:
    radial-gradient(circle at 100% 0%, rgba(240, 106, 166, 0.13), transparent 34%),
    rgba(255, 255, 255, 0.74);
  color: #67597f;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.65;
  box-shadow: 0 20px 50px rgba(72, 39, 120, 0.08);
}

.inspiration-section {
  padding: 88px 0;
  background:
    radial-gradient(circle at 12% 12%, rgba(122, 79, 217, 0.14), transparent 34%),
    radial-gradient(circle at 86% 16%, rgba(240, 106, 166, 0.13), transparent 32%),
    linear-gradient(180deg, #faf6ff 0%, #ffffff 100%);
}

.inspiration-shell {
  display: grid;
  gap: 24px;
}

.inspiration-head {
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.7fr);
  align-items: end;
}

.inspiration-head > p {
  margin: 0;
  color: #69597f;
  line-height: 1.75;
  font-size: 16px;
}

.inspiration-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.inspiration-card {
  position: relative;
  overflow: hidden;
  min-height: 300px;
  border-radius: 28px;
  border: 1px solid rgba(224, 211, 247, 0.92);
  background:
    radial-gradient(circle at 100% 0%, rgba(240, 106, 166, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 246, 255, 0.94));
  padding: 24px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;
  box-shadow: 0 22px 52px rgba(61, 34, 104, 0.09);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.inspiration-card:hover {
  border-color: rgba(122, 79, 217, 0.24);
  transform: translateY(-6px);
  box-shadow: 0 28px 70px rgba(122, 79, 217, 0.18);
}

.inspiration-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.inspiration-card-top span {
  width: fit-content;
  border-radius: 999px;
  padding: 7px 11px;
  background: rgba(122, 79, 217, 0.1);
  color: #6e48c4;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inspiration-card-top strong {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(135deg, #7a4fd9, #ef5da8);
  font-size: 16px;
  font-weight: 950;
  letter-spacing: -0.04em;
  box-shadow: 0 18px 34px rgba(122, 79, 217, 0.18);
}

.inspiration-card-body {
  display: grid;
  align-content: end;
  gap: 10px;
  min-width: 0;
}

.inspiration-card h3 {
  margin: 0;
  color: #352153;
  font-size: clamp(22px, 2vw, 28px);
  line-height: 1.02;
  letter-spacing: -0.035em;
}

.inspiration-card p,
.conversion-copy p {
  margin: 0;
  color: #66567f;
  font-size: 15px;
  line-height: 1.6;
}

.inspiration-card a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(122, 79, 217, 0.18);
  padding: 0 16px;
  color: #5f35bc;
  background: rgba(122, 79, 217, 0.08);
  font-weight: 900;
  text-decoration: none;
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.inspiration-card a:hover {
  color: #fff;
  background: linear-gradient(120deg, #7a4fd9, #ef5da8);
  transform: translateY(-1px);
}

.inspiration-conversion {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 22px;
  align-items: stretch;
  border-radius: 34px;
  border: 1px solid rgba(224, 209, 249, 0.95);
  padding: clamp(22px, 4vw, 36px);
  background:
    linear-gradient(135deg, rgba(35, 20, 63, 0.96), rgba(87, 55, 145, 0.93)),
    radial-gradient(circle at 88% 12%, rgba(240, 106, 166, 0.28), transparent 34%);
  color: #fff;
  box-shadow: 0 28px 80px rgba(35, 20, 63, 0.22);
}

.conversion-copy {
  display: grid;
  gap: 12px;
  align-content: center;
}

.conversion-copy > span {
  width: fit-content;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.conversion-copy h3 {
  margin: 0;
  max-width: 720px;
  font-size: clamp(28px, 4vw, 48px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.conversion-copy p {
  max-width: 680px;
  color: rgba(255, 255, 255, 0.78);
}

.conversion-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.inspiration-steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.inspiration-steps li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border-radius: 20px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.inspiration-steps strong {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: #fff;
  color: #6e48c4;
  font-size: 18px;
}

.inspiration-steps span {
  color: rgba(255, 255, 255, 0.84);
  font-weight: 700;
  line-height: 1.4;
}

.faq-section {
  padding: 88px 0;
  background:
    radial-gradient(circle at 12% 16%, rgba(122, 79, 217, 0.12), transparent 34%),
    radial-gradient(circle at 90% 18%, rgba(240, 106, 166, 0.12), transparent 32%),
    linear-gradient(180deg, #fff 0%, #fbf7ff 100%);
}

.faq-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(360px, 1.2fr);
  align-items: start;
  gap: 28px;
}

.faq-head {
  position: sticky;
  top: calc(var(--public-header-height, 80px) + 24px);
  display: grid;
  gap: 12px;
  max-width: 740px;
  border: 1px solid rgba(122, 79, 217, 0.12);
  border-radius: 30px;
  padding: 26px;
  background:
    radial-gradient(circle at 100% 0%, rgba(240, 106, 166, 0.15), transparent 34%),
    rgba(255, 255, 255, 0.78);
  box-shadow: 0 22px 56px rgba(61, 34, 104, 0.08);
}

.faq-list {
  display: grid;
  gap: 12px;
}

.faq-item {
  border-radius: 22px;
  border: 1px solid rgba(224, 208, 248, 0.92);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(252, 248, 255, 0.9));
  padding: 0;
  box-shadow: 0 16px 40px rgba(61, 34, 104, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.faq-item[open],
.faq-item:hover {
  border-color: rgba(122, 79, 217, 0.24);
  box-shadow: 0 22px 54px rgba(61, 34, 104, 0.1);
  transform: translateY(-1px);
}

.faq-item summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  list-style: none;
  color: #3f265f;
  font-weight: 900;
  font-size: 16px;
  padding: 18px 20px;
}

.faq-item summary::after {
  content: "+";
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(122, 79, 217, 0.18);
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.95), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(246, 239, 255, 0.96));
  color: #6e48c4;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 10px 22px rgba(122, 79, 217, 0.12);
  transition:
    transform 0.22s ease,
    background 0.22s ease,
    border-color 0.22s ease,
    color 0.22s ease,
    box-shadow 0.22s ease;
}

.faq-item summary:hover::after,
.faq-item summary:focus-visible::after {
  border-color: rgba(239, 93, 168, 0.28);
  transform: translateY(-1px) scale(1.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 14px 28px rgba(122, 79, 217, 0.18);
}

.faq-item[open] summary::after {
  content: "−";
  border-color: rgba(255, 255, 255, 0.32);
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.34), transparent 28%),
    linear-gradient(135deg, #7a4fd9 0%, #b44bd8 48%, #ef5da8 100%);
  color: #fff;
  transform: rotate(180deg) scale(1.02);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 16px 34px rgba(122, 79, 217, 0.26);
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item p {
  margin: 0;
  padding: 0 20px 18px;
  color: #66567f;
  font-size: 15px;
  line-height: 1.65;
}

.closing-cta {
  padding: 74px 0 34px;
  background: transparent;
}

.closing-cta-shell {
  border-radius: 20px;
  border: 1px solid rgba(212, 190, 245, 0.8);
  background: linear-gradient(145deg, #ffffff, #f7f2ff);
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.closing-cta-shell p {
  margin: 6px 0 0;
  color: #5f4f79;
  font-size: 15px;
  line-height: 1.45;
  max-width: 56ch;
}

.closing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

@media (max-width: 1010px) {
  .hero-carousel {
    height: clamp(620px, 100svh, 860px);
  }

  .hero-content {
    width: min(640px, 100%);
    padding-top: calc(var(--public-header-height, 80px) + 14px);
    padding-bottom: 128px;
  }

  .hero-content h1 {
    max-width: 100%;
  }

  .hero-proof {
    display: grid;
    max-width: 100%;
  }

  .social-proof {
    padding-top: 64px;
  }

  .inspiration-head,
  .inspiration-conversion {
    grid-template-columns: 1fr;
  }

  .inspiration-section {
    padding: 76px 0;
    background:
      radial-gradient(circle at 8% 5%, rgba(122, 79, 217, 0.16), transparent 38%),
      radial-gradient(circle at 92% 22%, rgba(240, 106, 166, 0.13), transparent 34%),
      linear-gradient(180deg, #fbf7ff 0%, #ffffff 100%);
  }

  .inspiration-shell {
    gap: 22px;
  }

  .inspiration-head {
    max-width: 760px;
    gap: 12px;
  }

  .inspiration-head h2 {
    max-width: 720px;
    font-size: clamp(34px, 5.8vw, 54px);
    line-height: 0.98;
    letter-spacing: -0.055em;
  }

  .inspiration-head > p {
    max-width: 650px;
    font-size: 15px;
    line-height: 1.68;
  }

  .inspiration-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .inspiration-card {
    min-height: 250px;
    border-radius: 24px;
    padding: 22px;
  }

  .inspiration-card h3 {
    max-width: 100%;
    font-size: 23px;
  }

  .inspiration-card p {
    font-size: 14px;
    line-height: 1.55;
  }

  .plans-section {
    padding: 82px 0 88px;
  }

  .lazy-section-slot--demo {
    min-height: 1080px;
  }

  .lazy-section-slot--plans {
    min-height: 1280px;
  }

  .plans-shell {
    width: min(1160px, 94vw);
    gap: 22px;
  }

  .plans-head {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 16px;
  }

  .plans-head h2 {
    max-width: 760px;
    font-size: clamp(34px, 5.8vw, 56px);
  }

  .plans-head > p {
    max-width: 720px;
  }

  .faq-shell {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .faq-head {
    position: relative;
    top: auto;
    max-width: 760px;
    padding: 22px;
  }

  .inspiration-conversion {
    border-radius: 30px;
    padding: 28px;
    gap: 20px;
  }

  .conversion-copy h3 {
    max-width: 700px;
    font-size: clamp(34px, 5.2vw, 48px);
  }

  .conversion-copy p {
    max-width: 680px;
  }

  .inspiration-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .inspiration-steps li {
    grid-template-columns: 1fr;
    align-content: start;
  }

  .inspiration-steps strong {
    width: 42px;
    height: 42px;
  }

  .inspiration-steps span {
    font-size: 13px;
  }

  .closing-cta-shell {
    flex-direction: column;
    align-items: flex-start;
  }

  .closing-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .social-proof-stats,
  .social-proof-reviews {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-carousel {
    height: 100svh;
    min-height: 620px;
  }

  .hero-content {
    padding-top: calc(var(--public-header-height, 80px) + 18px);
    padding-bottom: 136px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-proof {
    gap: 6px;
  }

  .hero-proof li {
    border-radius: 12px;
    width: 100%;
  }

  .social-proof {
    padding: 56px 0 64px;
  }

  .inspiration-section {
    padding: 62px 0;
    background:
      radial-gradient(circle at 12% 3%, rgba(122, 79, 217, 0.18), transparent 42%),
      radial-gradient(circle at 90% 32%, rgba(240, 106, 166, 0.13), transparent 36%),
      linear-gradient(180deg, #fbf7ff 0%, #ffffff 100%);
  }

  .faq-section {
    padding: 58px 0;
  }

  .plans-section {
    padding: 66px 0 72px;
  }

  .lazy-section-slot--demo {
    min-height: 1180px;
  }

  .lazy-section-slot--plans {
    min-height: 1700px;
  }

  .plans-shell {
    width: min(100% - 32px, 560px);
    gap: 18px;
  }

  .plans-head {
    gap: 12px;
  }

  .plans-head h2 {
    font-size: clamp(31px, 9vw, 44px);
    line-height: 0.96;
    letter-spacing: -0.055em;
  }

  .plans-head > p {
    border-radius: 22px;
    padding: 16px;
    font-size: 14px;
  }

  .inspiration-shell {
    gap: 18px;
  }

  .inspiration-head {
    gap: 12px;
    margin-bottom: 4px;
  }

  .inspiration-kicker {
    font-size: 11px;
  }

  .inspiration-head h2 {
    font-size: clamp(30px, 9vw, 42px);
    line-height: 0.98;
    letter-spacing: -0.045em;
  }

  .inspiration-head > p {
    border-left: 3px solid rgba(122, 79, 217, 0.28);
    padding-left: 12px;
    font-size: 14px;
    line-height: 1.62;
  }

  .closing-cta {
    padding: 58px 0 26px;
  }

  .inspiration-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .inspiration-card {
    min-height: auto;
    border-radius: 22px;
    padding: 18px 18px 18px 20px;
    align-content: start;
    box-shadow: 0 16px 38px rgba(122, 79, 217, 0.1);
  }

  .inspiration-card-top span {
    padding: 6px 9px;
    font-size: 10px;
  }

  .inspiration-card-top strong {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    font-size: 14px;
  }

  .inspiration-card h3 {
    max-width: 100%;
    font-size: 22px;
    line-height: 1.04;
  }

  .inspiration-card p {
    font-size: 14px;
    line-height: 1.52;
  }

  .inspiration-card a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(122, 79, 217, 0.2);
    background: linear-gradient(120deg, rgba(122, 79, 217, 0.1), rgba(240, 106, 166, 0.09));
    color: #4c1d95;
  }

  .inspiration-conversion {
    gap: 18px;
    border-radius: 26px;
    padding: 20px;
    background:
      radial-gradient(circle at 88% 0%, rgba(240, 106, 166, 0.32), transparent 34%),
      linear-gradient(145deg, #211238 0%, #42246f 58%, #6e48c4 100%);
    box-shadow: 0 22px 56px rgba(35, 20, 63, 0.22);
  }

  .conversion-copy {
    gap: 10px;
  }

  .conversion-copy > span {
    font-size: 10px;
    padding: 7px 10px;
  }

  .conversion-copy h3 {
    font-size: clamp(28px, 8vw, 38px);
    line-height: 0.98;
  }

  .conversion-copy p {
    font-size: 14px;
    line-height: 1.58;
  }

  .inspiration-steps {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .inspiration-steps li {
    grid-template-columns: 38px minmax(0, 1fr);
    border-radius: 17px;
    padding: 12px;
  }

  .inspiration-steps strong {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    font-size: 16px;
  }

  .inspiration-steps span {
    font-size: 13px;
  }

  .conversion-actions {
    flex-direction: column;
  }

  .faq-shell {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .faq-head {
    position: relative;
    top: auto;
    border-radius: 24px;
    padding: 18px;
  }

  .faq-item {
    border-radius: 18px;
  }

  .faq-item summary {
    padding: 16px;
    font-size: 15px;
  }

  .faq-item p {
    padding: 0 16px 16px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .hero-content {
    padding-top: calc(var(--public-header-height, 80px) + 12px);
    padding-bottom: 130px;
  }

  .hero-controls {
    bottom: 12px;
  }

  .hero-nav {
    width: 36px;
    height: 36px;
  }

  .hero-dots {
    gap: 6px;
    padding: 7px 8px;
  }

  .inspiration-section {
    padding: 50px 0;
  }

  .plans-section {
    padding: 52px 0 58px;
  }

  .faq-section {
    padding: 52px 0;
  }

  .inspiration-head h2 {
    font-size: clamp(28px, 10vw, 38px);
  }

  .inspiration-card {
    padding: 16px;
  }

  .inspiration-card h3 {
    max-width: 100%;
    font-size: 20px;
  }

  .inspiration-conversion {
    margin-inline: -2px;
    padding: 18px;
    border-radius: 22px;
  }

  .conversion-actions :deep(.btn) {
    width: 100%;
  }

  .closing-cta {
    padding: 52px 0 20px;
  }

  .social-proof {
    padding: 52px 0;
  }
  .closing-cta-shell {
    padding: 16px;
    border-radius: 16px;
  }
}
</style>

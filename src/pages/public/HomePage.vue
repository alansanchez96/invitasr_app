<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

const activeIndex = ref(0)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const activeSlide = computed(() => slides[activeIndex.value])

const goToSlide = (index: number) => {
  activeIndex.value = index
}

const nextSlide = () => {
  activeIndex.value = (activeIndex.value + 1) % slides.length
}

const prevSlide = () => {
  activeIndex.value = (activeIndex.value - 1 + slides.length) % slides.length
}

const stopAutoplay = () => {
  if (!autoplayTimer) return
  clearInterval(autoplayTimer)
  autoplayTimer = null
}

const startAutoplay = () => {
  if (autoplayTimer || slides.length <= 1) return
  autoplayTimer = setInterval(nextSlide, 7000)
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})
</script>

<template>
  <section class="hero-only" aria-label="Hero principal">
    <div class="hero-carousel" @mouseenter="stopAutoplay" @mouseleave="startAutoplay">
      <div class="hero-media" aria-hidden="true">
        <figure v-for="(slide, index) in slides" :key="slide.image" class="hero-slide"
          :class="{ 'is-active': index === activeIndex }">
          <img :src="slide.image" :alt="slide.alt" loading="eager" decoding="async" />
        </figure>
        <div class="hero-overlay"></div>
      </div>

      <div class="container hero-content-shell">
        <div class="hero-content">
          <p class="hero-tag">{{ activeSlide.tag }}</p>
          <h1>{{ activeSlide.title }}</h1>
          <p class="hero-description">{{ activeSlide.description }}</p>

          <div class="hero-actions">
            <BaseButton as="RouterLink" to="/planes" variant="primary">{{ activeSlide.cta }}</BaseButton>
            <BaseButton as="RouterLink" to="/planes" variant="ghost">Ver planes y precios</BaseButton>
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

        <div class="hero-dots" role="tablist" aria-label="Seleccion de slide">
          <button v-for="(slide, index) in slides" :key="slide.tag" type="button" class="hero-dot"
            :class="{ 'is-active': index === activeIndex }" :aria-label="`Ir a slide ${index + 1}`"
            :aria-selected="index === activeIndex" @click="goToSlide(index)">
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
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(16, 9, 27, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.hero-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.45);
  transition: transform 0.2s ease, background 0.2s ease;
}

.hero-dot:hover {
  background: rgba(255, 255, 255, 0.72);
}

.hero-dot.is-active {
  transform: scale(1.15);
  background: #fff;
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
}
</style>

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

  <section class="social-proof" aria-labelledby="social-proof-title">
    <div class="container social-proof-shell">
      <div class="social-proof-head">
        <p class="social-proof-kicker">Prueba social real</p>
        <h2 id="social-proof-title">La forma mas facil de crear invitaciones que tus invitados si quieren abrir</h2>
      </div>

      <div class="social-proof-stats">
        <article class="social-stat-card">
          <strong>+1,200</strong>
          <span>Eventos activos este mes</span>
        </article>
        <article class="social-stat-card">
          <strong>97%</strong>
          <span>Clientes satisfechos con su primera invitacion</span>
        </article>
        <article class="social-stat-card">
          <strong>3 min</strong>
          <span>Tiempo promedio para publicar la primera version</span>
        </article>
      </div>

      <div class="social-proof-reviews">
        <article class="social-review-card">
          <p>“La hicimos en minutos y todos nos escribieron para decir que estaba hermosa.”</p>
          <span>- Camila & Bruno, Boda</span>
        </article>
        <article class="social-review-card">
          <p>“No sabia nada de diseno. Igual pude personalizar todo y quedo super pro.”</p>
          <span>- Ana, Cumpleanos</span>
        </article>
        <article class="social-review-card">
          <p>“Para eventos corporativos nos ahorro tiempo y mejoro la imagen de marca.”</p>
          <span>- Equipo Nexus, Corporativo</span>
        </article>
      </div>

      <div class="social-proof-tags" aria-label="Tipos de eventos populares">
        <span>Bodas</span>
        <span>XV Años</span>
        <span>Baby Shower</span>
        <span>Bautismo</span>
        <span>Cumpleanos</span>
        <span>Corporativo</span>
      </div>
    </div>
  </section>

  <section id="como-funciona" class="flow-section" aria-labelledby="flow-title">
    <div class="container flow-grid">
      <div class="flow-copy">
        <p class="flow-kicker">Como funciona</p>
        <h2 id="flow-title">Mira el proceso real en una pantalla de celular</h2>
        <p>
          Sin curva tecnica y sin friccion. En minutos puedes pasar de idea a invitacion publicada.
        </p>
        <ol class="flow-steps">
          <li>
            <strong>Elige estilo</strong>
            <span>Selecciona el diseño que mejor representa tu evento.</span>
          </li>
          <li>
            <strong>Personaliza datos</strong>
            <span>Nombres, fecha, ubicacion y mensaje en una experiencia guiada.</span>
          </li>
          <li>
            <strong>Comparte al instante</strong>
            <span>Tu invitacion queda lista para WhatsApp, redes o link directo.</span>
          </li>
        </ol>
      </div>

      <div class="phone-demo-wrap" aria-label="Ejemplo de invitacion en celular">
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="phone-screen">
            <div class="phone-scroll-content">
              <span class="phone-chip">Boda · Demo</span>
              <h3>Ana & Leo</h3>
              <p>Sabado 14 · Noviembre 2026</p>
              <div class="phone-divider"></div>
              <section>
                <h4>Nuestra historia</h4>
                <p>
                  Nos encantaria compartir este momento contigo.
                  Esta invitacion es una muestra simple de como se veria en tu celular.
                </p>
              </section>
              <section>
                <h4>Detalles</h4>
                <ul>
                  <li>Ceremonia · 18:00 hs</li>
                  <li>Recepcion · 20:30 hs</li>
                  <li>Salon Magnolia · CABA</li>
                </ul>
              </section>
              <button type="button">Confirmar asistencia</button>
              <small>Scroll para ver mas secciones y contenido.</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="demo" class="templates-section" aria-labelledby="templates-title">
    <div class="container">
      <div class="templates-head">
        <p class="templates-kicker">Catalogo de plantillas</p>
        <h2 id="templates-title">Estilos listos para cada tipo de evento</h2>
      </div>
      <div class="templates-grid">
        <article class="template-card">
          <h3>Elegante Class</h3>
          <span>Bodas</span>
        </article>
        <article class="template-card">
          <h3>Glow Party</h3>
          <span>Cumpleanos</span>
        </article>
        <article class="template-card">
          <h3>Golden XV</h3>
          <span>XV Años</span>
        </article>
        <article class="template-card">
          <h3>Sweet Welcome</h3>
          <span>Baby Shower</span>
        </article>
        <article class="template-card">
          <h3>Pure Blessing</h3>
          <span>Bautismo</span>
        </article>
        <article class="template-card">
          <h3>Impact Pro</h3>
          <span>Corporativo</span>
        </article>
      </div>
    </div>
  </section>

  <section id="inspiracion" class="benefits-section" aria-labelledby="benefits-title">
    <div class="container">
      <div class="benefits-head">
        <p class="benefits-kicker">Por que funciona</p>
        <h2 id="benefits-title">Diseñada para vender emocion y facilitar tu organizacion</h2>
      </div>
      <div class="benefits-grid">
        <article class="benefit-card">
          <h3>Impacto visual inmediato</h3>
          <p>Tu invitacion genera una primera impresion fuerte en segundos.</p>
        </article>
        <article class="benefit-card">
          <h3>Proceso simple y guiado</h3>
          <p>Todo esta pensado para que avances rapido, incluso si es tu primera vez.</p>
        </article>
        <article class="benefit-card">
          <h3>Mas conversion de invitados</h3>
          <p>Una experiencia clara aumenta la respuesta y reduce fricciones.</p>
        </article>
      </div>
    </div>
  </section>

  <section id="planes" class="plans-section" aria-labelledby="plans-title">
    <div class="container">
      <div class="plans-head">
        <p class="plans-kicker">Planes</p>
        <h2 id="plans-title">Elige el plan ideal y comienza hoy</h2>
      </div>
      <div class="plans-grid">
        <article class="plan-card">
          <h3>Basic</h3>
          <p class="plan-price">US$ 9.99</p>
          <ul>
            <li>Plantillas listas para personalizar</li>
            <li>Publicacion rapida</li>
            <li>Flujo guiado</li>
          </ul>
          <BaseButton as="RouterLink" to="/planes" variant="ghost">Ver Basic</BaseButton>
        </article>
        <article class="plan-card featured">
          <h3>Pro</h3>
          <p class="plan-price">US$ 19.99</p>
          <ul>
            <li>Mas variedad de estilos</li>
            <li>Mayor personalizacion</li>
            <li>Experiencia premium</li>
          </ul>
          <BaseButton as="RouterLink" to="/planes" variant="primary">Elegir Pro</BaseButton>
        </article>
        <article class="plan-card">
          <h3>Premium</h3>
          <p class="plan-price">US$ 29.99</p>
          <ul>
            <li>Acceso continuo a mejoras</li>
            <li>Ideal para uso frecuente</li>
            <li>Escalabilidad total</li>
          </ul>
          <BaseButton as="RouterLink" to="/planes" variant="ghost">Explorar Premium</BaseButton>
        </article>
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
        <details class="faq-item" open>
          <summary>Realmente puedo crearla sin saber de diseño?</summary>
          <p>Si. El flujo esta pensado para personas sin experiencia tecnica ni creativa.</p>
        </details>
        <details class="faq-item">
          <summary>Cuanto se tarda en tener una primera version lista?</summary>
          <p>En promedio, entre 2 y 3 minutos puedes tener una version para compartir.</p>
        </details>
        <details class="faq-item">
          <summary>Puedo mejorarla despues de publicarla?</summary>
          <p>Si. Puedes editar y actualizar detalles cuando quieras desde tu panel.</p>
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
        <BaseButton as="RouterLink" to="/planes" variant="primary">Comenzar ahora</BaseButton>
        <BaseButton as="RouterLink" to="/planes" variant="ghost">Ver planes</BaseButton>
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

.flow-section {
  padding: 78px 0;
  background:
    radial-gradient(circle at 82% 14%, rgba(95, 46, 200, 0.12), transparent 40%),
    linear-gradient(180deg, #ffffff 0%, #f9f4ff 100%);
}

.flow-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 28px;
  align-items: center;
}

.flow-copy {
  display: grid;
  gap: 12px;
}

.flow-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6e48c4;
}

.flow-copy h2 {
  margin: 0;
  color: #2b1a44;
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.1;
  max-width: 15ch;
}

.flow-copy p {
  margin: 0;
  color: #5e4e79;
  font-size: 16px;
  line-height: 1.45;
  max-width: 52ch;
}

.flow-steps {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.flow-steps li {
  border: 1px solid rgba(203, 177, 244, 0.55);
  border-radius: 14px;
  background: #fff;
  padding: 12px 14px;
  display: grid;
  gap: 3px;
}

.flow-steps strong {
  color: #39205e;
  font-size: 15px;
}

.flow-steps span {
  color: #65567f;
  font-size: 14px;
}

.phone-demo-wrap {
  display: flex;
  justify-content: center;
}

.phone-frame {
  position: relative;
  width: min(100%, 340px);
  border-radius: 32px;
  border: 1px solid rgba(186, 153, 239, 0.55);
  background: linear-gradient(170deg, #2d1846, #1a112a);
  padding: 14px;
  box-shadow: 0 18px 38px rgba(57, 28, 104, 0.24);
}

.phone-notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 104px;
  height: 18px;
  border-radius: 999px;
  background: rgba(244, 238, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.phone-screen {
  margin-top: 14px;
  border-radius: 23px;
  background: linear-gradient(180deg, #ffffff, #f7f2ff);
  border: 1px solid rgba(226, 213, 250, 0.85);
  overflow: hidden;
}

.phone-scroll-content {
  height: 472px;
  overflow: auto;
  padding: 16px 16px 20px;
  display: grid;
  gap: 12px;
  scrollbar-width: thin;
}

.phone-chip {
  width: fit-content;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #603f8f;
  border: 1px solid rgba(166, 131, 227, 0.42);
  background: #fbf8ff;
  padding: 5px 10px;
}

.phone-scroll-content h3 {
  margin: 0;
  color: #2f1950;
  font-size: 24px;
  font-family: var(--font-display);
}

.phone-scroll-content p {
  margin: 0;
  color: #614d7f;
  font-size: 14px;
  line-height: 1.45;
}

.phone-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(160, 127, 217, 0.2), rgba(160, 127, 217, 0.6), rgba(160, 127, 217, 0.2));
}

.phone-scroll-content section {
  display: grid;
  gap: 6px;
}

.phone-scroll-content h4 {
  margin: 0;
  color: #45286c;
  font-size: 14px;
}

.phone-scroll-content ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.phone-scroll-content li {
  color: #5a4878;
  font-size: 13px;
}

.phone-scroll-content button {
  border: 0;
  border-radius: 12px;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 12px;
}

.phone-scroll-content small {
  color: #786992;
  font-size: 12px;
}

.templates-section {
  padding: 74px 0;
  background: #fff;
}

.templates-head,
.benefits-head,
.plans-head {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.templates-kicker,
.benefits-kicker,
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

.templates-head h2,
.benefits-head h2,
.plans-head h2,
.faq-head h2,
.closing-cta-shell h2 {
  margin: 0;
  color: #2b1a44;
  font-size: clamp(26px, 3.2vw, 38px);
  line-height: 1.12;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.template-card {
  border-radius: 16px;
  border: 1px solid rgba(222, 208, 246, 0.85);
  background:
    radial-gradient(circle at 0% 0%, rgba(142, 96, 214, 0.12), transparent 58%),
    #fff;
  padding: 16px;
  display: grid;
  gap: 8px;
}

.template-card h3 {
  margin: 0;
  color: #33204f;
  font-size: 19px;
  font-family: var(--font-display);
}

.template-card span {
  width: fit-content;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid rgba(174, 139, 232, 0.42);
  color: #6a4699;
  background: rgba(254, 250, 255, 0.9);
  font-size: 12px;
  font-weight: 700;
}

.benefits-section {
  padding: 74px 0;
  background: linear-gradient(180deg, #faf6ff 0%, #ffffff 100%);
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.benefit-card {
  border-radius: 16px;
  border: 1px solid rgba(229, 214, 253, 0.9);
  background: #fff;
  padding: 18px;
  display: grid;
  gap: 8px;
}

.benefit-card h3 {
  margin: 0;
  color: #352153;
  font-size: 19px;
}

.benefit-card p {
  margin: 0;
  color: #66567f;
  font-size: 14px;
  line-height: 1.45;
}

.plans-section {
  padding: 74px 0;
  background:
    radial-gradient(circle at 84% 20%, rgba(90, 222, 191, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f9f4ff 100%);
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.plan-card {
  border-radius: 18px;
  border: 1px solid rgba(223, 208, 245, 0.9);
  background: #fff;
  padding: 18px;
  display: grid;
  gap: 10px;
}

.plan-card.featured {
  border-color: rgba(131, 83, 214, 0.5);
  box-shadow: 0 16px 30px rgba(90, 48, 140, 0.14);
}

.plan-card h3 {
  margin: 0;
  color: #2f194d;
  font-size: 24px;
}

.plan-price {
  margin: 0;
  color: #5e38a0;
  font-size: 18px;
  font-weight: 800;
}

.plan-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.plan-card li {
  color: #63537e;
  font-size: 14px;
}

.faq-section {
  padding: 74px 0;
  background: #fff;
}

.faq-shell {
  display: grid;
  gap: 16px;
}

.faq-head {
  display: grid;
  gap: 8px;
  max-width: 740px;
}

.faq-list {
  display: grid;
  gap: 10px;
}

.faq-item {
  border-radius: 14px;
  border: 1px solid rgba(224, 208, 248, 0.9);
  background: linear-gradient(180deg, #fff, #fcf8ff);
  padding: 12px 14px;
}

.faq-item summary {
  cursor: pointer;
  list-style: none;
  color: #3f265f;
  font-weight: 700;
  font-size: 15px;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item p {
  margin: 10px 0 0;
  color: #66567f;
  font-size: 14px;
  line-height: 1.45;
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

  .flow-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .flow-copy h2 {
    max-width: none;
  }

  .templates-grid,
  .benefits-grid,
  .plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .flow-section,
  .templates-section,
  .benefits-section,
  .plans-section,
  .faq-section {
    padding: 58px 0;
  }

  .closing-cta {
    padding: 58px 0 26px;
  }

  .templates-grid,
  .benefits-grid,
  .plans-grid {
    grid-template-columns: 1fr;
  }

  .phone-frame {
    width: min(100%, 320px);
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

  .flow-section,
  .templates-section,
  .benefits-section,
  .plans-section,
  .faq-section {
    padding: 52px 0;
  }

  .closing-cta {
    padding: 52px 0 20px;
  }

  .social-proof {
    padding: 52px 0;
  }

  .phone-scroll-content {
    height: 430px;
  }

  .closing-cta-shell {
    padding: 16px;
    border-radius: 16px;
  }
}
</style>

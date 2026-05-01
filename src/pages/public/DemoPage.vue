<script setup lang="ts">
import DemoTemplateGallery from '@/components/public/DemoTemplateGallery.vue'
</script>

<template>
  <main class="demo-page">
    <section class="demo-page-hero" aria-labelledby="demo-page-title">
      <div class="container demo-page-hero-shell">
        <div>
          <p class="demo-page-kicker">Demo InvitaSR</p>
          <h1 id="demo-page-title">Explora plantillas reales y elige por dónde empezar</h1>
          <p>
            Esta es tu vitrina para probar estilos por tipo de evento. Primero mira, compara y elige; luego podrás
            registrarte para conservar tu diseño.
          </p>
        </div>
        <div class="demo-page-proof" aria-label="Beneficios de la demo">
          <span>Sin tarjeta</span>
          <span>Vista previa real</span>
          <span>Planes compatibles</span>
        </div>
      </div>
    </section>

    <DemoTemplateGallery />
  </main>
</template>

<style scoped>
.demo-page {
  background: #fff;
}

.demo-page-hero {
  overflow: hidden;
  padding: calc(var(--public-header-height, 80px) + 54px) 0 48px;
  color: #fff;
  background:
    radial-gradient(circle at 14% 16%, rgba(240, 106, 166, 0.26), transparent 34%),
    radial-gradient(circle at 88% 2%, rgba(155, 107, 255, 0.32), transparent 36%),
    linear-gradient(135deg, #1a0d2d 0%, #422066 54%, #7a4fd9 100%);
}

.demo-page-hero-shell {
  display: grid;
  gap: 22px;
}

.demo-page-kicker {
  margin: 0 0 0.55rem;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.demo-page-hero h1 {
  max-width: 13ch;
  margin: 0;
  font-size: clamp(42px, 7vw, 78px);
  line-height: 0.92;
  letter-spacing: -0.07em;
}

.demo-page-hero p {
  max-width: 66ch;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 17px;
  line-height: 1.62;
}

.demo-page-proof {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.demo-page-proof span {
  border-radius: 999px;
  padding: 9px 13px;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
}
</style>

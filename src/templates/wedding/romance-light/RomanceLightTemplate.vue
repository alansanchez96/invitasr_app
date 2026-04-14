<script setup lang="ts">
import { computed } from 'vue'
import type { InvitationTemplateRendererProps } from '@/templates/types'

defineOptions({
  name: 'WeddingRomanceLightTemplate',
})

const props = defineProps<InvitationTemplateRendererProps<'wedding'>>()

const heroInitials = computed(() => {
  const left = props.data.couple.brideName?.trim()?.[0] ?? ''
  const right = props.data.couple.groomName?.trim()?.[0] ?? ''
  return `${left}${right}`.trim() || 'RS'
})

const hasGallery = computed(() => (props.data.gallery?.length ?? 0) > 0)
const firstGalleryItem = computed(() => props.data.gallery[0] ?? null)
const hasFaq = computed(() => (props.data.faq?.length ?? 0) > 0)
const brandingVisible = computed(() => props.data.branding?.visible !== false)
const brandingLabel = computed(() => props.data.branding?.label ?? 'Creado con InvitaSR')
</script>

<template>
  <article class="romance-light">
    <section class="romance-light__hero">
      <div class="romance-light__topbar">
        <span class="romance-light__pill">{{ manifest.name }}</span>
        <span class="romance-light__eyebrow">{{ data.couple.headline }}</span>
      </div>

      <div class="romance-light__crest">
        <div class="romance-light__floral romance-light__floral--top-left"></div>
        <div class="romance-light__floral romance-light__floral--top-right"></div>
        <div class="romance-light__floral romance-light__floral--bottom-left"></div>
        <div class="romance-light__floral romance-light__floral--bottom-right"></div>
        <div class="romance-light__crest-ring">
          <span class="romance-light__crest-initials">{{ heroInitials }}</span>
          <h1>{{ data.couple.brideName }} <span>&</span> {{ data.couple.groomName }}</h1>
        </div>
      </div>

      <div class="romance-light__hero-copy">
        <p>{{ data.event.date.label }}</p>
        <strong>{{ data.event.venue }} · {{ data.event.city }}</strong>
      </div>
    </section>

    <section v-if="data.checkin?.title || data.checkin?.message" class="romance-light__section romance-light__section--white">
      <div class="romance-light__inner romance-light__inner--centered">
        <span class="romance-light__section-icon romance-light__section-icon--rose"></span>
        <h2>{{ data.checkin?.title ?? 'Bienvenidos' }}</h2>
        <p>{{ data.checkin?.message }}</p>
      </div>
    </section>

    <section class="romance-light__photo-band">
      <img
        :src="firstGalleryItem?.imageUrl ?? 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80'"
        :alt="firstGalleryItem?.alt ?? 'Sesion editorial romantica'"
        loading="lazy" />
    </section>

    <section v-if="data.countdown" class="romance-light__section romance-light__section--white">
      <div class="romance-light__inner romance-light__inner--compact">
        <span class="romance-light__section-icon romance-light__section-icon--violet"></span>
        <h2>{{ data.countdown.title }}</h2>
        <div class="romance-light__countdown">
          <article>
            <strong>{{ data.countdown.daysLabel }}</strong>
            <span>Cuenta regresiva</span>
          </article>
          <article>
            <strong>{{ data.countdown.hoursLabel }}</strong>
            <span>Ultimo detalle</span>
          </article>
        </div>
      </div>
    </section>

    <section class="romance-light__section romance-light__section--tint">
      <div class="romance-light__inner romance-light__inner--split">
        <div>
          <span class="romance-light__eyebrow">Como llegar</span>
          <h2>{{ data.location.name }}</h2>
          <p>{{ data.location.address }}</p>
          <a class="romance-light__link" :href="data.location.mapsUrl" target="_blank" rel="noreferrer">
            Abrir ubicacion
          </a>
        </div>

        <div class="romance-light__music-card">
          <span class="romance-light__eyebrow">Musica</span>
          <strong>{{ data.music.title }}</strong>
          <p>{{ data.music.artist }}</p>
        </div>
      </div>
    </section>

    <section v-if="hasGallery" class="romance-light__section romance-light__section--white">
      <div class="romance-light__inner">
        <span class="romance-light__section-icon romance-light__section-icon--gold"></span>
        <h2>Galeria</h2>
        <div class="romance-light__gallery">
          <figure v-for="item in data.gallery.slice(0, 5)" :key="item.id">
            <img :src="item.imageUrl" :alt="item.alt" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>

    <section v-if="hasFaq" class="romance-light__section romance-light__section--white">
      <div class="romance-light__inner romance-light__inner--compact">
        <span class="romance-light__section-icon romance-light__section-icon--rose"></span>
        <h2>Preguntas frecuentes</h2>
        <div class="romance-light__faq">
          <article v-for="item in data.faq" :key="item.id">
            <strong>{{ item.question }}</strong>
            <p>{{ item.answer }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="romance-light__section romance-light__section--tint">
      <div class="romance-light__inner romance-light__inner--compact">
        <span class="romance-light__section-icon romance-light__section-icon--violet"></span>
        <h2>Registro</h2>
        <p>
          {{ data.rsvp.enabled ? 'Confirma tu presencia y ayúdanos a organizar cada detalle.' : 'El registro aun no esta disponible.' }}
        </p>
        <button type="button" class="romance-light__cta" :disabled="!data.rsvp.enabled">
          {{ data.rsvp.submitLabel }}
        </button>
      </div>
    </section>

    <footer v-if="brandingVisible" class="romance-light__footer">
      <span>{{ brandingLabel }}</span>
    </footer>
  </article>
</template>

<style scoped>
.romance-light {
  overflow: hidden;
  border-radius: 0;
  background: #fff;
  color: #23443b;
}

.romance-light__hero,
.romance-light__section,
.romance-light__photo-band,
.romance-light__footer {
  width: 100%;
}

.romance-light__hero {
  display: grid;
  justify-items: center;
  gap: 1.3rem;
  padding: 1rem 1.2rem 2.4rem;
  background: #f5bcae;
}

.romance-light__topbar {
  width: min(1180px, 100%);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.romance-light__pill,
.romance-light__eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  font-weight: 800;
}

.romance-light__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.38rem 0.7rem;
  color: #fff;
  background: #154f47;
}

.romance-light__eyebrow {
  color: #295549;
}

.romance-light__crest {
  position: relative;
  width: min(440px, 90vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.romance-light__crest-ring {
  position: relative;
  z-index: 2;
  width: 72%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 10px solid rgba(255, 255, 255, 0.76);
  display: grid;
  place-items: center;
  padding: 2rem;
  text-align: center;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 70%);
}

.romance-light__crest-initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  color: #295549;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.romance-light__crest h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(2.8rem, 8vw, 4.8rem);
  line-height: 0.88;
  text-transform: uppercase;
}

.romance-light__crest h1 span {
  display: block;
  font-size: 0.62em;
}

.romance-light__floral {
  position: absolute;
  width: 34%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 28% 24%, #ff6c8b 0 16%, transparent 17%),
    radial-gradient(circle at 42% 36%, #ffd86f 0 7%, transparent 8%),
    radial-gradient(circle at 62% 52%, #9b68d7 0 14%, transparent 15%),
    radial-gradient(circle at 48% 58%, #fefefe 0 16%, transparent 17%),
    radial-gradient(circle at 32% 68%, #7bcdb6 0 12%, transparent 13%),
    radial-gradient(circle at 74% 30%, #f3808a 0 10%, transparent 11%),
    radial-gradient(circle at 66% 72%, #6bbf95 0 10%, transparent 11%);
  filter: drop-shadow(0 16px 22px rgba(94, 54, 90, 0.18));
}

.romance-light__floral--top-left {
  top: 8%;
  left: 8%;
}

.romance-light__floral--top-right {
  top: 10%;
  right: 8%;
}

.romance-light__floral--bottom-left {
  bottom: 10%;
  left: 12%;
}

.romance-light__floral--bottom-right {
  bottom: 8%;
  right: 11%;
}

.romance-light__hero-copy {
  display: grid;
  gap: 0.35rem;
  text-align: center;
  color: #2a564a;
}

.romance-light__hero-copy p,
.romance-light__hero-copy strong {
  margin: 0;
}

.romance-light__section {
  padding: 2.5rem 1.2rem;
}

.romance-light__section--white {
  background: #fff;
}

.romance-light__section--tint {
  background: #f5bcae;
}

.romance-light__inner {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.romance-light__inner--centered,
.romance-light__inner--compact {
  display: grid;
  gap: 0.8rem;
  justify-items: center;
  text-align: center;
  max-width: 760px;
}

.romance-light__inner--split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: 1rem;
  align-items: start;
}

.romance-light__section h2 {
  margin: 0;
  color: #2b564a;
  font-size: clamp(1.5rem, 3vw, 2.4rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.romance-light__section p,
.romance-light__faq p,
.romance-light__music-card p {
  margin: 0;
  line-height: 1.7;
  color: #506a62;
}

.romance-light__section-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-block;
}

.romance-light__section-icon--rose {
  background: radial-gradient(circle, #f1688f 0 34%, #ffd7e0 35% 100%);
}

.romance-light__section-icon--violet {
  background: radial-gradient(circle, #9b68d7 0 34%, #e4d4fb 35% 100%);
}

.romance-light__section-icon--gold {
  background: radial-gradient(circle, #d9a445 0 34%, #f8e1b1 35% 100%);
}

.romance-light__photo-band {
  min-height: 460px;
  background: #f7f2ef;
}

.romance-light__photo-band img {
  width: 100%;
  height: 100%;
  min-height: 460px;
  object-fit: cover;
  display: block;
}

.romance-light__countdown {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  width: 100%;
}

.romance-light__countdown article,
.romance-light__music-card,
.romance-light__faq article {
  padding: 1rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(41, 85, 73, 0.12);
}

.romance-light__countdown strong,
.romance-light__music-card strong,
.romance-light__faq strong {
  color: #254d43;
}

.romance-light__countdown span {
  display: block;
  margin-top: 0.25rem;
  color: #678078;
}

.romance-light__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 42px;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: #154f47;
  color: #fff;
  font-weight: 800;
}

.romance-light__gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
}

.romance-light__gallery figure {
  margin: 0;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 24px;
}

.romance-light__gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.romance-light__faq {
  display: grid;
  gap: 0.85rem;
  width: 100%;
}

.romance-light__cta {
  min-height: 46px;
  border: 0;
  border-radius: 999px;
  padding: 0.82rem 1.2rem;
  color: #fff;
  background: linear-gradient(135deg, #154f47, #2f6b60);
  font-weight: 800;
  cursor: pointer;
}

.romance-light__cta:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.romance-light__footer {
  display: grid;
  place-items: center;
  min-height: 84px;
  padding: 1rem;
  background: #fff;
  color: #7b6b74;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  font-weight: 800;
}

@media (max-width: 860px) {
  .romance-light__topbar,
  .romance-light__inner--split,
  .romance-light__gallery,
  .romance-light__countdown {
    grid-template-columns: 1fr;
  }

  .romance-light__topbar {
    display: grid;
    justify-items: center;
    text-align: center;
  }

  .romance-light__photo-band,
  .romance-light__photo-band img {
    min-height: 320px;
  }
}
</style>

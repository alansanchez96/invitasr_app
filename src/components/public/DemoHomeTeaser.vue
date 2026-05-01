<template>
  <section id="demo-teaser" class="demo-teaser" aria-labelledby="demo-teaser-title">
    <div class="container demo-teaser-shell">
      <div class="demo-teaser-copy">
        <p class="demo-teaser-kicker">Demo visual</p>
        <h2 id="demo-teaser-title">Prueba cómo se siente crear tu invitación antes de comprar</h2>
        <p>
          Elige un tipo de evento, mira estilos reales y descubre lo fácil que será personalizar tu invitación en
          minutos.
        </p>

        <ol class="demo-teaser-steps" aria-label="Proceso para probar InvitaSR">
          <li>
            <strong>1. Elige un estilo</strong>
            <span>Filtra por evento y mira plantillas disponibles.</span>
          </li>
          <li>
            <strong>2. Prueba la experiencia</strong>
            <span>Visualiza cómo se vería una invitación profesional.</span>
          </li>
          <li>
            <strong>3. Conserva tu diseño</strong>
            <span>Regístrate, elige un plan y continúa desde tu panel.</span>
          </li>
        </ol>

        <div class="demo-teaser-actions">
          <BaseButton as="RouterLink" to="/demo" variant="primary">Probar demo gratis</BaseButton>
          <BaseButton as="RouterLink" to="/planes" variant="ghost">Ver planes</BaseButton>
        </div>
      </div>

      <div class="demo-stage" aria-hidden="true">
        <div class="demo-glow demo-glow-one"></div>
        <div class="demo-glow demo-glow-two"></div>

        <div class="floating-card floating-card-one">
          <span>Portada</span>
          <strong>Alan & Andrea</strong>
        </div>
        <div class="floating-card floating-card-two">
          <span>RSVP</span>
          <strong>+24 confirmados</strong>
        </div>
        <div class="floating-card floating-card-three">
          <span>Música</span>
          <strong>Activada</strong>
        </div>

        <div class="demo-phone">
          <div class="demo-phone-notch"></div>
          <div class="demo-phone-screen">
            <div class="demo-invitation-card">
              <span class="demo-chip">Wedding Snow</span>
              <h3>Nos casamos</h3>
              <p>Una experiencia elegante, editable y lista para compartir.</p>
              <div class="demo-date-pill">22 de octubre · 18:00 hs</div>
            </div>

            <div class="demo-editor-panel">
              <div class="demo-editor-row active">
                <span></span>
                <strong>Editar título</strong>
              </div>
              <div class="demo-editor-row">
                <span></span>
                <strong>Galería</strong>
              </div>
              <div class="demo-editor-row">
                <span></span>
                <strong>Confirmación</strong>
              </div>
            </div>

            <button type="button" class="demo-phone-cta">Probar plantilla</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo-teaser {
  overflow: hidden;
  padding: 88px 0;
  background:
    radial-gradient(circle at 12% 10%, rgba(240, 106, 166, 0.16), transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(122, 79, 217, 0.18), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8f2ff 100%);
}

.demo-teaser-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
  gap: clamp(28px, 5vw, 72px);
  align-items: center;
}

.demo-teaser-copy {
  display: grid;
  gap: 16px;
}

.demo-teaser-kicker {
  margin: 0;
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.demo-teaser h2 {
  margin: 0;
  max-width: 13ch;
  color: #241337;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.demo-teaser-copy > p {
  margin: 0;
  max-width: 58ch;
  color: #665578;
  font-size: 17px;
  line-height: 1.6;
}

.demo-teaser-steps {
  display: grid;
  gap: 10px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.demo-teaser-steps li {
  display: grid;
  gap: 3px;
  padding: 14px 16px;
  border: 1px solid rgba(155, 107, 255, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 14px 32px rgba(74, 42, 123, 0.08);
}

.demo-teaser-steps strong {
  color: #2f1a49;
}

.demo-teaser-steps span {
  color: #715f83;
  line-height: 1.45;
}

.demo-teaser-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.demo-stage {
  position: relative;
  min-height: 600px;
  display: grid;
  place-items: center;
  perspective: 1200px;
}

.demo-glow,
.floating-card,
.demo-phone {
  position: absolute;
}

.demo-glow {
  border-radius: 999px;
  filter: blur(2px);
  opacity: 0.7;
}

.demo-glow-one {
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(155, 107, 255, 0.34), transparent 64%);
  animation: pulseGlow 5.8s ease-in-out infinite;
}

.demo-glow-two {
  width: 320px;
  height: 320px;
  right: 2%;
  top: 8%;
  background: radial-gradient(circle, rgba(240, 106, 166, 0.25), transparent 66%);
  animation: pulseGlow 6.2s ease-in-out infinite reverse;
}

.demo-phone {
  width: min(330px, 72vw);
  height: 585px;
  padding: 14px;
  border-radius: 42px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(244, 236, 255, 0.78)),
    linear-gradient(145deg, #2c1744, #7a4fd9);
  box-shadow: 0 34px 90px rgba(55, 28, 92, 0.28);
  transform: rotateY(-10deg) rotateX(6deg);
  animation: phoneFloat 6.8s ease-in-out infinite;
}

.demo-phone-notch {
  position: absolute;
  top: 23px;
  left: 50%;
  z-index: 2;
  width: 94px;
  height: 22px;
  border-radius: 0 0 16px 16px;
  background: #241337;
  transform: translateX(-50%);
}

.demo-phone-screen {
  position: relative;
  overflow: hidden;
  height: 100%;
  border-radius: 32px;
  padding: 34px 18px 18px;
  background:
    radial-gradient(circle at 18% 8%, rgba(255, 255, 255, 0.9), transparent 24%),
    linear-gradient(180deg, #f7fbff 0%, #f3eaff 52%, #fff6fb 100%);
}

.demo-invitation-card {
  min-height: 235px;
  display: grid;
  align-content: end;
  gap: 10px;
  padding: 18px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(23, 13, 40, 0.62)),
    url('@/assets/img/hero/boda.webp') center / cover;
  color: #fff;
  box-shadow: 0 18px 40px rgba(47, 26, 73, 0.24);
}

.demo-chip,
.demo-date-pill {
  width: fit-content;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.demo-invitation-card h3 {
  margin: 0;
  font-size: 2rem;
  line-height: 0.95;
}

.demo-invitation-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.38;
  color: rgba(255, 255, 255, 0.9);
}

.demo-date-pill {
  letter-spacing: 0;
  text-transform: none;
}

.demo-editor-panel {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.demo-editor-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  color: #4f386d;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(155, 107, 255, 0.16);
  animation: editorPulse 4.2s ease-in-out infinite;
}

.demo-editor-row:nth-child(2) {
  animation-delay: 0.6s;
}

.demo-editor-row:nth-child(3) {
  animation-delay: 1.2s;
}

.demo-editor-row span {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7a4fd9, #f06aa6);
}

.demo-editor-row strong {
  font-size: 13px;
}

.demo-phone-cta {
  width: 100%;
  margin-top: 18px;
  border: 0;
  border-radius: 999px;
  padding: 13px 16px;
  color: #fff;
  font-weight: 900;
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
  box-shadow: 0 14px 28px rgba(122, 79, 217, 0.26);
}

.floating-card {
  z-index: 3;
  display: grid;
  gap: 4px;
  min-width: 150px;
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 20px 52px rgba(63, 34, 103, 0.18);
  backdrop-filter: blur(16px);
  animation: cardFloat 5.4s ease-in-out infinite;
}

.floating-card span {
  color: #8a67c5;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.floating-card strong {
  color: #26143c;
  font-size: 15px;
}

.floating-card-one {
  left: 3%;
  top: 16%;
}

.floating-card-two {
  right: 0;
  top: 48%;
  animation-delay: 0.8s;
}

.floating-card-three {
  left: 8%;
  bottom: 14%;
  animation-delay: 1.4s;
}

@keyframes phoneFloat {
  0%, 100% { transform: rotateY(-10deg) rotateX(6deg) translateY(0); }
  50% { transform: rotateY(-7deg) rotateX(4deg) translateY(-16px); }
}

@keyframes cardFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes pulseGlow {
  0%, 100% { transform: scale(0.92); opacity: 0.55; }
  50% { transform: scale(1.08); opacity: 0.82; }
}

@keyframes editorPulse {
  0%, 100% { transform: translateX(0); border-color: rgba(155, 107, 255, 0.16); }
  50% { transform: translateX(5px); border-color: rgba(240, 106, 166, 0.36); }
}

@media (max-width: 980px) {
  .demo-teaser-shell {
    grid-template-columns: 1fr;
  }

  .demo-stage {
    min-height: 560px;
  }
}

@media (max-width: 640px) {
  .demo-teaser {
    padding: 66px 0;
  }

  .demo-teaser-actions,
  .demo-teaser-actions :deep(.btn) {
    width: 100%;
  }

  .demo-stage {
    min-height: 520px;
  }

  .floating-card {
    min-width: 132px;
    padding: 12px;
  }

  .floating-card-two {
    right: -10px;
  }
}
</style>

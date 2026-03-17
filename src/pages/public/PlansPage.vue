<template>
  <section id="planes" class="section plans">
    <div class="container">
      <h1 class="section-title">Planes InvitaSR</h1>
      <p class="section-lead">Elige el plan que mejor se adapta a tu evento.</p>
      <div class="plan-grid">
        <article class="card plan-card">
          <div>
            <h3>Demo</h3>
            <p>Prueba gratuita con marca de agua.</p>
          </div>
          <ul>
            <li>1 plantilla</li>
            <li>RSVP limitado</li>
            <li>Cuenta regresiva</li>
          </ul>
          <button class="btn btn-ghost">Probar demo</button>
        </article>
        <article class="card plan-card featured">
          <div>
            <h3>Basic</h3>
            <p>Lo esencial para bodas elegantes.</p>
          </div>
          <ul>
            <li>2 plantillas</li>
            <li>Galeria limitada</li>
            <li>Dominio personalizado</li>
          </ul>
          <button class="btn btn-primary">Comprar Basic</button>
        </article>
        <article class="card plan-card">
          <div>
            <h3>Pro</h3>
            <p>Experiencia completa y muro de deseos.</p>
          </div>
          <ul>
            <li>Hasta 8 plantillas</li>
            <li>RSVP avanzado</li>
            <li>Musica libre</li>
          </ul>
          <button class="btn btn-ghost">Comprar Pro</button>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.plans {
  background: #fff;
  min-height: 70vh;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 32px;
}

.plan-card ul {
  padding-left: 18px;
  color: var(--muted);
}

.plan-card li {
  margin-bottom: 8px;
}

.plan-card.featured {
  border: 2px solid rgba(155, 107, 255, 0.4);
  box-shadow: var(--shadow-soft);
}

@media (max-width: 960px) {
  .plan-grid {
    grid-template-columns: 1fr;
  }
}
</style>

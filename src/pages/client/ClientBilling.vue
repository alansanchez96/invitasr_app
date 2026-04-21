<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <section class="client-page container" aria-labelledby="client-billing-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Pagos y comprobantes</p>
        <h1 id="client-billing-title">Mis facturaciones</h1>
        <p class="client-lead">
          Esta sección estará disponible en el próximo paso con historial de pagos, comprobantes y estado de facturación.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ir a configuración</BaseButton>
      </div>
    </header>

    <article class="bo-card empty-state">
      <h2>Próximamente</h2>
      <p>Aquí verás tus facturas, cobros y comprobantes descargables.</p>
    </article>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.client-page-head,
.empty-state {
  padding: 22px;
}

.client-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-page-head h1 {
  margin: 0;
}

.client-lead,
.empty-state p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  gap: 0.75rem;
}

.empty-state {
  border: 1px dashed rgba(155, 107, 255, 0.26);
}

.empty-state h2 {
  margin: 0 0 0.4rem;
  color: var(--brand-ink);
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn) {
    width: 100%;
  }
}
</style>

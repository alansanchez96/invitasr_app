<script setup lang="ts">
import { RouterLink } from 'vue-router'

type Kpi = {
  label: string
  value: string
  delta: string
  tone: 'up' | 'down' | 'neutral'
  footnote: string
}

type HealthMetric = {
  label: string
  value: number
  hint: string
}

type Activity = {
  title: string
  detail: string
  time: string
}

type Shortcut = {
  label: string
  description: string
  to: string
}

const kpis: Kpi[] = [
  {
    label: 'Clientes registrados',
    value: '248',
    delta: '+12%',
    tone: 'up',
    footnote: 'vs. ultimo mes',
  },
  {
    label: 'Invitaciones creadas',
    value: '3.420',
    delta: '+18%',
    tone: 'up',
    footnote: 'acumulado del trimestre',
  },
  {
    label: 'Eventos activos',
    value: '74',
    delta: '+6%',
    tone: 'up',
    footnote: 'con actividad en 7 dias',
  },
  {
    label: 'Tasa de confirmacion RSVP',
    value: '81%',
    delta: '-2%',
    tone: 'down',
    footnote: 'promedio general',
  },
]

const healthMetrics: HealthMetric[] = [
  {
    label: 'Onboarding completado',
    value: 78,
    hint: '194 de 248 clientes completaron configuracion inicial.',
  },
  {
    label: 'Pagos al dia',
    value: 86,
    hint: 'Suscripciones activas sin alertas de cobranza.',
  },
  {
    label: 'Eventos con plantilla activa',
    value: 64,
    hint: 'Eventos ya publicados con branding definido.',
  },
]

const recentActivity: Activity[] = [
  {
    title: 'Nuevo cliente activado',
    detail: 'Salon del Lago completo onboarding en plan Planner.',
    time: 'Hace 14 min',
  },
  {
    title: 'Pico de invitaciones enviadas',
    detail: 'Campana Boda Abril supero 380 invitaciones en 24h.',
    time: 'Hace 1 h',
  },
  {
    title: 'Pago aprobado',
    detail: 'Suscripcion mensual renovada para Estudio Nube.',
    time: 'Hace 2 h',
  },
  {
    title: 'Nuevo tipo de evento creado',
    detail: 'Se agrego el tipo "Evento corporativo premium".',
    time: 'Hoy, 09:12',
  },
]

const shortcuts: Shortcut[] = [
  {
    label: 'Ver clientes',
    description: 'Gestiona altas, estados y salud general de cada cliente.',
    to: '/backoffice/clients',
  },
  {
    label: 'Revisar pagos',
    description: 'Controla transacciones recientes y suscripciones pendientes.',
    to: '/backoffice/payments',
  },
  {
    label: 'Ajustar planes',
    description: 'Actualiza precios, creditos y propuestas comerciales.',
    to: '/backoffice/plans',
  },
  {
    label: 'Mapear features',
    description: 'Asigna funcionalidades por plan para mejorar conversion.',
    to: '/backoffice/plan-features',
  },
]
</script>

<template>
  <section class="dashboard-page container" aria-labelledby="dashboard-title">
    <header class="dashboard-head">
      <div>
        <h1 id="dashboard-title">Dashboard</h1>
        <p class="dashboard-lead">Resumen ejecutivo de crecimiento, operacion y conversion comercial.</p>
      </div>
      <span class="dashboard-badge">Actualizado hace 5 minutos</span>
    </header>

    <section class="kpi-grid" aria-label="Indicadores principales">
      <article v-for="item in kpis" :key="item.label" class="kpi-card">
        <span class="kpi-label">{{ item.label }}</span>
        <strong class="kpi-value">{{ item.value }}</strong>
        <p class="kpi-delta" :class="item.tone">
          <span>{{ item.delta }}</span>
          <small>{{ item.footnote }}</small>
        </p>
      </article>
    </section>

    <section class="dashboard-grid" aria-label="Salud y actividad">
      <article class="bo-card panel-card">
        <header class="panel-head">
          <h2>Salud de negocio</h2>
          <span class="bo-muted">Ultimos 30 dias</span>
        </header>
        <ul class="health-list">
          <li v-for="metric in healthMetrics" :key="metric.label" class="health-item">
            <div class="health-meta">
              <strong>{{ metric.label }}</strong>
              <span>{{ metric.value }}%</span>
            </div>
            <div class="health-track" role="progressbar" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="metric.value" :aria-label="metric.label">
              <span class="health-fill" :style="{ width: `${metric.value}%` }"></span>
            </div>
            <p>{{ metric.hint }}</p>
          </li>
        </ul>
      </article>

      <article class="bo-card panel-card">
        <header class="panel-head">
          <h2>Actividad reciente</h2>
          <span class="bo-muted">Tiempo real simulado</span>
        </header>
        <ol class="activity-list">
          <li v-for="entry in recentActivity" :key="entry.title + entry.time" class="activity-item">
            <div>
              <strong>{{ entry.title }}</strong>
              <p>{{ entry.detail }}</p>
            </div>
            <time>{{ entry.time }}</time>
          </li>
        </ol>
      </article>
    </section>

    <section class="bo-card shortcuts" aria-label="Accesos rapidos">
      <header class="panel-head">
        <h2>Acciones recomendadas</h2>
        <span class="bo-muted">Prioriza tareas de alto impacto</span>
      </header>
      <div class="shortcut-grid">
        <RouterLink v-for="shortcut in shortcuts" :key="shortcut.to" :to="shortcut.to" class="shortcut-card">
          <strong>{{ shortcut.label }}</strong>
          <p>{{ shortcut.description }}</p>
          <span>Ir al modulo</span>
        </RouterLink>
      </div>
    </section>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.dashboard-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.dashboard-head h1 {
  margin: 0;
}

.dashboard-lead {
  margin: 8px 0 0;
  color: #6b6b80;
  font-size: 14px;
}

.dashboard-badge {
  border-radius: 999px;
  border: 1px solid #e2ddf7;
  background: #fbfaff;
  color: #6b21a8;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 12px;
  white-space: nowrap;
}

.kpi-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-card);
  display: grid;
  gap: 8px;
}

.kpi-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.kpi-value {
  font-size: 28px;
  color: #1f2937;
  line-height: 1;
}

.kpi-delta {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.kpi-delta small {
  font-size: 11px;
  font-weight: 600;
  color: #6b6b80;
}

.kpi-delta.up {
  color: #0f766e;
}

.kpi-delta.down {
  color: #b91c1c;
}

.kpi-delta.neutral {
  color: #4c1d95;
}

.dashboard-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
}

.panel-card {
  display: grid;
  gap: 14px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
}

.health-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

.health-item {
  display: grid;
  gap: 8px;
}

.health-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.health-meta strong {
  color: #1f2937;
}

.health-meta span {
  color: #6b21a8;
  font-weight: 700;
}

.health-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #f1ecff;
  overflow: hidden;
}

.health-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--gradient-brand);
}

.health-item p {
  margin: 0;
  color: #6b6b80;
  font-size: 12px;
}

.activity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.activity-item {
  border: 1px solid #ece7f8;
  background: #fcfaff;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.activity-item strong {
  font-size: 13px;
  color: #1f2937;
}

.activity-item p {
  margin: 4px 0 0;
  color: #6b6b80;
  font-size: 12px;
}

.activity-item time {
  justify-self: end;
  font-size: 11px;
  color: #7c3aed;
  font-weight: 700;
}

.shortcuts {
  display: grid;
  gap: 14px;
}

.shortcut-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.shortcut-card {
  border: 1px solid #e6e8f0;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  display: grid;
  gap: 8px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.shortcut-card:hover {
  border-color: #d7c6ff;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(122, 79, 217, 0.14);
}

.shortcut-card strong {
  color: #1f2937;
  font-size: 14px;
}

.shortcut-card p {
  margin: 0;
  color: #6b6b80;
  font-size: 12px;
}

.shortcut-card span {
  font-size: 12px;
  font-weight: 700;
  color: #6b21a8;
}

.bo-muted {
  color: #6b6b80;
  font-size: 12px;
  font-weight: 600;
}

.bo-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 18px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

@media (max-width: 1010px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .shortcut-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-page {
    gap: 16px;
  }

  .bo-card,
  .kpi-card {
    padding: 14px;
  }

  .shortcut-grid,
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>

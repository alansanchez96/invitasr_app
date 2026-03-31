<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="public-footer">
    <div class="container footer-shell">
      <section class="footer-hero" aria-label="Resumen de marca">
        <img src="/brand/logo-transparent.png" alt="InvitaSR" class="footer-logo" />
        <p>
          Convierte tu evento en una experiencia memorable con invitaciones digitales
          personalizadas y una administracion simple para tu equipo.
        </p>
        <a class="footer-cta" href="/planes">Ver planes y activar cuenta</a>
      </section>

      <div class="footer-columns">
        <nav class="footer-col" aria-label="Producto">
          <h3>Producto</h3>
          <a href="/#como-funciona">Como funciona</a>
          <a href="/#demo">Demo</a>
          <a href="/#inspiracion">Inspiracion</a>
          <a href="/planes">Planes</a>
        </nav>

        <nav class="footer-col" aria-label="Ayuda">
          <h3>Ayuda</h3>
          <a href="/#faq">Preguntas frecuentes</a>
          <a href="/noticias">Novedades</a>
          <a href="/#planes">Empezar ahora</a>
        </nav>

        <section class="footer-col footer-col-contact" aria-label="Contacto">
          <h3>Contacto</h3>
          <a href="mailto:hola@invitasr.com">hola@invitasr.com</a>
          <span>Atencion comercial: Lun a Vie · 9 a 18 hs</span>
          <small>InvitaSR · Diseñado para escalar eventos con una experiencia premium.</small>
        </section>
      </div>

      <div class="footer-bottom">
        <span>© {{ currentYear }} InvitaSR. Todos los derechos reservados.</span>
        <div class="footer-legal">
          <a href="#">Privacidad</a>
          <a href="#">Terminos</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.public-footer {
  padding: 52px 0 84px;
  background: radial-gradient(circle at 0% 0%, rgba(155, 107, 255, 0.12), transparent 46%), #fff;
  border-top: 1px solid var(--border);
}

.footer-shell {
  border: 1px solid rgba(233, 220, 255, 0.8);
  border-radius: 22px;
  background: linear-gradient(145deg, #fff, #faf6ff);
  padding: 24px;
  display: grid;
  gap: 24px;
  box-shadow: var(--shadow-card);
}

.footer-hero {
  display: grid;
  gap: 12px;
}

.footer-logo {
  width: 150px;
}

.footer-hero p {
  margin: 0;
  color: #5f4f78;
  max-width: 70ch;
}

.footer-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.footer-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(122, 79, 217, 0.24);
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.footer-col {
  display: grid;
  gap: 8px;
  align-content: start;
}

.footer-col h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: #302044;
}

.footer-col a,
.footer-col span,
.footer-col small {
  color: #6f6188;
  font-size: 14px;
}

.footer-col a {
  font-weight: 600;
  width: fit-content;
}

.footer-col a:hover {
  color: #5f2ec8;
}

.footer-col-contact small {
  margin-top: 6px;
  display: block;
  color: #8a7ba3;
}

.footer-bottom {
  border-top: 1px solid #eee5fb;
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #7b6f95;
  font-size: 13px;
}

.footer-legal {
  display: flex;
  gap: 14px;
}

.footer-legal a {
  font-weight: 600;
}

.footer-legal a:hover {
  color: #5f2ec8;
}

@media (max-width: 720px) {
  .footer-columns {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 420px) {
  .public-footer {
    padding: 40px 0 70px;
  }

  .footer-shell {
    padding: 16px;
    border-radius: 16px;
  }
}
</style>

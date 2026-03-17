<template>
    <footer class="public-footer">
        <div class="container footer-content">
            <div>
                <strong>InvitaSR</strong>
                <p>Invitaciones digitales con RSVP y pagos integrados.</p>
            </div>
            <div class="footer-links">
                <a href="#planes">Planes</a>
                <a href="#faq">FAQ</a>
                <a href="#demo">Demo</a>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.public-footer {
    padding: 48px 0 64px;
    background: #fff;
    border-top: 1px solid var(--border);
}

.footer-content {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    color: var(--muted);
}

.footer-links {
    display: flex;
    gap: 18px;
    font-weight: 600;
}

.footer-links a {
    color: var(--text);
}

@media (max-width: 720px) {
    .footer-content {
        flex-direction: column;
    }
}
</style>

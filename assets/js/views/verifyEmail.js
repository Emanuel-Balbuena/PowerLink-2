// js/views/verifyEmail.js

export async function renderVerifyEmail(container) {
    const html = `
    <section class="section d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card animate__animated animate__fadeInUp" style="max-width: 420px; width: 100%; background-color: var(--surface-color); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div class="card-body p-5 text-center">
          
          <i class="bi bi-check-circle-fill fs-1 mb-4 text-success"></i>
          
          <h3 class="fw-bold text-white mb-2">¡Correo Verificado con Éxito!</h3>
          <p class="text-white opacity-75 small mb-4">
            Tu cuenta ha sido activada. Ahora puedes iniciar sesión con tus credenciales.
          </p>

          <a href="#login" class="btn btn-lg btn-success fw-bold" style="border: none;">
            Ir a Iniciar Sesión
          </a>
          
        </div>
      </div>
    </section>
    `;

    container.innerHTML = html;
}
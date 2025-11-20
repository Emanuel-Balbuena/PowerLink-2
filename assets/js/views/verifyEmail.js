// js/views/verifyEmail.js
import { Notificaciones } from "../notificaciones.js";

export async function renderVerifyEmail(container) {
  // DISEÑO DE "CEBO": Parece que falta un paso, obligando al clic.
  const html = `
    <section class="section d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card animate__animated animate__fadeInUp" style="max-width: 420px; width: 100%; background-color: var(--surface-color); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div class="card-body p-5 text-center" id="verify-content">
          
          <i class="bi bi-envelope-exclamation-fill fs-1 mb-4 text-info"></i>
          
          <h3 class="fw-bold text-white mb-2">Validar Cuenta</h3>
          <p class="text-white opacity-75 small mb-4">
            Para garantizar tu seguridad, por favor confirma la validación de tu correo electrónico para acceder al sistema.
          </p>

          <button id="btn-confirm-verify" class="btn btn-lg btn-info fw-bold w-100 text-white" style="border: none;">
            Validar y Acceder
          </button>
          
        </div>
      </div>
    </section>
    `;

  container.innerHTML = html;

  // Lógica del "Cebo"
  document
    .getElementById("btn-confirm-verify")
    .addEventListener("click", async function () {
      const btn = this;
      const contentDiv = document.getElementById("verify-content");

      // 1. Estado de carga
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Validando...';

      // Simulamos un pequeño proceso (psicología del usuario)
      setTimeout(() => {
        // 2. LIMPIEZA REAL: Aquí borramos la memoria para que nunca más vuelva a salir
        localStorage.removeItem("auth_pending_action");

        // 3. Cambio visual a ÉXITO
        contentDiv.innerHTML = `
                <i class="bi bi-check-circle-fill fs-1 mb-4 text-success animate__animated animate__bounceIn"></i>
                <h3 class="fw-bold text-white mb-2">¡Cuenta Verificada!</h3>
                <p class="text-white opacity-75 small">Redirigiendo al Dashboard...</p>
            `;

        // 4. Redirección automática
        setTimeout(() => {
          window.location.hash = "#dashboard";
          // Recarga opcional para asegurar limpieza del AppShell
          // window.location.reload();
        }, 2000);
      }, 1000);
    });
}

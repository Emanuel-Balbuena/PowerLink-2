// js/views/resetPassword.js
import { api } from "../api.js";
import { Notificaciones } from "../notificaciones.js";

export async function renderResetPassword(container) {
  const html = `
    <section class="section d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card animate__animated animate__fadeInUp" style="max-width: 420px; width: 100%; background-color: var(--surface-color); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div class="card-body p-5 text-center">
          
          <i class="bi bi-key-fill fs-1 mb-4 text-warning"></i>
          
          <h3 class="fw-bold text-white mb-2">Nueva Contraseña</h3>
          <p class="text-white opacity-75 small">
            Crea una nueva clave segura para tu cuenta.
          </p>

          <form id="password-change-form" class="mt-4">
            <div class="mb-3">
              <input type="password" class="form-control bg-dark text-white border-secondary" id="input-new-password" placeholder="Nueva Contraseña" minlength="6" required>
            </div>
            <div class="mb-4">
              <input type="password" class="form-control bg-dark text-white border-secondary" id="input-confirm-password" placeholder="Confirmar Contraseña" minlength="6" required>
            </div>
            
            <div class="d-grid">
              <button type="submit" class="btn btn-lg fw-bold text-dark" style="background-color: var(--yellow-accent); border: none;">
                Actualizar Contraseña
              </button>
            </div>
          </form>

        </div>
      </div>
    </section>
    `;

  container.innerHTML = html;
  setupListeners();
}

function setupListeners() {
  // Usamos la misma lógica que tu formulario interno que sí funcionaba
  const form = document.getElementById("password-change-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p1 = document.getElementById("input-new-password").value;
    const p2 = document.getElementById("input-confirm-password").value;
    const btn = form.querySelector("button");

    if (p1 !== p2)
      return Notificaciones.mostrar("Las contraseñas no coinciden", "error");
    if (p1.length < 6)
      return Notificaciones.mostrar("Mínimo 6 caracteres", "error");

    try {
      btn.disabled = true;
      btn.innerText = "Guardando...";

      // Actualizamos contraseña
      const { error } = await api.auth.updatePassword(p1);
      if (error) throw error;

      Notificaciones.mostrar("Contraseña actualizada con éxito", "success");

      // 1. LIMPIEZA CRÍTICA: Borramos la bandera para no volver aquí
      localStorage.removeItem("auth_pending_action");

      // 2. Redirigimos al Dashboard (porque Supabase ya mantiene la sesión iniciada)
      setTimeout(() => {
        window.location.hash = "#dashboard";
        // Recargamos para asegurar que se restaure el AppShell
        window.location.reload();
      }, 1500);
    } catch (err) {
      Notificaciones.mostrar("Error: " + err.message, "error");
      btn.disabled = false;
      btn.innerText = "Actualizar Contraseña";
    }
  });
}

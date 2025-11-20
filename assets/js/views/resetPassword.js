// js/views/resetPassword.js

import { api } from '../api.js';
import { Notificaciones } from '../notificaciones.js';

export async function renderResetPassword(container) {
    const html = `
    <section class="section d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card animate__animated animate__fadeInUp" style="max-width: 420px; width: 100%; background-color: var(--surface-color); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div class="card-body p-5 text-center">
          
          <i class="bi bi-shield-lock-fill fs-1 mb-4 text-warning"></i>
          
          <h3 class="fw-bold text-white mb-2">Establece tu Nueva Contraseña</h3>
          <p class="text-white opacity-75 small">
            Ingresa tu nueva clave de acceso para continuar. Asegúrate de que tenga al menos 6 caracteres.
          </p>

          <form id="reset-password-form" class="mt-4">
            <div class="mb-3">
              <input type="password" class="form-control bg-dark text-white border-secondary" id="reset-new-password" placeholder="Nueva Contraseña" minlength="6" required>
            </div>
            <div class="mb-4">
              <input type="password" class="form-control bg-dark text-white border-secondary" id="reset-confirm-password" placeholder="Confirma Contraseña" minlength="6" required>
            </div>
            
            <div class="d-grid">
              <button type="submit" class="btn btn-lg btn-primary fw-bold" style="background-color: var(--accent-color); border: none;">
                Guardar Nueva Contraseña
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
    const form = document.getElementById('reset-password-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('reset-new-password').value;
        const confirmPass = document.getElementById('reset-confirm-password').value;
        const btn = form.querySelector('button');

        if (newPass !== confirmPass) {
            return Notificaciones.mostrar("Las contraseñas no coinciden.", "error");
        }
        if (newPass.length < 6) {
            return Notificaciones.mostrar("La contraseña debe tener al menos 6 caracteres.", "error");
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';

        try {
            // Llama a la función de API para actualizar la contraseña
            // Supabase usa el token de la URL para saber qué usuario actualizar.
            const { error } = await api.auth.updatePassword(newPass);

            if (error) {
                throw error;
            }

            Notificaciones.mostrar("Contraseña actualizada correctamente. ¡Inicia sesión!", "success");
            // Redirigir al login
            window.location.hash = "#login"; 

        } catch (err) {
            Notificaciones.mostrar("Error al actualizar contraseña: " + err.message, "error");
            btn.disabled = false;
            btn.innerText = "Guardar Nueva Contraseña";
        }
    });
}
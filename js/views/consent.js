/**
 * js/views/consent.js
 * Pantalla de Consentimiento OAuth 2.0 (Dark Mode)
 * Autorización para Alexa / Google Home
 */
import { api } from '../api.js';
import { Notificaciones } from '../notificaciones.js';


export async function renderConsent(container) {
    // 1. Obtener parámetros de la URL (Query Params)
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id') || '';
    const state = urlParams.get('state');
    const redirectUri = urlParams.get('redirect_uri');
    const scope = urlParams.get('scope') || 'control_devices';

    // 2. Detectar Cliente (Google vs Alexa) para estilo visual
    let clientName = 'Aplicación Externa';
    let clientIcon = 'bi-robot';
    let clientColor = '#6c757d'; // Gris default

    if (clientId.includes('google')) {
        clientName = 'Google Home';
        clientIcon = 'bi-google';
        clientColor = '#4285F4'; // Azul Google
    } else if (clientId.includes('alexa')) {
        clientName = 'Amazon Alexa';
        clientIcon = 'bi-speaker'; // Icono genérico si no hay bi-alexa
        clientColor = '#00CAFF'; // Cian Alexa
    }

    // 3. Template HTML
    const html = `
    <section class="section d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      
      <div class="card animate__animated animate__fadeInUp" style="max-width: 420px; width: 100%; background-color: var(--surface-color); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div class="card-body p-5 text-center">
          
          <div class="d-flex align-items-center justify-content-center mb-4">
             <div class="rounded-circle d-flex align-items-center justify-content-center" 
                  style="width: 60px; height: 60px; background: rgba(5, 99, 187, 0.2); color: var(--accent-color); border: 2px solid var(--accent-color);">
                <i class="bi bi-lightning-charge-fill fs-2"></i>
             </div>
             
             <div style="height: 2px; width: 40px; background: rgba(255,255,255,0.2); position: relative;">
                <i class="bi bi-arrow-right-circle-fill position-absolute top-50 start-50 translate-middle text-muted" style="font-size: 1.2rem;"></i>
             </div>

             <div class="rounded-circle d-flex align-items-center justify-content-center" 
                  style="width: 60px; height: 60px; background: ${clientColor}20; color: ${clientColor}; border: 2px solid ${clientColor};">
                <i class="bi ${clientIcon} fs-2"></i>
             </div>
          </div>
          
          <h3 class="fw-bold text-white mb-2">Solicitud de Acceso</h3>
          <p style="color: rgba(255,255,255,0.7); font-size: 0.95rem;">
            <strong style="color: ${clientColor};">${clientName}</strong> quiere conectar con tu cuenta de PowerLink2.
          </p>

          <div class="text-start my-4 p-3 rounded" style="background-color: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);">
             <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Permisos solicitados:</small>
             <ul class="list-unstyled mt-2 mb-0" style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">
                <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i> Ver tus dispositivos y estado</li>
                <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i> Encender y apagar equipos</li>
                <li><i class="bi bi-check-circle-fill text-success me-2"></i> Leer consumo de energía</li>
             </ul>
          </div>

          <form id="consent-form">
            <input type="hidden" name="client_id" value="${clientId}">
            <input type="hidden" name="state" value="${state || ''}">
            <input type="hidden" name="redirect_uri" value="${redirectUri || ''}">
            
            <div class="d-grid gap-3">
              <button type="submit" class="btn btn-lg btn-primary fw-bold" style="background-color: var(--accent-color); border: none;">
                Autorizar Acceso
              </button>
              <a href="#settings" class="btn btn-outline-light" style="opacity: 0.7;">Cancelar</a>
            </div>
          </form>

          <div id="consent-loading" class="mt-4 d-none">
             <div class="spinner-border text-primary" role="status"></div>
             <p class="small mt-2 text-muted">Vinculando cuentas de forma segura...</p>
          </div>

          <div class="mt-4 pt-3 border-top border-secondary">
             <small class="text-muted" style="font-size: 0.75rem;">
                Al autorizar, aceptas los <a href="#" class="text-decoration-none">Términos de Servicio</a> de PowerLink2.
             </small>
          </div>

        </div>
      </div>
    </section>
    `;

    container.innerHTML = html;

    // Listener del Formulario
    document.getElementById('consent-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loading = document.getElementById('consent-loading');
        const form = document.getElementById('consent-form');
        const btn = form.querySelector('button');
        
        // UI Feedback
        btn.disabled = true;
        form.style.opacity = '0.5';
        loading.classList.remove('d-none');

        try {
            const response = await api.integrations.approveConsent({
                client_id: clientId,
                state: state,
                redirect_uri: redirectUri,
                allow: true
            });

            if (response && response.redirect_to) {
                // Éxito: Redirigir de vuelta a Google/Alexa
                console.log("Redirigiendo a:", response.redirect_to);
                window.location.href = response.redirect_to;
            } else {
                throw new Error("Respuesta inválida del servidor de autenticación.");
            }
        } catch (error) {
            console.error(error);
            Notificaciones.mostrar("Error de vinculación: " + error.message, "error");
            form.style.opacity = '1';
            loading.classList.add('d-none');
            btn.disabled = false;
        }
    });
}
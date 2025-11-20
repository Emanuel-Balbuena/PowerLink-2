/**
 * js/app.js
 * Lógica central: Auth, Navegación y Notificaciones
 * Versión Final: Limpia (Sin inyección de estilos)
 */
import { api } from './api.js';
import { handleRouting } from './router.js';
import { Notificaciones } from './notificaciones.js';

// Elementos DOM globales
const authView = document.getElementById("auth-view");
const appShell = document.getElementById("app-shell");
const preloader = document.getElementById("preloader");

let isAppInitialized = false;

function init() {
  // --- LISTENER DE ESTADO DE SESIÓN ---
  api.auth.onAuthStateChange((event, session) => {

    // Preloader
    if (preloader && !preloader.classList.contains('loaded')) {
      preloader.style.opacity = '0';
      preloader.classList.add('loaded');
      setTimeout(() => preloader.remove(), 500);
    }

    // CASO: Usuario Logueado
    if (session) {
      if (isAppInitialized && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) return;
      isAppInitialized = true;

      if (authView) {
        authView.classList.add("d-none");
        // Removemos d-block o d-flex si lo tuviera para evitar conflictos
        authView.style.display = 'none';
      }
      if (appShell) appShell.classList.remove("d-none");

      handleRouting();
      startNotificationService();
      setupNotificationListener();
      setupMobileNav();

    } else {
      // CASO: Usuario Desconectado
      isAppInitialized = false;
      if (authView) {
        authView.classList.remove("d-none");
        authView.style.display = ''; // Restaurar display original (block/flex según CSS)
      }
      if (appShell) appShell.classList.add("d-none");
      stopNotificationService();
    }
  });

  // Navegación
  window.addEventListener('hashchange', handleRouting);

  // Inicializar lógica de la vista
  setupAuthForms();
  setupPasswordToggles();
}

// --- 1. LÓGICA DE FORMULARIOS ---
function setupAuthForms() {

  // A) LOGIN
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-password").value;
      const btn = loginForm.querySelector('button');

      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';

        const { error } = await api.auth.login(email, pass);
        if (error) throw error;

      } catch (err) {
        Notificaciones.mostrar("Error de acceso: " + err.message, "error");
        btn.disabled = false;
        btn.innerText = "Ingresar";
      }
    });
  }

  // B) REGISTRO
  const regForm = document.getElementById("register-form");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("register-email").value;
      const pass = document.getElementById("register-password").value;
      const confirm = document.getElementById("register-password-confirm").value;

      if (pass !== confirm) return Notificaciones.mostrar("Las contraseñas no coinciden", "error");

      const btn = regForm.querySelector('button');
      try {
        btn.disabled = true; btn.innerText = "Registrando...";
        const { error } = await api.auth.register(email, pass);
        if (error) throw error;

        Notificaciones.mostrar("¡Cuenta creada! Por favor inicia sesión.", "success");
        window.location.reload();

      } catch (err) {
        Notificaciones.mostrar("Error: " + err.message, "error");
        btn.disabled = false; btn.innerText = "Registrarse";
      }
    });
  }

  // C) RECUPERAR CONTRASEÑA (Solicitud)
  const forgotForm = document.getElementById("forgot-password-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("recovery-email").value;
      const btn = forgotForm.querySelector('button');

      try {
        btn.disabled = true; btn.innerText = "Enviando...";
        await api.auth.recoverPassword(email);
        Notificaciones.mostrar("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.", "info");
        const modalEl = document.getElementById('forgotPasswordModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

      } catch (err) {
        Notificaciones.mostrar("Error: " + err.message, "error");
      } finally {
        btn.disabled = false; btn.innerText = "Enviar Enlace";
      }
    });
  }

  // D) NUEVA CONTRASEÑA (Reset)
  const newPassForm = document.getElementById("new-password-form");
  if (newPassForm) {
    newPassForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass = document.getElementById("new-password-final").value;
      const btn = newPassForm.querySelector('button');

      try {
        btn.disabled = true; btn.innerText = "Guardando...";
        await api.auth.updatePassword(newPass);
        Notificaciones.mostrar("Contraseña actualizada correctamente. Bienvenido.", "success");
        const modalEl = document.getElementById('resetPasswordModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        window.location.hash = "#dashboard";

      } catch (err) {
        Notificaciones.mostrar("Error al actualizar: " + err.message, "error");
        btn.disabled = false; btn.innerText = "Guardar y Entrar";
      }
    });
  }

  // E) LOGOUT
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await api.auth.logout();
      window.location.hash = "";
      window.location.reload();
    });
  }
}

// --- 2. UTILIDADES ---

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
      const inputId = icon.dataset.target;
      const input = document.getElementById(inputId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      } else {
        input.type = 'password';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
      }
    });
  });
}

// --- 3. MENÚ MÓVIL ---
function setupMobileNav() {
  const mobileNavToggleBtn = document.querySelector('.header-toggle');
  if (mobileNavToggleBtn && !mobileNavToggleBtn.dataset.listening) {
    mobileNavToggleBtn.dataset.listening = "true";

    mobileNavToggleBtn.addEventListener('click', function () {
      document.querySelector('body').classList.toggle('mobile-nav-active');
      document.querySelector('#header').classList.toggle('header-show');
      this.classList.toggle('bi-list');
      this.classList.toggle('bi-x');
    });

    document.querySelectorAll('#navmenu a').forEach(navLink => {
      navLink.addEventListener('click', () => {
        if (document.querySelector('.mobile-nav-active')) {
          document.querySelector('body').classList.remove('mobile-nav-active');
          document.querySelector('#header').classList.remove('header-show');
          mobileNavToggleBtn.classList.remove('bi-x');
          mobileNavToggleBtn.classList.add('bi-list');
        }
      });
    });
  }
}

// --- 4. NOTIFICACIONES ---
let notificationInterval = null;
let cachedAlerts = [];

function setupNotificationListener() {
  const myOffcanvas = document.getElementById('offcanvasNotifications');
  if (myOffcanvas) {
    myOffcanvas.addEventListener('show.bs.offcanvas', renderNotificationsPanel);
  }
}

function startNotificationService() {
  checkAlerts();
  if (notificationInterval) clearInterval(notificationInterval);
  notificationInterval = setInterval(checkAlerts, 60000);
}

function stopNotificationService() {
  if (notificationInterval) clearInterval(notificationInterval);
}

async function checkAlerts() {
  try {
    const alerts = await api.alerts.list();
    const badge = document.getElementById('notification-badge');

    if (alerts && alerts.length > 0) {
      if (badge) badge.classList.remove('d-none');
    } else {
      if (badge) badge.classList.add('d-none');
    }
    cachedAlerts = alerts || [];
  } catch (error) { console.warn("Polling error", error); }
}

async function renderNotificationsPanel() {
  const container = document.getElementById('notification-list');
  if (!container) return;

  container.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-primary"></div></div>';

  let alerts = cachedAlerts;
  if (!alerts || alerts.length === 0) {
    try { alerts = await api.alerts.list(); } catch (e) { /* ignore */ }
  }

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-bell-slash" style="font-size: 2.5rem; color: rgba(255,255,255,0.2);"></i>
                <p class="mt-3" style="color: rgba(255,255,255,0.5);">No hay alertas pendientes.</p>
            </div>`;
    return;
  }

  container.innerHTML = alerts.map(alert => `
        <div class="list-group-item py-3" style="background: transparent; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div class="d-flex justify-content-between align-items-start">
                <div class="me-2">
                    <h6 class="mb-1 text-light">${getAlertIcon(alert.tipo_alerta)} ${formatAlertType(alert.tipo_alerta)}</h6>
                    <p class="mb-1 small" style="color: rgba(255,255,255,0.7);">${alert.mensaje}</p>
                    <small style="font-size: 0.75rem; color: rgba(255,255,255,0.3);">${new Date(alert.fecha_creacion).toLocaleString()}</small>
                </div>
                <button class="btn btn-sm text-success btn-check-read" data-id="${alert.id_alerta}"><i class="bi bi-check-circle fs-5"></i></button>
            </div>
        </div>
    `).join('');

  container.querySelectorAll('.btn-check-read').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        btn.closest('.list-group-item').style.opacity = '0.3';
        await api.alerts.markAsRead(btn.dataset.id);
        cachedAlerts = cachedAlerts.filter(a => a.id_alerta !== btn.dataset.id);
        if (cachedAlerts.length === 0) renderNotificationsPanel(); else btn.closest('.list-group-item').remove();
        const badge = document.getElementById('notification-badge');
        if (cachedAlerts.length === 0 && badge) badge.classList.add('d-none');
      } catch (err) { console.error(err); }
    });
  });
}

function getAlertIcon(t) { const i = { 'PICO_CONSUMO': '⚡', 'VAMPIRO': '🧛', 'OFFLINE': '🔌', 'ERROR': '⚠️' }; return i[t] || 'ℹ️'; }
function formatAlertType(t) { return t ? t.replace(/_/g, ' ') : 'Alerta'; }

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
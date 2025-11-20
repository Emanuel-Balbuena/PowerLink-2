/**
 * js/views/settings.js
 * Configuración Avanzada: Tarifas CFE, Perfil Completo e Integraciones
 * Versión 3.3: FIX NAVEGACIÓN (Lógica Manual idéntica a Devices)
 */
import { api } from "../api.js";
import { Notificaciones } from "../notificaciones.js";

export async function renderSettings(container) {
const deleteAccountModalHTML = `
    <div class="modal fade" id="deleteAccountModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content bg-dark border border-danger shadow-lg">
          
          <div class="modal-header border-bottom border-danger">
            <h5 class="modal-title text-danger fw-bold"><i class="bi bi-person-x-fill me-2"></i> ¡ALERTA! Eliminación de Cuenta</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>

          <div class="modal-body p-4">
            
            <p class="text-white fw-bold mb-3">Estás a punto de eliminar tu cuenta de forma <span class="text-danger">PERMANENTE</span>.</p>
            
            <div class="alert alert-danger p-3 mb-4 border-0" style="background-color: rgba(220, 53, 69, 0.1);">
                <span class="small text-white">
                    Se borrarán todos tus dispositivos, grupos, historial de consumo y configuraciones. No habrá forma de recuperar la información.
                </span>
            </div>

            <form id="confirm-delete-account-form">
                <div class="mb-3">
                    <label for="delete-account-password" class="form-label small text-white opacity-75">
                        Para confirmar, ingresa tu contraseña:
                    </label>
                    <input type="password" class="form-control bg-dark text-white border-secondary" id="delete-account-password" required>
                </div>
                
                <div class="d-grid gap-2 mt-4">
                    <button type="submit" class="btn btn-danger btn-lg" id="btn-confirm-delete-final">
                        <i class="bi bi-trash me-2"></i> Borrar Cuenta Permanentemente
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        Cancelar
                    </button>
                </div>
            </form>

          </div>
        </div>
      </div>
    </div>
`;

  const html = `
    <section class="section">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <h2 style="color: #ffffff;">Configuración Global</h2>
        <p style="color: rgba(255,255,255,0.7);">Control total sobre tu cuenta y finanzas energéticas.</p>
      </div>

      <div class="container">
        
        <div class="d-flex justify-content-center mb-4">
            <div class="btn-group" role="group">
                
                <input type="radio" class="btn-check" name="settings-nav" id="btn-tab-perfil" autocomplete="off" checked>
                <label class="btn btn-outline-primary px-4" for="btn-tab-perfil">
                    <i class="bi bi-person-vcard me-2"></i> Mi Perfil
                </label>

                <input type="radio" class="btn-check" name="settings-nav" id="btn-tab-costos" autocomplete="off">
                <label class="btn btn-outline-primary px-4" for="btn-tab-costos">
                    <i class="bi bi-cash-coin me-2"></i> Tarifas
                </label>

                <input type="radio" class="btn-check" name="settings-nav" id="btn-tab-integraciones" autocomplete="off">
                <label class="btn btn-outline-primary px-4" for="btn-tab-integraciones">
                    <i class="bi bi-router me-2"></i> Smart Home
                </label>

            </div>
        </div>

        <div class="tab-content animate__animated animate__fadeIn">
            
            <div class="tab-pane fade show active" id="tab-perfil">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        
                        <div class="card mb-4" style="background-color: var(--surface-color); border: none;">
                            <div class="card-body p-4">
                                <h5 class="card-title text-white mb-4"><i class="bi bi-emoji-smile me-2"></i> Identidad</h5>
                                <form id="profile-info-form">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label small text-light opacity-75">Nombre para mostrar</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="input-display-name" placeholder="Tu nombre">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small text-light opacity-75">Correo Electrónico</label>
                                            <input type="email" class="form-control bg-dark text-light border-secondary" id="input-email-readonly" disabled>
                                        </div>
                                    </div>
                                    <div class="text-end mt-3">
                                        <button type="submit" class="btn btn-sm btn-outline-primary">Actualizar Nombre</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div class="card mb-4" style="background-color: var(--surface-color); border: none;">
                            <div class="card-body p-4">
                                <h5 class="card-title text-white mb-4"><i class="bi bi-shield-lock me-2"></i> Contraseña</h5>
                                <form id="password-change-form">
                                    <div class="row g-3 align-items-end">
                                        <div class="col-md-5">
                                            <label class="form-label small text-light opacity-75">Nueva Contraseña</label>
                                            <input type="password" class="form-control bg-dark text-light border-secondary" id="input-new-password" minlength="6">
                                        </div>
                                        <div class="col-md-5">
                                            <label class="form-label small text-light opacity-75">Confirmar</label>
                                            <input type="password" class="form-control bg-dark text-light border-secondary" id="input-confirm-password">
                                        </div>
                                        <div class="col-md-2">
                                            <button type="submit" class="btn btn-primary w-100">Cambiar</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div class="card border-danger bg-transparent" style="border-style: dashed;">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="text-danger fw-bold mb-1"><i class="bi bi-exclamation-triangle-fill me-2"></i> Zona de Peligro</h6>
                                        <p class="small text-muted mb-0" style="--bs-text-opacity: 1; color: rgb(255 255 255 / 75%) !important;">Eliminar tu cuenta borrará todos tus dispositivos.</p>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger" id="btn-delete-account">Eliminar Cuenta</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div class="tab-pane fade" id="tab-costos">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card" style="background-color: var(--surface-color); border: none;">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white mb-4 border-bottom border-secondary pb-2">Configuración Tarifaria</h4>
                                
                                <form id="settings-cost-form">
                                    
                                    <div class="row g-3 mb-4">
                                        <div class="col-md-6">
                                            <label class="form-label small text-light opacity-75">Moneda</label>
                                            <select class="form-select bg-dark text-light border-secondary" id="input-currency">
                                                <option value="MXN">MXN ($ Peso Mexicano)</option>
                                                <option value="USD">USD ($ Dólar)</option>
                                                <option value="EUR">EUR (€ Euro)</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small text-light opacity-75">Presupuesto Mensual (Meta)</label>
                                            <div class="input-group">
                                                <span class="input-group-text bg-dark text-secondary border-secondary">$</span>
                                                <input type="number" class="form-control bg-dark text-light border-secondary" id="input-budget" placeholder="Ej. 1000">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="p-3 rounded mb-4" style="background-color: rgba(0,0,0,0.2);">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" role="switch" id="toggle-cfe-mode" style="width: 3em; height: 1.5em; margin-right: 10px; cursor: pointer;">
                                            <label class="form-check-label pt-1" for="toggle-cfe-mode">
                                                <strong class="text-white">Habilitar Tarifa Escalonada (Tipo CFE)</strong>
                                                <div class="small text-muted">Activa esto si tu costo por kWh sube después de cierto consumo.</div>
                                            </label>
                                        </div>
                                    </div>

                                    <div id="pricing-inputs-container"></div>

                                    <div class="text-end mt-4 pt-3 border-top border-secondary">
                                        <button type="submit" class="btn btn-lg btn-primary w-100 w-md-auto" id="btn-save-settings" style="background-color: var(--accent-color);">
                                            <i class="bi bi-save me-2"></i> Guardar Configuración
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-pane fade" id="tab-integraciones">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card" style="background-color: var(--surface-color); border: none;">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white mb-4">Asistentes de Voz</h4>
                                <div id="integrations-list" class="row g-3">
                                    <div class="col-12 text-center py-5">
                                        <div class="spinner-border text-primary" role="status"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </section>
    `;

  container.innerHTML = html + deleteAccountModalHTML;

  // INICIALIZACIONES
  setupTabsLogic(); // <--- AQUÍ ESTÁ LA CLAVE NUEVA
  setupListeners();
  renderPricingInputs(false);

  try {
    await Promise.all([loadUserProfile(), loadCurrentSettings()]);
  } catch (e) {
    console.error("Error cargando datos iniciales:", e);
    Notificaciones.mostrar("Error cargando datos iniciales.", "error");
  }
}

// --- NUEVA FUNCIÓN: Lógica Manual de Pestañas (Igual que Devices.js) ---
function setupTabsLogic() {
  const tabs = [
    { btn: "btn-tab-perfil", panel: "tab-perfil" },
    { btn: "btn-tab-costos", panel: "tab-costos" },
    {
      btn: "btn-tab-integraciones",
      panel: "tab-integraciones",
      onShow: loadIntegrationsStatus,
    },
  ];

  tabs.forEach((tab) => {
    const btnEl = document.getElementById(tab.btn);

    if (btnEl) {
      btnEl.addEventListener("change", () => {
        if (btnEl.checked) {
          // 1. Ocultar todos
          tabs.forEach((t) => {
            const p = document.getElementById(t.panel);
            if (p) p.classList.remove("show", "active");
          });

          // 2. Mostrar actual
          const currentPanel = document.getElementById(tab.panel);
          if (currentPanel) {
            currentPanel.classList.add("show", "active");
            // Disparar evento especial si existe (para integraciones)
            if (tab.onShow) tab.onShow();
          }
        }
      });
    }
  });
}
// ----------------------------------------------------------------------

// (El resto del código sigue igual: renderPricingInputs, loadUserProfile, etc...)
// --- 1. UI DINÁMICA ---

function renderPricingInputs(isTiered) {
  const container = document.getElementById("pricing-inputs-container");
  if (!container) return;

  if (isTiered) {
    container.innerHTML = `
            <div class="row g-3 animate__animated animate__fadeIn">
                <div class="col-md-4">
                    <label class="form-label small text-success">Tarifa Básica</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-dark text-secondary border-secondary">$</span>
                        <input type="number" step="0.0001" class="form-control bg-dark text-light border-secondary" id="input-base-rate" placeholder="0.905" required>
                        <span class="input-group-text bg-dark text-secondary border-secondary">/kWh</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <label class="form-label small text-warning">Límite Básico</label>
                    <div class="input-group input-group-sm">
                        <input type="number" class="form-control bg-dark text-light border-secondary" id="input-base-limit" placeholder="150" required>
                        <span class="input-group-text bg-dark text-secondary border-secondary">kWh</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <label class="form-label small text-danger">Tarifa Excedente (DAC)</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-dark text-secondary border-secondary">$</span>
                        <input type="number" step="0.0001" class="form-control bg-dark text-light border-secondary" id="input-surplus-rate" placeholder="3.500" required>
                        <span class="input-group-text bg-dark text-secondary border-secondary">/kWh</span>
                    </div>
                </div>
            </div>
        `;
  } else {
    container.innerHTML = `
            <div class="row animate__animated animate__fadeIn">
                <div class="col-md-6">
                    <label class="form-label small text-light opacity-75">Costo Único por kWh</label>
                    <div class="input-group">
                        <span class="input-group-text bg-dark text-secondary border-secondary">$</span>
                        <input type="number" step="0.0001" class="form-control bg-dark text-light border-secondary" id="input-single-cost" placeholder="0.00" required>
                        <span class="input-group-text bg-dark text-secondary border-secondary">/kWh</span>
                    </div>
                </div>
            </div>
        `;
  }
}

async function loadUserProfile() {
  const user = await api.auth.getUser();
  if (user) {
    if (document.getElementById("input-email-readonly"))
      document.getElementById("input-email-readonly").value = user.email;

    const metaName =
      user.user_metadata?.full_name || user.user_metadata?.nombre_completo;
    if (metaName && document.getElementById("input-display-name"))
      document.getElementById("input-display-name").value = metaName;
  }
}

async function loadCurrentSettings() {
  const data = await api.user.getSettings();
  if (data) {
    if (document.getElementById("input-currency"))
      document.getElementById("input-currency").value = data.moneda || "MXN";
    if (document.getElementById("input-budget"))
      document.getElementById("input-budget").value =
        data.presupuesto_meta || "";

    const isTiered = data.modo_tarifa === "escalonada";
    const toggle = document.getElementById("toggle-cfe-mode");
    if (toggle) {
      toggle.checked = isTiered;
      renderPricingInputs(isTiered);
    }

    setTimeout(() => {
      if (isTiered) {
        if (document.getElementById("input-base-rate"))
          document.getElementById("input-base-rate").value =
            data.tarifa_basica || 0;
        if (document.getElementById("input-base-limit"))
          document.getElementById("input-base-limit").value =
            data.limite_basico || 150;
        if (document.getElementById("input-surplus-rate"))
          document.getElementById("input-surplus-rate").value =
            data.tarifa_excedente || 0;
      } else {
        if (document.getElementById("input-single-cost"))
          document.getElementById("input-single-cost").value =
            data.costo_kwh || 0;
      }
    }, 50);
  }
}

function setupListeners() {
  document
    .getElementById("toggle-cfe-mode")
    ?.addEventListener("change", (e) => {
      renderPricingInputs(e.target.checked);
    });

  document
    .getElementById("profile-info-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("input-display-name").value;
      try {
        const { error } = await api.auth.updateUser({
          data: { full_name: name },
        });
        if (error) throw error;
        Notificaciones.mostrar("Nombre actualizado correctamente", "success");
      } catch (err) {
        Notificaciones.mostrar("Error: " + err.message, "error");
      }
    });

  document
    .getElementById("btn-delete-account")
    ?.addEventListener("click", () => {
      // 1. Abrir el nuevo modal en lugar de confirm()
      new bootstrap.Modal(document.getElementById("deleteAccountModal")).show();
      // 2. Limpiar campo de contraseña por seguridad
      document.getElementById("delete-account-password").value = "";
    });

  // NUEVO LISTENER para el formulario dentro del modal
  document
    .getElementById("confirm-delete-account-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("delete-account-password").value;
      const btn = document.getElementById("btn-confirm-delete-final");
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Eliminando...';

      try {
        // Implementación futura: Lógica de re-autenticación y borrado
        // Aquí llamarías a una API para re-autenticar con `password` y luego borrar la cuenta.

        // Por ahora, usamos el mensaje de función en construcción
        Notificaciones.mostrar(
          "Función de borrado en construcción (Seguridad).",
          "warning"
        );

        // Simulación de éxito (revisar y cambiar cuando implementes la API de borrado real)
        // await api.auth.deleteAccount(password);
        // Notificaciones.mostrar("Tu cuenta ha sido eliminada permanentemente.", "success");
        // window.location.reload();
      } catch (err) {
        Notificaciones.mostrar("Error: " + err.message, "error");
        btn.disabled = false;
        btn.innerHTML = originalText;
      } finally {
        bootstrap.Modal.getInstance(
          document.getElementById("deleteAccountModal")
        ).hide();
      }
    });

  document
    .getElementById("settings-cost-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btn-save-settings");
      btn.disabled = true;
      btn.innerText = "Guardando...";
      try {
        const isTiered = document.getElementById("toggle-cfe-mode").checked;
        const payload = {
          moneda: document.getElementById("input-currency").value,
          presupuesto_meta: Number(
            document.getElementById("input-budget").value
          ),
          modo_tarifa: isTiered ? "escalonada" : "fija",
        };
        if (isTiered) {
          payload.tarifa_basica = Number(
            document.getElementById("input-base-rate").value
          );
          payload.limite_basico = Number(
            document.getElementById("input-base-limit").value
          );
          payload.tarifa_excedente = Number(
            document.getElementById("input-surplus-rate").value
          );
          payload.costo_kwh = payload.tarifa_basica;
        } else {
          payload.costo_kwh = Number(
            document.getElementById("input-single-cost").value
          );
          payload.tarifa_basica = 0;
          payload.limite_basico = 0;
          payload.tarifa_excedente = 0;
        }
        await api.user.updateSettings(payload);
        Notificaciones.mostrar("Configuración guardada.", "success");
      } catch (err) {
        Notificaciones.mostrar("Error: " + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-2"></i> Guardar Configuración';
      }
    });

  document
    .getElementById("password-change-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p1 = document.getElementById("input-new-password").value;
      const p2 = document.getElementById("input-confirm-password").value;
      if (p1 !== p2)
        return Notificaciones.mostrar("Contraseñas no coinciden", "error");
      try {
        await api.auth.updatePassword(p1);
        Notificaciones.mostrar("Contraseña actualizada", "success");
        e.target.reset();
      } catch (err) {
        Notificaciones.mostrar(err.message, "error");
      }
    });
}

async function loadIntegrationsStatus() {
  const container = document.getElementById("integrations-list");
  if (!container) return;
  renderIntegrationsCards(container, { google: false, alexa: false });
}

function renderIntegrationsCards(container, status) {
  const integrations = [
    {
      id: "google",
      name: "Google Home",
      icon: "bi-google",
      color: "#4285F4",
      bgColor: "rgba(66, 133, 244, 0.1)",
      desc: 'Controla tus dispositivos con "Ok Google".',
      connected: status.google,
    },
    {
      id: "alexa",
      name: "Amazon Alexa",
      icon: "bi-speaker",
      color: "#00CAFF",
      bgColor: "rgba(0, 202, 255, 0.1)",
      desc: "Skill de PowerLink para control por voz.",
      connected: status.alexa,
    },
  ];
  container.innerHTML = integrations
    .map(
      (item) => `
        <div class="col-md-6"><div class="card h-100" style="background-color: ${
          item.bgColor
        }; border: 1px solid ${
        item.color
      };"><div class="card-body text-center p-4"><i class="bi ${
        item.icon
      } fs-1 mb-3 d-block" style="color: ${
        item.color
      };"></i><h5 class="card-title text-white fw-bold">${
        item.name
      }</h5><p class="card-text small mb-4" style="color: rgba(255,255,255,0.7);">${
        item.desc
      }</p>${
        item.connected
          ? `<button class="btn btn-outline-danger btn-sm w-100 btn-disconnect" data-provider="${item.id}"><i class="bi bi-x-lg"></i> Desvincular</button>`
          : `<button class="btn btn-light btn-sm w-100 btn-connect fw-bold" data-provider="${item.id}" style="color: ${item.color};"><i class="bi bi-link-45deg"></i> Conectar</button>`
      }</div></div></div>
    `
    )
    .join("");
  container
    .querySelectorAll(".btn-connect")
    .forEach((btn) =>
      btn.addEventListener("click", () => handleConnect(btn.dataset.provider))
    );
  container
    .querySelectorAll(".btn-disconnect")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        Notificaciones.mostrar("Desvinculado", "success")
      )
    );
}

async function handleConnect(provider) {
  try {
    const response = api.integrations.connect(provider);
    if (response && response.authUrl) window.location.href = response.authUrl;
  } catch (error) {
    Notificaciones.mostrar("Error conexión: " + error.message, "error");
  }
}

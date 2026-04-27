import { api } from "../api.js";
import { Notificaciones } from "../notificaciones.js";
import { utils } from "../utils.js";

let currentPage = 1;
const limit = 10;
let totalDevices = 0;

export async function renderAdminDevices(container) {
  const html = `
    <section class="section">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <h2 style="color: #ffffff;"><i class="bi bi-shield-lock text-warning me-2"></i>Gestión Global de Equipos</h2>
        <p style="color: rgba(255,255,255,0.7);">Vista tabular de administrador de toda la red PowerLink.</p>
      </div>
      
      <div class="container">
        <div id="device-list-container" class="row gy-4">
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-warning" role="status"></div>
                <p class="mt-2 text-subtle">Cargando red global...</p>
            </div>
        </div>

        <nav aria-label="Navegación de dispositivos" class="mt-5">
            <ul class="pagination justify-content-center" id="pagination-container">
                <!-- Paginación dinámica -->
            </ul>
        </nav>
      </div>
    </section>
  `;

  container.innerHTML = html;
  currentPage = 1;
  await loadGlobalDevices();
}

async function loadGlobalDevices() {
  try {
    const response = await api.admin.getDevices(currentPage, limit);

    let devices = [];
    if (Array.isArray(response)) {
      // Fallback por si la Edge Function no está actualizada localmente
      devices = response;
      totalDevices = response.length;
    } else if (response && response.data) {
      devices = response.data;
      totalDevices = response.total || response.data.length;
    }

    renderGlobalDeviceList(devices);
    renderPagination();
  } catch (error) {
    console.error(error);
    Notificaciones.mostrar("Error al cargar dispositivos globales.", error.message || error, "error");
    document.getElementById("device-list-container").innerHTML = `<div class="col-12 text-center text-danger">Error de acceso.</div>`;
  }
}

function renderGlobalDeviceList(devices) {
  const container = document.getElementById("device-list-container");
  if (!container) return;

  if (!devices || devices.length === 0) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-subtle"><i class="bi bi-hdd-network fs-1 d-block mb-3" style="opacity:0.3"></i>No hay dispositivos registrados en la red.</div>`;
    return;
  }

  container.innerHTML = devices.map((dev) => {
    const online = utils.isOnline(dev.ultimo_heartbeat);
    const typeIcon = getTypeIcon(dev.device_type);
    const cardOpacity = online ? "1" : "0.7";
    const ledColor = online ? "#00ff00" : "#dc3545";
    const ledShadow = online ? "0 0 8px #00ff00" : "none";
    const groupName = dev.grupos ? dev.grupos.nombre_grupo : "General";

    return `
      <div class="col-lg-4 col-md-6">
        <div class="card h-100 position-relative" style="background-color: var(--surface-color); border: none; opacity: ${cardOpacity}; transition: transform 0.3s ease;">
          
          <div class="card-body p-4 d-flex flex-column">
            
            <!-- Información Principal -->
            <h5 class="card-title fw-bold text-white mb-1 text-truncate" title="${utils.escapeHTML(dev.nombre_personalizado)}">
                ${utils.escapeHTML(dev.nombre_personalizado)}
            </h5>
            <p class="small mb-1 text-light"><i class="bi bi-person-fill me-1 text-subtle"></i> ${utils.escapeHTML(dev.user_email)}</p>
            <p class="small mb-1 text-subtle"><i class="bi bi-collection me-1"></i> Grupo: ${utils.escapeHTML(groupName)}</p>
            <p class="small mb-4 font-monospace text-subtle"><i class="bi bi-upc-scan me-1"></i> ${utils.escapeHTML(dev.id_hardware)}</p>
            
            <!-- Controles Inferiores (Flex mt-auto los empuja al fondo) -->
            <div class="mt-auto">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div class="d-flex align-items-center">
                        <span class="d-inline-block rounded-circle me-2" style="width: 8px; height: 8px; background-color: ${ledColor}; box-shadow: ${ledShadow};"></span>
                        <span class="small" style="color: rgba(255,255,255,0.6);">${online ? "Online" : "Offline"}</span>
                    </div>
                    <div class="form-check form-switch m-0">
                        <input class="form-check-input admin-relay-toggle" type="checkbox" role="switch" 
                            data-hw-id="${utils.escapeHTML(dev.id_hardware)}" 
                            ${dev.estado_rele_actual ? "checked" : ""} 
                            ${!online ? "disabled" : ""} 
                            style="width: 3em; height: 1.5em; cursor: pointer;">
                    </div>
                </div>

                <a href="#admin-devices/${utils.escapeHTML(dev.id_hardware)}" class="stretched-link" style="z-index: 1;" title="Ver Diagnóstico"></a>
                <style>.form-check-input { position: relative; z-index: 2; }</style>
            </div>

          </div>
        </div>
      </div>
    `;
  }).join("");

  // Setup listeners for relay
  container.querySelectorAll(".admin-relay-toggle").forEach((el) => {
    el.addEventListener("change", async (e) => {
      const hwId = e.target.dataset.hwId;
      const s = e.target.checked;

      e.target.disabled = true;
      e.target.style.opacity = "0.5";

      try {
        await api.devices.control(hwId, s);
      } catch (er) {
        e.target.checked = !s;
        Notificaciones.mostrar("No se pudo controlar este dispositivo remoto.", "error");
      } finally {
        e.target.disabled = false;
        e.target.style.opacity = "1";
      }
    });
  });
}

function renderPagination() {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  const totalPages = Math.ceil(totalDevices / limit);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  // Previous button
  html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link bg-dark text-light border-secondary" href="#" data-page="${currentPage - 1}">Anterior</a>
        </li>
    `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link ${currentPage === i ? 'bg-primary border-primary' : 'bg-dark text-light border-secondary'}" href="#" data-page="${i}">${i}</a>
            </li>
        `;
  }

  // Next button
  html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link bg-dark text-light border-secondary" href="#" data-page="${currentPage + 1}">Siguiente</a>
        </li>
    `;

  container.innerHTML = html;

  // Attach listeners
  container.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = parseInt(e.target.dataset.page);
      if (page && page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        document.getElementById("device-list-container").innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-warning" role="status"></div></div>`;
        await loadGlobalDevices();
      }
    });
  });
}

function getTypeIcon(t) {
  const m = {
    refrigerador: "bi-snow", tv: "bi-tv", computadora: "bi-laptop",
    iluminacion: "bi-lightbulb", aire_acondicionado: "bi-fan",
    ventilador: "bi-fan", otro: "bi-plug",
  };
  return m[t] || "bi-plug";
}

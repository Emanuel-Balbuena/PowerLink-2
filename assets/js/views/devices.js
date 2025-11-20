/**
 * js/views/devices.js
 * Gestión de Dispositivos y Grupos
 * Versión 2.1: FIX TEXTOS OSCUROS (Alto Contraste)
 */
import { api } from "../api.js";
import { store } from "../state.js";
import { utils } from "../utils.js";
import { Notificaciones } from "../notificaciones.js";

export async function renderDevices(container) {
  const deleteDeviceModalHTML = `
    <div class="modal fade" id="deleteDeviceModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content bg-dark border border-danger">
                <div class="modal-header border-bottom border-danger">
                    <h5 class="modal-title text-danger fw-bold"><i class="bi bi-x-octagon-fill me-2"></i> Eliminar Dispositivo</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4 text-center">
                    <p class="text-white fw-bold mb-1">¿Estás seguro/a de que deseas eliminar <span id="device-name-confirm" class="text-info">este dispositivo</span>?</p>
                    <p class="small text-white">
                        <strong class="text-danger">¡Importante!</strong> Eliminarlo **borrará permanentemente** todos sus datos de consumo, lo desvinculará de cualquier grupo y se perderán sus datos de aprendizaje (IA).
                    </p>
                    <button type="button" class="btn btn-danger w-100 mb-2" id="btn-confirm-delete-device">
                        <i class="bi bi-trash me-2"></i> Sí, Eliminar
                    </button>
                    <button type="button" class="btn btn-outline-secondary w-100" data-bs-dismiss="modal">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>`;

  const deleteGroupModalHTML = `
    <div class="modal fade" id="deleteGroupModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content bg-dark border border-warning">
                <div class="modal-header border-bottom border-warning">
                    <h5 class="modal-title text-warning fw-bold"><i class="bi bi-trash me-2"></i> Eliminar Grupo</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4 text-center">
                    <p class="text-white fw-bold mb-1">¿Estás seguro/a de que deseas eliminar el grupo <span id="group-name-confirm" class="text-info">seleccionado</span>?</p>
                    <p class="small text-white">
                        Los dispositivos que actualmente pertenecen a este grupo no serán eliminados; **permanecerán sin grupo (desvinculados)**.
                    </p>
                    <button type="button" class="btn btn-danger w-100 mb-2" id="btn-confirm-delete-group">
                        <i class="bi bi-trash me-2"></i> Sí, Eliminar Grupo
                    </button>
                    <button type="button" class="btn btn-outline-secondary w-100" data-bs-dismiss="modal">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>`;

  const html = `
    <section class="section">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <h2 style="color: #ffffff;">Gestión de Equipos</h2>
        <p style="color: rgba(255,255,255,0.7);">Administra tus dispositivos y organízalos por zonas.</p>
      </div>
      
      <div class="container">
        
        <div class="d-flex justify-content-center mb-4">
            <div class="btn-group" role="group">
                <input type="radio" class="btn-check" name="vbtn-radio" id="btn-tab-devices" autocomplete="off" checked>
                <label class="btn btn-outline-primary px-4" for="btn-tab-devices"><i class="bi bi-hdd-network me-2"></i> Dispositivos</label>

                <input type="radio" class="btn-check" name="vbtn-radio" id="btn-tab-groups" autocomplete="off">
                <label class="btn btn-outline-primary px-4" for="btn-tab-groups"><i class="bi bi-collection me-2"></i> Grupos</label>
            </div>
        </div>

        <div class="tab-content">
            
            <div id="panel-devices" class="d-block animate__animated animate__fadeIn">
                <div class="d-flex justify-content-end mb-3">
                    <button id="btn-open-add-modal" class="btn btn-success" style="background-color: var(--accent-color); border: none;">
                      <i class="bi bi-plus-lg"></i> Vincular Nuevo
                    </button>
                </div>
                
                <div id="device-list-container" class="row gy-4">
                  <div class="col-12 text-center py-5">
                      <div class="spinner-border text-primary" role="status"></div>
                      <p class="mt-2" style="color: rgba(255,255,255,0.6);">Buscando equipos...</p>
                  </div>
                </div>
            </div>

            <div id="panel-groups" class="d-none animate__animated animate__fadeIn">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card" style="background-color: var(--surface-color); border: none;">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                                    <h5 class="card-title mb-0" style="color: white;">Mis Grupos</h5>
                                    <button class="btn btn-sm btn-outline-light" id="btn-add-group">
                                        <i class="bi bi-folder-plus"></i> Crear Grupo
                                    </button>
                                </div>
                                <div id="groups-list-container" class="list-group list-group-flush">
                                     <div class="text-center p-3" style="color: rgba(255,255,255,0.5);">Cargando...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>

      <div class="modal fade" id="addDeviceModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" style="background-color: var(--surface-color); color: white;">
            <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h5 class="modal-title">Vincular Dispositivo</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div id="discover-loading" class="text-center py-4">
                <div class="spinner-grow text-primary" role="status"></div>
                <p class="mt-3" style="color: rgba(255,255,255,0.7);">Escaneando red local...</p>
              </div>
              <div id="discover-results" class="d-none"></div>
              <form id="register-device-form" class="d-none">
                <input type="hidden" id="register-hw-id">
                <div class="mb-3">
                  <label class="form-label small" style="color: rgba(255,255,255,0.7);">Nombre personalizado</label>
                  <input type="text" class="form-control bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="register-device-name" required placeholder="Ej. Aire Sala">
                </div>
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-primary">Terminar Registro</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="editDeviceModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" style="background-color: var(--surface-color); color: white;">
             <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <h5 class="modal-title">Editar Dispositivo</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
             </div>
             <div class="modal-body">
                <form id="edit-device-form">
                    <input type="hidden" id="edit-device-id">
                    <div class="mb-3">
                        <label class="form-label small" style="color: rgba(255,255,255,0.7);">Nombre</label>
                        <input type="text" id="edit-device-name" class="form-control bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small" style="color: rgba(255,255,255,0.7);">Asignar a Grupo</label>
                        <select id="edit-device-group" class="form-select bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);"></select>
                    </div>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
             </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="groupModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content" style="background-color: var(--surface-color); color: white;">
            <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h5 class="modal-title" id="groupModalTitle">Grupo</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="group-id-hidden">
              <div class="mb-3">
                <label class="form-label small" style="color: rgba(255,255,255,0.7);">Nombre del Grupo</label>
                <input type="text" class="form-control bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="group-name-input">
              </div>
              <div class="d-grid">
                 <button type="button" class="btn btn-primary" id="btn-save-group">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  `;

  container.innerHTML = html + deleteDeviceModalHTML + deleteGroupModalHTML;

  setupTabs();
  setupListeners();
  await loadData();
}

function setupTabs() {
  const radioDev = document.getElementById("btn-tab-devices");
  const radioGrp = document.getElementById("btn-tab-groups");
  const pnlDev = document.getElementById("panel-devices");
  const pnlGrp = document.getElementById("panel-groups");

  radioDev.addEventListener("change", () => {
    if (radioDev.checked) {
      pnlDev.className = "d-block animate__animated animate__fadeIn";
      pnlGrp.className = "d-none";
    }
  });
  radioGrp.addEventListener("change", () => {
    if (radioGrp.checked) {
      pnlGrp.className = "d-block animate__animated animate__fadeIn";
      pnlDev.className = "d-none";
      renderGroupList();
    }
  });
}

async function loadData() {
  try {
    const [devices, groups] = await Promise.all([
      api.devices.list(),
      api.groups.list(),
    ]);
    store.setDevices(devices || []);
    store.setGroups(groups || []);
    if (document.getElementById("device-list-container")) {
      renderDeviceList();
      renderGroupList();
    }
  } catch (error) {
    console.error(error);
    Notificaciones.mostrar(
      "Error al cargar dispositivos y grupos.",
      error,
      "error"
    );
  }
}

function renderDeviceList() {
  const container = document.getElementById("device-list-container");
  if (!container) return;
  const devices = store.userDevices;

  if (devices.length === 0) {
    container.innerHTML = `<div class='col-12 text-center py-5' style="color: rgba(255,255,255,0.5);"><i class="bi bi-inbox fs-1 d-block mb-3" style="opacity:0.3"></i>No tienes dispositivos vinculados.</div>`;
    return;
  }

  container.innerHTML = devices
    .map((dev) => {
      const online = utils.isOnline(dev.ultimo_heartbeat);
      const grp = store.userGroups.find((g) => g.id_grupo === dev.id_grupo_fk);
      const grpName = grp ? grp.nombre_grupo : "General";

      // --- LÍNEA AÑADIDA PARA DECLARAR TYPEICON ---
      const typeIcon = getTypeIcon(dev.device_type);
      // --------------------------------------------

      const cardOpacity = online ? "1" : "0.7";

      // --- NUEVO ESTILO LED (Igual que GroupDetail) ---
      const ledColor = online ? "#00ff00" : "#dc3545"; // Verde Neón
      const ledShadow = online ? "0 0 8px #00ff00" : "none"; // Glow
      // -----------------------------------------------

      return `
      <div class="col-lg-4 col-md-6">
        <div class="card h-100 position-relative" style="background-color: var(--surface-color); border: none; opacity: ${cardOpacity};">
          <div class="card-body p-4">
            
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="d-flex align-items-center justify-content-center rounded-circle" style="width: 50px; height: 50px; background-color: rgba(5, 99, 187, 0.15); color: var(--accent-color);">
                    <i class="bi ${typeIcon} fs-3"></i>
                </div>
                <div class="dropdown">
                    <button class="btn btn-link p-0" type="button" data-bs-toggle="dropdown" style="color: rgba(255,255,255,0.5);">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li><a class="dropdown-item btn-edit-device" href="#" data-id="${
                          dev.id_dispositivo
                        }"><i class="bi bi-pencil me-2"></i> Editar</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger btn-delete-device" href="#" data-id="${
                          dev.id_dispositivo
                        }" data-name="${
        dev.nombre_personalizado.replace(/"/g, '').replace(/'/g, '')
      }"><i class="bi bi-trash me-2"></i> Eliminar</a></li>
                    </ul>
                </div>
            </div>
            
            <h5 class="card-title fw-bold text-white mb-1 text-truncate">${
              dev.nombre_personalizado
            }</h5>
            <p class="small mb-4" style="color: rgba(255,255,255,0.6);"><i class="bi bi-tag-fill me-1"></i> ${grpName}</p>
            
            <div class="d-flex align-items-center justify-content-between mt-auto">
                <div class="d-flex align-items-center">
                    <span class="d-inline-block rounded-circle me-2" style="width: 8px; height: 8px; background-color: ${ledColor}; box-shadow: ${ledShadow};"></span>
                    <span style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">${
                      online ? "Online" : "Offline"
                    }</span>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input relay-toggle" type="checkbox" role="switch" data-hw-id="${
                      dev.id_hardware
                    }" ${dev.estado_rele_actual ? "checked" : ""} ${
        !online ? "disabled" : ""
      } style="width: 3em; height: 1.5em; cursor: pointer;">
                </div>
            </div>
            <a href="#devices/${
              dev.id_dispositivo
            }" class="stretched-link" style="z-index: 1;" title="Ver detalles"></a>
            <style>.form-check-input, .dropdown { position: relative; z-index: 2; }</style>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
  setupCardListeners(container);
}

function renderGroupList() {
  const container = document.getElementById("groups-list-container");
  if (!container) return;
  const groups = store.userGroups;

  if (groups.length === 0) {
    container.innerHTML =
      "<div class='text-center p-3' style='color: rgba(255,255,255,0.5);'>No hay grupos creados.</div>";
    return;
  }

  container.innerHTML = groups
    .map(
      (g) => `
        <div class="list-group-item d-flex justify-content-between align-items-center px-0 py-3" style="background: transparent; color: white; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div class="d-flex align-items-center">
                <div class="rounded-circle bg-primary bg-opacity-10 p-2 me-3 text-primary">
                    <i class="bi bi-collection fs-5"></i>
                </div>
                <div>
                    <span class="fw-medium d-block">${g.nombre_grupo}</span>
                </div>
            </div>
            <div>
                <a href="#groups/${g.id_grupo}" class="btn btn-sm btn-outline-light me-2" title="Ver Análisis">
                    <i class="bi bi-bar-chart-line"></i>
                </a>
                
                <button class="btn btn-sm btn-outline-info btn-edit-group me-1" data-id="${g.id_grupo}" data-name="${g.nombre_grupo}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete-group" data-id="${g.id_grupo}" data-name="${g.nombre_grupo}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");

  // (Los listeners de edit/delete se mantienen igual abajo...)
  container
    .querySelectorAll(".btn-edit-group")
    .forEach((b) =>
      b.addEventListener("click", () =>
        openGroupModal(b.dataset.id, b.dataset.name)
      )
    );
  container.querySelectorAll(".btn-delete-group").forEach((b) =>
    b.addEventListener("click", async () => {
      const groupId = b.dataset.id;
      const groupName = b.dataset.name;
      // Llamamos a la función y esperamos el resultado
      const wasDeleted = await handleDeleteGroup(groupId, groupName);
      if (wasDeleted) {
        // Si la eliminación fue exitosa, recargar y renderizar
        await loadData();
        renderGroupList();
      }
    })
  );
}

// Funciones auxiliares (setupListeners, etc.) se mantienen igual que V2.0,
// solo asegúrate de que el HTML inyectado sea el de arriba.
// ... (Resto de la lógica de listeners y control es idéntica a la anterior)
function setupListeners() {
  // ... (Copiar listeners de V2.0)
  document
    .getElementById("btn-open-add-modal")
    .addEventListener("click", () => {
      const m = new bootstrap.Modal(document.getElementById("addDeviceModal"));
      m.show();
      startDiscovery();
    });
  document
    .getElementById("register-device-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // CORRECCIÓN: Quitamos la obtención del tipo y asignamos 'otro' (o el valor del ENUM)
      try {
        await api.devices.register({
          id_hardware: document.getElementById("register-hw-id").value,
          nombre_personalizado: document.getElementById("register-device-name")
            .value,
        });

        bootstrap.Modal.getInstance(
          document.getElementById("addDeviceModal")
        ).hide();
        loadData();
        Notificaciones.mostrar(
          "Dispositivo vinculado correctamente. El sistema iniciará la fase de aprendizaje.",
          "success"
        );
      } catch (err) {
        Notificaciones.mostrar(err.message, "error");
      }
    });
  document
    .getElementById("btn-add-group")
    .addEventListener("click", () => openGroupModal());
  document
    .getElementById("btn-save-group")
    .addEventListener("click", async () => {
      const id = document.getElementById("group-id-hidden").value;
      const name = document.getElementById("group-name-input").value;
      if (!name.trim())
        return Notificaciones.mostrar("Nombre requerido", "warning");
      try {
        if (id) await api.groups.update(id, name);
        else await api.groups.create(name);
        bootstrap.Modal.getInstance(
          document.getElementById("groupModal")
        ).hide();
        await loadData();
        renderGroupList();
      } catch (err) {
        Notificaciones.mostrar("Error al guardar el grupo.", "error");
      }
    });
  document
    .getElementById("edit-device-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api.devices.update(
          document.getElementById("edit-device-id").value,
          {
            nombre_personalizado:
              document.getElementById("edit-device-name").value,
            id_grupo_fk:
              document.getElementById("edit-device-group").value || null,
          }
        );
        bootstrap.Modal.getInstance(
          document.getElementById("editDeviceModal")
        ).hide();
        await loadData();
      } catch (err) {
        Notificaciones.mostrar("Error al actualizar el dispositivo.", "error");
      }
    });
}

function setupCardListeners(container) {
  container
    .querySelectorAll(".relay-toggle")
    .forEach((el) => el.addEventListener("change", handleRelayChange));
  container.querySelectorAll(".btn-delete-device").forEach((el) =>
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      const deviceId = e.currentTarget.dataset.id;
      const deviceName = e.currentTarget.dataset.name; // Obtiene el nombre
      // Llamamos a la función con ID y Nombre, y esperamos el resultado
      const wasDeleted = await handleDeleteDevice(deviceId, deviceName);
      if (wasDeleted) {
        // Recargar datos si la eliminación fue exitosa
        await loadData();
        renderDeviceList();
      }
    })
  );
  container
    .querySelectorAll(".btn-delete-device")
    .forEach((el) => el.addEventListener("click", handleDeleteDevice));
  container
    .querySelectorAll(".btn-edit-device")
    .forEach((el) => el.addEventListener("click", handleEditDeviceOpen));
}

async function handleRelayChange(e) {
  const hwId = e.target.dataset.hwId;
  const s = e.target.checked;
  try {
    await api.devices.control(hwId, s);
  } catch (er) {
    // Revertir el estado si falla
    e.target.checked = !s;
    Notificaciones.mostrar(
      "Error de comunicación: El dispositivo podría estar Offline.",
      "error"
    );
  }
}

function handleEditDeviceOpen(e) {
  e.preventDefault();
  const id = e.currentTarget.dataset.id;
  const dev = store.userDevices.find((d) => d.id_dispositivo === id);
  if (!dev) return;

  document.getElementById("edit-device-id").value = id;
  document.getElementById("edit-device-name").value = dev.nombre_personalizado;

  const sel = document.getElementById("edit-device-group");
  sel.innerHTML = '<option value="">-- Sin Grupo --</option>';

  store.userGroups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id_grupo;
    opt.innerText = g.nombre_grupo;
    if (dev.id_grupo_fk === g.id_grupo) opt.selected = true;
    sel.appendChild(opt);
  });
  new bootstrap.Modal(document.getElementById("editDeviceModal")).show();
}

async function handleDeleteDevice(deviceId, deviceName) {
  // 1. Mostrar el nombre en el modal
  document.getElementById("device-name-confirm").textContent = deviceName;

  // 2. CREAR INSTANCIA DEL MODAL y mostrarlo
  const modalElement = document.getElementById("deleteDeviceModal");
  // Si la instancia ya existe, la recuperamos para evitar crear múltiples
  let modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(modalElement);
  }
  modalInstance.show();

  // 3. Crear una promesa para esperar la confirmación/cancelación
  return new Promise((resolve) => {
    const btnConfirm = document.getElementById("btn-confirm-delete-device");

    // --- FUNCIÓN DE LIMPIEZA CENTRALIZADA ---
    const cleanupAndResolve = (result) => {
      // Aseguramos que los listeners se limpien
      btnConfirm.removeEventListener("click", confirmListener);
      modalElement.removeEventListener("hidden.bs.modal", hideListener);

      // Forzar cierre del modal si todavía está visible
      if (modalInstance) {
        modalInstance.hide();
      }

      // Solución Reforzada: Eliminación manual de clases de DOM
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";

      // Eliminar manualmente el backdrop (puede no existir, pero es un seguro)
      const existingBackdrop = document.querySelector(".modal-backdrop");
      if (existingBackdrop) {
        existingBackdrop.remove();
      }

      resolve(result);
    };
    // ----------------------------------------

    // Listener de confirmación
    const confirmListener = async () => {
      try {
        // *** LÓGICA DE ELIMINACIÓN RESTAURADA ***
        await api.devices.delete(deviceId);
        Notificaciones.mostrar("Dispositivo eliminado.", "success");
        cleanupAndResolve(true); // Éxito
      } catch (err) {
        Notificaciones.mostrar("Error al eliminar el dispositivo.", "error");
        cleanupAndResolve(false); // Fallo
      }
    };

    // Listener para el evento de cierre/cancelación nativo de Bootstrap
    const hideListener = () => {
      // Si el modal se cerró por cualquier vía (Cancelar, Esc, Backdrop click),
      // y no se ha resuelto (es decir, no fue el botón de confirmar), se resuelve como falso.
      cleanupAndResolve(false); // Cancelado
    };

    // Asignar listeners
    btnConfirm.addEventListener("click", confirmListener);
    modalElement.addEventListener("hidden.bs.modal", hideListener, {
      once: true,
    });
  });
}

function openGroupModal(id = "", n = "") {
  document.getElementById("group-id-hidden").value = id;
  document.getElementById("group-name-input").value = n;
  document.getElementById("groupModalTitle").innerText = id
    ? "Editar Grupo"
    : "Nuevo Grupo";
  new bootstrap.Modal(document.getElementById("groupModal")).show();
}

async function handleDeleteGroup(groupId, groupName) {
  // 1. Mostrar el nombre en el modal
  document.getElementById("group-name-confirm").textContent = groupName;

  // 2. CREAR INSTANCIA DEL MODAL y mostrarlo
  const modalElement = document.getElementById("deleteGroupModal");
  let modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(modalElement);
  }
  modalInstance.show();

  // 3. Crear una promesa para esperar la confirmación/cancelación
  return new Promise((resolve) => {
    const btnConfirm = document.getElementById("btn-confirm-delete-group");

    // --- FUNCIÓN DE LIMPIEZA CENTRALIZADA ---
    const cleanupAndResolve = (result) => {
      // Aseguramos que los listeners se limpien
      btnConfirm.removeEventListener("click", confirmListener);
      modalElement.removeEventListener("hidden.bs.modal", hideListener);

      // Forzar cierre del modal si todavía está visible
      if (modalInstance) {
        modalInstance.hide();
      }

      // Solución Reforzada: Eliminación manual de clases de DOM
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";

      // Eliminar manualmente el backdrop (puede no existir, pero es un seguro)
      const existingBackdrop = document.querySelector(".modal-backdrop");
      if (existingBackdrop) {
        existingBackdrop.remove();
      }

      resolve(result);
    };
    // ----------------------------------------

    // Listener de confirmación
    const confirmListener = async () => {
      try {
        // *** LÓGICA DE ELIMINACIÓN RESTAURADA ***
        await api.groups.delete(groupId);
        Notificaciones.mostrar(
          "Grupo eliminado. Dispositivos desvinculados.",
          "success"
        );
        cleanupAndResolve(true); // Éxito
      } catch (err) {
        Notificaciones.mostrar("Error al eliminar el grupo.", "error");
        cleanupAndResolve(false); // Fallo
      }
    };

    // Listener para el evento de cierre/cancelación nativo de Bootstrap
    const hideListener = () => {
      // Si el modal se cerró por cualquier vía (Cancelar, Esc, Backdrop click)
      cleanupAndResolve(false); // Cancelado
    };

    // Asignar listeners
    btnConfirm.addEventListener("click", confirmListener);
    // Usamos { once: true } para que este listener se auto-elimine al dispararse
    modalElement.addEventListener("hidden.bs.modal", hideListener, {
      once: true,
    });
  });
}

// --- FUNCIÓN startDiscovery CORREGIDA PARA ARRAYS DIRECTOS ---
async function startDiscovery() {
  const r = document.getElementById("discover-results");
  const l = document.getElementById("discover-loading");
  const f = document.getElementById("register-device-form");

  // Reset UI
  l.classList.remove("d-none");
  r.classList.add("d-none");
  f.classList.add("d-none");

  try {
    // La API devuelve el Array directo: [{ id_hardware: '...', ... }]
    const data = await api.devices.discover();

    l.classList.add("d-none");
    r.classList.remove("d-none");

    // 1. VALIDACIÓN: Verificamos si es un array y si tiene elementos
    if (!Array.isArray(data) || data.length === 0) {
      r.innerHTML = `
                <div class="text-center mb-3">
                    <p style="color:rgba(255,255,255,0.7)">No se encontraron dispositivos nuevos.</p>
                    <button class="btn btn-sm btn-outline-light w-100 btn-manual">
                        <i class="bi bi-keyboard me-2"></i>Ingresar Manualmente
                    </button>
                </div>`;

      const btnMan = r.querySelector(".btn-manual");
      if (btnMan)
        btnMan.onclick = () => {
          r.classList.add("d-none");
          f.classList.remove("d-none");
          fillRegisterForm("MAC-MANUAL");
        };
      return;
    }

    // 2. RENDERIZADO: Mapeamos los objetos del array
    r.innerHTML = `
            <div class="list-group">
                ${data
                  .map((device) => {
                    const mac = device.id_hardware;
                    return `
                    <button class="list-group-item list-group-item-action btn-select-mac bg-dark text-light border-secondary" data-mac="${mac}">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1 text-success"><i class="bi bi-wifi me-2"></i>Nuevo Dispositivo</h6>
                            <small>Detectado</small>
                        </div>
                        <p class="mb-1 font-monospace text-white fw-bold fs-5">${mac}</p>
                        <small class="text-muted">Toca para vincular</small>
                    </button>
                    `;
                  })
                  .join("")}
            </div>
        `;

    // Listeners para los botones generados
    r.querySelectorAll(".btn-select-mac").forEach((b) => {
      b.addEventListener("click", () => {
        r.classList.add("d-none");
        f.classList.remove("d-none");
        fillRegisterForm(b.dataset.mac);
      });
    });
  } catch (e) {
    console.error("Error en startDiscovery:", e);
    Notificaciones.mostrar("Error al escanear dispositivos.", "error");
    l.classList.add("d-none");
    r.classList.remove("d-none");
    r.innerHTML = `<p class='text-danger text-center'>Error al escanear: ${e.message}</p>`;
  }
}

// --- FUNCIÓN RECUPERADA ---
function fillRegisterForm(mac) {
  // Asigna la MAC (detectada o manual) al campo oculto
  document.getElementById("register-hw-id").value = mac;

  // (Opcional) Puedes poner un nombre por defecto para acelerar el registro
  const nameInput = document.getElementById("register-device-name");
  if (nameInput.value === "") {
    nameInput.value = "Dispositivo " + mac.slice(-4);
  }
}

function getTypeIcon(t) {
  const m = {
    refrigerador: "bi-snow",
    tv: "bi-tv",
    computadora: "bi-laptop",
    iluminacion: "bi-lightbulb",
    aire_acondicionado: "bi-fan",
    ventilador: "bi-fan",
    otro: "bi-plug",
  };
  return m[t] || "bi-plug";
}

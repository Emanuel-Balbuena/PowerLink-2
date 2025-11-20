/**
 * js/views/dashboard.js
 * Vista principal: Resumen, KPIs y Acciones Rápidas
 * Versión 4.0: FIX SINCRONIZACIÓN TOTAL (Cálculo Local vs UTC)
 */
import { api } from '../api.js';
import { utils } from '../utils.js';
import { Notificaciones } from '../notificaciones.js';


export async function renderDashboard(container) {
  // 1. Obtener nombre de usuario
  let displayName = 'Usuario';
  try {
    const user = await api.auth.getUser();
    if (user) {
      displayName = user.user_metadata?.full_name ||
        user.user_metadata?.nombre_completo ||
        user.email.split('@')[0];
    }
  } catch (e) { }

  // 2. Saludo
  const hour = new Date().getHours();
  let greeting = 'Hola';
  let iconGreeting = 'bi-sun';
  if (hour < 12) { greeting = 'Buenos días'; iconGreeting = 'bi-cup-hot'; }
  else if (hour < 19) { greeting = 'Buenas tardes'; iconGreeting = 'bi-sun'; }
  else { greeting = 'Buenas noches'; iconGreeting = 'bi-moon-stars'; }

  // 3. Template HTML (Estilos claros mantenidos)
  const html = `
    <section class="section dashboard">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <div class="d-flex align-items-center justify-content-center gap-3">
            <i class="bi ${iconGreeting}" style="color: var(--yellow-accent); font-size: 2rem; transform: translateY(-13px);"></i>
            
            <h2 class="mb-0">${greeting}, <span style="color: var(--accent-color);">${displayName}</span></h2>
        </div>
        <p style="color: rgba(255, 255, 255, 0.7);">Aquí tienes el resumen energético de tu hogar hoy.</p>
      </div>

      <div class="container">
        
        <div class="row gy-4 mb-4">
          
          <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="100">
            <div class="card h-100 service-item" style="background-color: var(--surface-color); border: none;">
              <div class="card-body text-center">
                  <div class="icon mb-3" style="color: #ffffff;">
                    <i class="bi bi-lightning-charge"></i>
                  </div>
                  <h3>Consumo Hoy</h3>
                  <div class="d-flex justify-content-center align-items-baseline gap-2">
                     <h2 id="summary-kwh-today" style="font-weight: 700; color: var(--heading-color);">--</h2>
                     <small style="color: rgba(255, 255, 255, 0.6);"></small>
                  </div>
                  <p class="small mb-0" style="color: rgba(255, 255, 255, 0.5);">Energía consumida desde las 00:00 hrs.</p>
              </div>
            </div>
          </div>

          <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="200">
            <div class="card h-100 service-item" style="background-color: var(--surface-color); border: none;">
              <div class="card-body text-center">
                  <div class="icon mb-3" style="color: #ffffff;">
                    <i class="bi bi-coin"></i>
                  </div>
                  <h3>Costo Acumulado</h3>
                  <div class="d-flex justify-content-center align-items-baseline gap-2">
                     <h2 id="summary-cost-today" style="font-weight: 700; color: var(--heading-color);">--</h2>
                  </div>
                  <p class="small mb-0" style="color: rgba(255, 255, 255, 0.5);">Estimación basada en tu tarifa.</p>
              </div>
            </div>
          </div>

          <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="300">
            <div class="card h-100 service-item" style="background-color: var(--surface-color); border: none;">
              <div class="card-body text-center">
                  <div class="icon mb-3" style="color: #ffffff;">
                    <i class="bi bi-calendar-check"></i>
                  </div>
                  <h3>Proyección Mensual</h3>
                  <div class="d-flex justify-content-center align-items-baseline gap-2">
                     <h2 id="prediction-cost-month" style="font-weight: 700; color: var(--heading-color);">--</h2>
                  </div>
                  
                  <div class="mt-3 text-start">
                    <div class="d-flex justify-content-between small mb-1">
                        <span id="budget-limit-text" style="color: rgba(255, 255, 255, 0.5);">Meta: ---</span>
                        <span id="budget-percent" style="color: var(--heading-color);">--%</span>
                    </div>
                    <div class="progress" style="height: 6px; background-color: rgba(255, 255, 255, 0.1);">
                        <div id="budget-bar" class="progress-bar bg-success" role="progressbar" style="width: 0%"></div>
                    </div>
                  </div>
              </div>
            </div>
          </div>

        </div> 

        <div class="row gy-4">
            <div class="col-12">
                <div class="card" style="background-color: var(--surface-color); border: none; border-radius: 5px; box-shadow: 0px 5px 90px 0px rgba(0,0,0,0.1);">
                    <div class="card-body p-4">
                        <h4 class="card-title mb-4" style="color: var(--heading-color); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                            <i class="bi bi-hdd-rack me-2 text-primary"></i> Estado de Dispositivos
                        </h4>
                        <div id="dashboard-devices-list" class="row g-3">
                             <div class="col-12 text-center py-5">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-2" style="color: rgba(255, 255, 255, 0.5);">Calculando consumo en tiempo real...</p>
                             </div>
                        </div>
                        <div class="mt-4 text-center">
                            <a href="#devices" class="btn btn-outline-primary rounded-pill px-4">
                                Ver todos los dispositivos <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </section>
  `;

  container.innerHTML = html;

  loadDashboardData();
}

async function loadDashboardData() {
  try {
    // 1. Obtener Fecha Local "A prueba de balas" (Igual que en deviceDetail)
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayQuery = `${year}-${month}-${day}T00:00:00`; // FIX UTC

    // 2. Cargar Datos Básicos
    const [predictionData, devicesList, userSettings] = await Promise.all([
      api.analytics.prediction(),
      api.devices.list(),
      api.user.getSettings()
    ]);

    // 3. CÁLCULO MANUAL DE CONSUMO (Para coincidir con la gráfica)
    // Recorremos cada dispositivo y pedimos su consumo con la fecha CORRECTA
    let totalKwhHoy = 0;
    const consumptionMap = {}; // { 'id_device': 0.884 }

    // Lanzamos peticiones en paralelo para cada dispositivo
    if (devicesList && devicesList.length > 0) {
      const usagePromises = devicesList.map(async (device) => {
        try {
          // Reutilizamos la lógica de getAnalytics que ya acepta fechas
          const data = await api.devices.getAnalytics(device.id_dispositivo, 'daily', todayQuery);
          // Sumamos los valores del array (horas)
          const deviceTotal = data.values ? data.values.reduce((a, b) => a + b, 0) : 0;
          return { id: device.id_dispositivo, kwh: deviceTotal };
        } catch (err) {
          return { id: device.id_dispositivo, kwh: 0 };
        }
      });

      const results = await Promise.all(usagePromises);

      // Sumar al total general
      results.forEach(res => {
        consumptionMap[res.id] = res.kwh;
        totalKwhHoy += res.kwh;
      });
    }

    // 4. Calcular Costo Total basado en el Kwh corregido
    const costoUnitario = userSettings?.costo_kwh || 0; // O lógica escalonada si se desea implementar aquí también
    const totalCostoHoy = totalKwhHoy * costoUnitario;

    // 5. Renderizar KPIs (Con datos corregidos)
    updateElement("summary-kwh-today", utils.formatKwh(totalKwhHoy, false));
    updateElement("summary-cost-today", utils.formatCurrency(totalCostoHoy));

    const predicted = predictionData.predicted_cost || 0;
    updateElement("prediction-cost-month", utils.formatCurrency(predicted));

    // 6. Barra de Presupuesto
    const presupuestoMeta = (userSettings && userSettings.presupuesto_meta > 0) ? userSettings.presupuesto_meta : 500;
    const metaText = document.getElementById("budget-limit-text");
    if (metaText) metaText.innerText = `Meta: ${utils.formatCurrency(presupuestoMeta)}`;

    const percent = Math.min(100, Math.round((predicted / presupuestoMeta) * 100));
    const bar = document.getElementById("budget-bar");
    const txt = document.getElementById("budget-percent");

    if (bar && txt) {
      bar.style.width = `${percent}%`;
      txt.innerText = `${percent}%`;
      bar.className = 'progress-bar';
      if (percent < 50) bar.classList.add('bg-success');
      else if (percent < 85) bar.classList.add('bg-warning');
      else bar.classList.add('bg-danger');
    }

    // 7. Renderizar Lista (Pasamos nuestro mapa manual)
    renderQuickDevices(devicesList, consumptionMap);

  } catch (error) {
    Notificaciones.mostrar("Error cargando dashboard:", error, "error");
    updateElement("summary-kwh-today", "0.00");
    document.getElementById("dashboard-devices-list").innerHTML =
      `<div class="col-12 text-center text-danger">Error de conexión.</div>`;
  }
}

function renderQuickDevices(devices, consumptionMap) {
  const container = document.getElementById("dashboard-devices-list");
  if (!container) return;

  if (!devices || devices.length === 0) {
    container.innerHTML = `<div class="col-12 text-center" style="color: rgba(255, 255, 255, 0.5);">No hay dispositivos registrados.</div>`;
    return;
  }

  const previewDevices = devices.slice(0, 6);

  container.innerHTML = previewDevices.map(dev => {
    const isOnline = utils.isOnline(dev.ultimo_heartbeat);
    const typeIcon = getTypeIcon(dev.device_type);
    const kwhHoy = consumptionMap[dev.id_dispositivo] || 0;

    // --- NUEVO ESTILO LED (Igual que GroupDetail) ---
    const ledColor = isOnline ? '#00ff00' : '#dc3545'; // Verde Neón / Rojo
    const ledShadow = isOnline ? '0 0 8px #00ff00' : 'none'; // Glow solo si está online
    const statusText = isOnline ? 'Online' : 'Offline';
    // -----------------------------------------------

    return `
        <div class="col-md-6 col-lg-4">
            <div class="d-flex align-items-center justify-content-between p-3 rounded border" 
                 style="background-color: var(--background-color); border-color: rgba(255,255,255,0.05) !important;">
                
                <div class="d-flex align-items-center gap-3" style="overflow: hidden;">
                    <div class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" 
                         style="width: 40px; height: 40px; background-color: rgba(5, 99, 187, 0.1); color: var(--accent-color);">
                        <i class="bi ${typeIcon} fs-5"></i>
                    </div>
                    
                    <div style="min-width: 0;">
                        <h6 class="mb-0 text-truncate" style="color: var(--default-color); font-weight: 500;" title="${dev.nombre_personalizado}">
                            ${dev.nombre_personalizado}
                        </h6>
                        
                        <div class="d-flex align-items-center small mt-1">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${ledColor}; box-shadow: ${ledShadow}; margin-right: 8px;"></div>
                            <span class="me-2" style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">
                                ${statusText}
                            </span>
                            <span class="badge bg-dark text-light border border-secondary" style="font-weight: normal; font-size: 0.75rem;">
                                ${utils.formatKwh(kwhHoy)}
                            </span>
                        </div>
                        </div>
                </div>

                <div class="form-check form-switch ms-2">
                    <input class="form-check-input dashboard-toggle" type="checkbox" role="switch"
                           data-id="${dev.id_hardware}"
                           ${dev.estado_rele_actual ? 'checked' : ''}
                           ${!isOnline ? 'disabled' : ''}
                           style="cursor: pointer; width: 3em; height: 1.5em;">
                </div>

            </div>
        </div>
        `;
  }).join('');

  setupToggleListeners();
}

function setupToggleListeners() {
  document.querySelectorAll('.dashboard-toggle').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const hwId = e.target.dataset.id;
      const newState = e.target.checked;
      e.target.disabled = true;
      e.target.style.opacity = "0.5";
      try {
        await api.devices.control(hwId, newState);
      } catch (err) {
        e.target.checked = !newState;
        Notificaciones.mostrar("Fallo de comunicación", "error");
      } finally {
        e.target.disabled = false;
        e.target.style.opacity = "1";
      }
    });
  });
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function getTypeIcon(type) {
  const map = { 'refrigerador': 'bi-snow', 'tv': 'bi-tv', 'computadora': 'bi-laptop', 'iluminacion': 'bi-lightbulb', 'aire_acondicionado': 'bi-fan', 'ventilador': 'bi-fan', 'otro': 'bi-plug' };
  return map[type] || 'bi-plug';
}
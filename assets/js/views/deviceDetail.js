/**
 * js/views/deviceDetail.js
 * Vista de detalle: Analítica profunda, Time Travel y Costos
 * Versión Final V4.1: FIX COMPLETO (Comparison + Timezone + UI)
 */
import { api } from "../api.js";
import { Notificaciones } from "../notificaciones.js";
import { store } from "../state.js";
import { utils } from "../utils.js";

let currentChart = null;
let userCostSettings = { costo_kwh: 0, moneda: "MXN" };

export async function renderDeviceDetail(container, deviceId) {
  // 1. Obtener configuración de costos
  try {
    const settings = await api.user.getSettings();
    if (settings) userCostSettings = settings;
  } catch (e) {
    Notificaciones.mostrar(
      "No se pudo cargar la configuración de costos. Usando valores por defecto.",
      "warning"
    );
  }

  // 2. Template HTML Estructurado
  const html = `
    <section class="section">
      
      <div id="learning-banner-container" class="container mb-3"></div>

      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
       <div class="d-flex flex-column align-items-center justify-content-center gap-3 mb-2">
    <h2 class="mb-0" id="detail-name" style="color: #ffffff;">Cargando...</h2>
    <span id="detail-status-badge" class="badge rounded-pill bg-dark border border-light" style="font-size: 0.6em; vertical-align: middle;">
        ---
    </span>
</div>
        <p style="color: rgba(255,255,255,0.8);">Análisis detallado de comportamiento y consumo.</p>
      </div>

      <div class="container">
        
        <div class="row mb-4 align-items-center g-3">
          <div class="col-md-3">
            <button class="btn w-100" id="btn-back" style="border: 1px solid rgba(255,255,255,0.3); color: white;">
                <i class="bi bi-arrow-left"></i> Volver
            </button>
          </div>
          
          <div class="col-md-9">
            <div class="card" style="background-color: var(--surface-color); border: none;">
                <div class="card-body p-2 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                    
                    <div class="d-flex align-items-center gap-2">
                        <label style="color: rgba(255,255,255,0.9); font-size: 0.9rem;"><i class="bi bi-calendar3"></i> Fecha:</label>
                        <input type="date" id="date-picker" class="form-control form-control-sm" 
                               style="background-color: var(--background-color); border: 1px solid rgba(255,255,255,0.4); color: white; width: auto;">
                    </div>

                    <div class="btn-group" role="group">
                      <button type="button" class="btn btn-sm btn-outline-primary range-btn active" data-range="daily">Día</button>
                      <button type="button" class="btn btn-sm btn-outline-primary range-btn" data-range="weekly">Semana</button>
                      <button type="button" class="btn btn-sm btn-outline-primary range-btn" data-range="monthly">Mes</button>
                    </div>

                    <div class="d-flex gap-1" style="margin-left:auto;">
                        <button class="btn btn-sm btn-outline-info d-flex align-items-center" id="btn-open-compare" title="Comparar">
                            <i class="bi bi-bar-chart-steps"></i>
                            <span class="ms-1 d-none d-sm-inline">Comparar</span>
                        </button>
                        <button class="btn btn-sm btn-outline-success d-flex align-items-center" id="btn-download-csv" title="Descargar Datos">
                            <i class="bi bi-download"></i>
                            <span class="ms-1 d-none d-sm-inline">CSV</span>
                        </button>
                    </div>

                </div>
            </div>
          </div>
        </div>
        
        <div class="row mb-3 gy-3">
            <div class="col-6">
                <div class="p-3 rounded border" style="background-color: rgba(5, 99, 187, 0.15); border-color: rgba(5, 99, 187, 0.5) !important;">
                    <small class="d-block mb-1" style="color: rgba(255,255,255,0.9);">Consumo periodo</small>
                    <h4 class="mb-0 text-white fw-bold" id="lbl-period-kwh">-- kWh</h4>
                </div>
            </div>
            <div class="col-6">
                <div class="p-3 rounded border" style="background-color: rgba(255, 193, 7, 0.15); border-color: rgba(255, 193, 7, 0.5) !important;">
                    <small class="d-block mb-1" style="color: rgba(255,255,255,0.9);">Costo estimado</small>
                    <h4 class="mb-0 text-white fw-bold" id="lbl-period-cost">--</h4>
                </div>
            </div>
        </div>

        <div class="row mb-4">
          <div class="col-12">
            <div class="card h-100" style="background-color: var(--surface-color); border: none;">
                <div class="card-body position-relative" style="min-height: 400px; padding: 20px;">
                    <h5 class="card-title" id="chart-title" style="color: #ffffff;">Cargando datos...</h5>
                    
                    <div id="chart-loading" class="position-absolute top-50 start-50 translate-middle text-center">
                        <div class="spinner-border text-primary" role="status"></div>
                    </div>
                    
                    <div style="height: 350px; width: 100%;">
                        <canvas id="device-chart"></canvas>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div class="row gy-4">
            <div class="col-lg-6">
                <div class="card h-100" style="background-color: var(--surface-color); border: none;">
                    <div class="card-body">
                        <h5 class="card-title mb-3" style="color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                            <i class="bi bi-lightbulb text-warning me-2"></i> Diagnóstico
                        </h5>
                        <div id="device-alerts-list" class="list-group list-group-flush mt-3">
                            <div class="text-center py-3" style="color: rgba(255,255,255,0.5);">Cargando análisis...</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card h-100" style="background-color: var(--surface-color); border: none;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3" style="border-color: rgba(255,255,255,0.1) !important;">
                            <h5 class="card-title mb-0" style="color: #ffffff;">
                                <i class="bi bi-globe-americas text-info me-2"></i> Ficha Técnica
                            </h5>
                            <span class="badge bg-success d-none" id="badge-community-ok"><i class="bi bi-check"></i> Guardado</span>
                        </div>

                        <p class="small" style="color: rgba(255,255,255,0.6);">Ayuda a la comunidad identificando este dispositivo.</p>

                        <form id="community-form">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small" style="color: rgba(255,255,255,0.8);">Marca</label>
                                    <input type="text" class="form-control form-control-sm bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="input-brand" placeholder="Ej. Samsung">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small" style="color: rgba(255,255,255,0.8);">Modelo</label>
                                    <input type="text" class="form-control form-control-sm bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="input-model" placeholder="Ej. Inverter X">
                                </div>
                            </div>
                            <div class="mt-3 text-end">
                                <button type="submit" class="btn btn-sm btn-primary" id="btn-save-community" style="background-color: var(--accent-color);">
                                    Guardar Datos
                                </button>
                            </div>
                        </form>

                        <!-- Widget Benchmark Gamificado -->
                        <div id="benchmark-widget-container" class="mt-4 pt-3 border-top d-none" style="border-color: rgba(255,255,255,0.1) !important;">
                            <!-- Benchmark inyectado via JS -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      ${getCompareModalHTML()}
      ${getDownloadModalHTML()}
    </section>
  `;

  container.innerHTML = html;

  setupListeners(deviceId);

  // Inicializar fecha local
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  document.getElementById("date-picker").value = todayStr;

  await Promise.all([
    loadStaticInfo(deviceId),
    loadChartData(deviceId, "daily", todayStr),
    loadDeviceAlerts(deviceId),
  ]);
}

function getCompareModalHTML() {
  return `
    <div class="modal fade" id="compareModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="background-color: var(--surface-color); color: white;">
          <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <h5 class="modal-title"><i class="bi bi-bar-chart-steps text-info"></i> Comparación Dinámica</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="compare-form">
              
              <div class="mb-3">
                <label class="form-label small text-light">Modo de Comparación:</label>
                <select class="form-select bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="compare-type-select">
                  <option value="daily">Días (Día vs Día)</option>
                  <option value="weekly">Semanas (Semana vs Semana)</option>
                  <option value="monthly">Meses (Mes vs Mes)</option>
                </select>
              </div>

              <div class="row mb-3">
                <div class="col-6">
                  <label class="form-label small text-info"><i class="bi bi-calendar-event"></i> Periodo A:</label>
                  <input type="date" id="compare-date-a" class="form-control bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" required>
                </div>
                <div class="col-6">
                  <label class="form-label small text-warning"><i class="bi bi-calendar-event"></i> Periodo B:</label>
                  <input type="date" id="compare-date-b" class="form-control bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" required>
                </div>
              </div>

              <div class="d-grid mt-4">
                <button type="submit" class="btn btn-info">Generar Gráfica</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- LOGICA ---

async function loadStaticInfo(deviceId) {
  let device = store.getDevice(deviceId);
  if (!device) {
    const list = await api.devices.list();
    store.setDevices(list || []);
    device = store.getDevice(deviceId);
  }
  if (device) {
    document.getElementById("detail-name").innerText =
      device.nombre_personalizado;
    const badge = document.getElementById("detail-status-badge");
    const isOnline = utils.isOnline(device.ultimo_heartbeat);
    badge.innerText = isOnline ? "ONLINE" : "OFFLINE";
    badge.className = isOnline
      ? "badge rounded-pill bg-success border-0"
      : "badge rounded-pill bg-secondary border-0";

    if (device.monitoring_status === "learning")
      renderLearningBanner(device.fecha_registro);
    else document.getElementById("learning-banner-container").innerHTML = "";

    if (device.device_brand) {
      document.getElementById("input-brand").value = device.device_brand;
    }
    if (device.device_model) {
      document.getElementById("input-model").value = device.device_model;
    }
    
    // Nueva lógica: si ya tiene marca y modelo, mostramos la insignia "Guardado"
    if (device.device_brand || device.device_model) {
        document.getElementById("badge-community-ok").classList.remove("d-none");
        
        // Bloquear inputs para que el usuario perciba que ya están fijos
        document.getElementById("input-brand").disabled = true;
        document.getElementById("input-model").disabled = true;
        const btnSave = document.getElementById("btn-save-community");
        if (btnSave) btnSave.classList.add("d-none");

        renderCommunityBenchmark(device);
    }
  }
}

// NUEVA FUNCIÓN: Gamificación de Consumo Benchmark
async function renderCommunityBenchmark(device) {
    const container = document.getElementById("benchmark-widget-container");
    if (!device.device_brand || !device.device_model || !device.device_type) {
        container.classList.add("d-none");
        return;
    }

    // Estado Loading
    container.innerHTML = '<div class="text-center py-2"><span class="spinner-border spinner-border-sm text-info"></span> <span class="small" style="color: rgba(255,255,255,0.6);">Consultando métricas de la comunidad...</span></div>';
    container.classList.remove("d-none");

    try {
        const baseline = await api.community.getBaseline(device.device_type, device.device_brand, device.device_model);
        if (baseline) {
            const deviceStandby = device.baseline_data?.standby_avg || 0;
            const communityStandby = baseline.avg_standby_kwh || 0;
            
            if (deviceStandby === 0) {
               container.innerHTML = `<p class="small text-info mb-0"><i class="bi bi-hourglass-split"></i> <b>Comunidad encontrada:</b> Esperando recolectar más datos de tu dispositivo para dibujarlo en el tablero.</p>`;
               return;
            }

            const diff = deviceStandby - communityStandby;
            const diffPercent = communityStandby > 0 ? Math.round((Math.abs(diff) / communityStandby) * 100) : 0;
            
            let statusIcon = "bi-check-circle-fill text-success";
            let statusText = `¡Tu equipo es más eficiente! Consumes un <b>${diffPercent}% menos</b> que el resto.`;
            
            if (diff > 0) {
                if (diffPercent > 20) {
                    statusIcon = "bi-exclamation-triangle-fill text-warning";
                    statusText = `Consume un <b>${diffPercent}% más</b> que el resto en standby. ¡Intenta desenchufarlo!`;
                } else {
                    statusIcon = "bi-info-circle-fill text-info";
                    statusText = `Consumo promedio aceptable (<b>${diffPercent}% arriba</b> del ideal).`;
                }
            }
            
            const maxVal = Math.max(deviceStandby, communityStandby) * 1.2;
            const devicePercent = maxVal > 0 ? (deviceStandby / maxVal) * 100 : 0;
            const communityPercent = maxVal > 0 ? (communityStandby / maxVal) * 100 : 0;

            container.innerHTML = `
                <h6 class="mb-3" style="color: #fff;"><i class="bi bi-bar-chart-fill text-primary"></i> Benchmark Global</h6>
                
                <div class="mb-2">
                    <div class="d-flex justify-content-between small text-light mb-1">
                        <span><i class="bi bi-person"></i> Tu Equipo (Standby)</span>
                        <span>${deviceStandby.toFixed(3)} kW</span>
                    </div>
                    <div class="progress" style="height: 8px; background-color: rgba(255,255,255,0.1);">
                        <div class="progress-bar ${diff > 0 && diffPercent > 20 ? 'bg-warning' : 'bg-success'}" role="progressbar" style="width: ${devicePercent}%"></div>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="d-flex justify-content-between small text-light mb-1">
                        <span><i class="bi bi-globe"></i> Comunidad (Promedio)</span>
                        <span>${communityStandby.toFixed(3)} kW</span>
                    </div>
                    <div class="progress" style="height: 8px; background-color: rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-info" role="progressbar" style="width: ${communityPercent}%"></div>
                    </div>
                </div>
                
                <div class="d-flex align-items-start small mt-3" style="color: rgba(255,255,255,0.8);">
                    <i class="bi ${statusIcon} fs-5 me-2 mt-n1"></i>
                    <div>
                      <span>${statusText}</span>
                      <br><small style="color: rgba(255,255,255,0.4);">Basado en ${baseline.sample_size} usuarios</small>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `<p class="small mb-0" style="color: rgba(255,255,255,0.6);"><i class="bi bi-info-circle"></i> Aún no hay suficientes datos globales para este modelo. ¡Eres de los primeros pioneros de PowerLink!</p>`;
        }
    } catch(e) {
        console.error("Error drawing benchmark", e);
        container.innerHTML = `<p class="small mb-0" style="color: rgba(255,255,255,0.6);"><i class="bi bi-exclamation-octagon"></i> Fallo al conectar con el servidor global.</p>`;
    }
}

function renderLearningBanner(fechaRegistro) {
  const container = document.getElementById("learning-banner-container");
  const fechaInicio = new Date(fechaRegistro);
  const hoy = new Date();
  const diffTime = Math.abs(hoy - fechaInicio);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, 7 - diffDays);
  let mensajeTiempo =
    diasRestantes > 0
      ? `Faltan aprox. <strong>${diasRestantes} días</strong>.`
      : "Finalizando calibración...";
  container.innerHTML = `<div class="alert d-flex align-items-center fade show" role="alert" style="background-color: rgba(13, 202, 240, 0.15); border: 1px solid rgba(13, 202, 240, 0.3); color: #0dcaf0;"><i class="bi bi-info-circle-fill flex-shrink-0 me-3 fs-4"></i><div><h6 class="alert-heading mb-1 fw-bold">Modo Aprendizaje Activo</h6><p class="mb-0 small" style="color: rgba(255,255,255,0.9);">${mensajeTiempo}</p></div></div>`;
}

async function loadChartData(deviceId, range, date) {
  const spinner = document.getElementById("chart-loading");
  const canvas = document.getElementById("device-chart");
  spinner.classList.remove("d-none");
  canvas.style.opacity = "0.5";

  const rangeLabels = {
    daily: "Consumo por Hora",
    weekly: "Consumo Diario",
    monthly: "Consumo Diario",
  };
  
  let dateTitle = date;
  if (range === 'weekly') dateTitle = utils.formatHumanWeek(date);

  document.getElementById(
    "chart-title"
  ).innerText = `${rangeLabels[range]} (${dateTitle})`;

  try {
    let queryStart = "";
    let queryEnd = "";
    let safeDate = date;

    if (safeDate === "today") {
       const now = new Date();
       const year = now.getFullYear();
       const month = String(now.getMonth() + 1).padStart(2, "0");
       const day = String(now.getDate()).padStart(2, "0");
       safeDate = `${year}-${month}-${day}`;
    }

    if (range === "daily") {
      queryStart = `${safeDate}T00:00:00`;
      queryEnd   = `${safeDate}T23:59:59`;
    } else if (range === "weekly") {
      const monday = utils.weekToDateString(safeDate);
      const endObj = new Date(monday); 
      endObj.setDate(endObj.getDate() + 6);
      const sunday = `${endObj.getFullYear()}-${String(endObj.getMonth()+1).padStart(2,'0')}-${String(endObj.getDate()).padStart(2,'0')}`;
      queryStart = `${monday}T00:00:00`;
      queryEnd   = `${sunday}T23:59:59`;
    } else if (range === "monthly") {
      const [y, m] = safeDate.split("-");
      const lastDay = new Date(y, m, 0).getDate();
      queryStart = `${safeDate}-01T00:00:00`;
      queryEnd   = `${safeDate}-${lastDay}T23:59:59`;
    }

    const data = await api.devices.getAnalyticsExact(deviceId, range, queryStart, queryEnd);
    spinner.classList.add("d-none");
    canvas.style.opacity = "1";

    if (!data || !data.labels) throw new Error("Sin datos");

    if (range === "daily") {
       const standardLabels = generate24HourLabels();
       const valuesNormalized = alignDataTo24Hours(data.labels, data.values);
       renderChart(standardLabels, valuesNormalized);
    } else if (range === "weekly") {
       const standardLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
       const valuesNormalized = alignDataToWeekly(data.labels, data.values, queryStart);
       renderChart(standardLabels, valuesNormalized);
    } else {
       // Mensual original mapping o simple
       const { labels: stdLabels, values: vals } = alignDataToMonthly(data.labels, data.values, queryStart);
       renderChart(stdLabels, vals);
    }

    const totalKwh = data.values.reduce((a, b) => a + b, 0);
    const totalCost = totalKwh * (userCostSettings.costo_kwh || 0);

    document.getElementById("lbl-period-kwh").innerText = `${utils.formatKwh(
      totalKwh,
      false
    )}`;
    document.getElementById("lbl-period-cost").innerText = utils.formatCurrency(
      totalCost,
      userCostSettings.moneda
    );
  } catch (error) {
    spinner.classList.add("d-none");
    canvas.style.opacity = "1";
    document.getElementById("chart-title").innerText = "Sin registros.";
    if (currentChart) currentChart.destroy();
    document.getElementById("lbl-period-kwh").innerText = "--";
    document.getElementById("lbl-period-cost").innerText = "--";
  }
}

// === FUNCIÓN AÑADIDA: COMPARACIÓN ===
async function loadComparisonData(mode, dateAStr, dateBStr) {
  const spinner = document.getElementById("chart-loading");
  const deviceId = window.location.hash.split("/")[1];
  spinner.classList.remove("d-none");

  // El Backend de Supabase espera periodos referenciados por su fecha de inicio a las T00:00:00.
  // Para MES: "2026-03" -> "2026-03-01T00:00:00"
  // Para SEMANA: "2026-W11" -> Convertimos a la fecha del Lunes de esa semana.
  // Para DÍA: "2026-03-12" -> "2026-03-12T00:00:00"

  let queryStartA = "";  let queryEndA = "";
  let queryStartB = "";  let queryEndB = "";
  let labelA = "";       let labelB = "";

  if (mode === "daily") {
    queryStartA = `${dateAStr}T00:00:00`;
    queryEndA   = `${dateAStr}T23:59:59`;
    queryStartB = `${dateBStr}T00:00:00`;
    queryEndB   = `${dateBStr}T23:59:59`;
    labelA = dateAStr;
    labelB = dateBStr;
  } else if (mode === "weekly") {
    const mondayA = utils.weekToDateString(dateAStr);
    const mondayB = utils.weekToDateString(dateBStr);
    
    // Calculamos el Domingo (Lunes + 6 días)
    const endAObj = new Date(mondayA); endAObj.setDate(endAObj.getDate() + 6);
    const endBObj = new Date(mondayB); endBObj.setDate(endBObj.getDate() + 6);
    
    const sundayA = `${endAObj.getFullYear()}-${String(endAObj.getMonth()+1).padStart(2,'0')}-${String(endAObj.getDate()).padStart(2,'0')}`;
    const sundayB = `${endBObj.getFullYear()}-${String(endBObj.getMonth()+1).padStart(2,'0')}-${String(endBObj.getDate()).padStart(2,'0')}`;

    queryStartA = `${mondayA}T00:00:00`;
    queryEndA   = `${sundayA}T23:59:59`;
    queryStartB = `${mondayB}T00:00:00`;
    queryEndB   = `${sundayB}T23:59:59`;
    labelA = `Semana: ${utils.formatHumanWeek(dateAStr)}`;
    labelB = `Semana: ${utils.formatHumanWeek(dateBStr)}`;
  } else if (mode === "monthly") {
    const [yA, mA] = dateAStr.split("-");
    const [yB, mB] = dateBStr.split("-");
    const lastDayA = new Date(yA, mA, 0).getDate(); // Día 0 del mes siguiente = Último día de este mes
    const lastDayB = new Date(yB, mB, 0).getDate();

    queryStartA = `${dateAStr}-01T00:00:00`;
    queryEndA   = `${dateAStr}-${lastDayA}T23:59:59`;
    queryStartB = `${dateBStr}-01T00:00:00`;
    queryEndB   = `${dateBStr}-${lastDayB}T23:59:59`;
    labelA = `Mes: ${dateAStr}`;
    labelB = `Mes: ${dateBStr}`;
  }

  document.getElementById("chart-title").innerText = `Comparativa: ${labelA} vs ${labelB}`;

  try {
    const [dataA, dataB] = await Promise.all([
      api.devices.getAnalyticsExact(deviceId, mode, queryStartA, queryEndA),
      api.devices.getAnalyticsExact(deviceId, mode, queryStartB, queryEndB),
    ]);

    spinner.classList.add("d-none");

    // --- AQUÍ ESTÁ LA MAGIA ---
    // Superponemos las series. Cada línea de Chart.js correrá a una misma velocidad dictada
    // por un eje X común genérico (00 hrs, Semanal, etc.)
    if (mode === "daily") {
      const standardLabels = generate24HourLabels();
      const valuesANormalized = alignDataTo24Hours(dataA.labels, dataA.values);
      const valuesBNormalized = alignDataTo24Hours(dataB.labels, dataB.values);
      renderChart(standardLabels, valuesANormalized, valuesBNormalized, labelA, labelB);
    } else if (mode === "weekly") {
      const standardLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const valuesANormalized = alignDataToWeekly(dataA.labels, dataA.values, queryStartA);
      const valuesBNormalized = alignDataToWeekly(dataB.labels, dataB.values, queryStartB);
      renderChart(standardLabels, valuesANormalized, valuesBNormalized, labelA, labelB);
    } else if (mode === "monthly") {
      const resultA = alignDataToMonthly(dataA.labels, dataA.values, queryStartA);
      const resultB = alignDataToMonthly(dataB.labels, dataB.values, queryStartB);
      
      const maxDays = Math.max(resultA.labels.length, resultB.labels.length);
      const standardLabels = Array.from({length: maxDays}, (_, i) => `${i+1}`);
      const valuesANormalized = new Array(maxDays).fill(0);
      const valuesBNormalized = new Array(maxDays).fill(0);

      resultA.values.forEach((v, i) => valuesANormalized[i] = v);
      resultB.values.forEach((v, i) => valuesBNormalized[i] = v);

      renderChart(standardLabels, valuesANormalized, valuesBNormalized, labelA, labelB);
    }
  } catch (e) {
    console.error(e);
    spinner.classList.add("d-none");
    Notificaciones.mostrar("Error al cargar datos para comparación.", "error");
  }
}

function renderChart(
  labels,
  valuesA,
  valuesB = null,
  labelA = "Energía (kWh)",
  labelB = "Comparativa"
) {
  const canvas = document.getElementById("device-chart");
  const ctx = canvas.getContext("2d");
  if (currentChart) currentChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(5, 99, 187, 0.9)");
  gradient.addColorStop(1, "rgba(5, 99, 187, 0.0)");

  const datasets = [
    {
      label: labelA,
      data: valuesA,
      backgroundColor: gradient,
      borderColor: "#0563bb",
      borderWidth: 1,
      borderRadius: 4,
      barPercentage: 0.6,
      order: 2,
    },
  ];

  if (valuesB) {
    datasets.push({
      label: labelB,
      data: valuesB,
      backgroundColor: "rgba(220, 53, 69, 0.2)",
      borderColor: "#dc3545",
      borderWidth: 2,
      type: "line",
      tension: 0.3,
      pointRadius: 3,
      order: 1,
    });
  }

  currentChart = new Chart(ctx, {
    type: "bar",
    data: { labels: labels, datasets: datasets },
    plugins: [{
      id: 'noData',
      afterDraw: (chart) => {
        // Checar si todos los valores de todas las lineas son estrictamente 0
        const isDataEmpty = chart.data.datasets.every((ds) => ds.data.every((val) => val === 0));
        if (isDataEmpty) {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = "normal 14px 'Inter', sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillText('Sin información registrada para este rango de fechas.', width / 2, height / 2);
          ctx.restore();
        }
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: !!valuesB, labels: { color: "#fff" } },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "rgba(255,255,255,0.2)",
          borderWidth: 1,
          mode: "index",
          intersect: false,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(
                3
              )} kWh`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "rgba(255,255,255,0.7)" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "rgba(255,255,255,0.7)" },
        },
      },
    },
  });
}

async function loadDeviceAlerts(deviceId) {
  const container = document.getElementById("device-alerts-list");
  try {
    const allAlerts = await api.alerts.list();
    const deviceAlerts = allAlerts.filter(
      (a) => a.id_dispositivo_fk === deviceId
    );
    if (deviceAlerts.length === 0) {
      container.innerHTML = `<div class="text-center py-3" style="color: rgba(255,255,255,0.5);"><i class="bi bi-check-circle text-success fs-3"></i><p class="mb-0 mt-2 small">Normal.</p></div>`;
      return;
    }
    container.innerHTML = deviceAlerts
      .map(
        (alert) =>
          `<div class="list-group-item bg-transparent border-bottom px-0 py-3" style="border-color: rgba(255,255,255,0.1) !important;"><div class="d-flex align-items-start"><div class="me-3 fs-4 text-white">${getAlertIcon(
            alert.tipo_alerta
          )}</div><div><h6 class="mb-1 text-white" style="font-size: 0.9rem;">${formatAlertType(
            alert.tipo_alerta
          )}</h6><p class="mb-0 small" style="color: rgba(255,255,255,0.6);">${
            alert.mensaje
          }</p></div></div></div>`
      )
      .join("");
  } catch (e) {
    container.innerHTML = "<small class='text-danger'>Error.</small>";
  }
}

function setupListeners(deviceId) {
  document
    .getElementById("btn-back")
    .addEventListener("click", () => (window.location.hash = "#devices"));
  const datePicker = document.getElementById("date-picker");
  datePicker.addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    const currentRange =
      document.querySelector(".range-btn.active").dataset.range;
    loadChartData(deviceId, currentRange, selectedDate);
  });
  document.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".range-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const range = e.target.dataset.range;
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, "0");

      if (range === 'daily') {
          datePicker.type = 'date';
          datePicker.value = `${year}-${month}-${day}`;
      } else if (range === 'weekly') {
          datePicker.type = 'week';
          datePicker.value = utils.getCurrentWeekString();
      } else if (range === 'monthly') {
          datePicker.type = 'month';
          datePicker.value = `${year}-${month}`;
      }

      const date = datePicker.value;
      if (date) {
        loadChartData(deviceId, range, date);
      } else {
        // Si el valor está vacío (ej. al poner weekly), forzamos interfaz limpia
        const canvas = document.getElementById("device-chart");
        if (currentChart) currentChart.destroy();
        document.getElementById("chart-title").innerText = "Selecciona de calendario...";
        document.getElementById("lbl-period-kwh").innerText = "--";
        document.getElementById("lbl-period-cost").innerText = "--";
      }
    });
  });
  document
    .getElementById("btn-open-compare")
    .addEventListener("click", () => {
      // Forzar que el modal limpie su form
      document.getElementById("compare-form").reset();
      document.getElementById("compare-date-a").type = 'date';
      document.getElementById("compare-date-b").type = 'date';
      new bootstrap.Modal(document.getElementById("compareModal")).show();
    });

  // Listener para cambiar el TIPO de Input dinámicamente
  document.getElementById("compare-type-select").addEventListener("change", (e) => {
    const mode = e.target.value;
    const inputA = document.getElementById("compare-date-a");
    const inputB = document.getElementById("compare-date-b");
    
    // Limpiamos los inputs al cambiar de modo para evitar fechas invalidas arrastradas
    inputA.value = '';
    inputB.value = '';

    if (mode === "daily") {
      inputA.type = "date"; inputB.type = "date";
    } else if (mode === "weekly") {
      inputA.type = "week"; inputB.type = "week";
    } else if (mode === "monthly") {
      inputA.type = "month"; inputB.type = "month";
    }
  });

  // Evento Submit de la modal
  document.getElementById("compare-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const mode = document.getElementById("compare-type-select").value;
    const dateA = document.getElementById("compare-date-a").value;
    const dateB = document.getElementById("compare-date-b").value;
    
    bootstrap.Modal.getInstance(document.getElementById("compareModal")).hide();
    loadComparisonData(mode, dateA, dateB);
  });
  document
    .getElementById("community-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const brand = document.getElementById("input-brand").value;
      const model = document.getElementById("input-model").value;
      const btn = document.getElementById("btn-save-community");
      const originalText = btn.innerText;
      btn.disabled = true;
      btn.innerText = "Guardando...";
      try {
        const updatedDevice = await api.devices.update(deviceId, {
          device_brand: brand,
          device_model: model,
        });

        // Actualizamos el dispositivo en el store global para que recuerde los datos
        // y no haya necesidad de recargar la página.
        store.updateDevice(updatedDevice);

        document
          .getElementById("badge-community-ok")
          .classList.remove("d-none");
          
        // Bloqueamos inputs porque ya se guardaron con exito
        document.getElementById("input-brand").disabled = true;
        document.getElementById("input-model").disabled = true;
        btn.classList.add("d-none");
        
        // Disparamos el renderizado del widget para verlo aparecer de inmediato
        renderCommunityBenchmark(updatedDevice);

        Notificaciones.mostrar(
          "Datos comunitarios guardados correctamente.",
          "success"
        );
      } catch (err) {
        Notificaciones.mostrar("Error al guardar datos comunitarios.", "error");
        btn.disabled = false;
        btn.innerText = originalText;
      } finally {
        // El finally ya no rehabilita el boton si fue exito, lo maneja el catch.
      }
    });
  document.getElementById("btn-download-csv").addEventListener("click", () => {
    if (!currentChart)
      return Notificaciones.mostrar("No hay datos para exportar.", "warning");
    new bootstrap.Modal(document.getElementById("downloadModal")).show();
  });
  document
    .getElementById("btn-confirm-download")
    .addEventListener("click", () => {
      const name =
        document.getElementById("detail-name").innerText || "Dispositivo";
      generateCSV(name);
      bootstrap.Modal.getInstance(
        document.getElementById("downloadModal")
      ).hide();
    });
}

// --- HELPERS PARA NORMALIZACIÓN DE HORAS ---

function generate24HourLabels() {
  // Retorna ["00:00", "01:00", ... "23:00"]
  return Array.from({ length: 24 }, (_, i) => {
    return `${String(i).padStart(2, "0")}:00`;
  });
}

function alignDataTo24Hours(apiLabels, apiValues) {
  const filledValues = new Array(24).fill(0);

  apiLabels.forEach((label, index) => {
    // La API ahora manda formato estricto "00:00", "23:00" etc, omitiendo a.m. o p.m.
    const timePart = label.includes("T") ? label.split("T")[1] : label;
    const hour = parseInt(timePart.split(":")[0], 10);
    
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      filledValues[hour] = apiValues[index];
    }
  });

  return filledValues;
}

function alignDataToWeekly(labels, values, weekStartStr) {
  // 0: Lun, 1: Mar, 2: Mié, 3: Jue, 4: Vie, 5: Sáb, 6: Dom
  const normalized = new Array(7).fill(0);
  
  // Extraemos YYYY-MM-DD descartando la T00:00:00 y creamos Date Local absoluto
  const datePart = weekStartStr.split("T")[0];
  const [yy, mm, dd] = datePart.split("-");
  const startObj = new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));

  const allowedLabels = [];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // 1. Generar los 7 textos esperados para emparejar (Ej. "9 mar", "10 mar")
  for(let i=0; i<7; i++) {
     const d = new Date(startObj);
     d.setDate(d.getDate() + i);
     const monthStr = meses[d.getMonth()];
     // Importante: parseamos a int para remover ceros (09 -> 9) como lo hace api.js
     const dayNum = parseInt(d.getDate(), 10);
     allowedLabels.push(`${dayNum} ${monthStr}`);
  }

  // 2. Colocar cada valor en su respectiva cubeta pre-calculada de los 7 días
  for (let i = 0; i < labels.length; i++) {
     const idx = allowedLabels.indexOf(labels[i]);
     if (idx !== -1) {
        normalized[idx] = values[i];
     }
  }

  return normalized;
}

function alignDataToMonthly(labels, values, monthStartStr) {
  const datePart = monthStartStr.split("T")[0];
  const [yy, mm] = datePart.split("-");
  const maxDays = new Date(parseInt(yy, 10), parseInt(mm, 10), 0).getDate();

  const stdLabels = Array.from({length: maxDays}, (_, i) => `${i+1}`);
  const normalized = new Array(maxDays).fill(0);

  for (let i = 0; i < labels.length; i++) {
     const parts = labels[i].split(" ");
     if (parts.length >= 2) {
       const day = parseInt(parts[0], 10);
       if (!isNaN(day) && day >= 1 && day <= maxDays) {
          normalized[day - 1] = values[i];
       }
     }
  }
  return { labels: stdLabels, values: normalized };
}

function getDownloadModalHTML() {
  return `
  <div class="modal fade" id="downloadModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" style="background-color: var(--surface-color); color: white;">
        <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h5 class="modal-title"><i class="bi bi-file-earmark-spreadsheet text-success me-2"></i>Exportar Datos</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center py-4">
          <p class="mb-3" style="color: rgba(255,255,255,0.8);">Se generará un archivo CSV con el desglose de consumo y costo estimado del periodo actual.</p>
          <div class="d-inline-block p-3 rounded mb-3" style="background-color: rgba(255,255,255,0.05);">
            <div class="d-flex align-items-center gap-3">
                <div class="text-start">
                    <small class="d-block text-white">Formato</small>
                    <span class="fw-bold text-white">.CSV (Excel)</span>
                </div>
                <div style="width: 1px; height: 30px; background: rgba(255,255,255,0.2);"></div>
                <div class="text-start">
                    <small class="d-block text-white">Columnas</small>
                    <span class="fw-bold text-white">Fecha, kWh, Costo</span>
                </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="border-top: 1px solid rgba(255,255,255,0.1);">
          <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-sm btn-success" id="btn-confirm-download">
            <i class="bi bi-download me-2"></i>Descargar Ahora
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function generateCSV(filenamePrefix) {
  if (!currentChart) return;

  const labels = currentChart.data.labels;
  const values = currentChart.data.datasets[0].data; // Asumimos dataset 0 es el principal
  const currency = userCostSettings.moneda || "MXN";
  const rate = userCostSettings.costo_kwh || 0;

  // 1. Cabeceras (BOM para que Excel reconozca acentos automáticamente)
  let csvContent =
    "\uFEFFFecha/Hora,Consumo (kWh),Costo Estimado (" + currency + ")\n";

  // 2. Filas de datos
  labels.forEach((label, i) => {
    const kwh = values[i] || 0;
    const cost = (kwh * rate).toFixed(2); // Calculamos costo por fila
    // Limpiamos la etiqueta de comas para no romper el CSV
    const cleanLabel = String(label).replace(/,/g, "");
    csvContent += `${cleanLabel},${kwh},${cost}\n`;
  });

  // 3. Disparar descarga
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURI(csvContent);

  // Nombre del archivo: Reporte_Nombre_Fecha.csv
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = filenamePrefix.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  link.download = `Reporte_${cleanName}_${dateStr}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getAlertIcon(type) {
  const icons = {
    PICO_CONSUMO: "⚡",
    VAMPIRO: "🧛",
    OFFLINE: "🔌",
    ERROR: "⚠️",
  };
  return icons[type] || "ℹ️";
}
function formatAlertType(type) {
  return type.replace(/_/g, " ");
}

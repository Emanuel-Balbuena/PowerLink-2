/**
 * js/views/deviceDetail.js
 * Vista de detalle: Analítica profunda, Time Travel y Costos
 * Versión Final V4.1: FIX COMPLETO (Comparison + Timezone + UI)
 */
import { api } from "../api.js";
import { store } from "../state.js";
import { utils } from "../utils.js";
import { Notificaciones } from "../notificaciones.js";

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

                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-info" id="btn-open-compare" title="Comparar">
                            <i class="bi bi-bar-chart-steps"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" id="btn-download-csv" title="Descargar Datos">
                            <i class="bi bi-download"></i>
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
  return `<div class="modal fade" id="compareModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content" style="background-color: var(--surface-color); color: white;"><div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);"><h5 class="modal-title">Comparar Periodos</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body"><form id="compare-form"><div class="mb-3"><label class="form-label">Comparar con:</label><select class="form-select bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="compare-range-select"><option value="prev_day">Día Anterior</option><option value="prev_week">Semana Pasada</option></select></div><div class="d-grid"><button type="submit" class="btn btn-info">Generar Gráfica</button></div></form></div></div></div></div>`;
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

    if (device.device_brand)
      document.getElementById("input-brand").value = device.device_brand;
    if (device.device_model)
      document.getElementById("input-model").value = device.device_model;
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
  document.getElementById(
    "chart-title"
  ).innerText = `${rangeLabels[range]} (${date})`;

  try {
    let queryDate = date;
    if (date !== "today" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      queryDate = `${date}T00:00:00`;
    }

    const data = await api.devices.getAnalytics(deviceId, range, queryDate);
    spinner.classList.add("d-none");
    canvas.style.opacity = "1";

    if (!data || !data.labels) throw new Error("Sin datos");

    const monthNames = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ];

    const cleanLabels = data.labels.map((label) => {
      if (range === "daily" && label.includes("T")) {
        const d = new Date(label);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      if (label.includes("T")) {
        // FIX MANUAL: Cortar texto para evitar UTC shift
        const datePart = label.split("T")[0];
        const parts = datePart.split("-");
        const dayNum = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        return `${dayNum} ${monthNames[monthIndex]}`;
      }
      return label;
    });

    renderChart(cleanLabels, data.values);

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
async function loadComparisonData(deviceId, compareMode) {
  const spinner = document.getElementById("chart-loading");
  spinner.classList.remove("d-none");

  const activeBtn = document.querySelector(".range-btn.active");
  const rangeA = activeBtn?.dataset.range || "daily";
  const datePickerVal = document.getElementById("date-picker").value;
  const labelA = "Actual";

  // Lógica para fecha B (Pasado)
  let parts = datePickerVal.split("-");
  let dateBObj = new Date(parts[0], parts[1] - 1, parts[2]);
  let labelB = "Comparativa";

  if (compareMode === "prev_day") {
    dateBObj.setDate(dateBObj.getDate() - 1);
    labelB = "Día Anterior";
  } else if (compareMode === "prev_week") {
    dateBObj.setDate(dateBObj.getDate() - 7);
    labelB = "Semana Pasada";
  }

  const yearB = dateBObj.getFullYear();
  const monthB = String(dateBObj.getMonth() + 1).padStart(2, "0");
  const dayB = String(dateBObj.getDate()).padStart(2, "0");
  const dateBStr = `${yearB}-${monthB}-${dayB}`;

  const queryDateA = `${datePickerVal}T00:00:00`;
  const queryDateB = `${dateBStr}T00:00:00`;

  document.getElementById(
    "chart-title"
  ).innerText = `Comparativa: ${datePickerVal} vs ${dateBStr}`;

  try {
    const [dataA, dataB] = await Promise.all([
      api.devices.getAnalytics(deviceId, rangeA, queryDateA),
      api.devices.getAnalytics(deviceId, rangeA, queryDateB),
    ]);

    spinner.classList.add("d-none");

    // --- AQUÍ ESTÁ LA MAGIA ---
    // Si estamos viendo "Día", forzamos el eje X a ser 00:00 - 23:00
    if (rangeA === "daily") {
      // 1. Generamos etiquetas fijas (00:00 ... 23:00)
      const standardLabels = generate24HourLabels();

      // 2. Alineamos los datos a esas 24 cubetas (rellenando con 0 lo que falte)
      const valuesANormalized = alignDataTo24Hours(dataA.labels, dataA.values);
      const valuesBNormalized = alignDataTo24Hours(dataB.labels, dataB.values);

      renderChart(
        standardLabels,
        valuesANormalized,
        valuesBNormalized,
        labelA,
        labelB
      );
    } else {
      // Si es Semanal o Mensual, usamos la lógica anterior (menos crítica)
      // Nota: Idealmente también deberías normalizar días, pero para este fix nos centramos en horas.
      renderChart(dataA.labels, dataA.values, dataB.values, labelA, labelB);
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
      const date = datePicker.value;
      loadChartData(deviceId, range, date);
    });
  });
  document
    .getElementById("btn-open-compare")
    .addEventListener("click", () =>
      new bootstrap.Modal(document.getElementById("compareModal")).show()
    );
  document.getElementById("compare-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const mode = document.getElementById("compare-range-select").value;
    bootstrap.Modal.getInstance(document.getElementById("compareModal")).hide();
    loadComparisonData(deviceId, mode);
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
        await api.devices.update(deviceId, {
          device_brand: brand,
          device_model: model,
        });
        document
          .getElementById("badge-community-ok")
          .classList.remove("d-none");
        Notificaciones.mostrar(
          "Datos comunitarios guardados correctamente.",
          "success"
        );
      } catch (err) {
        Notificaciones.mostrar("Error al guardar datos comunitarios.", "error");
      } finally {
        btn.disabled = false;
        btn.innerText = originalText;
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
  // Crea un array de 24 ceros [0, 0, 0, ... 0]
  const filledValues = new Array(24).fill(0);

  apiLabels.forEach((label, index) => {
    // La API manda ISO strings: "2025-11-12T16:00:00..."
    // Intentamos sacar la hora.
    let hour = -1;

    if (label.includes("T")) {
      // Extraemos la hora después de la T
      const timePart = label.split("T")[1]; // "16:00:00..."
      hour = parseInt(timePart.split(":")[0], 10);
    } else {
      // Fallback si la etiqueta ya viniera formateada (ej: "16:00")
      hour = parseInt(label.split(":")[0], 10);
    }

    // Si la hora es válida (0-23), colocamos el valor en su posición correcta
    if (hour >= 0 && hour <= 23) {
      filledValues[hour] = apiValues[index];
    }
  });

  return filledValues;
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

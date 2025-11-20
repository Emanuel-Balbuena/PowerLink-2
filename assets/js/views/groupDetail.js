/**
 * js/views/groupDetail.js
 * Vista de detalle: Analítica por GRUPO
 * Versión Final: Alto Contraste + Indicadores LED
 */
import { api } from "../api.js";
import { store } from "../state.js";
import { utils } from "../utils.js";
import { Notificaciones } from "../notificaciones.js";

let currentChart = null;
let userCostSettings = { costo_kwh: 0, moneda: "MXN" };

export async function renderGroupDetail(container, groupId) {
  // 1. Costos
  try {
    const settings = await api.user.getSettings();
    if (settings) userCostSettings = settings;
  } catch (e) {
    Notificaciones.mostrar(
      "No se pudieron cargar los ajustes de costo.",
      e,
      "error"
    );
  }

  // 2. Template HTML (Alto Contraste)
  const html = `
    <section class="section">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <div class="d-flex flex-column align-items-center justify-content-center gap-3 mb-2">
    <h2 class="mb-0" id="group-name" style="color: #ffffff;">Cargando...</h2>
    <span class="badge rounded-pill bg-info text-dark border border-light fw-bold">ZONA / GRUPO</span>
</div>
        <p style="color: rgba(255,255,255,0.8);">Consumo agregado de todos los dispositivos en esta zona.</p>
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
                        <label style="color: rgba(255,255,255,0.9);"><i class="bi bi-calendar3"></i></label>
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
                        <button class="btn btn-sm btn-outline-success" id="btn-download-csv" title="Descargar Informe">
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
                    <small class="d-block mb-1" style="color: rgba(255,255,255,0.9);">Total Grupo</small>
                    <h4 class="mb-0 text-white fw-bold" id="lbl-period-kwh">-- kWh</h4>
                </div>
            </div>
            <div class="col-6">
                <div class="p-3 rounded border" style="background-color: rgba(255, 193, 7, 0.15); border-color: rgba(255, 193, 7, 0.5) !important;">
                    <small class="d-block mb-1" style="color: rgba(255,255,255,0.9);">Costo Est.</small>
                    <h4 class="mb-0 text-white fw-bold" id="lbl-period-cost">--</h4>
                </div>
            </div>
        </div>

        <div class="row mb-4">
          <div class="col-12">
            <div class="card h-100" style="background-color: var(--surface-color); border: none;">
                <div class="card-body position-relative" style="min-height: 400px; padding: 20px;">
                    <h5 class="card-title" id="chart-title" style="color: #ffffff;">Cargando...</h5>
                    <div id="chart-loading" class="position-absolute top-50 start-50 translate-middle text-center">
                        <div class="spinner-border text-primary" role="status"></div>
                    </div>
                    <div style="height: 350px; width: 100%;">
                        <canvas id="group-chart"></canvas>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card" style="background-color: var(--surface-color); border: none;">
                    <div class="card-header bg-transparent border-bottom text-white" style="border-color: rgba(255,255,255,0.1) !important;">
                        <i class="bi bi-hdd-network me-2 text-info"></i> Dispositivos en este Grupo
                    </div>
                    <div class="card-body">
                         <div id="group-devices-list" class="row g-3"></div>
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
  setupListeners(groupId);

  // Init fecha (Fix Local)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  document.getElementById("date-picker").value = todayStr;

  await Promise.all([
    loadGroupInfo(groupId),
    loadChartData(groupId, "daily", todayStr),
  ]);
}

function getCompareModalHTML() {
  return `<div class="modal fade" id="compareModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content" style="background-color: var(--surface-color); color: white;"><div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);"><h5 class="modal-title">Comparar Periodos</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body"><form id="compare-form"><div class="mb-3"><label class="form-label">Comparar con:</label><select class="form-select bg-dark text-light" style="border: 1px solid rgba(255,255,255,0.2);" id="compare-range-select"><option value="prev_day">Día Anterior</option><option value="prev_week">Semana Pasada</option></select></div><div class="d-grid"><button type="submit" class="btn btn-info">Generar Gráfica</button></div></form></div></div></div></div>`;
}

// --- LÓGICA VISUAL ---

async function loadGroupInfo(groupId) {
  // 1. Nombre del grupo
  let groups = store.userGroups;
  if (!groups.length) groups = await api.groups.list();
  const group = groups.find((g) => g.id_grupo == groupId);

  if (group)
    document.getElementById("group-name").innerText = group.nombre_grupo;

  // 2. Listar dispositivos (LED STYLE)
  let devices = store.userDevices;
  if (!devices.length) devices = await api.devices.list();

  const myDevices = devices.filter((d) => d.id_grupo_fk == groupId);
  const listContainer = document.getElementById("group-devices-list");

  if (myDevices.length === 0) {
    listContainer.innerHTML =
      '<div class="col-12 text-center" style="color: rgba(255,255,255,0.5);">Grupo vacío</div>';
  } else {
    listContainer.innerHTML = myDevices
      .map((d) => {
        const isOnline = utils.isOnline(d.ultimo_heartbeat);

        // Estilos LED dinámicos
        const ledColor = isOnline ? "#00ff00" : "#dc3545"; // Verde Neón / Rojo
        const ledShadow = isOnline ? "0 0 8px #00ff00" : "none"; // Glow solo si está online
        const statusText = isOnline ? "Online" : "Offline";

        return `
            <div class="col-md-4 col-sm-6">
                <div class="p-3 border rounded d-flex align-items-center" 
                     style="background-color: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1) !important;">
                    
                    <i class="bi bi-cpu text-white me-3 fs-4 opacity-50"></i>
                    
                    <div class="w-100">
                        <div class="fw-bold text-white mb-1 text-truncate">${d.nombre_personalizado}</div>
                        
                        <div class="d-flex align-items-center">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${ledColor}; box-shadow: ${ledShadow}; margin-right: 8px;"></div>
                            <small style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">${statusText}</small>
                        </div>
                    </div>

                </div>
            </div>
        `;
      })
      .join("");
  }
}

async function loadChartData(groupId, range, date) {
  const spinner = document.getElementById("chart-loading");
  const canvas = document.getElementById("group-chart");
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

    const data = await api.groups.getAnalytics(groupId, range, queryDate);

    spinner.classList.add("d-none");
    canvas.style.opacity = "1";

    if (!data || !data.labels) throw new Error("Sin datos");

    // FIX ETIQUETAS (String Parsing)
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
        return new Date(label).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      if (label.includes("T")) {
        const parts = label.split("T")[0].split("-");
        return `${parseInt(parts[2])} ${monthNames[parseInt(parts[1]) - 1]}`;
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
    Notificaciones.mostrar("Error al cargar datos del gráfico", error, "error");
    spinner.classList.add("d-none");
    canvas.style.opacity = "1";
    document.getElementById("chart-title").innerText = "Sin registros.";
    if (currentChart) currentChart.destroy();
    document.getElementById("lbl-period-kwh").innerText = "--";
    document.getElementById("lbl-period-cost").innerText = "--";
  }
}

// === COMPARACIÓN ===

async function loadComparisonData(groupId, compareMode) {
  const spinner = document.getElementById("chart-loading");
  spinner.classList.remove("d-none");
  const activeBtn = document.querySelector(".range-btn.active");
  const rangeA = activeBtn?.dataset.range || "daily";
  const datePickerVal = document.getElementById("date-picker").value;

  // Fechas Manuales
  let parts = datePickerVal.split("-");
  let dateBObj = new Date(parts[0], parts[1] - 1, parts[2]);
  if (compareMode === "prev_day") dateBObj.setDate(dateBObj.getDate() - 1);
  else if (compareMode === "prev_week")
    dateBObj.setDate(dateBObj.getDate() - 7);

  // Formatear YYYY-MM-DD localmente
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
      api.groups.getAnalytics(groupId, rangeA, queryDateA),
      api.groups.getAnalytics(groupId, rangeA, queryDateB),
    ]);
    spinner.classList.add("d-none");

    // Fix 24h para vista diaria
    if (rangeA === "daily") {
      const standardLabels = generate24HourLabels();
      const valuesANormalized = alignDataTo24Hours(dataA.labels, dataA.values);
      const valuesBNormalized = alignDataTo24Hours(dataB.labels, dataB.values);
      renderChart(
        standardLabels,
        valuesANormalized,
        valuesBNormalized,
        "Actual",
        "Comparativa"
      );
    } else {
      // Para semana/mes usamos mapeo simple
      renderChart(
        dataA.labels,
        dataA.values,
        dataB.values,
        "Actual",
        "Comparativa"
      );
    }
  } catch (e) {
    spinner.classList.add("d-none");
    Notificaciones.mostrar("Error de comparación", e, "error");
  }
}

function renderChart(
  labels,
  valuesA,
  valuesB = null,
  labelA = "Consumo",
  labelB = "Comparativa"
) {
  const canvas = document.getElementById("group-chart");
  const ctx = canvas.getContext("2d");
  if (currentChart) currentChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(13, 202, 240, 0.8)"); // Cyan
  gradient.addColorStop(1, "rgba(13, 202, 240, 0.0)");

  const datasets = [
    {
      label: labelA,
      data: valuesA,
      backgroundColor: gradient,
      borderColor: "#0dcaf0",
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
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: !!valuesB, labels: { color: "#fff" } } },
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

// Helpers
function generate24HourLabels() {
  return Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`
  );
}
function alignDataTo24Hours(apiLabels, apiValues) {
  const filledValues = new Array(24).fill(0);
  apiLabels.forEach((label, index) => {
    let hour = -1;
    if (label.includes("T"))
      hour = parseInt(label.split("T")[1].split(":")[0], 10);
    // Fallback simple si viene solo la hora
    else hour = parseInt(label.split(":")[0], 10);

    if (hour >= 0 && hour <= 23) filledValues[hour] = apiValues[index];
  });
  return filledValues;
}

function setupListeners(groupId) {
  document
    .getElementById("btn-back")
    .addEventListener("click", () => (window.location.hash = "#devices"));
  const datePicker = document.getElementById("date-picker");
  datePicker.addEventListener("change", (e) => {
    const currentRange =
      document.querySelector(".range-btn.active").dataset.range;
    loadChartData(groupId, currentRange, e.target.value);
  });
  document.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".range-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const range = e.target.dataset.range;
      loadChartData(groupId, range, datePicker.value);
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
    loadComparisonData(groupId, mode);
  });
  document.getElementById("btn-download-csv").addEventListener("click", () => {
    if (!currentChart)
      return Notificaciones.mostrar("No hay datos para exportar.", "warning");
    new bootstrap.Modal(document.getElementById("downloadModal")).show();
  });
  document
    .getElementById("btn-confirm-download")
    .addEventListener("click", () => {
      const groupName =
        document.getElementById("group-name").innerText || "Grupo";
      generateCSV(groupName); // Usamos la misma función helper copiada
      bootstrap.Modal.getInstance(
        document.getElementById("downloadModal")
      ).hide();
    });
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

/**
 * js/views/groupDetail.js
 * Vista de detalle: Analítica por GRUPO
 * Versión Final: Alto Contraste + Indicadores LED
 */
import { api } from "../api.js";
import { Notificaciones } from "../notificaciones.js";
import { store } from "../state.js";
import { utils } from "../utils.js";

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
                    <div class="d-flex gap-1" style="margin-left:auto;">
                        <button class="btn btn-sm btn-outline-info d-flex align-items-center" id="btn-open-compare" title="Comparar">
                            <i class="bi bi-bar-chart-steps"></i>
                            <span class="ms-1 d-none d-sm-inline">Comparar</span>
                        </button>
                        <button class="btn btn-sm btn-outline-success d-flex align-items-center" id="btn-download-csv" title="Descargar Informe">
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

  // Filtramos por el grupo, pero descartando los archivados para que el frontend coincida con el backend
  const myDevices = devices.filter((d) => d.id_grupo_fk == groupId && d.archivado !== true);
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

    const data = await api.groups.getAnalyticsExact(groupId, range, queryStart, queryEnd);
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

async function loadComparisonData(groupId, mode, dateAStr, dateBStr) {
  const spinner = document.getElementById("chart-loading");
  spinner.classList.remove("d-none");

  // El Backend espera T00:00:00

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
    const lastDayA = new Date(yA, mA, 0).getDate(); 
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
      api.groups.getAnalyticsExact(groupId, mode, queryStartA, queryEndA),
      api.groups.getAnalyticsExact(groupId, mode, queryStartB, queryEndB),
    ]);

    spinner.classList.add("d-none");

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
    plugins: [{
      id: 'noData',
      afterDraw: (chart) => {
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

function alignDataToWeekly(labels, values, weekStartStr) {
  // 0: Lun, 1: Mar, 2: Mié, 3: Jue, 4: Vie, 5: Sáb, 6: Dom
  const normalized = new Array(7).fill(0);
  
  const datePart = weekStartStr.split("T")[0];
  const [yy, mm, dd] = datePart.split("-");
  const startObj = new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));

  const allowedLabels = [];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  for(let i=0; i<7; i++) {
     const d = new Date(startObj);
     d.setDate(d.getDate() + i);
     const monthStr = meses[d.getMonth()];
     const dayNum = parseInt(d.getDate(), 10);
     allowedLabels.push(`${dayNum} ${monthStr}`);
  }

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

function setupListeners(groupId) {
  document
    .getElementById("btn-back")
    .addEventListener("click", () => (window.location.hash = "#devices"));
  const datePicker = document.getElementById("date-picker");
  datePicker.addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    const currentRange =
      document.querySelector(".range-btn.active").dataset.range;
    loadChartData(groupId, currentRange, selectedDate);
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
        loadChartData(groupId, range, date);
      } else {
        const canvas = document.getElementById("group-chart");
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

  document.getElementById("compare-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const mode = document.getElementById("compare-type-select").value;
    const dateA = document.getElementById("compare-date-a").value;
    const dateB = document.getElementById("compare-date-b").value;
    
    bootstrap.Modal.getInstance(document.getElementById("compareModal")).hide();
    loadComparisonData(groupId, mode, dateA, dateB);
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

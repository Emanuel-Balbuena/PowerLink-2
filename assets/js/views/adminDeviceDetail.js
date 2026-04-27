import { api } from "../api.js";
import { Notificaciones } from "../notificaciones.js";
import { utils } from "../utils.js";

let currentChart = null;

export async function renderAdminDeviceDetail(container, hwId) {
  const html = `
    <section class="section">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <div class="d-flex flex-column align-items-center justify-content-center gap-3 mb-2">
            <h2 class="mb-0" id="detail-name" style="color: #ffffff;">Cargando...</h2>
            <span id="detail-status-badge" class="badge rounded-pill bg-dark border border-light" style="font-size: 0.6em; vertical-align: middle;">---</span>
            <span class="badge rounded-pill bg-info text-dark border border-light fw-bold"><i class="bi bi-shield-lock me-1"></i> MODO ADMIN</span>
        </div>
        <p class="text-subtle font-monospace"><i class="bi bi-upc-scan me-1"></i> HW ID: <span id="detail-hwid"></span></p>
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
                      <button type="button" class="btn btn-sm btn-outline-info range-btn active" data-range="daily">Día</button>
                      <button type="button" class="btn btn-sm btn-outline-info range-btn" data-range="weekly">Semana</button>
                      <button type="button" class="btn btn-sm btn-outline-info range-btn" data-range="monthly">Mes</button>
                    </div>

                </div>
            </div>
          </div>
        </div>
        
        <div class="row mb-3 gy-3">
            <div class="col-12">
                <div class="p-3 rounded border" style="background-color: rgba(13, 202, 240, 0.15); border-color: rgba(13, 202, 240, 0.5) !important;">
                    <small class="d-block mb-1" style="color: rgba(255,255,255,0.9);">Consumo Total del Periodo (Telemetría Raw)</small>
                    <h4 class="mb-0 text-white fw-bold" id="lbl-period-kwh">-- kWh</h4>
                </div>
            </div>
        </div>

        <div class="row mb-4">
          <div class="col-12">
            <div class="card h-100" style="background-color: var(--surface-color); border: none;">
                <div class="card-body position-relative" style="min-height: 400px; padding: 20px;">
                    <h5 class="card-title" id="chart-title" style="color: #ffffff;">Cargando datos...</h5>
                    
                    <div id="chart-loading" class="position-absolute top-50 start-50 translate-middle text-center">
                        <div class="spinner-border text-info" role="status"></div>
                    </div>
                    
                    <div style="height: 350px; width: 100%;">
                        <canvas id="device-chart"></canvas>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div class="row gy-4">
            <!-- Columna Izquierda: Health & Metadata -->
            <div class="col-lg-6">
                <div class="card h-100" style="background-color: var(--surface-color); border: none;">
                    <div class="card-body">
                        <h5 class="card-title mb-3" style="color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                            <i class="bi bi-info-circle text-info me-2"></i> Metadatos de Hardware y Red
                        </h5>
                        
                        <ul class="list-group list-group-flush bg-transparent mt-3">
                            <li class="list-group-item bg-transparent text-light border-secondary px-0 d-flex justify-content-between">
                                <span class="text-subtle small"><i class="bi bi-person me-2"></i>Dueño (Email):</span>
                                <span id="detail-owner" class="small fw-bold">--</span>
                            </li>
                            <li class="list-group-item bg-transparent text-light border-secondary px-0 d-flex justify-content-between">
                                <span class="text-subtle small"><i class="bi bi-heart-pulse me-2"></i>Último Heartbeat:</span>
                                <span id="detail-heartbeat" class="small">--</span>
                            </li>
                            <li class="list-group-item bg-transparent text-light border-secondary px-0 d-flex justify-content-between">
                                <span class="text-subtle small"><i class="bi bi-cpu me-2"></i>Firmware:</span>
                                <span class="badge bg-secondary">V 1.0.0</span>
                            </li>
                            <li class="list-group-item bg-transparent text-light border-0 px-0 d-flex justify-content-between">
                                <span class="text-subtle small"><i class="bi bi-wifi me-2"></i>Señal WiFi (RSSI):</span>
                                <span class="text-warning small">-65 dBm (Good)</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Columna Derecha: Danger Zone -->
            <div class="col-lg-6">
                <div class="card h-100 border-danger" style="background-color: rgba(220, 53, 69, 0.05);">
                    <div class="card-body p-4">
                        <h5 class="card-title text-danger mb-3 border-bottom border-danger pb-2">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>Danger Zone
                        </h5>
                        
                        <p class="small mb-4" style="color: rgba(255,255,255,0.7);">Estas acciones requieren privilegios administrativos y afectan permanentemente la operación remota del equipo.</p>
                        
                        <div class="d-grid gap-3">
                            <button class="btn btn-outline-warning text-start" id="btn-reboot">
                                <i class="bi bi-arrow-clockwise me-2"></i> Forzar Reinicio (Reboot)
                            </button>
                            <button class="btn btn-danger text-start" id="btn-unlink">
                                <i class="bi bi-x-circle me-2"></i> Desvincular Dispositivo (Factory Reset)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </section>
  `;

  container.innerHTML = html;
  
  // Buscar información base (usamos el endpoint general admin y lo buscamos)
  let dev = null;
  try {
    const res = await api.admin.getDevices(1, 1000); 
    const devices = res.data || res;
    dev = devices.find(d => d.id_hardware === hwId);
    if (!dev) throw new Error("Hardware no localizado en la red.");
  } catch (error) {
    Notificaciones.mostrar("No se pudo cargar la base del dispositivo.", error.message, "error");
    document.getElementById("detail-name").innerText = "Error";
    return;
  }

  setupListeners(dev);

  // Inicializar fecha local
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  document.getElementById("date-picker").value = todayStr;

  loadStaticInfo(dev);
  // Cargar gráficas usando id_dispositivo que es lo que espera api.devices.getAnalyticsExact
  await loadChartData(dev.id_dispositivo, "daily", todayStr);
}


function setupListeners(device) {
  document.getElementById("btn-back").addEventListener("click", () => window.location.hash = "#admin-devices");
  
  const datePicker = document.getElementById("date-picker");
  datePicker.addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    const currentRange = document.querySelector(".range-btn.active").dataset.range;
    loadChartData(device.id_dispositivo, currentRange, selectedDate);
  });
  
  document.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
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
        loadChartData(device.id_dispositivo, range, date);
      }
    });
  });

  // Action Buttons
  const btnReboot = document.getElementById("btn-reboot");
  btnReboot.addEventListener("click", () => {
      btnReboot.disabled = true;
      btnReboot.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando comando...`;
      
      // Simulación de MQTT Reboot
      setTimeout(() => {
          Notificaciones.mostrar("Comando REBOOT enviado exitosamente vía MQTT (Simulación).", "success");
          btnReboot.disabled = false;
          btnReboot.innerHTML = `<i class="bi bi-arrow-clockwise me-2"></i> Forzar Reinicio (Reboot)`;
      }, 2000);
  });

  const btnUnlink = document.getElementById("btn-unlink");
  btnUnlink.addEventListener("click", async () => {
      const safeName = utils.escapeHTML(device.nombre_personalizado);
      const confirm = window.confirm(`⚠️ ADVERTENCIA CRÍTICA ⚠️\n\nEstás a punto de DESVINCULAR por completo el hardware '${device.id_hardware}'.\nEsto romperá el vínculo con el usuario y lo dejará listo para nueva vinculación.\n\n¿Estás absolutamente seguro de continuar?`);
      
      if (confirm) {
          btnUnlink.disabled = true;
          btnUnlink.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...`;
          try {
              // Llamada a la nueva Edge Function para admins
              await api.admin.deleteDevice(device.id_hardware);
              Notificaciones.mostrar("Hardware desvinculado con éxito. El dispositivo está virgen.", "success");
              setTimeout(() => {
                  window.location.hash = "#admin-devices";
              }, 1500);
          } catch(e) {
              Notificaciones.mostrar("No se pudo desvincular el dispositivo: " + e.message, "error");
              btnUnlink.disabled = false;
              btnUnlink.innerHTML = `<i class="bi bi-x-circle me-2"></i> Desvincular Dispositivo (Factory Reset)`;
          }
      }
  });
}

function loadStaticInfo(device) {
    document.getElementById("detail-name").innerText = utils.escapeHTML(device.nombre_personalizado);
    document.getElementById("detail-hwid").innerText = utils.escapeHTML(device.id_hardware);
    
    const badge = document.getElementById("detail-status-badge");
    const isOnline = utils.isOnline(device.ultimo_heartbeat);
    badge.innerText = isOnline ? "ONLINE" : "OFFLINE";
    badge.className = isOnline
      ? "badge rounded-pill bg-success border-0"
      : "badge rounded-pill bg-secondary border-0";

    document.getElementById("detail-owner").innerText = utils.escapeHTML(device.user_email);
    document.getElementById("detail-heartbeat").innerText = device.ultimo_heartbeat 
        ? new Date(device.ultimo_heartbeat).toLocaleString() 
        : "Nunca";
}

async function loadChartData(internalDeviceId, range, date) {
  const spinner = document.getElementById("chart-loading");
  const canvas = document.getElementById("device-chart");
  spinner.classList.remove("d-none");
  canvas.style.opacity = "0.5";

  const rangeLabels = {
    daily: "Telemetría por Hora",
    weekly: "Telemetría Diaria",
    monthly: "Telemetría Diaria",
  };
  
  let dateTitle = date;
  if (range === 'weekly') dateTitle = utils.formatHumanWeek(date);

  document.getElementById("chart-title").innerText = `${rangeLabels[range]} (${dateTitle})`;

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
      const endObj = new Date(`${monday}T00:00:00`); 
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

    const data = await api.devices.getAnalyticsExact(internalDeviceId, range, queryStart, queryEnd);
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

    document.getElementById("lbl-period-kwh").innerText = `${utils.formatKwh(totalKwh, false)}`;
  } catch (error) {
    spinner.classList.add("d-none");
    canvas.style.opacity = "1";
    document.getElementById("chart-title").innerText = "Sin registros.";
    if (currentChart) currentChart.destroy();
    document.getElementById("lbl-period-kwh").innerText = "-- kWh";
  }
}

// --- RENDERING CHART ---

function renderChart(labels, values) {
  const canvas = document.getElementById("device-chart");
  const ctx = canvas.getContext("2d");
  if (currentChart) currentChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(13, 202, 240, 0.9)");
  gradient.addColorStop(1, "rgba(13, 202, 240, 0.0)");

  currentChart = new Chart(ctx, {
    type: "bar",
    data: { 
        labels: labels, 
        datasets: [{
            label: "Energía (kWh)",
            data: values,
            backgroundColor: gradient,
            borderColor: "#0dcaf0",
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6
        }] 
    },
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
      plugins: {
        legend: { display: false },
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
              return `Consumo: ${context.parsed.y.toFixed(3)} kWh`;
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

// --- HELPERS PARA NORMALIZACIÓN DE FECHAS (Copiados de deviceDetail para independecia total) ---

function generate24HourLabels() {
  return Array.from({ length: 24 }, (_, i) => {
    return `${String(i).padStart(2, "0")}:00`;
  });
}

function alignDataTo24Hours(apiLabels, apiValues) {
  const filledValues = new Array(24).fill(0);
  apiLabels.forEach((label, index) => {
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

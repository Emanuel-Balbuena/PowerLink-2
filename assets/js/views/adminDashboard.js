import { api } from '../api.js';
import { Notificaciones } from '../notificaciones.js';

export async function renderAdminDashboard(container) {
  let displayName = 'Administrador';
  try {
    const user = await api.auth.getUser();
    if (user) {
      displayName = user.user_metadata?.full_name || user.user_metadata?.nombre_completo || user.email.split('@')[0];
    } else {
        window.location.hash = "#logout";
        return;
    }
  } catch (e) { 
      window.location.hash = "#logout";
      return;
  }

  const html = `
    <section class="section dashboard">
      <div class="container section-title" data-aos="fade-up" style="padding-bottom: 20px;">
        <div class="d-flex align-items-center justify-content-center gap-3">
            <i class="bi bi-shield-lock admin-panel-icon"></i>
            <h2 class="mb-0">Panel de Administración</h2>
        </div>
        <p style="color: rgba(255, 255, 255, 0.7);">Resumen global de la red PowerLink.</p>
      </div>

      <div class="container">
        <div class="row gy-4 mb-4">
          <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="100">
            <div class="card h-100 service-item" style="background-color: var(--surface-color); border: none;">
              <div class="card-body text-center">
                  <h3>Dispositivos Totales</h3>
                  <div class="d-flex justify-content-center align-items-baseline gap-2">
                     <h2 id="admin-total-devices" style="font-weight: 700; color: var(--heading-color);">--</h2>
                  </div>
                  <p class="small mb-0" style="color: rgba(255, 255, 255, 0.5);">Equipos registrados en la plataforma.</p>
              </div>
            </div>
          </div>

          <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="200">
            <div class="card h-100 service-item" style="background-color: var(--surface-color); border: none;">
              <div class="card-body text-center">
                  <h3>Nodos Online</h3>
                  <div class="d-flex justify-content-center align-items-baseline gap-2">
                     <h2 id="admin-online-devices" style="font-weight: 700; color: var(--accent-color);">--</h2>
                  </div>
                  <p class="small mb-0" style="color: rgba(255, 255, 255, 0.5);">Equipos comunicándose (últimos 5 mins).</p>
              </div>
            </div>
          </div>

          <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="300">
            <div class="card h-100 service-item" style="background-color: var(--surface-color); border: none;">
              <div class="card-body text-center">
                  <h3>Usuarios Registrados</h3>
                  <div class="d-flex justify-content-center align-items-baseline gap-2">
                     <h2 id="admin-total-users" style="font-weight: 700; color: var(--heading-color);">--</h2>
                  </div>
                  <p class="small mb-0" style="color: rgba(255, 255, 255, 0.5);">Cuentas activas en PowerLink.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="row gy-4">
            <div class="col-12">
                <div class="card" style="background-color: var(--surface-color); border: none; border-radius: 5px; box-shadow: 0px 5px 90px 0px rgba(0,0,0,0.1);">
                    <div class="card-body p-4 text-center">
                        <h4 class="card-title mb-4" style="color: var(--heading-color); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                            <i class="bi bi-hdd-network me-2 text-warning"></i> Gestión de Hardware
                        </h4>
                        <p style="color: rgba(255,255,255,0.7);">Accede al listado global de dispositivos para asistencia técnica y monitoreo.</p>
                        <a href="#admin-devices" class="btn btn-warning rounded-pill px-4 fw-bold">
                            Ver Todos los Dispositivos <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
  loadAdminDashboardData();
}

async function loadAdminDashboardData() {
  try {
    const stats = await api.admin.getStats();
    
    document.getElementById("admin-total-devices").innerText = stats.totalDevices;
    document.getElementById("admin-online-devices").innerText = stats.onlineDevices;
    document.getElementById("admin-total-users").innerText = stats.totalUsers;

  } catch (error) {
    Notificaciones.mostrar("Error cargando dashboard de administrador", error, "error");
  }
}

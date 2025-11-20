/**
 * js/router.js
 * Manejador de navegación
 * Versión: FIX ## Doble Hash en Reset Password
 */
import { renderDashboard } from "./views/dashboard.js";
import { renderDevices } from "./views/devices.js";
import { renderDeviceDetail } from "./views/deviceDetail.js";
import { renderGroupDetail } from "./views/groupDetail.js";
import { renderSettings } from "./views/settings.js";
import { renderConsent } from "./views/consent.js";
import { renderVerifyEmail } from "./views/verifyEmail.js";
import { renderResetPassword } from "./views/resetPassword.js";

export async function handleRouting() {
  const appContent = document.getElementById("app-content");
  if (!appContent) return;

  // 1. LIMPIEZA AGRESIVA DE DOBLE HASH (##)
  // Obtenemos el hash y quitamos TODOS los # del principio para dejarlo limpio
  let currentHash = window.location.hash || "";
  const cleanHashParams = currentHash.replace(/^#+/, ""); // "access_token=..."

  // 2. DETECTAR TOKENS (Reset Password o Verify)
  const isTokenHash =
    cleanHashParams.includes("access_token=") &&
    cleanHashParams.includes("type=");

  if (isTokenHash) {
    // --- CORRECCIÓN: Llenar memoria si viene vacío ---
    // Si el usuario entró directo a app.html, index.html no corrió y localStorage puede estar vacío.
    // Lo detectamos aquí mismo.
    let pendingAction = localStorage.getItem("auth_pending_action");

    if (!pendingAction) {
      if (cleanHashParams.includes("type=recovery")) {
        pendingAction = "recovery";
        localStorage.setItem("auth_pending_action", "recovery");
      } else if (cleanHashParams.includes("type=signup")) {
        // (Esto protege verifyEmail por si acaso)
        pendingAction = "signup";
        localStorage.setItem("auth_pending_action", "signup");
      }
    }

    // Definir el destino limpio
    let nextHash = "#dashboard";
    if (pendingAction === "recovery") nextHash = "#reset-password";
    if (pendingAction === "signup") nextHash = "#verify-email";

    // Limpiar la URL visualmente (Quitamos el token feo)
    window.history.replaceState(null, "", window.location.pathname + nextHash);

    // Actualizamos la variable local para usarla abajo inmediatamente
    currentHash = nextHash;
  }

  // 3. LÓGICA DE PRIORIDAD (Persistencia)
  // Normalizamos el hash final con un solo #
  let finalHash = currentHash.startsWith("#") ? currentHash : "#" + currentHash;
  if (finalHash === "#" || finalHash === "") finalHash = "#dashboard";

  // Recuperar intención de la memoria si estamos en dashboard por error
  const storedAction = localStorage.getItem("auth_pending_action");

  if (finalHash === "#dashboard" && storedAction) {
    console.log(`🧠 Router: Redirigiendo por memoria a ${storedAction}`);
    if (storedAction === "recovery") finalHash = "#reset-password";
    if (storedAction === "signup") finalHash = "#verify-email";

    // Forzar URL visual
    window.history.replaceState(null, "", window.location.pathname + finalHash);
  }

  // 4. RENDERIZADO
  console.log("Navegando a:", finalHash);
  updateActiveNav(finalHash);

  try {
    if (finalHash.startsWith("#reset-password")) {
      await renderResetPassword(appContent);
    } else if (finalHash.startsWith("#verify-email")) {
      await renderVerifyEmail(appContent);
    } else if (finalHash === "#dashboard") {
      // Seguridad: Si renderizamos dashboard, limpiamos acciones viejas
      // para no atrapar al usuario en el futuro.
      if (!storedAction) await renderDashboard(appContent);
      else await renderDashboard(appContent);
    } else if (finalHash === "#devices") {
      await renderDevices(appContent);
    } else if (finalHash.startsWith("#devices/")) {
      const id = finalHash.split("/")[1];
      await renderDeviceDetail(appContent, id);
    } else if (finalHash.startsWith("#groups/")) {
      const id = finalHash.split("/")[1];
      await renderGroupDetail(appContent, id);
    } else if (finalHash === "#settings") {
      await renderSettings(appContent);
    } else if (finalHash.startsWith("#consent")) {
      await renderConsent(appContent);
    }

    if (window.AOS) setTimeout(() => window.AOS.refresh(), 100);
  } catch (error) {
    console.error("🚨 Error renderizando:", error);
    appContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
}

function updateActiveNav(hash) {
  const links = document.querySelectorAll(".navmenu a");
  if (hash.includes("access_token=")) return;
  links.forEach((link) => link.classList.remove("active"));
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === hash || (hash.startsWith("#groups/") && href === "#devices")) {
      link.classList.add("active");
    }
  });
}

/**
 * js/router.js
 * Manejador de navegación (Versión BLINDADA para Auth)
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

  // 1. OBTENER HASH ACTUAL
  let fullHash = window.location.hash;
  if (fullHash.startsWith("##")) fullHash = fullHash.substring(1);
  const cleanHash = fullHash.slice(1); // Quitar el #

  // 2. DETECTAR TOKENS DE SUPABASE (Primera carga)
  const isTokenHash =
    cleanHash.includes("access_token=") && cleanHash.includes("type=");

  if (isTokenHash) {
    // Si hay token, extraemos el tipo por seguridad, pero confiamos más en LocalStorage
    // Limpiamos la URL visualmente
    const pendingAction = localStorage.getItem("auth_pending_action");
    let nextHash = "#dashboard";

    if (pendingAction === "recovery") nextHash = "#reset-password";
    if (pendingAction === "signup") nextHash = "#verify-email";

    window.history.replaceState(null, "", window.location.pathname + nextHash);
    fullHash = nextHash; // Actualizamos variable local
  }

  // 3. LÓGICA DE PRIORIDAD (PERSISTENCIA)
  // Si el hash es vacío o dashboard, verificamos si hay una acción pendiente en memoria.
  // Esto arregla el problema cuando Supabase borra la URL.
  let finalHash =
    fullHash && fullHash !== "#" && fullHash !== "##" ? fullHash : "#dashboard";

  const storedAction = localStorage.getItem("auth_pending_action");

  if ((finalHash === "#dashboard" || finalHash === "") && storedAction) {
    console.log(
      `🧠 Memoria activada: Sobreescribiendo Dashboard con ${storedAction}`
    );
    if (storedAction === "recovery") finalHash = "#reset-password";
    if (storedAction === "signup") finalHash = "#verify-email";

    // Forzamos la URL visual para que coincida
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
      // Opcional: Limpiar la memoria una vez renderizado exitosamente
      // localStorage.removeItem('auth_pending_action');
      // (Mejor hacerlo al hacer click en "Ir a Login" para asegurar que lo vea)
    } else if (finalHash === "#dashboard") {
      // Seguridad extra: Si llegamos aquí, limpiamos cualquier acción pendiente vieja
      // para no atrapar al usuario.
      if (!storedAction) await renderDashboard(appContent);
      else {
        // Si había acción pero por error caímos aquí, forzamos recarga de router
        // (Caso borde, pero ayuda)
      }
      await renderDashboard(appContent);
    }
    // ... RESTO DE TUS RUTAS (Devices, Groups, Settings, etc.) ...
    else if (finalHash === "#devices") {
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
  // Ignorar si es un token
  if (hash.includes("access_token=")) return;

  links.forEach((link) => link.classList.remove("active"));
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === hash || (hash.startsWith("#groups/") && href === "#devices")) {
      link.classList.add("active");
    }
  });
}

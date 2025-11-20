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

  // 1. *** INTERCEPTAR Y PROCESAR TOKENS DE SUPABASE ***
  // Obtenemos el hash crudo. A veces llega con '##', así que limpiamos todo lo que no sean letras al inicio.
  let fullHash = window.location.hash;

  // CORRECCIÓN CRÍTICA: Si hay doble ##, lo arreglamos
  if (fullHash.startsWith("##")) fullHash = fullHash.substring(1);

  // Quitamos el primer # para analizar
  const cleanHash = fullHash.slice(1);

  const isTokenHash =
    cleanHash.includes("access_token=") && cleanHash.includes("type=");

  if (isTokenHash) {
    console.log("DEBUG: Token detectado. Procesando...");

    // Truco para leer los parametros aunque esten en el hash
    const paramsString = cleanHash.replace("#", "&"); // Reemplazar posibles # extra por &
    const urlParams = new URLSearchParams(paramsString);
    const tokenType = urlParams.get("type");

    console.log("DEBUG: Tipo de token:", tokenType);

    // Decidir a dónde ir SIN recargar todavía
    let nextHash = "#dashboard";

    if (tokenType === "recovery") {
      nextHash = "#reset-password";
    } else if (tokenType === "signup" || tokenType === "invite") {
      nextHash = "#verify-email";
    }

    // Limpiamos la URL fea del token y ponemos la bonita
    window.history.replaceState(null, "", window.location.pathname + nextHash);

    // Actualizamos la variable local para que el switch de abajo renderice YA
    // sin esperar otro evento.
    fullHash = nextHash;
  }

  // 2. *** ENRUTAMIENTO NORMAL ***
  // Asegurarnos de usar el fullHash limpio (o el que acabamos de forzar)
  // Si fullHash viene vacío o es solo #, vamos al dashboard
  const finalHash =
    fullHash && fullHash !== "#" && fullHash !== "##" ? fullHash : "#dashboard";

  console.log("Navegando a:", finalHash);
  updateActiveNav(finalHash);

  try {
    if (finalHash.startsWith("#reset-password")) {
      await renderResetPassword(appContent);
    } else if (finalHash.startsWith("#verify-email")) {
      await renderVerifyEmail(appContent);
    } else if (finalHash === "#dashboard") {
      await renderDashboard(appContent);
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

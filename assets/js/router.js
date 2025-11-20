/**
 * js/router.js
 * Manejador de navegación (Versión FINAL: FIX Tokens de Supabase en HASH)
 */
import { renderDashboard } from './views/dashboard.js';
import { renderDevices } from './views/devices.js';
import { renderDeviceDetail } from './views/deviceDetail.js';
import { renderGroupDetail } from './views/groupDetail.js';
import { renderSettings } from './views/settings.js';
import { renderConsent } from './views/consent.js';

// ✅ Asegúrate de tener estas importaciones:
import { renderVerifyEmail } from './views/verifyEmail.js'; 
import { renderResetPassword } from './views/resetPassword.js'; 


export async function handleRouting() {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Spinner simple
    appContent.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';

    // 1. *** INTERCEPTAR Y PROCESAR TOKENS DE SUPABASE EN EL HASH (#) ***
    const fullHash = window.location.hash.slice(1); 
    const isTokenHash = fullHash.includes('access_token=') && fullHash.includes('type=');
    
    if (isTokenHash) {
        // console.log("DEBUG: Token hash detectado. Procesando...");
        
        const urlParams = new URLSearchParams(fullHash); 
        const tokenType = urlParams.get('type');

        // Limpiar la URL ANTES de renderizar, evitando el SyntaxError y la persistencia del token.
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#dashboard');

        appContent.innerHTML = ''; 

        if (tokenType === 'recovery') {
            // console.log("DEBUG: Tipo 'recovery'. Redirigiendo a ResetPassword.");
            return await renderResetPassword(appContent); 
        }

        if (tokenType === 'signup') {
             // console.log("DEBUG: Tipo 'signup'. Redirigiendo a VerifyEmail.");
             return await renderVerifyEmail(appContent); 
        }
    }
    // 2. *** ENRUTAMIENTO NORMAL ***
    
    const hash = window.location.hash || '#dashboard';
    
    updateActiveNav(hash);

    try {
        if (hash === '#dashboard' || hash === '') {
            await renderDashboard(appContent);
        }
        else if (hash === '#devices') {
            await renderDevices(appContent);
        }
        else if (hash.startsWith('#devices/')) {
            const id = hash.split('/')[1];
            await renderDeviceDetail(appContent, id);
        }
        else if (hash.startsWith('#groups/')) {
            const id = hash.split('/')[1];
            await renderGroupDetail(appContent, id);
        }
        else if (hash === '#settings') {
            await renderSettings(appContent);
        }
        else if (hash.startsWith('#consent')) {
            await renderConsent(appContent);
        }

        // Refrescar animaciones si existen
        if (window.AOS) setTimeout(() => window.AOS.refresh(), 100);

    } catch (error) {
        console.error('🚨 Error renderizando:', error);
        appContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

function updateActiveNav(hash) {
    const links = document.querySelectorAll('.navmenu a');
    
    // FIX: Ignorar el hash si es un token (para evitar que se active un enlace con ID '#access_token=...')
    if (hash.includes('access_token=') || hash.includes('type=')) {
        return; 
    }
    
    links.forEach(link => link.classList.remove('active'));
    links.forEach(link => {
        // Truco: si estamos en #groups/1, mantenemos activo el botón de "Equipos" (#devices)
        const href = link.getAttribute('href');
        if (href === hash || (hash.startsWith('#groups/') && href === '#devices')) {
            link.classList.add('active');
        }
    });
}
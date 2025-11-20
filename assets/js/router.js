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

    // Spinner simple para indicar carga
    // appContent.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    // Comenté el spinner porque a veces causa un "parpadeo" feo si la carga es rápida, pero puedes dejarlo si gustas.

    // 1. *** INTERCEPTAR Y PROCESAR TOKENS DE SUPABASE EN EL HASH (#) ***
    const fullHash = window.location.hash.slice(1); 
    const isTokenHash = fullHash.includes('access_token=') && fullHash.includes('type=');
    
    if (isTokenHash) {
        console.log("DEBUG: Token hash detectado.");
        
        const urlParams = new URLSearchParams(fullHash); 
        const tokenType = urlParams.get('type');

        // --- CORRECCIÓN CLAVE ---
        // En lugar de mandar a #dashboard, mandamos a un hash "temporal" 
        // que corresponda a la acción. Así, si app.js recarga, caerá en el caso correcto.
        let nextHash = '#dashboard'; 
        
        if (tokenType === 'recovery') {
            nextHash = '#reset-password';
        } else if (tokenType === 'signup') {
            nextHash = '#verify-email';
        }

        // Limpiamos la URL fea del token y ponemos el hash limpio correcto
        window.history.replaceState(null, '', window.location.pathname + window.location.search + nextHash);

        // Forzamos la ejecución inmediata para no esperar al evento hashchange
        // (Aunque el replaceState no dispara hashchange, continuamos el flujo abajo)
        
        // Actualizamos la variable hash para que el bloque de abajo (Paso 2) lo procese
        window.location.hash = nextHash;
        // NOTA: Al asignar window.location.hash, se disparará handleRouting de nuevo.
        // Por eso hacemos return aquí para dejar que el evento 'hashchange' haga el trabajo
        // y evitar renderizado doble.
        return; 
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
        // --- NUEVAS RUTAS PARA MANEJAR LA REDIRECCIÓN ---
        else if (hash === '#reset-password') {
            await renderResetPassword(appContent);
        }
        else if (hash === '#verify-email') {
            await renderVerifyEmail(appContent);
        }
        // -------------------------------------------------
        
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

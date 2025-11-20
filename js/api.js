// js/api.js
import { supabase } from './config.js';

// Wrapper genérico para manejar errores
async function invokeFunction(functionName, options = {}) {
    const { data, error } = await supabase.functions.invoke(functionName, options);
    if (error) throw error;
    return data;
}

export const api = {
    auth: {
        login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
        logout: () => supabase.auth.signOut(),
        onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
        getUser: async () => (await supabase.auth.getUser()).data.user,
        // NUEVO: Registro
        register: (email, password) => supabase.auth.signUp({ email, password }),

        // NUEVO: Enviar correo de recuperación
        recoverPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href // Redirige a la misma app para poner el nuevo pass
        }),

        // NUEVO: Actualizar contraseña (usado en Perfil y en Recuperación)
        updatePassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
        
        // NUEVO: Configurar persistencia (Recordarme)
        setPersistence: (type) => supabase.auth.setSession({
            access_token: null, 
            refresh_token: null
        }),
        // En api.js -> auth
        updateUser: (data) => supabase.auth.updateUser(data)
    },
    user: {
        // Obtener configuración (costo, moneda)
        getSettings: () => invokeFunction('get-user-settings'),

        // Guardar configuración
        updateSettings: (payload) => invokeFunction('update-user-settings', {
            body: payload
        })
    },
    devices: {
        list: () => invokeFunction('get-devices'),

        // --- VERSIÓN CORREGIDA PARA COMPARACIÓN ---
        getAnalytics: async (deviceId, range, date) => {

            let start;
            let end = new Date(); // Por defecto el fin es 'ahora'

            // 1. Determinar fecha de INICIO
            if (date && date !== 'today') {
                // Si nos pasan una fecha (ej. "Ayer" o "Semana Pasada") la usamos como base
                start = new Date(date);
            } else {
                // Si es 'today' o no se especifica, usamos 'ahora'
                start = new Date();
            }

            // 2. Ajustar rangos
            if (range === 'weekly') {
                start.setDate(start.getDate() - 7); // 7 días antes de 'start'
                // El fin es la fecha 'start' original
                end = new Date(date && date !== 'today' ? date : new Date());
            } else if (range === 'monthly') {
                start.setMonth(start.getMonth() - 1); // 1 mes antes de 'start'
                end = new Date(date && date !== 'today' ? date : new Date());
            } else {
                // 'daily'
                start.setHours(0, 0, 0, 0); // Inicio del día de 'start'
                end = new Date(start);
                end.setHours(23, 59, 59, 999); // Fin de ese mismo día
            }

            // 2. Preparar URL
            const params = new URLSearchParams({
                id: deviceId,
                start: start.toISOString(),
                end: end.toISOString()
            });

            console.log("📡 API: Pidiendo datos raw...", params.toString());

            // 3. Llamada al Backend
            const rawData = await invokeFunction(`get-analytics-device?${params.toString()}`, {
                method: 'GET'
            });

            // 4. --- EL TRADUCTOR (Zero-Filling) ---
            if (!rawData || !Array.isArray(rawData)) {
                console.warn("API: Datos vacíos recibidos");
                return { labels: [], values: [] };
            }

            // Mapeamos los datos: Separamos Fechas (X) de Consumo (Y)
            const labels = rawData.map(item => {
                // Si es vista diaria (por horas), SÍ queremos la hora local del usuario
                if (range === 'daily') {
                    const d = new Date(item.timestamp_bucket);
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } 
                
                // Si es semanal/mensual (por días), el servidor manda T00:00:00 UTC.
                // NO usamos new Date() para evitar que reste horas por zona horaria.
                // Cortamos el string directamente: "2025-11-12T..." -> "2025", "11", "12"
                const [year, month, day] = item.timestamp_bucket.split('T')[0].split('-');
                
                // Array manual para asegurar nombres cortos en español
                const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                
                // ParseInt para quitar ceros a la izquierda si quieres (ej: "09" -> "9") 
                // y month-1 porque el array empieza en 0.
                return `${day} ${meses[parseInt(month) - 1]}`;
            });

            const values = rawData.map(item => item.kwh_consumed);

            console.log("📊 API: Datos transformados para gráfica:", { labels, values });

            return { labels, values };
        },
        // ------------------------------------------------

        control: (id_hardware, estado) => invokeFunction('control-device', { body: { id_hardware, estado } }),

        register: (body) => invokeFunction('register-device', { body }),

        // --- FUNCIÓN 'UPDATE' AÑADIDA ---
        update: (id, body) => invokeFunction('update-device', {
            // Tu documentación dice PUT /devices/{id}, pero la función de Supabase
            // probablemente espera el ID en el body.
            // Enviamos el ID y el resto del body (nombre, grupo)
            body: { id_dispositivo: id, ...body }
        }),

        delete: (id) => invokeFunction(`delete-device?id=${id}`, { method: 'DELETE' }), // Asumiendo que delete-device usa query param

        discover: () => invokeFunction('discover-devices')
    },
    groups: {
        list: () => invokeFunction('get-groups'),
        create: (nombre) => invokeFunction('create-group', { body: { nombre_grupo: nombre } }),
        update: (id, nuevoNombre) => invokeFunction('update-group', { body: { id_grupo: id, nombre_grupo: nuevoNombre } }),
        delete: (id) => invokeFunction(`delete-group?id=${id}`, { method: 'DELETE' }),
        getAnalytics: async (groupId, range, date) => {
            let start;
            let end = new Date(); 

            // 1. Calculamos fechas (Igual que en devices)
            if (date && date !== 'today') {
                start = new Date(date);
            } else {
                start = new Date();
            }

            if (range === 'weekly') {
                start.setDate(start.getDate() - 7);
                end = new Date(date && date !== 'today' ? date : new Date());
            } else if (range === 'monthly') {
                start.setMonth(start.getMonth() - 1);
                end = new Date(date && date !== 'today' ? date : new Date());
            } else {
                // daily
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
            }

            // 2. Query Params (Backend espera: id, start, end)
            const params = new URLSearchParams({
                id: groupId,
                start: start.toISOString(),
                end: end.toISOString()
            });

            // 3. Llamada
            const rawData = await invokeFunction(`get-analytics-group?${params.toString()}`, {
                method: 'GET'
            });

            // 4. Procesamiento de datos (Igual que devices para evitar errores de UI)
            if (!rawData || !Array.isArray(rawData)) return { labels: [], values: [] };

            const labels = rawData.map(item => {
                if (range === 'daily') {
                    const d = new Date(item.timestamp_bucket);
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } 
                const [year, month, day] = item.timestamp_bucket.split('T')[0].split('-');
                const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                return `${day} ${meses[parseInt(month) - 1]}`;
            });

            const values = rawData.map(item => item.kwh_consumed);
            return { labels, values };
        }
    },
    analytics: {
        summary: () => invokeFunction('get-analytics-summary'),
        prediction: () => invokeFunction('get-analytics-cost-prediction')
    },
    alerts: {
        // GET /alerts (Solo trae las no leídas por defecto)
        list: () => invokeFunction('get-alerts'),

        // POST /alerts/{id}/read
        markAsRead: (id) => invokeFunction(`mark-alert-read?id=${id}`, { // Usamos query param para consistencia
            method: 'POST'
        })
    },
    integrations: {
        // 1. Obtener estado real desde la Base de Datos
        getStatus: async () => {
            // Llama a la RPC que creamos en la BD (get_integrations_status)
            const { data, error } = await supabase.rpc('get_integrations_status');
            if (error) throw error;
            return data;
        },

        // 2. Iniciar conexión (Generar URL para redirección)
        connect: (provider) => {
            // IMPORTANTE: Estos datos deben coincidir EXACTAMENTE con los que insertaste
            // en tu tabla 'oauth_clients' de Supabase.
            const config = {
                google: {
                    client_id: 'google-client-id-placeholder', // Reemplaza con tu Client ID real de Google si ya lo tienes
                    redirect_uri: 'https://oauth-redirect.googleusercontent.com/r/powerlink2',
                    state: 'security_token_google' // Debería ser aleatorio en prod
                },
                alexa: {
                    client_id: 'alexa-powerlink-client', // El mismo que pusiste en el formulario
                    redirect_uri: 'https://layla.amazon.com/api/skill/link/M1ML6VAQKLU369', // La URL que te dio Amazon y registraste en BD
                    state: 'security_token_alexa'
                }
            };

            const cfg = config[provider];
            if (!cfg) throw new Error("Proveedor no soportado: " + provider);

            // Construimos la URL con Query Params (GET) como lo pide tu backend
            const params = new URLSearchParams({
                client_id: cfg.client_id,
                redirect_uri: cfg.redirect_uri,
                response_type: 'code',
                state: cfg.state
            });

            // Obtenemos la URL de tu proyecto automáticamente desde el cliente Supabase
            // y apuntamos a tu función 'oauth-authorize'
            const projectUrl = supabase.supabaseUrl;
            const functionUrl = `${projectUrl}/functions/v1/oauth-authorize?${params.toString()}`;

            // Devolvemos la URL lista para que el navegador la use
            return { authUrl: functionUrl };
        },

        // 3. Desconectar (Revocar acceso)
        disconnect: async (provider) => {
            // Llamamos a la función de desconexión (debe existir en tu backend o usar una RPC de borrado)
            return invokeFunction('disconnect-integration', {
                method: 'POST',
                body: { provider }
            });
        },
        approveConsent: (data) => invokeFunction('oauth-consent', {
            method: 'POST',
            body: data
        })
    }
};
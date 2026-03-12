import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Usar la Service Role Key (admin)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('MY_SERVICE_ROLE_KEY') ?? ''
);

interface AlertPayload {
  id_usuario_fk: string;
  id_dispositivo_fk: string;
  tipo_alerta: string;
  mensaje: string;
  leido: boolean;
}

/**
 * Lógica para evitar spam de alertas.
 * Comprueba si ya existe una alerta idéntica y no leída.
 */
async function checkAlertSpam(device: any, tipo_alerta: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('alertas')
    .select('id_alerta')
    .eq('id_dispositivo_fk', device.id_dispositivo)
    .eq('tipo_alerta', tipo_alerta)
    .eq('leido', false)
    .limit(1);

  if (error) console.error(`Error checking alert spam for ${device.id_dispositivo}:`, error.message);
  return (data && data.length > 0); // true si ya existe (es spam)
}

/**
 * Evalúa solo las reglas RÁPIDAS (basadas en la última lectura)
 */
function evaluateFastRules(device: any, lastReadingKwh: number): AlertPayload | null {
  const baseline = device.baseline_data;
  
  // Regla 1: ALERTA_PICO_CONSUMO (Para todos los tipos) [cite: 199]
  // CORRECCIÓN 1: Se quita parseFloat() (baseline_data ya es JSON/num)
  // CORRECCIÓN 2: Se añade el multiplicador * 1.3, según la especificación [cite: 199]
  if (baseline.peak_max && lastReadingKwh > (baseline.peak_max * 1.3)) {
    return {
      id_usuario_fk: device.id_usuario_fk,
      id_dispositivo_fk: device.id_dispositivo,
      tipo_alerta: 'ALERTA_PICO_CONSUMO',
      mensaje: `Sobrecarga detectada en '${device.nombre_personalizado}'. Consumo actual excede el pico normal.`,
      leido: false
    };
  }

  // Regla 2: ALERTA_CONSUMO_VAMPIRO (Para On/Off y Cíclicos) [cite: 200]
  const hourUTC = new Date().getUTCHours();
  if (baseline.analysis_type === 'on_off' || baseline.analysis_type === 'cyclical') {
    // CORRECCIÓN 3: Se quita parseFloat()
    if (baseline.standby_max && lastReadingKwh > baseline.standby_max && (hourUTC >= 2 && hourUTC <= 6)) { // 2AM a 6AM UTC
      return {
        id_usuario_fk: device.id_usuario_fk,
        id_dispositivo_fk: device.id_dispositivo,
        tipo_alerta: 'ALERTA_CONSUMO_VAMPIRO',
        mensaje: `Consumo vampiro detectado en '${device.nombre_personalizado}' durante la noche.`,
        leido: false
      };
    }
  }
  
  // Regla 3: ALERTA_FALLO_CORRIENTE (Solo para Always On) [cite: 202]
  if (baseline.analysis_type === 'always_on') {
    // CORRECCIÓN 4: Se quita parseFloat()
    if (baseline.standby_min && lastReadingKwh < baseline.standby_min) {
       return {
        id_usuario_fk: device.id_usuario_fk,
        id_dispositivo_fk: device.id_dispositivo,
        tipo_alerta: 'ALERTA_FALLO_CORRIENTE',
        mensaje: `Se perdió la señal de '${device.nombre_personalizado}'. El dispositivo parece estar apagado o sin conexión.`,
        leido: false
      };
    }
  }

  return null; // Sin alertas
}

/**
 * El Servidor de la Edge Function
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. Seguridad: Verificar el CRON_SECRET
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    console.warn('CRON_SECRET no coincide o no fue provisto.');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // CORRECCIÓN 5: ERROR DE SINTAXIS. 
    // Un nombre de variable no puede empezar con un número. 
    // Se cambió "15MinutesAgo" a "fifteenMinutesAgo".
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // 2. Obtener todos los dispositivos "graduados"
    const { data: devices, error: devicesError } = await supabase
      .from('dispositivos')
      .select('id_dispositivo, id_usuario_fk, nombre_personalizado, baseline_data, device_type') // device_type no se usa aquí pero es bueno para debug
      .eq('monitoring_status', 'monitoring')
      .not('baseline_data', 'is', null); // Asegurarse que tengan huella

    if (devicesError) throw devicesError;

    let alertsCreated = 0;
    const errors: string[] = [];

    // 3. Iterar sobre cada dispositivo
    for (const device of devices) {
      if (!device.baseline_data) continue; // Doble chequeo por si acaso

      try {
        // 4. Obtener su ÚLTIMA lectura
        const { data: lastReading, error: readingError } = await supabase
          .from('lecturas_consumo')
          // Asumo que la columna se llama 'kwh_consumed' como en tu doc [cite: 33]
          // Si tu tabla la tiene como 'kwh_consumidos', cambia 'kwh_consumed' abajo
          .select('kwh_consumed') 
          .eq('id_dispositivo_fk', device.id_dispositivo)
          .gte('timestamp', fifteenMinutesAgo) // Asumo que la columna se llama 'timestamp' [cite: 33]
          .order('timestamp', { ascending: false }) // La más nueva primero
          .limit(1)
          .maybeSingle(); // .single() da error si no hay datos, .maybeSingle() devuelve null

        // Si no hay lectura reciente (o hubo error), saltar al siguiente dispositivo
        if (readingError || !lastReading) {
          continue; 
        }

        // 5. Evaluar reglas rápidas
        // (Ajusta 'lastReading.kwh_consumed' si tu columna se llama diferente)
        const newAlert = evaluateFastRules(device, lastReading.kwh_consumed); 
        
        if (newAlert) {
          // 6. Control de Spam y Creación de Alerta
          const isSpam = await checkAlertSpam(device, newAlert.tipo_alerta);
          if (!isSpam) {
            const { error: insertError } = await supabase.from('alertas').insert(newAlert);
            if (insertError) throw insertError;
            alertsCreated++;
          }
        }

      } catch (e) {
        errors.push(`Failed device ${device.id_dispositivo}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, devices_checked: devices.length, alerts_created: alertsCreated, errors 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
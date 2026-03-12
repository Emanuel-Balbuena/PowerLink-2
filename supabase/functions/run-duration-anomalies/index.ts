import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('MY_SERVICE_ROLE_KEY') ?? ''
);

// (Puedes mover estas interfaces a un archivo _shared si lo prefieres)
interface AlertPayload {
  id_usuario_fk: string;
  id_dispositivo_fk: string;
  tipo_alerta: string;
  mensaje: string;
  leido: boolean;
}

interface Device {
  id_dispositivo: string;
  id_usuario_fk: string;
  nombre_personalizado: string;
  baseline_data: any;
  analysis_type: 'on_off' | 'cyclical' | 'always_on';
}

/**
 * Lógica para evitar spam de alertas (idéntica a la otra función)
 */
async function checkAlertSpam(device: Device, tipo_alerta: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('alertas')
    .select('id_alerta')
    .eq('id_dispositivo_fk', device.id_dispositivo)
    .eq('tipo_alerta', tipo_alerta)
    .eq('leido', false)
    .limit(1);

  if (error) console.error(`Spam check failed for ${device.id_dispositivo}:`, error.message);
  return (data && data.length > 0);
}

/**
 * Lógica principal de evaluación de duración
 */
async function evaluateDurationRules(device: Device): Promise<AlertPayload | null> {
  const baseline = device.baseline_data;

  // Umbrales
  const standbyMax = baseline.standby_max ?? 0;
  // Usamos standbyMax como el umbral para 'On/Off'. 
  // Para cíclicos, el "valle" es su 'standby', así que usamos lo mismo.
  
  // 1. Obtener la última lectura para saber el estado ACTUAL
  const { data: lastReading, error: lastReadingError } = await supabase
    .from('lecturas_consumo')
    .select('kwh_consumed', 'timestamp') // Asumo nombres de columna, ajusta si es necesario
    .eq('id_dispositivo_fk', device.id_dispositivo)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastReadingError || !lastReading) return null; // Sin datos

  const isCurrentlyOn = lastReading.kwh_consumed > standbyMax;

  // --- REGLAS ON/OFF ---
  if (device.analysis_type === 'on_off' && baseline.on_duracion_max) {
    if (isCurrentlyOn) {
      // ESTÁ ENCENDIDO. ¿Ha estado así por mucho tiempo?
      const { data: lastOffReading, error: offError } = await supabase
        .from('lecturas_consumo')
        .select('timestamp')
        .eq('id_dispositivo_fk', device.id_dispositivo)
        .lt('kwh_consumed', standbyMax) // Buscar la última vez que estuvo APAGADO
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastOffReading) return null; // Nunca ha estado apagado

      const onDurationMs = new Date(lastReading.timestamp).getTime() - new Date(lastOffReading.timestamp).getTime();
      const maxDurationMs = baseline.on_duracion_max * 60 * 60 * 1000; // on_duracion_max está en horas

      if (onDurationMs > maxDurationMs) {
        return {
          id_usuario_fk: device.id_usuario_fk,
          id_dispositivo_fk: device.id_dispositivo,
          tipo_alerta: 'ALERTA_DISPOSITIVO_OLVIDADO',
          mensaje: `El dispositivo '${device.nombre_personalizado}' parece estar encendido por más de ${baseline.on_duracion_max} horas.`,
          leido: false
        };
      }
    }
  }

  // --- REGLAS CÍCLICAS ---
  if (device.analysis_type === 'cyclical') {
    if (isCurrentlyOn) {
      // ESTÁ EN PICO. ¿Ha estado así por mucho tiempo?
      const { data: lastValleyReading, error: valleyError } = await supabase
        .from('lecturas_consumo')
        .select('timestamp')
        .eq('id_dispositivo_fk', device.id_dispositivo)
        .lt('kwh_consumed', standbyMax) // Buscar la última vez que estuvo en VALLE
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastValleyReading && baseline.pico_duracion_max) {
        const peakDurationMs = new Date(lastReading.timestamp).getTime() - new Date(lastValleyReading.timestamp).getTime();
        const maxPeakDurationMs = baseline.pico_duracion_max * 60 * 1000; // Asumo 'pico_duracion_max' en minutos

        if (peakDurationMs > maxPeakDurationMs) {
          return {
            id_usuario_fk: device.id_usuario_fk,
            id_dispositivo_fk: device.id_dispositivo,
            tipo_alerta: 'ALERTA_CICLO_PICO_LARGO',
            mensaje: `El compresor de '${device.nombre_personalizado}' lleva más de ${baseline.pico_duracion_max} minutos encendido. Revisa que todo esté cerrado.`,
            leido: false
          };
        }
      }
    } else {
      // ESTÁ EN VALLE. ¿Ha estado así por mucho tiempo?
      const { data: lastPeakReading, error: peakError } = await supabase
        .from('lecturas_consumo')
        .select('timestamp')
        .eq('id_dispositivo_fk', device.id_dispositivo)
        .gt('kwh_consumed', standbyMax) // Buscar la última vez que estuvo en PICO
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPeakReading && baseline.valle_duracion_max) {
        const valleyDurationMs = new Date(lastReading.timestamp).getTime() - new Date(lastPeakReading.timestamp).getTime();
        const maxValleyDurationMs = baseline.valle_duracion_max * 60 * 1000; // Asumo 'valle_duracion_max' en minutos

        if (valleyDurationMs > maxValleyDurationMs) {
          return {
            id_usuario_fk: device.id_usuario_fk,
            id_dispositivo_fk: device.id_dispositivo,
            tipo_alerta: 'ALERTA_CICLO_VALLE_LARGO',
            mensaje: `El dispositivo '${device.nombre_personalizado}' no ha iniciado su ciclo de encendido en más de ${baseline.valle_duracion_max} minutos.`,
            leido: false
          };
        }
      }
    }
    
    // REGLA DE CICLO CORTO (Esta es diferente, mira el último *ciclo completado*)
    if (baseline.pico_duracion_min) {
        // 1. Encontrar la última vez que se apagó (fin del último pico)
        const { data: lastPeakEnd, error: pEndErr } = await supabase
            .from('lecturas_consumo')
            .select('timestamp')
            .eq('id_dispositivo_fk', device.id_dispositivo)
            .lt('kwh_consumed', standbyMax) // Transición a APAGADO
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. Encontrar la última vez que se encendió ANTES de que se apagara (inicio del último pico)
        if (lastPeakEnd) {
            const { data: lastPeakStart, error: pStartErr } = await supabase
                .from('lecturas_consumo')
                .select('timestamp')
                .eq('id_dispositivo_fk', device.id_dispositivo)
                .gt('kwh_consumed', standbyMax) // Transición a ENCENDIDO
                .lt('timestamp', lastPeakEnd.timestamp) // Ocurrido ANTES del apagado
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastPeakStart) {
                const peakDurationMs = new Date(lastPeakEnd.timestamp).getTime() - new Date(lastPeakStart.timestamp).getTime();
                const minPeakDurationMs = baseline.pico_duracion_min * 60 * 1000; // Asumo 'pico_duracion_min' en minutos

                if (peakDurationMs < minPeakDurationMs) {
                     return {
                        id_usuario_fk: device.id_usuario_fk,
                        id_dispositivo_fk: device.id_dispositivo,
                        tipo_alerta: 'ALERTA_CICLO_CORTO',
                        mensaje: `El compresor de '${device.nombre_personalizado}' está fallando (short-cycling). Requiere mantenimiento.`,
                        leido: false
                    };
                }
            }
        }
    }
  }

  return null; // Sin alertas
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Obtener todos los dispositivos "graduados"
    const { data: devices, error: devicesError } = await supabase
      .from('dispositivos')
      .select('id_dispositivo, id_usuario_fk, nombre_personalizado, baseline_data, analysis_type')
      .eq('monitoring_status', 'monitoring')
      .not('baseline_data', 'is', null)
      .or('analysis_type.eq.on_off, analysis_type.eq.cyclical'); // Solo los que tienen estas reglas

    if (devicesError) throw devicesError;

    let alertsCreated = 0;
    const errors: string[] = [];

    // 2. Iterar y evaluar CADA dispositivo
    for (const device of devices) {
      if (!device.baseline_data || !device.analysis_type) continue;

      try {
        const newAlert = await evaluateDurationRules(device);
        
        if (newAlert) {
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
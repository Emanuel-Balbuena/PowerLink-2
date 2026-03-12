import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('MY_SERVICE_ROLE_KEY') ?? ''
);

interface Device {
  id_dispositivo: string;
  id_usuario_fk: string;
  nombre_personalizado: string;
  baseline_data: any;
  device_type: string;
  device_brand: string;
  device_model: string;
}

interface CommunityBaseline {
  avg_standby_kwh: number;
  avg_peak_kwh: number;
  sample_size: number;
}

/**
 * Lógica para evitar spam de alertas
 */
async function checkAlertSpam(userId: string, tipo_alerta: string, deviceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('alertas')
    .select('id_alerta')
    .eq('id_usuario_fk', userId)
    .eq('id_dispositivo_fk', deviceId)
    .eq('tipo_alerta', tipo_alerta)
    .eq('leido', false)
    .limit(1);

  if (error) console.error(`Spam check failed for ${userId}:`, error.message);
  return (data && data.length > 0);
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
    // 1. Cargar TODAS las huellas de la comunidad en un Mapa para acceso rápido
    const { data: baselines, error: baselineError } = await supabase
      .from('community_baselines')
      .select('device_type, device_brand, device_model, avg_standby_kwh, avg_peak_kwh, sample_size');
    
    if (baselineError) throw baselineError;

    const communityMap = new Map<string, CommunityBaseline>();
    for (const baseline of baselines) {
      const key = `${baseline.device_type}:${baseline.device_brand}:${baseline.device_model}`;
      communityMap.set(key, baseline);
    }

    // 2. Obtener TODOS los dispositivos de usuarios que participan (Opt-In)
    const { data: devices, error: deviceError } = await supabase
      .from('dispositivos')
      .select('id_dispositivo, id_usuario_fk, nombre_personalizado, baseline_data, device_type, device_brand, device_model')
      .eq('monitoring_status', 'monitoring')
      .not('baseline_data', 'is', null)
      .not('device_model', 'is', null); // El 'Opt-In'

    if (deviceError) throw deviceError;

    let alertsCreated = 0;
    const errors: string[] = [];
    const comparisonThreshold = 1.2; // 20%

    // 3. Iterar y comparar
    for (const device of devices) {
      const key = `${device.device_type}:${device.device_brand}:${device.device_model}`;
      
      // Comprobar si existe una huella comunitaria para este modelo
      if (communityMap.has(key) && device.baseline_data?.standby_avg) {
        const communityData = communityMap.get(key)!;
        const deviceStandby = device.baseline_data.standby_avg;
        
        // Comparamos el standby del dispositivo con el standby promedio de la comunidad [cite: 222, 223]
        if (deviceStandby > (communityData.avg_standby_kwh * comparisonThreshold)) {
          try {
            const tipoAlerta = 'RECOMENDACION_COMUNIDAD';
            const isSpam = await checkAlertSpam(device.id_usuario_fk, tipoAlerta, device.id_dispositivo);

            if (!isSpam) {
              const diffPercent = Math.round((deviceStandby / communityData.avg_standby_kwh - 1) * 100);
              const mensaje = `Tu '${device.nombre_personalizado}' consume un ${diffPercent}% más en standby que el promedio de la comunidad para este modelo.`; // [cite: 224]

              const { error: insertError } = await supabase.from('alertas').insert({
                id_usuario_fk: device.id_usuario_fk,
                id_dispositivo_fk: device.id_dispositivo,
                tipo_alerta: tipoAlerta,
                mensaje: mensaje,
                leido: false
              });

              if (insertError) throw insertError;
              alertsCreated++;
            }
          } catch (e) {
            errors.push(`Failed to create alert for device ${device.id_dispositivo}: ${e.message}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        devices_checked: devices.length, 
        alerts_created: alertsCreated,
        errors
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
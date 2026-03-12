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
}

/**
 * Lógica para evitar spam de alertas
 */
async function checkAlertSpam(userId: string, tipo_alerta: string, deviceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('alertas')
    .select('id_alerta')
    .eq('id_usuario_fk', userId)
    .eq('id_dispositivo_fk', deviceId) // Clave: la alerta está ligada al dispositivo ineficiente
    .eq('tipo_alerta', tipo_alerta)
    .eq('leido', false)
    .limit(1);

  if (error) console.error(`Spam check failed for ${userId}:`, error.message);
  return (data && data.length > 0);
}

/**
 * Compara una lista de dispositivos del mismo tipo y genera alertas
 */
async function compareDeviceGroup(devices: Device[], userId: string, deviceType: string): Promise<number> {
  let alertsCreated = 0;
  const standbyComparisonFactor = 1.5; // 50% más consumo

  for (let i = 0; i < devices.length; i++) {
    for (let j = 0; j < devices.length; j++) {
      if (i === j) continue; // No comparar un dispositivo consigo mismo

      const deviceA = devices[i];
      const deviceB = devices[j];

      if (!deviceA.baseline_data?.standby_avg || !deviceB.baseline_data?.standby_avg) {
        continue; // No se pueden comparar si falta la huella de standby
      }

      // Lógica de comparación [cite: 213]
      if (deviceA.baseline_data.standby_avg > (deviceB.baseline_data.standby_avg * standbyComparisonFactor)) {
        // deviceA es el "ineficiente"
        
        const tipoAlerta = 'RECOMENDACION_LOCAL';
        const isSpam = await checkAlertSpam(userId, tipoAlerta, deviceA.id_dispositivo);

        if (!isSpam) {
          const mensaje = `Notamos que tu '${deviceA.nombre_personalizado}' consume un ${Math.round((standbyComparisonFactor-1)*100)}% más en standby que tu '${deviceB.nombre_personalizado}'.`;
          
          const { error: insertError } = await supabase.from('alertas').insert({
            id_usuario_fk: userId,
            id_dispositivo_fk: deviceA.id_dispositivo, // La alerta es sobre el dispositivo A
            tipo_alerta: tipoAlerta,
            mensaje: mensaje,
            leido: false
          });

          if (insertError) {
            console.error("Error inserting local recommendation:", insertError.message);
          } else {
            alertsCreated++;
          }
        }
      }
    }
  }
  return alertsCreated;
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
    // 1. Encontrar todos los grupos (usuario, tipo) que tienen > 1 dispositivo 
    const { data: groups, error: groupError } = await supabase.rpc('get_duplicate_device_groups');

    if (groupError) throw groupError;
    if (!groups) {
        return new Response(JSON.stringify({ success: true, groups_checked: 0, alerts_created: 0 }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    let totalAlerts = 0;
    const errors: string[] = [];

    // 2. Iterar sobre cada grupo encontrado
    for (const group of groups) {
      try {
        // 3. Obtener todos los dispositivos de ese grupo específico
        const { data: devices, error: deviceError } = await supabase
          .from('dispositivos')
          .select('id_dispositivo, id_usuario_fk, nombre_personalizado, baseline_data, device_type')
          .eq('id_usuario_fk', group.id_usuario_fk)
          .eq('device_type', group.device_type)
          .eq('monitoring_status', 'monitoring')
          .not('baseline_data', 'is', null);

        if (deviceError) throw deviceError;

        // 4. Comparar los dispositivos dentro de ese grupo [cite: 213]
        if (devices && devices.length > 1) {
          const alerts = await compareDeviceGroup(devices, group.id_usuario_fk, group.device_type);
          totalAlerts += alerts;
        }

      } catch (e) {
        errors.push(`Failed group (User: ${group.id_usuario_fk}, Type: ${group.device_type}): ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, groups_checked: groups.length, alerts_created: totalAlerts, errors 
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
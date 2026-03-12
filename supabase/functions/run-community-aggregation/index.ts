import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('MY_SERVICE_ROLE_KEY') ?? ''
);

interface Device {
  baseline_data: any;
  device_type: string;
  device_brand: string;
  device_model: string;
}

interface CommunityEntry {
  device_type: string;
  device_brand: string;
  device_model: string;
  avg_standby_kwh: number;
  avg_peak_kwh: number;
  sample_size: number;
  last_updated: string;
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
    // 1. Obtener TODOS los dispositivos con huella y modelo
    const { data: devices, error: fetchError } = await supabase
      .from('dispositivos')
      .select('baseline_data, device_type, device_brand, device_model')
      .eq('monitoring_status', 'monitoring')
      .not('baseline_data', 'is', null)
      .not('device_brand', 'is', null) // 
      .not('device_model', 'is', null); // 

    if (fetchError) throw fetchError;

    // 2. Agrupar y calcular promedios en memoria
    const aggregationMap = new Map<string, { standbySum: number, peakSum: number, count: number }>();

    for (const device of devices) {
      const { baseline_data, device_type, device_brand, device_model } = device;
      
      // Asegurarnos que la huella tiene los datos que necesitamos
      if (baseline_data?.standby_avg && baseline_data?.peak_avg) {
        const key = `${device_type}:${device_brand}:${device_model}`;
        
        if (!aggregationMap.has(key)) {
          aggregationMap.set(key, { standbySum: 0, peakSum: 0, count: 0 });
        }
        
        const stats = aggregationMap.get(key)!;
        stats.standbySum += baseline_data.standby_avg;
        stats.peakSum += baseline_data.peak_avg;
        stats.count += 1;
      }
    }

    // 3. Preparar los datos para la tabla 'community_baselines'
    const upsertData: CommunityEntry[] = [];
    const now = new Date().toISOString();

    for (const [key, stats] of aggregationMap.entries()) {
      const [device_type, device_brand, device_model] = key.split(':');
      
      // Solo guardar si tenemos una muestra razonable (ej. > 1)
      if (stats.count >= 10) {
        upsertData.push({
          device_type: device_type,
          device_brand: device_brand,
          device_model: device_model,
          avg_standby_kwh: stats.standbySum / stats.count, // 
          avg_peak_kwh: stats.peakSum / stats.count, // 
          sample_size: stats.count, // [cite: 77]
          last_updated: now // [cite: 78]
        });
      }
    }

    if (upsertData.length === 0) {
       return new Response(
        JSON.stringify({ success: true, message: "No new data to aggregate." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Hacer UPSERT en la tabla de comunidad
    // Esto actualiza las filas existentes o inserta nuevas
    const { error: upsertError } = await supabase
      .from('community_baselines')
      .upsert(upsertData, {
        onConflict: 'device_type, device_brand, device_model' // [cite: 80]
      });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        models_aggregated: upsertData.length,
        devices_processed: devices.length
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
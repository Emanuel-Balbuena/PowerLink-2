import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 2. Parsear el Request
    // *** ¡AQUÍ ESTÁ LA CORRECCIÓN! ***
    // Cambiamos 'device_id' por 'id_hardware' para que coincida con el ESP32
    const { id_hardware, timestamp, kwh_consumed } = await req.json();
    
    // *** ¡Y AQUÍ! ***
    if (!id_hardware) {
      return new Response(JSON.stringify({ error: 'Missing id_hardware' }), { // Mensaje de error actualizado
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0';

    // 3. Verificar si el dispositivo ya está registrado
    // *** ¡Y AQUÍ! ***
    // Ahora las variables coinciden perfectamente
    const { data: device, error: devError } = await supabase
      .from('dispositivos')
      .select('id_dispositivo, id_hardware')
      .eq('id_hardware', id_hardware) // Lógico: buscamos id_hardware con el valor de id_hardware
      .single();

    if (device) {
      // --- CASO A: Dispositivo Registrado ---
      const { error: insertError } = await supabase.from('lecturas_consumo').insert({
        id_dispositivo_fk: device.id_dispositivo,
        timestamp_lectura: timestamp || new Date().toISOString(),
        kwh_consumidos: kwh_consumed || 0
      });
      if (insertError) throw insertError;
      
      await supabase.from('dispositivos').update({
        ultimo_heartbeat: new Date().toISOString()
      }).eq('id_hardware', id_hardware); // *** ¡Y AQUÍ! ***

      return new Response(JSON.stringify({ status: 'saved' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // --- CASO B: Dispositivo Nuevo (Pairing Flow) ---
      const { error: pendingError } = await supabase.from('dispositivos_pendientes').upsert({
        id_hardware: id_hardware, // *** ¡Y AQUÍ! ***
        ip_address: clientIP,
        ultima_vez_visto: new Date().toISOString()
      }, {
        onConflict: 'id_hardware'
      });
      if (pendingError) throw pendingError;
      
      return new Response(JSON.stringify({ status: 'unclaimed' }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('🚨 Error general en ingest:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
// supabase/functions/lock-community-baselines/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('MY_SERVICE_ROLE_KEY') ?? ''
);

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
    // Calcular la fecha límite (hace 7 días exactos)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const targetDate = sevenDaysAgo.toISOString();

    // Actualizar todos los dispositivos en CALIBRATING cuyo joined_at sea <= a targetDate
    const { data, error, count } = await supabase
      .from('dispositivos')
      .update({ community_status: 'LOCKED' })
      .eq('community_status', 'CALIBRATING')
      .lte('community_joined_at', targetDate)
      .eq('archivado', false)
      .select('id_dispositivo'); // Para saber cuáles se actualizaron

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        baselines_locked: data?.length || 0,
        devices: data
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
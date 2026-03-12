// supabase/functions/discover-devices/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw userError || new Error('Usuario no autenticado.');
    }
const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0';

    console.log("Discovery solicitado desde IP:", clientIp); // Log para depurar
    if (!clientIp) {
      return new Response(JSON.stringify({
        error: 'No se pudo determinar la IP del cliente.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const timeLimit = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: pendingDevices, error: dbError } = await supabase.from('dispositivos_pendientes').select('id_hardware, ultima_vez_visto').eq('ip_address', clientIp).gt('ultima_vez_visto', timeLimit).order('ultima_vez_visto', {
      ascending: false
    });
    if (dbError) {
      throw dbError;
    }
    return new Response(JSON.stringify(pendingDevices), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // 2. Auth Check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado.');

    // 3. Llamada a la RPC (La que acabamos de actualizar en SQL)
    const { data, error } = await supabase.rpc('get_analytics_summary_today');

    if (error) throw error;

    // 4. Respuesta
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});
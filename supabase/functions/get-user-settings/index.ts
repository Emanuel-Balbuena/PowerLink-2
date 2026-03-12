import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado.');

    // --- CORRECCIÓN AQUÍ ---
    // Cambiamos .select('costo_kwh, moneda') por .select('*')
    // para traer presupuesto, tarifas escalonadas, etc.
    const { data: settings, error: dbError } = await supabase
      .from('config_usuarios')
      .select('*') 
      .eq('id_usuario_fk', user.id)
      .single();

    if (dbError) {
      // Si no existe configuración (usuario nuevo), devolvemos defaults completos
      if (dbError.code === 'PGRST116') {
        return new Response(JSON.stringify({
          costo_kwh: 0.0,
          moneda: 'MXN',
          presupuesto_meta: 0.0,
          modo_tarifa: 'fija',
          tarifa_basica: 0.0,
          limite_basico: 150,
          tarifa_excedente: 0.0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      throw dbError;
    }

    return new Response(JSON.stringify(settings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status
    });
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Manejo de opciones CORS prepilotaje
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Para interactuar con tablas globales sin preocuparnos de reglas RLS locales,
    // o para asegurar que el usuario autenticado puede leerlo, usamos el rol de servicio
    // o el cliente con cabecera de autenticación.
    // Como esta data no es confidencial (es promedio), usamos Service Role.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener parámetros de URL
    const url = new URL(req.url);
    const deviceType = url.searchParams.get('device_type');
    const brand = url.searchParams.get('brand');
    const model = url.searchParams.get('model');

    if (!deviceType || !brand || !model) {
      throw new Error("Missing parameters");
    }

    const { data, error } = await supabase
      .from('community_baselines')
      .select('*')
      .eq('device_type', deviceType)
      .eq('device_brand', brand)
      .eq('device_model', model)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      throw error;
    }

    return new Response(JSON.stringify(data || null), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // 1. Manejo de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Crear cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 3. Verificar Autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuario no autenticado.');
    }

    // 4. Obtener los datos del body (Payload completo)
    const body = await req.json();

    // Destructuramos con valores por defecto para evitar errores si algo viene nulo
    // Esto asegura que la función no rompa si el frontend envía datos parciales.
    const {
      moneda = 'MXN',
      costo_kwh = 0,
      presupuesto_meta = 0,
      modo_tarifa = 'fija',
      tarifa_basica = 0,
      limite_basico = 0,
      tarifa_excedente = 0
    } = body;

    // 5. Ejecutar el UPSERT con TODOS los campos nuevos
    const { data: updatedSettings, error: dbError } = await supabase
      .from('config_usuarios')
      .upsert(
        {
          id_usuario_fk: user.id,
          moneda: moneda,
          costo_kwh: costo_kwh,
          // Nuevos campos agregados a la BD:
          presupuesto_meta: presupuesto_meta,
          modo_tarifa: modo_tarifa,
          tarifa_basica: tarifa_basica,
          limite_basico: limite_basico,
          tarifa_excedente: tarifa_excedente
        },
        {
          onConflict: 'id_usuario_fk', // Clave para detectar si actualizamos o creamos
        }
      )
      .select() // Seleccionamos todo para devolver el estado actual
      .single();

    if (dbError) {
      console.error("Error BD:", dbError);
      throw new Error("Error al guardar en base de datos: " + dbError.message);
    }

    // 6. Respuesta exitosa
    return new Response(JSON.stringify(updatedSettings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error General:", error);
    const status = error.message.includes('autenticado') ? 401 : 400;
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});
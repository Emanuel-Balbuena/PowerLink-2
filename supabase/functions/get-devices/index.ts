// supabase/functions/get-devices/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req) => {
  // Manejo de la solicitud OPTIONS (preflight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Crear el cliente de Supabase con la autenticación del usuario
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // 2. Verificar que el usuario está autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw userError || new Error('Usuario no autenticado.');
    }
    // 3. Consultar los dispositivos del usuario
    // Esta consulta es la clave:
    // - Selecciona campos específicos
    // - Hace un 'join' para obtener el nombre del grupo (si existe)
    // - Filtra por 'id_usuario_fk' para seguridad
    const { data: devices, error: dbError } = await supabase
      .from('dispositivos')
      .select(`
    id_dispositivo,
    id_hardware,
    nombre_personalizado,
    device_type,
    monitoring_status,
    estado_rele_actual,
    ultimo_heartbeat,
    fecha_registro,
    id_grupo_fk,
    device_brand,
    device_model,
    baseline_data,
    community_status,
    community_joined_at,
    archivado,
    grupos ( nombre_grupo )
    `)
      .eq('id_usuario_fk', user.id) // ¡La parte más importante!
      .order('fecha_registro', { ascending: false });
    if (dbError) {
      throw dbError;
    }
    // 4. Devolver los dispositivos encontrados
    return new Response(JSON.stringify(devices), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 : 500;
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: status
    });
  }
});

// supabase/functions/control-device/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

// Función auxiliar para crear un cliente 'service_role'
function createAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('MY_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

Deno.serve(async (req)=>{
  // Manejo de la solicitud OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Crear el cliente con autenticación del USUARIO
    const userClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });

    // 2. Verificar que el usuario está autenticado
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw userError || new Error('Usuario no autenticado.');
    }

    // 3. Obtener los datos del body
    const body = await req.json();
    const { id_hardware, estado } = body;
    if (!id_hardware || typeof estado !== 'boolean') {
      throw new Error('Se requieren "id_hardware" (string) y "estado" (boolean).');
    }

    // 4. Buscar el dispositivo y verificar propiedad
    const { data: device, error: checkError } = await userClient.from('dispositivos')
    .select('id_hardware')
    .eq('id_hardware', id_hardware)
    .eq('id_usuario_fk', user.id)
    .single();
    
    if (checkError || !device) {
      throw new Error('Dispositivo no encontrado o no autorizado.');
    }

    // 5. Crear el cliente ADMIN
    const supabaseAdmin = createAdminClient();

    // 6. Actualizar la base de datos (Fuente de Verdad)
    const { error: updateError } = await supabaseAdmin.from('dispositivos').update({
      estado_rele_actual: estado
    }).eq('id_hardware', id_hardware);
    
    if (updateError) {
      throw new Error(`Error al actualizar estado en DB: ${updateError.message}`);
    }

    // 7. EL BROADCAST SE HA ELIMINADO. Este es el final.

    // 8. Devolver éxito
    return new Response(JSON.stringify({
      message: 'Estado actualizado en la base de datos',
      estado: estado
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    // ... (Manejo de errores sin cambios)
    const status = error.message.includes('autenticado') ? 401 : error.message.includes('requieren') ? 400 : error.message.includes('encontrado') ? 404 : 500;
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
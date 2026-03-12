// supabase/functions/register-device/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
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

    // Obtener la IP pública real del cliente
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0';
    if (clientIP === '0.0.0.0') {
      throw new Error('No se pudo determinar la IP del cliente para la validación de red.');
    }

    const body = await req.json();
    const { id_hardware, nombre_personalizado, id_grupo_fk } = body; 

    if (!id_hardware || !nombre_personalizado) {
      throw new Error('Faltan "id_hardware" y "nombre_personalizado".');
    }

    // --- CORRECCIÓN FINAL EN EL PARÁMETRO DE LLAMADA ---
    // NO incluimos p_device_type. El RPC debe ser actualizado para no esperarlo.
    const rpcParams: Record<string, any> = {
      p_id_hardware: id_hardware,
      p_nombre_personalizado: nombre_personalizado,
      p_id_grupo_fk: id_grupo_fk || null,
      p_client_ip: clientIP
    };

    const { data: nuevoDispositivo, error: rpcError } = await supabase.rpc('registrar_dispositivo', rpcParams);

    if (rpcError) {
      throw rpcError;
    }

    return new Response(JSON.stringify(nuevoDispositivo), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 201
    });

  } catch (error) {
    const message = error.message || 'Error desconocido.';
    const status = message.includes('autenticado') ? 401 : message.includes('Faltan') ? 400 : message.includes('no encontrado') ? 404 : 500;
    
    return new Response(JSON.stringify({
      error: message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: status
    });
  }
});
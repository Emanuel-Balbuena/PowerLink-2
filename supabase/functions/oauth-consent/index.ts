import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Configuración de CORS universal
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // 1. Manejo de Preflight (OPTIONS) - Esto ya te funcionaba, pero lo aseguramos
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Crear cliente de Supabase con Service Role (Privilegios de Admin para escribir el código)
    // Asegúrate de que estas variables de entorno existan en tu proyecto Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('MY_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseKey) {
      throw new Error("Falta la variable de entorno SERVICE_ROLE_KEY");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    // 2. Leer el cuerpo de la petición (Lo que me mostraste que envías)
    const { client_id, state, redirect_uri, allow } = await req.json();
    console.log(`[OAuth Consent] Solicitud recibida para: ${client_id}`);
    // 3. Validar Usuario (Debe venir el Token del Frontend en el Header)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Falta cabecera de autorización");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error("Error Auth:", authError);
      throw new Error("Usuario no autenticado o token inválido");
    }
    // 4. Validar decisión del usuario
    if (!allow) throw new Error("Acceso denegado por el usuario");
    // 5. Buscar el Cliente OAuth en la BD
    const { data: client, error: clientError } = await supabase.from('oauth_clients').select('id_cliente').eq('client_id', client_id).single();
    if (clientError || !client) {
      console.error("Error Cliente DB:", clientError);
      throw new Error(`Cliente OAuth inválido o no encontrado: ${client_id}`);
    }
    // 6. Generar Código de Autorización
    const code = crypto.randomUUID();
    // 7. Guardar en la tabla oauth_codes
    const { error: dbError } = await supabase.from('oauth_codes').insert({
      id_usuario_fk: user.id,
      id_cliente_fk: client.id_cliente,
      codigo: code
      });
    if (dbError) {
      console.error("Error Insertando Código:", dbError);
      throw new Error("Error interno al generar autorización");
    }
    console.log(`[OAuth Consent] Código generado exitosamente para usuario ${user.id}`);
    // 8. Construir URL de retorno
    const targetUrl = new URL(redirect_uri);
    targetUrl.searchParams.set('code', code);
    targetUrl.searchParams.set('state', state);
    // 9. Responder al Frontend
    return new Response(JSON.stringify({
      redirect_to: targetUrl.toString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("[OAuth Consent Error]:", error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});

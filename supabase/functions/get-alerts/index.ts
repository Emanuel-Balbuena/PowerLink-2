// supabase/functions/get-alerts/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Función auxiliar para inicializar el cliente de Supabase
// usando el token de autorización del usuario que hace la llamada.
function getSupabaseClient(req: Request): SupabaseClient {
  return createClient(
    // Asegúrate de que estas variables de entorno estén en Supabase
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    // Pasamos el header de autorización del cliente a la nueva instancia
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
}

serve(async (req) => {
  // 1. Manejo de la solicitud CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = getSupabaseClient(req)

    // 2. Autenticar al usuario 
    // Obtenemos el { data: { user } } del token JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Error de autenticación:', authError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Lógica del Endpoint (según V6) 
    // "Devuelve todas las alertas de la tabla alertas donde leido == false."
    // Asumimos que la tabla 'alertas' tiene una columna 'id_usuario_fk'
    // para cumplir con la verificación de propiedad[cite: 167].
    
    const { data: alerts, error: queryError } = await supabase
      .from('alertas')
      .select('*') // Trae todas las columnas de la alerta
      .eq('id_usuario_fk', user.id) // Filtra solo las del usuario
      .eq('leido', false)           // Filtra solo las no leídas 
      .order('fecha_creacion', { ascending: false }) // Opcional: mostrar las más nuevas primero

    if (queryError) {
      console.error('Error al consultar alertas:', queryError.message)
      return new Response(JSON.stringify({ error: 'Error fetching alerts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Devolver la lista de alertas
    return new Response(JSON.stringify(alerts), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error('Error inesperado:', e.message)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
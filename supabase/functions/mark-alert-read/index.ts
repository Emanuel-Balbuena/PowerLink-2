// supabase/functions/mark-alert-read/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Función auxiliar (igual que antes)
function getSupabaseClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Error de autenticación:', authError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Extraer el ID de la alerta de la URL
    // Asumimos que la URL es /functions/v1/mark-alert-read/{id_alerta}
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const alertId = pathParts[pathParts.length - 1] // El último segmento

    if (!alertId) {
      return new Response(JSON.stringify({ error: 'Alert ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Lógica del Endpoint (según V6) [cite: 167, 168]
    // "Verifica propiedad" y "Establece leido = true"
    // Hacemos esto en una sola operación atómica:
    // Actualiza 'alertas' poniendo 'leido = true'
    // SOLAMENTE donde el 'id_alerta' coincida Y
    // el 'id_usuario_fk' coincida con el usuario autenticado.
    
    const { data, error: updateError } = await supabase
      .from('alertas')
      .update({ leido: true })
      .eq('id_alerta', alertId)       // Filtra por ID de alerta
      .eq('id_usuario_fk', user.id) // ¡Verificación de propiedad! 
      .select() // (Opcional) Devuelve la fila actualizada

    if (updateError) {
      console.error('Error al marcar alerta como leída:', updateError.message)
      return new Response(JSON.stringify({ error: 'Could not update alert' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // (Opcional) Verificar si algo se actualizó realmente
    if (!data || data.length === 0) {
      // Esto significa que la alerta no existe o no pertenece al usuario
      return new Response(JSON.stringify({ error: 'Alert not found or access denied' }), {
        status: 404, // 404 No encontrado o 403 Prohibido son apropiados
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Devolver éxito
    return new Response(JSON.stringify({ success: true, updated: data[0] }), {
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
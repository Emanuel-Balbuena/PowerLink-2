// supabase/functions/get-analytics-cost-prediction/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // Manejo de la solicitud OPTIONS (preflight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Crear el cliente de Supabase y autenticar
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw userError || new Error('Usuario no autenticado.')
    }

    // 2. Llamar a la función RPC de predicción de costo
    const { data: prediction, error: rpcError } = await supabase
      .rpc('get_cost_prediction')

    if (rpcError) {
      throw rpcError
    }

    // 3. Devolver el resultado JSON
    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 : 500
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})
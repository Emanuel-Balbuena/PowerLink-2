// supabase/functions/get-analytics-compare/index.ts

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

    // 2. Obtener los parámetros del body
    const body = await req.json()
    const { 
      device_id, 
      period_a_start, 
      period_a_end, 
      period_b_start, 
      period_b_end 
    } = body

    if (!device_id || !period_a_start || !period_a_end || !period_b_start || !period_b_end) {
      throw new Error('Se requieren "device_id" y los 4 parámetros de fecha (period_a_start, etc.).')
    }

    // 3. Llamar a la función RPC existente DOS VECES
    const [resultA, resultB] = await Promise.all([
      // Llamada para el Periodo A
      supabase.rpc('get_analytics_device_data', {
        p_device_id: device_id,
        p_start_date: period_a_start,
        p_end_date: period_a_end
      }),
      // Llamada para el Periodo B
      supabase.rpc('get_analytics_device_data', {
        p_device_id: device_id,
        p_start_date: period_b_start,
        p_end_date: period_b_end
      })
    ])

    if (resultA.error) throw resultA.error
    if (resultB.error) throw resultB.error

    // 4. Devolver un objeto con ambos conjuntos de datos
    const responseData = {
      period_a_data: resultA.data,
      period_b_data: resultB.data
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 :
                   error.message.includes('requerido') ? 400 :
                   error.message.includes('no encontrado') ? 404 :
                   500
                   
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})
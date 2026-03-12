// supabase/functions/get-analytics-group/index.ts

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

    // 2. Obtener los parámetros de la URL
    const url = new URL(req.url)
    const groupId = url.searchParams.get('id') // id del grupo
    const startDate = url.searchParams.get('start')
    const endDate = url.searchParams.get('end')

    if (!groupId || !startDate || !endDate) {
      throw new Error('Se requieren los parámetros "id" (del grupo), "start" y "end" en la URL.')
    }

    // 3. Llamar a la función RPC con los parámetros
    const { data: chartData, error: rpcError } = await supabase
      .rpc('get_analytics_group_data', {
        p_group_id: groupId,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (rpcError) {
      throw rpcError
    }

    // 4. Devolver los datos de la gráfica
    return new Response(JSON.stringify(chartData), {
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
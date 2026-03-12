// supabase/functions/get-groups/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // Manejo de la solicitud OPTIONS (preflight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Crear el cliente de Supabase con la autenticación del usuario
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Verificar que el usuario está autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw userError || new Error('Usuario no autenticado.')
    }

    // 3. Consultar los grupos del usuario
    const { data: groups, error: dbError } = await supabase
      .from('grupos')
      .select('id_grupo, nombre_grupo, fecha_creacion')
      .eq('id_usuario_fk', user.id) // ¡La parte de seguridad!
      .order('fecha_creacion', { ascending: true })

    if (dbError) {
      throw dbError
    }

    // 4. Devolver los grupos encontrados
    return new Response(JSON.stringify(groups), {
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
// supabase/functions/create-group/index.ts

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

    // 2. Obtener los datos del body
    const body = await req.json()
    const { nombre_grupo } = body

    if (!nombre_grupo) {
      throw new Error('El campo "nombre_grupo" es requerido.')
    }

    // 3. Insertar el nuevo grupo
    const { data: newGroup, error: dbError } = await supabase
      .from('grupos')
      .insert({
        nombre_grupo: nombre_grupo,
        id_usuario_fk: user.id
      })
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    // 4. Devolver el grupo recién creado
    return new Response(JSON.stringify(newGroup), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    })
  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 :
                   error.message.includes('requerido') ? 400 :
                   500
                   
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})
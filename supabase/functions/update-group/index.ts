// supabase/functions/update-group/index.ts

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
    const { id_grupo, nombre_grupo } = body

    if (!id_grupo || !nombre_grupo) {
      throw new Error('Se requieren "id_grupo" y "nombre_grupo".')
    }

    // 3. Ejecutar la actualización segura
    const { data: updatedGroup, error: dbError } = await supabase
      .from('grupos')
      .update({ nombre_grupo: nombre_grupo })
      .eq('id_grupo', id_grupo)
      .eq('id_usuario_fk', user.id) // ¡Seguridad!
      .select()
      .single()

    if (dbError) {
      throw dbError
    }
    
    if (!updatedGroup) {
      throw new Error('Grupo no encontrado o no autorizado.')
    }

    // 4. Devolver el grupo actualizado
    return new Response(JSON.stringify(updatedGroup), {
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
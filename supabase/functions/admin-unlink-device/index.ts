// supabase/functions/admin-unlink-device/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) throw userError || new Error('Usuario no autenticado.')

    // Verificar Rol Admin (Consultando config_usuarios)
    const { data: configData } = await supabaseUser
        .from('config_usuarios')
        .select('rol')
        .eq('id_usuario_fk', user.id)
        .single();
    
    if (!configData || configData.rol !== 'admin') {
        throw new Error("No autorizado. Rol de administrador requerido.");
    }

    const url = new URL(req.url)
    const hardwareId = url.searchParams.get('id')

    if (!hardwareId) {
      throw new Error('El parámetro "id" es requerido en la URL.')
    }

    // Usar la Service Role Key para hacer el borrado "virgen"
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: updatedDevice, error: dbError } = await supabaseAdmin
      .from('dispositivos')
      .update({ 
          id_usuario_fk: null, 
          archivado: false, 
          id_grupo_fk: null, 
          nombre_personalizado: 'Dispositivo Nuevo',
          community_status: null
      })
      .eq('id_hardware', hardwareId)
      .select()
      .single()

    if (dbError) throw dbError

    return new Response(JSON.stringify(updatedDevice), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const status = error.message.includes('autenticado') ? 401 :
                   error.message.includes('requerido') ? 400 :
                   error.message.includes('autorizado') ? 403 : 500
                   
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})

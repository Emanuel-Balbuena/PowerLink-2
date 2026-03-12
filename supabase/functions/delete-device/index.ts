// supabase/functions/delete-device/index.ts

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

    // 2. Obtener el ID del dispositivo desde los query parameters de la URL
    const url = new URL(req.url)
    const deviceId = url.searchParams.get('id')

    if (!deviceId) {
      throw new Error('El parámetro "id" es requerido en la URL.')
    }

    // 3. Ejecutar el borrado seguro
    // .eq('id_usuario_fk', user.id) previene que un usuario borre dispositivos de otro
    const { data: deletedDevice, error: dbError } = await supabase
      .from('dispositivos')
      .delete()
      .eq('id_dispositivo', deviceId)  // El dispositivo específico
      .eq('id_usuario_fk', user.id)   // Que además pertenezca al usuario
      .select()                       // Devuélveme los datos del dispositivo borrado
      .single()                       // Esperamos uno solo

    if (dbError) {
      throw dbError
    }

    if (!deletedDevice) {
      throw new Error('Dispositivo no encontrado o no autorizado.')
    }

    // 4. Devolver el dispositivo que fue eliminado
    return new Response(JSON.stringify(deletedDevice), {
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
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

    // 3. Obtener el hardware actual para liberarlo
    const { data: currentDevice, error: fetchError } = await supabase
      .from('dispositivos')
      .select('id_hardware')
      .eq('id_dispositivo', deviceId)
      .eq('id_usuario_fk', user.id)
      .single()

    if (fetchError || !currentDevice) {
      throw new Error('Dispositivo no encontrado o no autorizado.')
    }

    const newHwId = currentDevice.id_hardware ? `${currentDevice.id_hardware}_archived_${Date.now()}` : null;

    // 4. Ejecutar el borrado lógico (Ocultar y renombrar HW)
    const { data: deletedDevice, error: dbError } = await supabase
      .from('dispositivos')
      .update({ 
        archivado: true,
        id_hardware: newHwId || undefined 
      })
      .eq('id_dispositivo', deviceId)  // El dispositivo específico
      .eq('id_usuario_fk', user.id)   // Que además pertenezca al usuario
      .select()                       // Devuélveme los datos del dispositivo archivado
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
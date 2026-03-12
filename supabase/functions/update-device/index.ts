// supabase/functions/update-device/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // Manejo de la solicitud OPTIONS (preflight) para CORS
  // El método PATCH requiere manejo de preflight
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
    const { 
      id_dispositivo, 
      nombre_personalizado, 
      id_grupo_fk, 
      device_type,
      device_brand,
      device_model
    } = body

    if (!id_dispositivo) {
      throw new Error('El campo "id_dispositivo" es requerido.')
    }

    // 3. Construir el objeto de actualización dinámicamente
    // Esto permite al usuario enviar solo los campos que quiere cambiar
    const updateData: {
      nombre_personalizado?: string,
      id_grupo_fk?: string | null,
      device_type?: string,
      device_brand?: string,
      device_model?: string
    } = {}

    if (nombre_personalizado) {
      updateData.nombre_personalizado = nombre_personalizado
    }
    // Permite al usuario "quitar de un grupo" enviando null
    if (id_grupo_fk !== undefined) { 
      updateData.id_grupo_fk = id_grupo_fk
    }
    if (device_type) {
      updateData.device_type = device_type
    }
    if (device_brand !== undefined) {
      updateData.device_brand = device_brand
    }
    if (device_model !== undefined) {
      updateData.device_model = device_model
    }
    
    // 4. Ejecutar la actualización segura
    // .eq('id_usuario_fk', user.id) previene que un usuario edite dispositivos de otro
    const { data: updatedDevice, error: dbError } = await supabase
      .from('dispositivos')
      .update(updateData)
      .eq('id_dispositivo', id_dispositivo) // El dispositivo específico
      .eq('id_usuario_fk', user.id)      // Que además pertenezca al usuario
      .select()                           // Devuélveme el dispositivo actualizado
      .single()                           // Esperamos un solo resultado

    if (dbError) {
      throw dbError
    }

    if (!updatedDevice) {
      throw new Error('Dispositivo no encontrado o no autorizado.')
    }

    // 5. Devolver el dispositivo actualizado
    return new Response(JSON.stringify(updatedDevice), {
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
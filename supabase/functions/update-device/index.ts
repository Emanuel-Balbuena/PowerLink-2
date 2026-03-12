// supabase/functions/update-device/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw userError || new Error('Usuario no autenticado.')
    }

    const body = await req.json()
    const { 
      id_dispositivo, 
      nombre_personalizado, 
      id_grupo_fk, 
      device_type,
      device_brand,
      device_model,
      archive_hardware // NUEVO: Bandera desde el frontend
    } = body

    if (!id_dispositivo) {
      throw new Error('El campo "id_dispositivo" es requerido.')
    }

    // PASO EXTRA: Obtener estado actual del dispositivo para validar las reglas de negocio
    const { data: currentDevice, error: fetchError } = await supabase
      .from('dispositivos')
      .select('community_status, device_brand, device_model, id_hardware') // Ajusta id_hardware si tu campo MAC se llama distinto
      .eq('id_dispositivo', id_dispositivo)
      .eq('id_usuario_fk', user.id)
      .single()

    if (fetchError || !currentDevice) {
      throw new Error('Dispositivo no encontrado o no autorizado.')
    }

    const updateData: any = {}

    // LÓGICA 1: Manejo de Archivado (Prioridad alta)
    if (archive_hardware) {
      updateData.archivado = true;
      // Liberamos la MAC/Hardware ID real añadiendo un sufijo de tiempo para evitar colisiones UNIQUE.
      // El ESP32 físico ahora está libre para ser registrado de nuevo.
      if (currentDevice.id_hardware) {
         updateData.id_hardware = `${currentDevice.id_hardware}_archived_${Date.now()}`;
      }
    }

    // LÓGICA 2: Manejo de actualización estándar
    if (nombre_personalizado) updateData.nombre_personalizado = nombre_personalizado;
    if (id_grupo_fk !== undefined) updateData.id_grupo_fk = id_grupo_fk;
    
    // Validación estricta para campos de comunidad
    const modifyingCommunityFields = device_type || device_brand !== undefined || device_model !== undefined;

    if (modifyingCommunityFields) {
      // Regla de Pinza: Rechazar si ya está LOCKED
      if (currentDevice.community_status === 'LOCKED') {
        return new Response(JSON.stringify({ error: 'No se puede modificar la marca o modelo de un dispositivo que ya está aportando a la comunidad (Estado LOCKED).' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      if (device_type) updateData.device_type = device_type;
      if (device_brand !== undefined) updateData.device_brand = device_brand;
      if (device_model !== undefined) updateData.device_model = device_model;

      // Iniciar calibración si es la primera vez que se asigna marca/modelo
      const isFirstTimeSetup = (!currentDevice.device_brand || !currentDevice.device_model) && (device_brand && device_model);
      
      if (isFirstTimeSetup) {
        updateData.community_status = 'CALIBRATING';
        updateData.community_joined_at = new Date().toISOString();
      }
    }
    
    // Ejecutar la actualización segura
    const { data: updatedDevice, error: dbError } = await supabase
      .from('dispositivos')
      .update(updateData)
      .eq('id_dispositivo', id_dispositivo) 
      .eq('id_usuario_fk', user.id)      
      .select()                           
      .single()                           

    if (dbError) throw dbError;

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
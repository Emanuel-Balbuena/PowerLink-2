import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('MY_SERVICE_ROLE_KEY') ?? '');

// --- 1. VALIDACIÓN ---
async function getUserIdFromToken(accessToken) {
  const { data, error } = await supabase.from('oauth_access_tokens').select('id_usuario_fk, expira_en').eq('access_token', accessToken).single();
  if (error || !data) {
    console.error('Error de Auth o token no encontrado:', error);
    return null;
  }
  if (new Date(data.expira_en) < new Date()) {
    console.error('Token expirado.');
    return null;
  }
  return data.id_usuario_fk;
}

// --- 2. HELPERS ---
async function findDevice(userId, deviceSlot) {
  // ¡ACTUALIZADO! Se añade device_brand y device_model para Módulo 2.6
  const { data } = await supabase.from('dispositivos')
    .select('id_dispositivo, id_hardware, nombre_personalizado, estado_rele_actual, ultimo_heartbeat, monitoring_status, device_type, device_brand, device_model')
    .eq('id_usuario_fk', userId)
    .ilike('nombre_personalizado', `%${deviceSlot}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function getConexion(userId) {
  const { data } = await supabase.from('config_usuarios')
    .select('costo_kwh, moneda')
    .eq('id_usuario_fk', userId)
    .single();
  return data;
}

function getDateRange(periodSlot) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let periodText = periodSlot;
  const todayStr = now.toISOString().split('T')[0];

  switch (periodSlot) {
    case 'hoy':
      startDate = new Date(todayStr + "T00:00:00Z");
      endDate = new Date(todayStr + "T23:59:59Z");
      periodText = "de hoy";
      break;
    case 'ayer':
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setUTCHours(23, 59, 59, 999);
      periodText = "de ayer";
      break;
    case 'semana':
      startDate = new Date(now.setDate(now.getDate() - 7));
      startDate.setUTCHours(0, 0, 0, 0);
      periodText = "de esta última semana";
      break;
    default: // mes
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodText = "de este mes";
      break;
  }
  return { startDate, endDate, periodText };
}

// --- 3. HANDLERS DE INTENTS ---

// MÓDULO 2.1: CONTROL
async function handleControlIntent(userId, deviceSlot, actionSlot) {
  const commandLower = actionSlot.toLowerCase();
  const isTurningOn = ['encien', 'pren', 'activ', 'on', 'sube', 'habilitar'].some((w)=>commandLower.includes(w));
  const targetState = isTurningOn;
  const commandString = isTurningOn ? "ON" : "OFF";
  
  let devicesToControl = [];
  let targetName = "";
  
  const singleDevice = await findDevice(userId, deviceSlot); // Reutiliza findDevice
  if (singleDevice) {
    devicesToControl.push(singleDevice);
    targetName = singleDevice.nombre_personalizado;
  } else {
    const { data: group } = await supabase.from('grupos').select('id_grupo, nombre_grupo').eq('id_usuario_fk', userId).ilike('nombre_grupo', `%${deviceSlot}%`).limit(1).maybeSingle();
    if (group) {
      const { data: groupDevices } = await supabase.from('dispositivos').select('id_dispositivo, id_hardware, nombre_personalizado').eq('id_grupo_fk', group.id_grupo);
      if (groupDevices) devicesToControl = groupDevices;
      targetName = `grupo ${group.nombre_grupo}`;
    }
  }

  if (devicesToControl.length === 0) return buildResponse(`No encontré ${deviceSlot}.`, false);

  const promises = devicesToControl.map(async (device)=>{
    const channel = supabase.channel(`control:${device.id_hardware}`);
    await channel.subscribe(async (status)=>{
      if (status === 'SUBSCRIBED') {
        await channel.send({ type: 'broadcast', event: 'control', payload: { command: commandString } });
        supabase.removeChannel(channel);
      }
    });
    return supabase.from('dispositivos').update({ estado_rele_actual: targetState }).eq('id_dispositivo', device.id_dispositivo);
  });
  await Promise.all(promises);
  
  const actionText = isTurningOn ? "encendido" : "apagado";
  return buildResponse(`Entendido, he ${actionText} ${targetName}.`, true);
}

async function handleControlAllIntent(userId, actionSlot) {
  const isTurningOn = ['encien', 'pren', 'activ', 'on'].some((w)=>actionSlot.toLowerCase().includes(w));
  const commandString = isTurningOn ? "ON" : "OFF";
  
  const { data: allDevices } = await supabase.from('dispositivos').select('id_dispositivo, id_hardware').eq('id_usuario_fk', userId);
  if (!allDevices || allDevices.length === 0) return buildResponse("No tienes dispositivos registrados.", true);

  const promises = allDevices.map(async (device)=>{
     const channel = supabase.channel(`control:${device.id_hardware}`);
     await channel.subscribe(async (status)=>{
       if (status === 'SUBSCRIBED') {
         await channel.send({ type: 'broadcast', event: 'control', payload: { command: commandString } });
         supabase.removeChannel(channel);
       }
     });
     return supabase.from('dispositivos').update({ estado_rele_actual: isTurningOn }).eq('id_dispositivo', device.id_dispositivo);
  });
  await Promise.all(promises);
  return buildResponse(`He ${isTurningOn ? "encendido" : "apagado"} ${allDevices.length} dispositivos.`, true);
}

// MÓDULO 2.2: TELEMETRÍA
async function handleGetDeviceState(userId, deviceSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré el dispositivo ${deviceSlot}.`, true);
  const estado = device.estado_rele_actual ? "encendido" : "apagado";
  return buildResponse(`El ${device.nombre_personalizado} está actualmente ${estado}.`, true);
}

async function handleGetConnectivity(userId, deviceSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré el dispositivo ${deviceSlot}.`, true);
  if (!device.ultimo_heartbeat) return buildResponse(`El ${device.nombre_personalizado} nunca se ha conectado.`, true);

  const diffMs = new Date() - new Date(device.ultimo_heartbeat);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes > 2) {
    return buildResponse(`El ${device.nombre_personalizado} parece estar desconectado. Su última señal fue hace ${diffMinutes} minutos.`, true);
  }
  return buildResponse(`El ${device.nombre_personalizado} está conectado y funcionando correctamente.`, true);
}

async function handleGetInstantPower(userId, deviceSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré el dispositivo ${deviceSlot}.`, true);

  const { data: lastReading } = await supabase.from('lecturas_consumo')
    .select('kwh_consumidos')
    .eq('id_dispositivo_fk', device.id_dispositivo)
    .order('timestamp_lectura', { ascending: false })
    .limit(1)
    .single();

  if (!lastReading) return buildResponse(`Aún no tengo lecturas de consumo para ${device.nombre_personalizado}.`, true);

  const watts = Math.round(Number(lastReading.kwh_consumidos) * 60000); 

  if (!device.estado_rele_actual && watts > 5) {
     return buildResponse(`El ${device.nombre_personalizado} está apagado, pero detecto un consumo vampiro de ${watts} Watts.`, true);
  }
  return buildResponse(`El ${device.nombre_personalizado} está consumiendo aproximadamente ${watts} Watts ahora mismo.`, true);
}

// MÓDULO 2.3: FINANZAS
async function handleDailyCostIntent(userId) {
  const config = await getConexion(userId);
  if (!config || config.costo_kwh == 0) return buildResponse("Configura tu tarifa primero.", true);

  const { startDate } = getDateRange('hoy');
  const { data: readings } = await supabase.from('lecturas_consumo')
    .select('kwh_consumidos, dispositivos!inner(id_usuario_fk)')
    .eq('dispositivos.id_usuario_fk', userId)
    .gte('timestamp_lectura', startDate.toISOString());
  
  const totalKwh = readings?.reduce((sum, r)=>sum + Number(r.kwh_consumidos), 0) || 0;
  const costo = new Intl.NumberFormat('es-MX', { style: 'currency', currency: config.moneda || 'MXN' }).format(totalKwh * config.costo_kwh);
  return buildResponse(`Hoy llevas un gasto de ${costo}.`, true);
}

async function handleGetDeviceCostIntent(userId, deviceSlot, periodSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré ${deviceSlot}.`, true);
  const config = await getConexion(userId);
  if (!config) return buildResponse("Configura tu tarifa.", true);
  
  const { startDate, periodText } = getDateRange(periodSlot || 'mes');

  const { data: resumen } = await supabase.from('resumen_consumo_diario')
    .select('costo_total_estimado')
    .eq('id_dispositivo_fk', device.id_dispositivo)
    .gte('fecha', startDate.toISOString().split('T')[0]);

  const totalCosto = resumen?.reduce((sum, r) => sum + Number(r.costo_total_estimado), 0) || 0;
  const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: config.moneda || 'MXN' }).format(totalCosto);
  return buildResponse(`El ${device.nombre_personalizado} ha gastado ${dinero} ${periodText}.`, true);
}

async function handleProjectedCostIntent(userId) {
  const config = await getConexion(userId);
  if (!config || config.costo_kwh == 0) return buildResponse("Configura tu tarifa primero.", true);

  const date = new Date();
  const primerDiaMes = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  const diasEnMes = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const diaActual = date.getDate();

  const { data: historico } = await supabase.from('resumen_consumo_diario')
    .select('kwh_consumidos_total')
    .eq('id_usuario_fk', userId)
    .gte('fecha', primerDiaMes);
  const kwhHistorico = historico?.reduce((sum, r)=>sum + Number(r.kwh_consumidos_total), 0) || 0;

  const todayStr = date.toISOString().split('T')[0];
  const { data: hoy } = await supabase.from('lecturas_consumo')
    .select('kwh_consumidos, dispositivos!inner(id_usuario_fk)')
    .eq('dispositivos.id_usuario_fk', userId)
    .gte('timestamp_lectura', `${todayStr}T00:00:00`);
  const kwhHoy = hoy?.reduce((sum, r)=>sum + Number(r.kwh_consumidos), 0) || 0;

  const kwhTotalActual = kwhHistorico + kwhHoy;
  const promedioDiario = kwhTotalActual / (diaActual || 1);
  const kwhProyectado = promedioDiario * diasEnMes;
  const costoProyectado = kwhProyectado * config.costo_kwh;

  const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: config.moneda }).format(costoProyectado);
  return buildResponse(`Según tu consumo actual, tu proyección es de ${dinero} al cierre del mes.`, true);
}

async function handleTariffIntent(userId) {
  const config = await getConexion(userId);
  if (!config || config.costo_kwh == 0) return buildResponse("No tienes tarifa configurada.", true);
  return buildResponse(`Tu tarifa es de ${config.costo_kwh} ${config.moneda} por kilowatt-hora.`, true);
}

// MÓDULO 2.4: ANALÍTICA
async function handleGetTotalEnergyIntent(userId, periodSlot) {
  const { startDate, endDate, periodText } = getDateRange(periodSlot || 'hoy');
  
  let totalKwh = 0;

  if (periodSlot === 'hoy') {
    const { data } = await supabase.from('lecturas_consumo')
      .select('kwh_consumidos, dispositivos!inner(id_usuario_fk)')
      .eq('dispositivos.id_usuario_fk', userId)
      .gte('timestamp_lectura', startDate.toISOString())
      .lte('timestamp_lectura', endDate.toISOString());
    totalKwh = data?.reduce((sum, r) => sum + Number(r.kwh_consumidos), 0) || 0;
  } else {
    const { data } = await supabase.from('resumen_consumo_diario')
      .select('kwh_consumidos_total')
      .eq('id_usuario_fk', userId)
      .gte('fecha', startDate.toISOString().split('T')[0])
      .lte('fecha', endDate.toISOString().split('T')[0]);
    totalKwh = data?.reduce((sum, r) => sum + Number(r.kwh_consumidos_total), 0) || 0;
  }

  const kwhFormato = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(totalKwh);
  return buildResponse(`Has consumido un total de ${kwhFormato} kilowatts-hora ${periodText}.`, true);
}

async function handleComparePeriodsIntent(userId, periodA_slot, periodB_slot) {
  if (!periodA_slot || !periodB_slot) {
     periodA_slot = 'hoy';
     periodB_slot = 'ayer';
  }

  const { startDate: startHoy } = getDateRange('hoy');
  const { data: hoyData } = await supabase.from('lecturas_consumo')
      .select('kwh_consumidos, dispositivos!inner(id_usuario_fk)')
      .eq('dispositivos.id_usuario_fk', userId)
      .gte('timestamp_lectura', startHoy.toISOString());
  const kwhHoy = hoyData?.reduce((sum, r) => sum + Number(r.kwh_consumidos), 0) || 0;

  const { startDate: startAyer, endDate: endAyer } = getDateRange('ayer');
  const { data: ayerData } = await supabase.from('resumen_consumo_diario')
      .select('kwh_consumidos_total')
      .eq('id_usuario_fk', userId)
      .gte('fecha', startAyer.toISOString().split('T')[0])
      .lte('fecha', endAyer.toISOString().split('T')[0]);
  const kwhAyer = ayerData?.reduce((sum, r) => sum + Number(r.kwh_consumidos_total), 0) || 0;

  if (kwhAyer === 0) return buildResponse(`Hoy llevas ${kwhHoy.toFixed(2)} kWh, pero no tengo datos de ayer.`, true);

  const percent = ((kwhHoy - kwhAyer) / kwhAyer) * 100;
  
  if (Math.abs(percent) < 5) return buildResponse(`Tu consumo es similar. Hoy llevas ${kwhHoy.toFixed(2)} y ayer ${kwhAyer.toFixed(2)} kWh.`, true);
  
  const masOMenos = percent > 0 ? "más" : "menos";
  return buildResponse(`Hoy has consumido un ${Math.abs(percent).toFixed(0)}% ${masOMenos} que ayer.`, true);
}

async function handleIdentifyHighConsumerIntent(userId, periodSlot) {
  const { startDate, periodText } = getDateRange(periodSlot || 'mes');

  const { data: resumen, error } = await supabase.from('resumen_consumo_diario')
    .select('id_dispositivo_fk, costo_total_estimado')
    .eq('id_usuario_fk', userId)
    .gte('fecha', startDate.toISOString().split('T')[0]);

  if (error || !resumen) return buildResponse("No pude analizar los consumos.", true);

  const map = new Map();
  for (const item of resumen) {
    map.set(item.id_dispositivo_fk, (map.get(item.id_dispositivo_fk) || 0) + Number(item.costo_total_estimado));
  }
  if (map.size === 0) return buildResponse(`No tengo datos de consumo ${periodText}.`, true);

  let maxCosto = 0; let maxId = '';
  for (const [id, costo] of map.entries()) {
    if (costo > maxCosto) { maxCosto = costo; maxId = id; }
  }
  if (maxId === '') return buildResponse(`No hay consumo registrado ${periodText}.`, true);

  const { data: device } = await supabase.from('dispositivos').select('nombre_personalizado').eq('id_dispositivo', maxId).single();
  const config = await getConexion(userId);
  const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: config.moneda || 'MXN' }).format(maxCosto);

  return buildResponse(`Tu ${device?.nombre_personalizado || 'dispositivo'} es el mayor consumidor ${periodText}, con ${dinero}.`, true);
}

// MÓDULO 2.5: ALERTAS
async function handleCheckAlertsIntent(userId) {
  const { data, error } = await supabase.from('alertas')
    .select('mensaje')
    .eq('id_usuario_fk', userId)
    .eq('leido', false)
    .order('fecha_creacion', { ascending: false });

  if (error) return buildResponse("Tuve problemas al consultar tus alertas.", true);
  if (data.length === 0) return buildResponse("No tienes ninguna alerta nueva.", true);
  
  return buildResponse(`Tienes ${data.length} alertas nuevas. La más reciente dice: ${data[0].mensaje}`, true);
}

async function handleCheckDeviceHealthIntent(userId, deviceSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré el dispositivo ${deviceSlot}.`, true);

  switch (device.monitoring_status) {
    case 'learning': return buildResponse(`El sistema aún está aprendiendo el patrón de consumo de tu ${device.nombre_personalizado}.`, true);
    case 'monitoring': return buildResponse(`Tu ${device.nombre_personalizado} está siendo monitoreado y funciona correctamente.`, true);
    case 'error': return buildResponse(`Detecto un estado de error en tu ${device.nombre_personalizado}. Revisa la app web.`, true);
    default: return buildResponse(`No tengo un estado de salud claro para ${device.nombre_personalizado}.`, true);
  }
}

async function handleDetectVampirePowerIntent(userId) {
  const { data, error } = await supabase.from('alertas')
    .select('mensaje')
    .eq('id_usuario_fk', userId)
    .eq('leido', false)
    .eq('tipo_alerta', 'VAMPIRO')
    .order('fecha_creacion', { ascending: false })
    .limit(1);

  if (error) return buildResponse("Tuve problemas al buscar consumo vampiro.", true);
  if (data.length === 0) return buildResponse("No he detectado consumo vampiro reciente que no hayas leído.", true);

  return buildResponse(`Sí. ${data[0].mensaje}`, true);
}

// MÓDULO 2.6: COMUNIDAD (NUEVO)
async function handleGetCommunityAverageIntent(userId, deviceSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré ${deviceSlot}.`, true);

  // 1. Verificar Opt-In
  if (!device.device_brand || !device.device_model) {
    return buildResponse(`Para comparar tu ${device.nombre_personalizado}, primero necesito que vayas a la app web e indiques la marca y el modelo.`, true);
  }

  // 2. Consultar data de comunidad
  const { data: community } = await supabase.from('community_baselines')
    .select('avg_peak_kwh, sample_size') // Usamos avg_peak_kwh como el "promedio"
    .eq('device_type', device.device_type)
    .eq('device_brand', device.device_brand)
    .eq('device_model', device.device_model)
    .limit(1)
    .single();
  
  if (!community) {
    return buildResponse(`Aún no tengo datos de la comunidad para ${device.device_brand} ${device.device_model}. ¡Sé el primero!`, true);
  }

  // Asumimos que avg_peak_kwh es un promedio diario
  const avgKwh = Number(community.avg_peak_kwh).toFixed(2);
  return buildResponse(`El promedio de consumo para ${device.device_brand} ${device.device_model} es de ${avgKwh} kilowatts-hora al día, basado en ${community.sample_size} usuarios.`, true);
}

async function handleCommunityBenchmarkIntent(userId, deviceSlot) {
  const device = await findDevice(userId, deviceSlot);
  if (!device) return buildResponse(`No encontré ${deviceSlot}.`, true);

  // 1. Verificar Opt-In
  if (!device.device_brand || !device.device_model) {
    return buildResponse(`Para comparar, ve a la app web e indica la marca y modelo de tu ${device.nombre_personalizado}.`, true);
  }

  // 2. Consultar data de comunidad
  const { data: community } = await supabase.from('community_baselines')
    .select('avg_peak_kwh')
    .eq('device_type', device.device_type)
    .eq('device_brand', device.device_brand)
    .eq('device_model', device.device_model)
    .limit(1)
    .single();

  if (!community) return buildResponse(`Aún no tengo datos de comunidad para ${device.device_brand} ${device.device_model}.`, true);
  
  const communityAvgKwh = Number(community.avg_peak_kwh);

  // 3. Consultar data del usuario (Promedio diario de este mes)
  const { startDate } = getDateRange('mes');
  const { data: resumen } = await supabase.from('resumen_consumo_diario')
    .select('kwh_consumidos_total')
    .eq('id_dispositivo_fk', device.id_dispositivo)
    .gte('fecha', startDate.toISOString().split('T')[0]);
  
  if (!resumen || resumen.length === 0) return buildResponse(`Tengo el promedio de la comunidad, pero aún no tengo suficientes datos de tu ${device.nombre_personalizado} este mes.`, true);

  const myTotalKwh = resumen.reduce((sum, r) => sum + Number(r.kwh_consumidos_total), 0);
  const myAvgKwh = myTotalKwh / resumen.length;

  // 4. Comparar
  const percent = ((myAvgKwh - communityAvgKwh) / communityAvgKwh) * 100;
  
  if (Math.abs(percent) < 10) {
    return buildResponse(`Tu ${device.nombre_personalizado} consume ${myAvgKwh.toFixed(2)} kWh al día, lo cual es muy similar al promedio de la comunidad de ${communityAvgKwh.toFixed(2)}.`, true);
  }

  const masOMenos = percent > 0 ? "más" : "menos";
  return buildResponse(`Tu ${device.nombre_personalizado} consume ${myAvgKwh.toFixed(2)} kWh al día. Esto es un ${Math.abs(percent).toFixed(0)}% ${masOMenos} que el promedio de la comunidad.`, true);
}


// --- ROUTER PRINCIPAL ---
serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const requestType = body.request.type;
    const accessToken = body.session?.user?.accessToken || body.context?.System?.user?.accessToken;
    
    if (!accessToken) return buildResponse("Vincula tu cuenta en la app de Alexa.", true, true);
    const userId = await getUserIdFromToken(accessToken);
    if (!userId) return buildResponse("Tu sesión expiró. Vincula de nuevo.", true, true);

    if (requestType === 'LaunchRequest') return buildResponse("Hola, Power Link está listo.", false);

    if (requestType === 'IntentRequest') {
      const intent = body.request.intent;
      const deviceSlot = intent.slots?.device?.value;
      const periodSlot = intent.slots?.period?.value;

      switch (intent.name) {
        // Módulo 2.1
        case 'ControlDeviceIntent': 
          if (!intent.slots?.action?.value || !deviceSlot) return buildResponse("¿Qué deseas hacer y con qué dispositivo?", false);
          return await handleControlIntent(userId, deviceSlot, intent.slots.action.value);
        case 'ControlAllIntent': 
          if (!intent.slots?.action?.value) return buildResponse("¿Qué deseas hacer con todos los dispositivos?", false);
          return await handleControlAllIntent(userId, intent.slots.action.value);
        
        // Módulo 2.2
        case 'GetDeviceStateIntent': 
          if (!deviceSlot) return buildResponse("¿De qué dispositivo quieres saber el estado?", false);
          return await handleGetDeviceState(userId, deviceSlot);
        case 'GetConnectivityIntent': 
          if (!deviceSlot) return buildResponse("¿De qué dispositivo quieres saber la conexión?", false);
          return await handleGetConnectivity(userId, deviceSlot);
        case 'GetInstantPowerIntent': 
          if (!deviceSlot) return buildResponse("¿De qué dispositivo quieres saber el consumo?", false);
          return await handleGetInstantPower(userId, deviceSlot);
        
        // Módulo 2.3
        case 'GetDailyCostIntent': return await handleDailyCostIntent(userId);
        case 'GetProjectedCostIntent': return await handleProjectedCostIntent(userId);
        case 'GetTariffIntent': return await handleTariffIntent(userId);
        case 'GetDeviceCostIntent': 
          if (!deviceSlot) return buildResponse("¿De qué dispositivo quieres saber el costo?", false);
          return await handleGetDeviceCostIntent(userId, deviceSlot, periodSlot);
        
        // Módulo 2.4
        case 'GetTotalEnergyIntent': return await handleGetTotalEnergyIntent(userId, periodSlot);
        case 'ComparePeriodsIntent': return await handleComparePeriodsIntent(userId, intent.slots?.periodA?.value, intent.slots?.periodB?.value);
        case 'IdentifyHighConsumerIntent': return await handleIdentifyHighConsumerIntent(userId, periodSlot);

        // Módulo 2.5
        case 'CheckAlertsIntent': return await handleCheckAlertsIntent(userId);
        case 'CheckDeviceHealthIntent': 
          if (!deviceSlot) return buildResponse("¿Sobre qué dispositivo es la consulta de salud?", false);
          return await handleCheckDeviceHealthIntent(userId, deviceSlot);
        case 'DetectVampirePowerIntent': return await handleDetectVampirePowerIntent(userId);
        
        // Módulo 2.6 (NUEVO)
        case 'GetCommunityAverageIntent':
          if (!deviceSlot) return buildResponse("¿De qué dispositivo quieres saber el promedio?", false);
          return await handleGetCommunityAverageIntent(userId, deviceSlot);
        case 'CommunityBenchmarkIntent':
          if (!deviceSlot) return buildResponse("¿Qué dispositivo quieres comparar con el promedio?", false);
          return await handleCommunityBenchmarkIntent(userId, deviceSlot);

        case 'AMAZON.HelpIntent': return buildResponse("Puedes preguntar estado, consumo, alertas, promedios o controlar dispositivos.", false);
        case 'AMAZON.StopIntent':
        case 'AMAZON.CancelIntent': return buildResponse("Adiós.", true);
        
        default:
          return buildResponse("No entiendo ese comando.", false);
      }
    }
    return buildResponse("No reconozco esa solicitud.", false);
  } catch (e) {
    console.error("Error global en el handler:", e);
    return buildResponse("Hubo un error en el sistema PowerLink.", true);
  }
});

function buildResponse(text, shouldEndSession, linkAccountCard = false) {
  const response = {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: text
      },
      shouldEndSession: shouldEndSession
    }
  };
  if (linkAccountCard) response.response.card = {
    type: "LinkAccount"
  };
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    status: 200
  });
}
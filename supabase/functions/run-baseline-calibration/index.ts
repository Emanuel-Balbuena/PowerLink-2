import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Usar la Service Role Key real
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('MY_SERVICE_ROLE_KEY') ?? '' // Tu Service Role Key
);

// --- INICIO: Motor de Análisis de Comportamiento ---

interface Reading {
  kwh_consumidos: number;
  timestamp_lectura: string;
}

interface Stats {
  min: number; max: number; avg: number; stdDev: number;
  p05: number; p95: number; zeroPercent: number;
}

interface KMeansResult {
  centers: number[]; // [standby_center, peak_center]
  clusters: number[][];
}

/**
 * 1. Calcula estadísticas descriptivas básicas.
 */
function calculateStatistics(data: number[]): Stats {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(
    sorted.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / n
  );

  const p05 = sorted[Math.floor(n * 0.05)];
  const p95 = sorted[Math.floor(n * 0.95)];
  
  const zeroThreshold = p05 * 1.1; 
  const zeroCount = sorted.filter(x => x < zeroThreshold).length;

  return {
    min, max, avg, stdDev, p05, p95,
    zeroPercent: (zeroCount / n) * 100,
  };
}

/**
 * 2. Algoritmo K-Means (k=2) para encontrar estados de standby y pico.
 */
function simpleKMeans(data: number[], k: number = 2): KMeansResult | null {
  if (data.length < k) return null;
  
  let centers = [
    data.sort((a, b) => a - b)[Math.floor(data.length * 0.05)], // p05
    data.sort((a, b) => a - b)[Math.floor(data.length * 0.95)], // p95
  ];
  
  if (centers[0] === centers[1]) {
    if (centers[1] < Math.max(...data)) {
        centers[1] = Math.max(...data);
    } else {
        return null; // Estado único
    }
  }

  let clusters: number[][] = [];
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 100) {
    clusters = Array.from({ length: k }, () => []);
    
    data.forEach(point => {
      const clusterIndex = centers.indexOf(
        centers.reduce((prev, curr) => 
          Math.abs(point - prev) < Math.abs(point - curr) ? prev : curr
        )
      );
      clusters[clusterIndex].push(point);
    });

    const newCenters = centers.map((_, i) => {
      if (clusters[i].length === 0) return centers[i];
      return clusters[i].reduce((a, b) => a + b, 0) / clusters[i].length;
    });

    changed = newCenters.some((center, i) => center !== centers[i]);
    centers = newCenters;
    iterations++;
  }
  
  if (centers[0] > centers[1]) {
    [centers[0], centers[1]] = [centers[1], centers[0]];
    [clusters[0], clusters[1]] = [clusters[1], clusters[0]];
  }

  return { centers, clusters };
}

/**
 * 3. Analiza transiciones y duraciones de ciclo.
 */
function analyzeCycles(data: number[], kmeans: KMeansResult) {
  const standbyCenter = kmeans.centers[0];
  const peakCenter = kmeans.centers[1];
  const threshold = standbyCenter + (peakCenter - standbyCenter) / 2;

  let inPicoState = false;
  let currentPicoDuration = 0;
  let currentValleDuration = 0;
  
  let picoDurations: number[] = [];
  let valleDurations: number[] = [];
  let transitionsToPico = 0;

  for (const reading of data) {
    if (reading > threshold) { // Estado PICO
      if (!inPicoState) {
        inPicoState = true;
        transitionsToPico++;
        if (currentValleDuration > 0) valleDurations.push(currentValleDuration);
        currentValleDuration = 0;
      }
      currentPicoDuration++;
    } else { // Estado VALLE
      if (inPicoState) {
        inPicoState = false;
        if (currentPicoDuration > 0) picoDurations.push(currentPicoDuration);
        currentPicoDuration = 0;
      }
      currentValleDuration++;
    }
  }
  
  const statsFromDurations = (durations: number[]) => {
    if (durations.length === 0) return { min: 0, max: 0, avg: 0 };
    durations.sort((a, b) => a - b);
    const min = durations[0] / 60; // en horas
    const max = durations[durations.length - 1] / 60; // en horas
    const avg = (durations.reduce((a, b) => a + b, 0) / durations.length) / 60; // en horas
    return { min, max, avg };
  };

  return {
    transitionsToPico,
    picoStats: statsFromDurations(picoDurations),
    valleStats: statsFromDurations(valleDurations),
  };
}

/**
 * 4. El "Analista" Principal: Deduce el tipo y construye la huella.
 */
function analyzeDeviceBehavior(readings: Reading[]): any { // 'any' para JSONB
  const data = readings.map(r => r.kwh_consumidos);
  const totalDays = readings.length / (60 * 24); // Asumiendo 1 lectura/min
  
  const stats = calculateStatistics(data);

  // --- Regla 1: "Always On" (Router, Módem) ---
  const isFlat = stats.stdDev < (stats.avg * 0.15); // Desv. < 15% de la media
  if (isFlat && stats.zeroPercent < 1) {
    return {
      analysis_type: "always_on",
      standby_avg: stats.avg,
      standby_min: stats.min * 0.8, // Para ALERTA_FALLO_CORRIENTE [cite: 202]
      peak_max: stats.max * 1.2,    // Para sobrecarga
    };
  }

  // --- Regla 2: "Variable" (Licuadora, PC) o "On/Off" (Standby Cero) ---
  const kmeans = simpleKMeans(data);
  // Si k-means falla o si el standby es casi cero (ej. lámpara)
  if (!kmeans || (kmeans.centers[1] < kmeans.centers[0] * 3) || kmeans.centers[0] < stats.p05) {
    // Si el standby es casi cero, es On/Off simple
    if (stats.p05 < (stats.p95 * 0.05)) {
        return {
            analysis_type: "on_off",
            standby_max: stats.p05 * 1.5,
            peak_max: stats.p95 * 1.3,
            on_duracion_max: 18, // Default 18 horas para dispositivos olvidados [cite: 209]
        };
    }
    // Si no, es "Variable"
    return {
      analysis_type: "variable",
      standby_max: stats.p05 * 1.5,
      peak_max: stats.p95 * 1.3,
    };
  }

  // --- Regla 3: "On/Off" (con standby) vs "Cíclico" ---
  const cycleAnalysis = analyzeCycles(data, kmeans);
  const transitionsPerDay = cycleAnalysis.transitionsToPico / totalDays;

  // Umbral: Si tiene más de 10 ciclos por día, es Cíclico.
  if (transitionsPerDay > 10) {
    // Es Cíclico (Refrigerador, A/C)
    return {
      analysis_type: "cyclical",
      standby_max: kmeans.centers[0] * 1.5, // [cite: 200]
      peak_max: kmeans.centers[1] * 1.5,    // [cite: 199]
      pico_duracion_min: cycleAnalysis.picoStats.min * 0.8, // [cite: 207]
      pico_duracion_max: cycleAnalysis.picoStats.max * 1.2, // [cite: 205]
      valle_duracion_max: cycleAnalysis.valleStats.max * 1.2, // [cite: 206]
      max_cycles_per_hour: (transitionsPerDay / 24) * 1.5, // (Implícito para 207)
    };
  } else {
    // Es On/Off con standby (TV, Consola)
    return {
      analysis_type: "on_off",
      standby_max: kmeans.centers[0] * 1.5, // [cite: 200]
      peak_max: kmeans.centers[1] * 1.5,    // [cite: 199]
      on_duracion_max: cycleAnalysis.picoStats.max > 0 ? cycleAnalysis.picoStats.max * 1.2 : 18, // [cite: 209]
    };
  }
}

// --- FIN: Motor de Análisis de Comportamiento ---


/**
 * El Servidor de la Edge Function
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. Seguridad: Solo el Cron puede llamar a esta función
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. Buscar dispositivos listos para calibrar [cite: 190]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: devicesToCalibrate, error: devicesError } = await supabase
      .from('dispositivos')
      .select('id_dispositivo')
      .eq('monitoring_status', 'learning')
      .lt('fecha_registro', sevenDaysAgo)

    if (devicesError) throw devicesError
    
    let processedCount = 0
    const errors: string[] = []

    // 3. Iterar sobre cada dispositivo
    for (const device of devicesToCalibrate) {
      try {
        // 4. Obtener su historial de lecturas (últimos 7 días) [cite: 191]
        const { data: readings, error: readingsError } = await supabase
          .from('lecturas_consumo')
          .select('kwh_consumidos, timestamp_lectura')
          .eq('id_dispositivo_fk', device.id_dispositivo) // ¡Esquema Profesional!
          .gte('timestamp_lectura', sevenDaysAgo)
        
        if (readingsError) throw readingsError
        
        if (!readings || readings.length < 1000) { 
          continue; // No hay suficientes datos
        }

        // 5. ¡Ejecutar el Analista! [cite: 191]
        const baselineData = analyzeDeviceBehavior(readings as Reading[]);

        // 6. Guardar la huella y "graduar" el dispositivo [cite: 192]
        const { error: updateError } = await supabase
          .from('dispositivos')
          .update({
            baseline_data: baselineData,
            monitoring_status: 'monitoring'
          })
          .eq('id_dispositivo', device.id_dispositivo)
        
        if (updateError) throw updateError
        
        processedCount++

      } catch (e) {
        console.error(`Error procesando ${device.id_dispositivo}:`, e.message);
        errors.push(`Device ${device.id_dispositivo}: ${e.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        total_found: devicesToCalibrate.length, 
        errors 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
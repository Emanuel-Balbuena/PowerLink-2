// supabase/functions/admin-get-devices/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Client for user auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado.');

    // 2. Client with service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify admin role
    const { data: config, error: configError } = await supabaseAdmin
      .from('config_usuarios')
      .select('rol')
      .eq('id_usuario_fk', user.id)
      .single();

    if (configError || !config || config.rol !== 'admin') {
      return new Response(JSON.stringify({ error: 'No autorizado. Se requiere rol de administrador.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Leer parámetros de paginación
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 5. Fetch total count & devices con paginación
    const { data: devices, count, error: dbError } = await supabaseAdmin
      .from('dispositivos')
      .select('*, grupos ( nombre_grupo )', { count: 'exact' })
      .order('fecha_registro', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) throw dbError;

    // Get all users to map emails
    const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const userMap = new Map();
    authUsersData.users.forEach(u => userMap.set(u.id, u.email));

    const enrichedDevices = devices.map(d => ({
      ...d,
      user_email: userMap.get(d.id_usuario_fk) || 'Desconocido'
    }));

    return new Response(JSON.stringify({
      data: enrichedDevices,
      total: count,
      page,
      limit
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

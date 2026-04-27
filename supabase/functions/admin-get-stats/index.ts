// supabase/functions/admin-get-stats/index.ts
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

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get total devices
    const { count: totalDevices } = await supabaseAdmin
      .from('dispositivos')
      .select('*', { count: 'exact', head: true });

    // Get total users
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const totalUsers = authUsersData?.users?.length || 0;

    // Get online devices (ultimo_heartbeat within last 5 mins)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: onlineDevices } = await supabaseAdmin
      .from('dispositivos')
      .select('*', { count: 'exact', head: true })
      .gte('ultimo_heartbeat', fiveMinsAgo);

    return new Response(JSON.stringify({
      totalDevices: totalDevices || 0,
      totalUsers,
      onlineDevices: onlineDevices || 0
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

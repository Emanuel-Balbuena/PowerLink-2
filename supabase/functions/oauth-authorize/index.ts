import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('MY_SERVICE_ROLE_KEY') ?? '');
// 1. Define la URL real de tu Frontend.
// OPCIÓN A (Desarrollo Local):
const FRONTEND_URL = "https://power-link-2.vercel.app"; // O el puerto que uses (5500, 3000, 8080)
// OPCIÓN B (Producción):
// const FRONTEND_URL = "https://mi-app-powerlink.vercel.app";
// 2. Apunta a una ruta que tu Router.js pueda entender (usaremos el hash #consent)
const LOGIN_CONSENT_URL = `${FRONTEND_URL}/app.html#consent`;
serve(async (req)=>{
  const url = new URL(req.url);
  const params = url.searchParams;
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const responseType = params.get('response_type');
  const state = params.get('state'); // Google/Amazon nos dan esto
  if (responseType !== 'code') {
    return new Response("Unsupported response_type", {
      status: 400
    });
  }
  if (!clientId || !redirectUri || !state) {
    return new Response("Missing required parameters", {
      status: 400
    });
  }
  try {
    // 1. Validar que el 'client_id' es de Google/Amazon
    const { data: client, error } = await supabase.from('oauth_clients').select('id_cliente, redirect_uri').eq('client_id', clientId).single();
    if (error || !client) {
      return new Response("Invalid client_id", {
        status: 401
      });
    }
    // 2. Validar que la redirect_uri coincide con la que registramos
    // (Google/Amazon a veces usan varias, pero la principal debe coincidir)
    if (redirectUri !== client.redirect_uri) {
      console.warn(`Redirect URI mismatch: ${redirectUri} !== ${client.redirect_uri}`);
    // Ojo: En producción, Google puede usar URIs variables. 
    // Por ahora, lo mantenemos estricto.
    }
    // 3. Redirigir al usuario a NUESTRA página de login/consentimiento
    // Pasamos todos los parámetros para que el frontend los procese
    const loginUrl = new URL(LOGIN_CONSENT_URL);
    loginUrl.searchParams.set('client_id', clientId);
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('state', state);
    loginUrl.searchParams.set('response_type', responseType);
    // Redirección HTTP 302
    return new Response(null, {
      status: 302,
      headers: {
        'Location': loginUrl.toString()
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 500
    });
  }
});

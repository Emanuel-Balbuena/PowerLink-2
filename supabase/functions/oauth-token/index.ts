import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ELIMINAMOS la importación vieja de uuid.
// Usaremos crypto.randomUUID() que es nativo.
// Configuración de Supabase
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('MY_SERVICE_ROLE_KEY') ?? '');
// --- FUNCIONES AUXILIARES ---
async function createAccessToken(userId: string, clientId: string) {
  const tokenString = `at-${userId}-${crypto.randomUUID()}`;
  
  // 1 hora de expiración (3600 segundos)
  const expirationDate = new Date();
  expirationDate.setSeconds(expirationDate.getSeconds() + 3600); 

  // --- GUARDAR EN BASE DE DATOS ---
  const { error } = await supabase.from('oauth_access_tokens').insert({
    access_token: tokenString,
    id_usuario_fk: userId,
    expira_en: expirationDate.toISOString()
  });

  if (error) {
    console.error("Error al guardar access token:", error);
    throw new Error("No se pudo guardar el access token");
  }

  return tokenString; 
}
async function createRefreshToken(userId, clientId, clientDbId) {
  // CAMBIO: Usamos crypto.randomUUID() nativo
  const refreshToken = `rt-${userId}-${crypto.randomUUID()}`;
  const { error } = await supabase.from('oauth_refresh_tokens').insert({
    id_usuario_fk: userId,
    id_cliente_fk: clientDbId,
    refresh_token: refreshToken
  });
  if (error) {
    console.error("Error guardando refresh token:", error);
    throw new Error(`Failed to save refresh token: ${error.message}`);
  }
  return refreshToken;
}
// --- HANDLER PRINCIPAL ---
serve(async (req)=>{
  try {
    // 1. MANEJO DE INPUT (Detectar si es JSON o Form Data)
    let params = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      params = await req.json();
    } else {
      const bodyText = await req.text();
      const urlParams = new URLSearchParams(bodyText);
      params = Object.fromEntries(urlParams);
    }
    const grantType = params.grant_type;
    const clientId = params.client_id;
    const clientSecret = params.client_secret;
    console.log(`Petición recibida: GrantType=${grantType}, ClientID=${clientId}`);
    // 2. VALIDAR CLIENTE
    const { data: client, error: clientError } = await supabase.from('oauth_clients').select('id_cliente').eq('client_id', clientId).eq('client_secret', clientSecret).single();
    if (clientError || !client) {
      console.error("Cliente inválido:", clientId);
      return new Response(JSON.stringify({
        error: "invalid_client"
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    let userId;
    let tokenClientId = client.id_cliente;
    // 3. PROCESAR SEGÚN EL TIPO DE GRANT
    if (grantType === 'authorization_code') {
      // --- FLUJO A: Login inicial ---
      const code = params.code;
      const { data: codeData, error: codeError } = await supabase.from('oauth_codes').select('id_usuario_fk, expira_en, usado').eq('codigo', code).single();
      if (codeError || !codeData) {
        return new Response(JSON.stringify({
          error: "invalid_grant",
          error_description: "Code not found"
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      if (codeData.usado) {
        return new Response(JSON.stringify({
          error: "invalid_grant",
          error_description: "Code already used"
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      if (new Date(codeData.expira_en) < new Date()) {
        return new Response(JSON.stringify({
          error: "invalid_grant",
          error_description: "Code expired"
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      // Quemar el código
      await supabase.from('oauth_codes').update({
        usado: true
      }).eq('codigo', code);
      userId = codeData.id_usuario_fk;
    } else if (grantType === 'refresh_token') {
      // --- FLUJO B: Refrescar token ---
      const refreshToken = params.refresh_token;
      const { data: tokenData, error: tokenError } = await supabase.from('oauth_refresh_tokens').select('id_usuario_fk, id_cliente_fk').eq('refresh_token', refreshToken).single();
      if (tokenError || !tokenData) {
        console.error("Refresh token inválido:", refreshToken);
        return new Response(JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid Refresh Token"
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      userId = tokenData.id_usuario_fk;
      if (tokenData.id_cliente_fk !== tokenClientId) {
        return new Response(JSON.stringify({
          error: "invalid_grant",
          error_description: "Client mismatch"
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    } else {
      return new Response(JSON.stringify({
        error: "unsupported_grant_type"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 4. GENERAR RESPUESTA
    const accessToken = await createAccessToken(userId, clientId);
    const accessTokenExpiresIn = 3600;
    let responseBody = {
      token_type: "Bearer",
      access_token: accessToken,
      expires_in: accessTokenExpiresIn
    };
    if (grantType === 'authorization_code') {
      const newRefreshToken = await createRefreshToken(userId, clientId, tokenClientId);
      responseBody.refresh_token = newRefreshToken;
    }
    console.log("Token generado exitosamente para usuario:", userId);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (e) {
    console.error("Error CRITICO en oauth-token:", e);
    return new Response(JSON.stringify({
      error: "server_error",
      error_description: e.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

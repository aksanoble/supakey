import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { persistSession: false },
        db: { schema: 'supakey' },
        global: {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          }
        }
      }
    )

    const contentType = req.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await req.json() : Object.fromEntries(new URLSearchParams(await req.text()))

    const grant_type = body.grant_type

    if (grant_type !== 'authorization_code') {
      return json({ error: 'unsupported_grant_type' }, 400)
    }

    const code = body.code
    const redirect_uri = body.redirect_uri
    const client_id = body.client_id
    const code_verifier = body.code_verifier

    if (!code || !redirect_uri || !client_id) {
      return json({ error: 'invalid_request' }, 400)
    }

    // Client validation will be done against the authorization code's stored redirect_uri
    // rather than requiring pre-registered clients (dynamic registration)

    const { data: authCode, error: codeError } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (codeError || !authCode) {
      return json({ error: 'invalid_grant' }, 400)
    }

    if (new Date(authCode.expires_at).getTime() < Date.now()) {
      return json({ error: 'invalid_grant' }, 400)
    }

    if (authCode.redirect_uri !== redirect_uri || authCode.client_id !== client_id) {
      return json({ error: 'invalid_grant' }, 400)
    }

    // If PKCE was used, verify code verifier
    if (authCode.code_challenge) {
      if (!code_verifier) return json({ error: 'invalid_request' }, 400)
      const algo = authCode.code_challenge_method === 'S256' ? 'SHA-256' : null
      if (algo) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier))
        const base64 = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        if (base64 !== authCode.code_challenge) {
          return json({ error: 'invalid_grant' }, 400)
        }
      } else {
        if (code_verifier !== authCode.code_challenge) {
          return json({ error: 'invalid_grant' }, 400)
        }
      }
    }

    // With valid code, mint tokens by leveraging existing deploy function logic for issuance
    // We reuse the application account set for the given app_identifier, and sign in to user's target DB
    const appIdentifier = authCode.app_identifier

    // Find application and user connection for this user
    const { data: application } = await supabase
      .from('applications')
      .select('id, app_schema, user_connection_id, application_account_id')
      .eq('app_identifier', appIdentifier)
      .single()

    if (!application) {
      return json({ error: 'invalid_request', message: 'application not found' }, 400)
    }

    const { data: userConnection } = await supabase
      .from('user_connections')
      .select('supabase_url, supabase_secret_key, supabase_anon_key')
      .eq('id', application.user_connection_id)
      .single()

    if (!userConnection) {
      return json({ error: 'invalid_request', message: 'user connection not found' }, 400)
    }

    const { data: account } = await supabase
      .from('application_accounts')
      .select('application_username, application_password')
      .eq('id', application.application_account_id)
      .single()

    if (!account) {
      return json({ error: 'invalid_request', message: 'application account not found' }, 400)
    }

    const target = createClient(userConnection.supabase_url, userConnection.supabase_secret_key)
    const { data: signInData, error: signInError } = await target.auth.signInWithPassword({
      email: account.application_username,
      password: account.application_password
    })

    if (signInError || !signInData.session) {
      return json({ error: 'server_error', message: 'failed to mint tokens' }, 500)
    }

    // One-time use: delete code
    await supabase.from('oauth_authorization_codes').delete().eq('code', code)

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      token_type: 'bearer',
      expires_in: 3600,
      scope: authCode.scope,
      supabase_url: userConnection.supabase_url,
      anon_key: userConnection.supabase_anon_key,
      user_id: signInData.session.user.id,
      application_id: application.id
    })
  } catch (e) {
    return json({ error: 'server_error' }, 500)
  }
})



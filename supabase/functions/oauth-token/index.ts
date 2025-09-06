import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean)
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin)
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  }
  if (allowed) base['Access-Control-Allow-Origin'] = origin
  return { headers: base, allowed }
}

// (removed legacy json helper; all responses include CORS via getCorsHeaders)

// Helpers to align with deploy-migrations edge function
function deriveSchemaName(appIdentifier: string): string {
  return appIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

function deriveSquitchRegistrySchema(appIdentifier: string): string {
  return `sqitch_${deriveSchemaName(appIdentifier)}`
}

async function updatePostgRESTConfig(platformApiToken: string, supabaseUrl: string, newSchema: string): Promise<void> {
  const urlPattern = /https:\/\/([a-zA-Z0-9]+)\.supabase\.co/
  const match = supabaseUrl.match(urlPattern)
  if (!match) throw new Error('Invalid Supabase URL format')
  const projectId = match[1]

  const getResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/postgrest`, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${platformApiToken}`,
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  })
  if (!getResponse.ok) {
    const errorText = await getResponse.text()
    throw new Error(`Failed to get PostgREST config: ${getResponse.status} - ${errorText}`)
  }
  const currentConfig = await getResponse.json()
  const currentSchemas: string[] = currentConfig.db_schema ? currentConfig.db_schema.split(',').map((s: string) => s.trim()) : ['public']
  if (!currentSchemas.includes(newSchema)) currentSchemas.push(newSchema)
  const updatePayload = {
    db_schema: currentSchemas.join(', '),
    max_rows: currentConfig.max_rows || 1000,
    db_extra_search_path: currentConfig.db_extra_search_path || 'public, extensions'
  }
  const updateResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/postgrest`, {
    method: 'PATCH',
    headers: {
      'authorization': `Bearer ${platformApiToken}`,
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  })
  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()
    throw new Error(`Failed to update PostgREST config: ${updateResponse.status} - ${errorText}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const { headers } = getCorsHeaders(req)
    return new Response('ok', { headers })
  }
  try {
    console.log('OAuth token endpoint called')
    const { headers, allowed } = getCorsHeaders(req)
    const respond = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
    if (!allowed) return respond(403, { error: 'origin_not_allowed', message: 'Origin is not in ALLOWED_ORIGINS', origin: req.headers.get('origin') || null })

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
    if (!contentType.includes('application/json')) {
      return respond(400, { error: 'invalid_request', message: 'Content-Type must be application/json' })
    }

    // No apikey header check; rely on CORS + parameter validation
    const body = await req.json()

    console.log('Request body:', body)

    const grant_type = body.grant_type

    if (grant_type !== 'authorization_code') {
      console.log('Unsupported grant type:', grant_type)
      return respond(400, { error: 'unsupported_grant_type', message: 'Only authorization_code is supported', got: grant_type })
    }

    const code = body.code
    const redirect_uri = body.redirect_uri
    const client_id = body.client_id
    const code_verifier = body.code_verifier

    // Parameter presence validation
    const missing: string[] = []
    if (!code) missing.push('code')
    if (!redirect_uri) missing.push('redirect_uri')
    if (!client_id) missing.push('client_id')
    if (!code_verifier) missing.push('code_verifier')
    if (missing.length) {
      return respond(400, { error: 'invalid_request', message: 'Missing required parameters', missing })
    }

    console.log('Token exchange params:', { code: code?.substring(0, 10) + '...', redirect_uri, client_id, code_verifier: code_verifier?.substring(0, 10) + '...' })

    if (!code || !redirect_uri || !client_id) {
      console.log('Missing required parameters')
      return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } })
    }

    // Client validation will be done against the authorization code's stored redirect_uri
    // rather than requiring pre-registered clients (dynamic registration)

    console.log('Querying authorization code...')
    const { data: authCode, error: codeError } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', code)
      .single()

    console.log('Auth code query result:', { data: authCode, error: codeError })

    if (codeError || !authCode) {
      console.log('Authorization code not found or error:', codeError)
      return respond(400, {
        error: 'invalid_grant',
        message: 'Authorization code not found',
        details: { codeError: codeError?.message || null, code_prefix: String(code || '').slice(0, 10) }
      })
    }

    if (new Date(authCode.expires_at).getTime() < Date.now()) {
      return respond(400, {
        error: 'invalid_grant',
        message: 'Authorization code expired',
        details: { expires_at: authCode.expires_at, now: new Date().toISOString() }
      })
    }

    console.log('Comparing redirect URIs:')
    console.log('Stored redirect_uri:', authCode.redirect_uri)
    console.log('Request redirect_uri:', redirect_uri)
    console.log('Comparing client_ids:')
    console.log('Stored client_id:', authCode.client_id)
    console.log('Request client_id:', client_id)

    if (authCode.redirect_uri !== redirect_uri || authCode.client_id !== client_id) {
      console.log('Redirect URI or client ID mismatch!')
      return new Response(JSON.stringify({
        error: 'invalid_grant',
        message: 'Redirect URI or client ID mismatch',
        details: {
          stored_redirect_uri: authCode.redirect_uri,
          request_redirect_uri: redirect_uri,
          stored_client_id: authCode.client_id,
          request_client_id: client_id
        }
      }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } })
    }

    console.log('Redirect URI and client ID validation passed')

    // If PKCE was used, verify code verifier
    if (authCode.code_challenge) {
      if (!code_verifier) {
        return new Response(JSON.stringify({
          error: 'invalid_request',
          message: 'Code verifier required for PKCE'
        }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } })
      }

      const algo = authCode.code_challenge_method === 'S256' ? 'SHA-256' : null
      if (algo) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier))
        const base64 = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        if (base64 !== authCode.code_challenge) {
      return respond(400, {
        error: 'invalid_grant',
        message: 'PKCE verification failed',
        details: { expected: authCode.code_challenge, computed: base64, method: 'S256' }
      })
        }
      } else {
        if (code_verifier !== authCode.code_challenge) {
          return respond(400, {
            error: 'invalid_grant',
            message: 'PKCE verification failed (plain)',
            details: { expected: authCode.code_challenge }
          })
        }
      }
    }

    // With a valid code + PKCE, return Supakey (provider) tokens for Hasu to authenticate to Supakey.
    // Tokens were stored at consent time by the frontend authorize page.

    const supakeyAccessToken = (authCode as any).supakey_access_token
    const supakeyRefreshToken = (authCode as any).supakey_refresh_token

    if (!supakeyAccessToken || !supakeyRefreshToken) {
      return respond(500, {
        error: 'server_error',
        message: 'Authorization code missing provider tokens. Please re-authorize.',
        reason: 'missing_supakey_tokens'
      })
    }

    // Delete code after use
    await supabase.from('oauth_authorization_codes').delete().eq('code', code)

    return respond(200, {
      access_token: supakeyAccessToken,
      refresh_token: supakeyRefreshToken,
      token_type: 'bearer',
      // Informational fields
      scope: authCode.scope,
      user_id: authCode.user_id
    })
  } catch (e) {
    const { headers } = getCorsHeaders(req)
    return new Response(JSON.stringify({ error: 'server_error', message: 'Unexpected error', details: (e as Error)?.message || null }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } })
  }
})

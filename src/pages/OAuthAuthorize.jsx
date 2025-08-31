import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'supakey' }
})

export function OAuthAuthorize() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [authorizing, setAuthorizing] = useState(false)
  const [error, setError] = useState('')
  const [client, setClient] = useState(null)
  const [showConsent, setShowConsent] = useState(false)

  // Extract OAuth parameters
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const responseType = searchParams.get('response_type')
  const state = searchParams.get('state')
  const scope = searchParams.get('scope')
  const codeChallenge = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method')
  const appIdentifier = searchParams.get('app_identifier')

  useEffect(() => {
    // Validate required OAuth parameters
    if (!clientId || !redirectUri || !responseType || !codeChallenge) {
      setError('Missing required OAuth parameters')
      return
    }

    if (responseType !== 'code') {
      setError('Unsupported response type')
      return
    }

    if (codeChallengeMethod !== 'S256') {
      setError('Unsupported code challenge method')
      return
    }

    // Check consent and client when user is authenticated
    if (user && !loading && !authorizing && !showConsent && !client) {
      checkClientAndConsent()
    }
  }, [user, loading, clientId, redirectUri, responseType, codeChallenge, codeChallengeMethod, showConsent, client])

  const checkClientAndConsent = async () => {
    try {
      // Check if user has complete connection details first
      const { data: connectionDataArray } = await supabase
        .from('user_connections')
        .select('supabase_url, supabase_anon_key, supabase_secret_key, personal_access_token')
        .eq('user_id', user.id)
      
      const connectionData = connectionDataArray?.[0] || null
      
      // Check if all required fields are present and not empty
      const hasCompleteConnection = connectionData && 
        connectionData.supabase_url && 
        connectionData.supabase_anon_key && 
        connectionData.supabase_secret_key && 
        connectionData.personal_access_token
      
      if (!hasCompleteConnection) {
        // Store OAuth parameters and redirect to profile setup
        sessionStorage.setItem('oauth_params', JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          state,
          scope,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          app_identifier: appIdentifier
        }))
        
        navigate('/', { 
          state: { 
            message: 'Please complete your connection settings before authorizing applications.' 
          }
        })
        return
      }
      
      // First, register the client if it doesn't exist and get client info
      await registerClientIfNeeded()
      
      // Get client information
      const { data: clientData } = await supabase
        .from('oauth_clients')
        .select('client_id, client_name, app_identifier')
        .eq('client_id', clientId)
        .single()
      
      if (clientData) {
        setClient(clientData)
      }

      // Check if user has already consented
      const { data: existingConsent } = await supabase
        .from('oauth_consents')
        .select('id')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .single()

      if (existingConsent) {
        // User has already consented, proceed with authorization
        handleAuthorize()
      } else {
        // Show consent screen
        setShowConsent(true)
      }
    } catch (err) {
      console.error('Error checking consent:', err)
      setError(err.message)
    }
  }

  const handleAuthorize = async () => {
    if (authorizing) return

    setAuthorizing(true)
    setError('')

    try {
      console.log('Starting OAuth authorization with:', {
        clientId,
        redirectUri,
        appIdentifier,
        codeChallenge: codeChallenge?.substring(0, 20) + '...',
        codeChallengeMethod
      })

      // Save consent if this is a new consent
      if (showConsent) {
        console.log('Saving consent for user:', user.id)
        await supabase.from('oauth_consents').insert({
          user_id: user.id,
          client_id: clientId,
          scope: scope || 'default'
        })
      }

      // Generate authorization code
      const authCode = generateAuthCode()
      console.log('Generated auth code:', authCode?.substring(0, 10) + '...')

      // Get current Supakey session tokens to return later from oauth-token
      const { data: sessionData } = await supabase.auth.getSession()
      const supakeyAccessToken = sessionData?.session?.access_token || null
      const supakeyRefreshToken = sessionData?.session?.refresh_token || null

      // Store authorization details for later token exchange (including Supakey tokens)
      const authData = {
        code: authCode,
        user_id: user.id,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        app_identifier: appIdentifier,
        scope: scope || 'default',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        // New fields to support returning Supakey tokens at token exchange step
        supakey_access_token: supakeyAccessToken,
        supakey_refresh_token: supakeyRefreshToken
      }

      console.log('Storing authorization data:', {
        ...authData,
        code: authData.code?.substring(0, 10) + '...'
      })

      // Store in database for token exchange
      const { error: insertError } = await supabase
        .from('oauth_authorization_codes')
        .insert([authData])

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw new Error(`Failed to store authorization code: ${insertError.message}`)
      }

      console.log('Successfully stored authorization code')

      // Verify the code was stored by querying it back
      const { data: verifyCode } = await supabase
        .from('oauth_authorization_codes')
        .select('code, expires_at, client_id, redirect_uri')
        .eq('code', authCode)
        .single()

      console.log('Verification - code stored:', verifyCode)

      // Redirect back to client with authorization code
      const redirectUrl = new URL(redirectUri)
      redirectUrl.searchParams.set('code', authCode)
      if (state) {
        redirectUrl.searchParams.set('state', state)
      }

      const finalRedirectUrl = redirectUrl.toString()
      console.log('Redirecting to:', finalRedirectUrl)

      window.location.href = finalRedirectUrl
    } catch (err) {
      console.error('OAuth authorization error:', err)
      setError(err.message)
      setAuthorizing(false)
    }
  }

  const registerClientIfNeeded = async () => {
    // Check if client already exists
    const { data: existingClient } = await supabase
      .from('oauth_clients')
      .select('client_id')
      .eq('client_id', clientId)
      .single()

    if (existingClient) {
      return // Client already exists
    }

    // Register new client
    const { error: insertError } = await supabase
      .from('oauth_clients')
      .insert([{
        client_id: clientId,
        client_name: appIdentifier || clientId,
        redirect_uri: redirectUri,
        app_identifier: appIdentifier
      }])

    if (insertError) {
      throw new Error(`Failed to register client: ${insertError.message}`)
    }
  }
  

  const generateAuthCode = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array).map(b => ('0' + b.toString(16)).slice(-2)).join('')
  }

  const handleLogin = () => {
    // Store OAuth parameters in session storage to resume after login
    const paramsObj = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      state,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      app_identifier: appIdentifier
    }
    sessionStorage.setItem('oauth_params', JSON.stringify(paramsObj))
    // Also forward params via URL so redirect works even if sessionStorage is blocked
    const qs = new URLSearchParams(paramsObj).toString()
    navigate(`/login?${qs}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Authorization Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authorization Required</h2>
            <p className="text-gray-600 mb-2">
              <strong>{appIdentifier || clientId}</strong> would like to access your Supakey account.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You need to sign in to authorize this application.
            </p>
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In to Authorize
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (authorizing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Authorizing...</p>
        </div>
      </div>
    )
  }

     // Show consent screen if needed
   if (showConsent && client) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <div className="max-w-md mx-auto text-center">
           <div className="bg-white shadow-lg rounded-lg p-8">
             <h2 className="text-2xl font-bold text-gray-900 mb-4">Authorize {client.client_name || client.app_identifier}</h2>
             <p className="text-gray-600 mb-2">
               <strong>{client.app_identifier || client.client_id}</strong> would like to access your Supakey account.
             </p>
             <p className="text-sm text-gray-500 mb-6">
               This will allow the application to manage your databases and applications on your behalf.
             </p>
             <div className="space-y-3">
               <button
                 onClick={handleAuthorize}
                 disabled={authorizing}
                 className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
               >
                 {authorizing ? 'Authorizing...' : 'Allow Access'}
               </button>
               <button
                 onClick={() => window.history.back()}
                 disabled={authorizing}
                 className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       </div>
     )
   }

   // Loading state while checking consent
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="text-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
         <p className="mt-4 text-gray-500">Checking authorization...</p>
       </div>
     </div>
   )
}

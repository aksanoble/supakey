import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import { Profile } from './pages/Profile.jsx'
import { Landing } from './pages/Landing.jsx'
import { OAuthAuthorize } from './pages/OAuthAuthorize.jsx'
import { HowItWorks } from './pages/HowItWorks.jsx'
import { Nav } from './components/Nav.jsx'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { supabase } from './lib/supabaseClient'
import { getStoredOAuthParams, clearOAuthParams, storeOAuthParams } from './lib/oauthParams'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <BrowserRouter>
          <Routes>
            {/* Root gate: show settings if signed in, otherwise landing */}
            <Route path="/" element={<HomeGate />} />
            {/* Sign-in handled on Landing; no separate /login */}
            <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  )
}

function HomeGate() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // When signed in at '/', forward OAuth flows automatically
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const hasOAuthParams = params.get('client_id') && params.get('redirect_uri') && params.get('response_type') === 'code'

    // Debug logging
    console.log('HomeGate effect:', {
      loading,
      hasUser: !!user,
      hasOAuthParams,
      searchParams: location.search,
      clientId: params.get('client_id'),
      redirectUri: params.get('redirect_uri'),
      responseType: params.get('response_type')
    })

    // If we have OAuth params, handle based on auth state
    if (hasOAuthParams) {
      if (loading) {
        console.log('OAuth params detected but still loading auth, waiting...')
        return
      }

      if (!user) {
        console.log('OAuth params detected but user not authenticated, storing params and staying on landing')
        storeOAuthParams(Object.fromEntries(params.entries()))
        return // Stay on landing page to let user authenticate
      }

      console.log('OAuth params detected and user authenticated, redirecting to /oauth/authorize')
      storeOAuthParams(Object.fromEntries(params.entries()))
      navigate(`/oauth/authorize?${params.toString()}`)
      return
    }

    // Only check stored params and other logic after user is loaded
    if (loading || !user) return

    const stored = getStoredOAuthParams()
    if (stored) {
      console.log('Stored OAuth params found, redirecting to /oauth/authorize')
      clearOAuthParams()
      const p = new URLSearchParams(stored)
      navigate(`/oauth/authorize?${p.toString()}`)
      return
    }

    // Handle return_url bounce (app wants Supakey session tokens)
    const returnUrl = params.get('return_url')
    const appIdentifier = params.get('app_identifier')
    if (returnUrl && appIdentifier) {
      ;(async () => {
        try {
          const { data } = await supabase.auth.getSession()
          const session = data?.session
          if (session) {
            const redirectUrl = new URL(returnUrl)
            redirectUrl.searchParams.set('access_token', session.access_token)
            redirectUrl.searchParams.set('refresh_token', session.refresh_token)
            window.location.href = redirectUrl.toString()
          }
        } catch (e) {
          console.warn('Post-login app redirect failed:', e?.message || e)
        }
      })()
    }
  }, [loading, user, location.search, navigate])

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

  // If not signed in, show the public landing
  if (!user) return <Landing />

  // If signed in, show settings (Profile) with header
  return (
    <div>
      <Nav />
      <Profile />
    </div>
  )
}

export default App

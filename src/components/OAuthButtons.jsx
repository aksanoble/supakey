import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function OAuthButtons({ className = '' }) {
  const { signInWithProvider } = useAuth()
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const onOAuth = async (provider) => {
    setLoading(true)
    try {
      const qs = searchParams.toString()
      const redirectTo = `${window.location.origin}${location.pathname}${qs ? `?${qs}` : ''}`
      const scopes = provider === 'github' ? 'read:user user:email' : undefined
      const { error } = await signInWithProvider({ provider, redirectTo, scopes })
      if (error) throw error
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.message || 'OAuth sign-in failed')
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        type="button"
        onClick={() => onOAuth('google')}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.982 31.91 29.427 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.312 0 6.331 1.239 8.611 3.289l5.657-5.657C34.556 3.053 29.513 1 24 1 10.745 1 0 11.745 0 25s10.745 24 24 24 24-10.745 24-24c0-1.627-.167-3.217-.389-4.917z"/>
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.146 18.994 13 24 13c3.312 0 6.331 1.239 8.611 3.289l5.657-5.657C34.556 3.053 29.513 1 24 1 15.317 1 7.986 5.561 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 49c5.356 0 10.243-1.997 13.981-5.289l-6.457-5.451C29.288 39.246 26.774 40 24 40c-5.384 0-9.926-3.444-11.571-8.241l-6.54 5.036C7.545 43.303 15.171 49 24 49z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.03 3.081-3.393 5.511-6.322 6.76l-.001-.001 6.457 5.451C32.961 41.205 40 37 40 25c0-1.717-.203-3.368-.389-4.917z"/>
        </svg>
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => onOAuth('github')}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-800" aria-hidden="true">
          <path fillRule="evenodd" d="M12 .5C5.648.5.5 5.648.5 12A11.5 11.5 0 008.34 23.29c.61.113.84-.265.84-.59 0-.292-.01-1.064-.017-2.09-3.4.738-4.118-1.64-4.118-1.64-.555-1.41-1.356-1.785-1.356-1.785-1.11-.758.084-.743.084-.743 1.227.086 1.872 1.26 1.872 1.26 1.09 1.868 2.863 1.33 3.56 1.017.11-.79.427-1.33.776-1.636-2.716-.31-5.57-1.36-5.57-6.054 0-1.337.477-2.43 1.26-3.286-.126-.31-.546-1.56.12-3.252 0 0 1.03-.33 3.376 1.254a11.74 11.74 0 016.144 0C16.057 3.67 17.087 4 17.087 4c.666 1.692.246 2.942.12 3.252.784.856 1.26 1.95 1.26 3.286 0 4.705-2.857 5.742-5.582 6.046.439.378.83 1.12.83 2.258 0 1.63-.015 2.944-.015 3.345 0 .328.222.71.847.588A11.5 11.5 0 0023.5 12C23.5 5.648 18.352.5 12 .5z" clipRule="evenodd" />
        </svg>
        Continue with GitHub
      </button>
    </div>
  )
}


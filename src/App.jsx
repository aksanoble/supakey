import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { Profile } from './pages/Profile.jsx'
import { Landing } from './pages/Landing.jsx'
import { Login } from './pages/Login.jsx'
import { OAuthAuthorize } from './pages/OAuthAuthorize.jsx'
import { HowItWorks } from './pages/HowItWorks.jsx'
import { Nav } from './components/Nav.jsx'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <BrowserRouter>
          <Routes>
            {/* Root gate: show settings if signed in, otherwise landing */}
            <Route path="/" element={<HomeGate />} />
            <Route path="/login" element={<Login />} />
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

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import { Dashboard } from './pages/Dashboard.jsx'
import { Profile } from './pages/Profile.jsx'
import { Applications } from './pages/Applications.jsx'
import { AppDetail } from './pages/AppDetail.jsx'
import { Landing } from './pages/Landing.jsx'
import { Nav } from './components/Nav.jsx'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Landing />} />
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="applications" element={<Applications />} />
              <Route path="applications/:appId" element={<AppDetail />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  )
}

function ProtectedRoute() {
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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <Nav />
      <Outlet />
    </div>
  )
}

export default App

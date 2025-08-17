import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import { Dashboard } from './pages/Dashboard.jsx'
import { Profile } from './pages/Profile.jsx'
import { Applications } from './pages/Applications.jsx'
import { AppDetail } from './pages/AppDetail.jsx'
import { Login } from './pages/Login.jsx'
import { Nav } from './components/Nav.jsx'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient.js'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/:appId" element={<AppDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App

function ProtectedLayout() {
	const [loading, setLoading] = useState(true)
	const [isAuthed, setIsAuthed] = useState(false)

	useEffect(() => {
		async function init() {
			const { data: { session } } = await supabase.auth.getSession()
			setIsAuthed(Boolean(session))
			setLoading(false)
		}
		init()
		const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
			setIsAuthed(Boolean(session))
		})
		return () => sub.subscription.unsubscribe()
	}, [])

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
	if (!isAuthed) {
		return <Navigate to="/login" replace />
	}

	return (
		<div>
			<Nav />
			<Outlet />
		</div>
	)
}

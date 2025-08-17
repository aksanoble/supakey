import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function Nav() {
	const [user, setUser] = useState(null)
	const navigate = useNavigate()

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
		const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
			setUser(session?.user || null)
		})
		return () => { sub.subscription.unsubscribe() }
	}, [])

	async function signOut() {
		await supabase.auth.signOut()
		navigate('/login')
	}

	return (
		<nav className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center space-x-8">
						<Link to="/dashboard" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
							Dashboard
						</Link>
						<Link to="/profile" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
							Profile
						</Link>
						<Link to="/applications" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
							Applications
						</Link>
					</div>
					<div className="flex items-center">
						{user ? (
							<button 
								onClick={signOut}
								className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
							>
								Sign out
							</button>
						) : (
							<Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
								Sign in
							</Link>
						)}
					</div>
				</div>
			</div>
		</nav>
	)
}

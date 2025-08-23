import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function Nav() {
	const { user, signOut } = useAuth()

	const handleSignOut = async () => {
		await signOut()
	}

	return (
		<nav className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center space-x-8">
						<Link to="/" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
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
								onClick={handleSignOut}
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

import { Link } from 'react-router-dom'

export function Dashboard() {
	return (
		<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
			<div className="px-4 py-6 sm:px-0">
				<div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
					<div className="text-center">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">Supakey</h1>
						<p className="text-lg text-gray-600 mb-8">
							Welcome to Supakey. Manage your user connection settings and applications.
						</p>
						<div className="flex justify-center space-x-4">
							<Link 
								to="/profile"
								className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
							>
								Manage Profile
							</Link>
							<Link 
								to="/applications"
								className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
							>
								View Applications
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

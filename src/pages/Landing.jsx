import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function Landing() {
	const [form, setForm] = useState({
		email: '',
		password: ''
	})
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()
	const { user, signIn } = useAuth()

	// Redirect if already authenticated
	useEffect(() => {
		if (user) {
			navigate('/')
		}
	}, [user, navigate])

	async function onSubmit(e) {
		e.preventDefault()
		setLoading(true)
		setMessage('')
		
		const { data, error } = await signIn(form.email, form.password)
		
		if (error) {
			setMessage(`Error: ${error.message}`)
		} else if (data.user) {
			setMessage('Sign in successful! Redirecting to dashboard...')
			navigate('/')
		} else {
			setMessage('Error: No user data returned from authentication')
		}
		
		setLoading(false)
	}

	return (
		<div className="min-h-screen bg-gray-50 flex">
			{/* Left side - Landing content */}
			<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-center px-12">
				<div className="max-w-md mx-auto text-white">
					<div className="mb-8">
						<h1 className="text-5xl font-bold mb-4">
							Supakey
						</h1>
						<p className="text-2xl font-semibold mb-2">
							Self hosting made simple.
						</p>
						<p className="text-xl font-medium mb-4">
							Your data belongs to you.
						</p>
						<p className="text-xl font-medium">
							Apps are just views.
						</p>
					</div>
					
					<div className="space-y-4 text-blue-100">
						<div className="flex items-center">
							<svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span>Full control over your data</span>
						</div>
						<div className="flex items-center">
							<svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span>Modern, responsive interfaces</span>
						</div>
						<div className="flex items-center">
							<svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span>Simple deployment and management</span>
						</div>
					</div>
				</div>
			</div>

			{/* Right side - Sign in form */}
			<div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
				<div className="sm:mx-auto sm:w-full sm:max-w-md">
					<div className="flex justify-center mb-6">
						<div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
							</svg>
						</div>
					</div>
					<h2 className="text-center text-3xl font-extrabold text-gray-900">
						Sign in to your account
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Welcome back to Supakey
					</p>
				</div>

				<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
					<div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
						<form className="space-y-6" onSubmit={onSubmit}>
							<div>
								<label htmlFor="email" className="block text-sm font-medium text-gray-700">
									Email address
								</label>
								<div className="mt-1">
									<input
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										required
										value={form.email}
										onChange={(e) => setForm({ ...form, email: e.target.value })}
										className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="Enter your email"
									/>
								</div>
							</div>

							<div>
								<label htmlFor="password" className="block text-sm font-medium text-gray-700">
									Password
								</label>
								<div className="mt-1">
									<input
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										required
										value={form.password}
										onChange={(e) => setForm({ ...form, password: e.target.value })}
										className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="Enter your password"
									/>
								</div>
							</div>

							<div>
								<button
									type="submit"
									disabled={loading || !form.email || !form.password}
									className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{loading ? (
										<div className="flex items-center">
											<svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Signing in...
										</div>
									) : (
										'Sign in'
									)}
								</button>
							</div>
						</form>

						{message && (
							<div className={`mt-6 p-4 rounded-md ${
								message.includes('successful') || message.includes('created') || message.includes('verify')
									? 'bg-green-50 border border-green-200' 
									: 'bg-red-50 border border-red-200'
							}`}>
								<div className="flex">
									<div className="flex-shrink-0">
										{message.includes('successful') || message.includes('created') || message.includes('verify') ? (
											<svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
												<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
											</svg>
										) : (
											<svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
												<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
											</svg>
										)}
									</div>
									<div className="ml-3">
										<p className={`text-sm ${
											message.includes('successful') || message.includes('created') || message.includes('verify')
												? 'text-green-800' 
												: 'text-red-800'
											}`}>
											{message}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

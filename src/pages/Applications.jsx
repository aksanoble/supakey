import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function Applications() {
	const [apps, setApps] = useState([])
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [form, setForm] = useState({
		name: '',
		app_schema: '',
		email: '',
		password: '',
	})

	useEffect(() => {
		let isMounted = true
		async function load() {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) return
			const { data, error } = await supabase
				.from('applications')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
			if (!isMounted) return
			if (error) setMessage(error.message)
			else setApps(data || [])
		}
		load()
		return () => { isMounted = false }
	}, [])

	async function onCreate(e) {
		e.preventDefault()
		setLoading(true)
		setMessage('')
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			setMessage('Not signed in')
			setLoading(false)
			return
		}
		const payload = {
			user_id: user.id,
			name: form.name,
			app_schema: form.app_schema || null,
			email: form.email || null,
			password: form.password || null,
		}
		const { data, error } = await supabase.from('applications').insert(payload).select('*').single()
		setLoading(false)
		if (error) setMessage(error.message)
		else {
			setApps((prev) => [data, ...prev])
			setForm({ name: '', app_schema: '', email: '', password: '' })
		}
	}

	return (
		<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
			<div className="px-4 py-6 sm:px-0">
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h2 className="text-lg font-medium text-gray-900 mb-6">Applications</h2>
						<form onSubmit={onCreate} className="space-y-6 mb-8">
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
								<div>
									<label htmlFor="name" className="block text-sm font-medium text-gray-700">
										Application Name
									</label>
									<input
										id="name"
										type="text"
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
										placeholder="my_app"
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									/>
								</div>
								<div>
									<label htmlFor="app_schema" className="block text-sm font-medium text-gray-700">
										Target Schema Name
									</label>
									<input
										id="app_schema"
										type="text"
										value={form.app_schema}
										onChange={(e) => setForm({ ...form, app_schema: e.target.value })}
										placeholder="my_app_schema"
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									/>
								</div>
								<div>
									<label htmlFor="email" className="block text-sm font-medium text-gray-700">
										App Email (auth within app)
									</label>
									<input
										id="email"
										type="email"
										value={form.email}
										onChange={(e) => setForm({ ...form, email: e.target.value })}
										placeholder="app@example.com"
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									/>
								</div>
								<div>
									<label htmlFor="password" className="block text-sm font-medium text-gray-700">
										App Password
									</label>
									<input
										id="password"
										type="password"
										value={form.password}
										onChange={(e) => setForm({ ...form, password: e.target.value })}
										placeholder="Enter a strong password"
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									/>
								</div>
							</div>
							<div className="flex justify-end">
								<button
									type="submit"
									disabled={loading}
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{loading ? 'Creating...' : 'Create Application'}
								</button>
							</div>
						</form>

						<div>
							<h3 className="text-lg font-medium text-gray-900 mb-4">Your Applications</h3>
							{apps.length === 0 ? (
								<p className="text-gray-500">No applications yet.</p>
							) : (
								<ul className="divide-y divide-gray-200">
									{apps.map((app) => (
										<li key={app.id} className="py-4">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm font-medium text-gray-900">{app.name}</p>
													<p className="text-sm text-gray-500">Schema: {app.app_schema || 'Not set'}</p>
												</div>
												<Link to={`/applications/${app.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
													View details
												</Link>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function Profile() {
	const [form, setForm] = useState({
		postgres_url: '',
		supabase_url: '',
		supabase_anon_key: '',
		supabase_secret_key: '',
		personal_access_token: '',
	})
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		let isMounted = true
		async function load() {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) return
			const { data, error } = await supabase
				.from('user_connections')
				.select('*')
				.eq('user_id', user.id)
				.single()
			if (!isMounted) return
			if (error && error.code !== 'PGRST116') {
				setMessage(error.message)
			} else if (data) {
				setForm({
					postgres_url: data.postgres_url || '',
					supabase_url: data.supabase_url || '',
					supabase_anon_key: data.supabase_anon_key || '',
					supabase_secret_key: data.supabase_secret_key || '',
					personal_access_token: data.personal_access_token || '',
				})
			}
		}
		load()
		return () => { isMounted = false }
	}, [])

	async function onSubmit(e) {
		e.preventDefault()
		setLoading(true)
		setMessage('')
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			setMessage('Not signed in')
			setLoading(false)
			return
		}
		const upsertPayload = {
			user_id: user.id,
			postgres_url: form.postgres_url || null,
			supabase_url: form.supabase_url || null,
			supabase_anon_key: form.supabase_anon_key || null,
			supabase_secret_key: form.supabase_secret_key || null,
			personal_access_token: form.personal_access_token || null,
		}
		const { error } = await supabase.from('user_connections').upsert(upsertPayload, { onConflict: 'user_id' })
		setLoading(false)
		if (error) setMessage(error.message)
		else setMessage('Settings saved successfully')
	}

	return (
		<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
			<div className="px-4 py-6 sm:px-0">
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h2 className="text-lg font-medium text-gray-900 mb-6">User Connection Settings</h2>
						<form onSubmit={onSubmit} className="space-y-6">
							<div>
								<label htmlFor="postgres_url" className="block text-sm font-medium text-gray-700">
									Postgres URL (user-level)
								</label>
								<input
									id="postgres_url"
									type="text"
									value={form.postgres_url}
									onChange={(e) => setForm({ ...form, postgres_url: e.target.value })}
									placeholder="postgresql://user:pass@host:5432/db"
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
							<div>
								<label htmlFor="supabase_url" className="block text-sm font-medium text-gray-700">
									Supabase URL (user-level)
								</label>
								<input
									id="supabase_url"
									type="text"
									value={form.supabase_url}
									onChange={(e) => setForm({ ...form, supabase_url: e.target.value })}
									placeholder="https://xyzcompany.supabase.co"
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
							<div>
								<label htmlFor="supabase_anon_key" className="block text-sm font-medium text-gray-700">
									Supabase Anon Key (user-level)
								</label>
								<input
									id="supabase_anon_key"
									type="password"
									value={form.supabase_anon_key}
									onChange={(e) => setForm({ ...form, supabase_anon_key: e.target.value })}
									placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
								<p className="mt-1 text-xs text-gray-500">The public anon key for your Supabase project</p>
							</div>
							<div>
								<label htmlFor="supabase_secret_key" className="block text-sm font-medium text-gray-700">
									Supabase Secret Key (user-level)
								</label>
								<input
									id="supabase_secret_key"
									type="password"
									value={form.supabase_secret_key}
									onChange={(e) => setForm({ ...form, supabase_secret_key: e.target.value })}
									placeholder="sb_secret_xxxxxxxxxxxx"
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
							<div>
								<label htmlFor="personal_access_token" className="block text-sm font-medium text-gray-700">
									Personal Access Token (for Platform API)
								</label>
								<input
									id="personal_access_token"
									type="password"
									value={form.personal_access_token}
									onChange={(e) => setForm({ ...form, personal_access_token: e.target.value })}
									placeholder="sbp_xxxxxxxxxxxx"
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
								<p className="mt-1 text-xs text-gray-500">Used to configure PostgREST schemas via Supabase Platform API</p>
							</div>
							<div>
								<button
									type="submit"
									disabled={loading}
									className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{loading ? 'Saving...' : 'Save Settings'}
								</button>
							</div>
						</form>
						{message && (
							<div className={`mt-4 p-4 rounded-md text-sm ${
								message.includes('saved successfully') 
									? 'bg-green-50 text-green-700 border border-green-200' 
									: 'bg-red-50 text-red-700 border border-red-200'
							}`}>
								{message}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

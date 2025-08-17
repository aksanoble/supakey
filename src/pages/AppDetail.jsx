import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function AppDetail() {
	const { appId } = useParams()
	const [app, setApp] = useState(null)
	const [migrations, setMigrations] = useState([])
	const [runLoading, setRunLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [newMigration, setNewMigration] = useState('')

	const lastRun = useMemo(() => {
		if (!migrations.length) return 'none'
		return migrations[migrations.length - 1]?.name || 'none'
	}, [migrations])

	useEffect(() => {
		let isMounted = true
		async function load() {
			const { data: appData, error: appErr } = await supabase
				.from('applications')
				.select('*')
				.eq('id', appId)
				.single()
			if (!isMounted) return
			if (appErr) setMessage(appErr.message)
			else setApp(appData)

			const { data: migs, error: migErr } = await supabase
				.from('application_migrations')
				.select('*')
				.eq('application_id', appId)
				.order('created_at', { ascending: true })
			if (!isMounted) return
			if (migErr) setMessage(migErr.message)
			else setMigrations(migs || [])
		}
		load()
		return () => { isMounted = false }
	}, [appId])

	async function addMigration(e) {
		e.preventDefault()
		if (!newMigration) return
		const { data, error } = await supabase.from('application_migrations').insert({
			application_id: appId,
			name: newMigration,
		}).select('*').single()
		if (error) setMessage(error.message)
		else {
			setMigrations((prev) => [...prev, data])
			setNewMigration('')
		}
	}

	async function runMigrations() {
		setRunLoading(true)
		setMessage('')
		const { data, error } = await supabase.functions.invoke('run-app-migrations', {
			body: { application_id: appId },
		})
		setRunLoading(false)
		if (error) setMessage(error.message)
		else setMessage(data?.message || 'Migrations triggered')
	}

	return (
		<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
			<div className="px-4 py-6 sm:px-0">
				{app ? (
					<div className="bg-white shadow rounded-lg">
						<div className="px-4 py-5 sm:p-6">
							<div className="mb-6">
								<h2 className="text-lg font-medium text-gray-900 mb-4">Application Details</h2>
								<dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
									<div>
										<dt className="text-sm font-medium text-gray-500">Name</dt>
										<dd className="mt-1 text-sm text-gray-900">{app.name}</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Schema</dt>
										<dd className="mt-1 text-sm text-gray-900">{app.app_schema || 'Not set'}</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">App Email</dt>
										<dd className="mt-1 text-sm text-gray-900">{app.email || 'Not set'}</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Last Run Migration</dt>
										<dd className="mt-1 text-sm text-gray-900">{lastRun}</dd>
									</div>
								</dl>
							</div>

							<div className="border-t border-gray-200 pt-6">
								<h3 className="text-lg font-medium text-gray-900 mb-4">Migrations</h3>
								{app && (
									<div className="mb-6">
										<button
											onClick={runMigrations}
											disabled={runLoading}
											className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{runLoading ? 'Running...' : 'Run Migrations'}
										</button>
									</div>
								)}

								<div className="mb-6">
									<form onSubmit={addMigration} className="flex gap-4">
										<input
											value={newMigration}
											onChange={(e) => setNewMigration(e.target.value)}
											placeholder="YYYYMMDDHHMM_add_table_users.sql"
											className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										/>
										<button
											type="submit"
											disabled={!newMigration}
											className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											Add Migration
										</button>
									</form>
								</div>

								{migrations.length === 0 ? (
									<p className="text-gray-500 text-center py-8">No migrations yet. Add your first migration above.</p>
								) : (
									<div className="bg-white shadow overflow-hidden sm:rounded-md">
										<ul className="divide-y divide-gray-200">
											{migrations.map((migration, index) => (
												<li key={migration.id} className="px-4 py-4 sm:px-6">
													<div className="flex items-center justify-between">
														<div className="flex items-center">
															<div className="flex-shrink-0">
																<div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
																	<span className="text-gray-600 font-medium text-xs">{index + 1}</span>
																</div>
															</div>
															<div className="ml-4">
																<div className="text-sm font-medium text-gray-900">{migration.name}</div>
																<div className="text-sm text-gray-500">
																	Added {new Date(migration.created_at).toLocaleDateString()}
																</div>
															</div>
														</div>
													</div>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
						<p className="mt-4 text-gray-500">Loading application details...</p>
					</div>
				)}
			</div>
			{message && (
				<div className={`mt-4 p-4 rounded-md text-sm ${
					message.includes('triggered') 
						? 'bg-green-50 text-green-700 border border-green-200' 
						: 'bg-red-50 text-red-700 border border-red-200'
				}`}>
					{message}
				</div>
			)}
		</div>
	)
}

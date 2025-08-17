import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
	try {
		const { application_id } = await req.json()
		if (!application_id) {
			return new Response(JSON.stringify({ error: 'application_id required' }), { status: 400 })
		}
		return new Response(JSON.stringify({ message: `Migrations triggered for ${application_id}` }), { status: 200 })
	} catch (e) {
		return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
	}
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeployMigrationsRequest {
  applicationName: string
  migrations: {
    name: string
    sql: string
  }[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Edge function called')
    
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.log('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { persistSession: false },
        db: { schema: 'supakey' }
      }
    )

    console.log('Supabase client initialized')

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.email)

    // Create a new client with the user's session for RLS context
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { persistSession: false },
        db: { schema: 'supakey' },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    const { applicationName, migrations }: DeployMigrationsRequest = await req.json()

    console.log('Request body parsed:', { applicationName, migrationsCount: migrations?.length })

    if (!applicationName || !migrations || !Array.isArray(migrations)) {
      console.log('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: applicationName, migrations' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the application and its database connection
    // First get the user's connection
    console.log('Looking up user connection for user:', user.id)
    const { data: userConnection, error: connError } = await userClient
      .from('user_connections')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (connError || !userConnection) {
      console.log('User connection error:', connError)
      return new Response(
        JSON.stringify({ error: 'No database connection found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user connection:', userConnection.id)

    // Then get the application that uses this connection
    const { data: applications, error: appError } = await userClient
      .from('applications')
      .select(`
        id,
        name,
        user_connection_id,
        user_connections (
          postgres_url,
          supabase_url,
          supabase_service_role
        )
      `)
      .eq('name', applicationName)
      .eq('user_connection_id', userConnection.id)
      .single()

    if (appError || !applications) {
      return new Response(
        JSON.stringify({ error: `Application '${applicationName}' not found or not accessible` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const connection = applications.user_connections
    if (!connection?.postgres_url) {
      return new Response(
        JSON.stringify({ error: 'No database connection found for this application' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deploy migrations using Sqitch-like approach
    const deployedMigrations = []
    const errors = []

    // Create a temporary directory for migrations
    const tempDir = `/tmp/migrations-${Date.now()}`
    await Deno.mkdir(tempDir, { recursive: true })

    try {
      // Connect to the target database
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
      const client = new Client(connection.postgres_url)
      await client.connect()

      // Create sqitch schema and migrations tracking table
      await client.queryObject(`CREATE SCHEMA IF NOT EXISTS sqitch;`)
      
      await client.queryObject(`
        CREATE TABLE IF NOT EXISTS sqitch.changes (
          change_id TEXT PRIMARY KEY,
          script_hash TEXT,
          change TEXT NOT NULL,
          project TEXT NOT NULL DEFAULT 'supakey',
          note TEXT DEFAULT '',
          committed_at TIMESTAMPTZ DEFAULT NOW(),
          committer_name TEXT DEFAULT 'supakey',
          committer_email TEXT DEFAULT 'admin@supakey.app',
          planned_at TIMESTAMPTZ DEFAULT NOW(),
          planner_name TEXT DEFAULT 'supakey',
          planner_email TEXT DEFAULT 'admin@supakey.app'
        );
      `)

      // Deploy each migration
      for (const migration of migrations) {
        try {
          // Check if migration already deployed
          const existingResult = await client.queryObject(
            'SELECT change_id FROM sqitch.changes WHERE change = $1',
            [migration.name]
          )

          if (existingResult.rows.length > 0) {
            console.log(`Migration ${migration.name} already deployed, skipping`)
            continue
          }

          // Execute the migration SQL
          await client.queryObject(migration.sql)

          // Record the migration as deployed
          const changeId = `${migration.name}-${Date.now()}`
          await client.queryObject(
            `INSERT INTO sqitch.changes (change_id, change, script_hash, note)
             VALUES ($1, $2, $3, $4)`,
            [changeId, migration.name, 'manual-deploy', `Deployed via Edge Function`]
          )

          deployedMigrations.push({
            name: migration.name,
            status: 'success',
            changeId
          })

          console.log(`Successfully deployed migration: ${migration.name}`)
        } catch (migrationError) {
          console.error(`Error deploying migration ${migration.name}:`, migrationError)
          errors.push({
            migration: migration.name,
            error: migrationError.message
          })
        }
      }

      await client.end()

      // Update application migrations table
      for (const migration of deployedMigrations) {
        await userClient
          .from('application_migrations')
          .insert({
            application_id: applications.id,
            name: migration.name,
            run_on: new Date().toISOString()
          })
      }

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to target database', 
          details: dbError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } finally {
      // Clean up temp directory
      try {
        await Deno.remove(tempDir, { recursive: true })
      } catch (cleanupError) {
        console.warn('Failed to clean up temp directory:', cleanupError)
      }
    }

    const response = {
      success: true,
      applicationName,
      deployedMigrations,
      errors,
      summary: {
        total: migrations.length,
        deployed: deployedMigrations.length,
        failed: errors.length
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: errors.length > 0 ? 207 : 200, // 207 Multi-Status if some failed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
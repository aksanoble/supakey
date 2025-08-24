import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cryptoRandomString } from 'https://deno.land/x/crypto_random_string@1.1.0/mod.ts'

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

interface AuthResponse {
  jwt: string
  refreshToken: string
  username: string
  applicationId: string
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
    const jwtToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwtToken)
    
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

    // Get the user's connection
    console.log('Looking up user connection for user:', user.id)
    const { data: userConnection, error: connError } = await userClient
      .from('user_connections')
      .select(`
        id,
        postgres_url,
        supabase_url,
        supabase_service_role
      `)
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

    if (!userConnection.postgres_url) {
      return new Response(
        JSON.stringify({ error: 'No database connection found for this application' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if application already exists, if not create it
    let { data: application, error: appError } = await userClient
      .from('applications')
      .select(`
        id,
        name,
        user_connection_id,
        application_account_id,
        application_accounts (
          application_username,
          application_password
        )
      `)
      .eq('name', applicationName)
      .eq('user_connection_id', userConnection.id)
      .single()

    let isNewApplication = false
    
    // If application doesn't exist, create it along with test user credentials
    if (appError && appError.code === 'PGRST116') { // No rows returned
      console.log('Application not found, creating new application:', applicationName)
      isNewApplication = true
      
      // Generate test user credentials
      const username = `app_${applicationName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${cryptoRandomString({length: 8, type: 'alphanumeric'})}`
      const password = cryptoRandomString({length: 16, type: 'alphanumeric'})
      
      // Create application account first (using service role to bypass RLS)
      const { data: newAccount, error: accountError } = await supabaseClient
        .from('application_accounts')
        .insert({
          application_username: username,
          application_password: password
        })
        .select('id')
        .single()
        
      if (accountError || !newAccount) {
        console.log('Error creating application account:', accountError)
        return new Response(
          JSON.stringify({ error: 'Failed to create application account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Create application
      const { data: newApp, error: newAppError } = await userClient
        .from('applications')
        .insert({
          name: applicationName,
          user_connection_id: userConnection.id,
          application_account_id: newAccount.id
        })
        .select('id, name, user_connection_id, application_account_id')
        .single()
        
      if (newAppError || !newApp) {
        console.log('Error creating application:', newAppError)
        return new Response(
          JSON.stringify({ error: 'Failed to create application' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Get the application account details using service role
      const { data: accountDetails, error: accountDetailsError } = await supabaseClient
        .from('application_accounts')
        .select('application_username, application_password')
        .eq('id', newAccount.id)
        .single()
        
      if (accountDetailsError || !accountDetails) {
        console.log('Error fetching account details:', accountDetailsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch account details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Combine the data
      application = {
        ...newApp,
        application_accounts: accountDetails
      }
      console.log('Created new application:', application.id)
      
    } else if (appError) {
      console.log('Application lookup error:', appError)
      return new Response(
        JSON.stringify({ error: 'Error looking up application' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!application?.application_accounts) {
      return new Response(
        JSON.stringify({ error: 'Application account not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { application_username: username, application_password: password } = application.application_accounts

    try {
      // Connect to the target database
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
      const client = new Client(userConnection.postgres_url)
      
      console.log('Attempting to connect to target database...')
      try {
        await client.connect()
        console.log('Successfully connected to target database')
      } catch (connectionError) {
        console.error('Failed to connect to target database:', connectionError)
        throw new Error(`Database connection failed: ${connectionError.message}`)
      }

      // Create dedicated schema for this application
      const schemaName = `app_${applicationName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      
      if (isNewApplication) {
        console.log(`Creating dedicated schema for application: ${schemaName}`)
        
        // Create application-specific schema
        await client.queryObject(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`)
        
        // Create Supabase admin client for target database to create auth user properly
        const targetAdminClient = createClient(
          userConnection.supabase_url, 
          userConnection.supabase_service_role
        )
        
        // Create a real Supabase auth user using admin API
        console.log('Creating real Supabase auth user via admin API')
        
        const userEmail = `${username}@app.local`
        const userPassword = password
        
        // Create user using Supabase admin API
        const { data: newUser, error: createUserError } = await targetAdminClient.auth.admin.createUser({
          email: userEmail,
          password: userPassword,
          email_confirm: true, // Auto-confirm the email
          user_metadata: {
            application: applicationName,
            schema: schemaName
          },
          app_metadata: {
            provider: 'email',
            providers: ['email']
          }
        })
        
        if (createUserError) {
          console.error('Failed to create auth user:', createUserError)
          throw new Error(`Failed to create auth user: ${createUserError.message}`)
        }
        
        const authUserId = newUser.user.id
        console.log(`Auth user created via admin API: ${userEmail}, ID: ${authUserId}`)
        
        // Configure schema for Supabase API access
        try {
          // Grant schema access to the authenticator role (used by PostgREST)
          await client.queryObject(`GRANT USAGE ON SCHEMA ${schemaName} TO authenticator;`)
          
          // Grant schema access to authenticated role (for RLS)
          await client.queryObject(`GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;`)
          
          // Grant table permissions to authenticated role
          await client.queryObject(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;`)
          
          // Set default privileges for future tables in this schema
          await client.queryObject(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON TABLES TO authenticated;`)
          await client.queryObject(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON TABLES TO authenticator;`)
          
          console.log(`Schema ${schemaName} configured for Supabase API access`)
          
        } catch (schemaError) {
          console.log('Schema configuration error:', schemaError.message)
        }
        
        // Update the application records in memory
        application.application_accounts = {
          application_username: userEmail,
          application_password: userPassword  // Store actual password
        }
        
        // Store the auth user email and password in database (keep the auth user ID separate in metadata)
        await supabaseClient
          .from('application_accounts')
          .update({
            application_username: userEmail,  // Use email for auth
            application_password: userPassword  // Store actual password, not auth user ID
          })
          .eq('id', application.application_account_id)
        
        await userClient
          .from('applications')
          .update({ app_schema: schemaName })
          .eq('id', application.id)
        
        console.log(`Auth user created: ${userEmail}, Schema: ${schemaName}`)
        
      } else {
        console.log(`Using existing application schema: ${schemaName}`)
        
        // Get the stored auth user info
        const authUserEmail = application.application_accounts.application_username
        const storedPassword = application.application_accounts.application_password  // This is the actual password
        
        // Create admin client for target database
        const targetAdminClient = createClient(
          userConnection.supabase_url, 
          userConnection.supabase_service_role
        )
        
        // For existing applications, try to sign in to verify the user exists
        try {
          const { data: signInData, error: signInError } = await targetAdminClient.auth.signInWithPassword({
            email: authUserEmail,
            password: storedPassword
          })
          
          if (signInError || !signInData.session) {
            console.log('Auth user sign in failed, may need recreation. Error:', signInError?.message)
            
            // Try to recreate user using admin API
            const { data: recreatedUser, error: recreateError } = await targetAdminClient.auth.admin.createUser({
              email: authUserEmail,
              password: storedPassword,
              email_confirm: true,
              user_metadata: {
                application: applicationName,
                schema: schemaName
              }
            })
            
            if (recreateError) {
              console.log('Failed to recreate auth user:', recreateError.message)
              throw new Error(`Failed to recreate auth user: ${recreateError.message}`)
            }
            
            console.log('Auth user recreated via admin API successfully')
          } else {
            console.log('Auth user verified successfully via sign in')
          }
        } catch (adminError) {
          console.log('Error verifying auth user:', adminError.message)
          throw adminError
        }
      }
      
      // Check if migrations need to be run
      const { data: existingMigrations } = await userClient
        .from('application_migrations')
        .select('name')
        .eq('application_id', application.id)
      
      const existingMigrationNames = new Set(existingMigrations?.map((m: any) => m.name) || [])
      const migrationsToRun = migrations.filter(m => !existingMigrationNames.has(m.name))
      
      if (migrationsToRun.length > 0) {
        console.log(`Running ${migrationsToRun.length} new migrations`)
        
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

        // Set search path to application schema for migrations
        await client.queryObject(`SET search_path TO ${schemaName}, public;`)
        
        // Deploy each new migration to the application schema
        for (const migration of migrationsToRun) {
          try {
            console.log(`Deploying migration ${migration.name} to schema ${schemaName}`)
            // Execute the migration SQL in the application schema
            await client.queryObject(migration.sql)
            
            // After migration, ensure RLS is enabled and policies are set for any new tables
            await client.queryObject(`
              DO $$
              DECLARE
                  table_name text;
              BEGIN
                  FOR table_name IN 
                      SELECT tablename FROM pg_tables WHERE schemaname = '${schemaName}'
                  LOOP
                      -- Enable RLS on the table
                      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', '${schemaName}', table_name);
                      
                      -- Create a permissive policy for authenticated users
                      EXECUTE format('DROP POLICY IF EXISTS "authenticated_access" ON %I.%I', '${schemaName}', table_name);
                      EXECUTE format('CREATE POLICY "authenticated_access" ON %I.%I FOR ALL TO authenticated USING (true)', '${schemaName}', table_name);
                      
                  END LOOP;
              END $$;
            `)
            
            console.log(`RLS policies configured for migration ${migration.name}`)

            // Record the migration as deployed in sqitch
            const changeId = `${migration.name}-${Date.now()}`
            await client.queryObject(
              `INSERT INTO sqitch.changes (change_id, change, script_hash, note)
               VALUES ($1, $2, $3, $4)`,
              [changeId, migration.name, 'manual-deploy', `Deployed via Edge Function`]
            )
            
            // Record in application_migrations table
            await userClient
              .from('application_migrations')
              .insert({
                application_id: application.id,
                name: migration.name
              })

            console.log(`Successfully deployed migration: ${migration.name}`)
          } catch (migrationError) {
            console.error(`Error deploying migration ${migration.name}:`, migrationError)
            throw migrationError
          }
        }
      } else {
        console.log('All migrations already deployed')
      }

      await client.end()

    } catch (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to target database or run migrations', 
          details: dbError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client for the target database to generate real auth tokens
    const targetSupabase = createClient(
      userConnection.supabase_url, 
      userConnection.supabase_service_role
    )
    
    // Get the auth user email and password from the application account
    const authUserEmail = application.application_accounts.application_username
    const storedPassword = application.application_accounts.application_password
    
    console.log(`Generating real Supabase auth tokens for: ${authUserEmail}`)
    
    // Sign in the user to get real Supabase JWT tokens
    const { data: authData, error: signInError } = await targetSupabase.auth.signInWithPassword({
      email: authUserEmail,
      password: storedPassword  // Use the stored password
    })
    
    if (signInError || !authData.session) {
      console.error('Failed to generate auth tokens:', signInError)
      // Fallback to manual token if auth fails
      throw new Error(`Failed to generate auth tokens: ${signInError?.message}`)
    }
    
    const response: AuthResponse = {
      jwt: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      username: authUserEmail,
      applicationId: application.id
    }

    console.log('Authentication successful for application:', applicationName)

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
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
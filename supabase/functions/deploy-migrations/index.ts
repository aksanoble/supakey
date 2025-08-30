import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cryptoRandomString } from 'https://deno.land/x/crypto_random_string@1.1.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeployMigrationsRequest {
  applicationName: string
  appIdentifier: string  // URL like "github.com/aksanoble/hasu"
  migrations?: {
    name: string
    sql: string
  }[]
  migrationsBaseUrl?: string
  migrationsDir?: {
    plan: string
    deploy: { name: string, sql: string }[]
  }
  applicationId?: string
}

interface AuthResponse {
  jwt: string
  refreshToken: string
  username: string
  userId: string
  applicationId: string
  databaseUrl: string
  anonKey: string
}

// Helper function to derive schema name from app identifier
function deriveSchemaName(appIdentifier: string): string {
  // Convert "github.com/aksanoble/hasu" to "github_com_aksanoble_hasu"
  return appIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
}

// Helper function to derive Sqitch registry schema name from app identifier
function deriveSquitchRegistrySchema(appIdentifier: string): string {
  // Convert "github.com/aksanoble/hasu" to "sqitch_github_com_aksanoble_hasu"
  const baseSchema = deriveSchemaName(appIdentifier)
  return `sqitch_${baseSchema}`
}

// Helper function to derive username from app identifier
function deriveUsername(appIdentifier: string): string {
  // Convert "github.com/aksanoble/hasu" to "github_com_aksanoble_hasu_app"
  return `${deriveSchemaName(appIdentifier)}_app`
}

// Helper function to create or update auth user
async function createOrUpdateAuthUser(targetAdminClient: any, userEmail: string, userPassword: string, applicationName: string, schemaName: string) {
  console.log('Creating or updating Supabase auth user via admin API')
  
  // First try to create the user
  const { data: newUser, error: createUserError } = await targetAdminClient.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true,
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
    // If user already exists, try to update their password
    if (createUserError.message.includes('already been registered') || createUserError.message.includes('already exists')) {
      console.log('User already exists, attempting to update password and metadata')
      
      try {
        // Get existing user by email
        const { data: existingUsers, error: listError } = await targetAdminClient.auth.admin.listUsers()
        
        if (listError) {
          throw new Error(`Failed to list users: ${listError.message}`)
        }
        
        const existingUser = existingUsers.users.find((u: any) => u.email === userEmail)
        
        if (existingUser) {
          // Update the existing user's password and metadata
          const { data: updatedUser, error: updateError } = await targetAdminClient.auth.admin.updateUserById(
            existingUser.id,
            {
              password: userPassword,
              user_metadata: {
                application: applicationName,
                schema: schemaName
              }
            }
          )
          
          if (updateError) {
            throw new Error(`Failed to update existing user: ${updateError.message}`)
          }
          
          console.log(`Auth user updated via admin API: ${userEmail}, ID: ${updatedUser.user.id}`)
          return updatedUser.user.id
        } else {
          throw new Error(`User with email ${userEmail} not found`)
        }
      } catch (updateError) {
        console.error('Failed to update existing user:', updateError.message)
        throw new Error(`Failed to handle existing user: ${updateError.message}`)
      }
    } else {
      throw new Error(`Failed to create auth user: ${createUserError.message}`)
    }
  }
  
  console.log(`Auth user created via admin API: ${userEmail}, ID: ${newUser.user.id}`)
  return newUser.user.id
}

// Helper function to update PostgREST configuration with retry logic
async function updatePostgRESTConfigWithRetry(platformApiToken: string, supabaseUrl: string, newSchema: string): Promise<void> {
  try {
    await updatePostgRESTConfig(platformApiToken, supabaseUrl, newSchema)
    console.log('PostgREST configuration updated successfully')
  } catch (error) {
    console.error('PostgREST configuration update failed:', error.message)
    // Don't fail the entire operation, but log the error
  }
}

// Function to update PostgREST configuration via Supabase Platform API
async function updatePostgRESTConfig(platformApiToken: string, supabaseUrl: string, newSchema: string): Promise<void> {
  try {
    // Extract project ID from Supabase URL
    const urlPattern = /https:\/\/([a-zA-Z0-9]+)\.supabase\.co/
    const match = supabaseUrl.match(urlPattern)
    if (!match) {
      throw new Error('Invalid Supabase URL format')
    }
    const projectId = match[1]
    
    console.log(`Updating PostgREST config for project: ${projectId}, adding schema: ${newSchema}`)
    
    // Get current PostgREST configuration using Platform API token
    const getResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/postgrest`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${platformApiToken}`,
        'accept': 'application/json',
        'content-type': 'application/json'
      }
    })
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text()
      console.error(`Platform API GET failed: ${getResponse.status} - ${errorText}`)
      throw new Error(`Failed to get PostgREST config: ${getResponse.status} - ${errorText}`)
    }
    
    const currentConfig = await getResponse.json()
    console.log('Current PostgREST config:', currentConfig)
    
    // Parse current db_schema to add the new schema
    const currentSchemas = currentConfig.db_schema ? currentConfig.db_schema.split(',').map((s: string) => s.trim()) : ['public']
    
    // Add the new schema if it's not already included
    if (!currentSchemas.includes(newSchema)) {
      currentSchemas.push(newSchema)
    } else {
      console.log(`Schema ${newSchema} already included in PostgREST config`)
      return
    }
    
    const updatedSchemas = currentSchemas.join(', ')
    
    // Update the PostgREST configuration
    const updatePayload = {
      db_schema: updatedSchemas,
      max_rows: currentConfig.max_rows || 1000,
      db_extra_search_path: currentConfig.db_extra_search_path || 'public, extensions'
    }
    
    console.log('Updating PostgREST config with payload:', updatePayload)
    
    const updateResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/postgrest`, {
      method: 'PATCH',
      headers: {
        'authorization': `Bearer ${platformApiToken}`,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    })
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error(`Platform API PATCH failed: ${updateResponse.status} - ${errorText}`)
      throw new Error(`Failed to update PostgREST config: ${updateResponse.status} - ${errorText}`)
    }
    
    const updateResult = await updateResponse.json()
    console.log(`Successfully updated PostgREST configuration:`, updateResult)
    
  } catch (error) {
    console.error('Error updating PostgREST config:', error)
    console.warn('Warning: PostgREST config update failed, but schema grants will still be applied')
    // Don't throw - let the function continue with grants
  }
}

// Function to apply grants to make schema available over public API
async function applySchemaGrants(client: any, schemaName: string): Promise<void> {
  try {
    console.log(`Applying grants for schema: ${schemaName}`)
    
    const grantStatements = [
      `GRANT USAGE ON SCHEMA ${schemaName} TO anon, authenticated, service_role;`,
      `GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO anon, authenticated, service_role;`,
      `GRANT ALL ON ALL ROUTINES IN SCHEMA ${schemaName} TO anon, authenticated, service_role;`,
      `GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO anon, authenticated, service_role;`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ${schemaName} GRANT ALL ON TABLES TO anon, authenticated, service_role;`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ${schemaName} GRANT ALL ON ROUTINES TO anon, authenticated, service_role;`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ${schemaName} GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;`
    ]
    
    for (const statement of grantStatements) {
      try {
        await client.queryObject(statement)
        console.log(`Executed grant: ${statement}`)
      } catch (grantError) {
        console.warn(`Warning - Grant statement failed (may be expected): ${statement}`, grantError.message)
        // Don't throw here as some grants might fail if no objects exist yet
      }
    }
    
    console.log(`Successfully applied grants for schema: ${schemaName}`)
    
  } catch (error) {
    console.error('Error applying schema grants:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Edge function called')
    
    // Get the authorization header (optional: we support fallback via applicationId)
    const authHeader = req.headers.get('authorization')

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

    // Try to resolve Supakey user if auth header provided
    let supakeyUser: any | null = null
    if (authHeader) {
      const jwtToken = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwtToken)
      if (!authError && user) {
        supakeyUser = user
        console.log('User authenticated:', user.email)
      } else {
        console.log('Supakey auth not available; will try applicationId fallback if provided')
      }
    }

    // Create a client; include RLS header only if we have Supakey user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { persistSession: false },
        db: { schema: 'supakey' },
        global: supakeyUser && authHeader ? { headers: { Authorization: authHeader } } : undefined
      }
    )

    const { applicationName, appIdentifier, migrations, migrationsBaseUrl, migrationsDir, applicationId }: DeployMigrationsRequest = await req.json()

    console.log('Request body parsed:', { applicationName, appIdentifier, migrationsCount: migrations?.length })

    if (!applicationName || !appIdentifier || (!migrationsBaseUrl && (!migrationsDir || !migrationsDir.plan) && (!migrations || !Array.isArray(migrations)))) {
      console.log('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: applicationName, appIdentifier, migrationsDir.plan or migrationsBaseUrl or migrations[]' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's connection via Supakey user (RLS) or fallback by applicationId (service role)
    let userConnection: any = null
    let connError: any = null
    if (supakeyUser) {
      console.log('Looking up user connection for user:', supakeyUser.id)
      const res = await userClient
        .from('user_connections')
        .select(`
          id,
          postgres_url,
          supabase_url,
          supabase_anon_key,
          supabase_secret_key,
          personal_access_token
        `)
        .eq('user_id', supakeyUser.id)
        .single()
      userConnection = res.data
      connError = res.error
    } else if (applicationId) {
      console.log('Falling back to applicationId lookup for user connection:', applicationId)
      const appRes = await supabaseClient
        .from('applications')
        .select('user_connection_id')
        .eq('id', applicationId)
        .single()
      if (!appRes.error && appRes.data?.user_connection_id) {
        const connRes = await supabaseClient
          .from('user_connections')
          .select('id, postgres_url, supabase_url, supabase_anon_key, supabase_secret_key, personal_access_token')
          .eq('id', appRes.data.user_connection_id)
          .single()
        userConnection = connRes.data
        connError = connRes.error
      } else {
        connError = appRes.error || new Error('Application not found')
      }
    }

    if (connError || !userConnection) {
      console.log('User connection error:', connError)
      return new Response(
        JSON.stringify({ error: 'No database connection found for user/application' }),
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

    // Derive consistent schema and username from app identifier
    const schemaName = deriveSchemaName(appIdentifier)
    const baseUsername = deriveUsername(appIdentifier)
    
    console.log('App identifier:', appIdentifier)
    console.log('Derived schema name:', schemaName)
    console.log('Derived username:', baseUsername)

    // Check if application already exists based on app identifier, if not create it
    let { data: application, error: appError } = supakeyUser
      ? await userClient
      .from('applications')
      .select(`
        id,
        name,
        app_identifier,
        app_schema,
        user_connection_id,
        application_account_id,
        application_accounts (
          application_username,
          application_password
        )
      `)
      .eq('app_identifier', appIdentifier)
      .eq('user_connection_id', userConnection.id)
      .single()
      : await supabaseClient
      .from('applications')
      .select(`
        id,
        name,
        app_identifier,
        app_schema,
        user_connection_id,
        application_account_id,
        application_accounts (
          application_username,
          application_password
        )
      `)
      .eq('app_identifier', appIdentifier)
      .eq('user_connection_id', userConnection.id)
      .single()

    let isNewApplication = false
    
    // If application doesn't exist, create it along with test user credentials
    if (appError && appError.code === 'PGRST116') { // No rows returned
      console.log('Application not found, creating new application for identifier:', appIdentifier)
      isNewApplication = true
      
      // Use consistent username based on app identifier (no random suffix)
      const username = baseUsername
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
      const { data: newApp, error: newAppError } = supakeyUser ? await userClient : await supabaseClient
        .from('applications')
        .insert({
          name: applicationName,
          app_identifier: appIdentifier,
          app_schema: schemaName,
          user_connection_id: userConnection.id,
          application_account_id: newAccount.id
        })
        .select('id, name, app_identifier, app_schema, user_connection_id, application_account_id')
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

      // Use the consistent schema name derived from app identifier
      console.log(`Using schema name: ${schemaName} (derived from ${appIdentifier})`)
      
      if (isNewApplication) {
        console.log(`Setting up new application: ${schemaName}`)
        
        // Create Supabase admin client for target database to create auth user properly
        const targetAdminClient = createClient(
          userConnection.supabase_url, 
          userConnection.supabase_secret_key
        )
        
        // Create auth user
        const userEmail = `${username}@app.local`
        const userPassword = password
        const authUserId = await createOrUpdateAuthUser(targetAdminClient, userEmail, userPassword, applicationName, schemaName)
        
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
        
        // Schema name is already stored in the application record
        
        console.log(`Auth user created: ${userEmail}, Schema: ${schemaName}`)
        
      } else {
        console.log(`Using existing application schema: ${schemaName}`)
        
        // For existing applications, ensure PostgREST config and grants are up to date
        await updatePostgRESTConfigWithRetry(userConnection.personal_access_token, userConnection.supabase_url, schemaName)
        
        try {
          await applySchemaGrants(client, schemaName)
          console.log(`Updated grants for existing schema: ${schemaName}`)
        } catch (grantsError) {
          console.error('Grants update failed for existing schema:', grantsError.message)
        }
        
        // Get the stored auth user info
        const authUserEmail = application.application_accounts.application_username
        const storedPassword = application.application_accounts.application_password  // This is the actual password
        
        // Create admin client for target database
        const targetAdminClient = createClient(
          userConnection.supabase_url, 
          userConnection.supabase_secret_key
        )
        
        // For existing applications, try to sign in to verify the user exists
        try {
          const { data: signInData, error: signInError } = await targetAdminClient.auth.signInWithPassword({
            email: authUserEmail,
            password: storedPassword
          })
          
          if (signInError || !signInData.session) {
            console.log('Auth user sign in failed, may need recreation. Error:', signInError?.message)
            
            // Try to recreate/update user using admin API
            try {
              await createOrUpdateAuthUser(targetAdminClient, authUserEmail, storedPassword, applicationName, schemaName)
              console.log('Auth user recreated/updated successfully')
            } catch (recreateError) {
              console.log('Failed to recreate/update auth user:', recreateError.message)
              throw recreateError
            }
          } else {
            console.log('Auth user verified successfully via sign in')
          }
        } catch (adminError) {
          console.log('Error verifying auth user:', adminError.message)
          throw adminError
        }
      }
      
      // Use app-specific Sqitch schema for tracking migrations
      const squitchSchema = deriveSquitchRegistrySchema(appIdentifier)
      
      // Check if migrations need to be run by querying the app-specific Sqitch schema
      let existingMigrationNames = new Set()
      try {
        const existingMigrationsResult = await client.queryObject(`
          SELECT change FROM ${squitchSchema}.changes 
          WHERE project = $1
        `, [applicationName])
        
        existingMigrationNames = new Set(existingMigrationsResult.rows.map((row: any) => row.change))
      } catch (error) {
        // If Sqitch schema doesn't exist yet, no migrations have been run
        console.log(`Sqitch schema ${squitchSchema} doesn't exist yet, will create it`)
      }
      
      // Build migration list from provided array or fetch from base URL
      let effectiveMigrations = migrations || []
      // Prefer full directory payload if provided to ensure plan order
      if ((!effectiveMigrations || effectiveMigrations.length === 0) && migrationsDir && migrationsDir.deploy?.length) {
        console.log('Using migrationsDir payload (deploy list)')
        effectiveMigrations = migrationsDir.deploy
      }
      if ((!effectiveMigrations || effectiveMigrations.length === 0) && migrationsBaseUrl) {
        console.log('Fetching sqitch.plan from:', migrationsBaseUrl)
        let planResp = await fetch(`${migrationsBaseUrl}/sqitch.plan`)
        if (!planResp.ok && migrationsBaseUrl.includes('raw.githubusercontent.com')) {
          const cdn = migrationsBaseUrl.replace('https://raw.githubusercontent.com/', 'https://cdn.jsdelivr.net/gh/').replace('/main/', '@main/')
          console.log('Raw URL failed, trying CDN:', cdn)
          planResp = await fetch(`${cdn}/sqitch.plan`)
        }
        if (!planResp.ok) {
          throw new Error(`Failed to fetch sqitch.plan: ${planResp.status}`)
        }
        const planText = await planResp.text()
        const names = planText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('%') && !l.startsWith('#'))
          .map(l => l.split(' ')[0])
        const loaded: { name: string, sql: string }[] = []
        for (const name of names) {
          try {
            let resp = await fetch(`${migrationsBaseUrl}/deploy/${name}.sql`)
            if (!resp.ok && migrationsBaseUrl.includes('raw.githubusercontent.com')) {
              const cdn = migrationsBaseUrl.replace('https://raw.githubusercontent.com/', 'https://cdn.jsdelivr.net/gh/').replace('/main/', '@main/')
              resp = await fetch(`${cdn}/deploy/${name}.sql`)
            }
            if (resp.ok) {
              loaded.push({ name, sql: (await resp.text()).trim() })
            } else {
              console.warn('Missing deploy file for migration:', name)
            }
          } catch (e) {
            console.warn('Error fetching migration file:', name, e?.message)
          }
        }
        effectiveMigrations = loaded
        console.log('Loaded migrations from URL:', effectiveMigrations.map(m => m.name))
      }

      const migrationsToRun = effectiveMigrations.filter(m => !existingMigrationNames.has(m.name))
      
      if (migrationsToRun.length > 0) {
        console.log(`Running ${migrationsToRun.length} new migrations`)
        
        // Ensure the application schema exists before running migrations
        console.log(`Ensuring dedicated schema exists: ${schemaName}`)
        await client.queryObject(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`)
        
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
        
          // Update PostgREST configuration and apply grants
          await updatePostgRESTConfigWithRetry(userConnection.personal_access_token, userConnection.supabase_url, schemaName)
          await applySchemaGrants(client, schemaName)
        
        } catch (schemaError) {
          console.error('Schema configuration error:', schemaError.message)
          throw schemaError  // Re-throw to fail the operation if schema setup fails
        }
        
        // Sqitch will create its own schema and tables automatically when migrations run
        // We don't need to manually create the Sqitch tracking tables

        // Set search path to application schema for migrations
        await client.queryObject(`SET search_path TO ${schemaName}, public;`)
        
        // Set current user ID for migrations that need it if available
        if (supakeyUser?.id) {
          await client.queryObject(`SELECT set_config('app.current_user_id', '${supakeyUser.id}', false);`)
        }
        
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

            // Apply grants after each migration to ensure new objects are accessible
            await applySchemaGrants(client, schemaName)

            // Ensure app-specific Sqitch registry exists and record the migration
            const squitchSchema = deriveSquitchRegistrySchema(appIdentifier)
            await client.queryObject(`CREATE SCHEMA IF NOT EXISTS ${squitchSchema};`)
            await client.queryObject(`
              CREATE TABLE IF NOT EXISTS ${squitchSchema}.changes (
                change_id text PRIMARY KEY,
                change text NOT NULL,
                project text NOT NULL,
                script_hash text,
                note text,
                committed_at timestamptz DEFAULT now()
              );
            `)
            const changeId = `${migration.name}-${Date.now()}`
            await client.queryObject(
              `INSERT INTO ${squitchSchema}.changes (change_id, change, project, script_hash, note)
               VALUES ($1, $2, $3, $4, $5)`,
              [changeId, migration.name, applicationName, 'manual-deploy', `Deployed via Edge Function`]
            )

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
      userConnection.supabase_secret_key
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
      userId: authData.session.user.id,
      applicationId: application.id,
      databaseUrl: userConnection.supabase_url,
      anonKey: userConnection.supabase_anon_key
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
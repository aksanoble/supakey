import { Nav } from "../components/Nav.jsx"
import { Link, useSearchParams } from "react-router-dom"
import { useState } from "react"

const sections = [
  { key: 'architecture', label: 'Architecture' },
  { key: 'integration', label: 'Integration' },
  { key: 'apps', label: 'Apps' }
]

export function HowItWorks() {
  const [params, setParams] = useSearchParams()
  const active = params.get('s') || 'architecture'
  const [navOpen, setNavOpen] = useState(false) // collapsed on mobile by default

  const linkFor = (key) => `/how-it-works?s=${key}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-left">How Supakey Works</h1>
            <button
              type="button"
              className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm"
              aria-controls="howitworks-sidebar"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 5.293a1 1 0 011.414 0L10 9.586l4.293-4.293a1 1 0 111.414 1.414L11.414 11l4.293 4.293a1 1 0 01-1.414 1.414L10 12.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 11 4.293 6.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                  Hide
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z"/></svg>
                  Sections
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left nav */}
            <aside id="howitworks-sidebar" className={`md:col-span-3 ${navOpen ? 'block' : 'hidden'} md:block`}>
              <nav className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-3 md:sticky md:top-4">
                <ul className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.key}>
                      <Link
                        to={linkFor(s.key)}
                        onClick={() => { setParams({ s: s.key }); setNavOpen(false) }}
                        className={`block rounded-md px-3 py-2 text-sm ${
                          active === s.key
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-current={active === s.key ? 'page' : undefined}
                      >
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Content */}
            <div className="md:col-span-9">
              {active === 'architecture' && <Architecture />}
              {active === 'integration' && <Integration />}
              {active === 'apps' && <Apps />}
            </div>
          </div>
        </section>
      </main>
      <footer className="py-8 text-center text-sm text-gray-500">© Supakey •
        <a href="mailto:akshay@kanthi.io" aria-label="Email" className="inline-flex items-center justify-center align-middle text-gray-500 hover:text-gray-700 ml-2 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="block">
            <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2v.01L12 13 4 6.01V6h16zM4 18V8.236l8 6.4 8-6.4V18H4z"/>
          </svg>
        </a>
        <a href="https://x.com/aksanoble" target="_blank" rel="noopener" aria-label="X (Twitter)" className="inline-flex items-center justify-center align-middle text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block"><path d="M4 4l16 16M20 4L4 20"/></svg>
        </a>
      </footer>
    </div>
  )
}

function Architecture() {
  return (
    <div>
      <p className="text-gray-600 max-w-3xl text-left">Supakey is the glue between apps and your Supabase. It handles OAuth, deploys app schemas securely, and issues app‑scoped user tokens so apps connect directly to your data.</p>

      <div className="mt-6 w-full bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
        <img src="/images/how-it-works.png" alt="App ↔ Supakey ↔ Your Supabase" className="w-full h-auto" />
        <p className="text-center text-sm text-gray-500 mt-3">Architecture: App ↔ Supakey ↔ Your Supabase</p>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">OAuth &amp; consent</h2>
          <p className="mt-2 text-gray-600">Users sign in to Supakey and grant an app permission to act on their Supabase project.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Schema deployment</h2>
          <p className="mt-2 text-gray-600">Supakey deploys the app’s schema into the user’s Supabase and applies RLS + grants in a least‑privilege model.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">App‑scoped tokens</h2>
          <p className="mt-2 text-gray-600">Supakey issues app‑specific user tokens so the app talks directly to Supabase; Supakey never proxies your data.</p>
        </div>
      </div>
    </div>
  )
}

function Integration() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Integration Guide</h2>
      <p className="text-gray-700">This guide shows how any app integrates with Supakey in simple steps. We'll use a generic app as an example, but the same pattern applies to all applications.</p>

      {/* Overview Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Overview</h3>
        <p className="text-blue-800 mb-3">Supakey enables users to authenticate your app to access their personal Supabase database. Here's what happens:</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">1</span>
            <span className="text-blue-700">User clicks "Sign in with Supakey" in your app</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">2</span>
            <span className="text-blue-700">You get authorization to deploy your app's schema to their database</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">3</span>
            <span className="text-blue-700">You receive keys to connect directly to their Supabase instance</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">4</span>
            <span className="text-blue-700">Your app works with their data, no proxy servers needed</span>
          </div>
        </div>
      </div>

      {/* Step 1: Initial Authentication Flow */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 1: Initiate Supakey Authentication</h3>
        <p className="text-gray-700 mb-4">When a user wants to connect your app to their Supabase, redirect them to Supakey's OAuth authorization endpoint.</p>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">What you need to provide:</h4>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
            <li><code className="bg-gray-100 px-2 py-1 rounded">client_id</code> - Your app's client identifier (e.g., "yourapp-web", "yourapp-mobile", "yourapp-macos")</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">redirect_uri</code> - Where users return after authorization</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">app_identifier</code> - Stable identifier for your app (e.g., "com.yourcompany.yourapp")</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">code_challenge</code> - PKCE security parameter</li>
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Authorization URL:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`GET https://supakey.app/oauth/authorize
  ?client_id=yourapp-web
  &redirect_uri=https%3A%2F%2Fyourapp.com%2Fcallback
  &response_type=code
  &state=RANDOM_STATE_STRING
  &scope=default
  &code_challenge=YOUR_PKCE_CHALLENGE
  &code_challenge_method=S256
  &app_identifier=com.yourcompany.yourapp`}</code></pre>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">What happens next:</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• User signs into Supakey (or is already signed in)</li>
            <li>• User sets up their Supabase connection if not already configured</li>
            <li>• User sees a consent screen asking to authorize your app</li>
            <li>• User is redirected back to your <code>redirect_uri</code> with an authorization code</li>
          </ul>
        </div>
      </div>

      {/* Step 2: Exchange Authorization Code */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 2: Exchange Code for Access Token</h3>
        <p className="text-gray-700 mb-4">Your server exchanges the authorization code for a Supakey access token that allows you to deploy migrations and get user database credentials.</p>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Token Exchange Request:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`POST https://skvdwouezdzhkrijeeaw.supabase.co/functions/v1/oauth-token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
  "redirect_uri": "https://yourapp.com/callback",
  "client_id": "yourapp-web",
  "code_verifier": "YOUR_PKCE_VERIFIER"
}`}</code></pre>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`{
  "access_token": "supakey_access_token_here",
  "refresh_token": "supakey_refresh_token_here",
  "token_type": "bearer",
  "scope": "default",
  "user_id": "user_uuid"
}`}</code></pre>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm"><strong>Success!</strong> You now have a Supakey access token that proves the user authorized your app. Use this token for the next steps.</p>
        </div>
      </div>

      {/* Step 3: Deploy Migrations */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 3: Deploy Your App's Database Schema</h3>
        <p className="text-gray-700 mb-4">Use the Supakey access token to deploy your app's database migrations to the user's Supabase instance. This creates your app's dedicated schema and tables.</p>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Migration Deployment Request:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`POST https://skvdwouezdzhkrijeeaw.supabase.co/functions/v1/deploy-migrations
Authorization: Bearer SUPAKEY_ACCESS_TOKEN
Content-Type: application/json

{
  "applicationName": "yourapp",
  "appIdentifier": "com.yourcompany.yourapp",
  "migrationsDir": {
    "plan": "init 2024-01-01T00:00:00Z Your App # Initial schema",
    "deploy": [
      {
        "name": "init",
        "sql": "CREATE SCHEMA IF NOT EXISTS yourapp; CREATE TABLE yourapp.users (id uuid PRIMARY KEY, email text, created_at timestamptz DEFAULT now());"
      }
    ]
  }
}`}</code></pre>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`{
  "success": true,
  "applicationId": "app_uuid",
  "appIdentifier": "com.yourcompany.yourapp",
  "databaseUrl": "https://user-project.supabase.co"
}`}</code></pre>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-800 mb-2">What Supakey does behind the scenes:</h4>
          <ul className="text-purple-700 text-sm space-y-1">
            <li>• Connects to the user's Supabase database using their stored credentials</li>
            <li>• Creates a dedicated schema for your app (e.g., <code>yourapp</code>)</li>
            <li>• Runs your SQL migrations to create tables, indexes, and functions</li>
            <li>• Sets up Row Level Security (RLS) policies for data isolation</li>
            <li>• Creates a dedicated database user for your app</li>
            <li>• Updates PostgREST configuration to expose your schema via API</li>
          </ul>
        </div>
      </div>

      {/* Step 4: Get Database Access Tokens */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 4: Get Database Access Credentials</h3>
        <p className="text-gray-700 mb-4">Request app-scoped credentials that allow your app to connect directly to the user's Supabase database.</p>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Token Request:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`POST https://skvdwouezdzhkrijeeaw.supabase.co/functions/v1/issue-app-tokens
Authorization: Bearer SUPAKEY_ACCESS_TOKEN
Content-Type: application/json

{
  "appIdentifier": "com.yourcompany.yourapp"
}`}</code></pre>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`{
  "jwt": "user_database_jwt_token",
  "refreshToken": "user_database_refresh_token",
  "username": "yourapp_user@supakey.com",
  "userId": "app_user_uuid",
  "applicationId": "app_uuid",
  "databaseUrl": "https://user-project.supabase.co",
  "anonKey": "user_database_anon_key"
}`}</code></pre>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="font-medium text-indigo-800 mb-2">These credentials give you:</h4>
          <ul className="text-indigo-700 text-sm space-y-1">
            <li>• <strong>databaseUrl</strong>: Direct URL to the user's Supabase project</li>
            <li>• <strong>anonKey</strong>: Anonymous key for client-side connections</li>
            <li>• <strong>jwt</strong>: App-specific JWT token for server-side operations</li>
            <li>• <strong>userId</strong>: The app user's ID in their Supabase auth system</li>
          </ul>
        </div>
      </div>

      {/* Step 5: Connect to User's Database */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 5: Connect and Use the Database</h3>
        <p className="text-gray-700 mb-4">Use the credentials from Step 4 to connect directly to the user's Supabase database and start working with their data.</p>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Frontend Connection (React/JavaScript):</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with user's database
const supabaseClient = createClient(
  databaseUrl,     // from step 4 response
  anonKey,         // from step 4 response
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    db: {
      schema: 'yourapp'  // your app's schema name
    }
  }
)

// Set the JWT token for authenticated requests
await supabaseClient.auth.setSession({
  access_token: jwt,           // from step 4 response
  refresh_token: refreshToken  // from step 4 response
})

// Now you can use the database
const { data, error } = await supabaseClient
  .from('users')  // table in your app's schema
  .select('*')`}</code></pre>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Backend Connection (Node.js):</h4>
          <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`import { createClient } from '@supabase/supabase-js'

// Server-side client with service role access
const supabaseAdmin = createClient(
  databaseUrl,
  jwt,  // Use the JWT as service role key for server operations
  {
    auth: { persistSession: false },
    db: { schema: 'yourapp' }
  }
)

// Query data server-side
const { data, error } = await supabaseAdmin
  .from('users')
  .insert({ email: 'user@example.com' })`}</code></pre>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">🎉 You're connected!</h4>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Your app now has direct access to the user's Supabase database</li>
            <li>• All data stays in their infrastructure - Supakey never proxies it</li>
            <li>• You can use all Supabase features: realtime, storage, edge functions</li>
            <li>• RLS policies ensure your app only accesses its own schema and data</li>
          </ul>
        </div>
      </div>

      {/* Preparing Your App */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Preparing Your App for Supakey</h3>
        <p className="text-gray-700 mb-4">Before integrating, you need to prepare your database migrations and choose your app identifier.</p>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">1. Create Your Database Migrations</h4>
            <p className="text-gray-700 text-sm mb-2">Organize your SQL schema as migration files. You can use Sqitch or simple SQL files:</p>
            <pre className="bg-gray-50 p-3 rounded border overflow-x-auto text-xs"><code>{`// Simple migration structure:
public/migrations/
├── sqitch.plan          # Migration plan (optional)
└── deploy/
    ├── init.sql         # Initial schema
    ├── add-todos.sql    # Add todos table
    └── add-projects.sql # Add projects table`}</code></pre>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">2. Choose Your App Identifier</h4>
            <p className="text-gray-700 text-sm mb-2">Pick a stable, unique identifier for your app. This becomes your schema name:</p>
            <ul className="list-disc pl-6 text-gray-700 text-sm space-y-1">
              <li><code>com.yourcompany.yourapp</code> → schema: <code>com_yourcompany_yourapp</code></li>
              <li><code>github.com/user/repo</code> → schema: <code>github_com_user_repo</code></li>
              <li><code>your-todo-app</code> → schema: <code>your_todo_app</code></li>
            </ul>
          </div>

        </div>
      </div>

    </div>
  )
}

function Apps() {
  const [selectedImage, setSelectedImage] = useState(null)

  const screenshots = [
    {
      src: "/images/hasu/hasu-screenshot-01.png",
      alt: "Hasu Dashboard - Main interface showing todos and projects",
      title: "Dashboard",
      description: "Main todo interface"
    },
    {
      src: "/images/hasu/hasu-screenshot-02.png",
      alt: "Hasu Project View - Organizing tasks by project",
      title: "Projects",
      description: "Task organization"
    },
    {
      src: "/images/hasu/hasu-screenshot-03.png",
      alt: "Hasu Dark Mode - Beautiful dark theme interface",
      title: "Dark Mode",
      description: "Beautiful dark theme"
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Apps Built with Supakey</h2>
      <p className="text-gray-700">Discover apps that use Supakey to connect to users' personal Supabase databases.</p>

      {/* Hasu App */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
            H
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">Hasu</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Live
              </span>
            </div>
            <p className="text-gray-700 mb-4">A beautiful, minimalist todo app that stores all your tasks directly in your personal Supabase database. No vendor lock-in, full data ownership.</p>

            <div className="flex items-center space-x-4 mb-4">
              <a
                href="https://hasu-todo.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Try Hasu
              </a>
              <a
                href="https://github.com/aksanoble/hasu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                View Source
              </a>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Key Features:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Personal data ownership
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Beautiful, minimal design
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Project organization
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Real-time sync
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Dark/light theme
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Open source
                </li>
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Screenshots:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setSelectedImage(screenshot)}
                  >
                    <img
                      src={screenshot.src}
                      alt={screenshot.alt}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{screenshot.title}</p>
                      <p className="text-xs text-gray-500">{screenshot.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Build Your Own App</h3>
        <p className="text-blue-800 mb-4">Ready to create an app that connects to users' personal Supabase databases? Follow our Integration guide to get started.</p>
        <Link
          to="/how-it-works?s=integration"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          View Integration Guide
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl font-bold bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-16 left-0 right-0 text-center text-white">
              <p className="font-medium text-lg">{selectedImage.title}</p>
              <p className="text-sm text-gray-300">{selectedImage.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HowItWorks

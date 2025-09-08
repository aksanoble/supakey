import { Nav } from "../components/Nav.jsx"

export function HowItWorks() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">How Supakey Works</h1>
          <p className="mt-3 text-gray-600 max-w-3xl mx-auto text-center">
            Supakey is the glue between apps and your Supabase. It handles OAuth, deploys app schemas securely,
            and issues app‑scoped user tokens so apps connect directly to your data.
          </p>

          <div className="mt-8 w-full max-w-3xl mx-auto bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
            <img src="/images/how-it-works.png" alt="App ↔ Supakey ↔ Your Supabase" className="w-full h-auto" />
            <p className="text-center text-sm text-gray-500 mt-3">Architecture: App ↔ Supakey ↔ Your Supabase</p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-8">
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

export default HowItWorks

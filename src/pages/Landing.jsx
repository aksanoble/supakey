import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav.jsx";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext.jsx";
import { OAuthButtons } from "../components/OAuthButtons.jsx";

export function Landing() {
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, linkProvider } = useAuth();

  // Extract redirect/OAuth params (used after sign-in)
  const { returnUrl, appIdentifier, oauthParams } = useMemo(() => {
    const ru = searchParams.get("return_url");
    const ai = searchParams.get("app_identifier");
    const oauth = {
      client_id: searchParams.get("client_id"),
      redirect_uri: searchParams.get("redirect_uri"),
      response_type: searchParams.get("response_type"),
      state: searchParams.get("state"),
      scope: searchParams.get("scope"),
      code_challenge: searchParams.get("code_challenge"),
      code_challenge_method: searchParams.get("code_challenge_method"),
      app_identifier: searchParams.get("app_identifier"),
    };
    return { returnUrl: ru, appIdentifier: ai, oauthParams: oauth };
  }, [searchParams]);

  // No landing banner: suppress connection-state messages here.

  // After sign-in, route appropriately
  useEffect(() => {
    // Surface OAuth error messages from provider callbacks (e.g., duplicate accounts)
    const errDesc = searchParams.get('error_description');
    if (errDesc) {
      try {
        const decoded = decodeURIComponent(errDesc);
        setMessage(`Sign-in error: ${decoded}`);
        // Flag auto-link for duplicate email error
        if (/multiple\s+accounts?/i.test(decoded) && /same\s+email/i.test(decoded)) {
          sessionStorage.setItem('supakey_autolink_needed', '1');
        }
      } catch (_) {
        setMessage(`Sign-in error: ${errDesc}`);
        if (/multiple\s+accounts?/i.test(errDesc) && /same\s+email/i.test(errDesc)) {
          sessionStorage.setItem('supakey_autolink_needed', '1');
        }
      }
    }

    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        // Hasu integration: bounce back with tokens
        if (returnUrl && appIdentifier && session) {
          const redirectUrl = new URL(returnUrl);
          redirectUrl.searchParams.set("access_token", session.access_token);
          redirectUrl.searchParams.set("refresh_token", session.refresh_token);
          window.location.href = redirectUrl.toString();
          return;
        }

        if (
          oauthParams.client_id &&
          oauthParams.redirect_uri &&
          oauthParams.response_type === "code"
        ) {
          const qs = searchParams.toString();
          navigate(`/oauth/authorize?${qs}`);
          return;
        }

        const stored = sessionStorage.getItem("oauth_params");
        if (stored) {
          sessionStorage.removeItem("oauth_params");
          const params = new URLSearchParams(JSON.parse(stored));
          navigate(`/oauth/authorize?${params.toString()}`);
          return;
        }
      } catch (e) {
        console.error("Post-login redirect error:", e);
        setMessage("Error preparing redirect");
      }
    })();
  }, [user, appIdentifier, navigate, oauthParams.client_id, oauthParams.redirect_uri, oauthParams.response_type, returnUrl, searchParams]);

  // Attempt background provider linking once if needed
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const needed = sessionStorage.getItem('supakey_autolink_needed') === '1';
      const attempted = sessionStorage.getItem('supakey_autolink_attempted') === '1';
      if (!needed || attempted) return;
      try {
        const { data: { user: fresh } } = await supabase.auth.getUser();
        const providers = new Set((fresh?.identities || []).map(i => i.provider));
        const toLink = !providers.has('github') ? 'github' : (!providers.has('google') ? 'google' : null);
        if (!toLink) {
          sessionStorage.removeItem('supakey_autolink_needed');
          return;
        }
        sessionStorage.setItem('supakey_autolink_attempted', '1');
        sessionStorage.setItem('supakey_autolink_provider', toLink);
        const redirectTo = `${window.location.origin}/`;
        const scopes = toLink === 'github' ? 'read:user user:email' : undefined;
        await linkProvider({ provider: toLink, redirectTo, scopes });
        // linkProvider will redirect; if it doesn't, clear attempt flag
      } catch (e) {
        console.warn('Auto-link failed:', e?.message || e);
      }
    };
    run();
  }, [user, linkProvider]);

  // After redirect back from provider, clear flags if linked
  useEffect(() => {
    const clearIfDone = async () => {
      if (!user) return;
      const attempted = sessionStorage.getItem('supakey_autolink_attempted') === '1';
      const prov = sessionStorage.getItem('supakey_autolink_provider');
      if (!attempted || !prov) return;
      const { data: { user: fresh } } = await supabase.auth.getUser();
      const providers = new Set((fresh?.identities || []).map(i => i.provider));
      if (providers.has(prov)) {
        sessionStorage.removeItem('supakey_autolink_needed');
        sessionStorage.removeItem('supakey_autolink_attempted');
        sessionStorage.removeItem('supakey_autolink_provider');
      }
    };
    clearIfDone();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="flex-1 flex lg:min-h-[82vh] pb-4">
        {/* Left side - Landing content */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-center px-12">
          <div className="max-w-md mx-auto text-white">
            <div className="mb-8">
              <h1 className="text-5xl font-bold mb-4">
                Your Supabase, your apps
              </h1>
            <p className="text-lg font-medium text-blue-100">
              Use your personal Supabase as the private backend for the apps you
              use. Simple self‑hosting, with your data under your control.
            </p>
          </div>

          <div className="space-y-4 text-blue-100">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>One private backend for many apps</span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Simple setup — sign in, connect, go</span>
            </div>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Keep your data in your own account</span>
            </div>
          </div>
          {/* Large screens: retain hero without inline video */}
        </div>
      </div>

        {/* Right side - Sign in */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="text-center text-3xl font-extrabold text-gray-900">Sign in to Supakey</h2>
            <p className="mt-2 text-center text-sm text-gray-600">Use Google or GitHub to continue</p>
          </div>
          {/* Small screens: no inline video here; shown at bottom */}
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <OAuthButtons />
            </div>
          </div>
        </div>
      </main>
      {/* Bottom video section */}
      <section className="pt-3 pb-4 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/tBHlOm-W-Rs?rel=0"
                title="Supakey Intro"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>
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
  );
}

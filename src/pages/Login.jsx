import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Nav } from "../components/Nav.jsx";

export function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn } = useAuth();

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

  // If already authenticated, redirect appropriately
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await postLoginRedirect({ session: data.session });
      } catch (e) {
        console.error("Redirect error:", e);
        setMessage("Error retrieving session for redirect");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const postLoginRedirect = async ({ session }) => {
    // Hasu integration: bounce back with tokens
    if (returnUrl && appIdentifier && session) {
      try {
        const redirectUrl = new URL(returnUrl);
        redirectUrl.searchParams.set("access_token", session.access_token);
        redirectUrl.searchParams.set("refresh_token", session.refresh_token);
        window.location.href = redirectUrl.toString();
        return true;
      } catch (error) {
        console.error("Error building redirect URL:", error);
        setMessage("Error: Invalid redirect URL");
        return false;
      }
    }

    // OAuth authorize flow: forward to authorize route
    if (
      oauthParams.client_id &&
      oauthParams.redirect_uri &&
      oauthParams.response_type === "code"
    ) {
      const qs = searchParams.toString();
      navigate(`/oauth/authorize?${qs}`);
      return true;
    }

    // Legacy stored OAuth params
    const stored = sessionStorage.getItem("oauth_params");
    if (stored) {
      sessionStorage.removeItem("oauth_params");
      const params = new URLSearchParams(JSON.parse(stored));
      navigate(`/oauth/authorize?${params.toString()}`);
      return true;
    }

    // Default to settings (root shows settings when signed in)
    navigate("/");
    return true;
  };

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { data, error } = await signIn(form.email, form.password);
      if (error) throw error;
      if (data?.session) {
        await postLoginRedirect({ session: data.session });
      } else {
        setMessage("Error: No session returned from authentication");
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="w-full flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {returnUrl && appIdentifier ? "Authorize App Access" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {returnUrl && appIdentifier ? `${appIdentifier} would like to access your Supakey account` : "Welcome back to Supakey"}
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={onSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                  <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1">
                  <input id="password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Enter your password" />
                </div>
              </div>
              <div>
                <button type="submit" disabled={loading || !form.email || !form.password} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Signing in…' : (returnUrl && appIdentifier ? 'Sign in & Authorize' : 'Sign in')}
                </button>
              </div>
            </form>

            {message && (
              <div className="mt-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export function Profile() {
  const location = useLocation();
  const [form, setForm] = useState({
    postgres_url: "",
    supabase_url: "",
    supabase_anon_key: "",
    supabase_secret_key: "",
    personal_access_token: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(location.state?.message || "");
  const [loaded, setLoaded] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const REQUIRED_KEYS = [
    'supabase_url',
    'supabase_anon_key',
    'supabase_secret_key',
    'personal_access_token',
    'postgres_url'
  ];

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: dataArray, error } = await supabase
        .from("user_connections")
        // Do not fetch sensitive columns to the browser
        .select("supabase_url, supabase_anon_key")
        .eq("user_id", user.id);

      const data = dataArray?.[0] || null;
      if (!isMounted) return;
      if (error) {
        setMessage(error.message);
      } else if (data) {
        setForm((prev) => ({
          // Never prefill sensitive values client-side
          postgres_url: "",
          supabase_url: data.supabase_url || "",
          supabase_anon_key: data.supabase_anon_key || "",
          supabase_secret_key: "",
          personal_access_token: "",
        }));
      }
      setLoaded(true);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Build banner message from actual missing fields (ignore stale router state)
  const bannerMessage = useMemo(() => {
    if (!loaded) return "";
    const missing = Array.isArray(missingFields) ? missingFields : [];
    if (missing.length === 0) return "";
    if (missing.length === REQUIRED_KEYS.length) {
      return "Please complete your connection settings before authorizing applications.";
    }
    return `Please complete your connection settings (${missing.join(', ')}) before authorizing applications.`;
  }, [loaded, missingFields]);

  // Fetch connection completeness via edge function (booleans only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('connection-status', { body: {} });
        if (error) return; // ignore and leave as-is
        if (!cancelled) setMissingFields(Array.isArray(data?.missing) ? data.missing : []);
      } catch (_) {
        // ignore
      }
    })();
    return () => { cancelled = true };
  }, []);

  

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Require all missing fields to be provided before saving
    const req = Array.isArray(missingFields) ? missingFields : [];
    const firstMissing = req.find((f) => !form[f] || !String(form[f]).trim());
    if (firstMissing) {
      const displayName = (
        firstMissing === 'supabase_url' ? 'Supabase URL' :
        firstMissing === 'supabase_anon_key' ? 'Supabase Anon Key' :
        firstMissing === 'supabase_secret_key' ? 'Supabase Secret Key' :
        firstMissing === 'personal_access_token' ? 'Personal Access Token' :
        firstMissing === 'postgres_url' ? 'Postgres URL' : firstMissing
      );
      setMessage(`${displayName} is required`);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Not signed in");
      setLoading(false);
      return;
    }

    // Build payload without sensitive fields if left blank, to avoid overwriting stored secrets
    const upsertPayload = {
      user_id: user.id,
      supabase_url: form.supabase_url,
      supabase_anon_key: form.supabase_anon_key,
    };
    if (form.postgres_url && form.postgres_url.trim()) upsertPayload.postgres_url = form.postgres_url.trim();
    if (form.supabase_secret_key && form.supabase_secret_key.trim()) upsertPayload.supabase_secret_key = form.supabase_secret_key.trim();
    if (form.personal_access_token && form.personal_access_token.trim()) upsertPayload.personal_access_token = form.personal_access_token.trim();

    const { error } = await supabase
      .from("user_connections")
      .upsert(upsertPayload, { onConflict: "user_id" });
    setLoading(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Settings saved successfully");
      // Refresh connection status to hide banner immediately if complete
      try {
        const { data } = await supabase.functions.invoke('connection-status', { body: {} });
        setMissingFields(Array.isArray(data?.missing) ? data.missing : []);
      } catch (_) { /* ignore */ }
      // Check if we need to redirect back to OAuth flow
      const oauthParams = sessionStorage.getItem("oauth_params");
      if (oauthParams) {
        sessionStorage.removeItem("oauth_params");
        // Redirect back to OAuth authorize with stored parameters
        const params = JSON.parse(oauthParams);
        const searchParams = new URLSearchParams(params);
        window.location.href = `/oauth/authorize?${searchParams.toString()}`;
      }
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              User Connection Settings
            </h2>
            {bannerMessage && (
              <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {bannerMessage}
              </div>
            )}
            <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
              <div className="flex items-start gap-3 text-left">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm-1 2a1 1 0 012 0v5a1 1 0 11-2 0V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">We’re still in early beta.</p>
                  <p className="leading-snug">Please use a test Supabase project — no critical use cases yet.</p>
                </div>
              </div>
            </div>
            

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="postgres_url"
                  className="block text-sm font-medium text-gray-700"
                >
                  Postgres URL (user-level) <span className="text-red-500">*</span>
                </label>
                <input
                  id="postgres_url"
                  type="password"
                  value={form.postgres_url}
                  onChange={(e) =>
                    setForm({ ...form, postgres_url: e.target.value })
                  }
                  placeholder="postgresql://user:pass@host:5432/db"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used by functions to run migrations and apply grants.
                </p>
              </div>
              <div>
                <label
                  htmlFor="supabase_url"
                  className="block text-sm font-medium text-gray-700"
                >
                  Supabase URL (user-level){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="supabase_url"
                  type="password"
                  value={form.supabase_url}
                  onChange={(e) =>
                    setForm({ ...form, supabase_url: e.target.value })
                  }
                  placeholder="https://your-project.supabase.co"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your project base URL (used by functions and clients).
                </p>
              </div>
              <div>
                <label
                  htmlFor="supabase_anon_key"
                  className="block text-sm font-medium text-gray-700"
                >
                  Supabase Anon Key (user-level){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="supabase_anon_key"
                  type="password"
                  value={form.supabase_anon_key}
                  onChange={(e) =>
                    setForm({ ...form, supabase_anon_key: e.target.value })
                  }
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Public anon key for your project; used by clients.
                </p>
              </div>
              <div>
                <label
                  htmlFor="supabase_secret_key"
                  className="block text-sm font-medium text-gray-700"
                >
                  Supabase Secret Key (user-level){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="supabase_secret_key"
                  type="password"
                  value={form.supabase_secret_key}
                  onChange={(e) =>
                    setForm({ ...form, supabase_secret_key: e.target.value })
                  }
                  placeholder="sb_secret_xxxxxxxxxxxx"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used by functions to set up the app (user, migrations,
                  tokens).
                </p>
              </div>
              <div>
                <label
                  htmlFor="personal_access_token"
                  className="block text-sm font-medium text-gray-700"
                >
                  Personal Access Token (for Platform API){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="personal_access_token"
                  type="password"
                  value={form.personal_access_token}
                  onChange={(e) =>
                    setForm({ ...form, personal_access_token: e.target.value })
                  }
                  placeholder="sbp_xxxxxxxxxxxx"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used once to update PostgREST schema via the Platform API.
                </p>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading || (Array.isArray(missingFields) && missingFields.some((f) => !form[f] || !String(form[f]).trim()))}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
            {message && message.includes("saved successfully") && (
              <div className="mt-4 p-4 rounded-md text-sm bg-green-50 text-green-700 border border-green-200">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

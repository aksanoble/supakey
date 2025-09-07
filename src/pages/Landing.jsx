import { useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav.jsx";
import { supabase } from "../lib/supabaseClient";

export function Landing() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  // Public landing does not redirect; routing decides what to render at "/"

  const [submitting, setSubmitting] = useState(false);
  const onWaitlist = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('early_access_requests')
        .insert({ email });
      if (error) {
        // Unique violation => already requested
        if (String(error.code) === '23505') {
          setSubmitted(true);
          setMessage("You're already on the early access list. Thanks!");
        } else {
          setMessage(error.message || 'Unable to submit request');
        }
        return;
      }
      setSubmitted(true);
      setMessage("Thanks! Your early access request has been received. We'll be in touch.");
    } catch (err) {
      setMessage(err?.message || 'Network error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="flex-1 flex">
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
        </div>
      </div>

        {/* Right side - Waitlist */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="text-center text-3xl font-extrabold text-gray-900">Request early access</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Be the first to know when Supakey opens up.
            </p>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <form className="space-y-6" onSubmit={onWaitlist}>
                <div>
                  <label htmlFor="wl_email" className="block text-sm font-medium text-gray-700">Email address</label>
                  <div className="mt-1">
                    <input id="wl_email" name="wl_email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <button type="submit" disabled={submitted || submitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitted ? 'Request received' : (submitting ? 'Submitting…' : 'Request access')}
                  </button>
                </div>
              </form>
              {message && (
                <div className="mt-6 p-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">{message}</div>
              )}
              <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
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
  );
}

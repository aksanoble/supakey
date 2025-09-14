// Helpers to persist and recover OAuth authorize params across provider redirects.

const KEY = 'oauth_params';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function pickOAuthParams(obj = {}) {
  const keys = [
    'client_id',
    'redirect_uri',
    'response_type',
    'state',
    'scope',
    'code_challenge',
    'code_challenge_method',
    'app_identifier',
    'return_url'
  ];
  const out = {};
  for (const k of keys) {
    if (obj[k]) out[k] = obj[k];
  }
  if (Object.keys(out).length) out.ts = Date.now();
  return out;
}

export function isValidOAuthParams(p) {
  if (!p) return false;
  if (!p.client_id || !p.redirect_uri) return false;
  if (p.response_type && p.response_type !== 'code') return false;
  if (p.ts && Date.now() - Number(p.ts) > TTL_MS) return false;
  return true;
}

export function storeOAuthParams(params) {
  try {
    const picked = pickOAuthParams(params);
    if (!isValidOAuthParams(picked)) return;
    sessionStorage.setItem(KEY, JSON.stringify(picked));
    localStorage.setItem(KEY, JSON.stringify(picked));
  } catch (_) { /* ignore storage errors */ }
}

export function getStoredOAuthParams() {
  try {
    const rawSess = sessionStorage.getItem(KEY);
    if (rawSess) {
      const p = JSON.parse(rawSess);
      if (isValidOAuthParams(p)) return p;
    }
  } catch (_) { /* ignore */ }
  try {
    const rawLocal = localStorage.getItem(KEY);
    if (rawLocal) {
      const p = JSON.parse(rawLocal);
      if (isValidOAuthParams(p)) return p;
    }
  } catch (_) { /* ignore */ }
  return null;
}

export function clearOAuthParams() {
  try { sessionStorage.removeItem(KEY); } catch (_) {}
  try { localStorage.removeItem(KEY); } catch (_) {}
}


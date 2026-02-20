/**
 * API client for Sahyog backend.
 * Uses Clerk session token for Authorization. getToken must be passed from Clerk useAuth().
 */

// Leave empty in dev to use Vite proxy (/api -> backend). Set in production to full backend URL.
const getBaseUrl = () => import.meta.env.VITE_API_URL ?? '';

export async function apiRequest(path, options = {}, getToken) {
  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (getToken) {
    try {
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.warn('Could not get auth token', e);
    }
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data.message || res.statusText || 'Request failed';
    if (data.errors && Array.isArray(data.errors)) {
      msg += ' - ' + data.errors.map(e => e.message).join(', ');
    }
    const err = new Error(msg);
    err.status = res.status;
    err.details = data.details ?? data;
    err.detail = data.detail ?? data.details?.detail;
    throw err;
  }
  return data;
}

/** No-auth request to check if backend is reachable (e.g. via Vite proxy). */
export async function pingBackend() {
  const base = getBaseUrl();
  const url = base ? `${base.replace(/\/$/, '')}${apiPaths.health}` : apiPaths.health;
  try {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.ok === true;
  } catch (e) {
    console.warn('Backend ping failed:', e?.message || e);
    return false;
  }
}

export const apiPaths = {
  health: '/api/health',
  me: '/api/users/me',
  users: '/api/users',
  userRole: (uid) => `/api/users/${uid}/role`,
  sos: '/api/v1/sos',
  sosById: (id) => `/api/v1/sos/${id}`,
  sosStatus: (id) => `/api/v1/sos/${id}/status`,
  sosTasks: (id) => `/api/v1/sos/${id}/tasks`,
  disasters: '/api/v1/disasters',
  disasterById: (id) => `/api/v1/disasters/${id}`,
  disasterActivate: (id) => `/api/v1/disasters/${id}/activate`,
  disasterResolve: (id) => `/api/v1/disasters/${id}/resolve`,
  disasterTasks: (id) => `/api/v1/disasters/${id}/tasks`,
  disasterStats: (id) => `/api/v1/disasters/${id}/stats`,
  volunteers: '/api/v1/volunteers',
  volunteerVerify: (id) => `/api/v1/volunteers/${id}/verify`,
  tasks: '/api/v1/tasks/pending',
  createTask: '/api/v1/tasks',
  shelters: '/api/v1/shelters',
  createShelter: '/api/v1/shelters',
  updateShelter: (id) => `/api/v1/shelters/${id}`,
  missing: '/api/v1/missing',
  markFound: (id) => `/api/v1/missing/${id}/found`,
  serverStats: '/api/v1/server/stats',
  search: (query) => `/api/v1/search?q=${encodeURIComponent(query)}`,
};

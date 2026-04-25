// Central API client — all fetch calls in one place
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
let globalToken = null;

export function setToken(token) {
  globalToken = token;
}

function getHeaders(extraHeaders = {}) {
  const h = { ...extraHeaders };
  if (globalToken) h['Authorization'] = `Bearer ${globalToken}`;
  return h;
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('offline');
  return res.json();
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function registerUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function parseResume(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/parse-resume`, { 
    method: 'POST', 
    headers: getHeaders(),
    body: form 
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function embedStore(candidateId, sanitizedText) {
  const res = await fetch(`${API_BASE_URL}/embed-store`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ candidate_id: candidateId, sanitized_text: sanitizedText, metadata: {} }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function evaluateCandidate(candidateId, jobDescription, powData, roleId = null) {
  const payload = { 
    candidate_id: candidateId, 
    job_description: jobDescription, 
    pow_data: powData || {} 
  };
  if (roleId) payload.role_id = roleId;

  const res = await fetch(`${API_BASE_URL}/evaluate-candidate`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errMsg = typeof err.detail === 'object' ? JSON.stringify(err.detail) : err.detail;
    throw new Error(errMsg || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createRole(title, description) {
  const res = await fetch(`${API_BASE_URL}/roles`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getRoles() {
  const res = await fetch(`${API_BASE_URL}/roles`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

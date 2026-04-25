// Central API client — all fetch calls in one place
const BASE_URL = 'http://localhost:8000';

export async function healthCheck() {
  const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('offline');
  return res.json();
}

export async function parseResume(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/parse-resume`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function embedStore(candidateId, sanitizedText) {
  const res = await fetch(`${BASE_URL}/embed-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_id: candidateId, sanitized_text: sanitizedText, metadata: {} }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function evaluateCandidate(candidateId, jobDescription, powData) {
  const res = await fetch(`${BASE_URL}/evaluate-candidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_id: candidateId, job_description: jobDescription, pow_data: powData || {} }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

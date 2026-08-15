// ------------------------------------------------------------------
// Helper fetch untuk Admin API (Issue #6)
// Semua request mengirim cookie sesi (same-origin, jadi otomatis).
// Kalau backend jawab 401, lempar error dengan flag authExpired supaya
// komponen bisa redirect ke /admin/login.
// ------------------------------------------------------------------

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      ...options,
    })
  } catch {
    throw new Error('Backend tidak bisa dihubungi. Pastikan server jalan.')
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    // respons tanpa body JSON
  }

  if (res.status === 401) {
    // 401 di endpoint login = kredensial salah; di endpoint lain = sesi expired
    const err = new Error(body?.status_message || 'Sesi tidak valid atau sudah berakhir')
    if (!path.endsWith('/login')) err.authExpired = true
    throw err
  }

  if (!res.ok) {
    throw new Error(body?.status_message || `Request gagal (HTTP ${res.status})`)
  }
  return body
}

export const adminApi = {
  login: (username, password) =>
    request('/admin/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/admin/api/logout', { method: 'POST' }),
  me: () => request('/admin/api/me'),
  listEntries: (status) =>
    request(`/admin/api/entries${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  getEntry: (id) => request(`/admin/api/entries/${encodeURIComponent(id)}`),
  createEntry: (data) => request('/admin/api/entries', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id, data) =>
    request(`/admin/api/entries/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntry: (id) => request(`/admin/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  match: (query, type) => request('/admin/api/match', { method: 'POST', body: JSON.stringify({ query, type }) }),
}

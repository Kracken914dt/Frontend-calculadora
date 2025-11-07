const BASE_URL = '/api/calculator'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    const message = data?.message || 'Error en la solicitud'
    throw new Error(message)
  }
  return data
}

export async function getState() {
  return request('/state', { method: 'GET' })
}

export async function doOperation(operation, value) {
  return request('/operation', {
    method: 'POST',
    body: JSON.stringify({ operation, value })
  })
}

export async function getHistory() {
  return request('/history', { method: 'GET' })
}

export async function undo() {
  return request('/undo', { method: 'POST' })
}

export async function redo() {
  return request('/redo', { method: 'POST' })
}

export async function clearCalc() {
  return request('/clear', { method: 'POST' })
}

function csrfToken() {
  const value = document.cookie.split('; ').find((part) => part.startsWith('csrftoken='));
  return value ? decodeURIComponent(value.slice('csrftoken='.length)) : '';
}

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-CSRFToken': csrfToken() } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Cannot reach the server. Check that Django is running.');
  }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('The server returned an unexpected response.'); }
  if (!response.ok) {
    const fields = payload.error?.fields;
    const firstField = fields && Object.values(fields)[0];
    const detail = Array.isArray(firstField) ? firstField[0] : firstField;
    const error = new Error(String(detail || payload.error?.message || 'Please try again.'));
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

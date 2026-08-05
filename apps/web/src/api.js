export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'No fue posible completar la operación.');
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }
  return data;
}


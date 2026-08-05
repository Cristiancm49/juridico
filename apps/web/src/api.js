export async function apiFetch(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
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

export async function apiDownload(path) {
  const response = await fetch(path, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message || 'No fue posible descargar el documento.');
    error.status = response.status;
    throw error;
  }
  const disposition = response.headers.get('content-disposition') || '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="([^"]+)"/i)?.[1];
  return {
    blob: await response.blob(),
    filename: encodedName ? decodeURIComponent(encodedName) : plainName || 'documento',
  };
}

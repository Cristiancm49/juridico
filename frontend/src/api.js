const TOKEN_KEY = 'consultorio-contable.session';

export function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem(TOKEN_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const session = readSession();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(path, {
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && session) {
      clearSession();
      window.dispatchEvent(new CustomEvent('consultorio:unauthorized'));
    }

    const error = new Error(
      data?.detail || data?.title || data?.message || 'No fue posible completar la operación.',
    );
    error.status = response.status;
    error.details = data?.errors;
    throw error;
  }

  return data;
}

export async function apiDownload(path, fallbackName) {
  const session = readSession();
  const response = await fetch(path, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });
  if (!response.ok) throw new Error('No fue posible descargar el archivo.');
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i);
  const name = match ? decodeURIComponent(match[1].replaceAll('"', '')) : fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}


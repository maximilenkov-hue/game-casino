
let csrfToken = null;

const API_BASE_URL = 'https://game-casino.onrender.com';

/**
 * Преобразует локальный путь API в полный адрес Render.
 */
function getApiUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${path}`;
}

/**
 * Получает CSRF-токен и проверяет сессию.
 */
export async function fetchSession() {
  try {
    const response = await fetch(getApiUrl('/api/auth/session'), {
      method: 'GET',
      credentials: 'include'
    });

    const data = await response.json();

    if (data.csrf_token) {
      csrfToken = data.csrf_token;
    }

    return data;
  } catch (error) {
    console.error('Ошибка проверки сессии:', error);
    return { authenticated: false, user: null };
  }
}

/**
 * Создаёт гостевую сессию, если пользователь не авторизован.
 */
export async function ensureGuestSession() {
  const sessionData = await fetchSession();

  if (sessionData.authenticated && sessionData.user) {
    return sessionData.user;
  }

  try {
    const guestResponse = await apiRequest('/api/auth/guest', 'POST', {});

    if (guestResponse && guestResponse.user) {
      return guestResponse.user;
    }
  } catch (error) {
    console.error('Ошибка создания гостевой сессии:', error);
  }

  return null;
}

/**
 * Универсальный метод запросов к API.
 */
export async function apiRequest(url, method = 'GET', body = null) {
  const normalizedMethod = method.toUpperCase();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(normalizedMethod)) {
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const options = {
    method: normalizedMethod,
    headers,
    credentials: 'include'
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(getApiUrl(url), options);

  const newCsrf = response.headers.get('X-CSRF-Token');

  if (newCsrf) {
    csrfToken = newCsrf;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorObj = new Error(
      data.message || 'Ошибка запроса к серверу'
    );

    errorObj.status = response.status;
    errorObj.code = data.error || 'UNKNOWN_ERROR';
    errorObj.data = data;

    throw errorObj;
  }

  if (data.csrf_token) {
    csrfToken = data.csrf_token;
  }

  return data;
}

let csrfToken = null;

/**
* Получает или обновляет CSRF-токен из сессии.
*/
export async function fetchSession() {
  try {
    const response = await fetch('/api/auth/session', {
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
* Автоматическая проверка и создание гостевой сессии, если пользователь не авторизован.
*/
export async function ensureGuestSession() {
  const sessionData = await fetchSession();
  if (sessionData.authenticated && sessionData.user) {
    return sessionData.user;
  }

  // Если сессии нет — создаем гостя
  const guestResponse = await apiRequest('/api/auth/guest', 'POST', {});
  if (guestResponse && guestResponse.user) {
    return guestResponse.user;
  }
  return null;
}

/**
* Универсальный метод для отправки запросов к API.
* @param {string} url
* @param {'GET' | 'POST' | 'PUT' | 'DELETE'} [method='GET']
* @param {object | null} [body=null]
* @returns {Promise<any>}
*/
export async function apiRequest(url, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  // Для изменяющих состояние запросов передаем CSRF-токен
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const options = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include'
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    // Обновляем токен, если сервер прислал новый в заголовках или ответе
    const newCsrf = response.headers.get('X-CSRF-Token');
    if (newCsrf) {
      csrfToken = newCsrf;
    }

    const data = await response.json();

    if (!response.ok) {
      const errorObj = new Error(data.message || 'Ошибка запроса к серверу');
      errorObj.status = response.status;
      errorObj.code = data.error || 'UNKNOWN_ERROR';
      errorObj.data = data;
      throw errorObj;
    }

    if (data.csrf_token) {
      csrfToken = data.csrf_token;
    }

    return data;
  } catch (error) {
    throw error;
  }
}
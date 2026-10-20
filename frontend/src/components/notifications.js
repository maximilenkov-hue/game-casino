let regionEl = null;

function ensureNotificationsRegion() {
  if (regionEl && document.body.contains(regionEl)) {
    return regionEl;
  }

  regionEl = document.createElement('div');
  regionEl.className = 'notifications-region';
  regionEl.setAttribute('aria-live', 'polite');
  regionEl.setAttribute('aria-atomic', 'false');
  document.body.appendChild(regionEl);
  return regionEl;
}

/**
 * Показывает уведомление пользователю.
 * @param {string} message - Текст сообщения.
 * @param {'success' | 'error' | 'warning'} [type='warning'] - Тип уведомления.
 * @param {number} [durationMs=3500] - Время показа в миллисекундах.
 */
export function showNotification(message, type = 'warning', durationMs = 3500) {
  const container = ensureNotificationsRegion();

  const allowedTypes = ['success', 'error', 'warning'];
  const safeType = allowedTypes.includes(type) ? type : 'warning';

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast--${safeType}`;
  toastEl.setAttribute('role', safeType === 'error' ? 'alert' : 'status');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Закрыть уведомление');
  closeBtn.textContent = '×';

  let removeTimer = null;

  const dismiss = () => {
    if (removeTimer) {
      clearTimeout(removeTimer);
    }
    toastEl.classList.add('is-leaving');
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.remove();
      }
    }, 180);
  };

  closeBtn.addEventListener('click', dismiss);

  toastEl.appendChild(textSpan);
  toastEl.appendChild(closeBtn);
  container.appendChild(toastEl);

  if (durationMs > 0) {
    removeTimer = setTimeout(dismiss, durationMs);
  }
}
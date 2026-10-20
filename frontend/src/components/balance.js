let currentDisplayedBalance = null;
let highlightTimer = null;

/**
 * Форматирует целое число монет с разделителями тысяч.
 * @param {number} amount
 * @returns {string}
 */
function formatCoins(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount);
}

/**
 * Инициализирует и обновляет отображение баланса в шапке.
 * @param {number | null} newBalance - Баланс с сервера или тестового режима.
 */
export function setBalance(newBalance) {
  const containerEl = document.getElementById('balance-container');
  const valueEl = document.getElementById('balance-value');

  if (!containerEl || !valueEl) {
    return;
  }

  if (typeof newBalance !== 'number' || Number.isNaN(newBalance)) {
    valueEl.textContent = '—';
    currentDisplayedBalance = null;
    return;
  }

  const previousBalance = currentDisplayedBalance;
  currentDisplayedBalance = newBalance;
  valueEl.textContent = `${formatCoins(newBalance)}`;

  if (previousBalance !== null && previousBalance !== newBalance) {
    const delta = newBalance - previousBalance;
    triggerBalanceHighlight(containerEl, delta);
  }
}

/**
 * Возвращает текущее отображаемое значение баланса.
 * @returns {number | null}
 */
export function getDisplayedBalance() {
  return currentDisplayedBalance;
}

function triggerBalanceHighlight(containerEl, delta) {
  containerEl.classList.remove('is-updating-up', 'is-updating-down');

  const existingDelta = containerEl.querySelector('.balance-delta');
  if (existingDelta) {
    existingDelta.remove();
  }

  const deltaEl = document.createElement('span');
  deltaEl.className = `balance-delta ${delta > 0 ? 'is-positive' : 'is-negative'}`;
  deltaEl.textContent = delta > 0 ? `+${delta}` : `${delta}`;
  containerEl.appendChild(deltaEl);

  // Принудительный reflow для перезапуска CSS-перехода
  void containerEl.offsetWidth;

  containerEl.classList.add(delta > 0 ? 'is-updating-up' : 'is-updating-down');

  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }

  highlightTimer = setTimeout(() => {
    containerEl.classList.remove('is-updating-up', 'is-updating-down');
    if (deltaEl.parentNode) {
      deltaEl.remove();
    }
  }, 1200);
}
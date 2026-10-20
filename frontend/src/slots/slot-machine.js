import { animateReelsToResult, renderReelSymbol } from './slot-animation.js';
import { getDisplayedBalance, setBalance } from '../components/balance.js';
import { showNotification } from '../components/notifications.js';
import { ensureGuestSession, apiRequest } from '../api.js';

export const ALLOWED_BETS = [10, 25, 50, 100, 250, 500];

/**
 * Инициализирует контроллер игрового автомата с подключением к бэкенду Flask.
 * @param {HTMLElement} rootEl
 */
export async function mountSlotMachine(rootEl) {
  let selectedBet = ALLOWED_BETS[0];
  let isSpinning = true; // Блокируем до загрузки сессии

  const reelEls = Array.from(rootEl.querySelectorAll('.reel-window'));
  const reelsFrameEl = rootEl.querySelector('#reels-frame');
  const betButtons = Array.from(rootEl.querySelectorAll('.bet-btn[data-bet]'));
  const spinButton = rootEl.querySelector('#spin-button');
  const faucetButton = rootEl.querySelector('#local-faucet-button');
  const resultBannerEl = rootEl.querySelector('#slot-result-banner');
  const currentBetLabelEl = rootEl.querySelector('#current-bet-label');
  const modePillEl = rootEl.querySelector('.mode-pill');

  // Меняем плашку с «Локальный тест-режим» на «Серверный режим»
  if (modePillEl) {
    modePillEl.textContent = 'Серверная математика';
    modePillEl.title = 'Все расчёты и баланс обрабатываются сервером Flask';
  }

  // Начальная отрисовка барабанов
  const initialSymbols = ['SEVEN', 'DIAMOND', 'CROWN'];
  reelEls.forEach((el, idx) => renderReelSymbol(el, initialSymbols[idx]));

  function updateControlsState() {
    const balance = getDisplayedBalance() ?? 0;

    betButtons.forEach((btn) => {
      const betVal = Number(btn.getAttribute('data-bet'));
      btn.classList.toggle('is-active', betVal === selectedBet);
      btn.disabled = isSpinning;
    });

    if (currentBetLabelEl) {
      currentBetLabelEl.textContent = `${selectedBet} монет`;
    }

    if (spinButton) {
      spinButton.disabled = isSpinning;
      spinButton.textContent = isSpinning ? 'Загрузка...' : `Крутить (${selectedBet})`;
    }

    if (faucetButton) {
      faucetButton.disabled = isSpinning || balance >= 100;
    }
  }

  updateControlsState();

  // 1. Инициализация сессии и загрузка баланса с сервера
  try {
    const user = await ensureGuestSession();
    if (user && typeof user.balance === 'number') {
      setBalance(user.balance);
    }
  } catch (error) {
    console.error('Ошибка инициализации сессии:', error);
    showNotification('Не удалось подключиться к серверу игры.', 'error');
  } finally {
    isSpinning = false;
    updateControlsState();
  }

  betButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isSpinning) return;
      const betVal = Number(btn.getAttribute('data-bet'));
      if (ALLOWED_BETS.includes(betVal)) {
        selectedBet = betVal;
        updateControlsState();
      }
    });
  });

  // Обработка кнопки получения бесплатных монет (Faucet)
  if (faucetButton) {
    faucetButton.addEventListener('click', async () => {
      if (isSpinning) return;
      isSpinning = true;
      updateControlsState();

      try {
        const data = await apiRequest('/api/game/faucet', 'POST', {});
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
          showNotification(data.message || 'Баланс успешно пополнен.', 'success');
        }
      } catch (error) {
        if (error.code === 'BALANCE_TOO_HIGH') {
          showNotification('Пополнение доступно при балансе меньше 100 монет.', 'warning');
        } else if (error.code === 'FAUCET_COOLDOWN') {
          showNotification(error.message || 'Подождите перед следующим пополнением.', 'warning');
        } else {
          showNotification(error.message || 'Ошибка пополнения.', 'error');
        }
      } finally {
        isSpinning = false;
        updateControlsState();
      }
    });
  }

  // Обработка вращения барабанов через реальный бэкенд
  if (spinButton) {
    spinButton.addEventListener('click', async () => {
      if (isSpinning) return;

      const currentBalance = getDisplayedBalance() ?? 0;
      if (currentBalance < selectedBet) {
        showNotification('Недостаточно монет для выбранной ставки.', 'error');
        return;
      }

      isSpinning = true;
      reelsFrameEl?.classList.remove('is-win');
      if (resultBannerEl) {
        resultBannerEl.classList.remove('is-win');
        resultBannerEl.innerHTML = '<span>Запрос к серверу...</span>';
      }
      updateControlsState();

      // Генерация уникального ключа идемпотентности для этого вращения
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `spin_${Date.now()}_${Math.random()}`;

      try {
        // Отправляем запрос на сервер Flask
        const responseData = await apiRequest('/api/game/spin', 'POST', {
          bet: selectedBet,
          idempotency_key: idempotencyKey
        });

        const targetReels = responseData.reels;
        const multiplier = responseData.multiplier;
        const payout = responseData.payout;
        const newBalance = responseData.balance;

        // Запускаем визуальную анимацию остановки барабанов на серверных символах
        await animateReelsToResult(reelEls, targetReels);

        // Обновляем баланс по данным сервера
        setBalance(newBalance);

        if (resultBannerEl) {
          if (payout > 0) {
            reelsFrameEl?.classList.add('is-win');
            resultBannerEl.classList.add('is-win');
            resultBannerEl.innerHTML = `
              <span>Комбинация x${multiplier}!</span>
              <span class="result-payout">+${payout} монет</span>
            `;
          } else {
            resultBannerEl.innerHTML = `
              <span>Нет выигрышной комбинации</span>
              <span>Ставка: ${selectedBet}</span>
            `;
          }
        }
      } catch (error) {
        console.error('Ошибка вращения:', error);
        if (error.status === 409 || error.code === 'INSUFFICIENT_FUNDS') {
          showNotification('Недостаточно средств на сервере.', 'error');
        } else {
          showNotification(error.message || 'Ошибка связи с сервером.', 'error');
        }
        if (resultBannerEl) {
          resultBannerEl.innerHTML = '<span>Ошибка вращения</span>';
        }
      } finally {
        isSpinning = false;
        updateControlsState();
      }
    });
  }
}
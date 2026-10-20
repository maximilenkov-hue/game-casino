import { ALLOWED_BETS, mountSlotMachine } from '../slots/slot-machine.js';

/**
 * Отрисовывает экран игрового автомата внутри корневого контейнера.
 * @param {HTMLElement} containerEl
 */
export function renderSlotsPage(containerEl) {
  const betButtonsHtml = ALLOWED_BETS.map(
    (bet, index) => `
      <button
        type="button"
        class="bet-btn ${index === 0 ? 'is-active' : ''}"
        data-bet="${bet}"
      >
        ${bet}
      </button>
    `
  ).join('');

  containerEl.innerHTML = `
    <section class="slot-card" aria-labelledby="slot-machine-title">
      <div class="slot-header">
        <h1 class="slot-title" id="slot-machine-title">Obsidian Classic 3x</h1>
        <span class="mode-pill" title="До подключения сервера расчёт выполняется локально">
          Локальный тест-режим
        </span>
      </div>

      <div class="reels-frame" id="reels-frame" aria-label="Барабаны слота">
        <div class="reel-window" data-reel="0" aria-label="Барабан 1"></div>
        <div class="reel-window" data-reel="1" aria-label="Барабан 2"></div>
        <div class="reel-window" data-reel="2" aria-label="Барабан 3"></div>
      </div>

      <div class="slot-result-banner" id="slot-result-banner" aria-live="polite">
        <span>Выберите ставку и запустите вращение</span>
        <span id="current-bet-label">10 монет</span>
      </div>

      <div class="bet-controls">
        <div class="bet-controls-header">
          <span>Размер ставки</span>
          <span>Лимит: 10 – 500</span>
        </div>
        <div class="bet-grid" role="group" aria-label="Выбор размера ставки">
          ${betButtonsHtml}
        </div>
      </div>

      <button type="button" class="spin-btn" id="spin-button">
        Крутить (10)
      </button>

      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <span style="font-size: 0.78rem; color: var(--text-muted);">
          Бесплатное пополнение (+500) при балансе меньше 100
        </span>
        <button type="button" class="btn-secondary" id="local-faucet-button" disabled>
          Получить +500 монет
        </button>
      </div>

      <div class="paytable-box">
        <div class="paytable-title">Таблица выплат (множитель ставки)</div>
        <div class="paytable-grid">
          <div class="paytable-row">
            <span class="paytable-combo">3 × SEVEN</span>
            <span class="paytable-mult">x100</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">3 × DIAMOND</span>
            <span class="paytable-mult">x40</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">3 × CROWN</span>
            <span class="paytable-mult">x20</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">3 × STAR</span>
            <span class="paytable-mult">x12</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">3 × BELL</span>
            <span class="paytable-mult">x8</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">3 × CHERRY</span>
            <span class="paytable-mult">x5</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">2 × BELL</span>
            <span class="paytable-mult">x2</span>
          </div>
          <div class="paytable-row">
            <span class="paytable-combo">2 × STAR / CHERRY</span>
            <span class="paytable-mult">x1</span>
          </div>
        </div>
      </div>
    </section>
  `;

  mountSlotMachine(containerEl);
}
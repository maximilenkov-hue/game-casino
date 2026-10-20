export const SYMBOL_VISUALS = {
  SEVEN: {
    label: 'Seven',
    svg: `<svg class="symbol-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 4h14l-7 16"></path>
      <line x1="7" y1="9" x2="16" y2="9"></line>
    </svg>`
  },
  DIAMOND: {
    label: 'Diamond',
    svg: `<svg class="symbol-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="6 3 18 3 22 9 12 21 2 9 6 3"></polygon>
      <line x1="2" y1="9" x2="22" y2="9"></line>
    </svg>`
  },
  CROWN: {
    label: 'Crown',
    svg: `<svg class="symbol-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 18h18l-2-11-5 4-2-6-2 6-5-4-2 11z"></path>
    </svg>`
  },
  STAR: {
    label: 'Star',
    svg: `<svg class="symbol-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`
  },
  BELL: {
    label: 'Bell',
    svg: `<svg class="symbol-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>`
  },
  CHERRY: {
    label: 'Cherry',
    svg: `<svg class="symbol-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="8" cy="17" r="3.5"></circle>
      <circle cx="16.5" cy="15.5" r="3.5"></circle>
      <path d="M9.5 14C10 9 13 5 18 4"></path>
      <path d="M16.5 12C15.5 8.5 14 6 12 4"></path>
    </svg>`
  }
};

const ALL_SYMBOL_KEYS = Object.keys(SYMBOL_VISUALS);

/**
 * Отрисовывает конкретный символ внутри окна барабана.
 * @param {HTMLElement} reelEl
 * @param {string} symbolKey
 */
export function renderReelSymbol(reelEl, symbolKey) {
  const visual = SYMBOL_VISUALS[symbolKey] || SYMBOL_VISUALS.SEVEN;
  reelEl.innerHTML = `
    <div class="reel-symbol symbol--${symbolKey}">
      ${visual.svg}
      <span class="symbol-label">${visual.label}</span>
    </div>
  `;
}

/**
 * Запускает визуальную анимацию вращения трёх барабанов и останавливает их
 * строго на предопределённом массиве targetSymbols.
 * @param {HTMLElement[]} reelElements - Массив из 3 DOM-элементов барабанов.
 * @param {string[]} targetSymbols - Массив из 3 целевых символов (от сервера или тест-режима).
 * @returns {Promise<void>}
 */
export function animateReelsToResult(reelElements, targetSymbols) {
  return new Promise((resolve) => {
    const cycleTimers = [];
    let cycleIndex = 0;

    reelElements.forEach((reelEl, idx) => {
      reelEl.classList.remove('is-stopped');
      reelEl.classList.add('is-spinning');

      const timer = setInterval(() => {
        cycleIndex = (cycleIndex + 1 + idx) % ALL_SYMBOL_KEYS.length;
        renderReelSymbol(reelEl, ALL_SYMBOL_KEYS[cycleIndex]);
      }, 85);

      cycleTimers.push(timer);
    });

    const stopDelays = [420, 680, 940];

    reelElements.forEach((reelEl, idx) => {
      setTimeout(() => {
        clearInterval(cycleTimers[idx]);
        reelEl.classList.remove('is-spinning');
        renderReelSymbol(reelEl, targetSymbols[idx]);
        reelEl.classList.add('is-stopped');

        if (idx === reelElements.length - 1) {
          setTimeout(resolve, 180);
        }
      }, stopDelays[idx]);
    });
  });
}
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { setBalance } from './components/balance.js';
import { initNavigation } from './components/navigation.js';
import { ensureGuestSession } from './api.js';
import { renderSlotsPage } from './pages/slots.js';
import { renderLeaderboardPage } from './pages/leaderboard.js';
import { renderInventoryPage } from './pages/inventory.js';
import { renderSettingsPage } from './pages/settings.js';

let isAppInitialized = false;

async function renderSection(sectionKey) {
  const screenRoot = document.getElementById('screen-root');
  if (!screenRoot) {
    return;
  }

  // Гарантируем, что сессия и баланс инициализированы перед открытием любого раздела
  if (!isAppInitialized) {
    try {
      const user = await ensureGuestSession();
      if (user && typeof user.balance === 'number') {
        setBalance(user.balance);
      }
    } catch (err) {
      console.error('Ошибка инициализации сессии:', err);
    }
    isAppInitialized = true;
  }

  screenRoot.innerHTML = '';

  if (sectionKey === 'slots') {
    renderSlotsPage(screenRoot);
  } else if (sectionKey === 'leaderboard') {
    await renderLeaderboardPage(screenRoot);
  } else if (sectionKey === 'inventory') {
    await renderInventoryPage(screenRoot);
  } else if (sectionKey === 'settings') {
    await renderSettingsPage(screenRoot);
  }
}

function bootstrapApp() {
  initNavigation((sectionKey) => {
    renderSection(sectionKey);
  }, 'slots');
}

bootstrapApp();
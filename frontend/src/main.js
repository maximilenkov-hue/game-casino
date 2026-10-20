import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

const PAGES_META = {
  slots: {
    title: 'Игровой зал — Слоты',
    subtitle: 'Трёхбарабанный автомат с фиксированной таблицей выплат (RTP 93.70%).',
    status: 'Раздел слотов по умолчанию активен. Интерфейс автомата будет подключён на Этапе 4.'
  },
  leaderboard: {
    title: 'Таблица лидеров',
    subtitle: 'Рейтинг игроков по текущему балансу виртуальных монет.',
    status: 'Список лидеров будет подключён к серверу в следующих этапах.'
  },
  inventory: {
    title: 'Коллекционный инвентарь',
    subtitle: 'Редкие предметы, выпадающие при призовых комбинациях.',
    status: 'Каталог предметов и коллекция игрока будут загружаться через API.'
  },
  settings: {
    title: 'Настройки профиля и интерфейса',
    subtitle: 'Управление никнеймом, защитой аккаунта и параметрами отображения.',
    status: 'Настройки интерфейса и привязка пароля будут доступны в этом разделе.'
  }
};

function renderPagePlaceholder(pageKey) {
  const mainEl = document.getElementById('app-main');
  const meta = PAGES_META[pageKey] || PAGES_META.slots;

  mainEl.innerHTML = '';

  const card = document.createElement('section');
  card.className = 'surface-card';

  const header = document.createElement('div');
  header.className = 'section-header';

  const title = document.createElement('h1');
  title.className = 'section-title';
  title.textContent = meta.title;

  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'section-subtitle';
  subtitle.textContent = meta.subtitle;

  const stateBox = document.createElement('div');
  stateBox.className = 'screen-state';
  stateBox.style.marginTop = '16px';

  const stateTitle = document.createElement('p');
  stateTitle.className = 'screen-state-title';
  stateTitle.textContent = `Активный экран: ${pageKey.toUpperCase()}`;

  const stateDesc = document.createElement('p');
  stateDesc.className = 'screen-state-desc';
  stateDesc.textContent = meta.status;

  stateBox.appendChild(stateTitle);
  stateBox.appendChild(stateDesc);

  card.appendChild(header);
  card.appendChild(subtitle);
  card.appendChild(stateBox);

  mainEl.appendChild(card);
}

function initAppShell() {
  const balanceAmountEl = document.getElementById('balance-amount');
  if (balanceAmountEl) {
    balanceAmountEl.textContent = '1 000';
  }

  const navEl = document.getElementById('app-nav');
  const navButtons = Array.from(navEl.querySelectorAll('.nav-item[data-page]'));

  navEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.nav-item[data-page]');
    if (!btn) return;

    const targetPage = btn.dataset.page;
    navButtons.forEach((item) => {
      const isTarget = item === btn;
      item.classList.toggle('is-active', isTarget);
      if (isTarget) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    renderPagePlaceholder(targetPage);
  });

  // По умолчанию первым экраном открываются слоты
  renderPagePlaceholder('slots');
}

document.addEventListener('DOMContentLoaded', initAppShell);

import { apiRequest } from '../api.js';
import { showNotification } from '../components/notifications.js';

/**
 * Отрисовывает таблицу лидеров внутри контейнера.
 * @param {HTMLElement} containerEl
 */
export async function renderLeaderboardPage(containerEl) {
  containerEl.innerHTML = `
    <section class="obsidian-container" aria-labelledby="leaderboard-title" style="max-width: 640px;">
      <h1 id="leaderboard-title">Таблица лидеров</h1>
      <p>Топ-10 игроков Obsidian Vault по балансу виртуальных монет.</p>
      
      <div id="leaderboard-content" style="margin-top: 1.25rem;">
        <p style="color: var(--text-muted);">Загрузка рейтинга...</p>
      </div>
    </section>
  `;

  const contentEl = containerEl.querySelector('#leaderboard-content');

  try {
    const data = await apiRequest('/api/leaderboard', 'GET');
    const leaders = data.leaders || [];
    const userRank = data.current_user_rank;

    if (leaders.length === 0) {
      contentEl.innerHTML = '<p style="color: var(--text-muted);">Пока нет ни одного игрока в рейтинге.</p>';
      return;
    }

    const rowsHtml = leaders.map((leader) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background-color: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-weight: 700; color: ${leader.rank <= 3 ? 'var(--accent-gold)' : 'var(--text-muted)'}; width: 24px;">#${leader.rank}</span>
          <span style="font-weight: 600; color: var(--text-main);">${leader.username}</span>
          ${leader.is_guest ? '<span style="font-size: 0.7rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 0.1rem 0.4rem; border-radius: 4px;">Гость</span>' : ''}
        </div>
        <span style="font-weight: 700; color: var(--accent-gold); font-variant-numeric: tabular-nums;">${new Intl.NumberFormat('ru-RU').format(leader.balance)} монет</span>
      </div>
    `).join('');

    contentEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem;">
        ${rowsHtml}
      </div>
      ${userRank ? `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">Ваша текущая позиция в рейтинге: <strong style="color: var(--accent-gold);">#${userRank}</strong></p>` : ''}
    `;
  } catch (error) {
    console.error('Ошибка загрузки таблицы лидеров:', error);
    contentEl.innerHTML = '<p style="color: #ef4444;">Не удалось загрузить таблицу лидеров.</p>';
    showNotification('Ошибка загрузки рейтинга.', 'error');
  }
}
import { apiRequest } from '../api.js';
import { showNotification } from '../components/notifications.js';

/**
 * Отрисовывает инвентарь игрока.
 * @param {HTMLElement} containerEl
 */
export async function renderInventoryPage(containerEl) {
  containerEl.innerHTML = `
    <section class="obsidian-container" aria-labelledby="inventory-title" style="max-width: 640px;">
      <h1 id="inventory-title">Инвентарь</h1>
      <p>Ваше хранилище редких коллекционных предметов Obsidian Vault.</p>
      
      <div id="inventory-content" style="margin-top: 1.25rem;">
        <p style="color: var(--text-muted);">Загрузка инвентаря...</p>
      </div>
    </section>
  `;

  const contentEl = containerEl.querySelector('#inventory-content');

  try {
    const data = await apiRequest('/api/inventory', 'GET');
    const items = data.items || [];

    if (items.length === 0) {
      contentEl.innerHTML = `
        <div style="padding: 2rem 1rem; border: 1px dashed var(--border-color); border-radius: 10px; text-align: center;">
          <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Ваш инвентарь пока пуст.</p>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Коллекционные предметы будут добавляться в будущих обновлениях игровых механик.</p>
        </div>
      `;
      return;
    }

    const itemsHtml = items.map((item) => `
      <div style="background-color: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <strong style="color: var(--text-main);">${item.name}</strong>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-gold);">${item.rarity}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted);">${item.description}</p>
        <span style="display: inline-block; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">Количество: ${item.quantity}</span>
      </div>
    `).join('');

    contentEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem;">
        ${itemsHtml}
      </div>
    `;
  } catch (error) {
    console.error('Ошибка загрузки инвентаря:', error);
    contentEl.innerHTML = '<p style="color: #ef4444;">Не удалось загрузить инвентарь.</p>';
    showNotification('Ошибка загрузки инвентаря.', 'error');
  }
}
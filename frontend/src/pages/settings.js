import { apiRequest } from '../api.js';
import { showNotification } from '../components/notifications.js';

/**
 * Отрисовывает страницу настроек и управления аккаунтом.
 * @param {HTMLElement} containerEl
 */
export async function renderSettingsPage(containerEl) {
  containerEl.innerHTML = `
    <section class="obsidian-container" aria-labelledby="settings-title" style="max-width: 560px;">
      <h1 id="settings-title">Настройки</h1>
      <p>Параметры интерфейса и управление аккаунтом Obsidian Vault.</p>
      
      <div id="settings-content" style="margin-top: 1.25rem; text-align: left; display: flex; flex-direction: column; gap: 1.25rem;">
        <p style="color: var(--text-muted);">Загрузка настроек...</p>
      </div>
    </section>
  `;

  const contentEl = containerEl.querySelector('#settings-content');

  try {
    const [settingsData, sessionData] = await Promise.all([
      apiRequest('/api/settings', 'GET'),
      apiRequest('/api/auth/session', 'GET')
    ]);

    const settings = settingsData.settings || { sound_enabled: true, animation_speed: 'normal' };
    const user = sessionData.user || {};

    contentEl.innerHTML = `
      <!-- Блок настроек интерфейса -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem;">
        <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-main);">Интерфейс и звук</h3>
        
        <label style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; cursor: pointer; margin-bottom: 0.75rem;">
          <input type="checkbox" id="setting-sound" ${settings.sound_enabled ? 'checked' : ''} style="accent-color: var(--accent-purple); width: 16px; height: 16px;">
          <span>Включить звуковые эффекты</span>
        </label>

        <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.875rem;">
          <label for="setting-speed">Скорость анимации барабанов:</label>
          <select id="setting-speed" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.5rem; border-radius: 6px; font-family: var(--font-sans);">
            <option value="normal" ${settings.animation_speed === 'normal' ? 'selected' : ''}>Обычная</option>
            <option value="fast" ${settings.animation_speed === 'fast' ? 'selected' : ''}>Ускоренная</option>
          </select>
        </div>

        <button type="button" class="btn-secondary" id="save-settings-btn" style="margin-top: 1rem; width: 100%;">
          Сохранить настройки
        </button>
      </div>

      <!-- Блок аккаунта -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem;">
        <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-main);">Аккаунт</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Имя: <strong style="color: var(--text-main);">${user.username || 'Неизвестно'}</strong> 
          ${user.is_guest ? '<span style="color: var(--accent-gold);">(Гостевой аккаунт)</span>' : '(Постоянный аккаунт)'}
        </p>

        ${user.is_guest ? `
          <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem;">
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">Зарегистрируйте аккаунт, чтобы навсегда сохранить ваш прогресс и баланс:</p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <input type="text" id="reg-username" placeholder="Никнейм (3-20 символов)" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.5rem; border-radius: 6px; font-size: 0.85rem;">
              <input type="password" id="reg-password" placeholder="Пароль (от 8 символов)" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.5rem; border-radius: 6px; font-size: 0.85rem;">
              <button type="button" class="btn-secondary" id="register-btn" style="background-color: var(--accent-purple);">
                Зарегистрировать аккаунт
              </button>
            </div>
          </div>
        ` : `
          <button type="button" class="btn-secondary" id="logout-btn" style="border-color: #ef4444; color: #f87171;">
            Выйти из аккаунта
          </button>
        `}
      </div>
    `;

    // Обработчик сохранения настроек
    const saveBtn = contentEl.querySelector('#save-settings-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const soundChecked = contentEl.querySelector('#setting-sound').checked;
        const speedVal = contentEl.querySelector('#setting-speed').value;

        try {
          await apiRequest('/api/settings', 'PUT', {
            sound_enabled: soundChecked,
            animation_speed: speedVal
          });
          showNotification('Настройки успешно сохранены.', 'success');
        } catch (err) {
          showNotification(err.message || 'Ошибка сохранения настроек.', 'error');
        }
      });
    }

    // Обработчик регистрации гостя
    const regBtn = contentEl.querySelector('#register-btn');
    if (regBtn) {
      regBtn.addEventListener('click', async () => {
        const uInput = contentEl.querySelector('#reg-username').value.trim();
        const pInput = contentEl.querySelector('#reg-password').value.trim();

        if (!uInput || !pInput) {
          showNotification('Заполните никнейм и пароль.', 'warning');
          return;
        }

        try {
          await apiRequest('/api/auth/register', 'POST', {
            username: uInput,
            password: pInput
          });
          showNotification('Аккаунт успешно зарегистрирован!', 'success');
          // Перезагружаем страницу настроек для обновления статуса
          renderSettingsPage(containerEl);
        } catch (err) {
          showNotification(err.message || 'Ошибка регистрации.', 'error');
        }
      });
    }

    // Обработчик выхода
    const logoutBtn = contentEl.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await apiRequest('/api/auth/logout', 'POST', {});
          showNotification('Выход выполнен. Создан новый гость.', 'success');
          window.location.reload();
        } catch (err) {
          showNotification('Ошибка выхода.', 'error');
        }
      });
    }

  } catch (error) {
    console.error('Ошибка загрузки настроек:', error);
    contentEl.innerHTML = '<p style="color: #ef4444;">Не удалось загрузить настройки.</p>';
    showNotification('Ошибка загрузки настроек.', 'error');
  }
}
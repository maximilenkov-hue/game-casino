const VALID_SECTIONS = ['slots', 'leaderboard', 'inventory', 'settings'];

let currentSection = 'slots';
let sectionChangeHandler = null;

/**
 * Инициализирует нижнюю навигацию.
 * @param {(section: string) => void} onSectionChange - Колбэк, вызываемый при переключении раздела.
 * @param {string} [initialSection='slots'] - Первый активный экран при загрузке.
 */
export function initNavigation(onSectionChange, initialSection = 'slots') {
  sectionChangeHandler = onSectionChange;

  const navButtons = document.querySelectorAll('.nav-item[data-section]');
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetSection = button.getAttribute('data-section');
      if (targetSection) {
        navigateTo(targetSection);
      }
    });
  });

  const startSection = VALID_SECTIONS.includes(initialSection) ? initialSection : 'slots';
  navigateTo(startSection, true);
}

/**
 * Переключает активный раздел интерфейса.
 * @param {string} section
 * @param {boolean} [force=false]
 */
export function navigateTo(section, force = false) {
  if (!VALID_SECTIONS.includes(section)) {
    return;
  }

  if (!force && section === currentSection) {
    return;
  }

  currentSection = section;

  const navButtons = document.querySelectorAll('.nav-item[data-section]');
  navButtons.forEach((button) => {
    const isMatch = button.getAttribute('data-section') === section;
    button.classList.toggle('is-active', isMatch);

    if (isMatch) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  if (typeof sectionChangeHandler === 'function') {
    sectionChangeHandler(section);
  }
}

/**
 * Возвращает идентификатор текущего открытого раздела.
 * @returns {string}
 */
export function getCurrentSection() {
  return currentSection;
}
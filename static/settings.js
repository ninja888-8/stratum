import { API_URL, DIFFICULTY_ELO } from './constants.js';
import { onBoardThemeChange, onPieceThemeChange } from './theme.js';

export function openSettings() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    overlay.style.display = 'block';

    setTimeout(() => {
        overlay.classList.add('active');
        sidebar.classList.add('open');
    }, 10);
}

export function closeSettings() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('open');
    overlay.classList.remove('active');

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

/** 
 * sends appropriate stockfish ELO to backend 
 */
export async function onDifficultyChange() {
    const select = document.getElementById('engineSelect');
    localStorage.setItem('defaultEngineDifficulty', String(parseInt(select.value)));

    const stockfish_elo = DIFFICULTY_ELO[level] ?? null;

    await fetch(`${API_URL}/set_elo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockfish_elo }),
    });
}
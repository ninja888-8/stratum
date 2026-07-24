import { API_URL, DIFFICULTY_ELO } from './constants.js';
import { resetAllData } from './storage.js';
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
    const stockfish_elo = DIFFICULTY_ELO[parseInt(select.value)] ?? null;

    await fetch(`${API_URL}/set_elo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elo: stockfish_elo }),
    });
}

export function openResetConfirmation() {
    document.getElementById('resetModal').classList.remove('hidden');
}

export function onResetConfirmationBackdropClick(event) {
    if (event.target === document.getElementById('resetModal')) {
        document.getElementById('resetModal').classList.add('hidden');
    }
}

export function onResetConfirmed() {
    resetAllData();
}

export function onResetDenied() {
    document.getElementById('resetModal').classList.add('hidden');
}
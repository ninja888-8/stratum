import { getBoardTheme, setBoardTheme, getPieceTheme, setPieceTheme } from './storage.js';

export function applyBoardTheme(theme) {
    const dropdown = document.getElementById('boardThemeSelect');
    if (dropdown) dropdown.value = theme;
    // TODO: apply board CSS theme here
}

export function applyPieceTheme(theme) {
    const dropdown = document.getElementById('pieceThemeSelect');
    if (dropdown) dropdown.value = theme;
    // TODO: apply piece CSS theme here
}

export function onBoardThemeChange() {
    const dropdown = document.getElementById('boardThemeSelect');
    if (!dropdown) return;
    setBoardTheme(dropdown.value);
    applyBoardTheme(dropdown.value);
}

export function onPieceThemeChange() {
    const dropdown = document.getElementById('pieceThemeSelect');
    if (!dropdown) return;
    setPieceTheme(dropdown.value);
    applyPieceTheme(dropdown.value);
}

export function initTheme() {
    applyBoardTheme(getBoardTheme());
    applyPieceTheme(getPieceTheme());
}
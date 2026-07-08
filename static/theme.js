import { getBoardTheme, setBoardTheme, getPieceTheme, setPieceTheme } from './storage.js';

export function applyBoardTheme(theme) {
    const dropdown = document.getElementById('boardThemeSelect');
    if (dropdown) dropdown.value = theme;
    
    const root = document.documentElement;
    switch (theme) {
        case "classic":
            root.style.setProperty('--board-dark', "#b58863");
            root.style.setProperty('--board-light', "#f0d9b5");
            break;
        case "green":
            root.style.setProperty('--board-dark', "#0d4834");
            root.style.setProperty('--board-light', "#cfccc7");
            break;
        case "red":
            root.style.setProperty('--board-dark', "#d65252");
            root.style.setProperty('--board-light', "#cfccc7");
            break;
        case "blue":
            root.style.setProperty('--board-dark', "#3196ca");
            root.style.setProperty('--board-light', "#c3cdd7");
            break;
        case "purple":
            root.style.setProperty('--board-dark', "#967bb1");
            root.style.setProperty('--board-light', "#e1d6eb");
            break;
        default:
            root.style.setProperty('--board-dark', "#b58863");
            root.style.setProperty('--board-light', "#f0d9b5");
            break;
    }
}

export function applyPieceTheme(theme) {
    const dropdown = document.getElementById('pieceThemeSelect');
    if (dropdown) dropdown.value = theme;

    const root = document.documentElement;
    switch (theme) {
        case "white":
            root.style.setProperty('--board-highlight', "#ffffff");
            break;
        case "green":
            root.style.setProperty('--board-highlight', "#b2ffb6");
            break;
        case "red":
            root.style.setProperty('--board-highlight', "#ff8b8b");
            break;
        case "blue":
            root.style.setProperty('--board-highlight', "#6f91ff");
            break;
        case "purple":
            root.style.setProperty('--board-highlight', "#d09eff");
            break;
        case "none":
            root.style.setProperty('--board-highlight', "transparent");
            break;
        default:
            root.style.setProperty('--board-highlight', "#ffffff");
            break;
    }
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
import { NUM_LEVELS } from './constants.js';
import { getHighestBeatenLevel, setHighestBeatenLevel, getCurrentLevel, setCurrentLevel } from './storage.js';

export let currentLevel = 1;
let startingFEN = '';

export function getStartingFEN(fen) {
    return startingFEN;
}

export function setStartingFEN(fen) {
    startingFEN = fen;
}

export function selectLevel(levelId) {
    setCurrentLevel(levelId);
    currentLevel = levelId;

    const header = document.getElementById('level-number');
    if (header) header.textContent = `Level ${levelId}`;
}

export function unlockNextLevel() {
    const highestBeaten = getHighestBeatenLevel();
    if (currentLevel > highestBeaten) {
        setHighestBeatenLevel(currentLevel);
    }
}

export function goToNextLevel() {
    const modal = document.getElementById('gameOverModal');
    if (modal) modal.classList.add('hidden');
    const buttons = document.querySelectorAll('.level-btn');
    buttons[currentLevel].click();
}

export function openLevelSidebar() {
    const sidebar = document.getElementById('levelSidebar');
    const overlay = document.getElementById('levelOverlay');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('active');
        sidebar.classList.add('open');
    }, 10);
}

export function closeLevelSidebar() {
    const sidebar = document.getElementById('levelSidebar');
    const overlay = document.getElementById('levelOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

export function populateLevelGrid(onLevelClick) {
    const grid = document.getElementById('levelGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const highestBeaten = getHighestBeatenLevel();
    currentLevel = getCurrentLevel();

    for (let i = 1; i <= NUM_LEVELS; i++) {
        const btn = document.createElement('button');
        btn.classList.add('level-btn');

        // lvl 1 always unlocked, rest dependent on highest level beaten
        const isUnlocked = i === 1 || i <= highestBeaten + 1;

        if (isUnlocked) {
            btn.textContent = String(i);

            // highlight the next level the player hasn't beaten yet
            if (i === highestBeaten + 1) btn.classList.add('current-unlocked');

            btn.onclick = () => {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                onLevelClick(i);
                closeLevelSidebar();
            };
        } else {
            btn.textContent = '🔒';
            btn.classList.add('locked');
            btn.disabled = true;
        }

        grid.appendChild(btn);
    }

    const levels = document.querySelectorAll('.level-btn');
    levels[currentLevel-1]?.classList.add('active');
}
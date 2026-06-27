import { NUM_LEVELS } from './constants.js';
import { initStorage, getHighestBeatenLevel, getDifficultyStarsEarned, getChallengeStarsEarned } from './storage.js';
import { initTheme, onBoardThemeChange, onPieceThemeChange } from './theme.js';
import { populateLevelGrid, selectLevel, openLevelSidebar, closeLevelSidebar } from './levels.js';
import { openSettings, closeSettings } from './settings.js';

function openInstructions() {
    document.getElementById('instructionsModal').classList.remove('hidden');
}

function closeInstructions() {
    document.getElementById('instructionsModal').classList.add('hidden');
}

function onInstructionsBackdropClick(event) {
    if (event.target === document.getElementById('instructionsModal')) {
        closeInstructions();
    }
}

function updateMenuMetrics() {
    const highestBeatenLevel = Math.min(NUM_LEVELS, getHighestBeatenLevel() + 1);
    const difficultyStarsEarned = getDifficultyStarsEarned();
    const challengeStarsEarned = getChallengeStarsEarned();

    const currentProgress = (100.0 * (challengeStarsEarned+difficultyStarsEarned) / (6 * NUM_LEVELS)).toFixed(2);

    document.getElementById('level-indicator').textContent = `${highestBeatenLevel} / ${NUM_LEVELS}`;
    document.getElementById('difficulty-star-indicator').textContent = `★ ${String(difficultyStarsEarned).padStart(2, '0')}`;
    document.getElementById('challenge-star-indicator').textContent = `★ ${String(challengeStarsEarned).padStart(2, '0')}`;
    document.getElementById('progress-text').textContent = `${currentProgress}%`;
    document.getElementById('progress-bar').style.width = `${currentProgress}%`;
}

function initMenuPage() {
    initStorage();
    initTheme();

    // onclick of one of the level buttons
    populateLevelGrid((levelId) => {
        selectLevel(levelId);
        window.location.replace('game');
    });

    updateMenuMetrics();

    // ---------- event listeners! ----------

    // instructions
    document.getElementById('instructions-btn').addEventListener('click', openInstructions);
    document.getElementById('close-instructions-btn').addEventListener('click', closeInstructions);
    document.getElementById('instructionsModal').addEventListener('click', onInstructionsBackdropClick);

    // settings
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings-btn').addEventListener('click', closeSettings);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSettings);

    // themes
    document.getElementById('boardThemeSelect').addEventListener('change', onBoardThemeChange);
    document.getElementById('pieceThemeSelect').addEventListener('change', onPieceThemeChange);

    // level select
    document.getElementById('level-select-btn').addEventListener('click', openLevelSidebar);
    document.getElementById('close-level-btn').addEventListener('click', closeLevelSidebar);
    document.getElementById('levelOverlay').addEventListener('click', closeLevelSidebar);
}

initMenuPage();
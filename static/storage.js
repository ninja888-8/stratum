import { NUM_LEVELS } from './constants.js';

function getInt(key, fallback = 0) {
    const raw = localStorage.getItem(key);
    const parsed = parseInt(raw);
    return isNaN(parsed) ? fallback : parsed;
}

function setInt(key, value) {
    localStorage.setItem(key, String(value));
}

function getString(key, fallback = '') {
    return localStorage.getItem(key) ?? fallback;
}

function setString(key, value) {
    localStorage.setItem(key, value);
}

function getBool(key, fallback = false) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1' || raw === 'true';
}

function setBool(key, value) {
    localStorage.setItem(key, value ? '1' : '0');
}

function getJSON(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getHighestBeatenLevel() {
    return getInt('highestBeatenLevel', 0);
}

export function setHighestBeatenLevel(level) {
    setInt('highestBeatenLevel', level);
}

export function getCurrentLevel() {
    return getInt('currentLevel', 0);
}

export function setCurrentLevel(level) {
    setInt('currentLevel', level);
}

export function getDifficultyStarsEarned() {
    return getInt('difficultyStarsEarned', 0);
}

export function setDifficultyStarsEarned(stars) {
    setInt('difficultyStarsEarned', stars);
}

export function getChallengeStarsEarned() {
    return getInt('challengeStarsEarned', 0);
}

export function setChallengeStarsEarned(stars) {
    setInt('challengeStarsEarned', stars);
}

export function getDifficultyStarsArray() {
    return getJSON('difficultyStarsArray', Array(NUM_LEVELS).fill(0));
}

export function setDifficultyStarsArray(arr) {
    setJSON('difficultyStarsArray', arr);
}

function setLevelChallenges(arr) {
    setJSON('levelChallenges', arr);
}

export function isChallengeComplete(levelId, challengeIndex) {
    return parseInt(getJSON('levelChallenges', Array(NUM_LEVELS).fill(0))[levelId-1]) & (1 << (challengeIndex-1));
}

export function markChallengeComplete(levelId, challengeIndex) {
    let array = getJSON('levelChallenges', Array(NUM_LEVELS).fill(0));
    array[levelId-1] += (1 << (challengeIndex-1));
    setJSON('levelChallenges', array);
}

export function getBoardTheme() {
    return getString('selectedBoardTheme', 'classic');
}

export function setBoardTheme(theme) {
    setString('selectedBoardTheme', theme);
}

export function getPieceTheme() {
    return getString('selectedPieceTheme', 'white');
}

export function setPieceTheme(theme) {
    setString('selectedPieceTheme', theme);
}

export function getBackgroundColor() {
    return getString('selectedBackgroundColor', '#ffffff');
}

export function setBackgroundColor(color) {
    setString('selectedBackgroundColor', color);
}

export function getBackgroundTheme() {
    return getString('selectedBackgroundTheme', 'space');
}

export function setBackgroundTheme(theme) {
    setString('selectedBackgroundTheme', theme);
}

export function getModifierList() {
    return getInt('modifiersList', 0);
}

export function setModifiersList(modifiers) {
    setInt('modifiersList', modifiers);
}

export function hasUsedUndo() {
    return getBool('usedUndo', false);
}

export function setUsedUndo(value) {
    setBool('usedUndo', value);
}

export function hasUsedRemovePiece() {
    return getBool('usedRemovePiece', false);
}

export function setUsedRemovePiece(value) {
    setBool('usedRemovePiece', value);
}

export function isInGame() {
    return getBool('inGame', false);
}

export function setInGame(value) {
    setBool('inGame', value);
}

export function getCurrentFEN() {
    return getString('currentFEN', '');
}

export function setCurrentFEN(fen) {
    setString('currentFEN', fen);
}

export function initStorage() {
    if (localStorage.getItem('highestBeatenLevel') === null)        setHighestBeatenLevel(0);
    if (localStorage.getItem('selectedBoardTheme') === null)        setBoardTheme('classic');
    if (localStorage.getItem('selectedPieceTheme') === null)        setPieceTheme('white');
    if (localStorage.getItem('selectedBackgroundColor') === null)   setBackgroundColor('#ffffff');
    if (localStorage.getItem('selectedBackgroundTheme') === null)   setBackgroundTheme('space');
    if (localStorage.getItem('difficultyStarsEarned') === null)     setDifficultyStarsEarned(0);
    if (localStorage.getItem('challengeStarsEarned') === null)      setChallengeStarsEarned(0);
    if (localStorage.getItem('difficultyStarsArray') === null)      setDifficultyStarsArray(Array(NUM_LEVELS).fill(0));
    if (localStorage.getItem('levelChallenges') === null)           setLevelChallenges(Array(NUM_LEVELS).fill(0));

    if (localStorage.getItem('currentFEN') === null)                setCurrentFEN('');
    if (localStorage.getItem('currentLevel') === null)              setCurrentLevel(0);
}
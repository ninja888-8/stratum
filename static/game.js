import { API_URL, NUM_LEVELS, PIECE_MAP, STARTING_POSITIONS, CHALLENGES } from './constants.js';
import {
    initStorage,
    isInGame, setInGame,
    getCurrentLevel, getCurrentFEN, setCurrentFEN,
    getChallengeStarsEarned, setChallengeStarsEarned,
    getDifficultyStarsEarned, setDifficultyStarsEarned,
    getDifficultyStarsArray, setDifficultyStarsArray,
    isChallengeComplete, markChallengeComplete,
} from './storage.js';
import { initTheme, onBoardThemeChange, onPieceThemeChange } from './theme.js';
import {
    currentLevel, selectLevel, unlockNextLevel, goToNextLevel,
    populateLevelGrid, openLevelSidebar, closeLevelSidebar,
} from './levels.js';
import { initModifiers, resetModifiers, difficultyMultiplier, extraPieceSelected } from './modifiers.js';
import { openSettings, closeSettings, onDifficultyChange } from './settings.js';

const boardElement = document.getElementById('chessboard');
let selectedSquare = null;
let isGameConfirmed = false;

function createBoard() {
    boardElement.innerHTML = '';

    boardElement.onclick = (e) => {
        if (!isGameConfirmed) {
            confirmSettings();
            resetGame();
            e.stopPropagation();
        }
    };

    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;

        const square = document.createElement('div');
        square.classList.add('square', (row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.index = i;
        square.dataset.file = String.fromCharCode(97 + col);
        square.dataset.rank = String(8 - row);

        square.addEventListener('click', () => {
            if (isGameConfirmed) handleSquareClick(square);
        });

        boardElement.appendChild(square);
    }
}

async function updateBoard(fromPreviousFEN = false) {
    const response = await fetch(`${API_URL}/state`);
    const data = await response.json();

    const fenRows = fromPreviousFEN
        ? getCurrentFEN().split(' ')[0].split('/')
        : data.fen.split(' ')[0].split('/');

    if (!fromPreviousFEN) setCurrentFEN(data.fen);

    // Expand FEN rows into a flat 64-element array of piece characters
    const flatBoard = [];
    for (const row of fenRows) {
        for (const char of row) {
            if (isNaN(char)) flatBoard.push(char);
            else for (let i = 0; i < parseInt(char); i++) flatBoard.push('.');
        }
    }

    const squares = document.querySelectorAll('.square');
    flatBoard.forEach((piece, idx) => {
        squares[idx].textContent = PIECE_MAP[piece] ?? '';

        // Highlight king in check
        const inCheck = data.is_check;
        if (piece === 'k' && inCheck === 'b') squares[idx].classList.add('check');
        else if (piece === 'K' && inCheck === 'w') squares[idx].classList.add('check');
        else squares[idx].classList.remove('check');
    });

    document.getElementById('status').innerText = data.status_text;

    if (data.is_game_over) {
        const playerWon = data.turn === 'b';
        if (playerWon) {
            unlockNextLevel();
            populateLevelGrid(_gameLevelClickHandler);
            _recordCompletions();
            updateChallengePanel(currentLevel);
        }
        showGameOverModal(playerWon, document.getElementById('engineSelect').value);
        return true;
    }

    return false;
}

async function handleSquareClick(square) {
    const response = await fetch(`${API_URL}/state`);
    const data = await response.json();

    if (selectedSquare) {
        const from = selectedSquare.dataset.file + selectedSquare.dataset.rank;
        const to = square.dataset.file + square.dataset.rank;

        // Clicking the already-selected square deselects it
        if (from === to) {
            _clearSelection();
            return;
        }

        let isGameOver = false;

        const isPawnPromotion =
            (selectedSquare.textContent === '♟' && square.dataset.rank === '1') ||
            (selectedSquare.textContent === '♙' && square.dataset.rank === '8');

        if (isPawnPromotion) {
            const isLegal = await _checkLegalMove(from, to, 'q');
            if (isLegal) {
                await _showPromotionDialog(from, to, data.turn);
                _clearSelection();
            }
        } else {
            const isLegal = await _checkLegalMove(from, to, '');
            if (isLegal) {
                await _sendMove(from, to, '');
                isGameOver = await updateBoard(false);
                _clearSelection();
            }
        }

        const updated = await (await fetch(`${API_URL}/state`)).json();
        selectedSquare.classList.remove('selected');

        if (isGameOver) _clearSelection();
        else await _selectSquare(square, updated);

    } else {
        await _selectSquare(square, data);
    }
}

async function _selectSquare(square, gameState) {
    _clearSelection();

    if (!square.textContent || !_isCurrentPlayerPiece(square, gameState)) {
        selectedSquare = null;
        return;
    }

    selectedSquare = square;
    square.classList.add('selected');

    const legalMoves = await (await fetch(`${API_URL}/legal_moves`)).json();
    const squares = document.querySelectorAll('.square');

    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const file = String.fromCharCode(97 + col);
        const rank = String(8 - row);

        const from = square.dataset.file + square.dataset.rank;
        const to = file + rank;

        const promotionSuffix =
            (square.textContent === '♟' && rank === '1') ||
            (square.textContent === '♙' && rank === '8') ? 'q' : '';

        if (legalMoves.includes(from + to + promotionSuffix)) {
            squares[i].classList.add('moveable');
        }
    }
}

function _clearSelection() {
    selectedSquare?.classList.remove('selected');
    selectedSquare = null;
    document.querySelectorAll('.square').forEach(s => s.classList.remove('moveable'));
}

/** Returns true if the piece on `square` belongs to the player whose turn it is. */
function _isCurrentPlayerPiece(square, gameState) {
    const whiteUnicode = new Set(['♖', '♘', '♗', '♕', '♔', '♙']);
    const isWhite = whiteUnicode.has(square.textContent);
    return (gameState.turn === 'w' && isWhite) || (gameState.turn === 'b' && !isWhite);
}

async function _checkLegalMove(from, to, promotion) {
    const res = await fetch(`${API_URL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, promotion }),
    });
    const data = await res.json();
    return data.success;
}

async function _sendMove(from, to, promotion) {
    await fetch(`${API_URL}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, promotion }),
    });
    await _requestStockfishMove();
}

async function _showPromotionDialog(from, to, turn) {
    const isWhite = turn === 'w';
    const symbols = isWhite
        ? ['♕', '♖', '♗', '♘']
        : ['♛', '♜', '♝', '♞'];
    const pieces  = ['q', 'r', 'b', 'n'];

    const options = document.querySelectorAll('.promotion-option');
    options.forEach((btn, i) => { btn.textContent = symbols[i]; });

    document.getElementById('promotionOverlay').style.display = 'flex';

    options.forEach((btn, i) => {
        btn.onclick = async () => {
            document.getElementById('promotionOverlay').style.display = 'none';
            const isLegal = await _checkLegalMove(from, to, pieces[i]);
            if (isLegal) {
                await _sendMove(from, to, pieces[i]);
                await updateBoard(false);
            }
        };
    });
}

async function _requestStockfishMove() {
    document.getElementById('status').innerText = 'Stockfish is thinking…';
    try {
        const res = await fetch(`${API_URL}/stockfish_move`, { method: 'POST' });
        const data = await res.json();
        if (data.success) await updateBoard(false);
        else console.warn('Stockfish failed to move:', data.message);
    } catch (err) {
        console.error('Error requesting Stockfish move:', err);
    }
}

async function resetGame() {
    document.getElementById('gameOverModal')?.classList.add('hidden');

    document.querySelectorAll('.square').forEach(s => {
        s.classList.remove('moveable', 'selected');
    });

    const fen = STARTING_POSITIONS[currentLevel - 1];

    await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, extraPiece: extraPieceSelected }),
    });

    await updateBoard(false);
}

async function undoMove() {
    await fetch(`${API_URL}/undo`, { method: 'POST' });
    await updateBoard(false);
}

function confirmSettings() {
    isGameConfirmed = true;
    boardElement.classList.remove('pending-confirmation');
    setInGame(true);

    const engineSelect = document.getElementById('engineSelect');
    if (engineSelect) engineSelect.disabled = true;

    const newGameBtn = document.getElementById('new-game');
    if (newGameBtn) newGameBtn.disabled = false;

    document.querySelectorAll('.console-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor  = 'not-allowed';
    });
}

function releaseSettings() {
    isGameConfirmed = false;
    boardElement.classList.add('pending-confirmation');
    setInGame(false);

    const engineSelect = document.getElementById('engineSelect');
    if (engineSelect) engineSelect.disabled = false;

    const newGameBtn = document.getElementById('new-game');
    if (newGameBtn) newGameBtn.disabled = true;

    document.querySelectorAll('.console-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
    });
}

export function updateChallengePanel(levelId) {
    const descriptions = document.getElementsByClassName('challenge-desc');
    const levelChallenges = CHALLENGES[levelId - 1] ?? [];

    for (let i = 0; i < 3; i++) {
        if (descriptions[i]) descriptions[i].textContent = levelChallenges[i] ?? '';
    }

    for (let c = 1; c <= 3; c++) {
        const card = document.getElementById(`challenge-${c}`);
        const statusText = card?.querySelector('.challenge-status');
        const completed = isChallengeComplete(levelId, c);

        card?.classList.toggle('completed', completed);
        if (statusText) statusText.innerText = completed ? 'Completed' : 'Locked';
    }
}

function _recordCompletions() {
    const difficulty = document.getElementById('engineSelect')?.value;
    const numActiveMods = document.querySelectorAll('.console-btn.active-toggle').length;
    const hasExtraPiece = extraPieceSelected != null && extraPieceSelected !== 'none';
    let newChallenges = 0;

    // beat on ⭐ with an extra piece
    if (difficulty === '1' && hasExtraPiece && !isChallengeComplete(currentLevel, 1)) {
        markChallengeComplete(currentLevel, 1);
        newChallenges++;
    }
    // beat on ⭐⭐ with no modifiers
    if (difficulty === '2' && numActiveMods === 0 && !hasExtraPiece && !isChallengeComplete(currentLevel, 2)) {
        markChallengeComplete(currentLevel, 2);
        newChallenges++;
    }
    // beat on ⭐⭐⭐ with extra piece + at least 1 other modifier
    if (difficulty === '3' && hasExtraPiece && numActiveMods >= 1 && !isChallengeComplete(currentLevel, 3)) {
        markChallengeComplete(currentLevel, 3);
        newChallenges++;
    }

    setChallengeStarsEarned(getChallengeStarsEarned() + newChallenges);

    // Update difficulty stars only if player beat their personal best for this level
    const diffStarsArray = getDifficultyStarsArray();
    const prevBest = diffStarsArray[currentLevel - 1] ?? 0;
    const thisRun = parseInt(difficulty);

    if (thisRun > prevBest) {
        setDifficultyStarsEarned(getDifficultyStarsEarned() + (thisRun - prevBest));
        diffStarsArray[currentLevel - 1] = thisRun;
        setDifficultyStarsArray(diffStarsArray);
    }
}
function showGameOverModal(playerWon, difficulty) {
    const DIFFICULTY_LABELS = { '1': 'intermediate', '2': 'advanced', '3': 'expert' };
    const modal = document.getElementById('gameOverModal');

    const statusHeader = document.getElementById('modalStatus');
    statusHeader.innerText = playerWon ? 'LEVEL PASSED' : 'LEVEL FAILED';
    statusHeader.className = `modal-title ${playerWon ? 'passed' : 'failed'}`;

    document.getElementById('modalDifficulty').innerText =
        DIFFICULTY_LABELS[difficulty] ?? '[difficulty]';

    document.querySelectorAll('.stars-container .star').forEach(star => {
        const starRating = parseInt(star.getAttribute('data-star'));
        star.classList.toggle('lit', playerWon && starRating <= parseInt(difficulty));
    });

    const modifiersList = document.getElementById('modalModifiers');
    modifiersList.innerHTML = '';

    const activeModifiers = document.querySelectorAll('.console-btn.active-toggle');
    if (activeModifiers.length === 0) {
        const li = document.createElement('li');
        li.innerText = 'None (Standard Match)';
        modifiersList.appendChild(li);
    } else {
        activeModifiers.forEach(btn => {
            const li = document.createElement('li');
            li.innerText = (btn.getAttribute('data-tooltip') || btn.id.replace('btn-', '')).split('.')[0];
            modifiersList.appendChild(li);
        });
    }

    modal.classList.remove('hidden');
}

function _gameLevelClickHandler(levelId) {
    selectLevel(levelId);
    updateChallengePanel(levelId);
    resetModifiers();
    resetGame();
    releaseSettings();
}

function initGamePage() {
    initStorage();
    initTheme();
    initModifiers();

    populateLevelGrid(_gameLevelClickHandler);
    createBoard();
    updateBoard(getCurrentFEN() != ''); // restore FEN from previous session if present

    const savedLevel = getCurrentLevel() ?? 1;
    if (savedLevel) {
        selectLevel(savedLevel);
        updateChallengePanel(savedLevel);
    }

    if (isInGame()) confirmSettings();
    else releaseSettings();

    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings-btn').addEventListener('click', closeSettings);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSettings);

    document.getElementById('level-select-btn').addEventListener('click', openLevelSidebar);
    document.getElementById('close-level-btn').addEventListener('click', closeLevelSidebar);
    document.getElementById('levelOverlay').addEventListener('click', closeLevelSidebar);

    document.getElementById('boardThemeSelect').addEventListener('change', onBoardThemeChange);
    document.getElementById('pieceThemeSelect').addEventListener('change', onPieceThemeChange);

    document.getElementById('engineSelect').addEventListener('change', onDifficultyChange);

    document.getElementById('new-game').addEventListener('click', () => { resetGame(); releaseSettings(); });
    document.getElementById('undo-btn').addEventListener('click', () => { undoMove(); undoMove(); });

    document.getElementById('play-again-btn').addEventListener('click', () => { resetGame(); releaseSettings(); });
    document.getElementById('next-level-btn').addEventListener('click', () => { goToNextLevel(); resetModifiers(); resetGame(); releaseSettings(); });

    document.getElementById('home-btn').addEventListener('click', () => { window.location.href = '/'; });
}

initGamePage();
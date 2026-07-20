import { API_URL, NUM_LEVELS, PIECE_MAP, STARTING_POSITIONS, CHALLENGES, CHALLENGES_REQUIRED_MODIFIERS_LIST, CHALLENGES_REQUIRED_DIFFICULTY_MULTIPLIER} from './constants.js';
import {
    initStorage,
    isInGame, setInGame,
    getCurrentLevel, getCurrentFEN, setCurrentFEN,
    getChallengeStarsEarned, setChallengeStarsEarned,
    getDifficultyStarsEarned, setDifficultyStarsEarned,
    getDifficultyStarsArray, setDifficultyStarsArray,
    getModifierList,
    isChallengeComplete, markChallengeComplete,
} from './storage.js';
import { initTheme, onBackgroundColorChange, onBackgroundThemeChange, onBoardThemeChange, onPieceThemeChange } from './theme.js';
import {
    currentLevel, selectLevel, unlockNextLevel, goToNextLevel,
    populateLevelGrid, openLevelSidebar, closeLevelSidebar,
    getStartingFEN,
} from './levels.js';
import { useUndoButton, useExtraPlayerMoves, useRemovePiece, 
         initModifiers, resetModifiers, setUpModifierButtons,
         difficultyMultiplier, extraPieceSelected, undoButtonReleased, bannedPieces, extraPlayerMoves, canRemoveOpponentPiece, 
         scrambleFirstRank, removeHalfPieces, movePiecesUp, reflectFirstRanks, noPromotion, extraEngineMoves, removeFourPieces,
         applyExtraPiece, applyScramble, applyRemovePieces, applyMovePiecesUp, applyReflectFirstRanks,
} from './modifiers.js';
import { openSettings, closeSettings, onDifficultyChange } from './settings.js';

const boardElement = document.getElementById('chessboard');
let selectedSquare = null;
let isGameConfirmed = false;

let removePieceMode = false; // modifier 8: true while awaiting opponent piece click

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
    const legalMoves = await (await fetch(`${API_URL}/legal_moves`)).json();

    if (data.is_game_over) {
        const playerWon = data.turn === 'b';
        if (playerWon) {
            unlockNextLevel();
            populateLevelGrid(_gameLevelClickHandler);
            _recordCompletions();
            updateChallengePanel();
        }
        showGameOverModal(playerWon, document.getElementById('engineSelect').value);
        return true;
    }
    else {
        // check if due to modifier, is stalemate or checkmate
        for (let i = 0; i < legalMoves.length; i++) {
            let file = legalMoves[i].charCodeAt(0) - "a".charCodeAt(0);
            let rank = parseInt(legalMoves[i][1]);
            if (!bannedPieces.includes(squares[file + 8*(8-rank)].textContent)) return false;
        }
        const playerWon = data.is_check != "w";
        if (playerWon) {
            unlockNextLevel();
            populateLevelGrid(_gameLevelClickHandler);
            _recordCompletions();
            updateChallengePanel();
        }
        showGameOverModal(playerWon, document.getElementById('engineSelect').value);
        return true;
    }
}

async function handleSquareClick(square) {
    // modifier 8 remove one of the opponent's pieces
    if (canRemoveOpponentPiece && removePieceMode) {
        if (await _handleSquareRemoveClick(square)) useRemovePiece();
        return;
    }

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
            if (bannedPieces.includes(selectedSquare.textContent)) return;

            // modifier 18 no pawn promotion
            if (noPromotion) {
                return;
            }

            const isLegal = await _checkLegalMove(from, to, 'q');
            if (isLegal && square.textContent != '♚') {
                await _showPromotionDialog(from, to, data.turn);
                _clearSelection();
            }
        } else {
            const isLegal = await _checkLegalMove(from, to, '');
            if (isLegal && square.textContent != '♚') {
                if (bannedPieces.includes(selectedSquare.textContent)) return;

                await _sendMove(from, to, '');
                isGameOver = await updateBoard(false);
                _clearSelection();
            }
            else if (_isCurrentPlayerPiece(square, data)) {
                _clearSelection();
                _selectSquare(square, data);
            }
        }
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

    // cannot move piece due to modifier
    if (bannedPieces.includes(selectedSquare.textContent)) return;

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

        // hide promotion as legal move if modifier 18
        if (promotionSuffix && noPromotion) continue;

        if (legalMoves.includes(from + to + promotionSuffix) && squares[i].textContent != '♚') {
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

function _isOpponentPiece(square, gameState) {
    return square.textContent !== '' && !_isCurrentPlayerPiece(square, gameState);
}

/** highlights all enemy pieces and waits for a click to remove the piece */
function _enterRemovePieceMode() {
    removePieceMode = true;
    _setStatus('Click an opponent piece to remove it from the game (takes up your turn). Click elsewhere on the board to cancel.');
 
    // highlight all non-king opponent pieces
    document.querySelectorAll('.square').forEach(sq => {
        const blackUnicode = new Set(['♜', '♞', '♝', '♛', '♟']);
        if (blackUnicode.has(sq.textContent)) sq.classList.add('moveable');
    });
}

/** called when the player clicks a square while removing a piece */
async function _handleSquareRemoveClick(square) {
    const blackUnicode = new Set(['♜', '♞', '♝', '♛', '♚', '♟']);
    removePieceMode = false;
    document.querySelectorAll('.square').forEach(s => s.classList.remove('moveable'));

    // Only allow removing actual enemy pieces (not the king)
    if (!blackUnicode.has(square.textContent) || square.textContent === '♚') {
        _setStatus('Select a valid opponent piece to remove (not the King). Try again by pressing the button.');
        return false; // didn't go through; do it later
    }
 
    const file = square.dataset.file;
    const rank = square.dataset.rank;
 
    await fetch(`${API_URL}/remove_piece`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ square: file + rank }),
    });
 
    await updateBoard(false);
    _setStatus("piece removed! stockfish turn!");

    await fetch(`${API_URL}/skip_move`, { method: 'POST' });
    await updateBoard(false);

    await _requestStockfishMove();
    await updateBoard();

    return true;
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
    
    // modifier 6, skip stockfish move
    if (extraPlayerMoves > 0) {
        useExtraPlayerMoves();
        if (extraPlayerMoves > 0) {
            _setStatus(`bonus move! ${extraPlayerMoves} extra move(s) remaining.`);
        } else {
            _setStatus("last bonus move used.");
        }
        await fetch(`${API_URL}/skip_move`, { method: 'POST' });
        await updateBoard(false);
    } else {
        _clearSelection();
        await updateBoard(false);
        await _requestStockfishMove();
    }
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

async function _requestStockfishMove(count = 1) {
    document.getElementById('status').innerText = 'Stockfish is thinking…';
    for (let i = 0; i < count; i++) {
        if (count > 1) {
            await fetch(`${API_URL}/skip_move`, { method: 'POST' });
        }
        try {
            const res = await fetch(`${API_URL}/stockfish_move`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const isOver = await updateBoard(false);
                if (isOver) return;
            }
            else console.warn('Stockfish failed to move:', data.message);
        } catch (err) {
            console.error('Error requesting Stockfish move:', err);
        }
    }
}

async function newGame() {
    // just sets up default position, without modifiers
    document.getElementById('gameOverModal')?.classList.add('hidden');

    document.querySelectorAll('.square').forEach(s => {
        s.classList.remove('moveable', 'selected');
    });

    const fen = STARTING_POSITIONS[currentLevel-1];
    await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, extraPiece: null }),
    });

    await updateBoard(false);
}

async function resetGame() {
    document.getElementById('gameOverModal')?.classList.add('hidden');

    document.querySelectorAll('.square').forEach(s => {
        s.classList.remove('moveable', 'selected');
    });

    let fen = getStartingFEN();

    // modifiers 1-5: add a piece to 2nd or 3rd rank
    if (extraPieceSelected != null) fen = applyExtraPiece(fen);

    // modifier 9: scramble first rank
    if (scrambleFirstRank) fen = applyScramble(fen);

    // modifier 10: remove half of both sides' pieces (rounded up)
    if (removeHalfPieces) {
        fen = applyRemovePieces(fen, -1, "w");
        fen = applyRemovePieces(fen, -1, "b");
    }

    // modifier 11: move white's pieces up a rank
    if (movePiecesUp) {
        fen = applyMovePiecesUp(fen);
    }

    // modifier 12: reflect both sides' first rank pieces
    if (reflectFirstRanks) {
        fen = applyReflectFirstRanks(fen);
    }
 
    // modifier 20: remove four white pieces
    if (removeFourPieces) fen = applyRemovePieces(fen, 4, "w");

    await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen }),
    });

    await updateBoard(false);
 
    // modifier 15: engine fires extra moves at the start before the player goes
    if (extraEngineMoves > 0) {
        _setStatus(`stockfish is making ${extraEngineMoves} opening move(s)...`);
        await _requestStockfishMove(extraEngineMoves);
    }
 
    // modifier 6: inform player of their bonus moves
    if (extraPlayerMoves > 0) {
        _setStatus(`you have ${extraPlayerMoves} free move(s) before Stockfish moves.`);
    }
}

async function undoMove() {
    if (undoButtonReleased) {
        const response = await fetch(`${API_URL}/undo`, { method: 'POST' });
        const data = await response.json();

        await fetch(`${API_URL}/undo`, { method: 'POST' });
        await updateBoard(false);
        if (data.success) // successfully undid move
            useUndoButton();
    }
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

    setUpModifierButtons(); // initialize modifier buttons once everything set up
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
        btn.style.cursor = 'pointer';
    });
}

function _setStatus(text) {
    document.getElementById('status').innerText = text;
}

export function updateChallengePanel() {
    const descriptions = document.getElementsByClassName('challenge-desc');

    for (let i = 0; i < 3; i++) {
        const stars = "⭐".repeat(i+1);
        const requiredDifficulty = CHALLENGES_REQUIRED_DIFFICULTY_MULTIPLIER[currentLevel-1][i].toFixed(2);
        let array = [];
        for (let idx = 0; idx < 20; idx++) {
            if (CHALLENGES_REQUIRED_MODIFIERS_LIST[currentLevel-1][i] != -1 && CHALLENGES_REQUIRED_MODIFIERS_LIST[currentLevel-1][i] & (1 << idx)) {
                const modifierNumber = idx+1;
                const styling = (getModifierList() & (1 << idx)) ? " style=\"color: #5ff184;\"" : "";
                const str = `<span${styling}>#${modifierNumber}</span>`;
                array.push(str);
            }
        }
        if (requiredDifficulty != 0 && difficultyMultiplier >= requiredDifficulty) {
            const styling = " style=\"color: #5ff184;\"";
            array.push(`<span${styling}>${requiredDifficulty} difficulty multiplier</span>`);
        }
        else if (requiredDifficulty != 0) {
            const styling = "";
            array.push(`<span${styling}>${requiredDifficulty} difficulty multiplier</span>`);
        }
        const list = array.join(', ');
        if (descriptions[i]) {
            if (array.length == 0)
                descriptions[i].innerHTML = `Pass ${stars} with no modifiers enabled`;
            else if (array.length == 1 && requiredDifficulty != 0) 
                descriptions[i].innerHTML = `Pass ${stars} with at least a ${list}`;
            else if (array.length == 1)
                descriptions[i].innerHTML = `Pass ${stars} with only modifier ${list}`;
            else if (array.length > 1)
                descriptions[i].innerHTML = `Pass ${stars} with only modifiers ${list}`;
        }
    }

    for (let c = 1; c <= 3; c++) {
        const card = document.getElementById(`challenge-${c}`);
        const statusText = card?.querySelector('.challenge-status-green') || card?.querySelector('.challenge-status') || card?.querySelector('.challenge-status-red');
        const completed = isChallengeComplete(currentLevel, c);

        card?.classList.toggle('completed', completed);
        if (statusText) statusText.innerText = completed ? 'Completed' : 'Locked';
    }
}

function _recordCompletions() {
    const difficulty = document.getElementById('engineSelect')?.value;
    const numActiveMods = document.querySelectorAll('.console-btn.active-toggle').length;
    const hasExtraPiece = extraPieceSelected != null;
    let newChallenges = 0;

    let challengePassed = [false, false, false];
    for (let i = 0; i < 3; i++) {
        if ((getModifierList() === CHALLENGES_REQUIRED_MODIFIERS_LIST[currentLevel-1][i] 
            || (CHALLENGES_REQUIRED_MODIFIERS_LIST[currentLevel-1][i] == -1 && difficultyMultiplier >= CHALLENGES_REQUIRED_DIFFICULTY_MULTIPLIER[currentLevel-1][i].toFixed(2))) 
            && parseInt(difficulty) === i+1) {
            challengePassed[i] = true;
        }
    }

    // mark newly earned challenge completions
    for (let i = 0; i < 3; i++) {
        if (challengePassed[i] && !isChallengeComplete(currentLevel, i+1)) {
            markChallengeComplete(currentLevel, i+1);
            newChallenges++;
        }
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
    const DIFFICULTY_LABELS = { '1': 'beginner', '2': 'intermediate', '3': 'advanced' };
    const modal = document.getElementById('gameOverModal');

    const statusHeader = document.getElementById('modalStatus');
    statusHeader.innerText = playerWon ? 'LEVEL PASSED' : 'LEVEL FAILED';
    statusHeader.className = `modal-title ${playerWon ? 'passed' : 'failed'}`;

    document.getElementById('modalDifficulty').innerText = DIFFICULTY_LABELS[difficulty] ?? '[difficulty]';
    document.getElementById('modalMultiplier').innerText = difficultyMultiplier.toFixed(2) ?? '[difficulty]';

    document.querySelectorAll('.stars-container .star').forEach(star => {
        const starRating = parseInt(star.getAttribute('data-star'));
        star.classList.toggle('lit', playerWon && starRating <= parseInt(difficulty));
    });

    const modifiersList = document.getElementById('modalModifiers');
    modifiersList.innerHTML = '';

    const activeModifiers = document.querySelectorAll('.console-btn.active-toggle');
    if (activeModifiers.length === 0) {
        const li = document.createElement('li');
        li.innerText = 'None';
        modifiersList.appendChild(li);
    } else {
        activeModifiers.forEach(btn => {
            const li = document.createElement('li');
            li.innerText = (btn.getAttribute('data-tooltip') || btn.id.replace('btn-', '')).split('.')[0];
            modifiersList.appendChild(li);
        });
    }

    if (playerWon) document.getElementById('next-level-btn').style.display = '';
    else document.getElementById('next-level-btn').style.display = 'none';

    modal.classList.remove('hidden');
}

function _gameLevelClickHandler(levelId) {
    selectLevel(levelId);
    updateChallengePanel();
    resetModifiers();
    newGame();
    releaseSettings();
}

function initGamePage() {
    initStorage();
    initTheme();
    initModifiers();

    populateLevelGrid(_gameLevelClickHandler);
    createBoard();
    if (getCurrentFEN() != '') updateBoard(true);
    else {
        newGame();
        releaseSettings();
    }

    if (isInGame()) confirmSettings();
    else {
        resetModifiers();
        releaseSettings();
    }

    const savedLevel = getCurrentLevel() ?? 1;
    if (savedLevel) {
        selectLevel(savedLevel);
    }

    updateChallengePanel();

    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings-btn').addEventListener('click', closeSettings);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSettings);

    document.getElementById('level-select-btn').addEventListener('click', openLevelSidebar);
    document.getElementById('close-level-btn').addEventListener('click', closeLevelSidebar);
    document.getElementById('levelOverlay').addEventListener('click', closeLevelSidebar);

    document.getElementById('boardThemeSelect').addEventListener('change', onBoardThemeChange);
    document.getElementById('pieceThemeSelect').addEventListener('change', onPieceThemeChange);
    document.getElementById('backgroundColorSelect').addEventListener('change', onBackgroundColorChange);
    document.getElementById('backgroundThemeSelect').addEventListener('change', onBackgroundThemeChange);

    document.getElementById('engineSelect').addEventListener('change', onDifficultyChange);

    document.getElementById('new-game').addEventListener('click', () => { resetModifiers(); newGame(); initModifiers(); releaseSettings(); });
    document.getElementById('undo-btn').addEventListener('click', () => { undoMove(); });

    document.getElementById('play-again-btn').addEventListener('click', () => { resetModifiers(); newGame(); initModifiers(); releaseSettings(); });
    document.getElementById('next-level-btn').addEventListener('click', () => { goToNextLevel(); resetModifiers(); newGame(); initModifiers(); releaseSettings(); });

    document.getElementById('home-btn').addEventListener('click', () => { window.location.replace('/'); });

    // modifier 8: remove-piece button
    document.getElementById('remove-piece-btn').addEventListener('click', _enterRemovePieceMode);
}

initGamePage();
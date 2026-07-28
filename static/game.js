import { API_URL, NUM_LEVELS, PIECE_MAP, STARTING_POSITIONS, CHALLENGES, CHALLENGES_REQUIRED_MODIFIERS_LIST, CHALLENGES_REQUIRED_DIFFICULTY_MULTIPLIER, PIECE_MAP_IMAGE} from './constants.js';
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
import { 
    initTheme, onBackgroundColorChange, onBackgroundThemeChange, onBoardThemeChange, 
    onEngineSquareColorChange, onInCheckSquareColorChange, onMoveableSquareColorChange, onPieceThemeChange, onSelectedSquareColorChange } from './theme.js';
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
import { openSettings, closeSettings, onDifficultyChange, onResetConfirmationBackdropClick, onResetConfirmed, onResetDenied, openResetConfirmation, onResetThemeClick } from './settings.js';

const boardElement = document.getElementById('chessboard');
let squares = null; // all chessboard squares;
let selectedSquare = null;
let currentDraggedPiece = null;
let engineLastMove = null; // in UCI
let isGameConfirmed = false;
let removePieceMode = false; // modifier 8: true while awaiting opponent piece click
let legalMoves = null;
let gameState = null;

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
        const image = document.createElement('img');
        square.classList.add('square', (row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.index = i;
        square.dataset.file = String.fromCharCode(97 + col);
        square.dataset.rank = String(8 - row);
        square.dataset.piece = '';
        square.ondragover = dragoverHandler;
        square.ondrop = dropHandler;

        image.src = "";
        image.alt = "";
        image.draggable = "true";
        image.ondragstart = dragstartHandler;
        image.classList.add('chessboard-piece');
        square.appendChild(image);

        square.addEventListener('click', () => {
            if (isGameConfirmed) handleSquareClick(square);
        });

        boardElement.appendChild(square);
    }

    squares = document.querySelectorAll('.square');
}

async function updateBoard(fromPreviousFEN = false, sendAPIRequest = false) {
    gameState = await (await fetch(`${API_URL}/state`)).json();
    if (fromPreviousFEN || sendAPIRequest) {
        legalMoves = await (await fetch(`${API_URL}/legal_moves`)).json();
    }

    const fenRows = fromPreviousFEN
        ? getCurrentFEN().split(' ')[0].split('/')
        : gameState.fen.split(' ')[0].split('/');

    if (!fromPreviousFEN) setCurrentFEN(gameState.fen);

    const flatBoard = [];
    for (const row of fenRows) {
        for (const char of row) {
            if (isNaN(char)) flatBoard.push(char);
            else for (let i = 0; i < parseInt(char); i++) flatBoard.push('.');
        }
    }

    flatBoard.forEach((piece, idx) => {
        squares[idx].dataset.piece = PIECE_MAP[piece] ?? '';
        squares[idx].querySelector('img').src = PIECE_MAP_IMAGE[piece] ?? '';

        const inCheck = gameState.is_check;
        if (piece === '♚' && inCheck === 'b') squares[idx].classList.add('check');
        else if (piece === '♔' && inCheck === 'w') squares[idx].classList.add('check');
        else squares[idx].classList.remove('check');
    });

    document.getElementById('status').innerText = gameState.status_text;

    if (gameState.is_game_over) {
        setCurrentFEN('');
        const playerWon = !gameState.is_draw && gameState.turn === 'b';
        if (playerWon) {
            unlockNextLevel();
            const challengesCompleted = _recordCompletions();
            updateChallengePanel();
            populateLevelGrid(_gameLevelClickHandler);

            showGameOverModal(playerWon, document.getElementById('engineSelect').value, challengesCompleted);
        }
        else {
            showGameOverModal(playerWon, document.getElementById('engineSelect').value);
        }
        return true;
    }
    else {
        // check if due to modifier, is stalemate or checkmate
        for (let i = 0; i < legalMoves.length; i++) {
            let move = _parseUCIMove(legalMoves[i]);
            if (!bannedPieces.includes(squares[move[0]].dataset.piece)) return false; // player did not lose yet
        }

        // otherwise no legal moves, so game over player loses
        showGameOverModal(false, document.getElementById('engineSelect').value);
        return true;
    }
}

function dragstartHandler(ev) {
    if (ev.target.src == '' || ev.target.closest('.square').dataset.piece === '') {
        ev.preventDefault();
        return;
    }

    _showMoveableSquares(ev.target.closest('.square'));
    
    currentDraggedPiece = ev.target;
    ev.dataTransfer.setData("text/plain", ev.target.closest('.square').dataset.index);
    ev.dataTransfer.effectAllowed = "move";
}

function dragoverHandler(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
}

async function dropHandler(ev) {
    ev.preventDefault();
    const draggedPiece = currentDraggedPiece;
    if (!draggedPiece) return;

    const startingSquare = draggedPiece.closest('.square');
    const destinationSquare = ev.target.closest('.square');

    if (startingSquare == destinationSquare) {
        currentDraggedPiece = null;
        handleSquareClick(startingSquare);
        return;
    }

    const from = startingSquare.getAttribute('data-file') + startingSquare.getAttribute('data-rank');
    const to = destinationSquare.getAttribute('data-file') + destinationSquare.getAttribute('data-rank');

    const isPawnPromotion =
        (startingSquare.dataset.piece === '♟' && destinationSquare.dataset.rank === '1') ||
        (startingSquare.dataset.piece === '♙' && destinationSquare.dataset.rank === '8');

    if (isPawnPromotion) {
        if (bannedPieces.includes(startingSquare.dataset.piece)) return;
        if (noPromotion) return;

        const isLegal = await _checkLegalMove(from, to, 'q');
        if (isLegal && destinationSquare.dataset.piece !== '♚') {
            await _showPromotionDialog(from, to, gameState.turn);
            _clearSelection();
        }
    } 
    else {
        const isLegal = await _checkLegalMove(from, to, '');
        if (isLegal && destinationSquare.dataset.piece !== '♚') {
            if (bannedPieces.includes(startingSquare.dataset.piece)) return;

            await _sendMove(from, to, '');
        }
    }

    currentDraggedPiece = null;
}

async function handleSquareClick(square) {
    // modifier 8 remove one of the opponent's pieces
    if (canRemoveOpponentPiece && removePieceMode) {
        if (await _handleSquareRemoveClick(square)) useRemovePiece();
        return;
    }

    if (selectedSquare) {
        const from = selectedSquare.dataset.file + selectedSquare.dataset.rank;
        const to = square.dataset.file + square.dataset.rank;

        // Clicking the already-selected square deselects it
        if (from === to) {
            _clearSelection();
            return;
        }

        const isPawnPromotion =
            (selectedSquare.dataset.piece === '♟' && square.dataset.rank === '1') ||
            (selectedSquare.dataset.piece === '♙' && square.dataset.rank === '8');

        if (isPawnPromotion) {
            if (bannedPieces.includes(selectedSquare.dataset.piece)) return;

            // modifier 18 no pawn promotion
            if (noPromotion) {
                return;
            }

            const isLegal = await _checkLegalMove(from, to, 'q');
            if (isLegal && square.dataset.piece != '♚') {
                await _showPromotionDialog(from, to, gameState.turn);
                _clearSelection();
            }
        } 
        else {
            const isLegal = await _checkLegalMove(from, to, '');
            if (isLegal && square.dataset.piece != '♚') {
                if (bannedPieces.includes(selectedSquare.dataset.piece)) return;

                await _sendMove(from, to, '');
            }
            else if (_isCurrentPlayerPiece(square, gameState)) {
                _clearSelection();
                _selectSquare(square, gameState);
            }
        }
    } else {
        await _selectSquare(square, gameState);
    }
}

async function _selectSquare(square, gameState) {
    _clearSelection();

    if (!square.dataset.piece || !_isCurrentPlayerPiece(square, gameState)) {
        selectedSquare = null;
        return;
    }

    selectedSquare = square;
    square.classList.add('selected');

    // cannot move piece due to modifier
    if (bannedPieces.includes(selectedSquare.dataset.piece)) return;

    _showMoveableSquares(square);
}

function _showMoveableSquares(startingSquare) {
    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const file = String.fromCharCode(97 + col);
        const rank = String(8 - row);

        const from = startingSquare.dataset.file + startingSquare.dataset.rank;
        const to = file + rank;

        const promotionSuffix =
            (startingSquare.dataset.piece === '♟' && rank === '1') ||
            (startingSquare.dataset.piece === '♙' && rank === '8') ? 'q' : '';

        // hide promotion as legal move if modifier 18
        if (promotionSuffix && noPromotion) continue;

        if (legalMoves.includes(from + to + promotionSuffix) && squares[i].dataset.piece != '♚') {
            squares[i].classList.add('moveable');
        }
    }
}

function _clearSelection() {
    selectedSquare?.classList.remove('selected');
    selectedSquare = null;
    squares.forEach(s => s.classList.remove('moveable'));
}

function _resetLastEngineMove() {
    if (engineLastMove !== null) {
        squares[_parseUCIMove(engineLastMove)[0]].classList.remove('engine');
        squares[_parseUCIMove(engineLastMove)[1]].classList.remove('engine');
        engineLastMove = null;
    }
}

/** Returns true if the piece on `square` belongs to the player whose turn it is. */
function _isCurrentPlayerPiece(square, gameState) {
    const whiteUnicode = new Set(['♖', '♘', '♗', '♕', '♔', '♙']);
    const isWhite = whiteUnicode.has(square.dataset.piece);
    return (gameState.turn === 'w' && isWhite) || (gameState.turn === 'b' && !isWhite);
}

function _isOpponentPiece(square, gameState) {
    return square.dataset.piece !== '' && !_isCurrentPlayerPiece(square, gameState);
}

function _parseUCIMove(uciMove) {
    return [
        (uciMove.charCodeAt(0) - "a".charCodeAt(0)) + 8 * (8 - parseInt(uciMove[1])),
        (uciMove.charCodeAt(2) - "a".charCodeAt(0)) + 8 * (8 - parseInt(uciMove[3])),
        (uciMove.length == 5 ? uciMove[4] : '')
    ]
}

/** highlights all enemy pieces and waits for a click to remove the piece */
function _enterRemovePieceMode() {
    removePieceMode = true;
    _setStatus('Click an opponent piece to remove it from the game (takes up your turn). Click elsewhere on the board to cancel.');
 
    // highlight all non-king opponent pieces
    squares.forEach(sq => {
        const blackUnicode = new Set(['♜', '♞', '♝', '♛', '♟']);
        if (blackUnicode.has(sq.dataset.piece)) sq.classList.add('moveable');
    });
}

/** called when the player clicks a square while removing a piece */
async function _handleSquareRemoveClick(square) {
    const blackUnicode = new Set(['♜', '♞', '♝', '♛', '♚', '♟']);
    removePieceMode = false;
    squares.forEach(s => s.classList.remove('moveable'));

    // Only allow removing actual enemy pieces (not the king)
    if (!blackUnicode.has(square.dataset.piece) || square.dataset.piece === '♚') {
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
    await updateBoard(false);

    return true;
}

async function _checkLegalMove(from, to, promotion) {
    const uciString = from + to + promotion;
    return legalMoves.includes(uciString);
}

async function _sendMove(from, to, promotion) {
    const response = await fetch(`${API_URL}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, promotion }),
    });
    const data = await response.json();
    
    // modifier 6, skip stockfish move
    if (extraPlayerMoves > 0) {
        useExtraPlayerMoves();
        if (extraPlayerMoves > 0) {
            _setStatus(`bonus move! ${extraPlayerMoves} extra move(s) remaining.`);
        } else {
            _setStatus("last bonus move used.");
        }
        await fetch(`${API_URL}/skip_move`, { method: 'POST' });
        await updateBoard(false, true);
    } else {
        _clearSelection();
        await updateBoard(false, data.state.is_game_over);
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
            }
        };
    });
}

async function _requestStockfishMove(count = 1) {
    document.getElementById('status').innerText = 'Stockfish is thinking...';
    for (let i = 0; i < count; i++) {
        if (count > 1) {
            await fetch(`${API_URL}/skip_move`, { method: 'POST' });
        }
        try {
            const res = await fetch(`${API_URL}/stockfish_move`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                _resetLastEngineMove();

                squares[_parseUCIMove(data.move)[0]].classList.add('engine');
                squares[_parseUCIMove(data.move)[1]].classList.add('engine');
                engineLastMove = data.move;

                const isOver = await updateBoard(false, true);
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

    _resetLastEngineMove();
    _clearSelection();

    const fen = getCurrentFEN() == '' ? STARTING_POSITIONS[currentLevel-1] : getCurrentFEN();
    await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen }),
    });

    await updateBoard(false, true);
}

async function resetGame() {
    document.getElementById('gameOverModal')?.classList.add('hidden');

    _resetLastEngineMove();
    _clearSelection();

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

    await updateBoard(false, true);
 
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

        _resetLastEngineMove();

        await fetch(`${API_URL}/undo`, { method: 'POST' });
        await updateBoard(false, true);
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

    return challengePassed;
}
function showGameOverModal(playerWon, difficulty, challengesCompleted = [false, false, false]) {
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

        if (star.dataset.star == 4) {
            if (challengesCompleted[0] == true)
                star.style.color = '#1dff08';
            else if (challengesCompleted[1] == true)
                star.style.color = '#ffca28';
            else if (challengesCompleted[2] == true)
                star.style.color = '#df1010';
        }
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
            const image = document.createElement('img');
            image.src = `${btn.querySelector('img').src}`;
            modifiersList.appendChild(image);
        });
    }

    if (playerWon && currentLevel != 25) document.getElementById('next-level-btn').style.display = '';
    else document.getElementById('next-level-btn').style.display = 'none';

    modal.classList.remove('hidden');
}

function _gameLevelClickHandler(levelId) {
    selectLevel(levelId);
    updateChallengePanel();
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
    newGame();

    if (getCurrentFEN() != '') updateBoard(true);
    else releaseSettings();

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
    document.getElementById('checkSquareColorSelect').addEventListener('change', onInCheckSquareColorChange);
    document.getElementById('selectedSquareColorSelect').addEventListener('change', onSelectedSquareColorChange);
    document.getElementById('moveableSquareColorSelect').addEventListener('change', onMoveableSquareColorChange);
    document.getElementById('engineSquareColorSelect').addEventListener('change', onEngineSquareColorChange);
    
    // reset data
    document.getElementById('reset-theme').addEventListener('click', onResetThemeClick);
    document.getElementById('reset-data').addEventListener('click', () => {closeSettings(); openResetConfirmation(); });
    document.getElementById('resetModal').addEventListener('click', onResetConfirmationBackdropClick);
    document.getElementById('reset-yes').addEventListener('click', onResetConfirmed);
    document.getElementById('reset-no').addEventListener('click', onResetDenied);

    document.getElementById('engineSelect').addEventListener('change', onDifficultyChange);

    document.getElementById('new-game').addEventListener('click', () => { resetModifiers(); resetGame(); initModifiers(); releaseSettings(); });
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    // modifier 8: remove-piece button
    document.getElementById('remove-piece-btn').addEventListener('click', _enterRemovePieceMode);

    document.getElementById('play-again-btn').addEventListener('click', () => { resetModifiers(); resetGame(); initModifiers(); releaseSettings(); });
    document.getElementById('next-level-btn').addEventListener('click', () => { goToNextLevel(); resetModifiers(); resetGame(); initModifiers(); releaseSettings(); });

    document.getElementById('home-btn').addEventListener('click', () => { window.location.replace('/'); });
}

initGamePage();
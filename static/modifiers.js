import { BUFF_MULTIPLIERS, BUTTON_BLOCK_RULES, EXTRA_PIECE_BY_BUTTON, NUM_MODIFIERS, STARTING_POSITIONS } from './constants.js';
import { setStartingFEN, currentLevel } from './levels.js';
import { getModifierList, hasUsedUndo, hasUsedRemovePiece, 
         setModifiersList, setUsedUndo, setUsedRemovePiece } from './storage.js';

export let difficultyMultiplier = 1.0;
export let extraPieceSelected = null;
export let undoButtonReleased = false;

export let bannedPieces = [];

// modifier 6: player gets free moves before Stockfish first responds
export let extraPlayerMoves = 0;
 
// modifier 8: player may remove one opponent piece before their first real move
export let canRemoveOpponentPiece = false;
 
// modifier 9: scramble both sides' first rank pieces among themselves
export let scrambleFirstRank = false;
 
// modifier 14: pawns cannot promote (move is blocked entirely)
export let noPromotion = false;
 
// modifier 15: engine gets extra moves at the very start
export let extraEngineMoves = 0;
 
// modifier 16: four of the player's pieces are removed at random before the game
export let removeFourPieces = false;


export function useUndoButton() {
    undoButtonReleased = false;
    document.getElementById("undo-btn").disabled = true;
    document.getElementById("undo-btn").classList.add('btn-locked');

    setUsedUndo(true);
}

export function useExtraPlayerMoves() {
    extraPlayerMoves--;
}

export function useRemovePiece() {
    canRemoveOpponentPiece = false;
    document.getElementById("remove-piece-btn").disabled = true;
    document.getElementById("remove-piece-btn").classList.add('btn-locked');

    setUsedRemovePiece(true);
}

export function resetModifiers() {
    setModifiersList(0); // reset saved modifiers in storage
    difficultyMultiplier = 1.0;
    extraPieceSelected = null;
    bannedPieces = [];
    extraPlayerMoves = 0;
    canRemoveOpponentPiece = false;
    scrambleFirstRank = false;
    noPromotion = false;
    extraEngineMoves = 0;
    removeFourPieces = false;

    document.querySelectorAll('.console-btn').forEach(btn => {
        btn.classList.remove('active-toggle', 'btn-locked');
        btn.disabled = false;
    });
}

export function initModifiers() {
    document.querySelectorAll('.console-btn').forEach(button => {
        button.onclick = () => {
            button.classList.toggle('active-toggle');

            // check if modifier currently selected
            const isActive = button.classList.contains('active-toggle');
            handleModifierToggle(button.dataset.id, isActive);
            applyButtonDisabling();
        };
    });

    const storedModifiers = getModifierList();
    const allButtons = document.querySelectorAll('.console-btn');
    allButtons.forEach(button => {
        const id = parseInt(button.dataset.id);
        if (storedModifiers & (1<<(id-1))) {
            button.classList.add('active-toggle');
            handleModifierToggle(id, true, true);
        }
    });
    applyButtonDisabling();

    // undo button specifically
    if (!(storedModifiers & (1<<(7-1))) || hasUsedUndo()) {
        undoButtonReleased = false;
        document.getElementById("undo-btn").disabled = true;
        document.getElementById("undo-btn").classList.add('btn-locked');
    }

    // remove piece button specifically
    if (!(storedModifiers & (1<<(8-1))) || hasUsedRemovePiece()) {
        canRemoveOpponentPiece = false;
        document.getElementById("remove-piece-btn").disabled = true;
        document.getElementById("remove-piece-btn").classList.add('btn-locked');
    }
}

export function setUpModifierButtons() {
    if (undoButtonReleased) {
        document.getElementById("undo-btn").disabled = false;
        document.getElementById("undo-btn").classList.remove('btn-locked');
    }

    if (canRemoveOpponentPiece) {
        document.getElementById("remove-piece-btn").disabled = false;
        document.getElementById("remove-piece-btn").classList.remove('btn-locked');
    }
}

/**
 * locks all buttons in group that are mutually exclusive
 */
function applyButtonDisabling() {
    const allButtons = document.querySelectorAll('.console-btn');

    // reset button state to then set later
    allButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('btn-locked');
    });

    allButtons.forEach(btn => {
        if (!btn.classList.contains('active-toggle')) return;
        if (!BUTTON_BLOCK_RULES.includes(btn.id)) return;

        BUTTON_BLOCK_RULES.forEach(idToBlock => {
            const target = document.getElementById(idToBlock);
            if (target && target != btn) {
                target.disabled = true;
                target.classList.add('btn-locked'); // TODO: to style later
            }
        });
    });
}

function handleModifierToggle(id, isActive, isInitializing = false) {
    id = parseInt(id);

    // modifier difficulty multiplier TODO: will display later
    const multiplier = BUFF_MULTIPLIERS[id-1];
    difficultyMultiplier = isActive ? difficultyMultiplier * multiplier : difficultyMultiplier / multiplier;

    // buttons 1–5 affect extra piece
    if (id >= 1 && id <= 5) {
        if (isActive) {
            extraPieceSelected = EXTRA_PIECE_BY_BUTTON[id];
        } else {
            extraPieceSelected = null;
        }
    }

    // extra move for player
    if (id == 6) {
        extraPlayerMoves = isActive ? 1 : 0;
    }

    // the undo button
    if (id == 7) {
        undoButtonReleased = isActive;
        if (!isInitializing) setUsedUndo(!isActive);
    }

    // player can remove one piece from opponent position
    if (id == 8) {
        canRemoveOpponentPiece = isActive;
        if (!isInitializing) setUsedRemovePiece(!isActive);
    }

    // scramble first rank
    if (id == 9) {
        if (isActive) {
            scrambleFirstRank = true;
            setStartingFEN(applyScramble(STARTING_POSITIONS[currentLevel-1]));
        }
        else {
            scrambleFirstRank = false;
            setStartingFEN(STARTING_POSITIONS[currentLevel-1]);
        }
    }

    // prevent pieces from moving
    const pieceList = ['♕', '♖', '♗', '♘', '♔'];
    if (id >= 13 && id <= 17) {
        if (isActive) bannedPieces.push(pieceList[id-13]);
        else bannedPieces.splice(bannedPieces.indexOf(pieceList[id-13]), 1);

        console.log(bannedPieces);
    }

    // no pawn promotion
    if (id == 18) {
        noPromotion = isActive;
    }
 
    // engine gets two extra moves at game start
    if (id == 19) {
        extraEngineMoves = isActive ? 2 : 0;
    }
 
    // four of the player's pieces removed at random before game start
    if (id == 20) {
        removeFourPieces = isActive;
    }

    // store modifiers in localstorage
    if (!isInitializing) {
        const previousModifiers = getModifierList();
        setModifiersList(previousModifiers ^ (1<<(id-1)));
    }
}

// helper functions related to FEN
export function applyScramble(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/'); // take first part "3qk3/3pp3/8/8/8/8/PPPPPPPP/RNBQKBNR", then split by slash
 
    rows[0] = _shuffleRankPieces(rows[0]); // rank 8 (black back rank)
    rows[7] = _shuffleRankPieces(rows[7]); // rank 1 (white back rank)
 
    parts[0] = rows.join('/');
    return parts.join(' ');
}

function _shuffleRankPieces(row) {
    // expand to 8-char array
    const expanded = [];
    for (const ch of row) {
        if (isNaN(ch)) {
            expanded.push(ch);
        } else {
            for (let i = 0; i < parseInt(ch); i++) expanded.push(null);
        }
    }
 
    const pieceIndices = [];
    const pieces = [];
    expanded.forEach((sq, i) => {
        if (sq !== null) { pieceIndices.push(i); pieces.push(sq); }
    });
 
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
 
    pieceIndices.forEach((idx, i) => { expanded[idx] = pieces[i]; });
 
    // compress to FEN row
    let result = '';
    let emptyCount = 0;
    for (const sq of expanded) {
        if (sq === null) {
            emptyCount++;
        } else {
            if (emptyCount > 0) { result += emptyCount; emptyCount = 0; }
            result += sq;
        }
    }
    if (emptyCount > 0) result += emptyCount;
    return result;
}

export function applyRemoveFourPieces(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
 
    const flat = [];
    for (const row of rows) {
        for (const ch of row) {
            if (isNaN(ch)) flat.push(ch);
            else for (let i = 0; i < parseInt(ch); i++) flat.push(null);
        }
    }
 
    // indices of all but white king
    const removable = [];
    flat.forEach((sq, i) => {
        if (sq !== null && sq === sq.toUpperCase() && sq !== 'K') removable.push(i);
    });
 
    // shuffle and pick up to 4
    for (let i = removable.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [removable[i], removable[j]] = [removable[j], removable[i]];
    }
    const toRemove = removable.slice(0, Math.min(4, removable.length));
    toRemove.forEach(i => { flat[i] = null; });
 
    // compress back to FEN
    const newRows = [];
    for (let r = 0; r < 8; r++) {
        const slice = flat.slice(r * 8, r * 8 + 8);
        let row = '';
        let emptyCount = 0;
        for (const sq of slice) {
            if (sq === null) {
                emptyCount++;
            } else {
                if (emptyCount > 0) { row += emptyCount; emptyCount = 0; }
                row += sq;
            }
        }
        if (emptyCount > 0) row += emptyCount;
        newRows.push(row);
    }
 
    parts[0] = newRows.join('/');
    return parts.join(' ');
}
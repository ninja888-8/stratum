const API_URL = 'http://127.0.0.1:5000/api';
const boardElement = document.getElementById('chessboard');
const NUM_LEVELS = 25;
const BUFF_MULTIPLIERS = [0.5, 0.5, 0.6, 0.6, 0.8, 0.8, 0.9, 0.9];
let selectedSquare = null;
let isConfirmed = false;

// mapping chess letters to unicode characters
const pieceMap = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
    '.': ''
};

// FENs of starting positions for the levels, 0-indexed
const startingPositions = [
    "3qk3/3pp3/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    "r4rk1/1p3pbp/p5p1/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    "r2qk2r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "6k1/pp3pp1/2n1pq1n/2bp3p/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    "r1bqkb1r/pp1pp1pp/2p2p2/8/2BPPB2/8/PPPQ1PPP/3RR1K1 w kq - 0 1"
];

const challenges = [
    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier."
    ],

    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier."
    ],

    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier."
    ],

    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier."
    ]
];

// Initialize board squares
function createBoard() {
    boardElement.innerHTML = '';
    boardElement.onclick = (e) => {
        if (!isConfirmed) {
            confirmSettings();
            // stop the click from immediately selecting a piece on the very first touch
            e.stopPropagation(); 
            return;
        }
    };
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const row = Math.floor(i / 8);
        const col = i % 8;
        
        square.classList.add('square');
        square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.index = i;
        square.dataset.file = String.fromCharCode(97 + col);
        square.dataset.rank = (8 - row);
        
        square.addEventListener('click', (e) => {
            if (isConfirmed) {
                handleSquareClick(square);
            }
        });
        boardElement.appendChild(square);
    }
}

async function updateBoard(fromPrevious) {
    const response = await fetch(`${API_URL}/state`);
    const data = await response.json();

    let fenRows = '';
    if (fromPrevious) {
        fenRows = localStorage.getItem('currentFEN').split(' ')[0].split('/');
    }
    else {
        // FEN looks like "rnbqkbnr/pppppppp/8/8/..."
        fenRows = data.fen.split(' ')[0].split('/');
        localStorage.setItem('currentFEN', data.fen);
    }
    console.log(fenRows);

    let flatBoard = [];

    fenRows.forEach(row => {
        for (let char of row) {
            if (isNaN(char)) flatBoard.push(char);
            else for (let i = 0; i < parseInt(char); i++) flatBoard.push('.');
        }
    });

    const squares = document.querySelectorAll('.square');
    flatBoard.forEach((piece, idx) => {
        squares[idx].textContent = pieceMap[piece];
        if (piece == 'k' && data.is_check == "b") squares[idx].classList.add('check');
        else if (piece == 'K' && data.is_check == "w") squares[idx].classList.add('check');
        else squares[idx].classList.remove('check');
    });

    document.getElementById('status').innerText = data.status_text;

    // if user won, then unlock next level
    if (data.is_game_over && data.turn == "b") {
        unlockNextLevel();
        populateLevels(NUM_LEVELS); 
        updateCompletions();
        updateChallengeUI(currentLevelSelected);
        gameOverScreen(true, document.getElementById("engineSelect").value);
    }
    else if (data.is_game_over && data.turn == "w") {
        gameOverScreen(false, document.getElementById("engineSelect").value);
    }

    if (data.is_game_over) return true;
    else return false;
}

async function handleSquareClick(square) {
    const response = await fetch(`${API_URL}/state`);
    const data = await response.json();
    if (selectedSquare) {
        // attempt to move
        const moveFrom = selectedSquare.dataset.file + selectedSquare.dataset.rank;
        const moveTo = square.dataset.file + square.dataset.rank;
        
        if (moveFrom == moveTo) {
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            const squares = document.querySelectorAll('.square');
            for (let i = 0; i < 64; i++) {
                squares[i].classList.remove('moveable');
            }
            return;
        }

        console.log(moveFrom + " " + moveTo);

        let isGameOver = false;

        // promotion
        promotion_result = '';
        if ((selectedSquare.textContent == "♟" && square.dataset.rank == 1) || (selectedSquare.textContent == "♙" && square.dataset.rank == 8)) {
            const isLegal = await checkLegalMove(moveFrom, moveTo, 'q');

            if (isLegal) {
                promotion_result = handlePromotionSelection(moveFrom, moveTo, data.turn);
            }
        }
        else {
            const isLegal = await checkLegalMove(moveFrom, moveTo, '');

            if (isLegal) {
                await sendMove(moveFrom, moveTo, '');
                isGameOver = await updateBoard(false);
            }
        }

        const new_response = await fetch(`${API_URL}/state`);
        const new_data = await new_response.json();

        selectedSquare.classList.remove('selected');
        if (!isGameOver) {
            selectSquare(square, new_data);
        }
        else {
            resetSelectedSquares();
        }
    } else {
        selectSquare(square, data);
    }
}

async function handlePromotionSelection(moveFrom, moveTo, turn) {
    const options = document.querySelectorAll('.promotion-option');
    if (turn === 'w') {
        options[0].textContent = '♕';
        options[1].textContent = '♖';
        options[2].textContent = '♗';
        options[3].textContent = '♘';
    } else {
        options[0].textContent = '♛';
        options[1].textContent = '♜';
        options[2].textContent = '♝';
        options[3].textContent = '♞';
    }

    document.getElementById('promotionOverlay').style.display = 'flex';

    options.forEach(button => {
        button.onclick = async () => {
            const choice = button.dataset.piece; // 'q', 'r', 'b', or 'n'
            
            // hide promotion overlay after done
            document.getElementById('promotionOverlay').style.display = 'none';
            
            const isLegal = await checkLegalMove(moveFrom, moveTo, choice);

            if (isLegal) {
                await sendMove(moveFrom, moveTo, choice);
                await updateBoard(false);
            }
        };
    });
}

async function selectSquare(square, new_data) {
    const squares = document.querySelectorAll('.square');
    resetSelectedSquares();
    if (square.textContent !== '' && checkColour(square, new_data) == true) {
        selectedSquare = square;
        square.classList.add('selected');

        const response = await fetch(`${API_URL}/legal_moves`);
        const data = await response.json();

        // check square that can move to
        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const file = String.fromCharCode(97 + col);
            const rank = (8 - row);

            const moveFrom = square.dataset.file + square.dataset.rank;
            const moveTo = file + rank;
            
            promotion_result = '';
            if ((square.textContent == "♟" && rank == 1) || (square.textContent == "♙" && rank == 8)) {
                promotion_result = 'q'
            }
            const uci_move = moveFrom + moveTo + promotion_result;
            //console.log(uci_move);
            //console.log(data);
            if (data.includes(uci_move)) {
                squares[i].classList.add('moveable');
            }
        }
    }
    else {
        selectedSquare = null;
    }
}

async function checkLegalMove(moveFrom, moveTo, promotion_result) {
    const response = await fetch(`${API_URL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: moveFrom, to: moveTo, promotion: promotion_result })
    });
    const data = await response.json();
    
    return data["success"];
}

async function sendMove(moveFrom, moveTo, promotion_result) {
    const response = await fetch(`${API_URL}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: moveFrom, to: moveTo, promotion: promotion_result })
    });

    await requestStockfishMove();
}

// helper function to check if user clicked their own piece
function checkColour(square, data) {
    let isWhite = false;
    if (square.textContent == "♖" || square.textContent == "♘" || square.textContent == "♗" || square.textContent == "♕" || square.textContent == "♔" || square.textContent == "♙")
        isWhite = true;

    if (data.turn == "w" && isWhite) {
        return true;
    }
    else if (data.turn == "b" && !isWhite) {
        return true;
    }
    else {
        return false;
    }
}

function resetSelectedSquares() {
    const squares = document.querySelectorAll('.square');
    for (let i = 0; i < 64; i++) {
        squares[i].classList.remove('moveable');
    }
    selectedSquare = null;
}

// sets up position based on level (different starting FENs)
async function resetGame() {
    const modal = document.getElementById('gameOverModal');
    modal.classList.add('hidden');

    const squares = document.querySelectorAll('.square');
    for (let i = 0; i < 64; i++) {
        squares[i].classList.remove('moveable');
        squares[i].classList.remove('selected');
    }

    let gameFEN = startingPositions[currentLevelSelected-1];

    await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: gameFEN, extraPiece: extraPieceSelected })
    });
    updateBoard(false);
}

async function undoMove() {
    await fetch(`${API_URL}/undo`, { method: 'POST' });
    updateBoard(false);
}

function confirmSettings() {
    isConfirmed = true;
    boardElement.classList.remove('pending-confirmation');

    resetGame();

    const engineSelect = document.getElementById("engineSelect");
    if (engineSelect) engineSelect.disabled = true;

    const newGame = document.getElementById("new-game");
    if (newGame) newGame.disabled = false; 

    const modifierButtons = document.querySelectorAll('.console-btn');
    modifierButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
    });
}

function releaseSettings() {
    isConfirmed = false;
    boardElement.classList.add('pending-confirmation');

    const engineSelect = document.getElementById("engineSelect");
    if (engineSelect) engineSelect.disabled = false;

    const newGame = document.getElementById("new-game");
    if (newGame) newGame.disabled = true; 

    const modifierButtons = document.querySelectorAll('.console-btn');
    modifierButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    });
}

function updateChallengeUI(levelId) {
    const challengeDescriptions = document.getElementsByClassName('challenge-desc');
    for (let i = 0; i < 3; i++) {
        challengeDescriptions[i].textContent = challenges[currentLevelSelected-1][i];
    }
    for (let c = 1; c <= 3; c++) {
        const card = document.getElementById(`challenge-${c}`);
        const statusText = card.querySelector('.challenge-status');
        
        const isCompleted = localStorage.getItem(`level_${levelId}_challenge_${c}`) === "true";

        if (isCompleted) {
            card.classList.add('completed');
            statusText.innerText = "Completed";
        } else {
            card.classList.remove('completed');
            statusText.innerText = "Locked";
        }
    }
}

function updateCompletions() {
    const currentLevel = currentLevelSelected;
    const selectedDifficulty = document.getElementById("engineSelect").value;
    const activeModCount = document.querySelectorAll('.console-btn.active-toggle').length;
    const extraPieceActive = (typeof extraPieceSelected !== 'undefined' && extraPieceSelected !== 'none');

    let completedChallenges = 0;
    if (selectedDifficulty === "1" && extraPieceActive && !localStorage.getItem(`level_${currentLevel}_challenge_1`)) {
        localStorage.setItem(`level_${currentLevel}_challenge_1`, "true");
        completedChallenges++;
    }
    if (selectedDifficulty === "2" && activeModCount === 0 && !extraPieceActive && !localStorage.getItem(`level_${currentLevel}_challenge_2`)) {
        localStorage.setItem(`level_${currentLevel}_challenge_2`, "true");
        completedChallenges++;
    }
    if (selectedDifficulty === "3" && extraPieceActive && activeModCount >= 1 && !localStorage.getItem(`level_${currentLevel}_challenge_3`)) {
        localStorage.setItem(`level_${currentLevel}_challenge_3`, "true");
        completedChallenges++;
    }

    localStorage.setItem('challengeStarsEarned', parseInt(localStorage.getItem('challengeStarsEarned'))+completedChallenges);

    let difficultyStarsEarned = parseInt(localStorage.getItem("difficultyStarsEarned"));
    const difficultyStars = JSON.parse(localStorage.getItem("difficultyStarsArray"));
    if (difficultyStars[currentLevel-1] < parseInt(selectedDifficulty)) {
        difficultyStarsEarned += parseInt(selectedDifficulty) - difficultyStars[currentLevel-1];
        difficultyStars[currentLevel-1] = parseInt(selectedDifficulty);
    }
    
    localStorage.setItem('difficultyStarsEarned', difficultyStarsEarned);
    localStorage.setItem('difficultyStarsArray', JSON.stringify(difficultyStars));
}

function gameOverScreen(gameWin, difficulty) {
    const modal = document.getElementById('gameOverModal');
    const statusHeader = document.getElementById('modalStatus');
    const engineDifficulty = document.getElementById('modalDifficulty');
    const modifiersList = document.getElementById('modalModifiers');
    
    if (gameWin) {
        statusHeader.innerText = "LEVEL PASSED";
        statusHeader.className = "modal-title passed";
    } else {
        statusHeader.innerText = "LEVEL FAILED";
        statusHeader.className = "modal-title failed";
    }

    switch (difficulty) {
        case "1":
            engineDifficulty.innerText = "intermediate";
            break;
        case "2":
            engineDifficulty.innerText = "advanced";
            break;
        case "3":
            engineDifficulty.innerText = "expert";
            break;
        default:
            engineDifficulty.innerText = "[difficulty]";
    }

    const stars = document.querySelectorAll('.stars-container .star');
    console.log(stars);
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-star'));
        if (gameWin && starRating <= difficulty) {
            star.classList.add('lit');
        } else {
            star.classList.remove('lit');
        }
    });

    modifiersList.innerHTML = "";
    
    const activeModifiers = document.querySelectorAll('.console-btn.active-toggle');
    
    if (activeModifiers.length === 0) {
        const li = document.createElement('li');
        li.innerText = "None (Standard Match)";
        modifiersList.appendChild(li);
    } else {
        activeModifiers.forEach(modButton => {
            const modName = modButton.getAttribute('data-tooltip') || modButton.id.replace('btn-', '');
            const li = document.createElement('li');
            li.innerText = modName.split('.')[0];
            modifiersList.appendChild(li);
        });
    }

    modal.classList.remove('hidden');
}

async function requestStockfishMove() {
    // get current active level from your active level-btn element
    const activeLevelBtn = document.querySelector('.level-btn.active');
    const currentLevel = activeLevelBtn ? parseInt(activeLevelBtn.textContent) : 1;

    try {
        // update status text so user knows Stockfish is thinking if doesnt happen immediately
        document.getElementById('status').innerText = "Stockfish is thinking...";

        const response = await fetch(`${API_URL}/stockfish_move`, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            await updateBoard(); // shows engine move
        } else {
            console.log("Stockfish failed to make a move:", data.message);
        }
    } catch (error) {
        console.error("Error fetching Stockfish turn execution:", error);
    }
}

function populateLevels(totalLevels) {
    const grid = document.getElementById('levelGrid');
    grid.innerHTML = ''; 
    
    // get the highest level the player has beaten from browser memory
    const highestBeaten = parseInt(localStorage.getItem('highestBeatenLevel'));
    
    for (let i = 1; i <= totalLevels; i++) {
        const btn = document.createElement('button');
        btn.classList.add('level-btn');
        
        // determine if this level should be unlocked; level 1 is always, others unlock if previous is beaten
        const isUnlocked = (i === 1) || (i <= highestBeaten + 1);
        
        if (isUnlocked) {
            btn.textContent = i;
            
            // highlight the highest level that can be played
            if (i === highestBeaten + 1) {
                btn.classList.add('current-unlocked');
            }
            
            btn.onclick = () => {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                levelSelected(i);
                updateChallengeUI(i);
                closeLevelSelect();
                resetGame();
                releaseSettings();
            };
        } else {
            btn.textContent = '🔒';
            btn.classList.add('locked');
            btn.disabled = true; // prevents clicking from doing anything
        }
        
        grid.appendChild(btn);
    }
}

function initializeGame() {
    initializeModifiers();
    if (!localStorage.getItem('highestBeatenLevel')) {
        localStorage.setItem('highestBeatenLevel', '0');
    }
    if (!localStorage.getItem('selectedBoardTheme')) {
        localStorage.setItem('selectedBoardTheme', 'classic');
    }
    if (!localStorage.getItem('selectedPieceTheme')) {
        localStorage.setItem('selectedPieceTheme', 'text');
    }
    if (!localStorage.getItem('difficultyStarsEarned')) {
        localStorage.setItem('difficultyStarsEarned', '0');
    }
    if (!localStorage.getItem('challengeStarsEarned')) {
        localStorage.setItem('challengeStarsEarned', '0');
    }
    if (!localStorage.getItem('difficultyStarsArray')) {
        localStorage.setItem('difficultyStarsArray', JSON.stringify(Array(NUM_LEVELS).fill(0)));
    }

    let newGame = true;
    if (!localStorage.getItem('currentFEN')) {
        localStorage.setItem('currentFEN', '');
        newGame = false;
    }
    // ensure dropdown makes sense
    boardThemeApply(localStorage.getItem('selectedBoardTheme'));
    pieceThemeApply(localStorage.getItem('selectedPieceTheme'));

    populateLevels(NUM_LEVELS);
    createBoard();
    updateBoard(newGame);

    if (!localStorage.getItem('currentLevel')) {
        localStorage.setItem('currentLevel', '0');
    }
    else {
        const id = parseInt(localStorage.getItem('currentLevel'));
        levelSelected(id);
        updateChallengeUI(id);
        releaseSettings();
    }
}

initializeGame();
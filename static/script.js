const API_URL = 'http://127.0.0.1:5000/api';
const boardElement = document.getElementById('chessboard');
const NUM_LEVELS = 25;
const BUFF_MULTIPLIERS = [0.5, 0.5, 0.6, 0.6, 0.8, 0.8, 0.9, 0.9];
let selectedSquare = null;

// mapping chess letters to unicode characters
const pieceMap = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
    '.': ''
};

// Initialize board squares
function createBoard() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const row = Math.floor(i / 8);
        const col = i % 8;
        
        square.classList.add('square');
        square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.index = i;
        square.dataset.file = String.fromCharCode(97 + col);
        square.dataset.rank = (8 - row);
        
        square.onclick = () => handleSquareClick(square);
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
        console.log(data.is_check);
        if (piece == 'k' && data.is_check == "b") squares[idx].classList.add('check');
        else if (piece == 'K' && data.is_check == "w") squares[idx].classList.add('check');
        else squares[idx].classList.remove('check');
    });

    document.getElementById('status').innerText = data.status_text;

    // if user won, then unlock next level
    if (data.is_game_over && data.turn == "b") {
        unlockNextLevel();

        // Re-generate the grid so the newly unlocked level opens up right away
        populateLevels(NUM_LEVELS); 

        // send to game over screen, then reset game
        gameOverScreen(true);
        resetGame();
    }
    else {
        gameOverScreen(false);
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
            const squares = document.querySelectorAll('.square');
            for (let i = 0; i < 64; i++) {
                squares[i].classList.remove('moveable');
            }
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
                await requestStockfishMove();
            }
        };
    });
}

async function selectSquare(square, new_data) {
    const squares = document.querySelectorAll('.square');
    for (let i = 0; i < 64; i++) {
        squares[i].classList.remove('moveable');
    }
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

async function resetGame() {
    await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraPiece: extraPieceSelected })
    });
    updateBoard(false);
}

async function undoMove() {
    await fetch(`${API_URL}/undo`, { method: 'POST' });
    updateBoard(false);
}

function gameOverScreen(gameWin) {
    // TODO: implement game over screen
}

async function requestStockfishMove() {
    // get current active level from your active level-btn element
    const activeLevelBtn = document.querySelector('.level-btn.active');
    const currentLevel = activeLevelBtn ? parseInt(activeLevelBtn.textContent) : 1;

    try {
        // update status text so user knows Stockfish is thinking
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
                closeLevelSelect();
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
    if (!localStorage.getItem('SelectedPieceTheme')) {
        localStorage.setItem('selectedPieceTheme', 'text');
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
        const id = localStorage.getItem('currentLevel');
        levelSelected(id);
    }
}

initializeGame();
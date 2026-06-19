let difficultyMultiplier = 1.0; // based on modifiers
let extraPieceSelected = null; // modifier to give certain piece
let currentLevelSelected = 1;

// certain modifiers are mutually exclusive
const buttonBlockRules = [
    'btn-1',
    'btn-2',
    'btn-3',
    'btn-4',
    'btn-5'
]

function openSettings() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    overlay.style.display = 'block';
    
    setTimeout(() => {
        overlay.classList.add('active');
        sidebar.classList.add('open');
    }, 10);
}

function closeSettings() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

function boardThemeSelected() {
    const boardTheme = document.getElementById("boardThemeSelect");
    localStorage.setItem('selectedBoardTheme', boardTheme.value);

    boardThemeApply(boardTheme.value);
}

function boardThemeApply(boardTheme) {
    const boardThemeDropdown = document.getElementById('boardThemeSelect');
    boardThemeDropdown.value = boardTheme;
}

function pieceThemeSelected() {
    const pieceTheme = document.getElementById("pieceThemeSelect");
    localStorage.setItem('selectedPieceTheme', pieceTheme.value);

    pieceThemeApply(pieceTheme.value);
}

function pieceThemeApply(pieceTheme) {
    const pieceThemeDropdown = document.getElementById('pieceThemeSelect');
    pieceThemeDropdown.value = pieceTheme;
}

// uses current board + piece theme
function initializeTheme() {
    const boardTheme = localStorage.getItem('selectedBoardTheme');
    const pieceTheme = localStorage.getItem('selectedPieceTheme');

    // sets the sidebar to be consistent
    const boardThemeDropdown = document.getElementById('boardThemeSelect');
    boardThemeDropdown.value = boardTheme;
    
    const pieceThemeDropdown = document.getElementById('pieceThemeSelect');
    pieceThemeDropdown.value = pieceTheme;

    // TODO: implement themes
}

function openLevelSelect() {
    const sidebar = document.getElementById('levelSidebar');
    const overlay = document.getElementById('levelOverlay');
    
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('active');
        sidebar.classList.add('open');
    }, 10);
}

function closeLevelSelect() {
    const sidebar = document.getElementById('levelSidebar');
    const overlay = document.getElementById('levelOverlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

function levelSelected(id) {
    localStorage.setItem('currentLevel', id);

    levelNumberHeader = document.getElementById("level-number");
    if (levelNumberHeader)
        levelNumberHeader.textContent = "Level " + id;
    
    currentLevelSelected = id;
}

function unlockNextLevel() {
    const highestBeaten = parseInt(localStorage.getItem('highestBeatenLevel'));
    
    // only unlock new level if they beat their level record (prevents resetting if they replay old levels)
    if (currentLevelSelected > highestBeaten) {
        localStorage.setItem('highestBeatenLevel', highestBeaten+1);
    }
}

function selectNextLevel() {
    const modal = document.getElementById('gameOverModal');
    modal.classList.add('hidden');
    levelSelected(currentLevelSelected+1);
}

// engine difficulty selected (sets the stars that would be earned)
async function difficultySelected() {
    const engineDifficulty = document.getElementById("engineSelect");
    localStorage.setItem('defaultEngineDifficulty', engineDifficulty.value);

    let stockfish_elo = null;
    if (engineDifficulty.value == "1") {
        stockfish_elo = 1320;
    }
    else if (engineDifficulty.value == "2") {
        stockfish_elo = 1800;
    }
    else if (engineDifficulty.value == "3") {
        stockfish_elo = 2200;
    }
    
    const response = await fetch(`${API_URL}/set_elo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elo: stockfish_elo }) // passes chosen level to change difficulty of stockfish
    });
}

function resetModifiers() {
    difficultyMultiplier = 1;
    const buttons = document.querySelectorAll(".console-btn");
    
    buttons.forEach(btn => {
        btn.classList.remove('active-toggle');
        btn.classList.remove('btn-locked');
        btn.disabled = false;
    });
    
    extraPieceSelected = null;
}

// initializing functionality of modifier buttons
function initializeModifiers() {
    document.querySelectorAll('.console-btn').forEach(button => {
        button.onclick = () => {
            button.classList.toggle('active-toggle');
            
            // check if modifier is currently selected
            const isSelected = button.classList.contains('active-toggle');
            console.log(`Button state: ${isSelected ? 'Selected' : 'Unselected'}`);
            
            buttonDisabling();
            handleConsoleAction(button.dataset.id, isSelected);
        };
    });
}

// TODO: handle when a modifier button is pressed
function handleConsoleAction(buttonId, isSelected) {
    if (buttonId <= 8) {
        if (!isSelected) {
            difficultyMultiplier /= BUFF_MULTIPLIERS[buttonId-1];
        }
        else {
            difficultyMultiplier *= BUFF_MULTIPLIERS[buttonId-1];
        }
    }
    else if (buttonId <= 16) {

    }
    else {

    }
    console.log(difficultyMultiplier);

    if (isSelected) {
        switch (+buttonId) {
            case 1:
                extraPieceSelected = 'Q';
                break;
            case 2:
                extraPieceSelected = 'R';
                break;
            case 3:
                extraPieceSelected = 'B';
                break;
            case 4:
                extraPieceSelected = 'N';
                break;
            case 5:
                extraPieceSelected = 'P';
                break;
            default:
                extraPieceSelected = null;
        }
    }
}

function buttonDisabling() {
    const allButtons = document.querySelectorAll('.console-btn');
    
    // reset to then set later
    allButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('btn-locked');
    });

    // check which buttons are currently toggled
    allButtons.forEach(btn => {
        if (btn.classList.contains('active-toggle')) {
            if (buttonBlockRules.includes(btn.id)) {
                // loop through the block list for this active button and disable them
                buttonBlockRules.forEach(idToBlock => {
                    const targetBtn = document.getElementById(idToBlock);
                    if (targetBtn != btn) {
                        targetBtn.disabled = true;
                        targetBtn.classList.add('btn-locked'); // TODO: to style later
                    }
                });
            }
        }
    });
}
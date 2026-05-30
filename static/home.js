const API_URL = 'http://127.0.0.1:5000/api';
const NUM_LEVELS = 25;

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
                
                console.log(`Level ${i} selected!`);
                window.location.replace('game');
                levelSelected(i);
                
                closeLevelSelect();
            };
        } else {
            // Level is locked
            btn.textContent = '🔒';
            btn.classList.add('locked');
            btn.disabled = true; // Prevents clicking entirely
        }
        
        grid.appendChild(btn);
    }
}

function initializeGame() {
    if (!localStorage.getItem('highestBeatenLevel')) {
        localStorage.setItem('highestBeatenLevel', '0');
    }
    if (!localStorage.getItem('selectedBoardTheme')) {
        localStorage.setItem('selectedBoardTheme', 'classic');
    }
    if (!localStorage.getItem('SelectedPiecesTheme')) {
        localStorage.setItem('SelectedPiecesTheme', 'text');
    }
    populateLevels(NUM_LEVELS);

    // ensure dropdown makes sense
    boardThemeApply(localStorage.getItem('selectedBoardTheme'));
    pieceThemeApply(localStorage.getItem('selectedPieceTheme'));
}

initializeGame();
const API_URL = 'http://127.0.0.1:5000/api';
const NUM_LEVELS = 25;

function openInstructions() {
    document.getElementById('instructionsModal').classList.remove('hidden');
}

function closeInstructions() {
    document.getElementById('instructionsModal').classList.add('hidden');
}

// close instructions window when clicked outside the box
function closeInstructionsClick(event) {
    const modalOverlay = document.getElementById('instructionsModal');
    if (event.target === modalOverlay) {
        closeInstructions();
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

function menuMetricsApply() {
    const highestBeatenLevel = Math.min(NUM_LEVELS, parseInt(localStorage.getItem('highestBeatenLevel'))+1);
    const challengeStarsEarned = parseInt(localStorage.getItem('challengeStarsEarned'));
    const difficultyStarsEarned = parseInt(localStorage.getItem('difficultyStarsEarned'));

    let currentProgress = 100.0 * (challengeStarsEarned + difficultyStarsEarned) / (6 * NUM_LEVELS);
    let formattedProgress = currentProgress.toFixed(2); 

    levelIndicator = document.getElementById("level-indicator");
    levelIndicator.textContent = `${highestBeatenLevel} / ${NUM_LEVELS}`;

    difficultyStarIndicator = document.getElementById("difficulty-star-indicator");
    difficultyStarIndicator.textContent = "★ " + difficultyStarsEarned.toString().padStart(2, '0');

    challengeStarIndicator = document.getElementById("challenge-star-indicator");
    challengeStarIndicator.textContent = "★ " + challengeStarsEarned.toString().padStart(2, '0');

    progressText = document.getElementById("progress-text");
    progressText.textContent = formattedProgress.toString() + "%";

    progressBar = document.getElementById("progress-bar");
    progressBar.style.width = `${formattedProgress}%`;
}

function initializeGame() {
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
    populateLevels(NUM_LEVELS);

    // ensure dropdown makes sense
    boardThemeApply(localStorage.getItem('selectedBoardTheme'));
    pieceThemeApply(localStorage.getItem('selectedPieceTheme'));
    menuMetricsApply();
}

initializeGame();
import { BUFF_MULTIPLIERS, BUTTON_BLOCK_RULES, EXTRA_PIECE_BY_BUTTON } from './constants.js';

export let difficultyMultiplier = 1.0;
export let extraPieceSelected = null;

export function resetModifiers() {
    difficultyMultiplier = 1.0;
    extraPieceSelected = null;

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
            applyButtonDisabling();
            handleModifierToggle(button.dataset.id, isActive);
        };
    });
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

function handleModifierToggle(id, isActive) {
    // green and red modifiers
    if ((id >= 1 && id <= 8) || (id >= 13 && id <= 20)) {
        const multiplier = BUFF_MULTIPLIERS[id-1];
        difficultyMultiplier = isActive ? difficultyMultiplier * multiplier : difficultyMultiplier / multiplier;
    }

    // buttons 1–5 affect extra piece
    if (id >= 1 && id <= 5) {
        if (isActive) {
            extraPieceSelected = EXTRA_PIECE_BY_BUTTON[id];
        } else {
            extraPieceSelected = null;
        }
    }
}
import { getBackgroundTheme } from "./storage.js";

const POSSIBLE_PIECES = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
const PIECE_COUNT = 40;
const SIZE_MIN = 18;
const SIZE_MAX = 54;
const DURATION_MIN = 14; // existence in seconds
const DURATION_MAX = 34;
const DRIFT_MIN = 160; // how far each pawn travels before fading
const DRIFT_MAX = 500;
const OPACITY_MAX = 0.72; // max opacity of any piece

const canvas = document.getElementById('background-canvas');

let styleSheet = document.createElement('style');
let array = [];

function rand(min, max) { 
    return Math.random() * (max - min) + min; 
}

function randSign() { 
    return Math.random() < 0.5 ? 1 : -1;
}

function randColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
}

function spawnPiece(index) {
    const size = rand(SIZE_MIN, SIZE_MAX);
    const duration = rand(DURATION_MIN, DURATION_MAX);
    const delay = -rand(0, duration); // negative = already mid-cycle on load

    const dx = Math.round(randSign() * rand(DRIFT_MIN, DRIFT_MAX));
    const dy = Math.round(randSign() * rand(DRIFT_MIN, DRIFT_MAX));

    // Spin: random number of full rotations, random direction
    const totalDeg = Math.round(randSign() * rand(120, 900));
    const peakOpacity = rand(0.30, OPACITY_MAX).toFixed(3);

    // Each pawn gets its own unique keyframe
    const kfName = `pawn-drift-${index}`;
    styleSheet.sheet.insertRule(`
        @keyframes ${kfName} {
            0%   { transform: translate(0px, 0px)         rotate(0deg);         opacity: 0;   }
            20%  { opacity: ${peakOpacity};                                                   }
            80%  { opacity: ${peakOpacity};                                                   }
            100% { transform: translate(${dx}px, ${dy}px) rotate(${totalDeg}deg); opacity: 0; }
        }
    `, styleSheet.sheet.cssRules.length);

    const img = document.createElement('img');
    img.src = `/static/images/gain_${POSSIBLE_PIECES[Math.floor(Math.random() * 5)]}.png`;
    img.alt = '';
    img.classList.add('floating');

    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.left = `${rand(0, window.innerWidth)}px`;
    img.style.top = `${rand(0, window.innerHeight)}px`;
    img.style.animation = `${kfName} ${duration.toFixed(1)}s ${delay.toFixed(1)}s linear infinite`;

    // resets piece to different location
    img.addEventListener('animation', () => {
        img.style.left = `${rand(0, window.innerWidth)}px`;
        img.style.top = `${rand(0, window.innerHeight)}px`;
    });

    canvas.appendChild(img);
    array.push(img);
}

function spawnBubble(index) {
    const size = rand(SIZE_MIN, SIZE_MAX);
    const duration = rand(DURATION_MIN, DURATION_MAX);
    const delay = -rand(0, duration); // negative = already mid-cycle on load

    const dy = -1 * Math.round(rand(DRIFT_MIN, DRIFT_MAX));

    const peakOpacity = rand(0.30, OPACITY_MAX).toFixed(3);

    const kfName = `bubble-${index}`;
    styleSheet.sheet.insertRule(`
        @keyframes ${kfName} {
            0%   { transform: translate(0px, 0px);        opacity: 0;   }
            20%  { opacity: ${peakOpacity};                             }
            80%  { opacity: ${peakOpacity};                             }
            100% { transform: translate(0px, ${dy}px);    opacity: 0;   }
        }
    `, styleSheet.sheet.cssRules.length);

    const circle = document.createElement('div');
    circle.classList.add('floating');

    circle.style.width = `${size}px`;
    circle.style.height = `${size}px`;
    circle.style.borderRadius = '50%';
    circle.style.backgroundColor = randColor();

    circle.style.left = `${rand(0, window.innerWidth)}px`;
    circle.style.top = `${rand(0, window.innerHeight)}px`;
    circle.style.animation = `${kfName} ${duration.toFixed(1)}s ${delay.toFixed(1)}s linear infinite`;

    circle.addEventListener('animation', () => {
        circle.style.left = `${rand(0, window.innerWidth)}px`;
        circle.style.top = `${rand(0, window.innerHeight)}px`;
    });

    canvas.appendChild(circle);
    array.push(circle);
}

export function initBackground() {
    styleSheet?.remove();
    array.forEach(img => img.remove());
    array.length = 0;

    styleSheet = document.createElement('style');
    document.head.appendChild(styleSheet);

    const theme = getBackgroundTheme();

    for (let i = 0; i < PIECE_COUNT; i++) {
        switch (theme) {
            case "none":
                break;
            case "space":
                spawnPiece(i);
                break;
            case "ocean":
                spawnBubble(i);
                break;
            default:
                break;
        }
    }
}
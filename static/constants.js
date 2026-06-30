export const API_URL = 'http://127.0.0.1:5000/api';
export const NUM_LEVELS = 25;
export const NUM_MODIFIERS = 20;

export const BUFF_MULTIPLIERS = [
    0.5, 0.5, 0.6, 0.6, 0.8, 0.8, 0.9, 0.9,
    1.0, 1.0, 1.0, 1.0,
    1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2,
]; // TODO: tune the values later

export const BUTTON_BLOCK_RULES = ['btn-1', 'btn-2', 'btn-3', 'btn-4', 'btn-5'];

export const PIECE_MAP = {
    r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
    R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔', P: '♙',
    '.': '',
};

// maps modifier button IDs 1–5 to the extra piece they grant
export const EXTRA_PIECE_BY_BUTTON = {
    1: 'Q', 2: 'R', 3: 'B', 4: 'N', 5: 'P',
};

// 0-indexed FENs
export const STARTING_POSITIONS = [
    "3qk3/3pp3/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    "r4rk1/1p3pbp/p5p1/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    "r2qk2r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "6k1/pp3pp1/2n1pq1n/2bp3p/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
    "r1bqkb1r/pp1pp1pp/2p2p2/8/2BPPB2/8/PPPQ1PPP/3RR1K1 w kq - 0 1",
];

// 0-indexed challenge lists
export const CHALLENGES = [
    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier.",
    ],
    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier.",
    ],
    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier.",
    ],
    [
        "Beat the level on ⭐ with an extra piece active.",
        "Beat the level on ⭐⭐ with no modifiers.",
        "Beat the level on ⭐⭐⭐ with an extra piece AND 1 other modifier.",
    ],
];

export const DIFFICULTY_ELO = {
    1: 1320,
    2: 1800,
    3: 2200,
};
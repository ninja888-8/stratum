export const API_URL = 'http://127.0.0.1:5000/api';
export const NUM_LEVELS = 25;
export const NUM_MODIFIERS = 20;

export const BUFF_MULTIPLIERS = [
    0.5, 0.55, 0.6, 0.6, 0.9, 0.7, 0.9, 0.6,
    1.0, 1.0, 1.0, 1.0,
    1.2, 1.2, 1.2, 1.2, 1.2, 1.15, 1.2, 1.4,
]; // TODO: tune the values later

export const BUTTON_BLOCK_RULES = [
    ['btn-1', 'btn-2', 'btn-3', 'btn-4', 'btn-5'],
    ['btn-6', 'btn-8'],
    ['btn-6', 'btn-19'],
    ['btn-9', 'btn-11', 'btn-12'],
    ['btn-10', 'btn-20'],
];

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
    "2bqkb2/ppp2ppp/2n5/3pp3/8/2N2N2/PPPPPPPP/R1B1KB1R w KQ - 0 1",

    "2bq1bk1/ppp2ppp/2n2n2/3p4/8/2P2P2/PP1PPKPP/RNBQ1BNR w - - 0 1",
    "r3k2r/ppp2ppp/2n5/3qp3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "3q2k1/ppp2pp1/2n1bn1p/2bp4/8/2P1P3/P1P2PPP/R1BQKBNR w KQ - 0 1",
    "r1b1kb1r/pppppppp/8/4q3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "r3k2r/1bp2ppp/p3pn2/1p6/n7/P1P1PN2/P1Q1BPPP/2B2RK1 w kq - 0 1",

    "3rr1k1/1pp2ppp/p1n2n2/2p2p2/8/8/PPPPPPPP/3QKBNR w K - 0 1",
    "r2q1rk1/ppp2ppp/2n2n2/8/8/8/PPPP1PPP/RN1QKBNR w KQ - 0 1",
    "r1bqkb1r/pp1pp1pp/2p2p2/8/2BPPB2/8/PPPQ1PPP/3RR1K1 w kq - 0 1",
    "r2qk2r/1pp2ppp/8/8/4P3/P2P4/1PP2PPP/R2Q1RK1 w kq - 0 1",
    "3qk3/pppppppp/8/8/8/8/PPPPPPPP/1NB1KBN1 w - - 0 1",
    
    "2bq1qk1/ppp2ppp/2n2n2/8/8/2N2N2/PPPPPPPP/R1BQKB1R w KQ - 0 1",
    "3rr1k1/5pp1/7p/2pp4/8/P6P/1PP2PP1/R2R2K1 w - - 0 1",
    "4r3/p4kp1/1p3b1p/8/6P1/1P1P1N1P/2P2PK1/3R4 w - - 0 1",
    "r1bqk2r/pp4pp/2nb4/2p1pp2/3p4/3P1N2/PPP1BPPP/RNBQK2R w KQkq - 0 1",
    "8/pp1kn1p1/2n2bp1/8/8/1PNP2PP/2PB1PB1/6K1 w - - 0 1",
    
    "6k1/pp2npbp/2n1b1p1/8/8/P1NNB1P1/1PP2PBP/6K1 w - - 0 1",
    "r1bqrnk1/p3bpp1/1p3n1p/2pp4/3P2PB/2NBPN1P/PPQ2P2/2KR3R w - - 0 1",
    "r1bq2k1/pp2p2p/2np2pB/5r2/2Pb4/2N5/PP2BPPP/R2Q1RK1 w - - 0 1",
    "r1bq1rk1/pp2ppbp/3p1np1/2pPn3/2P1P3/2N1BP2/PP1Q2PP/R3KBNR w KQ - 0 1",
    "r2qk2r/ppp2ppp/3pp3/8/8/8/2NNNNN1/1NNNKNN1 w kq - 0 1",
];

// TODO: will add challenges names
export const CHALLENGES = [

];

export const CHALLENGES_REQUIRED_MODIFIERS_LIST = [
    [-1,524288,118784],
    [768,49152,65536],
    [655360,-1,4608],
    [32800,49154,264192],
    [1056,131136,-1],

    [-1,524545,196656],
    [1088,327696,8194],
    [2112,-1,266308],
    [0,525328,263168],
    [32768,0,-1],

    [-1,49153,0],
    [16416,65552,1088],
    [0,-1,256],
    [131088,-1,0],
    [-1,0,13312],

    [65536,262400,-1],
    [131120,-1,0],
    [0,8260,4096],
    [131328,262144,0],
    [5120,131200,135169],

    [-1,0,16],
    [1664,2080,131080],
    [49280,320,32772],
    [0,16,2064],
    [524289,487432,263168],
]

export const CHALLENGES_REQUIRED_DIFFICULTY_MULTIPLIER = [
    [2,0,0],
    [0,0,0],
    [0,1.5,0],
    [0,0,0],
    [0,0,1.25],

    [2,0,0],
    [0,0,0],
    [0,1.5,0],
    [0,0,0],
    [0,0,1.25],

    [1.25,0,0],
    [0,0,0],
    [0,1.25,0],
    [0,2,0],
    [2,0,0],
    
    [0,0,1.25],
    [0,2,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],

    [1.5,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
]

export const DIFFICULTY_ELO = {
    1: 1320,
    2: 1800,
    3: 2200,
};
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import os
import chess
import chess.engine
import uuid
import time
import threading

app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
CORS(app, supports_credentials=True, origins=[
    'https://stratum-ynaa.onrender.com'
])

STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), 'stockfish')

global_engine: chess.engine.SimpleEngine | None = None
engine_lock = threading.Lock()

def get_global_engine():
    global global_engine
    if global_engine is None:
        try:
            global_engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            global_engine.configure({
                "Hash": 32,
                "Threads": 1,
            })
        except Exception as e:
            print(f"Error starting Stockfish: {e}")
            global_engine = None
            return None

    try:
        global_engine.ping()
    except Exception:
        try:
            global_engine.close()
        except Exception:
            pass
        global_engine = None
        return get_global_engine()

    return global_engine

class GameState:
    def __init__(self):
        self.board = chess.Board()
        self.elo = 1320
        self.last_active = time.time()

    def set_elo(self, elo) -> None:
        self.elo = elo

    def get_stockfish_move(self, depth=12, limit_time=0.2) -> chess.Move | None:
        """
        stockfish, asks it for the best move under specific constraints and makes the move
        """
        with engine_lock:
            eng = get_global_engine()
            if eng is None:
                return None

            try:
                eng.configure({
                    "UCI_LimitStrength": True,
                    "UCI_Elo": self.elo,
                })
                limit = chess.engine.Limit(time=limit_time, depth=depth)
                result = eng.play(self.board, limit)
                return result.move
            except Exception as e:
                print(f"Communicating with Stockfish failed: {e}")
                return None

    def reset_board(self, fen) -> None:
        self.board = chess.Board(fen)

    def get_state(self) -> dict:
        """Helper function to package the current board state."""
        board = self.board
        status_text = ""
        turn_color = "White" if board.turn == chess.WHITE else "Black"

        if board.is_checkmate():
            status_text = f"Game over, {turn_color} is in checkmate."
        elif board.is_stalemate():
            status_text = "Draw by stalemate."
        elif board.is_insufficient_material():
            status_text = "Draw by insufficient material"
        elif board.is_fifty_moves():
            status_text = "Draw by 50 move rule" 
        else:
            status_text = f"{turn_color} to move"

        return {
            "fen": board.fen(),
            "turn": "w" if board.turn == chess.WHITE else "b",
            "is_game_over": board.is_game_over(),
            "is_draw": board.is_game_over() and not board.is_checkmate(),
            "is_check": "" if not board.is_check() else ("w" if board.turn == chess.WHITE else "b"),
            "status_text": status_text
        }

games = {}

def get_game() -> GameState:
    if 'game_id' not in session:
        session['game_id'] = str(uuid.uuid4())

    game_id = session['game_id']

    # clean up inactive games for more than 2 hours
    now = time.time()
    stale = [g_id for g_id, g in games.items() if now - getattr(g, 'last_active', now) > 7200]
    for g_id in stale:
        try:
            del games[g_id]
        except Exception:
            pass

    if game_id not in games:
        games[game_id] = GameState()

    games[game_id].last_active = now
    
    return games[game_id]

@app.route('/')
def home():
    """Generates HTML webpage (home screen)"""
    return send_from_directory('.', 'index.html')

@app.route('/game')
def game_page():
    """Generates HTML webpage (game screen)"""
    return send_from_directory('.', 'game.html')

@app.route('/api/legal_moves', methods=['GET'])
def get_legal_moves():
    """Helper function to package the current board state."""
    legal_uci_strings = [move.uci() for move in get_game().board.legal_moves]
    return jsonify(legal_uci_strings)

@app.route('/api/state', methods=['GET'])
def get_state():
    """Returns the json of the current game state"""
    return jsonify(get_game().get_state())

@app.route('/api/set_elo', methods=['POST'])
def set_elo():
    data = request.json
    elo = data.get('elo')
    
    get_game().set_elo(elo)
    return jsonify({"success": True})

@app.route('/api/remove_piece', methods=['POST'])
def remove_piece():
    data = request.json
    square = data.get('square')
    try:
        get_game().board.remove_piece_at(chess.parse_square(square))
        return jsonify({"success": True})
    except ValueError:
        return jsonify({"success": False})
    
@app.route('/api/skip_move', methods=['POST'])
def skip_move():
    get_game().board.push(chess.Move.null())
    return jsonify({"success": True})
    
@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    # Combine move into UCI format (e.g., e2e4, or e7e8q)
    uci_move = data.get('from', '') + data.get('to', '') + data.get('promotion', '')

    try:
        move = chess.Move.from_uci(uci_move)
        get_game().board.push(move)
        return jsonify({"success": True, "state": get_game().get_state()})
    except ValueError:
        return jsonify({"success": False, "state": get_game().get_state()})
    
@app.route('/api/stockfish_move', methods=['POST'])
def stockfish_move():
    if get_game().board.is_game_over():
        return jsonify({"success": False, "message": "Game is already over"})
    
    best_move = get_game().get_stockfish_move()
    
    if best_move and best_move in get_game().board.legal_moves:
        move_uci = best_move.uci()
        get_game().board.push(best_move) # execute move onto python chess board
        
        return jsonify({
            "success": True, 
            "move": move_uci,
            "fen": get_game().board.fen(),
            "turn": "w" if get_game().board.turn == chess.WHITE else "b"
        })
    
    return jsonify({"success": False, "message": "Stockfish failed to pick a legal move"})

@app.route('/api/reset', methods=['POST'])
def reset():
    data = request.json
    fen = data.get('fen') # setup position based on FEN 

    get_game().reset_board(fen)

    return jsonify(get_game().get_state())

@app.route('/api/undo', methods=['POST'])
def undo():
    if len(get_game().board.move_stack) > 0:
        get_game().board.pop()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
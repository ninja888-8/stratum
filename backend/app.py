from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import chess
import chess.engine

from threading import Thread
import subprocess
import sys
import webview

# PATHS
def get_base_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    else:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_stockfish_filename():
    if sys.platform == 'win32':
        return 'stockfish.exe'
    elif sys.platform == 'darwin':
        return 'stockfish-mac'
    else:
        return 'stockfish-linux'

BASE_DIR = get_base_dir()
TEMPLATES_PATH = os.path.join(BASE_DIR, 'templates')
STATIC_PATH = os.path.join(BASE_DIR, 'static')
STOCKFISH_PATH = os.path.join(BASE_DIR, 'engine', 'stockfish', get_stockfish_filename())
ICON_PATH = os.path.join(STATIC_PATH, 'images', 'icon.ico')

app = Flask(__name__, template_folder=TEMPLATES_PATH, static_folder=STATIC_PATH)
CORS(app) 

class GameState:
    def __init__(self):
        self.board = chess.Board()
        self.engine: chess.engine.SimpleEngine | None = None
        self.elo = 1320

    def start_engine(self) -> None:
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH, startupinfo=get_startupinfo())

            self.engine.configure({
                "Hash": 32,
                "Threads": 1,
                "UCI_LimitStrength": True,
                "UCI_Elo": self.elo,
            })
        except Exception as e:
            self.engine = None
            print(f"Error starting Stockfish: {e}")

    def stop_engine(self) -> None:
        if self.engine is not None:
            try:
                self.engine.close()
            except Exception:
                pass

            self.engine = None

    def get_engine(self) -> chess.engine.SimpleEngine | None:
        if self.engine is None:
            self.start_engine()
            return self.engine
        
        try:
            self.engine.ping()
        except Exception:
            self.stop_engine()
            self.start_engine()

        return self.engine
    
    def set_elo(self, elo) -> None:
        self.elo = elo
        eng = self.get_engine()
        if eng is not None:
            eng.configure({
                "UCI_LimitStrength": True,
                "UCI_Elo": self.elo,
            })

    def get_stockfish_move(self, depth=15, limit_time=1) -> chess.Move | None:
        """
        stockfish, asks it for the best move under specific constraints and makes the move
        """

        # try up to 3 times in case stockfish happens to crash
        for attempt in range(3):
            eng = self.get_engine()
            if eng is None:
                self.start_engine()
                eng = self.get_engine()

            try:
                limit = chess.engine.Limit(time=limit_time, depth=depth)
                result = eng.play(self.board, limit)
                return result.move
            except Exception as e:
                print(f"Attempt {attempt+1} communicating with Stockfish failed: {e}")
                self.stop_engine()
        
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

game = GameState()

def get_startupinfo():
    if sys.platform == 'win32':
        info = subprocess.STARTUPINFO()
        info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        info.wShowWindow = subprocess.SW_HIDE
        return info
    else:
        return None

@app.route('/')
def home():
    """Generates HTML webpage (home screen)"""
    return render_template('index.html')

@app.route('/game')
def game_page():
    """Generates HTML webpage (game screen)"""
    return render_template('game.html')

@app.route('/api/legal_moves', methods=['GET'])
def get_legal_moves():
    """Helper function to package the current board state."""
    legal_uci_strings = [move.uci() for move in game.board.legal_moves]
    return jsonify(legal_uci_strings)

@app.route('/api/state', methods=['GET'])
def get_state():
    """Returns the json of the current game state"""
    return jsonify(game.get_state())

@app.route('/api/set_elo', methods=['POST'])
def set_elo():
    data = request.json
    elo = data.get('elo')
    
    game.set_elo(elo)
    return jsonify({"success": True})

@app.route('/api/remove_piece', methods=['POST'])
def remove_piece():
    data = request.json
    square = data.get('square')
    try:
        game.board.remove_piece_at(chess.parse_square(square))
        return jsonify({"success": True})
    except ValueError:
        return jsonify({"success": False})
    
@app.route('/api/skip_move', methods=['POST'])
def skip_move():
    game.board.push(chess.Move.null())
    return jsonify({"success": True})
    
@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    # Combine move into UCI format (e.g., e2e4, or e7e8q)
    uci_move = data.get('from', '') + data.get('to', '') + data.get('promotion', '')

    try:
        move = chess.Move.from_uci(uci_move)
        game.board.push(move)
        return jsonify({"success": True, "state": game.get_state()})
    except ValueError:
        return jsonify({"success": False, "state": game.get_state()})
    
@app.route('/api/stockfish_move', methods=['POST'])
def stockfish_move():
    if game.board.is_game_over():
        return jsonify({"success": False, "message": "Game is already over"})
    
    best_move = game.get_stockfish_move()
    
    if best_move and best_move in game.board.legal_moves:
        move_uci = best_move.uci()
        game.board.push(best_move) # execute move onto python chess board
        
        return jsonify({
            "success": True, 
            "move": move_uci,
            "fen": game.board.fen(),
            "turn": "w" if game.board.turn == chess.WHITE else "b"
        })
    
    return jsonify({"success": False, "message": "Stockfish failed to pick a legal move"})

@app.route('/api/reset', methods=['POST'])
def reset():
    data = request.json
    fen = data.get('fen') # setup position based on FEN 

    game.reset_board(fen)

    return jsonify(game.get_state())

@app.route('/api/undo', methods=['POST'])
def undo():
    if len(game.board.move_stack) > 0:
        game.board.pop()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})

def run_backend():
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

def maximize(window):
    window.maximize()

def on_closed():
    game.stop_engine()

if __name__ == '__main__':
    # stockfish debugging
    print(f"Looking for Stockfish at: {STOCKFISH_PATH}")
    print(f"Stockfish exists: {os.path.exists(STOCKFISH_PATH)}")

    game.start_engine()
    backend_thread = Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    window = webview.create_window(
        title='stratum', 
        url='http://127.0.0.1:5000',
        resizable=True,
    )
    window.events.closed += on_closed
    webview.start(maximize, window, icon=ICON_PATH, private_mode=False)
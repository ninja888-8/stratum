from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS

import chess
import chess.engine

import os
import uuid
import time

app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))
CORS(app, supports_credentials=True, origins=[
    'https://stratum-ynaa.onrender.com'
])

board = chess.Board()
STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), 'stockfish')

games = {}

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    print(traceback.format_exc())
    return jsonify({"error": str(e)}), 500

def get_game():
    if 'game_id' not in session:
        session['game_id'] = str(uuid.uuid4())

    game_id = session['game_id']

    # clean up inactive games for more than 2 hours
    now = time.time()
    stale = [g_id for g_id, g in games.items() if now - g.get('last_active', now) > 7200]
    for g_id in stale:
        try:
            games[g_id]['engine'].close()
        except Exception:
            pass
        del games[g_id]

    if game_id not in games:
        games[game_id] = {
            'board': chess.Board(),
            'engine': start_engine(1320),
            'elo': 1320,
        }
    
    return games[game_id]

def start_engine(elo = 1320):
    try:
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        engine.configure({
            "Hash": 64,
            "Threads": 1,
            "UCI_LimitStrength": True,
            "UCI_Elo": elo,
        })
        return engine
    except Exception as e:
        print(f"Error starting Stockfish: {e}")
        return None

def get_engine(game):
    engine = game.get('engine')
    if engine is None:
        print("Starting new stockfish instance")
        game['engine'] = start_engine(game.get('elo', 1320))
        return game['engine']

    try:
        engine.ping()
    except Exception:
        print("Restarting engine")
        try:
            engine.close()
        except Exception:
            pass
        game['engine'] = start_engine(game.get('elo', 1320))

    return game['engine']

@app.route('/api/set_elo', methods=['POST'])
def set_stockfish_difficulty():
    data = request.json
    elo = data.get('elo')
    
    game = get_game()
    game['elo'] = elo
    engine = get_engine(game)

    try:
        if engine:
            engine.configure({
                "UCI_LimitStrength": True,
                "UCI_Elo": elo,
            })
    except Exception as e:
        print(f"Error setting ELO: {e}")

    return jsonify({"success": True})

def get_stockfish_move(game, current_board, depth=8, limit_time=0.1):
    """
    stockfish, asks it for the best move under specific constraints and makes the move
    """
    eng = get_engine(game)
    if eng is None:
        print("No engine available")
        return None
    try:
        limit = chess.engine.Limit(time=limit_time, depth=depth)
        result = eng.play(current_board, limit)
        return result.move
    except Exception as e:
        print(f"Error communicating with Stockfish: {e}")
        return None

def get_game_state(board):
    """Helper function to package the current board state."""
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
        "is_check": "" if not board.is_check() else ("w" if board.turn == chess.WHITE else "b"),
        "status_text": status_text
    }

@app.route('/')
def home():
    """Generates HTML webpage (home screen)"""
    return send_from_directory('.', 'index.html')

@app.route('/game')
def game():
    """Generates HTML webpage (game screen)"""
    return send_from_directory('.', 'game.html')

@app.route('/api/legal_moves', methods=['GET'])
def get_legal_moves():
    """Helper function to package the current board state."""
    game = get_game()
    legal_uci_strings = [move.uci() for move in game['board'].legal_moves]
    return jsonify(legal_uci_strings)

@app.route('/api/state', methods=['GET'])
def get_state():
    """Returns the json of the current game state"""
    game = get_game()
    return jsonify(get_game_state(game['board']))

@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    source = data.get('from')
    target = data.get('to')
    promotion = data.get('promotion', '')

    game = get_game()
    board = game['board']

    # UCI format (e.g., e2e4, or e7e8q)
    uci_move = source + target + promotion

    try:
        move = chess.Move.from_uci(uci_move)
        board.push(move)
        return jsonify({"success": True, "state": get_game_state(board)})
    except ValueError:
        return jsonify({"success": False, "state": get_game_state(board)})

@app.route('/api/skip_move', methods=['POST'])
def skip_move():
    game = get_game()
    game['board'].push(chess.Move.null())
    return jsonify({"success": True})

@app.route('/api/remove_piece', methods=['POST'])
def remove_piece():
    data = request.json
    square = data.get('square')
    
    game = get_game()
    board = game['board']

    try:
        board.remove_piece_at(chess.parse_square(square))
        return jsonify({"success": True})
    except ValueError:
        return jsonify({"success": False})
    
@app.route('/api/check', methods=['POST'])
def check_move():
    data = request.json
    source = data.get('from')
    target = data.get('to')
    promotion = data.get('promotion', '')

    game = get_game()
    board = game['board']

    # UCI format (e2e4, e7e8q)
    uci_move = source + target + promotion
    try:
        move = chess.Move.from_uci(uci_move)
        legal_uci_strings = [move.uci() for move in board.legal_moves]
        # check if the move is among legal moves
        if uci_move in legal_uci_strings:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False})
    except ValueError:
        return jsonify({"success": False})
    
@app.route('/api/stockfish_move', methods=['POST'])
def stockfish_move():
    game = get_game()
    board = game['board']
    
    if board.is_game_over():
        return jsonify({"success": False, "message": "Game is already over"})
    
    best_move = get_stockfish_move(game, board)
    
    if best_move and best_move in board.legal_moves:
        board.push(best_move) # execute move onto python chess board
        
        return jsonify({
            "success": True, 
            "move": best_move.uci(),
            "fen": board.fen(),
            "turn": "w" if board.turn == chess.WHITE else "b"
        })
    
    return jsonify({"success": False, "message": "Stockfish failed to pick a legal move"})

@app.route('/api/reset', methods=['POST'])
def reset():
    data = request.json
    fen = data.get('fen') # setup position based on FEN 

    game = get_game()
    game['board'] = chess.Board(fen)

    return jsonify(get_game_state(game['board']))

@app.route('/api/undo', methods=['POST'])
def undo():
    game = get_game()
    board = game['board']
    if len(board.move_stack) > 0:
        board.pop()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
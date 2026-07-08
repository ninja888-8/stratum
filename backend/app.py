from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import chess
import chess.engine
import random

app = Flask(__name__, template_folder='../templates', static_folder='../static')
CORS(app) 

board = chess.Board()
STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), '../engine/stockfish/stockfish.exe')

# start engine up
try:
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
except Exception as e:
    print(f"Error starting Stockfish: {e}")

@app.route('/api/set_elo', methods=['POST'])
def set_stockfish_difficulty():
    data = request.json
    elo = data.get('elo')
    
    global engine
    engine.configure({
        "UCI_LimitStrength": True,
        "UCI_Elo": elo
    })  
    return jsonify({"success": True,})

def get_stockfish_move(current_board, depth=15, limit_time=0.5):
    """
    stockfish, asks it for the best move under specific constraints and makes the move
    """
    try:
        global engine
        # set stockfish thinking limits (ethink for maximum [x] seconds or up to [x] moves deep)
        limit = chess.engine.Limit(time=limit_time, depth=depth)
        
        # Ask Stockfish to evaluate the position
        result = engine.play(current_board, limit)
        
        return result.move
    except Exception as e:
        print(f"Error communicating with Stockfish: {e}")
        return None

def get_game_state():
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
    global engine
    engine.close()
    return render_template('index.html')

@app.route('/game')
def game():
    """Generates HTML webpage (game screen)"""
    global engine
    try:
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    except Exception as e:
        print(f"Error starting Stockfish: {e}")
    return render_template('game.html')

@app.route('/api/legal_moves', methods=['GET'])
def get_legal_moves():
    """Helper function to package the current board state."""
    legal_uci_strings = [move.uci() for move in board.legal_moves]
    return jsonify(legal_uci_strings)

@app.route('/api/state', methods=['GET'])
def get_state():
    """Returns the json of the current game state"""
    return jsonify(get_game_state())

@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    source = data.get('from')
    target = data.get('to')
    promotion = data.get('promotion', '')

    # Combine source, target, and promotion into UCI format (e.g., e2e4, or e7e8q)
    uci_move = source + target + promotion

    try:
        move = chess.Move.from_uci(uci_move)
        board.push(move)
        return jsonify({"success": True, "state": get_game_state()})
    except ValueError:
        # Catch invalid UCI formats
        return jsonify({"success": False, "state": get_game_state()})

@app.route('/api/skip_move', methods=['POST'])
def skip_move():
    board.push(chess.Move.null())
    return jsonify({"success": True})

@app.route('/api/remove_piece', methods=['POST'])
def remove_piece():
    data = request.json
    square = data.get('square')
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

    # combine move into UCI format (e2e4, e7e8q)
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
        # Catch invalid UCI formats
        return jsonify({"success": False})
    
@app.route('/api/stockfish_move', methods=['POST'])
def stockfish_move():
    global board
    
    if board.is_game_over():
        return jsonify({"success": False, "message": "Game is already over"})
    
    best_move = get_stockfish_move(board)
    
    if best_move and best_move in board.legal_moves:
        move_uci = best_move.uci()
        board.push(best_move) # execute move onto python chess board
        
        return jsonify({
            "success": True, 
            "move": move_uci,
            "fen": board.fen(),
            "turn": "w" if board.turn == chess.WHITE else "b"
        })
    
    return jsonify({"success": False, "message": "Stockfish failed to pick a legal move"})

@app.route('/api/reset', methods=['POST'])
def reset():
    data = request.json
    fen = data.get('fen') # setup position based on FEN 

    global board
    board.reset()
    board = chess.Board(fen)

    return jsonify(get_game_state())

@app.route('/api/undo', methods=['POST'])
def undo():
    if len(board.move_stack) > 0:
        board.pop()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
# stratum
singleplayer chess with a small twist (modifiers!)

<img width="1137" height="606" alt="image" src="https://github.com/user-attachments/assets/41d04174-aec8-47d3-816d-53fe3e9d99b9" />

## modifiers
- changes the game slightly (a buff, a debuff, or something in between?)
- chess remains mostly vanilla
- combine specific modifiers that meet a level's bonus requirements!

## levels
- seperate from engine difficulties
- different starting layouts, in generally increasing difficulty

## gameplay
- chess remains mostly vanilla
- play against three different difficulties of stockfish at medium depth

# local hosting

## requirements
- python 3.8+, flask, chess

install required packages using
```
pip install Flask chess
```

### windows:

from https://github.com/official-stockfish/Stockfish/releases, download the lastest version of Stockfish and ensure that the stockfish.exe binary is located under engine\stockfish\stockfish.exe

## usage
```
$ python3 backend\app.py
```
navigate to localhost (http://127.0.0.1:5000/)

(warning: game data remains cached in LocalStorage)

# web playable

(code located on the web branch of this repository)

navigate to https://stratum-ynaa.onrender.com (WIP) !

## notes
- keep in mind that local hosting most likely leads to a smoother experience due to Render memory and CPU limits
- some AI usage when it comes to the CSS (especially for the front page) and code formatting / refactoring

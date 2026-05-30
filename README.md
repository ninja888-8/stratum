# stratum
singleplayer chess with a small twist (modifiers!)

<img width="511" height="508" alt="image" src="https://github.com/user-attachments/assets/75fb6f49-6fd4-41f6-89ae-a664895ebbd7" />

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

## requirements
- python 3.8+, flask, chess

install required packages using
```
pip install Flask chess
```

## usage
```
$ python3 backend\app.py
```
navigate to localhost (http://127.0.0.1:5000/)

(warning: game data remains cached in LocalStorage)

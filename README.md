# stratum
singleplayer chess with a small twist (modifiers!)

<img width="1496" height="670" alt="image" src="https://github.com/user-attachments/assets/2cee0385-661a-4dc6-8f91-936eba5b820d" />

### modifiers
- changes the game slightly (a buff, a debuff, or something in between?)
- chess remains mostly vanilla
- combine specific modifiers that meet a level's bonus requirements!

### levels
- seperate from engine difficulties
- different starting layouts, in generally increasing difficulty

### gameplay
- chess remains mostly vanilla
- play against three different difficulties of stockfish at medium depth

# standalone executable

navigate to *releases* tab, and download the executable and run!

# local hosting

### stockfish installation:

from https://github.com/official-stockfish/Stockfish/releases, download the latest version of Stockfish for your operating system, extract, and place it located under engine/stockfish/[stockfish.exe / stockfish-mac / stockfish-linux]

for mac & linux, run the following command to ensure the file is executable
```
$ chmod +x [stockfish name]
```

## usage
```
$ python3 backend\app.py
```
(from the root directory) and you're all set!

# web playable

(code located on the web branch of this repository)

navigate to https://stratum-ynaa.onrender.com (WIP; struggles to handle more than one user at a time)

## notes
- keep in mind that the official release or local hosting will lead to a much smoother experience due to Render memory and CPU limits
- some AI usage when it comes to the CSS (especially for the front page) and code formatting / refactoring

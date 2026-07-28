#!/usr/bin/env bash
set -e

pip install -r requirements.txt

echo "Downloading Stockfish..."
wget -q https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64.tar
tar -xf stockfish-ubuntu-x86-64.tar

mv stockfish/stockfish-ubuntu-x86-64 ./stockfish_bin
rm -rf stockfish/
rm -f stockfish-ubuntu-x86-64.tar
mv ./stockfish_bin ./stockfish

chmod +x ./stockfish
echo "Process complete"
set -e

pip install -r requirements.txt

echo "Downloading Stockfish..."
wget -q https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64.tar
tar -xf stockfish-ubuntu-x86-64.tar
find . -name "stockfish*" -type f -not -name "*.tar" -exec mv {} ./stockfish \;
rm -rf stockfish-ubuntu-x86-64.tar stockfish/

chmod +x ./stockfish
echo "Process complete"
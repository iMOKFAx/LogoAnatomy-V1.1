#!/bin/bash
# Logo Anatomy v1.0 installer for macOS - by Mohamed Mostafa
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/LogoAnatomy"
echo "Installing Logo Anatomy..."
for v in 11 12 13 14; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$DIR/LogoAnatomy/." "$DEST/"
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null
echo ""
echo "Done. Restart Illustrator, then open: Window > Extensions > Logo Anatomy"

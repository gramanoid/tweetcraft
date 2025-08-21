#!/bin/bash
# TweetCraft AI Extension Packaging Script
# Creates a production-ready zip file from the extension/ directory

set -e

# Get version from manifest.json
VERSION=$(grep '"version":' extension/manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_NAME="tweetcraft-ai-${VERSION}-${TIMESTAMP}.zip"

echo "📦 Packaging TweetCraft AI Extension v${VERSION}"
echo "Creating: ${ZIP_NAME}"

# Ensure we're in the project root
if [ ! -d "extension" ]; then
    echo "❌ Error: extension/ directory not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Create zip from extension directory
cd extension
zip -r "../${ZIP_NAME}" . \
    -x "*.DS_Store" \
    -x "*.git*" \
    -x "*.tmp" \
    -x "*.log"

cd ..

echo "✅ Extension packaged successfully!"
echo "📁 File: ${ZIP_NAME}"
echo "📏 Size: $(du -h "${ZIP_NAME}" | cut -f1)"
echo ""
echo "🚀 Ready for:"
echo "   • Chrome Web Store upload"
echo "   • Manual installation (unpack zip and load unpacked)"
echo "   • Distribution"
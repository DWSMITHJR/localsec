#!/bin/bash

echo "🔐 Starting Local Security Vault..."
echo ""
echo "This will start a local web server. Open your browser to http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python first
if command -v python3 &> /dev/null; then
    echo "Using Python server..."
    python3 -m http.server 8000
    exit 0
fi

# Try Python 2
if command -v python &> /dev/null; then
    echo "Using Python server..."
    python -m http.server 8000
    exit 0
fi

# Try Node.js http-server
if command -v npx &> /dev/null; then
    echo "Using Node.js http-server..."
    npx http-server -p 8000
    exit 0
fi

# Try PHP
if command -v php &> /dev/null; then
    echo "Using PHP server..."
    php -S localhost:8000
    exit 0
fi

echo "❌ No web server found!"
echo "Please install one of the following:"
echo "- Python (python3 -m http.server or python -m http.server)"
echo "- Node.js (npx http-server)"
echo "- PHP (php -S localhost:8000)"
echo ""
echo "Or simply open index.html directly in your browser."
echo ""
echo "Installation commands:"
echo "Ubuntu/Debian: sudo apt install python3 php"
echo "macOS: brew install python php"
echo "Windows: Download from python.org or nodejs.org"

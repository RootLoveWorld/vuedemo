#!/bin/bash

# AI Workflow Platform Setup Script

set -e

echo "🚀 Setting up AI Workflow Platform..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js version must be >= 20.0.0"
  echo "   Current version: $(node -v)"
  exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check pnpm
echo ""
echo "📦 Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is not installed"
  echo "   Install it with: npm install -g pnpm"
  exit 1
fi
echo "✅ pnpm version: $(pnpm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Initialize git hooks
echo ""
echo "🔧 Setting up git hooks..."
if [ ! -d ".git" ]; then
  git init
fi
chmod +x .husky/pre-commit .husky/commit-msg

# Format code
echo ""
echo "✨ Formatting code..."
pnpm format

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example files in apps/* directories"
echo "  2. Configure your environment variables"
echo "  3. Run 'pnpm dev' to start development servers"
echo ""

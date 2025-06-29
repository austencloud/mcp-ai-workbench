#!/bin/bash
# Unified development start script

echo "🚀 Starting MCP AI Workbench (Unified)"
echo "=================================="

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run generate

# Start both server and client
echo "🌟 Starting development servers..."
npm run dev

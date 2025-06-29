#!/bin/bash
# Unified build script

echo "🏗️ Building MCP AI Workbench (Unified)"
echo "====================================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run generate

# Build server and client
echo "🏗️ Building application..."
npm run build

echo "✅ Build completed!"
echo "📁 Server build: dist/server/"
echo "📁 Client build: dist/client/"

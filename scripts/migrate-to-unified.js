#!/usr/bin/env node

// Migration script to finalize the unified structure
// This script completes the migration and cleans up old files

const fs = require('fs');
const path = require('path');

console.log('🚀 Finalizing unified codebase structure...\n');

// Step 1: Backup old structure
console.log('📦 Creating backup of old structure...');
const backupDir = 'backup-' + new Date().toISOString().replace(/[:.]/g, '-');

try {
  if (fs.existsSync('backend') || fs.existsSync('frontend')) {
    fs.mkdirSync(backupDir, { recursive: true });
    
    if (fs.existsSync('backend')) {
      console.log('  - Backing up backend/');
      fs.cpSync('backend', path.join(backupDir, 'backend'), { recursive: true });
    }
    
    if (fs.existsSync('frontend')) {
      console.log('  - Backing up frontend/');
      fs.cpSync('frontend', path.join(backupDir, 'frontend'), { recursive: true });
    }
    
    console.log(`✅ Backup created in ${backupDir}/\n`);
  }
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}

// Step 2: Replace configuration files
console.log('⚙️ Updating configuration files...');

try {
  // Replace package.json
  if (fs.existsSync('package-unified.json')) {
    fs.copyFileSync('package-unified.json', 'package.json');
    fs.unlinkSync('package-unified.json');
    console.log('  - Updated package.json');
  }
  
  // Replace tsconfig.json
  if (fs.existsSync('tsconfig-unified.json')) {
    fs.copyFileSync('tsconfig-unified.json', 'tsconfig.json');
    fs.unlinkSync('tsconfig-unified.json');
    console.log('  - Updated tsconfig.json');
  }
  
  // Replace vite.config.js
  if (fs.existsSync('vite.config-unified.js')) {
    fs.copyFileSync('vite.config-unified.js', 'vite.config.js');
    fs.unlinkSync('vite.config-unified.js');
    console.log('  - Updated vite.config.js');
  }
  
  // Copy other config files from frontend
  const configFiles = [
    'svelte.config.js',
    'tailwind.config.js',
    'postcss.config.js'
  ];
  
  configFiles.forEach(file => {
    const frontendPath = path.join('frontend', file);
    if (fs.existsSync(frontendPath)) {
      fs.copyFileSync(frontendPath, file);
      console.log(`  - Copied ${file}`);
    }
  });
  
  console.log('✅ Configuration files updated\n');
} catch (error) {
  console.error('❌ Configuration update failed:', error.message);
  process.exit(1);
}

// Step 3: Update import paths in client files
console.log('🔧 Updating import paths...');

function updateImportPaths(dir, fromPattern, toPattern) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir, { recursive: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.svelte'))) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        content = content.replace(fromPattern, toPattern);
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          console.log(`  - Updated imports in ${filePath}`);
        }
      } catch (error) {
        console.warn(`  - Warning: Could not update ${filePath}: ${error.message}`);
      }
    }
  });
}

// Update client imports to use shared types
updateImportPaths(
  'src/client',
  /from ['"]\.\.\/\.\.\/backend\/src\/types/g,
  "from '$shared/types"
);

updateImportPaths(
  'src/client',
  /from ['"]\.\.\/services/g,
  "from '$lib/services"
);

console.log('✅ Import paths updated\n');

// Step 4: Create missing directories and files
console.log('📁 Creating missing structure...');

const requiredDirs = [
  'src/shared/utils',
  'src/shared/constants',
  'dist',
  'public/assets',
  'docs/api'
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  - Created ${dir}/`);
  }
});

// Create shared utilities
const sharedUtilsContent = `// Shared utilities between client and server
export * from './validation';
export * from './formatting';
export * from './constants';

// Common utility functions
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
`;

fs.writeFileSync('src/shared/utils/index.ts', sharedUtilsContent);
console.log('  - Created shared utilities');

// Create shared constants
const sharedConstantsContent = `// Shared constants between client and server

export const API_ENDPOINTS = {
  CHAT: '/rpc',
  WEBSOCKET: '/ws',
  HEALTH: '/health'
} as const;

export const DEFAULT_MODELS = {
  OLLAMA: 'llama3.2',
  OPENAI: 'gpt-4',
  ANTHROPIC: 'claude-3-sonnet',
  GOOGLE: 'gemini-pro'
} as const;

export const REASONING_TYPES = [
  'logical',
  'causal',
  'analogical',
  'mathematical',
  'scientific',
  'commonsense',
  'multi_hop',
  'temporal',
  'spatial',
  'ethical',
  'web_research',
  'memory_recall'
] as const;

export const MAX_TOKENS = {
  DEFAULT: 2000,
  REASONING: 4000,
  TRAINING: 8000
} as const;

export const TIMEOUTS = {
  API_REQUEST: 30000,
  REASONING: 60000,
  WEB_SCRAPING: 45000
} as const;
`;

fs.writeFileSync('src/shared/constants/index.ts', sharedConstantsContent);
console.log('  - Created shared constants');

console.log('✅ Structure completed\n');

// Step 5: Create development scripts
console.log('📝 Creating development scripts...');

const startScript = `#!/bin/bash
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
`;

fs.writeFileSync('scripts/start-dev.sh', startScript);
fs.chmodSync('scripts/start-dev.sh', '755');

const buildScript = `#!/bin/bash
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
`;

fs.writeFileSync('scripts/build.sh', buildScript);
fs.chmodSync('scripts/build.sh', '755');

console.log('  - Created development scripts');
console.log('✅ Development scripts created\n');

// Step 6: Summary
console.log('🎉 UNIFIED STRUCTURE MIGRATION COMPLETE!\n');

console.log('📋 SUMMARY:');
console.log('===========');
console.log('✅ Unified package.json with all dependencies');
console.log('✅ Shared TypeScript configuration');
console.log('✅ Unified Vite configuration');
console.log('✅ Shared types between client and server');
console.log('✅ Updated import paths');
console.log('✅ Created development scripts');
console.log('✅ Backup created for old structure\n');

console.log('🚀 NEXT STEPS:');
console.log('===============');
console.log('1. Run: npm install');
console.log('2. Run: npm run generate');
console.log('3. Run: npm run dev');
console.log('4. Test the unified system');
console.log('5. Remove old backend/ and frontend/ folders when satisfied\n');

console.log('📁 NEW STRUCTURE:');
console.log('==================');
console.log('src/');
console.log('├── server/          (backend code)');
console.log('├── client/          (frontend code)');
console.log('├── shared/          (shared types/utils)');
console.log('└── tests/           (all tests)');
console.log('public/              (static assets)');
console.log('docs/                (documentation)');
console.log('scripts/             (build/dev scripts)\n');

console.log('🎯 Benefits achieved:');
console.log('- Single source of truth');
console.log('- Shared dependencies');
console.log('- Better imports');
console.log('- Unified tooling');
console.log('- Easier development\n');

console.log('Happy coding! 🚀');

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "..", "dist", "server");

function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Fix relative imports without extensions
  content = content.replace(
    /from\s+['"](\.\.[\/\\][^'"]*?)['"];?/g,
    (match, importPath) => {
      if (!importPath.endsWith(".js") && !importPath.endsWith(".json")) {
        modified = true;
        return match.replace(importPath, importPath + ".js");
      }
      return match;
    }
  );

  content = content.replace(
    /from\s+['"](\.[\/\\][^'"]*?)['"];?/g,
    (match, importPath) => {
      if (!importPath.endsWith(".js") && !importPath.endsWith(".json")) {
        modified = true;
        return match.replace(importPath, importPath + ".js");
      }
      return match;
    }
  );

  // Fix dynamic imports
  content = content.replace(
    /import\s*\(\s*['"](\.\.[\/\\][^'"]*?)['"]s*\)/g,
    (match, importPath) => {
      if (!importPath.endsWith(".js") && !importPath.endsWith(".json")) {
        modified = true;
        return match.replace(importPath, importPath + ".js");
      }
      return match;
    }
  );

  content = content.replace(
    /import\s*\(\s*['"](\.[\/\\][^'"]*?)['"]s*\)/g,
    (match, importPath) => {
      if (!importPath.endsWith(".js") && !importPath.endsWith(".json")) {
        modified = true;
        return match.replace(importPath, importPath + ".js");
      }
      return match;
    }
  );

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed imports in ${path.relative(distDir, filePath)}`);
  }
}

function fixImportsInDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`❌ Directory does not exist: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      fixImportsInDirectory(fullPath);
    } else if (item.endsWith(".js")) {
      fixImportsInFile(fullPath);
    }
  }
}

console.log("🔧 Fixing import statements in compiled JavaScript files...");
fixImportsInDirectory(distDir);
console.log("✅ Import fixing complete!");

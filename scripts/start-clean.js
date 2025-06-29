#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

console.log(`${colors.cyan}${colors.bright}🚀 MCP AI Workbench${colors.reset}`);
console.log(`${colors.gray}Starting services...${colors.reset}\n`);

const cleanupPorts = spawn("node", ["scripts/cleanup-ports.js"], {
  stdio: "pipe",
  cwd: process.cwd(),
});

cleanupPorts.stdout.on("data", (data) => {
  const output = data.toString().trim();
  if (output.includes("🧹") || output.includes("✅")) {
    console.log(output);
  }
});

cleanupPorts.on("close", () => {
  const backend = spawn("npm", ["run", "dev"], {
    stdio: "pipe",
    cwd: path.join(process.cwd(), "backend"),
    shell: true,
  });

  const frontend = spawn("npm", ["run", "dev"], {
    stdio: "pipe",
    cwd: path.join(process.cwd(), "frontend"),
    shell: true,
  });

  let backendReady = false;
  let frontendReady = false;

  backend.stdout.on("data", (data) => {
    const output = data.toString();
    if (
      (output.includes("Backend server running") ||
        output.includes("✅ Backend server running")) &&
      !backendReady
    ) {
      console.log(`${colors.green}✅ Backend ready${colors.reset}`);
      backendReady = true;
      checkAllReady();
    }
  });

  frontend.stdout.on("data", (data) => {
    const output = data.toString();
    if (
      (output.includes("ready in") || output.includes("Local:")) &&
      !frontendReady
    ) {
      console.log(`${colors.green}✅ Frontend ready${colors.reset}`);
      frontendReady = true;
      checkAllReady();
    }
  });

  function checkAllReady() {
    if (backendReady && frontendReady) {
      console.log(
        `\n${colors.cyan}${colors.bright}🎉 Ready to go!${colors.reset}`
      );
      console.log(
        `${colors.blue}${colors.bright}➜ Open: http://localhost:4174${colors.reset}\n`
      );
      console.log(`${colors.gray}Press Ctrl+C to stop${colors.reset}`);
    }
  }

  backend.stderr.on("data", (data) => {
    const output = data.toString();
    if (!output.includes("ts-node-dev") && !output.includes("[INFO]")) {
      console.error(output.trim());
    }
  });

  process.on("SIGINT", () => {
    console.log(`\n${colors.gray}Shutting down...${colors.reset}`);
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
});

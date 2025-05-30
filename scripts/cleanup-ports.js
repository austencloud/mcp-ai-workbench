#!/usr/bin/env node

/**
 * Port Cleanup Script for MCP AI Workbench
 * Aggressively cleans up ports 4000-4010 before starting the application
 */

const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

const PORTS_TO_CLEAN = [
  4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010,
];

async function killProcessOnPort(port) {
  try {
    // Get all processes using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout
      .split("\n")
      .filter((line) => line.includes("LISTENING"));

    if (lines.length === 0) {
      return true;
    }

    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0" && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        await execAsync(`taskkill /PID ${pid} /F /T`);
      } catch (killError) {
        try {
          await execAsync(`wmic process ${pid} delete`);
        } catch (wmicError) {
          // Silent fail
        }
      }
    }

    // Wait for processes to terminate
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    // If netstat finds nothing, that means the port is clean
    if (error.code === 1 || error.message.includes("Command failed")) {
      return true;
    }
    return false;
  }
}

async function cleanupAllPorts() {
  console.log("🧹 Cleaning ports...");

  let cleaned = 0;
  let failed = 0;

  for (const port of PORTS_TO_CLEAN) {
    try {
      const success = await killProcessOnPort(port);
      if (success) {
        cleaned++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  if (failed === 0) {
    console.log("✅ All ports cleaned successfully!");
  } else {
    console.log(`⚠️  ${failed} ports could not be cleaned`);
  }

  return failed === 0;
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupAllPorts()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Cleanup failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupAllPorts, killProcessOnPort };

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
    console.log(`🔍 Checking port ${port}...`);

    // Get all processes using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout
      .split("\n")
      .filter((line) => line.includes("LISTENING"));

    if (lines.length === 0) {
      console.log(`✅ Port ${port} is clean`);
      return true;
    }

    console.log(`⚠️  Found ${lines.length} process(es) on port ${port}`);

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
        console.log(`🔪 Killing process ${pid} on port ${port}`);
        await execAsync(`taskkill /PID ${pid} /F /T`);
        console.log(`✅ Killed process ${pid}`);
      } catch (killError) {
        console.log(`⚠️  Failed to kill ${pid}, trying alternative method...`);
        try {
          await execAsync(`wmic process ${pid} delete`);
          console.log(`✅ WMIC killed process ${pid}`);
        } catch (wmicError) {
          console.log(`❌ Could not kill process ${pid}`);
        }
      }
    }

    // Wait for processes to terminate
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    // If netstat finds nothing, that means the port is clean
    if (error.code === 1 || error.message.includes("Command failed")) {
      console.log(`✅ Port ${port} is clean`);
      return true;
    }
    console.log(`⚠️  Error checking port ${port}:`, error.message);
    return false;
  }
}

async function cleanupAllPorts() {
  console.log("🧹 MCP AI Workbench Port Cleanup");
  console.log("================================");
  console.log(`Cleaning ports: ${PORTS_TO_CLEAN.join(", ")}`);
  console.log("");

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
      console.log(`❌ Failed to clean port ${port}:`, error.message);
      failed++;
    }
  }

  console.log("");
  console.log("📊 Cleanup Summary:");
  console.log(`   ✅ Cleaned: ${cleaned} ports`);
  console.log(`   ❌ Failed: ${failed} ports`);

  if (failed === 0) {
    console.log("🎉 All ports cleaned successfully!");
  } else {
    console.log(
      "⚠️  Some ports could not be cleaned. Manual intervention may be required."
    );
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

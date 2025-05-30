import Fastify from "fastify";
import dotenv from "dotenv";
import net from "net";
import { exec } from "child_process";
import { promisify } from "util";
import { fileController } from "./controllers/fileController";
import { todoController } from "./controllers/todoController";
import { workspaceController } from "./controllers/workspaceController";
import { chatController } from "./controllers/chatController";
import { conversationController } from "./controllers/conversationController";
import { workspaceFileController } from "./controllers/workspaceFileController";
import { webController } from "./controllers/webController";
import { memoryControllerMethods } from "./controllers/memoryController";
import { searchProgressManager } from "./services/searchProgressManager";
import * as voiceController from "./controllers/voiceController";

// Load environment variables
dotenv.config();

const app = Fastify({ logger: true });

// Enable CORS for frontend
app.register(require("@fastify/cors"), {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
  ],
  credentials: true,
});

// JSON-RPC endpoint
app.post("/rpc", async (request, reply) => {
  try {
    const { method, params, id } = request.body as any;

    let result;

    switch (method) {
      case "readFile":
        result = await fileController.readFile(params);
        break;
      case "listFiles":
        result = await fileController.listFiles(params);
        break;
      case "getTodos":
        result = await todoController.getTodos(params);
        break;
      case "createTodo":
        result = await todoController.createTodo(params);
        break;
      case "updateTodo":
        result = await todoController.updateTodo(params);
        break;
      case "deleteTodo":
        result = await todoController.deleteTodo(params);
        break;
      case "getWorkspaces":
        result = await workspaceController.getWorkspaces();
        break;
      case "createWorkspace":
        result = await workspaceController.createWorkspace(params);
        break;
      case "updateWorkspace":
        result = await workspaceController.updateWorkspace(params);
        break;
      case "deleteWorkspace":
        result = await workspaceController.deleteWorkspace(params);
        break;
      case "chat":
        result = await chatController.chat(params);
        break;
      case "getConversations":
        result = await conversationController.getConversations(params);
        break;
      case "createConversation":
        result = await conversationController.createConversation(params);
        break;
      case "getConversation":
        result = await conversationController.getConversation(params);
        break;
      case "addMessage":
        result = await conversationController.addMessage(params);
        break;
      case "deleteConversation":
        result = await conversationController.deleteConversation(params);
        break;
      case "getWorkspaceFiles":
        result = await workspaceFileController.getWorkspaceFiles(params);
        break;
      case "addFileToWorkspace":
        result = await workspaceFileController.addFileToWorkspace(params);
        break;
      case "removeFileFromWorkspace":
        result = await workspaceFileController.removeFileFromWorkspace(params);
        break;
      case "getWorkspaceFileContent":
        result = await workspaceFileController.getWorkspaceFileContent(params);
        break;
      case "getAvailableProviders":
        result = await chatController.getAvailableProviders();
        break;
      case "refreshOllamaModels":
        result = await chatController.refreshOllamaModels();
        break;
      case "getSavedPreferences":
        result = await chatController.getSavedPreferences();
        break;
      // Web Browsing endpoints
      case "webSearch":
        result = await webController.webSearch(params);
        break;
      case "webFetch":
        result = await webController.webFetch(params);
        break;
      case "webBrowse":
        result = await webController.webBrowse(params);
        break;
      case "webScreenshot":
        result = await webController.webScreenshot(params);
        break;
      case "webExtract":
        result = await webController.webExtract(params);
        break;
      case "webResearch":
        result = await webController.webResearch(params);
        break;
      case "webVerify":
        result = await webController.webVerify(params);
        break;
      case "webNews":
        result = await webController.webNews(params);
        break;
      case "webCompare":
        result = await webController.webCompare(params);
        break;
      case "webCloseSession":
        result = await webController.webCloseSession(params);
        break;
      case "webGetSessions":
        result = await webController.webGetSessions();
        break;
      case "webScrape":
        result = await webController.webScrape(params);
        break;
      // Memory endpoints
      case "remember":
        result = await memoryControllerMethods.remember(params);
        break;
      case "recall":
        result = await memoryControllerMethods.recall(params);
        break;
      case "getMemoryContext":
        result = await memoryControllerMethods.getMemoryContext(params);
        break;
      case "searchMemories":
        result = await memoryControllerMethods.searchMemories(params);
        break;
      case "getMemoryStats":
        result = await memoryControllerMethods.getMemoryStats(params);
        break;
      case "optimizeMemory":
        result = await memoryControllerMethods.optimizeMemory();
        break;
      case "addConversationMessage":
        result = await memoryControllerMethods.addConversationMessage(params);
        break;
      case "getConversationSummary":
        result = await memoryControllerMethods.getConversationSummary(params);
        break;
      case "findSimilarMemories":
        result = await memoryControllerMethods.findSimilarMemories(params);
        break;
      // New memory endpoints
      case "recordEpisode":
        result = await memoryControllerMethods.recordEpisode(params);
        break;
      case "getEpisodicTimeline":
        result = await memoryControllerMethods.getEpisodicTimeline(params);
        break;
      case "predictOutcome":
        result = await memoryControllerMethods.predictOutcome(params);
        break;
      case "addConcept":
        result = await memoryControllerMethods.addConcept(params);
        break;
      case "findRelatedConcepts":
        result = await memoryControllerMethods.findRelatedConcepts(params);
        break;
      case "verifyFact":
        result = await memoryControllerMethods.verifyFact(params);
        break;
      case "getUserPreferences":
        result = await memoryControllerMethods.getUserPreferences(params);
        break;
      case "adaptToUser":
        result = await memoryControllerMethods.adaptToUser(params);
        break;
      case "getUserInsights":
        result = await memoryControllerMethods.getUserInsights(params);
        break;
      // Voice processing endpoints
      case "processVoiceTranscription":
        result = await new Promise((resolve) => {
          const mockRequest = { body: params };
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.processVoiceTranscription(
            mockRequest as any,
            mockReply as any
          );
        });
        break;
      case "getVoiceStats":
        result = await new Promise((resolve) => {
          const mockRequest = { query: params || {} };
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.getVoiceStats(mockRequest as any, mockReply as any);
        });
        break;
      case "clearVoiceCache":
        result = await new Promise((resolve) => {
          const mockRequest = {};
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.clearVoiceCache(mockRequest as any, mockReply as any);
        });
        break;
      case "testVoiceProcessing":
        result = await new Promise((resolve) => {
          const mockRequest = {};
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.testVoiceProcessing(
            mockRequest as any,
            mockReply as any
          );
        });
        break;
      case "getSupportedLanguages":
        result = await new Promise((resolve) => {
          const mockRequest = {};
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.getSupportedLanguages(
            mockRequest as any,
            mockReply as any
          );
        });
        break;
      case "runTestSuite":
        result = await new Promise((resolve) => {
          const mockRequest = { query: params || {} };
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.runTestSuite(mockRequest as any, mockReply as any);
        });
        break;
      case "testCorrectionSensitivity":
        result = await new Promise((resolve) => {
          const mockRequest = { body: params };
          const mockReply = {
            send: (data: any) => resolve(data),
            status: (code: number) => ({
              send: (data: any) => resolve(data),
            }),
          };
          voiceController.testCorrectionSensitivity(
            mockRequest as any,
            mockReply as any
          );
        });
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    reply.send({
      jsonrpc: "2.0",
      result,
      id,
    });
  } catch (error) {
    reply.send({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
      id: (request.body as any)?.id || null,
    });
  }
});

// Server-Sent Events endpoint for search progress
app.get("/search-progress", async (request, reply) => {
  console.log("🔌 SSE client connected for search progress");

  // Set SSE headers
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Create a mock WebSocket-like object for the search progress manager
  const sseConnection = {
    readyState: 1, // OPEN
    send: (data: string) => {
      try {
        reply.raw.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error("Failed to send SSE message:", error);
      }
    },
    close: () => {
      try {
        reply.raw.end();
      } catch (error) {
        // Connection already closed
      }
    },
    on: (event: string, handler: (...args: any[]) => void) => {
      // Mock event handler for compatibility
      if (event === "close") {
        request.raw.on("close", handler);
      } else if (event === "error") {
        request.raw.on("error", handler);
      }
    },
  };

  // Register connection with search progress manager
  searchProgressManager.addWebSocketConnection(sseConnection);

  // Send initial connection message
  try {
    sseConnection.send(
      JSON.stringify({
        type: "connected",
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Failed to send initial SSE message:", error);
  }

  // Handle client disconnect
  request.raw.on("close", () => {
    console.log("🔌 SSE client disconnected");
  });

  request.raw.on("error", () => {
    console.log("🔌 SSE client error");
  });

  // Keep connection alive
  return reply;
});

// Health check endpoint
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const execAsync = promisify(exec);

const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once("close", () => resolve(false));
      server.close();
    });
    server.on("error", () => resolve(true));
  });
};

const killProcessOnPort = async (port: number): Promise<boolean> => {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout
      .split("\n")
      .filter((line) => line.includes("LISTENING"));

    if (lines.length === 0) {
      console.log(`✅ No processes found on port ${port}`);
      return true;
    }

    let killedAny = false;
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0") {
        console.log(`🔪 Killing process ${pid} on port ${port}`);
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          killedAny = true;
          console.log(`✅ Successfully killed process ${pid}`);
        } catch (killError) {
          console.log(
            `❌ Failed to kill process ${pid}:`,
            (killError as Error).message
          );
        }
      }
    }

    if (killedAny) {
      // Wait longer for processes to fully terminate
      console.log(`⏳ Waiting for processes to terminate...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return killedAny;
  } catch (error) {
    console.log(
      `⚠️  Could not check/kill processes on port ${port}:`,
      (error as Error).message
    );
    return false;
  }
};

const forceKillAllOnPort = async (port: number): Promise<void> => {
  try {
    // More aggressive approach - kill all processes using the port
    console.log(`🔥 Force killing ALL processes on port ${port}...`);

    // Try multiple methods to ensure the port is freed
    const commands = [
      `netstat -ano | findstr :${port}`,
      `wmic process where "commandline like '%${port}%'" get processid /value`,
      `Get-NetTCPConnection -LocalPort ${port} | Select-Object OwningProcess`,
    ];

    for (const cmd of commands) {
      try {
        const { stdout } = await execAsync(cmd);
        const pids = extractPidsFromOutput(stdout, port);

        for (const pid of pids) {
          if (pid && pid !== "0") {
            try {
              await execAsync(`taskkill /PID ${pid} /F /T`); // /T kills child processes too
              console.log(`💀 Force killed process tree ${pid}`);
            } catch (e) {
              // Try alternative kill method
              try {
                await execAsync(`wmic process ${pid} delete`);
                console.log(`💀 WMIC killed process ${pid}`);
              } catch (e2) {
                console.log(`⚠️  Could not kill process ${pid}`);
              }
            }
          }
        }
      } catch (e) {
        // Continue with next method
      }
    }

    // Final wait
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.log(`❌ Force kill failed:`, (error as Error).message);
  }
};

const extractPidsFromOutput = (output: string, port: number): string[] => {
  const pids: string[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.includes(`:${port}`) || line.includes(`${port}`)) {
      // Extract PID from netstat output
      const parts = line.trim().split(/\s+/);
      const lastPart = parts[parts.length - 1];
      if (lastPart && /^\d+$/.test(lastPart)) {
        pids.push(lastPart);
      }
    }

    // Extract from WMIC output
    if (line.includes("ProcessId=")) {
      const match = line.match(/ProcessId=(\d+)/);
      if (match) {
        pids.push(match[1]);
      }
    }
  }

  return [...new Set(pids)]; // Remove duplicates
};

const findAvailablePort = async (startPort: number): Promise<number> => {
  for (let port = startPort; port < startPort + 100; port++) {
    if (!(await isPortInUse(port))) {
      return port;
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`);
};

const start = async () => {
  try {
    let port = parseInt(process.env.PORT || "4000");
    let attempts = 0;
    const maxAttempts = 3;

    console.log(`🚀 Starting MCP Backend server...`);
    console.log(`🎯 Target port: ${port}`);

    while (attempts < maxAttempts) {
      attempts++;
      console.log(
        `\n📍 Attempt ${attempts}/${maxAttempts} to start on port ${port}`
      );

      if (await isPortInUse(port)) {
        console.log(`⚠️  Port ${port} is in use`);
        console.log(`🔧 Attempting to free port ${port}...`);

        const killed = await killProcessOnPort(port);

        if (!killed || (await isPortInUse(port))) {
          console.log(`🔥 Standard kill failed, trying force kill...`);
          await forceKillAllOnPort(port);

          // Wait and check again
          await new Promise((resolve) => setTimeout(resolve, 2000));

          if (await isPortInUse(port)) {
            if (attempts < maxAttempts) {
              console.log(`❌ Port ${port} still in use, retrying...`);
              continue;
            } else {
              console.log(
                `❌ Could not free port ${port} after ${maxAttempts} attempts`
              );
              console.log(`🔍 Finding alternative port...`);
              port = await findAvailablePort(4000);
              console.log(`✅ Using port ${port} instead`);
              break;
            }
          }
        }

        console.log(`✅ Port ${port} is now available`);
      } else {
        console.log(`✅ Port ${port} is available`);
      }

      try {
        await app.listen({ port, host: "0.0.0.0" });
        console.log(
          `\n🎉 SUCCESS! MCP Backend server listening on http://localhost:${port}`
        );
        console.log(`📡 JSON-RPC endpoint: http://localhost:${port}/rpc`);
        console.log(`🏥 Health check: http://localhost:${port}/health`);
        console.log(`\n✨ Server ready for requests!`);
        return;
      } catch (error) {
        console.log(
          `❌ Failed to start server on port ${port}:`,
          (error as Error).message
        );

        if (attempts < maxAttempts) {
          console.log(`🔄 Retrying with different approach...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.log(`🔍 Finding alternative port...`);
          port = await findAvailablePort(4000);
          console.log(`✅ Trying port ${port} instead`);
          attempts = 0; // Reset attempts for new port
        }
      }
    }
  } catch (error) {
    console.error("💥 Fatal error starting server:", error);
    process.exit(1);
  }
};

start();

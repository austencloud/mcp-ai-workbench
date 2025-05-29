import Fastify from "fastify";
import dotenv from "dotenv";
import { fileController } from "./controllers/fileController";
import { todoController } from "./controllers/todoController";
import { workspaceController } from "./controllers/workspaceController";
import { chatController } from "./controllers/chatController";
import { conversationController } from "./controllers/conversationController";
import { workspaceFileController } from "./controllers/workspaceFileController";
import { webController } from "./controllers/webController";

// Load environment variables
dotenv.config();

const app = Fastify({ logger: true });

// Enable CORS for frontend
app.register(require("@fastify/cors"), {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
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

// Health check endpoint
app.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
    console.log("🚀 MCP Backend server listening on http://localhost:4000");
    console.log("📡 JSON-RPC endpoint: http://localhost:4000/rpc");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

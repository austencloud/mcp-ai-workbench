# F5 Magic Setup - Documentation

## What This Setup Does

Your VS Code workspace is now configured so that pressing **F5** will automatically:

1. **Start the backend server** (`npm run dev:server`) in one terminal
2. **Start the frontend client** (`npm run dev:client`) in another terminal  
3. **Wait for both servers to be ready**
4. **Launch Chrome** with your application at `http://localhost:4174`

## How It Works

### Files Created/Modified:

1. **`.vscode/tasks.json`** - Defines the background tasks for starting servers
2. **`.vscode/launch.json`** - Updated to use `preLaunchTask` that starts servers before debugging
3. **`.vscode/keybindings.json`** - Added convenient keyboard shortcuts
4. **`package.json`** - Added `kill-port` dev dependency for cleanup

### Key Features:

- **Background Tasks**: Servers run in the background and stay running
- **Problem Matchers**: VS Code can detect when servers are ready
- **Parallel Execution**: Both servers start simultaneously for faster startup
- **Smart Detection**: Uses pattern matching to know when servers are ready
- **Clean Terminals**: Each server gets its own dedicated terminal panel

## Available Debug Configurations

1. **"Launch Full Stack App"** (Default) - Starts servers + launches Chrome
2. **"Launch Chrome Only"** - Just launches Chrome (servers must be running)

## Keyboard Shortcuts

- **F5** - Start full stack app (default VS Code debug shortcut)
- **Ctrl+Alt+S** - Start all servers manually
- **Ctrl+Shift+F5** - Stop all servers
- **Ctrl+Alt+R** - Restart all servers
- **Ctrl+Alt+D** - Start development mode (concurrently)

## Task Options

Available tasks in Command Palette (`Ctrl+Shift+P` → "Tasks: Run Task"):

1. **Start All Servers** - Starts backend + frontend in parallel
2. **Stop All Servers** - Kills processes on ports 3000, 4174, 5173
3. **Restart All Servers** - Stops then starts all servers
4. **Start Backend Server** - Just the backend (tsx watch)
5. **Start Frontend Client** - Just the frontend (vite dev)
6. **Start Development (npm dev)** - Uses your existing npm dev script

## Usage Tips

### First Time Setup
Just press **F5** - everything will start automatically!

### Daily Development
- Press **F5** to start your full development environment
- Use **Ctrl+Shift+F5** to stop everything when done
- Use **Ctrl+Alt+R** if you need to restart servers

### If Something Goes Wrong
1. Try **Ctrl+Shift+F5** to stop all servers
2. Wait a few seconds
3. Press **F5** again to restart everything

### Terminal Management
- Backend server appears in "Start Backend Server" terminal
- Frontend client appears in "Start Frontend Client" terminal  
- Both terminals stay open and can be monitored
- You can manually interact with either server if needed

## Troubleshooting

### Servers Not Starting
- Check if ports 3000, 4174, or 5173 are already in use
- Run "Stop All Servers" task first
- Check terminal output for error messages

### Browser Not Opening
- Verify the frontend is running on `http://localhost:4174`
- Check if Chrome is installed and set as default browser
- Try "Launch Chrome Only" configuration if servers are running

### Port Issues
The setup handles these common ports:
- **3000** - Backend server (typical Express/Fastify port)
- **4174** - Frontend preview (Vite preview)
- **5173** - Frontend dev server (Vite dev)

You can modify the port cleanup in tasks.json if your setup uses different ports.

## Benefits

✅ **One-click startup** - No more manual `npm start` commands  
✅ **Proper cleanup** - Servers are properly terminated  
✅ **Visual feedback** - Know when servers are ready  
✅ **Error handling** - Problem matchers catch build errors  
✅ **Flexible debugging** - Multiple launch configurations  
✅ **Keyboard shortcuts** - Quick access to common operations  

## Based on VS Code Best Practices

This setup follows Microsoft's recommended patterns for:
- [Node.js debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Task configuration](https://code.visualstudio.com/docs/editor/tasks)
- [Background tasks](https://code.visualstudio.com/docs/editor/tasks#_background-watching-tasks)
- [Launch configurations](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations)

# MCP AI Workbench

An AI-powered workspace management and chat interface built with SvelteKit frontend and Fastify backend.

## Architecture

This project uses a **monorepo structure** with separate frontend and backend applications:

- **Frontend**: SvelteKit + Vite + TailwindCSS + DaisyUI (Port 4174)
- **Backend**: Fastify + Prisma + SQLite + JSON-RPC API (Port 4000)

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Development Setup

1. **Install all dependencies**:

   ```bash
   npm run install:all
   ```

2. **Set up the database**:

   ```bash
   npm run db:setup
   ```

3. **Start both frontend and backend in development mode**:
   ```bash
   npm run dev
   ```

This will start:

- Backend server at `http://localhost:4000`
- Frontend development server at `http://localhost:4174`

### Available Scripts

#### Root Level Commands

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:backend` - Start only the backend
- `npm run build` - Build both applications for production
- `npm run install:all` - Install dependencies for root, frontend, and backend
- `npm run db:setup` - Generate Prisma client and run migrations
- `npm run clean` - Remove all node_modules directories

#### Individual Service Commands

- `npm run dev:frontend` - Start frontend dev server (Vite)
- `npm run dev:backend` - Start backend dev server (ts-node-dev)
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client

### Manual Development (Alternative)

If you prefer to run services individually:

1. **Backend**:

   ```bash
   cd backend
   npm install
   npm run generate  # Generate Prisma client
   npm run migrate   # Run database migrations
   npm run dev       # Start backend server
   ```

2. **Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev       # Start frontend dev server
   ```

## Project Structure

```
mcp-ai-workbench/
├── package.json          # Root orchestration package
├── frontend/             # SvelteKit application
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/              # Fastify API server
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## API Communication

The frontend communicates with the backend via JSON-RPC calls:

- **Endpoint**: `http://localhost:4000/rpc`
- **Protocol**: JSON-RPC 2.0
- **Methods**: File operations, Todo management, Workspace management, Chat

## Database

- **Type**: SQLite (via Prisma ORM)
- **Location**: `backend/prisma/dev.db`
- **Schema**: `backend/prisma/schema.prisma`

## Troubleshooting

### Common Issues

1. **"Cannot find package.json" error when running `npm run dev` from root**:

   - This is now fixed with the root package.json file

2. **Port conflicts**:

   - Backend runs on port 4000
   - Frontend runs on port 4174
   - Make sure these ports are available

3. **Database issues**:

   - Run `npm run db:setup` to regenerate client and run migrations
   - Delete `backend/prisma/dev.db` and re-run migrations if needed

4. **CORS issues**:
   - Backend is configured to allow requests from `localhost:4174` and `localhost:3000`

### Development Tips

- Use `npm run dev` from the root directory for the best development experience
- Both services support hot reloading
- Check browser console and terminal output for errors
- The backend includes request logging for debugging API calls

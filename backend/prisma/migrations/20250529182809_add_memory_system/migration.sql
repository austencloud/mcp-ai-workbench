-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "embedding" JSONB,
    "tags" JSONB NOT NULL,
    "relationships" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "source" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "userId" TEXT,
    "conversationId" TEXT,
    "workspaceId" TEXT
);

-- CreateTable
CREATE TABLE "conversation_memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyTopics" JSONB NOT NULL,
    "participants" JSONB NOT NULL,
    "mood" TEXT,
    "outcomes" JSONB NOT NULL,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationMemoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importance" REAL NOT NULL DEFAULT 0.3,
    "extractedInfo" JSONB NOT NULL,
    CONSTRAINT "conversation_messages_conversationMemoryId_fkey" FOREIGN KEY ("conversationMemoryId") REFERENCES "conversation_memories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "strength" REAL NOT NULL DEFAULT 0.5,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "knowledge_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "concept" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "sources" JSONB NOT NULL,
    "lastVerified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "relationships" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "memory_vectors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoryId" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "memories_type_idx" ON "memories"("type");

-- CreateIndex
CREATE INDEX "memories_importance_idx" ON "memories"("importance");

-- CreateIndex
CREATE INDEX "memories_createdAt_idx" ON "memories"("createdAt");

-- CreateIndex
CREATE INDEX "memories_lastAccessed_idx" ON "memories"("lastAccessed");

-- CreateIndex
CREATE INDEX "memories_userId_idx" ON "memories"("userId");

-- CreateIndex
CREATE INDEX "memories_conversationId_idx" ON "memories"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_memories_conversationId_key" ON "conversation_memories"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_memories_userId_idx" ON "conversation_memories"("userId");

-- CreateIndex
CREATE INDEX "conversation_memories_conversationId_idx" ON "conversation_memories"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_memories_importance_idx" ON "conversation_memories"("importance");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationMemoryId_idx" ON "conversation_messages"("conversationMemoryId");

-- CreateIndex
CREATE INDEX "conversation_messages_timestamp_idx" ON "conversation_messages"("timestamp");

-- CreateIndex
CREATE INDEX "user_preferences_userId_idx" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_category_idx" ON "user_preferences"("category");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_category_preference_key" ON "user_preferences"("userId", "category", "preference");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_nodes_concept_key" ON "knowledge_nodes"("concept");

-- CreateIndex
CREATE INDEX "knowledge_nodes_concept_idx" ON "knowledge_nodes"("concept");

-- CreateIndex
CREATE INDEX "knowledge_nodes_confidence_idx" ON "knowledge_nodes"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "memory_vectors_memoryId_key" ON "memory_vectors"("memoryId");

-- CreateIndex
CREATE INDEX "memory_vectors_memoryId_idx" ON "memory_vectors"("memoryId");

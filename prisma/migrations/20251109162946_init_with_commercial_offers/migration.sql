-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "deadline" DATETIME NOT NULL,
    "budget" REAL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "description" TEXT,
    "originalFile" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "requests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "searchStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "quotesRequested" INTEGER NOT NULL DEFAULT 0,
    "quotesReceived" INTEGER NOT NULL DEFAULT 0,
    "aiRecommendation" TEXT,
    "finalChoice" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "address" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "contractValidTo" DATETIME,
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "whatsapp" TEXT
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contacts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "request_suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "requestSent" BOOLEAN NOT NULL DEFAULT false,
    "requestSentAt" DATETIME,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseAt" DATETIME,
    "channel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foundVia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "request_suppliers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "request_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "totalPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "deliveryTerm" TEXT,
    "paymentTerm" TEXT,
    "originalFile" TEXT,
    "isParsed" BOOLEAN NOT NULL DEFAULT false,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "score" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quotes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quotes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "positionId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_items_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "isApproved" BOOLEAN,
    "comment" TEXT,
    "selectedQuoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "tasks_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "incoming_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "chatId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'whapi',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "requestId" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chats_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chats_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "messageId" TEXT,
    "direction" TEXT NOT NULL,
    "sender" TEXT,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "attachments" JSONB,
    "metadata" JSONB,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "position_chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestSentAt" DATETIME,
    "quoteReceivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "position_chats_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "position_chats_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "commercial_offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "mimeType" TEXT NOT NULL,
    "totalPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "company" TEXT,
    "deliveryTerm" TEXT,
    "paymentTerm" TEXT,
    "validUntil" TEXT,
    "positions" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT true,
    "extractedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "commercial_offers_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "commercial_offers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "requests_requestNumber_key" ON "requests"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_inn_key" ON "suppliers"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "request_suppliers_requestId_supplierId_key" ON "request_suppliers"("requestId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "incoming_messages_messageId_key" ON "incoming_messages"("messageId");

-- CreateIndex
CREATE INDEX "incoming_messages_phoneNumber_idx" ON "incoming_messages"("phoneNumber");

-- CreateIndex
CREATE INDEX "incoming_messages_timestamp_idx" ON "incoming_messages"("timestamp");

-- CreateIndex
CREATE INDEX "incoming_messages_processed_idx" ON "incoming_messages"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "chats_phoneNumber_key" ON "chats"("phoneNumber");

-- CreateIndex
CREATE INDEX "chats_phoneNumber_idx" ON "chats"("phoneNumber");

-- CreateIndex
CREATE INDEX "chats_requestId_idx" ON "chats"("requestId");

-- CreateIndex
CREATE INDEX "chats_status_idx" ON "chats"("status");

-- CreateIndex
CREATE INDEX "chats_lastMessageAt_idx" ON "chats"("lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_messages_chatId_idx" ON "chat_messages"("chatId");

-- CreateIndex
CREATE INDEX "chat_messages_timestamp_idx" ON "chat_messages"("timestamp");

-- CreateIndex
CREATE INDEX "chat_messages_direction_idx" ON "chat_messages"("direction");

-- CreateIndex
CREATE INDEX "chat_messages_status_idx" ON "chat_messages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "position_chats_positionId_chatId_key" ON "position_chats"("positionId", "chatId");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_name_key" ON "message_templates"("name");

-- CreateIndex
CREATE INDEX "commercial_offers_chatId_idx" ON "commercial_offers"("chatId");

-- CreateIndex
CREATE INDEX "commercial_offers_requestId_idx" ON "commercial_offers"("requestId");

-- CreateIndex
CREATE INDEX "commercial_offers_status_idx" ON "commercial_offers"("status");

-- CreateIndex
CREATE INDEX "commercial_offers_createdAt_idx" ON "commercial_offers"("createdAt");

-- CreateTable
CREATE TABLE "request_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "selectedOfferId" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "finalPrice" REAL NOT NULL,
    "finalCurrency" TEXT NOT NULL DEFAULT 'KZT',
    "selectedSupplier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "request_decisions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "request_decisions_selectedOfferId_fkey" FOREIGN KEY ("selectedOfferId") REFERENCES "commercial_offers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "request_decisions_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assistant_threads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "supplierName" TEXT,
    "requestId" TEXT,
    "lastMessageAt" DATETIME,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assistant_threads_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_commercial_offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "positionId" TEXT,
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
    CONSTRAINT "commercial_offers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "commercial_offers_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_commercial_offers" ("chatId", "company", "confidence", "createdAt", "currency", "deliveryTerm", "extractedText", "fileName", "filePath", "id", "mimeType", "needsManualReview", "paymentTerm", "positions", "requestId", "reviewedAt", "reviewedBy", "status", "totalPrice", "updatedAt", "validUntil") SELECT "chatId", "company", "confidence", "createdAt", "currency", "deliveryTerm", "extractedText", "fileName", "filePath", "id", "mimeType", "needsManualReview", "paymentTerm", "positions", "requestId", "reviewedAt", "reviewedBy", "status", "totalPrice", "updatedAt", "validUntil" FROM "commercial_offers";
DROP TABLE "commercial_offers";
ALTER TABLE "new_commercial_offers" RENAME TO "commercial_offers";
CREATE INDEX "commercial_offers_chatId_idx" ON "commercial_offers"("chatId");
CREATE INDEX "commercial_offers_requestId_idx" ON "commercial_offers"("requestId");
CREATE INDEX "commercial_offers_positionId_idx" ON "commercial_offers"("positionId");
CREATE INDEX "commercial_offers_status_idx" ON "commercial_offers"("status");
CREATE INDEX "commercial_offers_createdAt_idx" ON "commercial_offers"("createdAt");
CREATE TABLE "new_requests" (
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
    "searchRegion" TEXT NOT NULL DEFAULT 'KAZAKHSTAN',
    "enableCategorization" BOOLEAN NOT NULL DEFAULT false,
    "categories" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "requests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_requests" ("budget", "createdAt", "creatorId", "currency", "deadline", "description", "id", "originalFile", "priority", "requestNumber", "status", "updatedAt") SELECT "budget", "createdAt", "creatorId", "currency", "deadline", "description", "id", "originalFile", "priority", "requestNumber", "status", "updatedAt" FROM "requests";
DROP TABLE "requests";
ALTER TABLE "new_requests" RENAME TO "requests";
CREATE UNIQUE INDEX "requests_requestNumber_key" ON "requests"("requestNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "request_decisions_requestId_key" ON "request_decisions"("requestId");

-- CreateIndex
CREATE INDEX "request_decisions_requestId_idx" ON "request_decisions"("requestId");

-- CreateIndex
CREATE INDEX "request_decisions_decidedBy_idx" ON "request_decisions"("decidedBy");

-- CreateIndex
CREATE INDEX "request_decisions_createdAt_idx" ON "request_decisions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_threads_chatId_key" ON "assistant_threads"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_threads_threadId_key" ON "assistant_threads"("threadId");

-- CreateIndex
CREATE INDEX "assistant_threads_chatId_idx" ON "assistant_threads"("chatId");

-- CreateIndex
CREATE INDEX "assistant_threads_threadId_idx" ON "assistant_threads"("threadId");

-- CreateIndex
CREATE INDEX "assistant_threads_requestId_idx" ON "assistant_threads"("requestId");

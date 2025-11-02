-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "incoming_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "chatId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'whapi',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incoming_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incoming_messages_messageId_key" ON "incoming_messages"("messageId");

-- CreateIndex
CREATE INDEX "incoming_messages_phoneNumber_idx" ON "incoming_messages"("phoneNumber");

-- CreateIndex
CREATE INDEX "incoming_messages_timestamp_idx" ON "incoming_messages"("timestamp");

-- CreateIndex
CREATE INDEX "incoming_messages_processed_idx" ON "incoming_messages"("processed");

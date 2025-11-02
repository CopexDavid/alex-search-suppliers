-- CreateEnum
CREATE TYPE "PositionSearchStatus" AS ENUM ('PENDING', 'SEARCHING', 'SUPPLIERS_FOUND', 'QUOTES_REQUESTED', 'QUOTES_RECEIVED', 'AI_ANALYZED', 'USER_DECIDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('REQUESTED', 'SENT', 'RECEIVED', 'ANALYZED', 'REJECTED');

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "aiRecommendation" TEXT,
ADD COLUMN     "finalChoice" TEXT,
ADD COLUMN     "quotesReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotesRequested" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchStatus" "PositionSearchStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "position_chats" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestSentAt" TIMESTAMP(3),
    "quoteReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_chats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_chats_positionId_chatId_key" ON "position_chats"("positionId", "chatId");

-- AddForeignKey
ALTER TABLE "position_chats" ADD CONSTRAINT "position_chats_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_chats" ADD CONSTRAINT "position_chats_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

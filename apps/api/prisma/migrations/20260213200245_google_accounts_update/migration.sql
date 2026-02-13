/*
  Warnings:

  - A unique constraint covering the columns `[userId,email]` on the table `GoogleAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `GoogleAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GoogleAccount" DROP CONSTRAINT "GoogleAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_userId_fkey";

-- DropForeignKey
ALTER TABLE "TransferItem" DROP CONSTRAINT "TransferItem_transferId_fkey";

-- AlterTable
ALTER TABLE "GoogleAccount" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "accessToken" DROP NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_userId_email_key" ON "GoogleAccount"("userId", "email");

-- AddForeignKey
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

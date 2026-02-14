/*
  Warnings:

  - A unique constraint covering the columns `[jobId,sourceFileId]` on the table `TransferItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TransferItem_jobId_sourceFileId_key" ON "TransferItem"("jobId", "sourceFileId");

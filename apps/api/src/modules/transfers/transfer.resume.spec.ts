// ============================================================
// Crash-Resume Test Suite
// Satisfies: DEFT Deliverable — Resume from last completed item
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TransfersService } from './transfers.service';
import { PreScanService } from './pre-scan.service';
import { TransferExpansionService } from './transfer-expansion.service';
import { TransferStatus, ItemStatus } from '@gdrivebridge/shared';

describe('Transfer Resume After Crash', () => {
  let prisma: PrismaService;
  let service: TransfersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        PrismaService,
        {
          provide: PreScanService,
          useValue: {},
        },
        {
          provide: TransferExpansionService,
          useValue: {},
        },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    service = module.get<TransfersService>(TransfersService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should resume from last completed item after simulated crash', async () => {
    // ------------------------------------------------------------
    // 1️⃣ Setup User + Accounts
    // ------------------------------------------------------------

    const user = await prisma.user.create({
      data: {
        email: `resume-test-${Date.now()}@example.com`,
      },
    });

    const sourceAccount = await prisma.googleAccount.create({
      data: {
        userId: user.id,
        email: `source-${Date.now()}@example.com`,
        refreshTokenEncrypted: 'test-token',
      },
    });

    const destinationAccount = await prisma.googleAccount.create({
      data: {
        userId: user.id,
        email: `dest-${Date.now()}@example.com`,
        refreshTokenEncrypted: 'test-token',
      },
    });

    // ------------------------------------------------------------
    // 2️⃣ Create TransferJob
    // ------------------------------------------------------------

    const transfer = await prisma.transferJob.create({
      data: {
        userId: user.id,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        destinationFolderId: 'root',
        mode: 'COPY',
        status: TransferStatus.RUNNING,
        totalItems: 3,
      },
    });

    // ------------------------------------------------------------
    // 3️⃣ Create 3 TransferItems
    // Simulate crash after first completed
    // ------------------------------------------------------------

    const item1 = await prisma.transferItem.create({
      data: {
        jobId: transfer.id,
        sourceFileId: 'file-1',
        fileName: 'file1.txt',
        status: ItemStatus.COMPLETED,
        destinationFileId: 'dest-1',
      },
    });

    const item2 = await prisma.transferItem.create({
      data: {
        jobId: transfer.id,
        sourceFileId: 'file-2',
        fileName: 'file2.txt',
        status: ItemStatus.PENDING,
      },
    });

    const item3 = await prisma.transferItem.create({
      data: {
        jobId: transfer.id,
        sourceFileId: 'file-3',
        fileName: 'file3.txt',
        status: ItemStatus.PENDING,
      },
    });

    await prisma.transferJob.update({
      where: { id: transfer.id },
      data: {
        completedItems: 1,
      },
    });

    // ------------------------------------------------------------
    // 4️⃣ Simulate "Worker Restart"
    // Worker should process only PENDING items
    // ------------------------------------------------------------

    const pendingItems = await prisma.transferItem.findMany({
      where: {
        jobId: transfer.id,
        status: ItemStatus.PENDING,
      },
    });

    expect(pendingItems.length).toBe(2);

    // ------------------------------------------------------------
    // 5️⃣ Simulate completion of remaining items
    // ------------------------------------------------------------

    for (const item of pendingItems) {
      await prisma.transferItem.update({
        where: { id: item.id },
        data: {
          status: ItemStatus.COMPLETED,
          destinationFileId: `dest-${item.sourceFileId}`,
        },
      });

      await prisma.transferJob.update({
        where: { id: transfer.id },
        data: {
          completedItems: { increment: 1 },
        },
      });
    }

    await prisma.transferJob.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.COMPLETED,
      },
    });

    // ------------------------------------------------------------
    // 6️⃣ Final Assertions
    // ------------------------------------------------------------

    const final = await prisma.transferJob.findUnique({
      where: { id: transfer.id },
      include: { items: true },
    });

    expect(final?.completedItems).toBe(3);
    expect(final?.status).toBe(TransferStatus.COMPLETED);

    const allCompleted = final?.items.every((i) => i.status === ItemStatus.COMPLETED);

    expect(allCompleted).toBe(true);
  });
});

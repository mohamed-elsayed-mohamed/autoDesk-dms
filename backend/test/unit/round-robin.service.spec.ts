import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RoundRobinService } from '../../src/modules/crm/leads/round-robin.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('RoundRobinService - assignNext', () => {
  let service: RoundRobinService;
  let prisma: jest.Mocked<PrismaService>;

  const makeUser = (id: string) => ({
    id,
    email: `${id}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'SalesConsultant' as const,
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      roundRobinState: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoundRobinService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<RoundRobinService>(RoundRobinService);
    prisma = module.get(PrismaService);
  });

  describe('empty list throws', () => {
    it('should throw BadRequestException when there are no active sales consultants', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            roundRobinState: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: null }),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          });
        },
      );

      await expect(service.assignNext()).rejects.toThrow(BadRequestException);
    });
  });

  describe('single user always gets it', () => {
    it('should always assign to the single available user', async () => {
      const user = makeUser('user-1');

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            roundRobinState: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: null }),
              upsert: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: 'user-1' }),
              update: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: 'user-1' }),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([user]),
            },
          });
        },
      );

      const result = await service.assignNext();
      expect(result).toBe('user-1');
    });
  });

  describe('wraps around from last to first', () => {
    it('should wrap around to the first user after the last user', async () => {
      const users = [makeUser('user-1'), makeUser('user-2'), makeUser('user-3')];

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            roundRobinState: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: 'user-3' }),
              upsert: jest.fn(),
              update: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: 'user-1' }),
            },
            user: {
              findMany: jest.fn().mockResolvedValue(users),
            },
          });
        },
      );

      const result = await service.assignNext();
      expect(result).toBe('user-1');
    });
  });

  describe('sequential assignment', () => {
    it('should assign to user-2 when last assigned was user-1', async () => {
      const users = [makeUser('user-1'), makeUser('user-2'), makeUser('user-3')];

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            roundRobinState: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: 'user-1' }),
              upsert: jest.fn(),
              update: jest
                .fn()
                .mockResolvedValue({ id: 'lead-assignment', lastAssignedUserId: 'user-2' }),
            },
            user: {
              findMany: jest.fn().mockResolvedValue(users),
            },
          });
        },
      );

      const result = await service.assignNext();
      expect(result).toBe('user-2');
    });
  });
});

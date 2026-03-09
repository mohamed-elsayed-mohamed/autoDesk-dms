import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from '../../src/modules/crm/customers/customers.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('CustomersService - checkDuplicates', () => {
  let service: CustomersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockCustomer = {
    id: 'customer-1',
    firstName: 'John',
    lastName: 'Smith',
    phone: '555-123-4567',
    email: 'john@example.com',
    street: null,
    city: null,
    state: null,
    zip: null,
    preferredContact: 'Phone' as const,
    notes: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      customer: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get(PrismaService);
  });

  describe('phone match', () => {
    it('should return customers with matching phone number', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const result = await service.checkDuplicates({ phone: '555-123-4567' });

      expect(result).toHaveLength(1);
      expect(result[0].phone).toBe('555-123-4567');
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([expect.objectContaining({ phone: '555-123-4567' })]),
          }),
        }),
      );
    });
  });

  describe('email match', () => {
    it('should return customers with matching email', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const result = await service.checkDuplicates({ email: 'john@example.com' });

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([expect.objectContaining({ email: 'john@example.com' })]),
          }),
        }),
      );
    });
  });

  describe('excludeId exclusion', () => {
    it('should exclude the customer with the given excludeId', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await service.checkDuplicates({ phone: '555-123-4567', excludeId: 'customer-1' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({ not: 'customer-1' }),
          }),
        }),
      );
    });
  });

  describe('no duplicates case', () => {
    it('should return an empty array when no duplicates exist', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.checkDuplicates({ phone: '555-999-0000' });

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('update - optimistic concurrency', () => {
    it('should throw ConflictException when updatedAt does not match', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({ id: 'customer-1' });
      (prisma.customer.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(
        service.update('customer-1', {
          firstName: 'Jane',
          updatedAt: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

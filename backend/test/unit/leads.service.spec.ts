import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LeadsService } from '../../src/modules/crm/leads/leads.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RoundRobinService } from '../../src/modules/crm/leads/round-robin.service';
import { NotificationsService } from '../../src/modules/crm/notifications/notifications.service';
import { LeadStatus } from '@prisma/client';

describe('LeadsService - updateStatus transitions', () => {
  let service: LeadsService;
  let prisma: jest.Mocked<PrismaService>;

  const makeLead = (status: LeadStatus, lostReason?: string) => ({
    id: 'lead-1',
    customerId: 'customer-1',
    source: 'Phone' as const,
    sourceOther: null,
    status,
    assignedTo: 'user-1',
    lostReason: lostReason ?? null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: 'customer-1', firstName: 'John', lastName: 'Smith' },
    assignee: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
    vehicles: [],
    statusHistory: [],
  });

  beforeEach(async () => {
    const mockPrismaService = {
      lead: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      leadStatusHistory: {
        create: jest.fn(),
      },
    };

    const mockRoundRobinService = { assignNext: jest.fn() };
    const mockNotificationsService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RoundRobinService, useValue: mockRoundRobinService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get(PrismaService);
  });

  describe('Sold lead is immutable', () => {
    it('should throw ConflictException when trying to change status of a Sold lead', async () => {
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(makeLead(LeadStatus.Sold));

      await expect(
        service.updateStatus(
          'lead-1',
          { status: LeadStatus.Lost, lostReason: undefined },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for any target status when lead is Sold', async () => {
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(makeLead(LeadStatus.Sold));

      await expect(
        service.updateStatus('lead-1', { status: LeadStatus.Contacted }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('same status throws', () => {
    it('should throw BadRequestException when setting the same status', async () => {
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(makeLead(LeadStatus.Contacted));

      await expect(
        service.updateStatus('lead-1', { status: LeadStatus.Contacted }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Lost → Contacted succeeds', () => {
    it('should allow transitioning from Lost to Contacted (be-back)', async () => {
      const lead = makeLead(LeadStatus.Lost, 'Chose another dealership');
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(lead);
      (prisma.leadStatusHistory.create as jest.Mock).mockResolvedValue({});
      const updatedLead = { ...lead, status: LeadStatus.Contacted, lostReason: null };
      (prisma.lead.update as jest.Mock).mockResolvedValue(updatedLead);

      const result = await service.updateStatus(
        'lead-1',
        { status: LeadStatus.Contacted },
        'user-1',
      );

      expect(result.status).toBe(LeadStatus.Contacted);
    });
  });

  describe('transition records lostReason when going to Lost', () => {
    it('should store lostReason on the lead when transitioning to Lost', async () => {
      const lead = makeLead(LeadStatus.Negotiating);
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(lead);
      (prisma.leadStatusHistory.create as jest.Mock).mockResolvedValue({});
      const updatedLead = {
        ...lead,
        status: LeadStatus.Lost,
        lostReason: 'Customer bought elsewhere',
      };
      (prisma.lead.update as jest.Mock).mockResolvedValue(updatedLead);

      const result = await service.updateStatus(
        'lead-1',
        { status: LeadStatus.Lost, lostReason: 'Customer bought elsewhere' },
        'user-1',
      );

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lostReason: 'Customer bought elsewhere' }),
        }),
      );
      expect(result.lostReason).toBe('Customer bought elsewhere');
    });
  });

  describe('clears lostReason on reopen from Lost', () => {
    it('should clear lostReason when transitioning away from Lost', async () => {
      const lead = makeLead(LeadStatus.Lost, 'Customer bought elsewhere');
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(lead);
      (prisma.leadStatusHistory.create as jest.Mock).mockResolvedValue({});
      const updatedLead = { ...lead, status: LeadStatus.Contacted, lostReason: null };
      (prisma.lead.update as jest.Mock).mockResolvedValue(updatedLead);

      await service.updateStatus('lead-1', { status: LeadStatus.Contacted }, 'user-1');

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lostReason: null }),
        }),
      );
    });
  });
});

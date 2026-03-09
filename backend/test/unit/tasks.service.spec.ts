import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../../src/modules/crm/tasks/tasks.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

describe('TasksService - isOverdue computation', () => {
  let service: TasksService;

  const makeTask = (status: TaskStatus, dueAt: Date) => ({
    id: 'task-1',
    leadId: 'lead-1',
    assignedTo: 'user-1',
    type: 'Call' as const,
    description: 'Call back',
    dueAt,
    completedAt: null,
    status,
    createdAt: new Date(),
    lead: {
      id: 'lead-1',
      customer: { id: 'customer-1', firstName: 'John', lastName: 'Smith', phone: null },
      source: 'Phone' as const,
      status: 'New' as const,
    },
    assignee: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
  });

  beforeEach(async () => {
    const mockPrismaService = {
      task: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('addIsOverdue helper', () => {
    it('should set isOverdue=true for Pending task with dueAt in the past', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const task = makeTask(TaskStatus.Pending, pastDate);

      const result = service.addIsOverdue(task);

      expect(result.isOverdue).toBe(true);
    });

    it('should set isOverdue=false for Pending task with dueAt in the future', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const task = makeTask(TaskStatus.Pending, futureDate);

      const result = service.addIsOverdue(task);

      expect(result.isOverdue).toBe(false);
    });

    it('should set isOverdue=false for Completed task even if dueAt is in the past', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const task = makeTask(TaskStatus.Completed, pastDate);

      const result = service.addIsOverdue(task);

      expect(result.isOverdue).toBe(false);
    });

    it('should set isOverdue=false for Cancelled task even if dueAt is in the past', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const task = makeTask(TaskStatus.Cancelled, pastDate);

      const result = service.addIsOverdue(task);

      expect(result.isOverdue).toBe(false);
    });

    it('should set isOverdue=false for Pending task with dueAt exactly now', () => {
      const now = new Date();
      const task = makeTask(TaskStatus.Pending, now);

      const result = service.addIsOverdue(task);

      // dueAt >= NOW means not overdue
      expect(result.isOverdue).toBe(false);
    });
  });
});

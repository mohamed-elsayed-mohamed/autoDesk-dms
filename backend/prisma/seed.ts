import {
  PrismaClient,
  UserRole,
  LeadSource,
  LeadStatus,
  ActivityType,
  ActivityDirection,
  TaskStatus,
  PreferredContact,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ─── Users ────────────────────────────────────────────────────────────────
  const usersData = [
    { email: 'inventory@dms.local', firstName: 'Inventory', lastName: 'Manager', role: UserRole.InventoryManager },
    { email: 'sales@dms.local', firstName: 'Sales', lastName: 'Consultant', role: UserRole.SalesConsultant },
    { email: 'gm@dms.local', firstName: 'General', lastName: 'Manager', role: UserRole.GeneralManager },
    { email: 'manager@autodesk-dms.com', firstName: 'Sam', lastName: 'Reynolds', role: UserRole.SalesManager },
    { email: 'bdc@autodesk-dms.com', firstName: 'Maria', lastName: 'Torres', role: UserRole.BDCAgent },
    { email: 'sales1@autodesk-dms.com', firstName: 'Jake', lastName: 'Mitchell', role: UserRole.SalesConsultant },
    { email: 'sales2@autodesk-dms.com', firstName: 'Emily', lastName: 'Chen', role: UserRole.SalesConsultant },
  ];

  const createdUsers: Record<string, { id: string }> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    createdUsers[u.email] = user;
  }

  const mgr = createdUsers['manager@autodesk-dms.com'];
  const bdc = createdUsers['bdc@autodesk-dms.com'];
  const s1 = createdUsers['sales1@autodesk-dms.com'];
  const s2 = createdUsers['sales2@autodesk-dms.com'];

  // ─── RoundRobinState ──────────────────────────────────────────────────────
  await prisma.roundRobinState.upsert({
    where: { id: 'lead-assignment' },
    update: {},
    create: { id: 'lead-assignment', lastAssignedUserId: null },
  });

  // ─── Customers ────────────────────────────────────────────────────────────
  const customer1 = await prisma.customer.upsert({
    where: { id: 'seed-customer-001' },
    update: {},
    create: {
      id: 'seed-customer-001',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '555-100-0001',
      city: 'Springfield',
      state: 'IL',
      preferredContact: PreferredContact.Phone,
      notes: 'Interested in SUVs. Prefers morning calls.',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 'seed-customer-002' },
    update: {},
    create: {
      id: 'seed-customer-002',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@email.com',
      phone: '555-100-0002',
      city: 'Chicago',
      state: 'IL',
      preferredContact: PreferredContact.Email,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: 'seed-customer-003' },
    update: {},
    create: {
      id: 'seed-customer-003',
      firstName: 'Michael',
      lastName: 'Davis',
      phone: '555-100-0003',
      preferredContact: PreferredContact.Text,
      notes: 'Walk-in customer.',
    },
  });

  // ─── Leads ────────────────────────────────────────────────────────────────
  const lead1 = await prisma.lead.upsert({
    where: { id: 'seed-lead-001' },
    update: {},
    create: {
      id: 'seed-lead-001',
      customerId: customer1.id,
      source: LeadSource.Website,
      status: LeadStatus.Contacted,
      assignedTo: s1.id,
      notes: 'Came in through online form.',
    },
  });

  await prisma.leadStatusHistory.upsert({
    where: { id: 'seed-lsh-001' },
    update: {},
    create: {
      id: 'seed-lsh-001',
      leadId: lead1.id,
      fromStatus: LeadStatus.New,
      toStatus: LeadStatus.Contacted,
      changedBy: s1.id,
    },
  });

  const lead2 = await prisma.lead.upsert({
    where: { id: 'seed-lead-002' },
    update: {},
    create: {
      id: 'seed-lead-002',
      customerId: customer2.id,
      source: LeadSource.Phone,
      status: LeadStatus.AppointmentSet,
      assignedTo: s2.id,
    },
  });

  await prisma.leadStatusHistory.createMany({
    data: [
      { id: 'seed-lsh-002a', leadId: lead2.id, fromStatus: LeadStatus.New, toStatus: LeadStatus.Contacted, changedBy: s2.id },
      { id: 'seed-lsh-002b', leadId: lead2.id, fromStatus: LeadStatus.Contacted, toStatus: LeadStatus.AppointmentSet, changedBy: s2.id },
    ],
    skipDuplicates: true,
  });

  const lead3 = await prisma.lead.upsert({
    where: { id: 'seed-lead-003' },
    update: {},
    create: {
      id: 'seed-lead-003',
      customerId: customer3.id,
      source: LeadSource.WalkIn,
      status: LeadStatus.New,
      assignedTo: s1.id,
    },
  });

  // ─── Activities ───────────────────────────────────────────────────────────
  await prisma.activity.createMany({
    data: [
      {
        id: 'seed-act-001',
        customerId: customer1.id,
        leadId: lead1.id,
        type: ActivityType.Call,
        direction: ActivityDirection.Outbound,
        content: 'Left voicemail about test drive availability.',
        performedBy: s1.id,
      },
      {
        id: 'seed-act-002',
        customerId: customer1.id,
        leadId: lead1.id,
        type: ActivityType.Call,
        direction: ActivityDirection.Inbound,
        content: 'Customer called back. Confirmed interest in CR-V.',
        performedBy: s1.id,
      },
      {
        id: 'seed-act-003',
        customerId: customer2.id,
        leadId: lead2.id,
        type: ActivityType.Email,
        direction: ActivityDirection.Outbound,
        content: 'Sent appointment confirmation email.',
        performedBy: s2.id,
      },
      {
        id: 'seed-act-004',
        customerId: customer1.id,
        type: ActivityType.Note,
        content: 'Customer prefers afternoon appointments.',
        performedBy: bdc.id,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Tasks ────────────────────────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  await prisma.task.createMany({
    data: [
      {
        id: 'seed-task-001',
        leadId: lead1.id,
        assignedTo: s1.id,
        type: 'Call' as any,
        description: 'Follow up on test drive interest',
        dueAt: tomorrow,
        status: TaskStatus.Pending,
      },
      {
        id: 'seed-task-002',
        leadId: lead2.id,
        assignedTo: s2.id,
        type: 'Email' as any,
        description: 'Send vehicle quote',
        dueAt: yesterday,
        status: TaskStatus.Pending,
      },
      {
        id: 'seed-task-003',
        leadId: lead3.id,
        assignedTo: s1.id,
        type: 'Call' as any,
        description: 'Initial follow-up call',
        dueAt: tomorrow,
        status: TaskStatus.Completed,
        completedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        id: 'seed-notif-001',
        userId: s1.id,
        type: 'LeadAssigned',
        referenceId: lead1.id,
        message: 'You have been assigned a new lead: John Smith (Website)',
      },
      {
        id: 'seed-notif-002',
        userId: s2.id,
        type: 'LeadAssigned',
        referenceId: lead2.id,
        message: 'You have been assigned a new lead: Sarah Johnson (Phone)',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete: users, customers, leads, activities, tasks, notifications created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

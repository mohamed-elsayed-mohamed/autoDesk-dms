import {
  PrismaClient,
  FiProductType,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ─── Lenders ────────────────────────────────────────────────────────────────
  const lenders = [
    { name: 'Ally Financial', isActive: true, maxMarkupCap: 2.0 },
    { name: 'Chase Auto', isActive: true, maxMarkupCap: 1.75 },
    { name: 'Capital One Auto', isActive: true, maxMarkupCap: null },
    { name: 'TD Auto Finance', isActive: true, maxMarkupCap: null },
    { name: 'Westlake Financial', isActive: true, maxMarkupCap: 2.5 },
  ];

  for (const lender of lenders) {
    await prisma.lender.upsert({
      where: { name: lender.name },
      update: { isActive: lender.isActive, maxMarkupCap: lender.maxMarkupCap },
      create: {
        name: lender.name,
        isActive: lender.isActive,
        maxMarkupCap: lender.maxMarkupCap,
      },
    });
  }
  console.log(`Seeded ${lenders.length} lenders`);

  // ─── Product Catalog ────────────────────────────────────────────────────────
  const catalogItems = [
    { productType: FiProductType.VSC, providerName: 'Safe-Guard Products', isActive: true },
    { productType: FiProductType.VSC, providerName: 'American Guardian', isActive: true },
    { productType: FiProductType.GAP, providerName: 'Safe-Guard Products', isActive: true },
    { productType: FiProductType.GAP, providerName: 'APCO Holdings', isActive: true },
    { productType: FiProductType.TireWheel, providerName: 'Safe-Guard Products', isActive: true },
    { productType: FiProductType.PaintProtection, providerName: 'Zurich', isActive: true },
    { productType: FiProductType.MaintenancePlan, providerName: 'DealerSocket', isActive: true },
    { productType: FiProductType.Other, providerName: 'Generic Provider', isActive: true },
  ];

  for (const item of catalogItems) {
    // Find existing or create
    const existing = await prisma.productCatalogItem.findFirst({
      where: { productType: item.productType, providerName: item.providerName },
    });
    if (!existing) {
      await prisma.productCatalogItem.create({ data: item });
    }
  }
  console.log(`Seeded ${catalogItems.length} product catalog items`);

  // ─── Disclosure Requirements ─────────────────────────────────────────────────
  const disclosures = [
    { jurisdiction: 'US-DEFAULT', disclosureName: 'RISC Notice', isActive: true },
    { jurisdiction: 'US-DEFAULT', disclosureName: 'GAP Waiver Notice', isActive: true },
    { jurisdiction: 'US-DEFAULT', disclosureName: 'Credit Score Disclosure', isActive: true },
  ];

  for (const d of disclosures) {
    const existing = await prisma.disclosureRequirement.findFirst({
      where: { jurisdiction: d.jurisdiction, disclosureName: d.disclosureName },
    });
    if (!existing) {
      await prisma.disclosureRequirement.create({ data: d });
    }
  }
  console.log(`Seeded ${disclosures.length} disclosure requirements`);

  // ─── F&I Manager seed user ──────────────────────────────────────────────────
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('password', 10);
  await prisma.user.upsert({
    where: { email: 'fi@example.com' },
    update: {},
    create: {
      email: 'fi@example.com',
      passwordHash: hash,
      firstName: 'Finance',
      lastName: 'Manager',
      role: UserRole.FniManager,
    },
  });
  await prisma.user.upsert({
    where: { email: 'controller@example.com' },
    update: {},
    create: {
      email: 'controller@example.com',
      passwordHash: hash,
      firstName: 'Controller',
      lastName: 'User',
      role: UserRole.Controller,
    },
  });
  console.log('Seeded F&I Manager and Controller users');

  console.log('\nF&I seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

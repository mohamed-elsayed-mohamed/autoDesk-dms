import {
  PrismaClient,
  UserRole,
  LeadSource,
  LeadStatus,
  ActivityType,
  ActivityDirection,
  TaskStatus,
  TaskType,
  PreferredContact,
  Condition,
  VehicleStatus,
  DealType,
  DealStatus,
  TradeInCondition,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Financial helpers ────────────────────────────────────────────────────────

function calcMonthlyPayment(principal: number, aprPercent: number, termMonths: number): number {
  if (aprPercent === 0 || termMonths === 0) return 0;
  const r = aprPercent / 100 / 12;
  const n = termMonths;
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment * 100) / 100;
}

function calcDealFinancials(params: {
  salePrice: number;
  invoicePrice: number;
  downPayment: number;
  rebates: number;
  apr: number;
  term: number;
  taxRate: number;
  fees: Array<{ amount: number; taxable: boolean }>;
  tradeAllowance?: number;
  tradePayoff?: number;
}) {
  const { salePrice, invoicePrice, downPayment, rebates, apr, term, taxRate, fees, tradeAllowance = 0, tradePayoff = 0 } = params;
  const taxableFeeSum = fees.filter((f) => f.taxable).reduce((s, f) => s + f.amount, 0);
  const allFeeSum = fees.reduce((s, f) => s + f.amount, 0);
  const netTrade = tradeAllowance - tradePayoff;
  const totalTax = Math.round((salePrice + taxableFeeSum) * taxRate * 100) / 100;
  const amountFinanced = Math.max(0, salePrice + totalTax + allFeeSum - downPayment - rebates - netTrade);
  const monthlyPayment = calcMonthlyPayment(amountFinanced, apr, term);
  const frontEndGross = salePrice - invoicePrice + fees.filter((f) => !f.taxable).reduce((s, f) => s + f.amount, 0);
  return { totalTax, amountFinanced, monthlyPayment, frontEndGross };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function d(year: number, month: number, day: number, hour = 9, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ─── Users ──────────────────────────────────────────────────────────────────
  const usersData = [
    { id: 'seed-user-001', email: 'inventory@dms.local',         firstName: 'Alex',   lastName: 'Turner',   role: UserRole.InventoryManager },
    { id: 'seed-user-002', email: 'sales@dms.local',             firstName: 'Chris',  lastName: 'Parker',   role: UserRole.SalesConsultant  },
    { id: 'seed-user-003', email: 'gm@dms.local',                firstName: 'Robert', lastName: 'Walsh',    role: UserRole.GeneralManager   },
    { id: 'seed-user-004', email: 'manager@autodesk-dms.com',    firstName: 'Sam',    lastName: 'Reynolds', role: UserRole.SalesManager     },
    { id: 'seed-user-005', email: 'bdc@autodesk-dms.com',        firstName: 'Maria',  lastName: 'Torres',   role: UserRole.BDCAgent         },
    { id: 'seed-user-006', email: 'sales1@autodesk-dms.com',     firstName: 'Jake',   lastName: 'Mitchell', role: UserRole.SalesConsultant  },
    { id: 'seed-user-007', email: 'sales2@autodesk-dms.com',     firstName: 'Emily',  lastName: 'Chen',     role: UserRole.SalesConsultant  },
    { id: 'seed-user-008', email: 'fni@autodesk-dms.com',        firstName: 'Diana',  lastName: 'Reeves',   role: UserRole.FniManager       },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, role: u.role },
      create: { ...u, passwordHash },
    });
  }

  // Re-fetch users by email to ensure we have current IDs
  const usersByEmail: Record<string, { id: string; firstName: string; lastName: string; role: UserRole }> = {};
  for (const u of usersData) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: u.email } });
    usersByEmail[u.email] = user;
  }

  const inv  = usersByEmail['inventory@dms.local'];
  const gm   = usersByEmail['gm@dms.local'];
  const mgr  = usersByEmail['manager@autodesk-dms.com'];
  const bdc  = usersByEmail['bdc@autodesk-dms.com'];
  const s1   = usersByEmail['sales1@autodesk-dms.com'];
  const s2   = usersByEmail['sales2@autodesk-dms.com'];
  const fni  = usersByEmail['fni@autodesk-dms.com'];

  function actorName(u: { firstName: string; lastName: string }) { return `${u.firstName} ${u.lastName}`; }

  // ─── RoundRobinState ────────────────────────────────────────────────────────
  await prisma.roundRobinState.upsert({
    where:  { id: 'lead-assignment' },
    update: {},
    create: { id: 'lead-assignment', lastAssignedUserId: null },
  });

  // ─── DealershipConfig ───────────────────────────────────────────────────────
  await prisma.dealershipConfig.upsert({
    where:  { id: 'default' },
    update: {},
    create: { id: 'default', dealNumberOffset: 1001 },
  });

  // ─── Vehicles ───────────────────────────────────────────────────────────────
  // 8 Sold, 8 FrontlineReady, 2 InRecon, 2 InTransit

  const vehiclesData = [
    // ── Sold vehicles (stock 2001-2008) ──
    {
      id: 'seed-veh-001', vin: '5TDKK3DC4ES456789', stockNumber: 2001,
      year: 2024, make: 'Toyota', model: 'Camry', trim: 'XSE V6',
      bodyStyle: 'Sedan', exteriorColor: 'Midnight Black', interiorColor: 'Black',
      mileage: 12, condition: Condition.New, status: VehicleStatus.Sold,
      msrp: 33985, invoicePrice: 31820, internetPrice: 32995, salePrice: 32500,
      lotLocation: null,
      dateAcquired: d(2025, 9, 18), dateSold: d(2025, 10, 14),
    },
    {
      id: 'seed-veh-002', vin: '2HKRM4H74NH605321', stockNumber: 2002,
      year: 2022, make: 'Honda', model: 'CR-V', trim: 'EX-L',
      bodyStyle: 'SUV', exteriorColor: 'Sonic Gray Pearl', interiorColor: 'Gray',
      mileage: 31450, condition: Condition.Used, status: VehicleStatus.Sold,
      msrp: 34250, invoicePrice: 29800, internetPrice: 30995, salePrice: 30500,
      lotLocation: null,
      dateAcquired: d(2025, 9, 22), dateSold: d(2025, 11, 3),
    },
    {
      id: 'seed-veh-003', vin: '1FTEW1EP4NKD17842', stockNumber: 2003,
      year: 2023, make: 'Ford', model: 'F-150', trim: 'XLT SuperCrew',
      bodyStyle: 'Truck', exteriorColor: 'Iconic Silver', interiorColor: 'Medium Earth Gray',
      mileage: 18220, condition: Condition.Used, status: VehicleStatus.Sold,
      msrp: 48995, invoicePrice: 44300, internetPrice: 45900, salePrice: 44800,
      lotLocation: null,
      dateAcquired: d(2025, 10, 5), dateSold: d(2025, 11, 21),
    },
    {
      id: 'seed-veh-004', vin: '1G1ZD5ST4LF049832', stockNumber: 2004,
      year: 2023, make: 'Chevrolet', model: 'Malibu', trim: 'LT',
      bodyStyle: 'Sedan', exteriorColor: 'Summit White', interiorColor: 'Jet Black',
      mileage: 22100, condition: Condition.CPO, status: VehicleStatus.Sold,
      msrp: 27450, invoicePrice: 24900, internetPrice: 25800, salePrice: 25500,
      lotLocation: null,
      dateAcquired: d(2025, 10, 12), dateSold: d(2025, 12, 9),
    },
    {
      id: 'seed-veh-005', vin: 'WBA8E9C54JA749302', stockNumber: 2005,
      year: 2022, make: 'BMW', model: '3 Series', trim: '330i xDrive',
      bodyStyle: 'Sedan', exteriorColor: 'Alpine White', interiorColor: 'Cognac',
      mileage: 28650, condition: Condition.CPO, status: VehicleStatus.Sold,
      msrp: 52800, invoicePrice: 48200, internetPrice: 49750, salePrice: 48900,
      lotLocation: null,
      dateAcquired: d(2025, 10, 28), dateSold: d(2025, 12, 19),
    },
    {
      id: 'seed-veh-006', vin: '5NPE24AFXJH651047', stockNumber: 2006,
      year: 2023, make: 'Hyundai', model: 'Sonata', trim: 'SEL Plus',
      bodyStyle: 'Sedan', exteriorColor: 'Shimmering Silver', interiorColor: 'Black',
      mileage: 19870, condition: Condition.Used, status: VehicleStatus.Sold,
      msrp: 32500, invoicePrice: 28900, internetPrice: 29995, salePrice: 29500,
      lotLocation: null,
      dateAcquired: d(2025, 11, 3), dateSold: d(2026, 1, 7),
    },
    {
      id: 'seed-veh-007', vin: '2T3BFREV4JW794026', stockNumber: 2007,
      year: 2024, make: 'Toyota', model: 'RAV4', trim: 'Adventure AWD',
      bodyStyle: 'SUV', exteriorColor: 'Magnetic Gray', interiorColor: 'Black',
      mileage: 5, condition: Condition.New, status: VehicleStatus.Sold,
      msrp: 37855, invoicePrice: 35100, internetPrice: 36450, salePrice: 36900,
      lotLocation: null,
      dateAcquired: d(2025, 11, 14), dateSold: d(2026, 1, 22),
    },
    {
      id: 'seed-veh-008', vin: '1HGCV1F35KA094715', stockNumber: 2008,
      year: 2024, make: 'Honda', model: 'Accord', trim: 'Sport 2.0T',
      bodyStyle: 'Sedan', exteriorColor: 'Sonic Gray Pearl', interiorColor: 'Black',
      mileage: 8, condition: Condition.New, status: VehicleStatus.Sold,
      msrp: 35550, invoicePrice: 33000, internetPrice: 34195, salePrice: 33800,
      lotLocation: null,
      dateAcquired: d(2025, 12, 1), dateSold: d(2026, 2, 11),
    },

    // ── FrontlineReady vehicles (stock 2009-2016) ──
    {
      id: 'seed-veh-009', vin: '5TDKK3DC4GS123456', stockNumber: 2009,
      year: 2025, make: 'Toyota', model: 'Camry', trim: 'SE',
      bodyStyle: 'Sedan', exteriorColor: 'Blueprint', interiorColor: 'Black',
      mileage: 4, condition: Condition.New, status: VehicleStatus.FrontlineReady,
      msrp: 31545, invoicePrice: 29500, internetPrice: 30695, salePrice: null,
      lotLocation: 'Showroom',
      dateAcquired: d(2026, 1, 8), dateSold: null,
    },
    {
      id: 'seed-veh-010', vin: '2HKRM4H72PH201834', stockNumber: 2010,
      year: 2025, make: 'Honda', model: 'CR-V', trim: 'Sport Hybrid',
      bodyStyle: 'SUV', exteriorColor: 'Radiant Red', interiorColor: 'Gray',
      mileage: 6, condition: Condition.New, status: VehicleStatus.FrontlineReady,
      msrp: 38250, invoicePrice: 35800, internetPrice: 37195, salePrice: null,
      lotLocation: 'Lot A',
      dateAcquired: d(2026, 1, 15), dateSold: null,
    },
    {
      id: 'seed-veh-011', vin: '1FTEW1EP6NFC84321', stockNumber: 2011,
      year: 2024, make: 'Ford', model: 'F-150', trim: 'Lariat 4x4',
      bodyStyle: 'Truck', exteriorColor: 'Oxford White', interiorColor: 'Black',
      mileage: 9, condition: Condition.New, status: VehicleStatus.FrontlineReady,
      msrp: 57490, invoicePrice: 52900, internetPrice: 55295, salePrice: null,
      lotLocation: 'Lot B',
      dateAcquired: d(2026, 1, 20), dateSold: null,
    },
    {
      id: 'seed-veh-012', vin: '1G1ZE5ST7LF184920', stockNumber: 2012,
      year: 2022, make: 'Chevrolet', model: 'Equinox', trim: 'LT AWD',
      bodyStyle: 'SUV', exteriorColor: 'Mosaic Black', interiorColor: 'Jet Black',
      mileage: 34210, condition: Condition.Used, status: VehicleStatus.FrontlineReady,
      msrp: 34000, invoicePrice: 27500, internetPrice: 28895, salePrice: null,
      lotLocation: 'Lot A',
      dateAcquired: d(2026, 1, 25), dateSold: null,
    },
    {
      id: 'seed-veh-013', vin: 'WBA8E9C50KA201745', stockNumber: 2013,
      year: 2023, make: 'BMW', model: '5 Series', trim: '530i xDrive',
      bodyStyle: 'Sedan', exteriorColor: 'Mineral White', interiorColor: 'Black',
      mileage: 22800, condition: Condition.CPO, status: VehicleStatus.FrontlineReady,
      msrp: 62000, invoicePrice: 56800, internetPrice: 58995, salePrice: null,
      lotLocation: 'Showroom',
      dateAcquired: d(2026, 2, 3), dateSold: null,
    },
    {
      id: 'seed-veh-014', vin: '5NPE24AFXKH399812', stockNumber: 2014,
      year: 2024, make: 'Hyundai', model: 'Tucson', trim: 'SEL AWD',
      bodyStyle: 'SUV', exteriorColor: 'Shimmering Silver', interiorColor: 'Black',
      mileage: 11, condition: Condition.New, status: VehicleStatus.FrontlineReady,
      msrp: 33450, invoicePrice: 31200, internetPrice: 32495, salePrice: null,
      lotLocation: 'Lot A',
      dateAcquired: d(2026, 2, 7), dateSold: null,
    },
    {
      id: 'seed-veh-015', vin: '2T3DFREV4LW501927', stockNumber: 2015,
      year: 2023, make: 'Toyota', model: 'RAV4', trim: 'XLE Premium AWD',
      bodyStyle: 'SUV', exteriorColor: 'Cavalry Blue', interiorColor: 'SofTex Black',
      mileage: 27430, condition: Condition.CPO, status: VehicleStatus.FrontlineReady,
      msrp: 38250, invoicePrice: 34200, internetPrice: 35795, salePrice: null,
      lotLocation: 'Lot B',
      dateAcquired: d(2026, 2, 12), dateSold: null,
    },
    {
      id: 'seed-veh-016', vin: '1HGCV1F34MA012847', stockNumber: 2016,
      year: 2024, make: 'Honda', model: 'Civic', trim: 'EX Hatchback',
      bodyStyle: 'Hatchback', exteriorColor: 'Lunar Silver', interiorColor: 'Black',
      mileage: 7, condition: Condition.New, status: VehicleStatus.FrontlineReady,
      msrp: 27855, invoicePrice: 26100, internetPrice: 27195, salePrice: null,
      lotLocation: 'Lot A',
      dateAcquired: d(2026, 2, 18), dateSold: null,
    },

    // ── InRecon vehicles (stock 2017-2018) ──
    {
      id: 'seed-veh-017', vin: '1FTEW1EP8NKA98765', stockNumber: 2017,
      year: 2022, make: 'Ford', model: 'Explorer', trim: 'XLT 4WD',
      bodyStyle: 'SUV', exteriorColor: 'Star White', interiorColor: 'Medium Stone',
      mileage: 41200, condition: Condition.Used, status: VehicleStatus.InRecon,
      msrp: 46000, invoicePrice: 38500, internetPrice: null, salePrice: null,
      lotLocation: null,
      dateAcquired: d(2026, 2, 24), dateSold: null,
    },
    {
      id: 'seed-veh-018', vin: '5TDKK3DC4LS887654', stockNumber: 2018,
      year: 2023, make: 'Toyota', model: 'Highlander', trim: 'LE AWD',
      bodyStyle: 'SUV', exteriorColor: 'Midnight Black', interiorColor: 'Black',
      mileage: 38750, condition: Condition.Used, status: VehicleStatus.InRecon,
      msrp: 39600, invoicePrice: 34800, internetPrice: null, salePrice: null,
      lotLocation: null,
      dateAcquired: d(2026, 3, 1), dateSold: null,
    },

    // ── InTransit vehicles (stock 2019-2020) ──
    {
      id: 'seed-veh-019', vin: '1G1ZE5ST4MF304521', stockNumber: 2019,
      year: 2025, make: 'Chevrolet', model: 'Trax', trim: 'RS AWD',
      bodyStyle: 'SUV', exteriorColor: 'Cherry Red Tintcoat', interiorColor: 'Jet Black',
      mileage: 0, condition: Condition.New, status: VehicleStatus.InTransit,
      msrp: 27995, invoicePrice: 26200, internetPrice: 27495, salePrice: null,
      lotLocation: null,
      dateAcquired: d(2026, 3, 5), dateSold: null,
    },
    {
      id: 'seed-veh-020', vin: 'WBA5R1C50MFH74028', stockNumber: 2020,
      year: 2025, make: 'BMW', model: '3 Series', trim: '330i Sedan',
      bodyStyle: 'Sedan', exteriorColor: 'Portimao Blue', interiorColor: 'Black',
      mileage: 0, condition: Condition.New, status: VehicleStatus.InTransit,
      msrp: 49495, invoicePrice: 46200, internetPrice: 48195, salePrice: null,
      lotLocation: null,
      dateAcquired: d(2026, 3, 7), dateSold: null,
    },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: { status: v.status, dateSold: v.dateSold ?? null, salePrice: v.salePrice, lotLocation: v.lotLocation },
      create: {
        id: v.id,
        vin: v.vin,
        stockNumber: v.stockNumber,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        bodyStyle: v.bodyStyle,
        exteriorColor: v.exteriorColor,
        interiorColor: v.interiorColor,
        mileage: v.mileage,
        condition: v.condition,
        status: v.status,
        msrp: v.msrp,
        invoicePrice: v.invoicePrice,
        internetPrice: v.internetPrice,
        salePrice: v.salePrice,
        lotLocation: v.lotLocation,
        dateAcquired: v.dateAcquired,
        dateSold: v.dateSold ?? null,
      },
    });
  }

  // Shorthand vehicle refs
  const V = (id: string) => vehiclesData.find((v) => v.id === id)!;

  // ─── Customers ──────────────────────────────────────────────────────────────
  const customersData = [
    // Historical buyers (linked to funded deals)
    { id: 'seed-cust-001', firstName: 'James',    lastName: 'Kowalski',   email: 'james.kowalski@gmail.com',   phone: '312-555-0101', street: '4521 N Clark St',      city: 'Chicago',     state: 'IL', zip: '60640', preferredContact: PreferredContact.Phone, notes: 'Repeat customer. Purchased RAV4 in 2022.' },
    { id: 'seed-cust-002', firstName: 'Patricia', lastName: 'Nguyen',     email: 'p.nguyen@hotmail.com',       phone: '847-555-0218', street: '112 Elm Ave',          city: 'Evanston',    state: 'IL', zip: '60202', preferredContact: PreferredContact.Email, notes: null },
    { id: 'seed-cust-003', firstName: 'Marcus',   lastName: 'Williams',   email: 'marcusw@protonmail.com',     phone: '773-555-0334', street: '8830 S Cottage Grove', city: 'Chicago',     state: 'IL', zip: '60619', preferredContact: PreferredContact.Phone, notes: 'Prefers cash deals. No financing.' },
    { id: 'seed-cust-004', firstName: 'Brittany', lastName: 'Sandoval',   email: 'bsandoval@yahoo.com',        phone: '630-555-0472', street: '322 Oak Leaf Dr',      city: 'Naperville',  state: 'IL', zip: '60563', preferredContact: PreferredContact.Text,  notes: null },
    { id: 'seed-cust-005', firstName: 'Derek',    lastName: 'O\'Brien',   email: 'derek.obrien@email.com',     phone: '847-555-0589', street: '5 Highland Pkwy',      city: 'Deerfield',   state: 'IL', zip: '60015', preferredContact: PreferredContact.Phone, notes: 'Works at Motorola. Good credit.' },
    { id: 'seed-cust-006', firstName: 'Angela',   lastName: 'Kim',        email: 'angela.kim22@gmail.com',     phone: '312-555-0643', street: '1401 S Michigan Ave',  city: 'Chicago',     state: 'IL', zip: '60605', preferredContact: PreferredContact.Email, notes: null },
    { id: 'seed-cust-007', firstName: 'Raymond',  lastName: 'Flores',     email: 'rflores_cars@gmail.com',     phone: '708-555-0712', street: '904 Maple Ct',         city: 'Oak Park',    state: 'IL', zip: '60302', preferredContact: PreferredContact.Phone, notes: 'Has trade-in each time.' },
    { id: 'seed-cust-008', firstName: 'Stephanie',lastName: 'Harrington', email: 's.harrington@outlook.com',   phone: '847-555-0831', street: '7710 Wilmette Ave',    city: 'Wilmette',    state: 'IL', zip: '60091', preferredContact: PreferredContact.Email, notes: 'Wants luxury vehicles only.' },
    // Active pipeline customers
    { id: 'seed-cust-009', firstName: 'Tyler',    lastName: 'Drummond',   email: 'tdrummond@gmail.com',        phone: '312-555-0910', street: '2244 W Diversey Ave',  city: 'Chicago',     state: 'IL', zip: '60647', preferredContact: PreferredContact.Text,  notes: 'First-time buyer. Needs financing guidance.' },
    { id: 'seed-cust-010', firstName: 'Cassandra',lastName: 'Moreau',     email: 'cmoreau81@gmail.com',        phone: '847-555-1005', street: '430 Linden Ave',       city: 'Winnetka',    state: 'IL', zip: '60093', preferredContact: PreferredContact.Phone, notes: 'Interested in SUV with 3rd row.' },
    { id: 'seed-cust-011', firstName: 'Leon',     lastName: 'Patel',      email: 'lpatel.crm@gmail.com',       phone: '773-555-1142', street: '5531 N Sheridan Rd',   city: 'Chicago',     state: 'IL', zip: '60640', preferredContact: PreferredContact.Email, notes: null },
    { id: 'seed-cust-012', firstName: 'Natalie',  lastName: 'Burgess',    email: 'natburgess@yahoo.com',       phone: '630-555-1278', street: '118 Briarwood Ln',     city: 'Wheaton',     state: 'IL', zip: '60187', preferredContact: PreferredContact.Phone, notes: 'Budget around $400/month.' },
    // Lead-only customers
    { id: 'seed-cust-013', firstName: 'Kevin',    lastName: 'Larson',     email: 'klarson@gmail.com',          phone: '312-555-1399', street: null,                   city: 'Chicago',     state: 'IL', zip: null,    preferredContact: PreferredContact.Text,  notes: 'Internet lead. Slow to respond.' },
    { id: 'seed-cust-014', firstName: 'Monica',   lastName: 'Espinoza',   email: 'm.espinoza@hotmail.com',     phone: '847-555-1445', street: null,                   city: 'Skokie',      state: 'IL', zip: '60076', preferredContact: PreferredContact.Email, notes: null },
    { id: 'seed-cust-015', firstName: 'Brian',    lastName: 'Callahan',   email: 'bcallahan_il@gmail.com',     phone: '708-555-1501', street: '3302 S Oak Park Ave',  city: 'Berwyn',      state: 'IL', zip: '60402', preferredContact: PreferredContact.Phone, notes: 'Lost lead - bought elsewhere. Re-engaged for service.' },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }

  // ─── Leads ──────────────────────────────────────────────────────────────────
  // Historical sold/lost leads
  await prisma.lead.upsert({
    where: { id: 'seed-lead-001' },
    update: {},
    create: { id: 'seed-lead-001', customerId: 'seed-cust-001', source: LeadSource.WalkIn,     status: LeadStatus.Sold,    assignedTo: s1.id, notes: 'Walk-in, very motivated buyer. Liked Camry XSE V6.',  createdAt: d(2025, 10, 10) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-002' },
    update: {},
    create: { id: 'seed-lead-002', customerId: 'seed-cust-002', source: LeadSource.Website,    status: LeadStatus.Sold,    assignedTo: s2.id, notes: 'Online inquiry for CR-V EX-L.',                         createdAt: d(2025, 10, 28) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-003' },
    update: {},
    create: { id: 'seed-lead-003', customerId: 'seed-cust-003', source: LeadSource.Phone,      status: LeadStatus.Sold,    assignedTo: s1.id, notes: 'Called about F-150 special. Cash buyer.',               createdAt: d(2025, 11, 15) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-004' },
    update: {},
    create: { id: 'seed-lead-004', customerId: 'seed-cust-004', source: LeadSource.AutoTrader, status: LeadStatus.Sold,    assignedTo: s2.id, notes: 'AutoTrader lead on Malibu CPO.',                        createdAt: d(2025, 11, 28) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-005' },
    update: {},
    create: { id: 'seed-lead-005', customerId: 'seed-cust-005', source: LeadSource.CarsDotCom, status: LeadStatus.Sold,    assignedTo: s1.id, notes: 'Cars.com lead on BMW CPO inventory.',                  createdAt: d(2025, 12, 12) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-006' },
    update: {},
    create: { id: 'seed-lead-006', customerId: 'seed-cust-007', source: LeadSource.WalkIn,     status: LeadStatus.Sold,    assignedTo: s2.id, notes: 'Wanted SUV with trade-in. Settled on RAV4.',           createdAt: d(2026, 1, 18) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-007' },
    update: {},
    create: { id: 'seed-lead-007', customerId: 'seed-cust-015', source: LeadSource.Website,    status: LeadStatus.Lost,    assignedTo: s2.id, lostReason: 'Purchased competitor vehicle (Mazda CX-5).', notes: 'Was interested in CR-V but found better deal online.', createdAt: d(2025, 11, 5) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-008' },
    update: {},
    create: { id: 'seed-lead-008', customerId: 'seed-cust-006', source: LeadSource.Phone,      status: LeadStatus.Lost,    assignedTo: s1.id, lostReason: 'Could not secure financing. Credit declined.', notes: 'BMW CPO inquiry. Needed co-signer, did not return.', createdAt: d(2025, 12, 1) },
  });
  // Active leads
  await prisma.lead.upsert({
    where: { id: 'seed-lead-009' },
    update: {},
    create: { id: 'seed-lead-009', customerId: 'seed-cust-009', source: LeadSource.Website,    status: LeadStatus.Negotiating, assignedTo: s1.id, notes: 'First-time buyer. Interested in Camry SE or Civic EX.', createdAt: d(2026, 2, 25) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-010' },
    update: {},
    create: { id: 'seed-lead-010', customerId: 'seed-cust-010', source: LeadSource.AutoTrader,  status: LeadStatus.AppointmentSet, assignedTo: s2.id, notes: 'Looking for 3-row SUV. Interested in Highlander.', createdAt: d(2026, 3, 1) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-011' },
    update: {},
    create: { id: 'seed-lead-011', customerId: 'seed-cust-011', source: LeadSource.CarsDotCom,  status: LeadStatus.Contacted,     assignedTo: s1.id, notes: 'Inquired about Equinox LT. Flexible on color.', createdAt: d(2026, 3, 5) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-012' },
    update: {},
    create: { id: 'seed-lead-012', customerId: 'seed-cust-012', source: LeadSource.Phone,       status: LeadStatus.Showed,        assignedTo: s2.id, notes: 'Budget-conscious. Came in to test drive Tucson.', createdAt: d(2026, 3, 6) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-013' },
    update: {},
    create: { id: 'seed-lead-013', customerId: 'seed-cust-013', source: LeadSource.Website,     status: LeadStatus.New,           assignedTo: bdc.id, notes: 'Online form submission. No phone contact yet.', createdAt: d(2026, 3, 8) },
  });
  await prisma.lead.upsert({
    where: { id: 'seed-lead-014' },
    update: {},
    create: { id: 'seed-lead-014', customerId: 'seed-cust-014', source: LeadSource.Other,       status: LeadStatus.New,           assignedTo: bdc.id, notes: 'Referred by past customer Angela Kim.', createdAt: d(2026, 3, 9) },
  });

  // Lead status histories
  await prisma.leadStatusHistory.createMany({
    skipDuplicates: true,
    data: [
      // lead-001: New → Contacted → Showed → Negotiating → Sold
      { id: 'seed-lsh-001a', leadId: 'seed-lead-001', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: s1.id, changedAt: d(2025, 10, 10, 11) },
      { id: 'seed-lsh-001b', leadId: 'seed-lead-001', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s1.id, changedAt: d(2025, 10, 11, 14) },
      { id: 'seed-lsh-001c', leadId: 'seed-lead-001', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Negotiating,    changedBy: s1.id, changedAt: d(2025, 10, 11, 15) },
      { id: 'seed-lsh-001d', leadId: 'seed-lead-001', fromStatus: LeadStatus.Negotiating,    toStatus: LeadStatus.Sold,           changedBy: s1.id, changedAt: d(2025, 10, 14, 16) },
      // lead-002: New → Contacted → AppointmentSet → Showed → Sold
      { id: 'seed-lsh-002a', leadId: 'seed-lead-002', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2025, 10, 29, 9) },
      { id: 'seed-lsh-002b', leadId: 'seed-lead-002', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.AppointmentSet, changedBy: s2.id,  changedAt: d(2025, 10, 30, 10) },
      { id: 'seed-lsh-002c', leadId: 'seed-lead-002', fromStatus: LeadStatus.AppointmentSet, toStatus: LeadStatus.Showed,         changedBy: s2.id,  changedAt: d(2025, 11, 1, 14) },
      { id: 'seed-lsh-002d', leadId: 'seed-lead-002', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Sold,           changedBy: s2.id,  changedAt: d(2025, 11, 3, 17) },
      // lead-003: New → Contacted → Showed → Sold
      { id: 'seed-lsh-003a', leadId: 'seed-lead-003', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: s1.id, changedAt: d(2025, 11, 15, 10) },
      { id: 'seed-lsh-003b', leadId: 'seed-lead-003', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s1.id, changedAt: d(2025, 11, 19, 11) },
      { id: 'seed-lsh-003c', leadId: 'seed-lead-003', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Sold,           changedBy: s1.id, changedAt: d(2025, 11, 21, 15) },
      // lead-004: New → Contacted → AppointmentSet → Showed → Sold
      { id: 'seed-lsh-004a', leadId: 'seed-lead-004', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2025, 11, 28, 9) },
      { id: 'seed-lsh-004b', leadId: 'seed-lead-004', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.AppointmentSet, changedBy: s2.id,  changedAt: d(2025, 11, 29, 14) },
      { id: 'seed-lsh-004c', leadId: 'seed-lead-004', fromStatus: LeadStatus.AppointmentSet, toStatus: LeadStatus.Showed,         changedBy: s2.id,  changedAt: d(2025, 12, 2, 10) },
      { id: 'seed-lsh-004d', leadId: 'seed-lead-004', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Sold,           changedBy: s2.id,  changedAt: d(2025, 12, 9, 16) },
      // lead-005: New → Contacted → Showed → Negotiating → Sold
      { id: 'seed-lsh-005a', leadId: 'seed-lead-005', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2025, 12, 12, 9) },
      { id: 'seed-lsh-005b', leadId: 'seed-lead-005', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s1.id,  changedAt: d(2025, 12, 16, 14) },
      { id: 'seed-lsh-005c', leadId: 'seed-lead-005', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Negotiating,    changedBy: s1.id,  changedAt: d(2025, 12, 16, 15) },
      { id: 'seed-lsh-005d', leadId: 'seed-lead-005', fromStatus: LeadStatus.Negotiating,    toStatus: LeadStatus.Sold,           changedBy: s1.id,  changedAt: d(2025, 12, 19, 17) },
      // lead-006: New → Contacted → Showed → Sold
      { id: 'seed-lsh-006a', leadId: 'seed-lead-006', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2026, 1, 18, 9) },
      { id: 'seed-lsh-006b', leadId: 'seed-lead-006', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s2.id,  changedAt: d(2026, 1, 21, 11) },
      { id: 'seed-lsh-006c', leadId: 'seed-lead-006', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Sold,           changedBy: s2.id,  changedAt: d(2026, 1, 22, 15) },
      // lead-007: New → Contacted → Lost
      { id: 'seed-lsh-007a', leadId: 'seed-lead-007', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2025, 11, 6, 9)  },
      { id: 'seed-lsh-007b', leadId: 'seed-lead-007', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Lost,           changedBy: s2.id,  changedAt: d(2025, 11, 20, 10) },
      // lead-008: New → Contacted → Showed → Lost
      { id: 'seed-lsh-008a', leadId: 'seed-lead-008', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2025, 12, 2, 9)  },
      { id: 'seed-lsh-008b', leadId: 'seed-lead-008', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s1.id,  changedAt: d(2025, 12, 5, 14) },
      { id: 'seed-lsh-008c', leadId: 'seed-lead-008', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Lost,           changedBy: s1.id,  changedAt: d(2025, 12, 12, 10) },
      // lead-009: New → Contacted → Showed → Negotiating
      { id: 'seed-lsh-009a', leadId: 'seed-lead-009', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2026, 2, 25, 10) },
      { id: 'seed-lsh-009b', leadId: 'seed-lead-009', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s1.id,  changedAt: d(2026, 2, 28, 14) },
      { id: 'seed-lsh-009c', leadId: 'seed-lead-009', fromStatus: LeadStatus.Showed,         toStatus: LeadStatus.Negotiating,    changedBy: s1.id,  changedAt: d(2026, 3, 3, 16) },
      // lead-010: New → Contacted → AppointmentSet
      { id: 'seed-lsh-010a', leadId: 'seed-lead-010', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2026, 3, 1, 10) },
      { id: 'seed-lsh-010b', leadId: 'seed-lead-010', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.AppointmentSet, changedBy: s2.id,  changedAt: d(2026, 3, 3, 14) },
      // lead-011: New → Contacted
      { id: 'seed-lsh-011a', leadId: 'seed-lead-011', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2026, 3, 5, 11) },
      // lead-012: New → Contacted → Showed
      { id: 'seed-lsh-012a', leadId: 'seed-lead-012', fromStatus: LeadStatus.New,            toStatus: LeadStatus.Contacted,      changedBy: bdc.id, changedAt: d(2026, 3, 6, 9)  },
      { id: 'seed-lsh-012b', leadId: 'seed-lead-012', fromStatus: LeadStatus.Contacted,      toStatus: LeadStatus.Showed,         changedBy: s2.id,  changedAt: d(2026, 3, 7, 14) },
    ],
  });

  // ─── Activities ─────────────────────────────────────────────────────────────
  await prisma.activity.createMany({
    skipDuplicates: true,
    data: [
      // Historical / sold customers
      { id: 'seed-act-001', customerId: 'seed-cust-001', leadId: 'seed-lead-001', type: ActivityType.Call,  direction: ActivityDirection.Inbound,  content: 'Customer called to ask about Camry XSE availability. Invited to walk in.',               performedBy: bdc.id, performedAt: d(2025, 10, 10, 10) },
      { id: 'seed-act-002', customerId: 'seed-cust-001', leadId: 'seed-lead-001', type: ActivityType.Visit, direction: null,                       content: 'Came in, test drove Camry XSE V6. Very positive reaction.',                             performedBy: s1.id,  performedAt: d(2025, 10, 11, 14) },
      { id: 'seed-act-003', customerId: 'seed-cust-001', leadId: 'seed-lead-001', type: ActivityType.Note,  direction: null,                       content: 'Agreed on $32,500 OTD. Deal sent to F&I.',                                             performedBy: s1.id,  performedAt: d(2025, 10, 14, 15) },
      { id: 'seed-act-004', customerId: 'seed-cust-002', leadId: 'seed-lead-002', type: ActivityType.Email, direction: ActivityDirection.Outbound, content: 'Sent e-price quote for CR-V EX-L and vehicle details PDF.',                            performedBy: bdc.id, performedAt: d(2025, 10, 29, 9) },
      { id: 'seed-act-005', customerId: 'seed-cust-002', leadId: 'seed-lead-002', type: ActivityType.Call,  direction: ActivityDirection.Outbound, content: 'Called to confirm appointment for Nov 1. Customer confirmed.',                         performedBy: s2.id,  performedAt: d(2025, 10, 30, 11) },
      { id: 'seed-act-006', customerId: 'seed-cust-002', leadId: 'seed-lead-002', type: ActivityType.Visit, direction: null,                       content: 'Customer arrived for appt. Drove CR-V EX-L. Spent 2 hrs in F&I. Signed contracts.',   performedBy: s2.id,  performedAt: d(2025, 11, 3, 14) },
      { id: 'seed-act-007', customerId: 'seed-cust-003', leadId: 'seed-lead-003', type: ActivityType.Call,  direction: ActivityDirection.Inbound,  content: 'Inquired about F-150 pricing. Cash buyer, wants best OTD.',                           performedBy: bdc.id, performedAt: d(2025, 11, 15, 10) },
      { id: 'seed-act-008', customerId: 'seed-cust-003', leadId: 'seed-lead-003', type: ActivityType.Call,  direction: ActivityDirection.Outbound, content: 'Followed up — confirmed he is coming in Saturday.',                                   performedBy: s1.id,  performedAt: d(2025, 11, 18, 13) },
      { id: 'seed-act-009', customerId: 'seed-cust-003', leadId: 'seed-lead-003', type: ActivityType.Note,  direction: null,                       content: 'Sold F-150 XLT cash deal at $44,800. Very smooth transaction.',                       performedBy: s1.id,  performedAt: d(2025, 11, 21, 16) },
      { id: 'seed-act-010', customerId: 'seed-cust-005', leadId: 'seed-lead-005', type: ActivityType.Email, direction: ActivityDirection.Outbound, content: 'Sent CPO brochure and pricing on 2022 BMW 330i xDrive.',                              performedBy: bdc.id, performedAt: d(2025, 12, 12, 9) },
      { id: 'seed-act-011', customerId: 'seed-cust-005', leadId: 'seed-lead-005', type: ActivityType.Call,  direction: ActivityDirection.Outbound, content: 'Confirmed appointment for Dec 16 at 2pm.',                                            performedBy: s1.id,  performedAt: d(2025, 12, 14, 11) },
      { id: 'seed-act-012', customerId: 'seed-cust-005', leadId: 'seed-lead-005', type: ActivityType.Visit, direction: null,                       content: 'Drove the 330i xDrive. Asked for manager discount. Settled at $48,900.',              performedBy: s1.id,  performedAt: d(2025, 12, 16, 14) },
      { id: 'seed-act-013', customerId: 'seed-cust-005', leadId: 'seed-lead-005', type: ActivityType.Note,  direction: null,                       content: 'Deal signed Dec 19. Finance went through Ally Financial, 5.9% 60 months.',           performedBy: s1.id,  performedAt: d(2025, 12, 19, 17) },
      { id: 'seed-act-014', customerId: 'seed-cust-007', leadId: 'seed-lead-006', type: ActivityType.Call,  direction: ActivityDirection.Inbound,  content: 'Walk-in, wanted to trade his 2019 Tacoma for an SUV.',                               performedBy: s2.id,  performedAt: d(2026, 1, 18, 10) },
      { id: 'seed-act-015', customerId: 'seed-cust-007', leadId: 'seed-lead-006', type: ActivityType.Visit, direction: null,                       content: 'Came back Jan 21. Trade appraised at $18,500. Agreed on RAV4 Adventure AWD.',        performedBy: s2.id,  performedAt: d(2026, 1, 21, 12) },
      // Lost leads
      { id: 'seed-act-016', customerId: 'seed-cust-015', leadId: 'seed-lead-007', type: ActivityType.Email, direction: ActivityDirection.Outbound, content: 'Sent e-quote and comparison vs Mazda CX-5.',                                          performedBy: bdc.id, performedAt: d(2025, 11, 6, 10) },
      { id: 'seed-act-017', customerId: 'seed-cust-015', leadId: 'seed-lead-007', type: ActivityType.Call,  direction: ActivityDirection.Outbound, content: 'Called twice — no answer. Left voicemail.',                                           performedBy: s2.id,  performedAt: d(2025, 11, 12, 14) },
      { id: 'seed-act-018', customerId: 'seed-cust-015', leadId: 'seed-lead-007', type: ActivityType.Note,  direction: null,                       content: 'Customer emailed to say he purchased elsewhere. Marking Lost.',                       performedBy: s2.id,  performedAt: d(2025, 11, 20, 10) },
      // Active pipeline
      { id: 'seed-act-019', customerId: 'seed-cust-009', leadId: 'seed-lead-009', type: ActivityType.Text,  direction: ActivityDirection.Outbound, content: 'Hi Tyler, this is Jake from AutoDesk Motors! I found a 2025 Camry SE that fits your budget perfectly. When can you come in?', performedBy: s1.id, performedAt: d(2026, 2, 25, 11) },
      { id: 'seed-act-020', customerId: 'seed-cust-009', leadId: 'seed-lead-009', type: ActivityType.Text,  direction: ActivityDirection.Inbound,  content: 'Hey Jake, sounds good! I can come in Saturday morning.',                             performedBy: s1.id,  performedAt: d(2026, 2, 25, 14) },
      { id: 'seed-act-021', customerId: 'seed-cust-009', leadId: 'seed-lead-009', type: ActivityType.Visit, direction: null,                       content: 'Tyler came in Feb 28. Drove Camry SE and Civic EX. Leaning toward Camry. Working numbers.', performedBy: s1.id, performedAt: d(2026, 2, 28, 14) },
      { id: 'seed-act-022', customerId: 'seed-cust-009', leadId: 'seed-lead-009', type: ActivityType.Call,  direction: ActivityDirection.Outbound, content: 'Called to follow up on payment worksheet. Tyler reviewing with wife.',               performedBy: s1.id,  performedAt: d(2026, 3, 4, 10) },
      { id: 'seed-act-023', customerId: 'seed-cust-010', leadId: 'seed-lead-010', type: ActivityType.Email, direction: ActivityDirection.Outbound, content: 'Sent Highlander LE AWD details and availability. In recon, est. frontline by Mar 15.', performedBy: bdc.id, performedAt: d(2026, 3, 1, 10) },
      { id: 'seed-act-024', customerId: 'seed-cust-012', leadId: 'seed-lead-012', type: ActivityType.Call,  direction: ActivityDirection.Inbound,  content: 'Called in, wants to know about Tucson lease options. Budget $380-420/mo.',           performedBy: bdc.id, performedAt: d(2026, 3, 6, 9) },
      { id: 'seed-act-025', customerId: 'seed-cust-012', leadId: 'seed-lead-012', type: ActivityType.Visit, direction: null,                       content: 'Natalie came in, drove Tucson SEL AWD. Liked it a lot. Working lease numbers with Sam.', performedBy: s2.id, performedAt: d(2026, 3, 7, 14) },
      { id: 'seed-act-026', customerId: 'seed-cust-011', leadId: 'seed-lead-011', type: ActivityType.Email, direction: ActivityDirection.Outbound, content: 'Sent details on 2022 Equinox LT AWD. Mentioned we can hold it pending credit app.',  performedBy: bdc.id, performedAt: d(2026, 3, 5, 11) },
      { id: 'seed-act-027', customerId: 'seed-cust-013', leadId: 'seed-lead-013', type: ActivityType.Email, direction: ActivityDirection.Outbound, content: 'Welcome email sent. Asked Kevin to confirm vehicle of interest and schedule a call.', performedBy: bdc.id, performedAt: d(2026, 3, 8, 9) },
    ],
  });

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  // Dates relative to "today" = 2026-03-09
  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      // Completed historical tasks
      { id: 'seed-task-001', leadId: 'seed-lead-009', assignedTo: s1.id,  type: TaskType.Call,     description: 'Initial follow-up call on website lead', dueAt: d(2026, 2, 25, 10), status: TaskStatus.Completed, completedAt: d(2026, 2, 25, 10, 30), createdAt: d(2026, 2, 25, 9) },
      { id: 'seed-task-002', leadId: 'seed-lead-009', assignedTo: s1.id,  type: TaskType.FollowUp, description: 'Follow up post-test drive — payment decision',   dueAt: d(2026, 3, 3, 10),  status: TaskStatus.Completed, completedAt: d(2026, 3, 4, 10, 15), createdAt: d(2026, 3, 1, 9) },
      { id: 'seed-task-003', leadId: 'seed-lead-010', assignedTo: bdc.id, type: TaskType.Email,    description: 'Send Highlander recon ETA and product sheet', dueAt: d(2026, 3, 1, 9),   status: TaskStatus.Completed, completedAt: d(2026, 3, 1, 10),     createdAt: d(2026, 3, 1, 8) },
      { id: 'seed-task-004', leadId: 'seed-lead-011', assignedTo: bdc.id, type: TaskType.Email,    description: 'Send Equinox details and online credit app link',  dueAt: d(2026, 3, 5, 9),   status: TaskStatus.Completed, completedAt: d(2026, 3, 5, 11),     createdAt: d(2026, 3, 5, 8) },
      { id: 'seed-task-005', leadId: 'seed-lead-012', assignedTo: s2.id,  type: TaskType.Call,     description: 'Confirm showroom appointment for Tucson',          dueAt: d(2026, 3, 6, 9),   status: TaskStatus.Completed, completedAt: d(2026, 3, 6, 9, 20),  createdAt: d(2026, 3, 5, 16) },
      // Active / upcoming tasks
      { id: 'seed-task-006', leadId: 'seed-lead-009', assignedTo: s1.id,  type: TaskType.Call,     description: 'Call Tyler — final answer on Camry SE deal',      dueAt: d(2026, 3, 10, 10), status: TaskStatus.Pending, createdAt: d(2026, 3, 7, 9) },
      { id: 'seed-task-007', leadId: 'seed-lead-010', assignedTo: s2.id,  type: TaskType.Call,     description: 'Confirm Cassandra appointment for Mar 11',         dueAt: d(2026, 3, 10, 9),  status: TaskStatus.Pending, createdAt: d(2026, 3, 8, 9) },
      { id: 'seed-task-008', leadId: 'seed-lead-011', assignedTo: s1.id,  type: TaskType.FollowUp, description: 'Follow up with Leon on credit app status',         dueAt: d(2026, 3, 11, 10), status: TaskStatus.Pending, createdAt: d(2026, 3, 6, 9) },
      { id: 'seed-task-009', leadId: 'seed-lead-012', assignedTo: s2.id,  type: TaskType.Quote,    description: 'Send Tucson lease worksheet to Natalie',           dueAt: d(2026, 3, 9, 14),  status: TaskStatus.Pending, createdAt: d(2026, 3, 8, 9) },
      { id: 'seed-task-010', leadId: 'seed-lead-013', assignedTo: bdc.id, type: TaskType.Call,     description: 'Attempt first phone contact with Kevin Larson',    dueAt: d(2026, 3, 10, 10), status: TaskStatus.Pending, createdAt: d(2026, 3, 8, 9) },
      { id: 'seed-task-011', leadId: 'seed-lead-014', assignedTo: bdc.id, type: TaskType.Email,    description: 'Send welcome + inventory options to Monica Espinoza', dueAt: d(2026, 3, 9, 11), status: TaskStatus.Pending, createdAt: d(2026, 3, 9, 8) },
      // Overdue tasks (to make dashboard interesting)
      { id: 'seed-task-012', leadId: 'seed-lead-009', assignedTo: s1.id,  type: TaskType.Text,     description: 'Text Tyler payment worksheet summary',             dueAt: d(2026, 3, 5, 14),  status: TaskStatus.Pending, createdAt: d(2026, 3, 4, 9) },
      { id: 'seed-task-013', leadId: 'seed-lead-011', assignedTo: bdc.id, type: TaskType.Call,     description: 'Call Leon to gauge urgency and timeline',          dueAt: d(2026, 3, 7, 10),  status: TaskStatus.Pending, createdAt: d(2026, 3, 6, 9) },
      { id: 'seed-task-014', leadId: 'seed-lead-012', assignedTo: mgr.id, type: TaskType.Other,    description: 'Review Tucson lease structure with Sam — needs manager approval', dueAt: d(2026, 3, 8, 15), status: TaskStatus.Pending, createdAt: d(2026, 3, 7, 14) },
      { id: 'seed-task-015', leadId: 'seed-lead-010', assignedTo: bdc.id, type: TaskType.Call,     description: 'Confirm Cassandra has directions and arrival time', dueAt: d(2026, 3, 9, 9),   status: TaskStatus.Pending, createdAt: d(2026, 3, 8, 16) },
      { id: 'seed-task-016', leadId: 'seed-lead-013', assignedTo: s1.id,  type: TaskType.FollowUp, description: 'Second attempt contact Kevin Larson',              dueAt: d(2026, 3, 12, 10), status: TaskStatus.Pending, createdAt: d(2026, 3, 9, 9) },
    ],
  });

  // ─── Notifications ──────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-notif-001', userId: s1.id,  type: 'LeadAssigned', referenceId: 'seed-lead-009', message: 'New lead assigned: Tyler Drummond (Website)',       createdAt: d(2026, 2, 25, 9) },
      { id: 'seed-notif-002', userId: s2.id,  type: 'LeadAssigned', referenceId: 'seed-lead-010', message: 'New lead assigned: Cassandra Moreau (AutoTrader)',  createdAt: d(2026, 3, 1, 9) },
      { id: 'seed-notif-003', userId: s1.id,  type: 'LeadAssigned', referenceId: 'seed-lead-011', message: 'New lead assigned: Leon Patel (Cars.com)',          createdAt: d(2026, 3, 5, 9) },
      { id: 'seed-notif-004', userId: s2.id,  type: 'LeadAssigned', referenceId: 'seed-lead-012', message: 'New lead assigned: Natalie Burgess (Phone)',        createdAt: d(2026, 3, 6, 9) },
      { id: 'seed-notif-005', userId: bdc.id, type: 'LeadAssigned', referenceId: 'seed-lead-013', message: 'New lead assigned: Kevin Larson (Website)',         createdAt: d(2026, 3, 8, 9) },
      { id: 'seed-notif-006', userId: bdc.id, type: 'LeadAssigned', referenceId: 'seed-lead-014', message: 'New lead assigned: Monica Espinoza (Other/Referral)', createdAt: d(2026, 3, 9, 8) },
    ],
  });

  // ─── Deals ──────────────────────────────────────────────────────────────────
  // Helper to create a deal with fees, optional trade-in, and status history

  async function createDeal(params: {
    id: string;
    dealNumber: number;
    customerId: string;
    vehicleId: string;
    dealType: DealType;
    status: DealStatus;
    invoicePrice: number;
    salePrice: number;
    downPayment: number;
    rebates: number;
    apr: number;
    term: number;
    taxRate: number;
    backEndGross?: number | null;
    fees: Array<{ id: string; name: string; amount: number; taxable: boolean }>;
    tradeIn?: { id: string; vin?: string; year: number; make: string; model: string; mileage: number; condition: TradeInCondition; acv: number; allowance: number; payoff: number; lenderName?: string };
    statusHistory: Array<{ id: string; previousStatus: DealStatus | null; newStatus: DealStatus; actorId: string; actorName: string; actorRole: string; note?: string; createdAt: Date }>;
    createdById: string;
    fundedAt?: Date | null;
    createdAt: Date;
  }) {
    const { totalTax, amountFinanced, monthlyPayment, frontEndGross } = calcDealFinancials({
      salePrice: params.salePrice,
      invoicePrice: params.invoicePrice,
      downPayment: params.downPayment,
      rebates: params.rebates,
      apr: params.apr,
      term: params.term,
      taxRate: params.taxRate,
      fees: params.fees,
      tradeAllowance: params.tradeIn?.allowance,
      tradePayoff: params.tradeIn?.payoff,
    });

    await prisma.deal.upsert({
      where: { id: params.id },
      update: {},
      create: {
        id: params.id,
        dealNumber: params.dealNumber,
        customerId: params.customerId,
        vehicleId: params.vehicleId,
        dealType: params.dealType,
        status: params.status,
        salePrice: params.salePrice,
        downPayment: params.downPayment,
        rebates: params.rebates,
        apr: params.apr,
        term: params.term,
        taxRate: params.taxRate,
        totalTax,
        amountFinanced: params.dealType === DealType.Cash ? 0 : amountFinanced,
        monthlyPayment: params.dealType === DealType.Cash ? 0 : monthlyPayment,
        frontEndGross,
        backEndGross: params.backEndGross ?? null,
        createdById: params.createdById,
        fundedAt: params.fundedAt ?? null,
        createdAt: params.createdAt,
      },
    });

    for (const fee of params.fees) {
      await prisma.dealFee.upsert({
        where: { id: fee.id },
        update: {},
        create: { id: fee.id, dealId: params.id, name: fee.name, amount: fee.amount, taxable: fee.taxable },
      });
    }

    if (params.tradeIn) {
      await prisma.tradeIn.upsert({
        where: { id: params.tradeIn.id },
        update: {},
        create: {
          id: params.tradeIn.id,
          dealId: params.id,
          vin: params.tradeIn.vin ?? null,
          year: params.tradeIn.year,
          make: params.tradeIn.make,
          model: params.tradeIn.model,
          mileage: params.tradeIn.mileage,
          condition: params.tradeIn.condition,
          acv: params.tradeIn.acv,
          allowance: params.tradeIn.allowance,
          payoff: params.tradeIn.payoff,
          lenderName: params.tradeIn.lenderName ?? null,
        },
      });
    }

    for (const sh of params.statusHistory) {
      await prisma.dealStatusHistory.upsert({
        where: { id: sh.id },
        update: {},
        create: {
          id: sh.id,
          dealId: params.id,
          previousStatus: sh.previousStatus ?? null,
          newStatus: sh.newStatus,
          actorId: sh.actorId,
          actorName: sh.actorName,
          actorRole: sh.actorRole,
          note: sh.note ?? null,
          createdAt: sh.createdAt,
        },
      });
    }
  }

  // ── Deal 1001 — Funded — James Kowalski — 2024 Toyota Camry XSE V6 ──────────
  // Finance deal, no trade, funded Oct 2025
  await createDeal({
    id: 'seed-deal-001', dealNumber: 1001,
    customerId: 'seed-cust-001', vehicleId: 'seed-veh-001',
    dealType: DealType.Finance, status: DealStatus.Funded,
    invoicePrice: 31820, salePrice: 32500, downPayment: 3000, rebates: 0,
    apr: 6.49, term: 60, taxRate: 0.08,
    backEndGross: 1850,
    fees: [
      { id: 'seed-fee-001a', name: 'Documentary Fee',  amount: 449,  taxable: false },
      { id: 'seed-fee-001b', name: 'Title & License',  amount: 196,  taxable: false },
      { id: 'seed-fee-001c', name: 'Electronic Filing', amount: 75,  taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-001a', previousStatus: null,              newStatus: DealStatus.Pending,         actorId: s1.id,  actorName: actorName(s1),  actorRole: s1.role,  note: 'Deal created for James Kowalski — 2024 Camry XSE V6',  createdAt: d(2025, 10, 14, 15) },
      { id: 'seed-dsh-001b', previousStatus: DealStatus.Pending, newStatus: DealStatus.Desking,        actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desking approved at $32,500',                           createdAt: d(2025, 10, 14, 15, 30) },
      { id: 'seed-dsh-001c', previousStatus: DealStatus.Desking, newStatus: DealStatus.Fni,            actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Sent to F&I',                                          createdAt: d(2025, 10, 14, 16) },
      { id: 'seed-dsh-001d', previousStatus: DealStatus.Fni,     newStatus: DealStatus.ContractsSigned, actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Contracts signed. Toyota Financial, 6.49% 60mo',      createdAt: d(2025, 10, 14, 17) },
      { id: 'seed-dsh-001e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s1.id, actorName: actorName(s1), actorRole: s1.role, note: 'Vehicle delivered',                                   createdAt: d(2025, 10, 14, 18) },
      { id: 'seed-dsh-001f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,       actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Funded by Toyota Financial',                          createdAt: d(2025, 10, 21, 9) },
    ],
    createdById: s1.id, fundedAt: d(2025, 10, 21, 9), createdAt: d(2025, 10, 14, 15),
  });

  // ── Deal 1002 — Funded — Patricia Nguyen — 2022 Honda CR-V EX-L ─────────────
  // Finance deal, no trade
  await createDeal({
    id: 'seed-deal-002', dealNumber: 1002,
    customerId: 'seed-cust-002', vehicleId: 'seed-veh-002',
    dealType: DealType.Finance, status: DealStatus.Funded,
    invoicePrice: 29800, salePrice: 30500, downPayment: 5000, rebates: 500,
    apr: 5.99, term: 60, taxRate: 0.08,
    backEndGross: 2100,
    fees: [
      { id: 'seed-fee-002a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-002b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-002c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-002a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s2.id,  actorName: actorName(s2),  actorRole: s2.role,  note: 'Patricia Nguyen — 2022 CR-V EX-L',                    createdAt: d(2025, 11, 3, 14) },
      { id: 'seed-dsh-002b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk approved $30,500 / $500 rebate',                createdAt: d(2025, 11, 3, 14, 45) },
      { id: 'seed-dsh-002c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'To F&I',                                             createdAt: d(2025, 11, 3, 15, 30) },
      { id: 'seed-dsh-002d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Signed. Honda Financial, 5.99% 60mo.',               createdAt: d(2025, 11, 3, 16, 30) },
      { id: 'seed-dsh-002e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s2.id, actorName: actorName(s2), actorRole: s2.role,  note: 'Delivered same day',                                 createdAt: d(2025, 11, 3, 17) },
      { id: 'seed-dsh-002f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,          actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Funded by Honda Financial',                         createdAt: d(2025, 11, 10, 9) },
    ],
    createdById: s2.id, fundedAt: d(2025, 11, 10, 9), createdAt: d(2025, 11, 3, 14),
  });

  // ── Deal 1003 — Funded — Marcus Williams — 2023 Ford F-150 XLT — CASH ───────
  await createDeal({
    id: 'seed-deal-003', dealNumber: 1003,
    customerId: 'seed-cust-003', vehicleId: 'seed-veh-003',
    dealType: DealType.Cash, status: DealStatus.Funded,
    invoicePrice: 44300, salePrice: 44800, downPayment: 44800, rebates: 0,
    apr: 0, term: 0, taxRate: 0.08,
    backEndGross: 0,
    fees: [
      { id: 'seed-fee-003a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-003b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-003c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-003a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s1.id,  actorName: actorName(s1),  actorRole: s1.role,  note: 'Cash deal — Marcus Williams — F-150 XLT',             createdAt: d(2025, 11, 21, 15) },
      { id: 'seed-dsh-003b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Cash deal approved at $44,800',                      createdAt: d(2025, 11, 21, 15, 20) },
      { id: 'seed-dsh-003c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'To F&I for cash paperwork',                         createdAt: d(2025, 11, 21, 15, 45) },
      { id: 'seed-dsh-003d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Bill of sale signed',                               createdAt: d(2025, 11, 21, 16, 30) },
      { id: 'seed-dsh-003e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s1.id, actorName: actorName(s1), actorRole: s1.role,  note: 'Delivered',                                          createdAt: d(2025, 11, 21, 17) },
      { id: 'seed-dsh-003f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,          actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Cash deal funded',                                  createdAt: d(2025, 11, 24, 9) },
    ],
    createdById: s1.id, fundedAt: d(2025, 11, 24, 9), createdAt: d(2025, 11, 21, 15),
  });

  // ── Deal 1004 — Funded — Brittany Sandoval — 2023 Chevrolet Malibu LT CPO ──
  // Finance with trade-in
  await createDeal({
    id: 'seed-deal-004', dealNumber: 1004,
    customerId: 'seed-cust-004', vehicleId: 'seed-veh-004',
    dealType: DealType.Finance, status: DealStatus.Funded,
    invoicePrice: 24900, salePrice: 25500, downPayment: 2000, rebates: 1000,
    apr: 7.49, term: 72, taxRate: 0.08,
    backEndGross: 1200,
    fees: [
      { id: 'seed-fee-004a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-004b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-004c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    tradeIn: {
      id: 'seed-trade-004',
      vin: '1G11Z5SA7KF145902',
      year: 2019, make: 'Chevrolet', model: 'Impala', mileage: 61200,
      condition: TradeInCondition.Fair, acv: 7800, allowance: 8500, payoff: 5200,
      lenderName: 'Ally Financial',
    },
    statusHistory: [
      { id: 'seed-dsh-004a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s2.id,  actorName: actorName(s2),  actorRole: s2.role,  note: 'Brittany Sandoval — Malibu LT CPO with trade',        createdAt: d(2025, 12, 9, 15) },
      { id: 'seed-dsh-004b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Trade valued $8,500 w/ $5,200 payoff. Approved.',    createdAt: d(2025, 12, 9, 15, 30) },
      { id: 'seed-dsh-004c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Sent to F&I',                                       createdAt: d(2025, 12, 9, 16) },
      { id: 'seed-dsh-004d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Signed. Capital One, 7.49% 72mo.',                  createdAt: d(2025, 12, 9, 17) },
      { id: 'seed-dsh-004e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s2.id, actorName: actorName(s2), actorRole: s2.role,  note: 'Delivered, traded vehicle accepted',                 createdAt: d(2025, 12, 9, 17, 30) },
      { id: 'seed-dsh-004f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,          actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Funded by Capital One',                             createdAt: d(2025, 12, 16, 9) },
    ],
    createdById: s2.id, fundedAt: d(2025, 12, 16, 9), createdAt: d(2025, 12, 9, 15),
  });

  // ── Deal 1005 — Funded — Derek O'Brien — 2022 BMW 330i xDrive CPO ───────────
  // Finance, trade-in, high back-end gross
  await createDeal({
    id: 'seed-deal-005', dealNumber: 1005,
    customerId: 'seed-cust-005', vehicleId: 'seed-veh-005',
    dealType: DealType.Finance, status: DealStatus.Funded,
    invoicePrice: 48200, salePrice: 48900, downPayment: 8000, rebates: 0,
    apr: 5.49, term: 60, taxRate: 0.08,
    backEndGross: 3400,
    fees: [
      { id: 'seed-fee-005a', name: 'Documentary Fee',    amount: 449, taxable: false },
      { id: 'seed-fee-005b', name: 'Title & License',    amount: 196, taxable: false },
      { id: 'seed-fee-005c', name: 'Electronic Filing',   amount: 75, taxable: false },
      { id: 'seed-fee-005d', name: 'BMW CPO Certification', amount: 495, taxable: false },
    ],
    tradeIn: {
      id: 'seed-trade-005',
      vin: '3VW5T7AT6HM805123',
      year: 2017, make: 'Volkswagen', model: 'GTI', mileage: 58900,
      condition: TradeInCondition.Good, acv: 12500, allowance: 13200, payoff: 0,
    },
    statusHistory: [
      { id: 'seed-dsh-005a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s1.id,  actorName: actorName(s1),  actorRole: s1.role,  note: 'Derek O\'Brien — BMW 330i xDrive CPO',                createdAt: d(2025, 12, 19, 15) },
      { id: 'seed-dsh-005b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk approved $48,900 with $13,200 trade allowance',  createdAt: d(2025, 12, 19, 15, 30) },
      { id: 'seed-dsh-005c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'To F&I',                                             createdAt: d(2025, 12, 19, 16) },
      { id: 'seed-dsh-005d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'BMW FS approval, 5.49% 60mo. VSC sold.',             createdAt: d(2025, 12, 19, 17, 30) },
      { id: 'seed-dsh-005e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s1.id, actorName: actorName(s1), actorRole: s1.role,  note: 'Delivered',                                          createdAt: d(2025, 12, 19, 18) },
      { id: 'seed-dsh-005f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,          actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'BMW FS funded',                                     createdAt: d(2025, 12, 30, 9) },
    ],
    createdById: s1.id, fundedAt: d(2025, 12, 30, 9), createdAt: d(2025, 12, 19, 15),
  });

  // ── Deal 1006 — Funded — Raymond Flores — 2024 Toyota RAV4 Adventure AWD ────
  // Finance with trade-in
  await createDeal({
    id: 'seed-deal-006', dealNumber: 1006,
    customerId: 'seed-cust-007', vehicleId: 'seed-veh-007',
    dealType: DealType.Finance, status: DealStatus.Funded,
    invoicePrice: 35100, salePrice: 36900, downPayment: 4500, rebates: 0,
    apr: 6.99, term: 72, taxRate: 0.08,
    backEndGross: 2750,
    fees: [
      { id: 'seed-fee-006a', name: 'Documentary Fee',  amount: 449,  taxable: false },
      { id: 'seed-fee-006b', name: 'Title & License',  amount: 196,  taxable: false },
      { id: 'seed-fee-006c', name: 'Electronic Filing', amount: 75,  taxable: false },
      { id: 'seed-fee-006d', name: 'Window Tint',       amount: 299, taxable: true  },
    ],
    tradeIn: {
      id: 'seed-trade-006',
      vin: '3TMCZ5AN4KM218456',
      year: 2019, make: 'Toyota', model: 'Tacoma', mileage: 52300,
      condition: TradeInCondition.Good, acv: 18000, allowance: 18500, payoff: 4200,
      lenderName: 'Toyota Financial Services',
    },
    statusHistory: [
      { id: 'seed-dsh-006a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s2.id,  actorName: actorName(s2),  actorRole: s2.role,  note: 'Raymond Flores — RAV4 Adventure with Tacoma trade',   createdAt: d(2026, 1, 22, 13) },
      { id: 'seed-dsh-006b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Approved: $36,900 / trade $18,500 / payoff $4,200',  createdAt: d(2026, 1, 22, 13, 30) },
      { id: 'seed-dsh-006c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'To F&I',                                             createdAt: d(2026, 1, 22, 14) },
      { id: 'seed-dsh-006d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Toyota FS approval. 6.99% 72mo. GAP and tire prot.', createdAt: d(2026, 1, 22, 15, 30) },
      { id: 'seed-dsh-006e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s2.id, actorName: actorName(s2), actorRole: s2.role,  note: 'Delivered',                                          createdAt: d(2026, 1, 22, 16) },
      { id: 'seed-dsh-006f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,          actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Toyota FS funded',                                  createdAt: d(2026, 1, 29, 9) },
    ],
    createdById: s2.id, fundedAt: d(2026, 1, 29, 9), createdAt: d(2026, 1, 22, 13),
  });

  // ── Deal 1007 — Unwound — Hyundai Sonata — Angela Kim ───────────────────────
  // Finance, then unwound due to financing falling through
  await createDeal({
    id: 'seed-deal-007', dealNumber: 1007,
    customerId: 'seed-cust-006', vehicleId: 'seed-veh-006',
    dealType: DealType.Finance, status: DealStatus.Unwound,
    invoicePrice: 28900, salePrice: 29500, downPayment: 2500, rebates: 0,
    apr: 9.99, term: 72, taxRate: 0.08,
    backEndGross: 0,
    fees: [
      { id: 'seed-fee-007a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-007b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-007c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-007a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s1.id,  actorName: actorName(s1),  actorRole: s1.role,  note: 'Angela Kim — Sonata SEL Plus',                        createdAt: d(2025, 12, 18, 14) },
      { id: 'seed-dsh-007b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk approved',                                      createdAt: d(2025, 12, 18, 14, 30) },
      { id: 'seed-dsh-007c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'To F&I',                                             createdAt: d(2025, 12, 18, 15) },
      { id: 'seed-dsh-007d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Signed. Awaiting lender approval.',                  createdAt: d(2025, 12, 18, 17) },
      { id: 'seed-dsh-007e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s1.id, actorName: actorName(s1), actorRole: s1.role,  note: 'Delivered pending funding',                          createdAt: d(2025, 12, 18, 18) },
      { id: 'seed-dsh-007f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Unwound,         actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'All lenders declined. Customer returned vehicle. Deal unwound.', createdAt: d(2025, 12, 26, 10) },
    ],
    createdById: s1.id, fundedAt: null, createdAt: d(2025, 12, 18, 14),
  });

  // ── Deal 1008 — Funded — Stephanie Harrington — 2024 Honda Accord Sport ─────
  // Finance deal, Feb 2026
  await createDeal({
    id: 'seed-deal-008', dealNumber: 1008,
    customerId: 'seed-cust-008', vehicleId: 'seed-veh-008',
    dealType: DealType.Finance, status: DealStatus.Funded,
    invoicePrice: 33000, salePrice: 33800, downPayment: 6000, rebates: 0,
    apr: 5.74, term: 60, taxRate: 0.08,
    backEndGross: 2950,
    fees: [
      { id: 'seed-fee-008a', name: 'Documentary Fee',   amount: 449, taxable: false },
      { id: 'seed-fee-008b', name: 'Title & License',   amount: 196, taxable: false },
      { id: 'seed-fee-008c', name: 'Electronic Filing',  amount: 75, taxable: false },
      { id: 'seed-fee-008d', name: 'Paint Protection',  amount: 595, taxable: true  },
    ],
    statusHistory: [
      { id: 'seed-dsh-008a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s2.id,  actorName: actorName(s2),  actorRole: s2.role,  note: 'Stephanie Harrington — 2024 Accord Sport 2.0T',       createdAt: d(2026, 2, 11, 14) },
      { id: 'seed-dsh-008b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk approved',                                      createdAt: d(2026, 2, 11, 14, 30) },
      { id: 'seed-dsh-008c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'To F&I',                                             createdAt: d(2026, 2, 11, 15) },
      { id: 'seed-dsh-008d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Signed. Honda Financial 5.74% 60mo. Paint prot sold.', createdAt: d(2026, 2, 11, 16, 30) },
      { id: 'seed-dsh-008e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s2.id, actorName: actorName(s2), actorRole: s2.role,  note: 'Delivered',                                          createdAt: d(2026, 2, 11, 17) },
      { id: 'seed-dsh-008f', previousStatus: DealStatus.Delivered, newStatus: DealStatus.Funded,          actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Honda Financial funded',                            createdAt: d(2026, 2, 19, 9) },
    ],
    createdById: s2.id, fundedAt: d(2026, 2, 19, 9), createdAt: d(2026, 2, 11, 14),
  });

  // ── Deal 1009 — Delivered (awaiting funding) — Hyundai Sonata ───────────────
  // Vehicle 006 was unwound (deal 1007), re-listed and sold again
  // Use cust-008 repeat for variety — actually use a new deal with a frontline vehicle
  // Delivered deal on 2024 Honda Civic EX (veh-016) for Leon Patel — Finance
  await createDeal({
    id: 'seed-deal-009', dealNumber: 1009,
    customerId: 'seed-cust-011', vehicleId: 'seed-veh-016',
    dealType: DealType.Finance, status: DealStatus.Delivered,
    invoicePrice: 26100, salePrice: 27195, downPayment: 3000, rebates: 0,
    apr: 7.24, term: 60, taxRate: 0.08,
    backEndGross: 1800,
    fees: [
      { id: 'seed-fee-009a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-009b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-009c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-009a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s1.id,  actorName: actorName(s1),  actorRole: s1.role,  note: 'Leon Patel — 2024 Honda Civic EX Hatchback',          createdAt: d(2026, 3, 6, 14) },
      { id: 'seed-dsh-009b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk approved at $27,195',                           createdAt: d(2026, 3, 6, 14, 30) },
      { id: 'seed-dsh-009c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Sent to F&I',                                       createdAt: d(2026, 3, 6, 15) },
      { id: 'seed-dsh-009d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Signed. Chase Auto 7.24% 60mo.',                    createdAt: d(2026, 3, 6, 16, 30) },
      { id: 'seed-dsh-009e', previousStatus: DealStatus.ContractsSigned, newStatus: DealStatus.Delivered, actorId: s1.id, actorName: actorName(s1), actorRole: s1.role,  note: 'Vehicle delivered Mar 7. Awaiting funding.',         createdAt: d(2026, 3, 7, 11) },
    ],
    createdById: s1.id, fundedAt: null, createdAt: d(2026, 3, 6, 14),
  });

  // ── Deal 1010 — ContractsSigned — Equinox LT — Natalie Burgess ──────────────
  await createDeal({
    id: 'seed-deal-010', dealNumber: 1010,
    customerId: 'seed-cust-012', vehicleId: 'seed-veh-012',
    dealType: DealType.Finance, status: DealStatus.ContractsSigned,
    invoicePrice: 27500, salePrice: 28895, downPayment: 2500, rebates: 0,
    apr: 8.49, term: 72, taxRate: 0.08,
    backEndGross: null,
    fees: [
      { id: 'seed-fee-010a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-010b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-010c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-010a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s2.id,  actorName: actorName(s2),  actorRole: s2.role,  note: 'Natalie Burgess — 2022 Equinox LT AWD',               createdAt: d(2026, 3, 7, 15) },
      { id: 'seed-dsh-010b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk set at $28,895 / 8.49% 72mo for ~$390/mo',      createdAt: d(2026, 3, 7, 15, 30) },
      { id: 'seed-dsh-010c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'In F&I',                                             createdAt: d(2026, 3, 7, 16) },
      { id: 'seed-dsh-010d', previousStatus: DealStatus.Fni,      newStatus: DealStatus.ContractsSigned,  actorId: fni.id, actorName: actorName(fni), actorRole: fni.role, note: 'Contracts signed. Ally Financial. Delivery scheduled tomorrow.', createdAt: d(2026, 3, 7, 17) },
    ],
    createdById: s2.id, fundedAt: null, createdAt: d(2026, 3, 7, 15),
  });

  // ── Deal 1011 — Fni — BMW 530i — Stephanie Harrington (repeat buy) ──────────
  // Actually use cust-008 since she's a luxury buyer. Veh-013 = BMW 530i.
  await createDeal({
    id: 'seed-deal-011', dealNumber: 1011,
    customerId: 'seed-cust-008', vehicleId: 'seed-veh-013',
    dealType: DealType.Finance, status: DealStatus.Fni,
    invoicePrice: 56800, salePrice: 58500, downPayment: 10000, rebates: 0,
    apr: 5.99, term: 60, taxRate: 0.08,
    backEndGross: null,
    fees: [
      { id: 'seed-fee-011a', name: 'Documentary Fee',    amount: 449,  taxable: false },
      { id: 'seed-fee-011b', name: 'Title & License',    amount: 196,  taxable: false },
      { id: 'seed-fee-011c', name: 'Electronic Filing',   amount: 75,  taxable: false },
      { id: 'seed-fee-011d', name: 'BMW CPO Certification', amount: 495, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-011a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s2.id,  actorName: actorName(s2),  actorRole: s2.role,  note: 'Stephanie Harrington — 2023 BMW 530i xDrive CPO',     createdAt: d(2026, 3, 8, 14) },
      { id: 'seed-dsh-011b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Desk approved at $58,500',                           createdAt: d(2026, 3, 8, 14, 30) },
      { id: 'seed-dsh-011c', previousStatus: DealStatus.Desking,  newStatus: DealStatus.Fni,              actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'In F&I with Diana. Working BMW FS approval.',       createdAt: d(2026, 3, 8, 15) },
    ],
    createdById: s2.id, fundedAt: null, createdAt: d(2026, 3, 8, 14),
  });

  // ── Deal 1012 — Desking — Toyota Camry SE — Tyler Drummond ──────────────────
  await createDeal({
    id: 'seed-deal-012', dealNumber: 1012,
    customerId: 'seed-cust-009', vehicleId: 'seed-veh-009',
    dealType: DealType.Finance, status: DealStatus.Desking,
    invoicePrice: 29500, salePrice: 31200, downPayment: 2500, rebates: 0,
    apr: 7.99, term: 72, taxRate: 0.08,
    backEndGross: null,
    fees: [
      { id: 'seed-fee-012a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-012b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-012c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-012a', previousStatus: null,               newStatus: DealStatus.Pending,          actorId: s1.id,  actorName: actorName(s1),  actorRole: s1.role,  note: 'Tyler Drummond — 2025 Toyota Camry SE (first-time buyer)', createdAt: d(2026, 3, 8, 16) },
      { id: 'seed-dsh-012b', previousStatus: DealStatus.Pending,  newStatus: DealStatus.Desking,          actorId: mgr.id, actorName: actorName(mgr), actorRole: mgr.role, note: 'Working payment structure. Submitted to lenders.',   createdAt: d(2026, 3, 9, 9) },
    ],
    createdById: s1.id, fundedAt: null, createdAt: d(2026, 3, 8, 16),
  });

  // ── Deal 1013 — Pending — Honda CR-V Sport Hybrid — Cassandra Moreau ────────
  await createDeal({
    id: 'seed-deal-013', dealNumber: 1013,
    customerId: 'seed-cust-010', vehicleId: 'seed-veh-010',
    dealType: DealType.Finance, status: DealStatus.Pending,
    invoicePrice: 35800, salePrice: 37195, downPayment: 4000, rebates: 500,
    apr: 6.49, term: 60, taxRate: 0.08,
    backEndGross: null,
    fees: [
      { id: 'seed-fee-013a', name: 'Documentary Fee',  amount: 449, taxable: false },
      { id: 'seed-fee-013b', name: 'Title & License',  amount: 196, taxable: false },
      { id: 'seed-fee-013c', name: 'Electronic Filing', amount: 75, taxable: false },
    ],
    statusHistory: [
      { id: 'seed-dsh-013a', previousStatus: null, newStatus: DealStatus.Pending, actorId: s2.id, actorName: actorName(s2), actorRole: s2.role, note: 'Cassandra Moreau — 2025 Honda CR-V Sport Hybrid. Deal just created.', createdAt: d(2026, 3, 9, 10) },
    ],
    createdById: s2.id, fundedAt: null, createdAt: d(2026, 3, 9, 10),
  });

  // ── Mark sold vehicles with sale prices matching their deals ─────────────────
  // These are already set via vehicle upsert above (status=Sold, dateSold set)
  // Update salePrice to match deal salePrice for accuracy
  const soldPrices: Record<string, number> = {
    'seed-veh-001': 32500, // Deal 1001
    'seed-veh-002': 30500, // Deal 1002
    'seed-veh-003': 44800, // Deal 1003
    'seed-veh-004': 25500, // Deal 1004
    'seed-veh-005': 48900, // Deal 1005
    'seed-veh-007': 36900, // Deal 1006
    'seed-veh-008': 33800, // Deal 1008
    // veh-006 was unwound, still Sold status from original seeding but deal unwound
    // keep it Sold since a fresh sale may come
  };
  for (const [id, price] of Object.entries(soldPrices)) {
    await prisma.vehicle.update({
      where: { id },
      data: { salePrice: price },
    });
  }

  console.log(`
Seed complete!
  Users:          ${usersData.length}
  Vehicles:       ${vehiclesData.length} (8 Sold, 8 FrontlineReady, 2 InRecon, 2 InTransit)
  Customers:      ${customersData.length}
  Leads:          14 (6 Sold, 2 Lost, 6 Active)
  Activities:     27
  Tasks:          16 (5 Completed, 11 Pending)
  Deals:          13 (6 Funded, 1 Unwound, 1 Delivered, 1 ContractsSigned, 1 Fni, 1 Desking, 1 Pending, 1 extra Funded)
  DealershipConfig: dealNumberOffset=1001
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

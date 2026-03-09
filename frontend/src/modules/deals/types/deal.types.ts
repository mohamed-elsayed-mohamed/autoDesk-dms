// ─── Deal Enums ───────────────────────────────────────────────────────────────

export enum DealType {
  Cash = 'Cash',
  Finance = 'Finance',
  Lease = 'Lease',
}

export enum DealStatus {
  Pending = 'Pending',
  Desking = 'Desking',
  Fni = 'Fni',
  ContractsSigned = 'ContractsSigned',
  Delivered = 'Delivered',
  Funded = 'Funded',
  Unwound = 'Unwound',
}

export enum TradeInCondition {
  Excellent = 'Excellent',
  Good = 'Good',
  Fair = 'Fair',
  Poor = 'Poor',
}

export enum DocumentType {
  BuyersOrder = 'BuyersOrder',
  BillOfSale = 'BillOfSale',
}

// ─── Entity Interfaces ────────────────────────────────────────────────────────

export interface DealFee {
  id: string;
  dealId: string;
  name: string;
  amount: string; // Decimal as string from API
  taxable: boolean;
  createdAt: string;
}

export interface TradeIn {
  id: string;
  dealId: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  mileage: number;
  condition: TradeInCondition;
  acv: string;
  allowance: string;
  payoff: string;
  lenderName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealStatusHistoryEntry {
  id: string;
  dealId: string;
  previousStatus: DealStatus | null;
  newStatus: DealStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  dealId: string;
  documentType: DocumentType;
  fileUrl: string;
  generatedAt: string;
}

export interface DealActor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Deal {
  id: string;
  dealNumber: number;
  customerId: string;
  vehicleId: string;
  dealType: DealType;
  status: DealStatus;
  salePrice: string;
  downPayment: string;
  rebates: string;
  apr: string;
  term: number;
  taxRate: string;
  totalTax: string;
  amountFinanced: string;
  monthlyPayment: string;
  frontEndGross: string;
  backEndGross: string | null;
  createdById: string;
  fundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Expanded relations
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  vehicle?: {
    id: string;
    vin: string;
    stockNumber: number;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    condition: string;
    invoicePrice: string | null;
  };
  createdBy?: DealActor;
  fees?: DealFee[];
  tradeIn?: TradeIn | null;
  statusHistory?: DealStatusHistoryEntry[];
  documents?: GeneratedDocument[];
}

// ─── Summary / List Types ─────────────────────────────────────────────────────

export interface DealSummary {
  id: string;
  dealNumber: number;
  status: DealStatus;
  dealType: DealType;
  customerName: string;
  vehicleDescription: string;
  salePrice: string;
  monthlyPayment: string;
  frontEndGross: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface CreateDealRequest {
  customerId: string;
  vehicleId: string;
  dealType: DealType;
}

export interface UpdateDealRequest {
  salePrice?: number;
  downPayment?: number;
  rebates?: number;
  apr?: number;
  term?: number;
  taxRate?: number;
  backEndGross?: number | null;
  dealType?: DealType;
  updatedAt: string; // Required for optimistic concurrency check
}

export interface CreateDealFeeRequest {
  name: string;
  amount: number;
  taxable: boolean;
}

export interface UpdateDealFeeRequest {
  name?: string;
  amount?: number;
  taxable?: boolean;
}

export interface UpsertTradeInRequest {
  vin?: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  condition: TradeInCondition;
  acv: number;
  allowance: number;
  payoff: number;
  lenderName?: string;
}

export interface TransitionStatusRequest {
  newStatus: DealStatus;
  note?: string;
}

export interface GenerateDocumentRequest {
  documentType: DocumentType;
}

export interface SalesReportQuery {
  startDate: string;
  endDate: string;
}

export interface SalesReportSalesperson {
  userId: string;
  name: string;
  totalUnits: number;
  totalFrontEndGross: string;
  avgFrontEndGross: string;
  totalBackEndGross: string;
  avgBackEndGross: string;
}

export interface SalesReport {
  startDate: string;
  endDate: string;
  totalUnits: number;
  totalFrontEndGross: string;
  avgFrontEndGross: string;
  totalBackEndGross: string;
  avgBackEndGross: string;
  bySalesperson: SalesReportSalesperson[];
}

export interface PaginatedDeals {
  data: Deal[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DealershipConfig {
  id: string;
  dealNumberOffset: number;
  updatedAt: string;
}

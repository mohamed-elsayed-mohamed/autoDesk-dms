// ─── Enums ────────────────────────────────────────────────────────────────────

export type HousingType = 'Own' | 'Rent' | 'Other';

export type CreditApplicationStatus = 'Draft' | 'Submitted' | 'Archived';

export type LenderDecision = 'Approved' | 'Conditional' | 'Declined';

export type FiProductType =
  | 'VSC'
  | 'GAP'
  | 'TireWheel'
  | 'PaintProtection'
  | 'MaintenancePlan'
  | 'Other';

export type FiProductStatus = 'Active' | 'Cancelled' | 'ChargedBack';

export type FiAuditActionType =
  | 'CreditAppCreated'
  | 'CreditAppSubmitted'
  | 'CreditAppSuperseded'
  | 'LenderSubmitted'
  | 'LenderDecisionSelected'
  | 'ProductAdded'
  | 'ProductEdited'
  | 'ProductRemoved'
  | 'ProductStatusChanged'
  | 'ChargebackRecorded'
  | 'DisclosureConfirmed';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Lender {
  id: string;
  name: string;
  isActive: boolean;
  maxMarkupCap: string | null; // Decimal serialized as string
  createdAt: string;
  updatedAt: string;
}

export interface CreditApplication {
  id: string;
  dealId: string;
  customerId: string;
  annualIncome: string;
  employerName: string;
  employmentLengthMonths: number;
  housingType: HousingType;
  monthlyHousingPayment: string;
  ssnMasked: string; // Always XXX-XX-#### — never the full SSN
  dateOfBirth: string; // ISO date string YYYY-MM-DD
  status: CreditApplicationStatus;
  createdById: string;
  submittedById: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LenderSubmission {
  id: string;
  dealId: string;
  creditApplicationId: string;
  lenderId: string;
  lenderName: string;
  submittedAt: string;
  decision: LenderDecision;
  approvedAmount: string | null;
  buyRate: string | null;
  maxTerm: number | null;
  stipulations: string | null;
  isSelected: boolean;
  createdAt: string;
}

export interface SelectedLenderDecision {
  id: string;
  dealId: string;
  lenderSubmissionId: string;
  buyRate: string;
  rateMarkup: string;
  sellRate: string;
  selectedTerm: number;
  selectedById: string;
  selectedAt: string;
  createdAt: string;
}

export interface FIProduct {
  id: string;
  dealId: string;
  productType: FiProductType;
  providerName: string;
  cost: string;
  sellingPrice: string;
  termMonths: number;
  deductible: string | null;
  contractNumber: string | null;
  status: FiProductStatus;
  chargebackAmount: string | null;
  chargebackDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCatalogItem {
  id: string;
  productType: FiProductType;
  providerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisclosureRequirement {
  id: string;
  jurisdiction: string;
  disclosureName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisclosureConfirmation {
  id: string;
  dealId: string;
  disclosureName: string;
  confirmedById: string;
  confirmedByName: string;
  confirmedByRole: string;
  confirmedAt: string; // ISO date YYYY-MM-DD
  createdAt: string;
}

export interface FIAuditLog {
  id: string;
  dealId: string;
  actionType: FiAuditActionType;
  actorId: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface FiPerformanceDealRow {
  dealId: string;
  dealNumber: number;
  customerName: string;
  fundedAt: string;
  totalFiRevenue: string;
  totalChargebacks: string;
  netFiRevenue: string;
  productCount: number;
}

export interface FiPerformanceReport {
  from: string;
  to: string;
  totalFiRevenue: string;
  totalChargebacks: string;
  netFiRevenue: string;
  pvr: string | null;
  fundedUnitCount: number;
  deals: FiPerformanceDealRow[];
}

// ─── Disclosure status ────────────────────────────────────────────────────────

export interface DisclosureStatus {
  requirements: DisclosureRequirement[];
  confirmations: DisclosureConfirmation[];
  required: number;
  confirmed: number;
  pending: number;
  isComplete: boolean;
}

// ─── API response wrappers ───────────────────────────────────────────────────

export interface FiApiResponse<T> {
  data: T;
  warnings?: string[];
}

export interface FiPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

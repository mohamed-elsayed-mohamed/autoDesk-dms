export enum Condition {
  New = 'New',
  Used = 'Used',
  CPO = 'CPO',
}

export enum VehicleStatus {
  InTransit = 'InTransit',
  InRecon = 'InRecon',
  FrontlineReady = 'FrontlineReady',
  Sold = 'Sold',
  Wholesaled = 'Wholesaled',
}

export enum UserRole {
  InventoryManager = 'InventoryManager',
  SalesConsultant = 'SalesConsultant',
  GeneralManager = 'GeneralManager',
  SalesManager = 'SalesManager',
  BDCAgent = 'BDCAgent',
  FniManager = 'FniManager',
}

// ─── CRM Enums ────────────────────────────────────────────────────────────────

export enum LeadSource {
  Website = 'Website',
  Phone = 'Phone',
  WalkIn = 'WalkIn',
  AutoTrader = 'AutoTrader',
  CarsDotCom = 'CarsDotCom',
  Other = 'Other',
}

export enum LeadStatus {
  New = 'New',
  Contacted = 'Contacted',
  AppointmentSet = 'AppointmentSet',
  Showed = 'Showed',
  Negotiating = 'Negotiating',
  Sold = 'Sold',
  Lost = 'Lost',
}

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.AppointmentSet,
  LeadStatus.Showed,
  LeadStatus.Negotiating,
  LeadStatus.Sold,
  LeadStatus.Lost,
];

export enum ActivityType {
  Call = 'Call',
  Email = 'Email',
  Text = 'Text',
  Visit = 'Visit',
  Note = 'Note',
}

export enum ActivityDirection {
  Inbound = 'Inbound',
  Outbound = 'Outbound',
}

export enum TaskStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum TaskType {
  Call = 'Call',
  Email = 'Email',
  Text = 'Text',
  Quote = 'Quote',
  FollowUp = 'FollowUp',
  Other = 'Other',
}

export enum PreferredContact {
  Phone = 'Phone',
  Email = 'Email',
  Text = 'Text',
}

// ─── CRM Interfaces ───────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  preferredContact: PreferredContact;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  preferredContact: PreferredContact;
  archivedAt: string | null;
  createdAt: string;
  leadCount: number;
}

export interface CustomerDetail extends Customer {
  leads: LeadSummary[];
}

export interface DuplicateMatch {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  matchedOn: 'phone' | 'email';
}

export interface LeadSummary {
  id: string;
  source: LeadSource;
  status: LeadStatus;
  assignee: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface LeadVehicleRef {
  id: string;
  vehicleId: string;
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    stockNumber: number;
    status: string;
    internetPrice: string | null;
  };
}

export interface LeadStatusHistoryEntry {
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  lostReason: string | null;
  changedBy: string;
  changedAt: string;
}

export interface Lead {
  id: string;
  customerId: string;
  customer: { id: string; firstName: string; lastName: string; phone: string | null; email: string | null; preferredContact: PreferredContact };
  source: LeadSource;
  sourceOther: string | null;
  status: LeadStatus;
  assignedTo: string | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  lostReason: string | null;
  notes: string | null;
  vehicles: LeadVehicleRef[];
  statusHistory: LeadStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadListItem {
  id: string;
  customer: { id: string; firstName: string; lastName: string; phone: string | null };
  source: LeadSource;
  status: LeadStatus;
  assignee: { id: string; firstName: string; lastName: string } | null;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  customerId: string;
  leadId: string | null;
  lead: { id: string; source: LeadSource; status: LeadStatus } | null;
  type: ActivityType;
  direction: ActivityDirection | null;
  content: string | null;
  performedBy: string;
  performer: { id: string; firstName: string; lastName: string };
  performedAt: string;
}

export interface Task {
  id: string;
  leadId: string;
  lead: {
    id: string;
    customer: { id: string; firstName: string; lastName: string; phone: string | null };
    source: LeadSource;
    status: LeadStatus;
  };
  assignedTo: string;
  assignee: { id: string; firstName: string; lastName: string };
  type: TaskType | null;
  description: string | null;
  dueAt: string;
  completedAt: string | null;
  status: TaskStatus;
  isOverdue: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'LeadAssigned' | 'LeadReassigned';
  referenceId: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface ManagerDashboardData {
  pipeline: Record<LeadStatus, number>;
  workload: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    activeLeadCount: number;
    pendingTaskCount: number;
    overdueTaskCount: number;
  }>;
  taskCompliance: {
    totalPending: number;
    totalOverdue: number;
    overdueByAssignee: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      overdueCount: number;
    }>;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface VehiclePhoto {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface VehicleHistoryEntry {
  id: string;
  changeType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Vehicle {
  id: string;
  vin: string;
  stockNumber: number;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  bodyStyle: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  mileage: number;
  condition: Condition;
  status: VehicleStatus;
  msrp: string | null;
  invoicePrice: string | null;
  internetPrice: string | null;
  salePrice: string | null;
  lotLocation: string | null;
  dateAcquired: string;
  dateSold: string | null;
  deletedAt: string | null;
  daysInStock: number;
  photos: VehiclePhoto[];
  history: VehicleHistoryEntry[];
}

export interface VehicleListItem {
  id: string;
  stockNumber: number;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  condition: Condition;
  status: VehicleStatus;
  internetPrice: string | null;
  mileage: number;
  exteriorColor: string | null;
  primaryPhotoUrl: string | null;
  dateAcquired: string;
  daysInStock: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface DashboardData {
  totalCount: number;
  totalValue: string;
  averageDaysInStock: number;
  agingList: PaginatedResponse<{
    stockNumber: number;
    make: string;
    model: string;
    daysInStock: number;
    internetPrice: string;
  }>;
}

export interface VinDecodeResult {
  decoded: boolean;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  fuelType?: string;
  reason?: string;
}

// ─── Deal Types (re-exported from deals module for cross-feature consumption) ─
export * from '../modules/deals/types/deal.types';

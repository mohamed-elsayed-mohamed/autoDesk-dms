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

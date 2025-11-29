export enum UserRole {
  ADMIN = 'ADMIN',
  CHINA_AGENT = 'CHINA_AGENT',
  UAE_AGENT = 'UAE_AGENT',
  IRAN_AGENT = 'IRAN_AGENT',
  CUSTOMER = 'CUSTOMER',
}

export enum PackageStatus {
  // China
  PURCHASED_FROM_SELLER = 'PURCHASED_FROM_SELLER',
  IN_TRANSIT_TO_CHINA_AGENT = 'IN_TRANSIT_TO_CHINA_AGENT',
  RECEIVED_IN_CHINA = 'RECEIVED_IN_CHINA',
  QC_CHECKED = 'QC_CHECKED',
  PACKED_CHINA = 'PACKED_CHINA',
  READY_TO_SHIP_UAE = 'READY_TO_SHIP_UAE',
  SHIPPED_TO_UAE = 'SHIPPED_TO_UAE',
  
  // UAE
  ARRIVED_UAE = 'ARRIVED_UAE',
  REPACKING = 'REPACKING',
  READY_TO_SHIP_IRAN = 'READY_TO_SHIP_IRAN',
  SHIPPED_TO_IRAN = 'SHIPPED_TO_IRAN',
  
  // Iran
  ARRIVED_IRAN = 'ARRIVED_IRAN',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  
  // Exception
  ISSUE_REPORTED = 'ISSUE_REPORTED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
  avatarUrl?: string;
  phoneNumber?: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  createdAt: number;
  totalOrders?: number;
}

export interface TrackingEvent {
  id: string;
  packageId: string;
  status: PackageStatus;
  timestamp: number;
  userId: string;
  location: string;
  notes?: string;
  photoUrls?: string[];
}

export interface Package {
  id: string;
  orderId: string;
  subOrderId: string;
  weight?: number; // in kg
  dimensions?: string; // LxWxH
  currentStatus: PackageStatus;
  trackingNumber: string; // Internal or External
  internalTrackingCode?: string; // Internal tracking code (China logistics, Tipax, etc.)
  description: string;
  qrCodeData: string;
  warehouseBin?: string;
  productLink?: string; // Link to the product source
  price?: number; // Cost of the item
  declaredValue?: number;
  photoUrls?: string[]; // QC/Status photos captured by agents
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string; // Denormalized for ease
  customerPhone?: string;
  shippingAddress?: string;
  source: '1688' | 'Taobao' | 'Shein' | 'YesStyle' | 'AliExpress' | 'Other';
  createdAt: number;
  totalItems: number;
  packages: Package[];
  status: PackageStatus; // Aggregate status
  totalPrice?: number; // Total cost of the order
  amountPaid?: number; // Amount paid upfront
  balanceDue?: number; // Remaining balance
}

export interface Stats {
  totalOrders: number;
  activeShipments: number;
  pendingAttention: number;
  revenue: number;
}

export interface AuditLog {
  id: string;
  action: 'ORDER_CREATED' | 'STATUS_UPDATE' | 'LOGIN' | 'AGENT_CREATED' | 'ISSUE_REPORTED';
  userId: string;
  userName: string;
  details: string;
  timestamp: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}


import { PackageStatus, UserRole, User, Order } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const MOCK_USERS: User[] = [
  { uid: 'admin-1', email: 'admin@logistics.com', displayName: 'System Admin', role: UserRole.ADMIN },
  { uid: 'china-1', email: 'china@logistics.com', displayName: 'Li Wei (CN Agent)', role: UserRole.CHINA_AGENT },
  { uid: 'uae-1', email: 'uae@logistics.com', displayName: 'Ahmed (UAE Agent)', role: UserRole.UAE_AGENT },
  { uid: 'iran-1', email: 'iran@logistics.com', displayName: 'Reza (IR Agent)', role: UserRole.IRAN_AGENT },
  { 
    uid: 'cust-1', 
    email: 'customer@gmail.com', 
    displayName: 'Sarah J.', 
    role: UserRole.CUSTOMER,
    phoneNumber: '+971 50 123 4567',
    address: 'Downtown Dubai, Blvd Plaza, Unit 402, UAE'
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2024-001',
    customerId: 'cust-1',
    customerName: 'Sarah J.',
    customerPhone: '+971 50 123 4567',
    address: 'Downtown Dubai, Blvd Plaza, Unit 402, UAE',
    source: '1688',
    createdAt: Date.now() - 86400000 * 5,
    totalItems: 2,
    status: PackageStatus.RECEIVED_IN_CHINA,
    totalPrice: 150.50,
    packages: [
      {
        id: 'PKG-101',
        orderId: 'ORD-2024-001',
        subOrderId: 'SUB-001',
        description: 'Winter Jacket',
        currentStatus: PackageStatus.RECEIVED_IN_CHINA,
        trackingNumber: 'CN123456789',
        qrCodeData: 'PKG-101',
        warehouseBin: 'A-12',
        weight: 1.2,
        price: 80.00,
        productLink: 'https://1688.com/product/1'
      },
      {
        id: 'PKG-102',
        orderId: 'ORD-2024-001',
        subOrderId: 'SUB-001',
        description: 'Boots',
        currentStatus: PackageStatus.IN_TRANSIT_TO_CHINA_AGENT,
        trackingNumber: 'CN987654321',
        qrCodeData: 'PKG-102',
        price: 70.50,
        productLink: 'https://1688.com/product/2'
      }
    ]
  },
  {
    id: 'ORD-2024-002',
    customerId: 'cust-1',
    customerName: 'Sarah J.',
    customerPhone: '+971 50 123 4567',
    address: 'Downtown Dubai, Blvd Plaza, Unit 402, UAE',
    source: 'Shein',
    createdAt: Date.now() - 86400000 * 2,
    totalItems: 1,
    status: PackageStatus.SHIPPED_TO_UAE,
    totalPrice: 45.00,
    packages: [
      {
        id: 'PKG-201',
        orderId: 'ORD-2024-002',
        subOrderId: 'SUB-002',
        description: 'Summer Dress',
        currentStatus: PackageStatus.SHIPPED_TO_UAE,
        trackingNumber: 'SH11223344',
        qrCodeData: 'PKG-201',
        weight: 0.5,
        price: 45.00,
        productLink: 'https://shein.com/product/99'
      }
    ]
  }
];

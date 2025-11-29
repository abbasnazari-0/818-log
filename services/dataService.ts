import { Order, Package, PackageStatus, TrackingEvent, User, UserRole, AuditLog, Customer } from '../types';
import { MOCK_ORDERS, MOCK_USERS } from './mockData';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  writeBatch
} from 'firebase/firestore';

class DataService {
  // --- Orders ---

  async getOrders(role: string, userId: string): Promise<Order[]> {
    try {
      let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      
      if (role === 'CUSTOMER') {
        q = query(collection(db, 'orders'), where('customerId', '==', userId), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Order);
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  }

  async getOrderById(orderId: string): Promise<Order | undefined> {
    try {
      const docRef = doc(db, 'orders', orderId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Order;
      }
      return undefined;
    } catch (error) {
      console.error("Error fetching order:", error);
      return undefined;
    }
  }

  async createOrder(order: Order): Promise<void> {
    try {
      await setDoc(doc(db, 'orders', order.id), order);
      
      // Also create standalone package docs
      order.packages.forEach(async (pkg) => {
        await setDoc(doc(db, 'packages', pkg.id), pkg);
      });
      
      await this.logAction({
        action: 'ORDER_CREATED',
        userId: order.customerId,
        userName: order.customerName,
        details: `Order ${order.id} created with ${order.totalItems} items.`,
        severity: 'INFO'
      });
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  async deleteOrder(orderId: string, userId: string): Promise<void> {
    try {
      // 1. Get the order to find its packages
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error("Order not found");
      }
      
      const orderData = orderSnap.data() as Order;
      const batch = writeBatch(db);
      
      // 2. Delete all packages associated with this order
      orderData.packages.forEach(pkg => {
        const pkgRef = doc(db, 'packages', pkg.id);
        batch.delete(pkgRef);
      });
      
      // 3. Delete the order itself
      batch.delete(orderRef);
      
      await batch.commit();
      
      // 4. Log the action
      await this.logAction({
        action: 'ORDER_CREATED', // We can add a new action type later
        userId: userId,
        userName: 'User',
        details: `Order ${orderId} deleted with ${orderData.totalItems} items.`,
        severity: 'WARNING'
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  }

  async updateOrderPayment(orderId: string, amountPaid: number, balanceDue: number): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        amountPaid: amountPaid,
        balanceDue: balanceDue
      });
    } catch (error) {
      console.error("Error updating order payment:", error);
      throw error;
    }
  }

  // --- Packages ---

  async getPackageById(packageId: string): Promise<Package | undefined> {
    // Since packages are inside orders, we have to query orders that contain this package
    // This is a tradeoff of the document structure. 
    // A better structure would be a top-level 'packages' collection, but for now we query.
    // Actually, Firestore doesn't support array-contains-object well for deep search without index.
    // Strategy: We will fetch all active orders (inefficient but works for small app) or rely on a 'packages' collection if we migrate.
    // MIGRATION DECISION: Let's create a top-level 'packages' collection for easier scanning.
    
    try {
      const docRef = doc(db, 'packages', packageId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Package;
      }
      return undefined;
    } catch (error) {
      console.error("Error fetching package:", error);
      return undefined;
    }
  }

  async getPackageByInternalTrackingCode(trackingCode: string): Promise<Package | undefined> {
    try {
      const q = query(
        collection(db, 'packages'), 
        where('internalTrackingCode', '==', trackingCode)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as Package;
      }
      return undefined;
    } catch (error) {
      console.error("Error fetching package by internal tracking code:", error);
      return undefined;
    }
  }

  async updatePackageStatus(
    packageId: string, 
    newStatus: PackageStatus, 
    userId: string, 
    notes: string,
    location: string,
    additionalData?: Partial<Package>
  ): Promise<void> {
    try {
      // 1. Update the standalone package document
      const pkgRef = doc(db, 'packages', packageId);
      const pkgSnap = await getDoc(pkgRef);
      
      if (!pkgSnap.exists()) throw new Error("Package not found");
      
      const currentPkg = pkgSnap.data() as Package;
      const orderId = currentPkg.orderId;

      await updateDoc(pkgRef, {
        currentStatus: newStatus,
        ...additionalData
      });

      // 2. Update the package inside the Order document (to keep them in sync)
      // This requires reading the order, finding the package, and updating the array.
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;
        const updatedPackages = orderData.packages.map(p => 
          p.id === packageId ? { ...p, currentStatus: newStatus, ...additionalData } : p
        );
        
        // Determine the overall order status based on all packages
        let overallStatus = newStatus;
        
        // If multiple packages, use the "least advanced" status
        if (updatedPackages.length > 1) {
          // Find the package with the earliest status in the workflow
          const allStatuses = updatedPackages.map(p => p.currentStatus);
          const statusOrder = Object.values(PackageStatus);
          
          // Get the minimum status index (earliest in the workflow)
          let minIndex = statusOrder.length;
          for (const status of allStatuses) {
            const idx = statusOrder.indexOf(status);
            if (idx !== -1 && idx < minIndex) {
              minIndex = idx;
              overallStatus = status;
            }
          }
        }
        
        // Update both packages array and overall order status
        await updateDoc(orderRef, { 
          packages: updatedPackages,
          status: overallStatus
        });
      }

      // 3. Log Tracking Event
      await addDoc(collection(db, 'tracking_events'), {
        id: uuidv4(),
        packageId,
        status: newStatus,
        timestamp: Date.now(),
        userId,
        location,
        notes
      });

      // 4. Audit Log
      await this.logAction({
        action: 'STATUS_UPDATE',
        userId: userId,
        userName: 'Agent', // In real app, fetch user name
        details: `Package ${packageId} updated to ${newStatus}`,
        severity: 'INFO'
      });

    } catch (error) {
      console.error("Error updating package:", error);
      throw error;
    }
  }

  async updatePackageInternalTrackingCode(packageId: string, internalTrackingCode: string): Promise<void> {
    try {
      // 1. Update the standalone package doc
      const pkgRef = doc(db, 'packages', packageId);
      const pkgSnap = await getDoc(pkgRef);
      if (!pkgSnap.exists()) throw new Error("Package not found");
      
      const currentPkg = pkgSnap.data() as Package;
      const orderId = currentPkg.orderId;

      await updateDoc(pkgRef, {
        internalTrackingCode: internalTrackingCode
      });

      // 2. Update the package inside the Order document (to keep them in sync)
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;
        const updatedPackages = orderData.packages.map(p => 
          p.id === packageId ? { ...p, internalTrackingCode } : p
        );
        
        await updateDoc(orderRef, { packages: updatedPackages });
      }

      // 3. Audit Log
      await this.logAction({
        action: 'TRACKING_CODE_UPDATE',
        userId: 'admin',
        userName: 'Admin',
        details: `Internal tracking code updated for package ${packageId}: ${internalTrackingCode}`,
        severity: 'INFO'
      });

    } catch (error) {
      console.error("Error updating internal tracking code:", error);
      throw error;
    }
  }

  async getTrackingHistory(packageId: string): Promise<TrackingEvent[]> {
    try {
      const q = query(collection(db, 'tracking_events'), where('packageId', '==', packageId), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as TrackingEvent);
    } catch (error) {
      console.error("Error fetching history:", error);
      return [];
    }
  }

  // --- Users ---

  async getAgents(): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), where('role', '!=', 'CUSTOMER'));
      const snapshot = await getDocs(q);
      // Firestore '!=' query sometimes requires index or specific handling, fallback to client filter if needed
      // But let's assume it works or we filter client side
      const users = snapshot.docs.map(doc => doc.data() as User);
      return users.filter(u => u.role !== 'ADMIN'); 
    } catch (error) {
      console.error("Error fetching agents:", error);
      return [];
    }
  }

  async addAgent(agent: User): Promise<void> {
    try {
      await setDoc(doc(db, 'users', agent.uid), agent);
      await this.logAction({
        action: 'AGENT_CREATED',
        userId: 'admin',
        userName: 'Admin',
        details: `New agent ${agent.displayName} added.`,
        severity: 'INFO'
      });
    } catch (error) {
      console.error("Error adding agent:", error);
      throw error;
    }
  }

  async getPackagesByRole(role: UserRole): Promise<Package[]> {
    // Query the top-level packages collection
    const chinaStatuses = [
        PackageStatus.PURCHASED_FROM_SELLER,
        PackageStatus.IN_TRANSIT_TO_CHINA_AGENT,
        PackageStatus.RECEIVED_IN_CHINA,
        PackageStatus.QC_CHECKED,
        PackageStatus.PACKED_CHINA,
        PackageStatus.READY_TO_SHIP_UAE
    ];
    // ... define others ...
    const uaeStatuses = [
        PackageStatus.SHIPPED_TO_UAE,
        PackageStatus.ARRIVED_UAE,
        PackageStatus.REPACKING,
        PackageStatus.READY_TO_SHIP_IRAN
    ];
    const iranStatuses = [
        PackageStatus.SHIPPED_TO_IRAN,
        PackageStatus.ARRIVED_IRAN,
        PackageStatus.OUT_FOR_DELIVERY
    ];

    let targetStatuses: PackageStatus[] = [];
    if (role === UserRole.CHINA_AGENT) targetStatuses = chinaStatuses;
    if (role === UserRole.UAE_AGENT) targetStatuses = uaeStatuses;
    if (role === UserRole.IRAN_AGENT) targetStatuses = iranStatuses;

    if (targetStatuses.length === 0) return [];

    try {
      // Firestore 'in' query supports up to 10 values
      const q = query(collection(db, 'packages'), where('currentStatus', 'in', targetStatuses));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Package);
    } catch (error) {
      console.error("Error fetching workload:", error);
      return [];
    }
  }

  // --- Audit ---

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as AuditLog);
    } catch (error) {
      console.error("Error fetching logs:", error);
      return [];
    }
  }

  async logAction(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...log,
        id: uuidv4(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  }

  async getSystemStats() {
    // This is expensive in Firestore (reading all docs). 
    // For a real app, use distributed counters or aggregation queries.
    // For this demo, we'll fetch all orders (careful with cost!).
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const orders = ordersSnap.docs.map(d => d.data() as Order);

      const totalOrders = orders.length;
      const totalPackages = orders.reduce((acc, o) => acc + o.packages.length, 0);
      const totalRevenue = orders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
      
      const statusCounts: Record<string, number> = {};
      orders.forEach(o => {
          o.packages.forEach(p => {
              statusCounts[p.currentStatus] = (statusCounts[p.currentStatus] || 0) + 1;
          });
      });

      return { totalOrders, totalPackages, totalRevenue, statusCounts };
    } catch (error) {
      console.error("Error stats:", error);
      return { totalOrders: 0, totalPackages: 0, totalRevenue: 0, statusCounts: {} };
    }
  }

  // --- Customers with Orders ---
  async getCustomersWithOrders(): Promise<Array<{
    customerId: string;
    customerName: string;
    customerPhone?: string;
    shippingAddress?: string;
    totalOrders: number;
    lastOrderDate: number;
    lastOrderId: string;
    deliveredOrders: number;
    pendingOrders: number;
    orders: Order[];
  }>> {
    try {
      // Get all orders from Firebase
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const orders = ordersSnap.docs.map(d => d.data() as Order);

      // Get all customers from Firebase
      const customersSnap = await getDocs(collection(db, 'users'));
      const allUsers = customersSnap.docs.map(d => d.data() as User);
      const customerUsers = allUsers.filter(u => u.role === UserRole.CUSTOMER);
      
      // Create a map of customerId -> User for quick lookup
      const customerUserMap = new Map<string, User>();
      customerUsers.forEach(user => {
        customerUserMap.set(user.uid, user);
      });

      // Group orders by customerId
      const customerMap = new Map<string, Order[]>();
      orders.forEach(order => {
        const existing = customerMap.get(order.customerId) || [];
        existing.push(order);
        customerMap.set(order.customerId, existing);
      });

      // Transform to customer summary array
      const customers = Array.from(customerMap.entries()).map(([customerId, customerOrders]) => {
        // Sort orders by date (newest first)
        const sortedOrders = customerOrders.sort((a, b) => b.createdAt - a.createdAt);
        const lastOrder = sortedOrders[0];

        // Get customer info from users collection if available, otherwise use order data
        const customerUser = customerUserMap.get(customerId);
        const customerName = customerUser?.displayName || lastOrder.customerName;
        const customerPhone = customerUser?.phoneNumber || lastOrder.customerPhone;
        const shippingAddress = customerUser?.address || lastOrder.shippingAddress;

        // Count delivered vs pending orders
        // An order is considered delivered if all packages are DELIVERED
        const deliveredOrders = customerOrders.filter(order => {
          return order.packages.length > 0 && 
                 order.packages.every(pkg => pkg.currentStatus === PackageStatus.DELIVERED);
        }).length;

        const pendingOrders = customerOrders.length - deliveredOrders;

        return {
          customerId,
          customerName,
          customerPhone,
          shippingAddress,
          totalOrders: customerOrders.length,
          lastOrderDate: lastOrder.createdAt,
          lastOrderId: lastOrder.id,
          deliveredOrders,
          pendingOrders,
          orders: sortedOrders
        };
      });

      // Sort by last order date (newest first)
      return customers.sort((a, b) => b.lastOrderDate - a.lastOrderDate);
    } catch (error) {
      console.error("Error fetching customers with orders:", error);
      return [];
    }
  }

  // --- Customer Management ---
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const snapshot = await getDocs(collection(db, 'customers'));
      return snapshot.docs.map(doc => doc.data() as Customer);
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  }

  async getCustomerById(customerId: string): Promise<Customer | undefined> {
    try {
      const docRef = doc(db, 'customers', customerId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Customer;
      }
      return undefined;
    } catch (error) {
      console.error("Error fetching customer:", error);
      return undefined;
    }
  }

  async createCustomer(customer: Customer): Promise<void> {
    try {
      await setDoc(doc(db, 'customers', customer.id), customer);
      await this.logAction({
        action: 'ORDER_CREATED',
        userId: 'admin',
        userName: 'Admin',
        details: `New customer ${customer.name} created.`,
        severity: 'INFO'
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async updateCustomerInfo(customerId: string, updates: { displayName?: string; phoneNumber?: string; address?: string }): Promise<void> {
    try {
      // Update customer in customers collection
      const customerRef = doc(db, 'customers', customerId);
      const customerUpdates: any = {};
      if (updates.displayName) customerUpdates.name = updates.displayName;
      if (updates.phoneNumber) customerUpdates.phone = updates.phoneNumber;
      if (updates.address) customerUpdates.address = updates.address;
      
      await updateDoc(customerRef, customerUpdates);
      
      // Also update denormalized data in orders
      const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', customerId));
      const ordersSnap = await getDocs(ordersQuery);
      
      const batch = writeBatch(db);
      ordersSnap.docs.forEach(orderDoc => {
        const orderRef = doc(db, 'orders', orderDoc.id);
        const updateData: any = {};
        if (updates.displayName) updateData.customerName = updates.displayName;
        if (updates.phoneNumber) updateData.customerPhone = updates.phoneNumber;
        if (updates.address) updateData.shippingAddress = updates.address;
        batch.update(orderRef, updateData);
      });
      
      await batch.commit();
      
      await this.logAction({
        action: 'CUSTOMER_UPDATED',
        userId: customerId,
        userName: updates.displayName || 'Customer',
        details: `Customer information updated.`,
        severity: 'INFO'
      });
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }

  // --- SEEDING UTILITY ---
  async seedDatabase() {
    const batch = writeBatch(db);

    // Seed Users
    MOCK_USERS.forEach(user => {
      const ref = doc(db, 'users', user.uid);
      batch.set(ref, user);
    });

    // Seed Orders & Packages
    MOCK_ORDERS.forEach(order => {
      const orderRef = doc(db, 'orders', order.id);
      batch.set(orderRef, order);

      // Also create standalone package docs
      order.packages.forEach(pkg => {
        const pkgRef = doc(db, 'packages', pkg.id);
        batch.set(pkgRef, pkg);
      });
    });

    await batch.commit();
    console.log("Database seeded successfully!");
    alert("Database seeded! Refresh the page.");
  }
}

export const dataService = new DataService();

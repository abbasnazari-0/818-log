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
      await Promise.all(
        order.packages.map(pkg => setDoc(doc(db, 'packages', pkg.id), pkg))
      );
      
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

  async updateOrder(order: Order): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Update the main order document
      const orderRef = doc(db, 'orders', order.id);
      batch.set(orderRef, order);
      
      // Update all packages in the standalone packages collection
      order.packages.forEach(pkg => {
        const pkgRef = doc(db, 'packages', pkg.id);
        batch.set(pkgRef, pkg);
      });
      
      await batch.commit();
      
      await this.logAction({
        action: 'ORDER_UPDATED',
        userId: 'admin',
        userName: 'Admin',
        details: `Order ${order.id} was updated.`,
        severity: 'INFO'
      });
    } catch (error) {
      console.error("Error updating order:", error);
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

  async getPackagesByOrderId(orderId: string): Promise<Package[]> {
    try {
      const q = query(
        collection(db, 'packages'),
        where('orderId', '==', orderId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Package);
    } catch (error) {
      console.error("Error fetching packages by order ID:", error);
      return [];
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
    console.log('🔥 updatePackageStatus called:', { packageId, newStatus, userId, notes, location });
    try {
      // 1. Get or create the standalone package document
      const pkgRef = doc(db, 'packages', packageId);
      console.log('📦 Getting package from collection...');
      const pkgSnap = await getDoc(pkgRef);
      console.log('📦 Package exists:', pkgSnap.exists());
      
      let currentPkg: Package;
      let orderId: string;
      
      if (!pkgSnap.exists()) {
        // Package not in collection, find it in orders and create it
        console.log('Package not found in collection, searching in orders...');
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        let foundPackage: Package | undefined;
        let foundOrderId: string | undefined;
        
        for (const orderDoc of ordersSnapshot.docs) {
          const order = orderDoc.data() as Order;
          const pkg = order.packages.find(p => p.id === packageId);
          if (pkg) {
            foundPackage = pkg;
            foundOrderId = order.id;
            break;
          }
        }
        
        if (!foundPackage || !foundOrderId) {
          throw new Error("Package not found in any order");
        }
        
        // Create the package in packages collection with orderId
        currentPkg = { ...foundPackage, orderId: foundOrderId };
        orderId = foundOrderId;
        console.log('Creating package in collection with orderId:', orderId);
        await setDoc(pkgRef, currentPkg);
      } else {
        currentPkg = pkgSnap.data() as Package;
        orderId = currentPkg.orderId;
        console.log('Package orderId from collection:', orderId);
        
        // If orderId is missing, try to find it
        if (!orderId) {
          console.warn('⚠️ Package missing orderId, searching in orders...');
          const ordersSnapshot = await getDocs(collection(db, 'orders'));
          for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data() as Order;
            const pkg = order.packages.find(p => p.id === packageId);
            if (pkg) {
              orderId = order.id;
              console.log('Found orderId:', orderId);
              // Update package with orderId
              await updateDoc(pkgRef, { orderId });
              break;
            }
          }
          
          if (!orderId) {
            throw new Error("Cannot find orderId for package");
          }
        }
      }

      // Update the package
      await updateDoc(pkgRef, {
        currentStatus: newStatus,
        ...additionalData
      });

      // 2. Update the package inside the Order document (to keep them in sync)
      // This requires reading the order, finding the package, and updating the array.
      console.log('Updating order:', orderId, 'for package:', packageId);
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        console.log('Order found, updating packages array...');
        const orderData = orderSnap.data() as Order;
        const updatedPackages = orderData.packages.map(p => 
          p.id === packageId ? { ...p, currentStatus: newStatus, ...additionalData } : p
        );
        
        console.log('Updated packages:', updatedPackages.map(p => ({ id: p.id, status: p.currentStatus })));
        
        // Determine the overall order status based on all packages
        let overallStatus = newStatus;
        
        // If multiple packages, use the "least advanced" status
        if (updatedPackages && updatedPackages.length > 1) {
          // Find the package with the earliest status in the workflow
          const allStatuses = updatedPackages.map(p => p?.currentStatus).filter(Boolean);
          const statusOrder = Object.values(PackageStatus);
          
          // Get the minimum status index (earliest in the workflow)
          if (allStatuses.length > 0 && statusOrder && statusOrder.length > 0) {
            let minIndex = statusOrder.length;
            for (const status of allStatuses) {
              if (status) {
                const idx = statusOrder.indexOf(status);
                if (idx !== -1 && idx < minIndex) {
                  minIndex = idx;
                  overallStatus = status;
                }
              }
            }
          }
        }
        
        // Update both packages array and overall order status
        console.log('Updating order document with new status:', overallStatus);
        await updateDoc(orderRef, { 
          packages: updatedPackages,
          status: overallStatus
        });
        console.log('Order updated successfully!');
      } else {
        console.error('Order not found in database:', orderId);
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

  async updatePackageInternalTrackingCode(packageId: string, internalTrackingCode: string, userId: string, userName: string): Promise<void> {
    try {
      console.log('Starting updatePackageInternalTrackingCode:', { packageId, internalTrackingCode, userId, userName });
      
      // Find the order that contains this package
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      let foundOrder: any = null;
      let foundPackage: any = null;

      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data() as Order;
        const pkg = orderData.packages.find(p => p.id === packageId);
        if (pkg) {
          foundOrder = orderData;
          foundPackage = pkg;
          break;
        }
      }

      if (!foundOrder || !foundPackage) {
        console.error("Package not found in any order:", packageId);
        throw new Error("بسته پیدا نشد");
      }

      console.log('Found package in order:', foundOrder.id);

      // Update the package inside the Order document
      const orderRef = doc(db, 'orders', foundOrder.id);
      const updatedPackages = foundOrder.packages.map((p: Package) => 
        p.id === packageId ? { ...p, internalTrackingCode } : p
      );
      
      await updateDoc(orderRef, { packages: updatedPackages });
      console.log('Updated order doc successfully');

      // Also update standalone package doc if it exists
      const pkgRef = doc(db, 'packages', packageId);
      const pkgSnap = await getDoc(pkgRef);
      if (pkgSnap.exists()) {
        await updateDoc(pkgRef, { internalTrackingCode });
        console.log('Updated standalone package doc successfully');
      } else {
        // Create standalone package doc if it doesn't exist
        await setDoc(pkgRef, { ...foundPackage, internalTrackingCode });
        console.log('Created standalone package doc successfully');
      }

      // Audit Log
      await this.logAction({
        action: 'TRACKING_CODE_UPDATE',
        userId: userId,
        userName: userName,
        details: `Internal tracking code updated for package ${packageId}: ${internalTrackingCode}`,
        severity: 'INFO'
      });
      console.log('Audit log created successfully');

    } catch (error: any) {
      console.error("Error updating internal tracking code:", error);
      console.error("Error details:", error?.code, error?.message);
      throw error;
    }
  }

  async updatePackageInternalOrderId(packageId: string, internalOrderId: string, userId: string, userName: string): Promise<void> {
    try {
      console.log('Starting updatePackageInternalOrderId:', { packageId, internalOrderId, userId, userName });
      
      // Find the order that contains this package
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      let foundOrder: any = null;
      let foundPackage: any = null;

      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data() as Order;
        const pkg = orderData.packages.find(p => p.id === packageId);
        if (pkg) {
          foundOrder = orderData;
          foundPackage = pkg;
          break;
        }
      }

      if (!foundOrder || !foundPackage) {
        console.error("Package not found in any order:", packageId);
        throw new Error("بسته پیدا نشد");
      }

      console.log('Found package in order:', foundOrder.id);

      // Update the package inside the Order document
      const orderRef = doc(db, 'orders', foundOrder.id);
      const updatedPackages = foundOrder.packages.map((p: Package) => 
        p.id === packageId ? { ...p, internalOrderId } : p
      );
      
      await updateDoc(orderRef, { packages: updatedPackages });
      console.log('Updated order doc successfully');

      // Also update standalone package doc if it exists
      const pkgRef = doc(db, 'packages', packageId);
      const pkgSnap = await getDoc(pkgRef);
      if (pkgSnap.exists()) {
        await updateDoc(pkgRef, { internalOrderId });
        console.log('Updated standalone package doc successfully');
      } else {
        // Create standalone package doc if it doesn't exist
        await setDoc(pkgRef, { ...foundPackage, internalOrderId });
        console.log('Created standalone package doc successfully');
      }

      // Audit Log
      await this.logAction({
        action: 'ORDER_ID_UPDATE',
        userId: userId,
        userName: userName,
        details: `Internal order ID updated for package ${packageId}: ${internalOrderId}`,
        severity: 'INFO'
      });
      console.log('Audit log created successfully');

    } catch (error: any) {
      console.error("Error updating internal order ID:", error);
      console.error("Error details:", error?.code, error?.message);
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
    address?: string;
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

      // Group orders by customerId or normalized name/phone
      const customerMap = new Map<string, Order[]>();
      orders.forEach(order => {
        let key = order.customerId;
        
        // Check if this is a "real" customerId (not undefined/null string)
        // We assume UIDs are longer than 5 chars usually, but let's just check for 'undefined' string which is common in bad data
        const isValidId = key && key !== 'undefined' && key !== 'null' && key.length > 5;
        
        if (!isValidId) {
            // Fallback to name + phone to group guest orders
            // Normalize to handle slight variations
            const name = (order.customerName || '').trim().toLowerCase()
              .replace(/\s+/g, ' ')
              .replace(/ي/g, 'ی')
              .replace(/ك/g, 'ک');
            const phone = (order.customerPhone || '').trim().replace(/\s/g, '');
            
            // If both are empty, dump in "Unknown" bucket
            if (!name && !phone) {
              key = 'unknown_guest';
            } else {
              key = `guest_${name}_${phone}`;
            }
        }
        
        const existing = customerMap.get(key) || [];
        existing.push(order);
        customerMap.set(key, existing);
      });

      // Transform to customer summary array
      const customers = Array.from(customerMap.entries()).map(([customerKey, customerOrders]) => {
        // Sort orders by date (newest first)
        const sortedOrders = customerOrders.sort((a, b) => b.createdAt - a.createdAt);
        const lastOrder = sortedOrders[0];

        // Get customer info from users collection if available, otherwise use order data
        // If grouped by ID, use that ID to lookup. If grouped by guest key, lookup might fail which is expected.
        const lookupId = (customerKey.startsWith('guest_') || customerKey === 'unknown_guest') ? lastOrder.customerId : customerKey;
        const customerUser = customerUserMap.get(lookupId);
        
        const customerName = customerUser?.displayName || lastOrder.customerName || 'مشتری ناشناس';
        const customerPhone = customerUser?.phoneNumber || lastOrder.customerPhone;
        const address = customerUser?.address || lastOrder.address;

        // Count delivered vs pending orders
        // An order is considered delivered if all packages are DELIVERED
        const deliveredOrders = customerOrders.filter(order => {
          return order.packages.length > 0 && 
                 order.packages.every(pkg => pkg.currentStatus === PackageStatus.DELIVERED);
        }).length;

        const pendingOrders = customerOrders.length - deliveredOrders;

        // Ensure we have a stable unique ID
        const finalCustomerId = (lookupId && lookupId !== 'undefined' && lookupId !== 'null') ? lookupId : customerKey;

        return {
          customerId: finalCustomerId,
          customerName,
          customerPhone,
          address,
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
        if (updates.address) updateData.address = updates.address;
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

  // --- Get Unpurchased Orders ---
  async getUnpurchasedOrders(startDate?: number, endDate?: number): Promise<Order[]> {
    try {
      let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      const allOrders = snapshot.docs.map(doc => doc.data() as Order);
      
      // Filter orders that have at least one package without internalTrackingCode
      const unpurchasedOrders = allOrders.filter(order => {
        // Check if order has any package without internalTrackingCode
        const hasUnpurchasedPackage = order.packages.some(pkg => !pkg.internalTrackingCode);
        
        // Apply date filter if provided
        if (startDate && order.createdAt < startDate) return false;
        if (endDate && order.createdAt > endDate) return false;
        
        return hasUnpurchasedPackage;
      });
      
      return unpurchasedOrders;
    } catch (error) {
      console.error("Error fetching unpurchased orders:", error);
      return [];
    }
  }

  // Count unpurchased orders for current month
  async getUnpurchasedOrdersCount(startDate?: number, endDate?: number): Promise<{ total: number, thisMonth: number }> {
    try {
      const unpurchasedOrders = await this.getUnpurchasedOrders(startDate, endDate);
      
      // Calculate current Persian month boundaries
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
        year: 'numeric',
        month: 'numeric',
      });
      const parts = formatter.format(now).split('/');
      const currentYear = parseInt(parts[0]);
      const currentMonth = parseInt(parts[1]);
      
      // Filter for this month
      const thisMonthOrders = unpurchasedOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const orderFormatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
          year: 'numeric',
          month: 'numeric',
        });
        const orderParts = orderFormatter.format(orderDate).split('/');
        const orderYear = parseInt(orderParts[0]);
        const orderMonth = parseInt(orderParts[1]);
        
        return orderYear === currentYear && orderMonth === currentMonth;
      });
      
      return {
        total: unpurchasedOrders.length,
        thisMonth: thisMonthOrders.length
      };
    } catch (error) {
      console.error("Error counting unpurchased orders:", error);
      return { total: 0, thisMonth: 0 };
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

  // Sync existing order packages to standalone packages collection
  async syncPackagesToCollection() {
    try {
      console.log("Starting package sync...");
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const batch = writeBatch(db);
      let syncCount = 0;

      ordersSnapshot.docs.forEach(orderDoc => {
        const orderData = orderDoc.data() as Order;
        if (orderData.packages && orderData.packages.length > 0) {
          orderData.packages.forEach(pkg => {
            const pkgRef = doc(db, 'packages', pkg.id);
            batch.set(pkgRef, pkg, { merge: true });
            syncCount++;
          });
        }
      });

      await batch.commit();
      console.log(`Synced ${syncCount} packages successfully!`);
      alert(`همگام‌سازی انجام شد! ${syncCount} بسته به collection اضافه شد.`);
    } catch (error) {
      console.error("Error syncing packages:", error);
      alert("خطا در همگام‌سازی. Console را چک کنید.");
    }
  }
}

export const dataService = new DataService();

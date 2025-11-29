
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { MOCK_USERS } from '../services/mockData';
import { Order, PackageStatus, UserRole, Package, Customer } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Filter, Download, Eye, Plus, X, Trash2, ExternalLink, UserPlus, Phone, MapPin, DollarSign, PackageCheck, Plane, Truck, CheckCircle, Camera } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';

// Status Groups for Filtering
const STATUS_FILTERS = [
  { id: 'ALL', label: 'همه سفارش‌ها', icon: null },
  { id: 'CHINA', label: 'در چین', icon: PackageCheck },
  { id: 'UAE', label: 'در امارات', icon: Plane },
  { id: 'IRAN', label: 'در ایران', icon: Truck },
  { id: 'DONE', label: 'تحویل شده', icon: CheckCircle },
];

export const OrderList: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Customer Management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const [newOrderSource, setNewOrderSource] = useState('1688');
  const [orderItems, setOrderItems] = useState<{ link: string; description: string; price: string; currency: string; qty: number }[]>([
    { link: '', description: '', price: '', currency: 'AED', qty: 1 }
  ]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('AED');
  const [exchangeRate, setExchangeRate] = useState(31420); // Default AED to IRR rate
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // Internal Tracking Code Management
  const [editingTrackingCode, setEditingTrackingCode] = useState<{ packageId: string; code: string } | null>(null);
  
  // Payment Management
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string>('');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentCurrency, setNewPaymentCurrency] = useState('AED');

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchExchangeRate();
  }, [user]);

  const fetchOrders = () => {
    if (user) {
      dataService.getOrders(user.role, user.uid).then(data => {
        setOrders(data);
        setFilteredOrders(data);
      });
    }
  };

  const fetchCustomers = async () => {
    const data = await dataService.getAllCustomers();
    setCustomers(data);
  };

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://n8n.azool.ae/webhook/currency/last?fc=IRR');
      const data = await response.json();
      const aedRate = data.find((currency: any) => currency.symbol === 'AED');
      if (aedRate) {
        setExchangeRate(parseFloat(aedRate.avg_rate));
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Keep default rate if fetch fails
    }
  };

  // Filter Logic
  useEffect(() => {
    let result = orders;

    // 1. Status Filter
    if (activeFilter !== 'ALL') {
      result = result.filter(o => {
        const s = o.status;
        if (activeFilter === 'CHINA') {
          return [
            PackageStatus.PURCHASED_FROM_SELLER,
            PackageStatus.IN_TRANSIT_TO_CHINA_AGENT,
            PackageStatus.RECEIVED_IN_CHINA,
            PackageStatus.QC_CHECKED,
            PackageStatus.PACKED_CHINA,
            PackageStatus.READY_TO_SHIP_UAE
          ].includes(s);
        }
        if (activeFilter === 'UAE') {
          return [
            PackageStatus.SHIPPED_TO_UAE,
            PackageStatus.ARRIVED_UAE,
            PackageStatus.REPACKING,
            PackageStatus.READY_TO_SHIP_IRAN
          ].includes(s);
        }
        if (activeFilter === 'IRAN') {
          return [
            PackageStatus.SHIPPED_TO_IRAN,
            PackageStatus.ARRIVED_IRAN,
            PackageStatus.OUT_FOR_DELIVERY
          ].includes(s);
        }
        if (activeFilter === 'DONE') {
          return s === PackageStatus.DELIVERED;
        }
        return true;
      });
    }

    // 2. Search Term Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(lowerTerm) ||
        o.customerName.toLowerCase().includes(lowerTerm) ||
        o.source.toLowerCase().includes(lowerTerm)
      );
    }

    setFilteredOrders(result);
  }, [searchTerm, orders, activeFilter]);

  // --- Create Order Logic ---

  const handleAddItem = () => {
    setOrderItems([...orderItems, { link: '', description: '', price: '', currency: 'AED', qty: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof typeof orderItems[0], value: string) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((acc, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = Number(item.qty) || 1;
      // Convert to AED if item is in IRR using live exchange rate
      const priceInAED = item.currency === 'IRR' ? price / exchangeRate : price;
      return acc + priceInAED * qty;
    }, 0);
  };

  const calculateBalance = () => {
    const total = calculateTotal();
    const paidAmount = parseFloat(amountPaid) || 0;
    const paidInAED = paymentCurrency === 'IRR' ? paidAmount / exchangeRate : paidAmount;
    return Math.max(0, total - paidInAED);
  };

  const handleCreateOrder = async () => {
    if (!isNewCustomer && !selectedCustomerId) return alert('لطفاً یک مشتری انتخاب کنید یا مشتری جدید اضافه کنید');
    if (isNewCustomer && !newCustomerName) return alert('لطفاً نام مشتری را وارد کنید');
    if (orderItems.length === 0 || !orderItems[0].description) return alert('لطفاً حداقل یک محصول اضافه کنید');

    setIsCreatingOrder(true);
    
    try {
      // 1. Handle Customer Creation/Selection
    let customerId = selectedCustomerId;
    let customerName = '';
    let customerPhone = '';
    let shippingAddress = '';

    if (isNewCustomer) {
      // Create new customer
      customerId = `CUST-${Date.now()}`;
      const newCustomer: Customer = {
        id: customerId,
        name: newCustomerName,
        phone: newCustomerPhone,
        address: newCustomerAddress,
        email: newCustomerEmail,
        createdAt: Date.now(),
        totalOrders: 0
      };
      await dataService.createCustomer(newCustomer);
      customerName = newCustomerName;
      customerPhone = newCustomerPhone;
      shippingAddress = newCustomerAddress;
      
      // Refresh customer list
      await fetchCustomers();
    } else {
      // Use existing customer
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone;
        shippingAddress = customer.address;
      }
    }

    // 2. Generate Order ID
    const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Create Packages
    const packages: Package[] = orderItems.map((item, index) => {
      const pkgId = `PKG-${Math.floor(10000 + Math.random() * 90000)}`;
      return {
        id: pkgId,
        orderId: orderId,
        subOrderId: `SUB-${index + 1}`,
        currentStatus: PackageStatus.PURCHASED_FROM_SELLER,
        trackingNumber: 'PENDING',
        description: item.description,
        qrCodeData: pkgId,
        productLink: item.link,
        price: parseFloat(item.price) || 0,
      };
    });

    const totalPrice = calculateTotal(); // Already in AED
    const paidAmount = parseFloat(amountPaid) || 0;
    const paidInAED = paymentCurrency === 'IRR' ? paidAmount / exchangeRate : paidAmount;

    // 3. Construct Order
    const newOrder: Order = {
      id: orderId,
      customerId: customerId,
      customerName: customerName,
      customerPhone: customerPhone,
      shippingAddress: shippingAddress,
      source: newOrderSource as any,
      createdAt: Date.now(),
      totalItems: packages.length,
      packages: packages,
      status: PackageStatus.PURCHASED_FROM_SELLER,
      totalPrice: totalPrice,
      amountPaid: paidInAED,
      balanceDue: Math.max(0, totalPrice - paidInAED)
    };

      // 4. Save
      await dataService.createOrder(newOrder);

      // 5. Cleanup
      setIsModalOpen(false);
      setSelectedCustomerId('');
      setIsNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCustomerEmail('');
      setOrderItems([{ link: '', description: '', price: '', currency: 'AED', qty: 1 }]);
      setAmountPaid('');
      fetchOrders(); // Refresh list
      alert(`سفارش ${orderId} با موفقیت ایجاد شد!`);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('خطا در ایجاد سفارش. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `آیا مطمئن هستید که می‌خواهید سفارش ${orderId} را حذف کنید؟\n\nاین عمل سفارش و تمام بسته‌های آن را به طور دائمی حذف می‌کند. این کار قابل بازگشت نیست.`
    );

    if (!confirmed) return;

    try {
      await dataService.deleteOrder(orderId, user?.uid || 'unknown');
      fetchOrders(); // Refresh the list
      setSelectedOrder(null); // Close details if open
      alert(`Order ${orderId} has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  const handleUpdateInternalTrackingCode = async (packageId: string, code: string) => {
    try {
      await dataService.updatePackageInternalTrackingCode(packageId, code);
      setEditingTrackingCode(null);
      fetchOrders(); // Refresh the list
      alert('کد رهگیری داخلی با موفقیت ثبت شد!');
    } catch (error) {
      console.error('Error updating internal tracking code:', error);
      alert('خطا در ثبت کد رهگیری. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleAddPayment = async () => {
    if (!newPaymentAmount || parseFloat(newPaymentAmount) <= 0) {
      alert('لطفاً مبلغ معتبر وارد کنید.');
      return;
    }

    const order = orders.find(o => o.id === paymentOrderId);
    if (!order) return;

    try {
      const paymentAmountInAED = newPaymentCurrency === 'IRR' 
        ? parseFloat(newPaymentAmount) / exchangeRate 
        : parseFloat(newPaymentAmount);

      const updatedAmountPaid = (order.amountPaid || 0) + paymentAmountInAED;
      const updatedBalanceDue = Math.max(0, (order.totalPrice || 0) - updatedAmountPaid);

      await dataService.updateOrderPayment(paymentOrderId, updatedAmountPaid, updatedBalanceDue);
      
      setPaymentModalOpen(false);
      setNewPaymentAmount('');
      setPaymentOrderId('');
      fetchOrders();
      alert('پرداخت با موفقیت ثبت شد!');
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('خطا در ثبت پرداخت. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleSettleFull = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const confirmed = window.confirm(
      `آیا مطمئن هستید که می‌خواهید حساب این سفارش را تسویه کنید؟\n\nمبلغ باقی‌مانده: ${((order.balanceDue || 0) * exchangeRate).toLocaleString('fa-IR')} تومان`
    );

    if (!confirmed) return;

    try {
      const updatedAmountPaid = order.totalPrice || 0;
      const updatedBalanceDue = 0;

      await dataService.updateOrderPayment(orderId, updatedAmountPaid, updatedBalanceDue);
      fetchOrders();
      alert('حساب با موفقیت تسویه شد!');
    } catch (error) {
      console.error('Error settling payment:', error);
      alert('خطا در تسویه حساب. لطفاً دوباره تلاش کنید.');
    }
  };

  // Get list of existing customers
  const customerList = MOCK_USERS.filter(u => u.role === UserRole.CUSTOMER);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row-reverse justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 text-right">همه سفارش‌ها</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium flex-row-reverse">
            <span>خروجی</span>
            <Download size={16} />
          </button>
          {user?.role === UserRole.ADMIN || user?.role === UserRole.CHINA_AGENT ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm transition-all flex-row-reverse"
            >
              <span>ایجاد سفارش جدید</span>
              <Plus size={18} />
            </button>
          ) : null}
        </div>
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        {STATUS_FILTERS.map(filter => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border
                ${isActive
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }
              `}
            >
              {Icon && <Icon size={16} className={isActive ? 'text-blue-300' : 'text-slate-400'} />}
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="text-sm text-slate-500 font-medium">
            نمایش {filteredOrders.length} سفارش
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="جستجو بر اساس شناسه سفارش، مشتری یا منبع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4 text-right">عملیات</th>
                <th className="px-6 py-4 text-right">وضعیت</th>
                <th className="px-6 py-4 text-right">تاریخ</th>
                {user?.role === UserRole.ADMIN && <th className="px-6 py-4 text-right">مالی</th>}
                <th className="px-6 py-4 text-right">مشتری</th>
                <th className="px-6 py-4 text-right">جزئیات سفارش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(user?.role === 'ADMIN' || user?.role === 'CHINA_AGENT') && (
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف سفارش"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // Navigate to ScanQR with the first package ID
                              const firstPackageId = order.packages[0]?.id;
                              if (firstPackageId) {
                                window.location.href = `/scan?code=${firstPackageId}`;
                              }
                            }}
                            className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="اسکن و تغییر وضعیت"
                          >
                            <Camera size={18} />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="مشاهده جزئیات"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      {user?.role === UserRole.ADMIN && (
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">
                            {((order.totalPrice || 0) * exchangeRate).toLocaleString('fa-IR')} تومان
                          </div>
                          <div className="text-xs text-slate-400">
                            {(order.totalPrice || 0).toFixed(2)} درهم
                          </div>
                          {(order.balanceDue || 0) > 0 ? (
                            <div className="text-xs font-semibold text-red-600 mt-0.5">
                              بدهی: {((order.balanceDue || 0) * exchangeRate).toLocaleString('fa-IR')} تومان
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-green-600 mt-0.5">
                              پرداخت کامل
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-slate-600">
                        <div>{order.customerName}</div>
                        {order.customerPhone && <div className="text-xs text-slate-400 mt-0.5">{order.customerPhone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{order.id}</div>
                        <div className="text-slate-500 text-xs mt-1">منبع: {order.source}</div>
                      </td>
                    </tr>
                    {/* Expanded Detail View */}
                    {selectedOrder?.id === order.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={6} className="px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="md:col-span-2">
                              <div className="bg-white p-4 rounded-lg border border-slate-200 h-full">
                                <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                                  <MapPin size={14} className="text-blue-500" /> Shipping & Payment
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-slate-500">Address</p>
                                    <p className="text-sm text-slate-700 font-medium">{order.shippingAddress || 'No address provided'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Contact</p>
                                    <p className="text-sm text-slate-700 font-medium">{order.customerPhone || 'No phone provided'}</p>
                                  </div>
                                </div>
                                {user?.role === UserRole.ADMIN && (
                                  <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-xs text-slate-500">پرداخت شده</p>
                                        <p className="text-sm text-green-600 font-bold">
                                          {((order.amountPaid || 0) * exchangeRate).toLocaleString('fa-IR')} تومان
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          {(order.amountPaid || 0).toFixed(2)} درهم
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500">باقی‌مانده</p>
                                        <p className="text-sm text-red-600 font-bold">
                                          {((order.balanceDue || 0) * exchangeRate).toLocaleString('fa-IR')} تومان
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          {(order.balanceDue || 0).toFixed(2)} درهم
                                        </p>
                                      </div>
                                    </div>
                                    {(order.balanceDue || 0) > 0 && (
                                      <div className="mt-3 flex gap-2">
                                        <button
                                          onClick={() => {
                                            setPaymentOrderId(order.id);
                                            setPaymentModalOpen(true);
                                          }}
                                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                        >
                                          <DollarSign size={14} className="inline ml-1" />
                                          پرداخت بعدی
                                        </button>
                                        <button
                                          onClick={() => handleSettleFull(order.id)}
                                          className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
                                        >
                                          <CheckCircle size={14} className="inline ml-1" />
                                          تسویه کامل
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-end justify-end">
                              <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase">Total Items</p>
                                <p className="text-xl font-bold text-slate-800">{order.totalItems}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-sm">Packages in this Order</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {order.packages.map(pkg => (
                                <div key={pkg.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex gap-4">
                                  <div className="bg-white p-2 border border-slate-100 rounded h-min">
                                    <QRCodeCanvas value={pkg.qrCodeData} size={64} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-sm truncate">{pkg.description}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-1">{pkg.id}</div>
                                    {pkg.productLink && (
                                      <a href={pkg.productLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 mt-1 hover:underline">
                                        <ExternalLink size={10} /> Product Link
                                      </a>
                                    )}
                                    
                                    {/* Internal Tracking Code - Admin Only */}
                                    {user?.role === UserRole.ADMIN && (
                                      <div className="mt-2 mb-2">
                                        {editingTrackingCode?.packageId === pkg.id ? (
                                          <div className="flex gap-1">
                                            <input
                                              type="text"
                                              value={editingTrackingCode.code}
                                              onChange={(e) => setEditingTrackingCode({ packageId: pkg.id, code: e.target.value })}
                                              placeholder="کد رهگیری داخلی..."
                                              className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleUpdateInternalTrackingCode(pkg.id, editingTrackingCode.code)}
                                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                              ✓
                                            </button>
                                            <button
                                              onClick={() => setEditingTrackingCode(null)}
                                              className="px-2 py-1 bg-slate-300 text-slate-700 text-xs rounded hover:bg-slate-400"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : pkg.internalTrackingCode ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 font-mono">
                                              کد رهگیری: {pkg.internalTrackingCode}
                                            </span>
                                            <button
                                              onClick={() => setEditingTrackingCode({ packageId: pkg.id, code: pkg.internalTrackingCode || '' })}
                                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              ویرایش
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setEditingTrackingCode({ packageId: pkg.id, code: '' })}
                                            className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                                          >
                                            + افزودن کد رهگیری داخلی
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="mt-2 flex justify-between items-end">
                                      <StatusBadge status={pkg.currentStatus} />
                                      {pkg.price && user?.role === UserRole.ADMIN && (
                                        <div className="text-right">
                                          <div className="text-sm font-bold text-slate-700">
                                            {(pkg.price * exchangeRate).toLocaleString('fa-IR')} تومان
                                          </div>
                                          <div className="text-xs text-slate-400">
                                            {pkg.price.toFixed(2)} درهم
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Filter size={48} className="mb-2 text-slate-200" />
                      <p className="font-medium">No orders found</p>
                      <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ORDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl flex-row-reverse">
              <div className="text-right">
                <h3 className="text-xl font-bold text-slate-800">ایجاد سفارش جدید</h3>
                <p className="text-sm text-slate-500">افزودن محصولات، انتخاب مشتری و ثبت پرداخت‌ها</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Top Row: Customer Selection */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 text-right">انتخاب مشتری</label>
                  <div className="flex gap-2 mb-3">
                    {!isNewCustomer ? (
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                      >
                        <option value="">انتخاب مشتری موجود...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="نام مشتری جدید"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                      />
                    )}
                    <button
                      onClick={() => { 
                        setIsNewCustomer(!isNewCustomer); 
                        setSelectedCustomerId(''); 
                        setNewCustomerName('');
                        setNewCustomerPhone('');
                        setNewCustomerAddress('');
                        setNewCustomerEmail('');
                      }}
                      className={`px-3 py-2 border rounded-lg transition-colors ${isNewCustomer ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                      title={isNewCustomer ? "انتخاب مشتری موجود" : "افزودن مشتری جدید"}
                    >
                      {isNewCustomer ? <Search size={20} /> : <UserPlus size={20} />}
                    </button>
                  </div>

                  {/* Additional Fields for New Customer */}
                  {isNewCustomer && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="شماره تلفن"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          className="w-full pr-10 pl-4 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="آدرس کامل"
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          className="w-full pr-10 pl-4 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                      <div className="relative md:col-span-2">
                        <input
                          type="email"
                          placeholder="ایمیل (اختیاری)"
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Source & Products */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 text-right">منبع / پلتفرم</label>
                <select
                  value={newOrderSource}
                  onChange={(e) => setNewOrderSource(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-right"
                >
                  <option value="1688">1688</option>
                  <option value="Taobao">Taobao</option>
                  <option value="Shein">Shein</option>
                  <option value="YesStyle">YesStyle</option>
                  <option value="AliExpress">AliExpress</option>
                  <option value="Other">سایر</option>
                </select>

                <div className="flex justify-between items-center mb-2 flex-row-reverse">
                  <label className="block text-sm font-semibold text-slate-700 text-right">محصولات سفارش</label>
                  <span className="text-xs text-slate-400">تعداد: {orderItems.length}</span>
                </div>

                <div className="space-y-4">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fade-in">
                      <div className="flex gap-2 items-start">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          disabled={orderItems.length === 1}
                          className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors shrink-0"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        <div className="flex-1 space-y-3">
                          {/* Row 1: Description (full width) */}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 text-right">نام / توضیحات محصول</label>
                            <input
                              type="text"
                              placeholder="مثال: تی‌شرت مشکی سایز XL"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                            />
                          </div>
                          
                          {/* Row 2: Link (full width) */}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 text-right">لینک محصول</label>
                            <input
                              type="url"
                              placeholder="https://1688.com/..."
                              value={item.link}
                              onChange={(e) => handleItemChange(idx, 'link', e.target.value)}
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                            />
                          </div>
                          
                          {/* Row 3: Qty, Currency, Price */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1 text-right">تعداد</label>
                              <input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={item.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1 text-right">واحد</label>
                              <select
                                value={item.currency || 'AED'}
                                onChange={(e) => handleItemChange(idx, 'currency', e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                              >
                                <option value="AED">درهم</option>
                                <option value="IRR">تومان</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1 text-right">قیمت واحد</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={item.price}
                                onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddItem}
                  className="mt-4 text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline flex-row-reverse"
                >
                  <span>افزودن محصول دیگر</span>
                  <Plus size={16} />
                </button>
              </div>

              {/* Footer Summary & Payment */}
              <div className="border-t border-slate-100 pt-6 bg-slate-50 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row gap-6 justify-between">

                  {/* Totals Section */}
                  <div className="flex gap-8 text-right items-center flex-row-reverse">
                    <button
                      onClick={handleCreateOrder}
                      disabled={isCreatingOrder}
                      className="mr-4 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isCreatingOrder && (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      <span>{isCreatingOrder ? 'در حال ثبت...' : 'ثبت سفارش'}</span>
                    </button>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-semibold">باقیمانده</p>
                      <p className={`text-xl font-bold ${calculateBalance() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(calculateBalance() * exchangeRate).toLocaleString('fa-IR')} تومان
                      </p>
                      <p className="text-xs text-slate-400">{calculateBalance().toFixed(2)} درهم</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-semibold">جمع کل</p>
                      <p className="text-xl font-bold text-slate-800">{(calculateTotal() * exchangeRate).toLocaleString('fa-IR')} تومان</p>
                      <p className="text-xs text-slate-400">{calculateTotal().toFixed(2)} درهم</p>
                    </div>
                  </div>

                  {/* Payment Input Section */}
                  <div className="flex-1 max-w-sm space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 text-right">پیش پرداخت / بیعانه</label>
                    <div className="flex gap-2">
                      <select
                        value={paymentCurrency}
                        onChange={(e) => setPaymentCurrency(e.target.value)}
                        className="w-24 px-2 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm text-right"
                      >
                        <option value="AED">درهم</option>
                        <option value="IRR">تومان</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </div>
                    <p className="text-xs text-slate-500 text-right">مبلغی که مشتری از قبل پرداخت کرده است</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl flex-row-reverse">
              <div className="text-right">
                <h3 className="text-xl font-bold text-slate-800">ثبت پرداخت جدید</h3>
                <p className="text-sm text-slate-500">افزودن مبلغ پرداختی مشتری</p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 text-right">مبلغ پرداختی</label>
                <div className="flex gap-2">
                  <select
                    value={newPaymentCurrency}
                    onChange={(e) => setNewPaymentCurrency(e.target.value)}
                    className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                  >
                    <option value="AED">درهم</option>
                    <option value="IRR">تومان</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="مبلغ..."
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
                >
                  لغو
                </button>
                <button
                  onClick={handleAddPayment}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  ثبت پرداخت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

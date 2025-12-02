import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { PackageStatus, Order } from '../types';
import { ChevronDown, ChevronUp, Loader, Search, Edit2, Save, X, Phone, MapPin } from 'lucide-react';
import { dataService } from '../services/dataService';

interface CustomerSummary {
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
}

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerSummary[]>([]);
  const [displayedCustomers, setDisplayedCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customersLimit, setCustomersLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; phone: string; address: string }>({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await dataService.getCustomersWithOrders();
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = customers.filter(customer => 
        customer.customerName.toLowerCase().includes(term) ||
        customer.customerPhone?.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  useEffect(() => {
    setDisplayedCustomers(filteredCustomers.slice(0, customersLimit));
  }, [filteredCustomers, customersLimit]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setCustomersLimit(prev => prev + 20);
      setIsLoadingMore(false);
    }, 300);
  };

  const handleEditClick = (customer: CustomerSummary) => {
    setEditingCustomerId(customer.customerId);
    setEditForm({
      name: customer.customerName,
      phone: customer.customerPhone || '',
      address: customer.address || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingCustomerId(null);
    setEditForm({ name: '', phone: '', address: '' });
  };

  const handleSaveEdit = async (customerId: string) => {
    try {
      await dataService.updateCustomerInfo(customerId, {
        displayName: editForm.name,
        phoneNumber: editForm.phone,
        address: editForm.address
      });

      // Update local state
      const updatedCustomers = customers.map(c => 
        c.customerId === customerId 
          ? { ...c, customerName: editForm.name, customerPhone: editForm.phone, address: editForm.address }
          : c
      );
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      setEditingCustomerId(null);
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("خطا در ذخیره اطلاعات");
    }
  };

  const getDeliveredCount = (orders: Order[]) => {
    return orders.filter(o => 
      o.packages.length > 0 && 
      o.packages.every(pkg => pkg.currentStatus === PackageStatus.DELIVERED)
    ).length;
  };

  const getPendingCount = (orders: Order[]) => {
    return orders.filter(o => 
      o.packages.length > 0 && 
      o.packages.some(pkg => pkg.currentStatus !== PackageStatus.DELIVERED)
    ).length;
  };

  const getStatusColor = (status: PackageStatus): string => {
    if (status === PackageStatus.DELIVERED) return 'bg-green-100 text-green-800';
    if (status === PackageStatus.ISSUE_REPORTED) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fa-IR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">مشتری‌ها</h1>
        <p className="text-slate-600">مشاهده و مدیریت اطلاعات مشتریان و سفارش‌های آن‌ها</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس نام، شماره تلفن یا آدرس..."
            className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedCustomers.map((customer) => (
          <div
            key={customer.customerId}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow"
          >
            {/* Customer Summary */}
            <div className="p-4">
              {editingCustomerId === customer.customerId ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-right">نام مشتری</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-right">شماره تلفن</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-right">آدرس</label>
                    <textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleSaveEdit(customer.customerId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Save size={16} />
                      ذخیره
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-2"
                    >
                      <X size={16} />
                      لغو
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 text-right">
                      <h3 className="font-semibold text-lg text-slate-800">{customer.customerName}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 justify-end">
                        <span>{customer.customerPhone || 'بدون شماره'}</span>
                        <Phone size={14} />
                      </div>
                      {customer.address && (
                        <div className="flex items-start gap-2 mt-1 text-sm text-slate-600 justify-end">
                          <span className="text-right">{customer.address}</span>
                          <MapPin size={14} className="shrink-0 mt-0.5" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditClick(customer)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setExpandedCustomerId(expandedCustomerId === customer.customerId ? null : customer.customerId)}
                    className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-8 mr-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{customer.orders.length}</p>
                  <p className="text-xs text-slate-500">کل خریدها</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-green-600">{getDeliveredCount(customer.orders)}</p>
                  <p className="text-xs text-slate-500">تحویل شده</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-amber-600">{getPendingCount(customer.orders)}</p>
                  <p className="text-xs text-slate-500">در حال ارسال</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">{formatDate(customer.lastOrderDate)}</p>
                  <p className="text-xs text-slate-500">آخرین خرید</p>
                </div>
                <div>
                  {expandedCustomerId === customer.customerId ? (
                    <ChevronUp size={24} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={24} className="text-slate-400" />
                  )}
                </div>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Order Details - Expanded View */}
            {expandedCustomerId === customer.customerId && (
              <div className="border-t border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-800 mb-3">سفارش‌های {customer.customerName}</h4>
                <div className="space-y-2">
                  {customer.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between bg-white p-3 rounded border border-slate-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">سفارش #{order.id}</p>
                        <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold text-slate-800">${order.totalPrice}</p>
                        <div className="flex gap-1">
                            {order.packages.map(pkg => (
                                <span key={pkg.id} className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(pkg.currentStatus)}`}>
                                    {pkg.currentStatus.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Load More Button */}
        {filteredCustomers.length > displayedCustomers.length && (
          <div className="flex justify-center py-6">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال بارگذاری...
                </>
              ) : (
                <>
                  بارگذاری بیشتر ({filteredCustomers.length - displayedCustomers.length} مشتری دیگر)
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Order, PackageStatus, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Package, TrendingUp, AlertTriangle, Clock, Users, CheckCircle, XCircle, ShoppingBag, Calendar, Phone, MapPin, ArrowRight, PackageCheck } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div className="text-right">
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

interface CustomerSummary {
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
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (user) {
      setRefreshing(true);
      try {
        const [ordersData, customersData] = await Promise.all([
          dataService.getOrders(user.role, user.uid),
          dataService.getCustomersWithOrders()
        ]);
        setOrders(ordersData);
        setCustomers(customersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید دیتابیس را با داده‌های نمونه پر کنید؟\n\nتوجه: این عمل داده‌های موجود را تغییر نمی‌دهد، فقط داده‌های جدید اضافه می‌کند.')) {
      return;
    }
    
    setRefreshing(true);
    try {
      await dataService.seedDatabase();
      alert('دیتابیس با موفقیت پر شد!');
      await fetchData();
    } catch (error) {
      console.error('Error seeding database:', error);
      alert('خطا در پر کردن دیتابیس');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) return <div className="flex justify-center p-12 text-slate-400">Loading dashboard...</div>;

  // Calculate Stats
  const totalPackages = orders.reduce((acc, order) => acc + order.packages.length, 0);
  const activeOrders = orders.filter(o => o.status !== PackageStatus.DELIVERED).length;
  const issues = orders.filter(o => o.status === PackageStatus.ISSUE_REPORTED).length;

  // Prepare Chart Data
  const statusCounts = orders.reduce((acc: any, order) => {
    // Simplify statuses for chart
    let key = 'Other';
    if (order.status.includes('CHINA')) key = 'China';
    else if (order.status.includes('UAE')) key = 'UAE';
    else if (order.status.includes('IRAN')) key = 'Iran';
    else if (order.status === 'DELIVERED') key = 'Done';

    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(statusCounts).map(key => ({ name: key, count: statusCounts[key] }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>در حال بارگذاری...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>بارگذاری مجدد</span>
              </>
            )}
          </button>
          {user?.role === UserRole.ADMIN && orders.length === 0 && (
            <button
              onClick={handleSeedDatabase}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <PackageCheck size={16} />
              <span>پر کردن دیتابیس</span>
            </button>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-800">خوش آمدید، {user?.displayName}</h2>
          <p className="text-slate-500 mt-1">اینجا وضعیت شبکه لجستیک شما امروز را مشاهده می‌کنید</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="سفارش‌های فعال"
          value={activeOrders}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="بسته‌های در حال ارسال"
          value={totalPackages}
          icon={TrendingUp}
          color="bg-indigo-500"
        />
        <StatCard
          title="مشکلات گزارش شده"
          value={issues}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <StatCard
          title="متوسط زمان تحویل"
          value="۱۲ روز"
          icon={Clock}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-row-reverse">
              <h3 className="font-bold text-slate-800">سفارش‌های اخیر</h3>
              <button className="text-sm text-blue-600 font-medium hover:underline">مشاهده همه</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 text-right">تعداد</th>
                    <th className="px-6 py-3 text-right">وضعیت</th>
                    <th className="px-6 py-3 text-right">تاریخ</th>
                    <th className="px-6 py-3 text-right">منبع</th>
                    <th className="px-6 py-3 text-right">شناسه سفارش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-right text-slate-600">{order.totalItems}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{order.source}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{order.id}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        هیچ سفارش فعالی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Charts/Info */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-6 text-right">توزیع سفارش‌ها</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="px-4 py-2 bg-slate-100 rounded-lg">
            <span className="text-sm font-semibold text-slate-700">{customers.length} مشتری</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h3 className="text-xl font-bold text-slate-800">مرور مشتریان</h3>
              <p className="text-sm text-slate-500">ردیابی فعالیت مشتریان و تاریخچه سفارش‌ها</p>
            </div>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>

        {customers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map(customer => {
              const totalValue = customer.orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
              const deliveredPercentage = customer.totalOrders > 0 
                ? Math.round((customer.deliveredOrders / customer.totalOrders) * 100) 
                : 0;

              return (
                <div 
                  key={customer.customerId}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-800 mb-1">{customer.customerName}</h4>
                        {customer.customerPhone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} />
                            <span>{customer.customerPhone}</span>
                          </div>
                        )}
                        {customer.shippingAddress && (
                          <div className="flex items-start gap-2 text-xs text-slate-500 mt-2">
                            <MapPin size={14} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{customer.shippingAddress}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                        <Users size={20} className="text-indigo-600" />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-6 space-y-4">
                    {/* Order Count */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ShoppingBag size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Total Orders</p>
                          <p className="text-2xl font-bold text-slate-800">{customer.totalOrders}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-500">Total Value</p>
                        <p className="text-lg font-bold text-slate-800">${totalValue.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Last Order */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-amber-600" />
                        <span className="text-xs font-medium text-amber-800">Last Order</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">{customer.lastOrderId}</p>
                      </div>
                    </div>

                    {/* Delivery Status */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Delivery Status</span>
                        <span className="text-xs font-medium text-slate-500">{deliveredPercentage}% Delivered</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${deliveredPercentage}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                          <CheckCircle size={18} className="text-green-600 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-green-700">Delivered</p>
                            <p className="text-lg font-bold text-green-800">{customer.deliveredOrders}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                          <XCircle size={18} className="text-orange-600 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-orange-700">Pending</p>
                            <p className="text-lg font-bold text-orange-800">{customer.pendingOrders}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Recent Orders</p>
                      <div className="space-y-2">
                        {customer.orders.slice(0, 3).map(order => {
                          const isDelivered = order.packages.every(pkg => pkg.currentStatus === PackageStatus.DELIVERED);
                          const allPackagesDelivered = order.packages.length > 0 && 
                            order.packages.every(pkg => pkg.currentStatus === PackageStatus.DELIVERED);
                          
                          return (
                            <div 
                              key={order.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group/item"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                  allPackagesDelivered ? 'bg-green-500' : 'bg-orange-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{order.id}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500">{order.source}</span>
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs text-slate-500">{order.totalItems} items</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={order.status} />
                                <ArrowRight size={14} className="text-slate-400 group-hover/item:text-slate-600 transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                        {customer.orders.length > 3 && (
                          <div className="text-center pt-2">
                            <span className="text-xs font-medium text-slate-500">
                              +{customer.orders.length - 3} more orders
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium mb-1">No customers found</p>
            <p className="text-sm text-slate-400">Customer data will appear here once orders are created.</p>
          </div>
        )}
      </div>
    </div>
  );
};

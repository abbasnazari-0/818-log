import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Order, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ShoppingCart, Calendar, Package, Search, Filter, X, Download, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toJalaali, toGregorian, jalaaliMonthLength } from '../services/dateUtils';

export const UnpurchasedOrders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterApplied, setFilterApplied] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<'thisWeek' | 'lastMonth' | 'thisMonth' | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      navigate('/');
    }
  }, [user, navigate]);

  // Get date range helpers using Jalali calendar
  const getThisWeekRange = () => {
    const now = new Date();
    
    // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
    // In Persian calendar, week starts on Saturday (6)
    const dayOfWeek = now.getDay();
    
    // Calculate days to subtract to get to the most recent Saturday (or today if it is Saturday)
    // If Sat (6) -> 0
    // If Sun (0) -> 1
    // If Mon (1) -> 2
    // ...
    // If Fri (5) -> 6
    const daysToSubtract = (dayOfWeek + 1) % 7;
    
    const saturdayDate = new Date(now);
    saturdayDate.setDate(now.getDate() - daysToSubtract);
    saturdayDate.setHours(0, 0, 0, 0);
    
    // End of week is Friday
    const fridayDate = new Date(saturdayDate);
    fridayDate.setDate(saturdayDate.getDate() + 6);
    fridayDate.setHours(23, 59, 59, 999);
    
    return { start: saturdayDate.getTime(), end: fridayDate.getTime() };
  };

  const getThisMonthRange = () => {
    const now = new Date();
    const jDate = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    // First day of current Jalali month
    const gStart = toGregorian(jDate.jy, jDate.jm, 1);
    const startDate = new Date(gStart.gy, gStart.gm - 1, gStart.gd, 0, 0, 0, 0);
    
    // Last day of current Jalali month
    const lastDay = jalaaliMonthLength(jDate.jy, jDate.jm);
    const gEnd = toGregorian(jDate.jy, jDate.jm, lastDay);
    const endDate = new Date(gEnd.gy, gEnd.gm - 1, gEnd.gd, 23, 59, 59, 999);
    
    return { start: startDate.getTime(), end: endDate.getTime() };
  };

  const getLastMonthRange = () => {
    const now = new Date();
    const jDate = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    let targetMonth = jDate.jm - 1;
    let targetYear = jDate.jy;
    
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear -= 1;
    }
    
    // First day of last Jalali month
    const gStart = toGregorian(targetYear, targetMonth, 1);
    const startDate = new Date(gStart.gy, gStart.gm - 1, gStart.gd, 0, 0, 0, 0);
    
    // Last day of last Jalali month
    const lastDay = jalaaliMonthLength(targetYear, targetMonth);
    const gEnd = toGregorian(targetYear, targetMonth, lastDay);
    const endDate = new Date(gEnd.gy, gEnd.gm - 1, gEnd.gd, 23, 59, 59, 999);
    
    return { start: startDate.getTime(), end: endDate.getTime() };
  };

  const fetchUnpurchasedOrders = async (start?: number, end?: number) => {
    setLoading(true);
    try {
      const unpurchasedOrders = await dataService.getUnpurchasedOrders(start, end);
      setOrders(unpurchasedOrders);
      setFilteredOrders(unpurchasedOrders);
    } catch (error) {
      console.error('Error fetching unpurchased orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpurchasedOrders();
  }, []);

  // Check for quick filter in URL params
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'thisWeek' || filter === 'thisMonth' || filter === 'lastMonth') {
      handleQuickFilter(filter);
    }
  }, [searchParams]);

  useEffect(() => {
    // Apply search filter
    if (searchTerm) {
      const filtered = orders.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchTerm, orders]);

  const handleDateFilter = () => {
    if (!startDate && !endDate) {
      alert('لطفاً حداقل یک تاریخ را وارد کنید');
      return;
    }

    let start: number | undefined;
    let end: number | undefined;

    // Parse Jalali dates
    if (startDate) {
      const parts = startDate.split('/');
      if (parts.length === 3) {
        const jYear = parseInt(parts[0]);
        const jMonth = parseInt(parts[1]);
        const jDay = parseInt(parts[2]);
        
        const gDate = toGregorian(jYear, jMonth, jDay);
        const gregorianDate = new Date(gDate.gy, gDate.gm - 1, gDate.gd, 0, 0, 0, 0);
        start = gregorianDate.getTime();
      }
    }

    if (endDate) {
      const parts = endDate.split('/');
      if (parts.length === 3) {
        const jYear = parseInt(parts[0]);
        const jMonth = parseInt(parts[1]);
        const jDay = parseInt(parts[2]);
        
        const gDate = toGregorian(jYear, jMonth, jDay);
        const gregorianDate = new Date(gDate.gy, gDate.gm - 1, gDate.gd, 23, 59, 59, 999);
        end = gregorianDate.getTime();
      }
    }

    if (start || end) {
      fetchUnpurchasedOrders(start, end);
      setFilterApplied(true);
    }
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterApplied(false);
    setActiveQuickFilter(null);
    fetchUnpurchasedOrders();
  };

  const handleQuickFilter = (filterType: 'thisWeek' | 'thisMonth' | 'lastMonth') => {
    let range;
    
    switch (filterType) {
      case 'thisWeek':
        range = getThisWeekRange();
        break;
      case 'thisMonth':
        range = getThisMonthRange();
        break;
      case 'lastMonth':
        range = getLastMonthRange();
        break;
    }

    if (!range) return;

    setActiveQuickFilter(filterType);
    
    // Convert to Jalali date format for display
    const startDateObj = new Date(range.start);
    const endDateObj = new Date(range.end);
    
    const jStart = toJalaali(startDateObj.getFullYear(), startDateObj.getMonth() + 1, startDateObj.getDate());
    const jEnd = toJalaali(endDateObj.getFullYear(), endDateObj.getMonth() + 1, endDateObj.getDate());
    
    setStartDate(`${jStart.jy}/${String(jStart.jm).padStart(2, '0')}/${String(jStart.jd).padStart(2, '0')}`);
    setEndDate(`${jEnd.jy}/${String(jEnd.jm).padStart(2, '0')}/${String(jEnd.jd).padStart(2, '0')}`);
    
    fetchUnpurchasedOrders(range.start, range.end);
    setFilterApplied(true);
  };

  const handleExportCSV = () => {
    // Prepare CSV data
    const csvRows = [
      ['شناسه سفارش', 'نام مشتری', 'منبع', 'تاریخ', 'تعداد بسته‌ها', 'بسته‌های خریداری نشده', 'قیمت کل'].join(','),
    ];

    filteredOrders.forEach(order => {
      const unpurchasedCount = order.packages.filter(pkg => !pkg.internalTrackingCode).length;
      const row = [
        order.id,
        order.customerName,
        order.source,
        new Date(order.createdAt).toLocaleDateString('fa-IR'),
        order.packages.length,
        unpurchasedCount,
        order.totalPrice || 0
      ].join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `unpurchased-orders-${new Date().getTime()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <ShoppingCart size={32} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">سفارش‌های خریداری نشده</h1>
            <p className="text-slate-500 mt-1">
              مجموع {filteredOrders.length} سفارش که هنوز از فروشنده خریداری نشده‌اند
            </p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredOrders.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={18} />
          <span>خروجی CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-slate-600" />
          <h3 className="font-bold text-slate-800">فیلترها</h3>
        </div>

        {/* Quick Filters */}
        <div className="mb-6 pb-6 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-3 text-right">فیلترهای سریع:</p>
          <div className="flex gap-2 justify-end flex-wrap">
            <button
              onClick={() => handleQuickFilter('thisWeek')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeQuickFilter === 'thisWeek'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              این هفته
            </button>
            <button
              onClick={() => handleQuickFilter('thisMonth')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeQuickFilter === 'thisMonth'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              این ماه
            </button>
            <button
              onClick={() => handleQuickFilter('lastMonth')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeQuickFilter === 'lastMonth'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ماه گذشته
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2 text-right">
              جستجو
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجو در شناسه، نام مشتری، منبع..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 text-right">
              از تاریخ (شمسی)
            </label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="مثال: 1403/09/15"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 text-right">
              تا تاریخ (شمسی)
            </label>
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="مثال: 1403/09/30"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex gap-3 mt-4 justify-end">
          {filterApplied && (
            <button
              onClick={handleClearFilter}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
              <span>پاک کردن فیلتر</span>
            </button>
          )}
          <button
            onClick={handleDateFilter}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Filter size={18} />
            <span>اعمال فیلتر تاریخ</span>
          </button>
        </div>
      </div>


      {/* Summary Stats */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-linear-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">مجموع سفارش‌ها</p>
                <p className="text-3xl font-bold text-orange-600">{filteredOrders.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <ShoppingCart size={24} className="text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">مجموع بسته‌ها</p>
                <p className="text-3xl font-bold text-blue-600">
                  {filteredOrders.reduce((sum, order) => sum + order.packages.filter(pkg => !pkg.internalTrackingCode).length, 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">ارزش کل</p>
                <p className="text-3xl font-bold text-green-600">
                  ${filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Orders Table */}
      {filteredOrders.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">شناسه سفارش</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">نام مشتری</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">منبع</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">تاریخ</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">تعداد بسته‌ها</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">بسته‌های خریداری نشده</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">وضعیت</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700">قیمت کل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const unpurchasedPackages = order.packages.filter(pkg => !pkg.internalTrackingCode);
                  const unpurchasedCount = unpurchasedPackages.length;
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800">{order.id}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{order.customerName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {order.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-semibold">
                          {order.packages.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800 font-semibold">
                          {unpurchasedCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">
                        {order.totalPrice ? `$${order.totalPrice.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-orange-50 rounded-full">
              <AlertCircle size={48} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">سفارشی یافت نشد</h3>
              <p className="text-slate-500">
                {searchTerm || filterApplied
                  ? 'با فیلترهای انتخابی شما سفارشی وجود ندارد.'
                  : 'همه سفارش‌ها خریداری شده‌اند!'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

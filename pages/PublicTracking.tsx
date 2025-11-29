import React, { useState } from 'react';
import { Search, Package, Clock, CheckCircle, Truck, Plane, AlertCircle, MapPin, ArrowRight } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Package as PackageType, PackageStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';

const getStatusIcon = (status: PackageStatus) => {
    if (status.includes('CHINA')) return <Package className="text-blue-500" size={20} />;
    if (status.includes('UAE')) return <Plane className="text-purple-500" size={20} />;
    if (status.includes('IRAN')) return <Truck className="text-orange-500" size={20} />;
    if (status === PackageStatus.DELIVERED) return <CheckCircle className="text-green-500" size={20} />;
    return <MapPin className="text-slate-500" size={20} />;
};

const getStatusProgress = (status: PackageStatus): number => {
    const statuses = Object.values(PackageStatus);
    const index = statuses.indexOf(status);
    return ((index + 1) / statuses.length) * 100;
};

export const PublicTracking: React.FC = () => {
    const [trackingCode, setTrackingCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [packageData, setPackageData] = useState<PackageType | null>(null);
    const [error, setError] = useState('');

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingCode.trim()) return;

        setLoading(true);
        setError('');
        setPackageData(null);

        try {
            const code = trackingCode.trim();
            let pkg: PackageType | undefined;

            // Try as Package ID first
            pkg = await dataService.getPackageById(code);

            // If not found, try as Order ID and get first package
            if (!pkg && code.startsWith('ORD-')) {
                const order = await dataService.getOrderById(code);
                if (order && order.packages.length > 0) {
                    pkg = order.packages[0];
                }
            }

            if (pkg) {
                setPackageData(pkg);
            } else {
                setError('کد رهگیری یافت نشد. لطفاً کد سفارش یا بسته را بررسی کنید.');
            }
        } catch (err) {
            setError('خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="818 Stylist" className="w-10 h-10 object-contain" />
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-slate-800">818 Stylist</h1>
                                <p className="text-xs text-slate-500">سیستم رهگیری مرسولات</p>
                            </div>
                        </div>
                        <Package className="text-blue-600" size={24} />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Search Box */}
                <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-slate-100 mb-6">
                    <div className="flex items-center justify-center mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Search className="text-white" size={24} />
                        </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 text-center">رهگیری مرسوله شما</h2>
                    <p className="text-slate-500 text-center mb-5 text-sm">کد سفارش یا کد بسته را وارد کنید</p>

                    <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={trackingCode}
                                onChange={(e) => setTrackingCode(e.target.value)}
                                placeholder="مثال: ORD-2024-001 یا PKG-10001"
                                className="w-full pr-10 pl-3 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right text-sm transition-all hover:border-slate-300"
                                dir="ltr"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
                        >
                            <span>{loading ? 'در حال جستجو...' : 'رهگیری'}</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-2 text-red-700 shadow-sm">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span className="text-xs font-medium">{error}</span>
                        </div>
                    )}
                </div>

                {/* Results */}
                {packageData && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Package Info Card */}
                        <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4 sm:p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5">
                                    <div className="absolute top-2 right-2 w-20 h-20 bg-white rounded-full opacity-10"></div>
                                    <div className="absolute bottom-2 left-2 w-16 h-16 bg-white rounded-full opacity-10"></div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Package size={18} className="text-blue-200" />
                                            <p className="text-blue-100 text-xs font-medium">کد رهگیری مرسوله</p>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-bold tracking-wider">{packageData.id}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={packageData.currentStatus} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-shadow">
                                        <p className="text-slate-500 text-xs font-semibold mb-1">شرح محصول</p>
                                        <p className="font-bold text-slate-800 text-sm">{packageData.description}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-shadow">
                                        <p className="text-slate-500 text-xs font-semibold mb-1">شماره سفارش</p>
                                        <p className="font-bold text-slate-800 text-sm">{packageData.orderId}</p>
                                    </div>
                                    {packageData.weight && (
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-shadow">
                                            <p className="text-slate-500 text-xs font-semibold mb-1">وزن</p>
                                            <p className="font-bold text-slate-800 text-sm">{packageData.weight} کیلوگرم</p>
                                        </div>
                                    )}
                                    {packageData.trackingNumber && (
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-shadow">
                                            <p className="text-slate-500 text-xs font-semibold mb-1">شماره پیگیری</p>
                                            <p className="font-bold text-slate-800 font-mono text-xs">{packageData.trackingNumber}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-5 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-700">پیشرفت ارسال</span>
                                        <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{Math.round(getStatusProgress(packageData.currentStatus))}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-full rounded-full transition-all duration-700 ease-out shadow-md"
                                            style={{ width: `${getStatusProgress(packageData.currentStatus)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="border-t border-slate-200 pt-4">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-base">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                            <Clock size={16} className="text-white" />
                                        </div>
                                        مراحل ارسال
                                    </h4>
                                    <div className="space-y-3 pr-1">
                                        {[
                                            { status: 'PURCHASED_FROM_SELLER', label: 'خریداری شده', icon: Package, active: true },
                                            { status: 'RECEIVED_IN_CHINA', label: 'دریافت در چین 🇨🇳', icon: MapPin, active: packageData.currentStatus !== 'PURCHASED_FROM_SELLER' },
                                            { status: 'SHIPPED_TO_UAE', label: 'ارسال به امارات 🇦🇪', icon: Plane, active: packageData.currentStatus.includes('UAE') || packageData.currentStatus.includes('IRAN') || packageData.currentStatus === 'DELIVERED' },
                                            { status: 'ARRIVED_UAE', label: 'رسیده به امارات', icon: MapPin, active: packageData.currentStatus.includes('UAE') || packageData.currentStatus.includes('IRAN') || packageData.currentStatus === 'DELIVERED' },
                                            { status: 'SHIPPED_TO_IRAN', label: 'ارسال به ایران 🇮🇷', icon: Truck, active: packageData.currentStatus.includes('IRAN') || packageData.currentStatus === 'DELIVERED' },
                                            { status: 'OUT_FOR_DELIVERY', label: 'در حال تحویل', icon: Truck, active: packageData.currentStatus === 'OUT_FOR_DELIVERY' || packageData.currentStatus === 'DELIVERED' },
                                            { status: 'DELIVERED', label: 'تحویل شد ✓', icon: CheckCircle, active: packageData.currentStatus === 'DELIVERED' }
                                        ].map((step, index) => (
                                            <div key={index} className="flex items-center gap-3 relative">
                                                {index < 6 && (
                                                    <div className={`absolute right-[17px] top-9 w-0.5 h-5 ${step.active ? 'bg-blue-300' : 'bg-slate-200'}`} />
                                                )}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 transition-all duration-300 ${
                                                    step.active 
                                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                }`}>
                                                    {step.active ? <step.icon size={16} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold text-sm ${
                                                        step.active ? 'text-slate-800' : 'text-slate-400'
                                                    }`}>
                                                        {step.label}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

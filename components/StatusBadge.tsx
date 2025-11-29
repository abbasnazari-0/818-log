import React from 'react';
import { PackageStatus } from '../types';

const statusColors: Record<PackageStatus, string> = {
  [PackageStatus.PURCHASED_FROM_SELLER]: 'bg-gray-100 text-gray-800 border-gray-200',
  [PackageStatus.IN_TRANSIT_TO_CHINA_AGENT]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  [PackageStatus.RECEIVED_IN_CHINA]: 'bg-blue-50 text-blue-700 border-blue-200',
  [PackageStatus.QC_CHECKED]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  [PackageStatus.PACKED_CHINA]: 'bg-purple-50 text-purple-700 border-purple-200',
  [PackageStatus.READY_TO_SHIP_UAE]: 'bg-pink-50 text-pink-700 border-pink-200',
  [PackageStatus.SHIPPED_TO_UAE]: 'bg-orange-50 text-orange-700 border-orange-200',
  
  [PackageStatus.ARRIVED_UAE]: 'bg-teal-50 text-teal-700 border-teal-200',
  [PackageStatus.REPACKING]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  [PackageStatus.READY_TO_SHIP_IRAN]: 'bg-sky-50 text-sky-700 border-sky-200',
  [PackageStatus.SHIPPED_TO_IRAN]: 'bg-blue-100 text-blue-800 border-blue-300',
  
  [PackageStatus.ARRIVED_IRAN]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [PackageStatus.OUT_FOR_DELIVERY]: 'bg-lime-50 text-lime-700 border-lime-200',
  [PackageStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-300',
  
  [PackageStatus.ISSUE_REPORTED]: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels: Record<PackageStatus, string> = {
  [PackageStatus.PURCHASED_FROM_SELLER]: 'خریداری شده',
  [PackageStatus.IN_TRANSIT_TO_CHINA_AGENT]: 'در حال ارسال به چین',
  [PackageStatus.RECEIVED_IN_CHINA]: 'دریافت شده در چین',
  [PackageStatus.QC_CHECKED]: 'بررسی کیفیت',
  [PackageStatus.PACKED_CHINA]: 'بسته‌بندی شده',
  [PackageStatus.READY_TO_SHIP_UAE]: 'آماده ارسال به امارات',
  [PackageStatus.SHIPPED_TO_UAE]: 'ارسال شده به امارات',
  [PackageStatus.ARRIVED_UAE]: 'رسیده به امارات',
  [PackageStatus.REPACKING]: 'در حال بسته‌بندی مجدد',
  [PackageStatus.READY_TO_SHIP_IRAN]: 'آماده ارسال به ایران',
  [PackageStatus.SHIPPED_TO_IRAN]: 'ارسال شده به ایران',
  [PackageStatus.ARRIVED_IRAN]: 'رسیده به ایران',
  [PackageStatus.OUT_FOR_DELIVERY]: 'در حال تحویل',
  [PackageStatus.DELIVERED]: 'تحویل داده شده',
  [PackageStatus.ISSUE_REPORTED]: 'مشکل گزارش شده',
};

export const StatusBadge: React.FC<{ status: PackageStatus }> = ({ status }) => {
  const styles = statusColors[status] || 'bg-gray-100 text-gray-800';
  const label = statusLabels[status] || status.replace(/_/g, ' ');
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles} whitespace-nowrap`}>
      {label}
    </span>
  );
};

import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { PackageStatus, Order } from '../types';
import { ChevronDown, ChevronUp, Loader, Search, Edit2, Save, X, Phone, MapPin, Send, Receipt, Percent, Users, CheckSquare, Square, MessageCircle, ChevronRight, Info } from 'lucide-react';
import { dataService } from '../services/dataService';

// Message Templates
const MESSAGE_TEMPLATES = {
  discount: {
    label: 'تخفیفات و کد تخفیف',
    icon: Percent,
    color: 'bg-green-500',
    defaultMessage: `سلام {{NAME}} عزیز! 🎉

به مناسبت ... ما یک کد تخفیف ویژه برای شما در نظر گرفته‌ایم:

🎁 کد تخفیف: SALE20
💰 میزان تخفیف: ۲۰٪

این کد تا تاریخ ... معتبر است.

برای استفاده کافیست هنگام خرید این کد را وارد کنید.

با تشکر
۸۱۸ استایلیست`
  },
  payment: {
    label: 'درخواست باقی مانده صورتحساب',
    icon: Receipt,
    color: 'bg-amber-500',
    defaultMessage: `سلام {{NAME}} عزیز!

امیدواریم حالتان خوب باشد. 🙏

طبق بررسی حساب شما، مبلغ ... تومان از صورتحساب شما باقی مانده است.

لطفاً جهت تسویه حساب اقدام فرمایید.

شماره کارت: xxxx-xxxx-xxxx-xxxx
به نام: ...

در صورت پرداخت، لطفاً رسید را ارسال کنید.

با تشکر
۸۱۸ استایلیست`
  },
  custom: {
    label: 'پیام سفارشی',
    icon: MessageCircle,
    color: 'bg-blue-500',
    defaultMessage: `سلام {{NAME}} عزیز!

پیام

با تشکر
۸۱۸ استایلیست`
  }
};

type MessageType = keyof typeof MESSAGE_TEMPLATES;

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
  
  // Action modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<'payment' | 'discount' | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  // New modal flow states
  const [modalStep, setModalStep] = useState<'select-customers' | 'select-template' | 'edit-message'>('select-customers');
  const [selectedMessageType, setSelectedMessageType] = useState<MessageType | null>(null);
  const [messageText, setMessageText] = useState('');

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

  // Action modal handlers
  const handleOpenMessageModal = () => {
    setShowActionModal(true);
    setModalStep('select-customers');
    setSelectedCustomerIds(new Set());
    setModalSearchTerm('');
    setSelectedMessageType(null);
    setMessageText('');
    setShowComingSoon(false);
  };

  const handleCloseModal = () => {
    setShowActionModal(false);
    setCurrentAction(null);
    setSelectedCustomerIds(new Set());
    setModalSearchTerm('');
    setShowComingSoon(false);
    setModalStep('select-customers');
    setSelectedMessageType(null);
    setMessageText('');
  };

  const handleNextStep = () => {
    if (modalStep === 'select-customers' && selectedCustomerIds.size > 0) {
      setModalStep('select-template');
    } else if (modalStep === 'select-template' && selectedMessageType) {
      setMessageText(MESSAGE_TEMPLATES[selectedMessageType].defaultMessage);
      setModalStep('edit-message');
    }
  };

  const handleBackStep = () => {
    if (modalStep === 'select-template') {
      setModalStep('select-customers');
    } else if (modalStep === 'edit-message') {
      setModalStep('select-template');
    }
  };

  const handleSelectMessageType = (type: MessageType) => {
    setSelectedMessageType(type);
    setMessageText(MESSAGE_TEMPLATES[type].defaultMessage);
    setModalStep('edit-message');
  };

  const toggleCustomerSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomerIds);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomerIds(newSelected);
  };

  const toggleSelectAll = () => {
    const modalFilteredCustomers = customers.filter(customer => {
      if (modalSearchTerm.trim() === '') return true;
      const term = modalSearchTerm.toLowerCase();
      return (
        customer.customerName.toLowerCase().includes(term) ||
        customer.customerPhone?.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term)
      );
    });
    
    if (selectedCustomerIds.size === modalFilteredCustomers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(modalFilteredCustomers.map(c => c.customerId)));
    }
  };

  const getModalFilteredCustomers = () => {
    if (modalSearchTerm.trim() === '') return customers;
    const term = modalSearchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.customerName.toLowerCase().includes(term) ||
      customer.customerPhone?.toLowerCase().includes(term) ||
      customer.address?.toLowerCase().includes(term)
    );
  };

  const handleSendAction = () => {
    setShowComingSoon(true);
  };

  const getModalTitle = () => {
    switch (modalStep) {
      case 'select-customers':
        return 'انتخاب مشتریان';
      case 'select-template':
        return 'انتخاب نوع پیام';
      case 'edit-message':
        return selectedMessageType ? MESSAGE_TEMPLATES[selectedMessageType].label : 'ویرایش پیام';
      default:
        return '';
    }
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">مشتری‌ها</h1>
          <p className="text-slate-600 dark:text-slate-400">مشاهده و مدیریت اطلاعات مشتریان و سفارش‌های آن‌ها</p>
        </div>
        
        {/* Action Button */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleOpenMessageModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Send size={18} />
            <span>ارسال پیام به مشتریان</span>
          </button>
        </div>
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
            className="w-full pr-10 pl-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{getModalTitle()}</h2>
                  {modalStep !== 'select-customers' && (
                    <button
                      onClick={handleBackStep}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ChevronRight size={20} className="text-slate-500" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`w-3 h-3 rounded-full ${modalStep === 'select-customers' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`w-8 h-0.5 ${modalStep !== 'select-customers' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`w-3 h-3 rounded-full ${modalStep === 'select-template' ? 'bg-blue-600' : modalStep === 'edit-message' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`w-8 h-0.5 ${modalStep === 'edit-message' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`w-3 h-3 rounded-full ${modalStep === 'edit-message' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
              </div>
              <div className="flex items-center justify-center gap-8 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className={modalStep === 'select-customers' ? 'text-blue-600 font-medium' : ''}>انتخاب مشتری</span>
                <span className={modalStep === 'select-template' ? 'text-blue-600 font-medium' : ''}>نوع پیام</span>
                <span className={modalStep === 'edit-message' ? 'text-blue-600 font-medium' : ''}>ویرایش و ارسال</span>
              </div>
            </div>

            {/* Step 1: Select Customers */}
            {modalStep === 'select-customers' && (
              <>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      placeholder="جستجو بر اساس نام یا شماره..."
                      className="w-full pr-10 pl-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white dark:bg-slate-700 dark:text-slate-100"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedCustomerIds.size} مشتری انتخاب شده
                    </span>
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      <Users size={16} />
                      {selectedCustomerIds.size === getModalFilteredCustomers().length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {getModalFilteredCustomers().map((customer) => (
                      <div
                        key={customer.customerId}
                        onClick={() => toggleCustomerSelection(customer.customerId)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                          selectedCustomerIds.has(customer.customerId)
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                      >
                        <div className="shrink-0">
                          {selectedCustomerIds.has(customer.customerId) ? (
                            <CheckSquare size={22} className="text-blue-600" />
                          ) : (
                            <Square size={22} className="text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{customer.customerName}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1 justify-end flex-wrap">
                            {customer.customerPhone && (
                              <span className="flex items-center gap-1">
                                {customer.customerPhone}
                                <Phone size={12} />
                              </span>
                            )}
                            {customer.address && (
                              <span className="flex items-center gap-1 max-w-[200px] truncate">
                                {customer.address}
                                <MapPin size={12} className="shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {getModalFilteredCustomers().length === 0 && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        مشتری‌ای یافت نشد
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={selectedCustomerIds.size === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    مرحله بعد
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Select Template */}
            {modalStep === 'select-template' && (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <p className="text-slate-600 dark:text-slate-400 text-right mb-4">
                    نوع پیام مورد نظر را انتخاب کنید ({selectedCustomerIds.size} مشتری انتخاب شده)
                  </p>
                  
                  <div className="space-y-3">
                    {(Object.keys(MESSAGE_TEMPLATES) as MessageType[]).map((type) => {
                      const template = MESSAGE_TEMPLATES[type];
                      const Icon = template.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => handleSelectMessageType(type)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-right group"
                        >
                          <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-600 rotate-180" />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{template.label}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              {type === 'discount' && 'ارسال کد تخفیف و پیشنهادات ویژه به مشتریان'}
                              {type === 'payment' && 'درخواست پرداخت باقی‌مانده صورتحساب'}
                              {type === 'custom' && 'نوشتن پیام دلخواه به مشتریان'}
                            </p>
                          </div>
                          <div className={`p-3 rounded-lg ${template.color}`}>
                            <Icon size={24} className="text-white" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={handleBackStep}
                    className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                  >
                    بازگشت
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Edit Message */}
            {modalStep === 'edit-message' && (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  {showComingSoon ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                        <Send size={32} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">به زودی!</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center">
                        این قابلیت در حال توسعه است و به زودی فعال می‌شود.
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                        {selectedCustomerIds.size} مشتری انتخاب شده بودند
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Placeholders Help */}
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2 text-right">
                          <div className="flex-1">
                            <p className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2 justify-end">
                              متغیرهای قابل استفاده
                              <Info size={16} />
                            </p>
                            <div className="flex flex-wrap gap-2 justify-end">
                              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-sm font-mono">{'{{NAME}}'}</code>
                              <span className="text-sm text-blue-600 dark:text-blue-400">نام مشتری</span>
                              <span className="mx-2 text-blue-300">|</span>
                              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-sm font-mono">{'{{PHONE}}'}</code>
                              <span className="text-sm text-blue-600 dark:text-blue-400">شماره تلفن</span>
                              <span className="mx-2 text-blue-300">|</span>
                              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-sm font-mono">{'{{ADDRESS}}'}</code>
                              <span className="text-sm text-blue-600 dark:text-blue-400">آدرس</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Message Editor */}
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-right">
                        متن پیام
                      </label>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white dark:bg-slate-700 dark:text-slate-100 resize-none font-mono text-sm leading-relaxed"
                        dir="rtl"
                      />
                      
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-right">
                        این پیام برای {selectedCustomerIds.size} مشتری ارسال خواهد شد
                      </p>
                    </>
                  )}
                </div>

                {!showComingSoon && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <button
                      onClick={handleBackStep}
                      className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                    >
                      بازگشت
                    </button>
                    <button
                      onClick={handleSendAction}
                      disabled={!messageText.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                      ارسال پیام ({selectedCustomerIds.size})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedCustomers.map((customer) => (
          <div
            key={customer.customerId}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
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

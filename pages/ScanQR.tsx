import React, { useState, useRef, useEffect } from 'react';
import { Package, PackageStatus } from '../types';
import { dataService } from '../services/dataService';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Camera, Search, ArrowRight, CheckCircle, Upload, AlertCircle, X } from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';

export const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const [scanInput, setScanInput] = useState('');
  const [scannedPackage, setScannedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateMode, setUpdateMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PackageStatus | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Check URL parameters for preloaded package code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setScanInput(code);
      // Auto-trigger search after a short delay
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 100);
    }
  }, []);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim()) return;

    setLoading(true);
    setError('');
    setScannedPackage(null);

    try {
      const searchCode = scanInput.trim();
      let pkg: Package | undefined;

      // Try 1: Direct package ID lookup
      pkg = await dataService.getPackageById(searchCode);

      // Try 2: Search by internal tracking code
      if (!pkg) {
        pkg = await dataService.getPackageByInternalTrackingCode(searchCode);
      }

      // Try 3: If it's an order ID, get first package from order
      if (!pkg && searchCode.startsWith('ORD-')) {
        const order = await dataService.getOrderById(searchCode);
        if (order && order.packages.length > 0) {
          pkg = order.packages[0];
        }
      }

      if (pkg) {
        setScannedPackage(pkg);
        setUpdateMode(true);
        setWeight(pkg.weight?.toString() || '');
      } else {
        setError('بسته یافت نشد. لطفاً کد را بررسی کنید.');
      }
    } catch (err) {
      setError('خطا در بازیابی اطلاعات بسته.');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      setError('');
      
      // First check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('مرورگر شما از دوربین پشتیبانی نمی‌کند! لطفاً از مرورگر جدیدتری استفاده کنید یا به صورت دستی کد را وارد کنید.');
        setIsCameraOpen(false);
        return;
      }

      // Request camera permission explicitly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError: any) {
        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
          setError('دسترسی به دوربین رد شد! لطفاً در تنظیمات مرورگر، دسترسی به دوربین را مجاز کنید.');
        } else if (permissionError.name === 'NotFoundError') {
          setError('دوربینی یافت نشد! لطفاً دوربین را بررسی کنید.');
        } else {
          setError('خطا در دسترسی به دوربین! اگر از HTTP استفاده می‌کنید، به HTTPS تغییر دهید یا از localhost استفاده کنید.');
        }
        setIsCameraOpen(false);
        return;
      }

      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        setError('دوربینی یافت نشد!');
        setIsCameraOpen(false);
        return;
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            setScanInput(scannedText);
            stopCamera();
            // Manually trigger search with the scanned text
            setTimeout(() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }, 100);
          }
        }
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(`خطا در دسترسی به دوربین! ${err.message || 'لطفاً به صورت دستی کد را وارد کنید.'}`);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsCameraOpen(false);
  };

  const getAvailableNextStatuses = (current: PackageStatus): PackageStatus[] => {
    if (!user) return [];

    // Define status flows for each region
    const chinaStatuses = [
      PackageStatus.PURCHASED_FROM_SELLER,
      PackageStatus.IN_TRANSIT_TO_CHINA_AGENT,
      PackageStatus.RECEIVED_IN_CHINA,
      PackageStatus.QC_CHECKED,
      PackageStatus.PACKED_CHINA,
      PackageStatus.READY_TO_SHIP_UAE,
      PackageStatus.SHIPPED_TO_UAE
    ];

    const uaeStatuses = [
      PackageStatus.SHIPPED_TO_UAE,  // بسته در راه امارات
      PackageStatus.ARRIVED_UAE,
      PackageStatus.REPACKING,
      PackageStatus.READY_TO_SHIP_IRAN,
      PackageStatus.SHIPPED_TO_IRAN
    ];

    const iranStatuses = [
      PackageStatus.SHIPPED_TO_IRAN,  // بسته در راه ایران
      PackageStatus.ARRIVED_IRAN,
      PackageStatus.OUT_FOR_DELIVERY,
      PackageStatus.DELIVERED
    ];

    // Determine which statuses the agent can access based on role
    let allowedStatuses: PackageStatus[] = [];
    if (user.role === 'CHINA_AGENT') {
      allowedStatuses = chinaStatuses;
    } else if (user.role === 'UAE_AGENT') {
      allowedStatuses = uaeStatuses;
    } else if (user.role === 'IRAN_AGENT') {
      allowedStatuses = iranStatuses;
    } else if (user.role === 'ADMIN') {
      // Admin can access all statuses
      allowedStatuses = [...chinaStatuses, ...uaeStatuses, ...iranStatuses];
    }

    // Find current status index in allowed statuses
    const currIdx = allowedStatuses.indexOf(current);
    
    // If current status not in allowed list, return empty
    if (currIdx === -1) return [];
    
    // Return ALL remaining statuses in the flow (not just next 2-3)
    return allowedStatuses.slice(currIdx + 1);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const readers: Promise<string>[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const promise = new Promise<string>((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
      
      readers.push(promise);
    }

    Promise.all(readers).then((photos) => {
      setCapturedPhotos([...capturedPhotos, ...photos]);
    });
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(capturedPhotos.filter((_, i) => i !== index));
  };

  const handleConfirmStatusUpdate = async () => {
    if (!scannedPackage || !user || !selectedStatus) return;
    
    setLoading(true);
    setError('');
    try {
      // Build additionalData object, only including defined values
      const additionalData: Partial<Package> = {};
      if (weight && parseFloat(weight) > 0) {
        additionalData.weight = parseFloat(weight);
      }
      if (capturedPhotos.length > 0) {
        additionalData.photoUrls = capturedPhotos;
      }

      await dataService.updatePackageStatus(
        scannedPackage.id,
        selectedStatus,
        user.uid,
        'Agent Location Device', // location
        notes, // notes
        additionalData
      );
      
      // Refresh
      const updated = await dataService.getPackageById(scannedPackage.id);
      setScannedPackage(updated || null);
      setUpdateMode(false);
      setNotes('');
      setSelectedStatus(null);
      setCapturedPhotos([]);
      setWeight('');
      alert('وضعیت با موفقیت به‌روزرسانی شد!');
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(`خطا در به‌روزرسانی وضعیت: ${err.message || 'لطفاً دوباره تلاش کنید.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 justify-end text-right">
          <span>اسکن بسته</span>
          <Camera className="text-blue-600" />
        </h2>
        
        <form onSubmit={handleScan} className="flex gap-2 flex-col sm:flex-row">
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="کد PKG یا کد رهگیری داخلی یا کد ORD..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            autoFocus={!isCameraOpen}
            disabled={isCameraOpen}
          />
          <div className="flex gap-2">
            {!isCameraOpen ? (
              <button 
                type="button"
                onClick={startCamera}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
              >
                <Camera size={20} /> دوربین
              </button>
            ) : (
              <button 
                type="button"
                onClick={stopCamera}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <X size={20} /> بستن
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading || isCameraOpen}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'در حال جستجو...' : <><Search size={20} /> جستجو</>}
            </button>
          </div>
        </form>

        {isCameraOpen && (
          <div className="mt-4 relative">
            <video 
              ref={videoRef} 
              className="w-full rounded-lg border-2 border-blue-500"
              style={{ maxHeight: '400px' }}
            />
            <div className="absolute top-2 left-2 right-2 bg-black bg-opacity-50 text-white text-center py-2 rounded-lg text-sm">
              دوربین را روی QR Code قرار دهید
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-right">
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}
      </div>

      {scannedPackage && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-mono">ID: {scannedPackage.id}</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{scannedPackage.description}</h3>
              <p className="text-sm text-slate-600 mt-1">Tracking: {scannedPackage.trackingNumber}</p>
            </div>
            <StatusBadge status={scannedPackage.currentStatus} />
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse Bin</label>
                <div className="px-3 py-2 bg-slate-100 rounded-md text-slate-600">
                  {scannedPackage.warehouseBin || 'Not Assigned'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Processing Notes</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md h-24"
                placeholder="Add notes about condition, repacking, etc."
              />
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-bold text-slate-800 mb-3 text-right">تغییر وضعیت به:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getAvailableNextStatuses(scannedPackage.currentStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    disabled={loading}
                    className={`flex items-center justify-between px-4 py-3 border rounded-lg transition-all text-right group ${
                      selectedStatus === status 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      selectedStatus === status ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-600'
                    }`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    {selectedStatus === status && <CheckCircle size={16} className="text-blue-600" />}
                  </button>
                ))}
              </div>

              {selectedStatus && (
                <div className="mt-6 space-y-4 animate-fade-in">
                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-bold text-slate-800 mb-3 text-right">آپلود عکس‌های QC (اختیاری)</label>
                    <input 
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                    <button 
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 border border-slate-200"
                    >
                      <Camera size={18} /> گرفتن عکس از وضعیت بسته
                    </button>

                    {capturedPhotos.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {capturedPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={photo} 
                              alt={`Photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleConfirmStatusUpdate}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        ثبت تغییرات
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

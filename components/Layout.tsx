import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  Scan,
  Settings,
  Menu,
  X,
  Truck,
  Anchor,
  Users2
} from 'lucide-react';

export const Layout: React.FC = () => {

  interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
  }

  const SidebarItem: React.FC<SidebarItemProps> = ({
    icon: Icon,
    label,
    active,
    onClick
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors rounded-lg mb-1 text-right ${active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <span className="font-medium flex-1 text-right">{label}</span>
      <Icon size={20} className="shrink-0" />
    </button>
  );

  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getNavItems = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return [
          { id: '/', label: 'داشبورد', icon: LayoutDashboard },
          { id: '/orders', label: 'همه سفارش‌ها', icon: Package },
          { id: '/users', label: 'مدیریت نمایندگان', icon: Users },
          { id: '/customers', label: 'مشتریان', icon: Users2 },
          { id: '/reports', label: 'گزارش‌ها', icon: Settings },
        ];
      case UserRole.CHINA_AGENT:
      case UserRole.UAE_AGENT:
      case UserRole.IRAN_AGENT:
        return [
          { id: '/', label: 'وظایف من', icon: LayoutDashboard },
          { id: '/scan', label: 'اسکن بسته', icon: Scan },
          { id: '/manifest', label: 'مانیفست‌ها', icon: Package },
        ];
      case UserRole.CUSTOMER:
        return [
          { id: '/', label: 'سفارش‌های من', icon: Package },
          { id: '/tracking', label: 'پیگیری مرسوله', icon: Truck },
        ];
      default:
        return [];
    }
  };

  const roleLabel = () => {
    if (!user) return '';
    return user.role.replace('_', ' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row-reverse">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-slate-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-md flex-row-reverse">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2 flex-row-reverse">
          <span>818 Stylist</span>
          <img src="/logo.png" alt="818 Stylist" className="w-8 h-8 object-contain" />
        </div>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
        ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3 flex-row-reverse text-right">
              <div>
                <h1 className="font-bold text-lg leading-none">818 Stylist</h1>
                <p className="text-xs text-slate-400 mt-1">فروشگاه آنلاین</p>
              </div>
              <img src="/logo.png" alt="818 Stylist" className="w-12 h-12 object-contain" />
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="mb-6 px-4 text-right">
              <p className="text-xs uppercase text-slate-500 font-semibold mb-2">Logged in as</p>
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="text-right">
                  <p className="text-sm font-medium truncate w-32">{user?.displayName}</p>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-blue-400 border border-slate-700">
                    {roleLabel()}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                  {user?.displayName.charAt(0)}
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {getNavItems().map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.id}
                  onClick={() => {
                    navigate(item.id);
                    setIsMobileOpen(false);
                  }}
                />
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors text-right"
            >
              <span className="font-medium flex-1 text-right">خروج</span>
              <LogOut size={20} className="shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:mr-0 pt-16 lg:pt-0 min-h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
};
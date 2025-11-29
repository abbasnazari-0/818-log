import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { OrderList } from './pages/OrderList';
import { ScanQR } from './pages/ScanQR';
import { AgentManagement } from './pages/AgentManagement';
import { Reports } from './pages/Reports';
import { PublicTracking } from './pages/PublicTracking';
import { Layout } from './components/Layout';
import { CustomerManagement } from './pages/CustomerManagement';

const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route - No Authentication Required */}
      <Route path="/tracking" element={<PublicTracking />} />

      {/* Protected Routes - Require Authentication */}
      {!user ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="scan" element={<ScanQR />} />
          <Route path="users" element={<AgentManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="manifest" element={<OrderList />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

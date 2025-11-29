import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="818 Stylist" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800">818 Stylist</h1>
          <p className="text-center text-slate-500 mt-2">فروشگاه آنلاین - ورود به پنل مدیریت</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-right">ایمیل</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right"
                placeholder="example@domain.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-right">رمز عبور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? 'در حال ورود...' : <>ورود <ArrowRight size={18} /></>}
          </button>

          {error && (
            <div className="text-center text-red-500 text-sm bg-red-50 py-2 rounded-lg">
              ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید.
            </div>
          )}
        </form>
        <div className="px-8 pb-8 text-center">
          <Link to="/tracking" className="text-lg font-bold text-blue-600 hover:underline">
            پیگیری مرسوله من
          </Link>
        </div>
      </div>
    </div>
  );
};

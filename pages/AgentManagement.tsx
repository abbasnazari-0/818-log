
import React, { useState, useEffect } from 'react';
import { User, UserRole, Package } from '../types';
import { dataService } from '../services/dataService';
import { StatusBadge } from '../components/StatusBadge';
import { Users, UserPlus, MapPin, Phone, Mail, Package as PackageIcon, ChevronRight, X, Shield } from 'lucide-react';

export const AgentManagement: React.FC = () => {
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [agentWorkload, setAgentWorkload] = useState<Package[]>([]);
  const [loadingWorkload, setLoadingWorkload] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.CHINA_AGENT);
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const data = await dataService.getAgents();
    setAgents(data);
    setLoading(false);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAgent: User = {
        uid: `agent-${Date.now()}`,
        displayName: newName,
        email: newEmail,
        role: newRole,
        password: '123', // In real app, handle password securely
        phoneNumber: newPhone,
        address: newLocation
    };

    await dataService.addAgent(newAgent);
    setIsAddModalOpen(false);
    fetchAgents();
    // Reset form
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewLocation('');
  };

  const handleSelectAgent = async (agent: User) => {
    setSelectedAgent(agent);
    setLoadingWorkload(true);
    // Fetch packages currently "with" this agent type
    const packages = await dataService.getPackagesByRole(agent.role);
    setAgentWorkload(packages);
    setLoadingWorkload(false);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
        case UserRole.CHINA_AGENT: return 'bg-red-50 text-red-700 border-red-200';
        case UserRole.UAE_AGENT: return 'bg-teal-50 text-teal-700 border-teal-200';
        case UserRole.IRAN_AGENT: return 'bg-green-50 text-green-700 border-green-200';
        default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading agents...</div>;

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case UserRole.CHINA_AGENT: return 'نماینده چین';
        case UserRole.UAE_AGENT: return 'نماینده امارات';
        case UserRole.IRAN_AGENT: return 'نماینده ایران';
        default: return role;
    }
  };

  const getRoleFlag = (role: UserRole) => {
    switch (role) {
        case UserRole.CHINA_AGENT: return '🇨🇳';
        case UserRole.UAE_AGENT: return '🇦🇪';
        case UserRole.IRAN_AGENT: return '🇮🇷';
        default: return '';
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center flex-row-reverse">
            <div className="text-right">
                <h2 className="text-2xl font-bold text-slate-800">مدیریت نمایندگان</h2>
                <p className="text-slate-500">مدیریت شرکای لجستیک و مشاهده موجودی فعال آنها</p>
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium flex-row-reverse"
            >
                <span>افزودن نماینده جدید</span>
                <UserPlus size={18} />
            </button>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => (
                <div 
                    key={agent.uid} 
                    onClick={() => handleSelectAgent(agent)}
                    className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${selectedAgent?.uid === agent.uid ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getRoleColor(agent.role)} flex items-center gap-1`}>
                            <span>{getRoleFlag(agent.role)}</span>
                            <span>{getRoleLabel(agent.role)}</span>
                        </span>
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
                            {agent.displayName.charAt(0)}
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-800 text-right">{agent.displayName}</h3>
                    <div className="space-y-2 mt-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                            <span className="text-right flex-1">{agent.email}</span>
                            <Mail size={14} className="text-slate-400 shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                            <span className="text-right flex-1">{agent.phoneNumber || 'نامشخص'}</span>
                            <Phone size={14} className="text-slate-400 shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                            <span className="text-right flex-1">{agent.address || 'مکان نامشخص'}</span>
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center group flex-row-reverse">
                        <span className="text-xs font-semibold text-slate-500 uppercase text-right">مشاهده بار کاری</span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Selected Agent Workload Section */}
        {selectedAgent && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-row-reverse">
                    <div className="text-right">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-row-reverse justify-end">
                            <span>موجودی فعال: {selectedAgent.displayName}</span>
                            <PackageIcon className="text-blue-500" />
                        </h3>
                        <p className="text-sm text-slate-500">
                            بسته‌های تحت مدیریت {getRoleLabel(selectedAgent.role)}
                        </p>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {loadingWorkload ? (
                        <div className="text-center py-8 text-slate-500">در حال بررسی موجودی...</div>
                    ) : agentWorkload.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            <PackageIcon size={48} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 font-medium">در حال حاضر بسته فعالی در این مرحله وجود ندارد</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3 text-right">شماره پیگیری</th>
                                        <th className="px-4 py-3 text-right">وزن</th>
                                        <th className="px-4 py-3 text-right">وضعیت فعلی</th>
                                        <th className="px-4 py-3 text-right">توضیحات</th>
                                        <th className="px-4 py-3 text-right">شناسه بسته</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {agentWorkload.map(pkg => (
                                        <tr key={pkg.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{pkg.trackingNumber}</td>
                                            <td className="px-4 py-3 text-slate-600">{pkg.weight ? `${pkg.weight} kg` : '-'}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={pkg.currentStatus} />
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{pkg.description}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{pkg.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Add Agent Modal */}
        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-row-reverse">
                        <h3 className="font-bold text-lg text-slate-800 text-right">افزودن نماینده جدید</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 text-right">نام کامل</label>
                            <input 
                                required
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 text-right">آدرس ایمیل</label>
                            <input 
                                required
                                type="email" 
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 text-right">نقش / منطقه</label>
                            <select 
                                value={newRole}
                                onChange={e => setNewRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                            >
                                <option value={UserRole.CHINA_AGENT}>🇨🇳 نماینده چین</option>
                                <option value={UserRole.UAE_AGENT}>🇦🇪 نماینده امارات</option>
                                <option value={UserRole.IRAN_AGENT}>🇮🇷 نماینده ایران</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 text-right">مکان</label>
                                <input
                                    type="text" 
                                    value={newLocation}
                                    onChange={e => setNewLocation(e.target.value)}
                                    placeholder="مثلا گوانگژو"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 text-right">تلفن</label>
                                <input 
                                    type="text" 
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-right"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3 flex-row-reverse">
                            <button 
                                type="submit"
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                ایجاد نماینده
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                            >
                                انصراف
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

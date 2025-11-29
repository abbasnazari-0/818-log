
import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { AuditLog } from '../types';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FileText, Activity, AlertTriangle, Shield, CheckCircle, Clock } from 'lucide-react';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'stats'>('audit');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        dataService.getAuditLogs(),
        dataService.getSystemStats()
      ]);
      setLogs(logsData);
      setStats(statsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading reports data...</div>;

  // Chart Data Preparation
  const statusData = stats ? Object.keys(stats.statusCounts).map(key => ({
    name: key.replace(/_/g, ' '),
    value: stats.statusCounts[key]
  })) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Reports & Audit Logs</h2>
            <p className="text-slate-500">Monitor system activity and analyze logistics performance.</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
            <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                System Audit
            </button>
            <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'stats' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                Performance Stats
            </button>
        </div>
      </div>

      {activeTab === 'stats' && stats && (
        <div className="space-y-6 animate-fade-in">
             {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20} /></div>
                        <span className="text-sm font-medium text-slate-500">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileText size={20} /></div>
                        <span className="text-sm font-medium text-slate-500">Total Orders</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalOrders}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
                        <span className="text-sm font-medium text-slate-500">Total Packages</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalPackages}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock size={20} /></div>
                        <span className="text-sm font-medium text-slate-500">Avg. Processing</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">4.2 Days</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Package Status Distribution</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Revenue Source</h3>
                    <div className="h-80 w-full flex items-center justify-center text-slate-400">
                         {/* Placeholder for complex bar chart */}
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={statusData} // Using status data as placeholder
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Details</th>
                            <th className="px-6 py-4">Severity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{log.userName}</div>
                                    <div className="text-xs text-slate-400">ID: {log.userId}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs font-mono">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.details}>
                                    {log.details}
                                </td>
                                <td className="px-6 py-4">
                                    {log.severity === 'INFO' && (
                                        <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs w-fit">
                                            <Shield size={12} /> Info
                                        </span>
                                    )}
                                    {log.severity === 'WARNING' && (
                                        <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs w-fit">
                                            <AlertTriangle size={12} /> Warning
                                        </span>
                                    )}
                                    {log.severity === 'CRITICAL' && (
                                        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs w-fit">
                                            <AlertTriangle size={12} /> Critical
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

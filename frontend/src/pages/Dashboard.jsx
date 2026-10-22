import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle,
  Users,
  Clock,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  PlusCircle,
  Repeat,
  Sparkles,
  TrendingUp,
  PieChart as PieIcon,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err) {
      showToast('Failed to load dashboard metrics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Dashboard" subtitle="Library overview & real-time analytics" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">Compiling real-time library analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, charts, recentTransactions, lowStockBooks } = data || {};

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar title="Library Dashboard" subtitle="Overview of inventory, patrons, loans, and finances" />

      <div className="p-8 space-y-8">
        {/* Quick Actions Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-700/15 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-sm mb-3">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Smart Circulation Active</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Metropolitan Library Portal</h2>
            <p className="text-sm text-blue-100 mt-1 max-w-xl">
              Currently managing {summary?.totalCopies || 0} physical copies across {summary?.totalBooks || 0} unique titles with {summary?.activeStudents || 0} registered active members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/issue-return')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-sm shadow-md hover:bg-blue-50 transition-all flex items-center gap-2"
            >
              <Repeat className="w-4 h-4" />
              <span>Issue / Return</span>
            </button>
            <button
              onClick={() => navigate('/books')}
              className="px-4 py-2.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-sm border border-blue-400/30 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Book</span>
            </button>
            <button
              onClick={() => navigate('/students')}
              className="px-4 py-2.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-sm border border-blue-400/30 transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>New Student</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Book Titles"
            value={summary?.totalBooks || 0}
            subtitle={`${summary?.totalCopies || 0} total physical volumes`}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="Available Copies"
            value={summary?.availableCopies || 0}
            subtitle={`${Math.round(((summary?.availableCopies || 0) / (summary?.totalCopies || 1)) * 100)}% inventory on shelves`}
            icon={CheckCircle}
            color="emerald"
          />
          <StatCard
            title="Active Borrowers"
            value={summary?.totalStudents || 0}
            subtitle={`${summary?.activeStudents || 0} in good standing`}
            icon={Users}
            color="indigo"
          />
          <StatCard
            title="Currently Issued"
            value={summary?.issuedBooks || 0}
            subtitle="Books in patron circulation"
            icon={Clock}
            color="violet"
          />
        </div>

        {/* Secondary KPI Bar (Overdue & Fines) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Overdue Items</p>
              <p className="text-2xl font-extrabold text-rose-600">{summary?.overdueBooks || 0}</p>
              <p className="text-xs text-slate-400">Books exceeding return period</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Pending Fines</p>
              <p className="text-2xl font-extrabold text-amber-600">${(summary?.finesPending || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-400">{summary?.pendingFinesCount || 0} unsettled penalty records</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Fines Collected</p>
              <p className="text-2xl font-extrabold text-emerald-600">${(summary?.finesCollected || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-400">Successfully settled revenue</p>
            </div>
          </div>
        </div>

        {/* Interactive Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Borrowing Activity Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Borrowing & Return Trends</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Monthly breakdown of circulation volume</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.monthlyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total_issued" name="Issued" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="returned" name="Returned" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="overdue" name="Overdue" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Book Category Distribution Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  <span>Books by Subject Category</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribution of library catalog titles</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.categoryDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="category"
                  >
                    {(charts?.categoryDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [`${val} titles (${item.payload.copies} copies)`, item.payload.category]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Recent Lending Transactions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest issue and return logs</p>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <span>View All Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Transaction Code</th>
                  <th className="px-6 py-3.5">Book Title</th>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Issue Date</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(recentTransactions || []).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-700">
                      {t.transaction_code}
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-slate-900 truncate max-w-xs">{t.book_title}</p>
                      <span className="text-xs text-slate-400">{t.book_category}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-800">{t.student_name}</p>
                      <p className="text-xs font-mono text-slate-400">{t.student_code}</p>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                      {t.issue_date}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                      {t.due_date}
                    </td>
                    <td className="px-6 py-3.5">
                      {t.status === 'RETURNED' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Returned
                        </span>
                      )}
                      {t.status === 'ISSUED' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Issued
                        </span>
                      )}
                      {t.status === 'OVERDUE' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                          Overdue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

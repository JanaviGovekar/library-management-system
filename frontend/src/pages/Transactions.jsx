import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  BookOpen,
  User,
  Hash
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Quick Return Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm, statusFilter, fromDate, toDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await api.getTransactions(params);
      setTransactions(res.transactions || []);
    } catch (err) {
      showToast('Failed to load transactions: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReturnModal = (txn) => {
    setActiveTxn(txn);
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleQuickReturn = async (e) => {
    e.preventDefault();
    if (!activeTxn) return;
    try {
      setSubmitting(true);
      const res = await api.returnBook(activeTxn.id, {
        condition_notes: returnNotes
      });
      showToast(res.message, res.daysOverdue > 0 ? 'info' : 'success');
      setIsReturnModalOpen(false);
      fetchTransactions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = transactions.length;
  const returnedCount = transactions.filter((t) => t.status === 'RETURNED').length;
  const issuedCount = transactions.filter((t) => t.status === 'ISSUED').length;
  const overdueCount = transactions.filter((t) => t.status === 'OVERDUE').length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar title="Circulation History" subtitle="Audit logs of all book lending, returns, and overdue events" />

      <div className="p-8 space-y-6">
        {/* Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Logs</span>
            <p className="text-xl font-black text-slate-800 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Currently Issued</span>
            <p className="text-xl font-black text-blue-600 mt-1">{issuedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Overdue Items</span>
            <p className="text-xl font-black text-rose-600 mt-1">{overdueCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Returned Books</span>
            <p className="text-xl font-black text-emerald-600 mt-1">{returnedCount}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code (TXN-...), book title, student name, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              <option value="ISSUED">Currently Issued</option>
              <option value="OVERDUE">Overdue</option>
              <option value="RETURNED">Returned</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-medium text-slate-500">Retrieving circulation history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No transactions recorded</h3>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Transaction Code</th>
                    <th className="px-6 py-4">Book Title</th>
                    <th className="px-6 py-4">Student Patron</th>
                    <th className="px-6 py-4">Dates</th>
                    <th className="px-6 py-4">Status & Fine</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                        {t.transaction_code}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 leading-snug truncate max-w-xs">{t.book_title}</p>
                        <p className="text-xs text-slate-400 font-mono">ISBN: {t.book_isbn}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{t.student_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{t.student_code}</p>
                      </td>
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        <p className="text-slate-600">Issued: <span className="font-semibold">{t.issue_date}</span></p>
                        <p className="text-slate-600">Due: <span className="font-semibold">{t.due_date}</span></p>
                        {t.return_date && (
                          <p className="text-emerald-700 font-medium">Returned: {t.return_date}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {t.status === 'RETURNED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Returned
                            </span>
                          )}
                          {t.status === 'ISSUED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Issued
                            </span>
                          )}
                          {t.status === 'OVERDUE' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              Overdue
                            </span>
                          )}
                          {t.fine_amount > 0 && (
                            <span className={`text-[11px] font-bold ${t.fine_status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ${t.fine_amount.toFixed(2)} ({t.fine_status})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(t.status === 'ISSUED' || t.status === 'OVERDUE') ? (
                          <button
                            onClick={() => handleOpenReturnModal(t)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Return Quick Action Modal */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Quick Book Return" maxWidth="max-w-md">
        {activeTxn && (
          <form onSubmit={handleQuickReturn} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-mono text-slate-400">{activeTxn.transaction_code}</p>
              <h4 className="text-sm font-bold text-slate-900">{activeTxn.book_title}</h4>
              <p className="text-xs text-slate-600">Borrower: {activeTxn.student_name}</p>
              <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 mt-2">
                <span>Due Date: {activeTxn.due_date}</span>
                <span className={`font-bold ${activeTxn.status === 'OVERDUE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Status: {activeTxn.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Remarks / Condition</label>
              <input
                type="text"
                placeholder="e.g. Returned on time in good shape"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{submitting ? 'Processing...' : 'Confirm Return'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

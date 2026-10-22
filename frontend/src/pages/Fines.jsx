import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Receipt,
  Printer,
  Calendar,
  User,
  BookOpen
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function Fines() {
  const [fines, setFines] = useState([]);
  const [summary, setSummary] = useState({ total_fines: 0, total_paid: 0, total_unpaid: 0, unpaid_count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeFine, setActiveFine] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchFines();
  }, [searchTerm, statusFilter]);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await api.getFines(params);
      setFines(res.fines || []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      showToast('Failed to load fines: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPay = (fine) => {
    setActiveFine(fine);
    setPaymentMethod('Cash');
    setReceiptNotes('');
    setIsPayModalOpen(true);
  };

  const handleOpenReceipt = (fine) => {
    setActiveFine(fine);
    setIsReceiptModalOpen(true);
  };

  const handlePayFine = async (e) => {
    e.preventDefault();
    if (!activeFine) return;
    try {
      setSubmitting(true);
      const res = await api.payFine(activeFine.id, {
        payment_method: paymentMethod,
        notes: receiptNotes
      });
      showToast(res.message, 'success');
      setIsPayModalOpen(false);
      fetchFines();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar title="Fines & Penalties" subtitle="Monitor overdue fee assessments, student obligations, and payments" />

      <div className="p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Penalties</span>
            <p className="text-2xl font-black text-slate-800 mt-1">${(summary.total_fines || 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Cumulative assessed fees</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Collected Revenue</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">${(summary.total_paid || 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Settled & deposited</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-rose-600 uppercase">Pending Dues</span>
            <p className="text-2xl font-black text-rose-600 mt-1">${(summary.total_unpaid || 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Outstanding liabilities</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-amber-600 uppercase">Pending Invoices</span>
            <p className="text-2xl font-black text-amber-600 mt-1">{summary.unpaid_count || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Unsettled patron fines</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, ID, book title, or receipt #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="All">All Fines</option>
              <option value="UNPAID">Pending (Unpaid)</option>
              <option value="PAID">Settled (Paid)</option>
            </select>
          </div>
        </div>

        {/* Fines Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-medium text-slate-500">Retrieving fine records...</p>
            </div>
          ) : fines.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No fines found</h3>
              <p className="text-xs text-slate-400 mt-1">There are no penalty records matching this criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Patron</th>
                    <th className="px-6 py-4">Associated Book & Code</th>
                    <th className="px-6 py-4">Days Overdue</th>
                    <th className="px-6 py-4">Fine Amount</th>
                    <th className="px-6 py-4">Status & Payment</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {fines.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                            {f.student_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{f.student_name}</p>
                            <p className="text-xs font-mono text-slate-400">{f.student_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 truncate max-w-xs">{f.book_title}</p>
                        <p className="text-xs font-mono text-slate-400">{f.transaction_code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 text-xs">
                          {f.days_overdue} day{f.days_overdue !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-base font-extrabold ${f.status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ${f.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {f.status === 'PAID' ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Paid
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              {f.payment_method} • {f.receipt_no}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {f.status === 'UNPAID' ? (
                          <button
                            onClick={() => handleOpenPay(f)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect Payment</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReceipt(f)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5 text-slate-500" />
                            <span>Receipt</span>
                          </button>
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

      {/* Collect Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Settle Overdue Fine" maxWidth="max-w-md">
        {activeFine && (
          <form onSubmit={handlePayFine} className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-blue-700 font-semibold uppercase">Payable Balance</span>
                <span className="text-2xl font-black text-blue-900">${activeFine.amount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-600">Patron: <strong className="font-bold text-slate-800">{activeFine.student_name}</strong> ({activeFine.student_code})</p>
              <p className="text-xs text-slate-600">Book: {activeFine.book_title}</p>
              <p className="text-[11px] text-slate-400">Duration: {activeFine.days_overdue} days past due date</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="Cash">Cash (Front Desk)</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Online / UPI">Online Transfer / UPI</option>
                <option value="Campus Account">Campus Card / Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Notes / Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Paid in full at Main Library Desk"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submitting ? 'Recording...' : 'Record Payment'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Official Payment Receipt" maxWidth="max-w-md">
        {activeFine && (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3 font-sans">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Metropolitan Library</h4>
                <p className="text-[11px] text-slate-400">Library Circulation Desk Receipt</p>
              </div>

              <div className="my-3 py-3 border-y border-dashed border-slate-300 space-y-1.5 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-800">{activeFine.receipt_no || 'REC-SETTLED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Paid:</span>
                  <span className="font-semibold text-slate-800">{activeFine.paid_date || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patron:</span>
                  <span className="font-semibold text-slate-800">{activeFine.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student ID:</span>
                  <span className="font-mono text-slate-800">{activeFine.student_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Book:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">{activeFine.book_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-semibold text-slate-800">{activeFine.payment_method || 'Cash'}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-bold text-slate-700">Total Settled:</span>
                <span className="text-2xl font-black text-emerald-600">${activeFine.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Repeat,
  BookCheck,
  RotateCcw,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  User,
  BookOpen,
  Clock,
  Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function IssueReturn() {
  const [activeTab, setActiveTab] = useState('issue'); // 'issue' | 'return'
  const [loading, setLoading] = useState(false);

  // Issue tab data
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueRemarks, setIssueRemarks] = useState('');

  // Return tab data
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [selectedTxnId, setSelectedTxnId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnNotes, setReturnNotes] = useState('');
  const [settings, setSettings] = useState({ borrow_duration_days: '14', daily_fine_rate: '1.50' });

  const { showToast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [booksRes, studentsRes, txnsRes, settingsRes] = await Promise.all([
        api.getBooks(),
        api.getStudents({ status: 'ACTIVE' }),
        api.getTransactions(),
        api.getSettings()
      ]);

      setBooks(booksRes.books || []);
      setStudents(studentsRes.students || []);

      // Filter active (ISSUED or OVERDUE) transactions for return
      const activeOnly = (txnsRes.transactions || []).filter(
        (t) => t.status === 'ISSUED' || t.status === 'OVERDUE'
      );
      setActiveTransactions(activeOnly);

      if (settingsRes?.settings) {
        setSettings(settingsRes.settings);
        const duration = parseInt(settingsRes.settings.borrow_duration_days) || 14;
        const target = new Date();
        target.setDate(target.getDate() + duration);
        setDueDate(target.toISOString().split('T')[0]);
      }
    } catch (err) {
      showToast('Error loading circulation data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBookId) {
      showToast('Please select both a student and a book.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.issueBook({
        student_id: parseInt(selectedStudentId),
        book_id: parseInt(selectedBookId),
        due_date: dueDate,
        remarks: issueRemarks
      });

      showToast(res.message || 'Book issued successfully!', 'success');

      // Reset form & reload data
      setSelectedBookId('');
      setSelectedStudentId('');
      setIssueRemarks('');
      await loadInitialData();
    } catch (err) {
      showToast(err.message || 'Failed to issue book', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!selectedTxnId) {
      showToast('Please select an active transaction to return.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.returnBook(selectedTxnId, {
        return_date: returnDate,
        condition_notes: returnNotes
      });

      showToast(res.message, res.daysOverdue > 0 ? 'info' : 'success');

      setSelectedTxnId('');
      setReturnNotes('');
      await loadInitialData();
    } catch (err) {
      showToast(err.message || 'Failed to process return', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate live return fine preview
  const selectedTxn = activeTransactions.find((t) => t.id === parseInt(selectedTxnId));
  let calculatedDaysOverdue = 0;
  let calculatedFine = 0.0;
  if (selectedTxn && returnDate) {
    const dueObj = new Date(selectedTxn.due_date);
    const retObj = new Date(returnDate);
    if (retObj > dueObj) {
      const diff = retObj - dueObj;
      calculatedDaysOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
      const rate = parseFloat(settings.daily_fine_rate) || 1.5;
      calculatedFine = calculatedDaysOverdue * rate;
    }
  }

  const selectedStudent = students.find((s) => s.id === parseInt(selectedStudentId));
  const selectedBook = books.find((b) => b.id === parseInt(selectedBookId));

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar title="Circulation Desk" subtitle="Instant checkout and return processing with automated fine calculation" />

      <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'issue'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookCheck className="w-4 h-4" />
            <span>Issue Book</span>
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'return'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return Book</span>
          </button>
        </div>

        {/* TAB 1: ISSUE BOOK */}
        {activeTab === 'issue' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-slate-200 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookCheck className="w-5 h-5 text-blue-600" />
                  <span>New Book Checkout</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Select an active student patron and an available book copy</p>
              </div>

              <form onSubmit={handleIssueBook} className="space-y-5">
                {/* Select Student */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Student Patron *
                  </label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="">-- Choose registered student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.student_id}) - {s.department} [{s.active_borrowings} borrowed]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Book */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Book Title *
                  </label>
                  <select
                    required
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="">-- Choose book from catalog --</option>
                    {books.map((b) => (
                      <option
                        key={b.id}
                        value={b.id}
                        disabled={b.available_copies <= 0}
                      >
                        {b.title} - {b.author} ({b.available_copies > 0 ? `${b.available_copies} copies available` : 'OUT OF STOCK'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Scheduled Due Date *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Default: {settings.borrow_duration_days || 14} days loan policy</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Issue Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Research project loan"
                      value={issueRemarks}
                      onChange={(e) => setIssueRemarks(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !selectedStudentId || !selectedBookId}
                    className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <BookCheck className="w-4 h-4" />
                    <span>Confirm & Issue Book</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Verification Summary Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Checkout Preview</h4>

                {/* Selected Student details */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Patron</span>
                  </p>
                  {selectedStudent ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedStudent.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{selectedStudent.student_id}</p>
                      <p className="text-xs text-slate-400 mt-1">{selectedStudent.department} • {selectedStudent.active_borrowings} active loans</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No student patron selected yet</p>
                  )}
                </div>

                {/* Selected Book details */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Book Selected</span>
                  </p>
                  {selectedBook ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{selectedBook.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">by {selectedBook.author}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {selectedBook.available_copies} available
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {selectedBook.shelf_location || 'General'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No book chosen yet</p>
                  )}
                </div>

                {/* Rule checklist */}
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Max {settings.max_books_per_student || 3} books per patron</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Unavailable copies cannot be checked out</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Stock updates automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RETURN BOOK */}
        {activeTab === 'return' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-slate-200 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                  <span>Process Book Return</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select an active loan to return. Overdue penalties are automatically evaluated and recorded.
                </p>
              </div>

              <form onSubmit={handleProcessReturn} className="space-y-5">
                {/* Select active transaction */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Active Borrowed Item *
                  </label>
                  <select
                    required
                    value={selectedTxnId}
                    onChange={(e) => setSelectedTxnId(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="">-- Choose active loan ({activeTransactions.length} pending) --</option>
                    {activeTransactions.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.transaction_code}] {t.book_title} — Borrowed by: {t.student_name} (Due: {t.due_date}) {t.status === 'OVERDUE' ? '⚠️ OVERDUE' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Return Date *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        required
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Book Condition / Return Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Excellent condition"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !selectedTxnId}
                    className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Complete Book Return</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Overdue Fine Calculation Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Fine & Condition Assessment</h4>

                {selectedTxn ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <p className="text-xs text-slate-400 font-mono">{selectedTxn.transaction_code}</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedTxn.book_title}</p>
                      <p className="text-xs text-slate-600 mt-1">Patron: <span className="font-semibold">{selectedTxn.student_name}</span></p>
                      <div className="mt-2 text-xs flex justify-between text-slate-500 border-t border-slate-200/60 pt-2">
                        <span>Issued: {selectedTxn.issue_date}</span>
                        <span className="font-bold text-slate-700">Due: {selectedTxn.due_date}</span>
                      </div>
                    </div>

                    {calculatedDaysOverdue > 0 ? (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                          <AlertCircle className="w-4 h-4" />
                          <span>Overdue Notice</span>
                        </div>
                        <p className="text-xs text-rose-800">
                          This book is returned <strong className="font-bold">{calculatedDaysOverdue} days late</strong>.
                        </p>
                        <div className="flex items-baseline justify-between pt-2 border-t border-rose-200">
                          <span className="text-xs font-medium">Fine Assessment:</span>
                          <span className="text-xl font-extrabold text-rose-700">
                            ${calculatedFine.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-600/80">
                          Rate: ${settings.daily_fine_rate || '1.50'} / day overdue
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-bold text-emerald-900">On Time Return</p>
                          <p className="text-emerald-700 mt-0.5">No overdue penalties assessed.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Select an active transaction from the dropdown to assess fines.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

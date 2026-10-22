import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Building,
  Clock,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  KeyRound,
  Database,
  CheckCircle2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Library policy settings
  const [settings, setSettings] = useState({
    library_name: '',
    library_email: '',
    library_phone: '',
    library_address: '',
    borrow_duration_days: '14',
    daily_fine_rate: '1.50',
    currency_symbol: '$',
    max_books_per_student: '3'
  });

  // Admin Profile settings
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSettings();
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      showToast('Failed to load system settings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.updateSettings(settings);
      showToast('Library configuration updated and persisted to database!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.updateProfile({
        name: profile.name,
        email: profile.email,
        currentPassword: profile.currentPassword,
        newPassword: profile.newPassword
      });
      updateUser(res.user);
      showToast('Administrator profile updated successfully!', 'success');
      setProfile((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
        <Navbar title="System Settings" subtitle="Configure library parameters and administrator preferences" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar title="System Settings" subtitle="Configure library policies, fine rates, contact details, and security" />

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Policy & Operational Settings */}
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Circulation Policies & Fine Rates</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Parameters applied automatically to student loans and overdue items</p>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Policies'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Borrow Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                required
                value={settings.borrow_duration_days}
                onChange={(e) => setSettings({ ...settings, borrow_duration_days: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standard loan period before item is flagged overdue.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Daily Fine Rate ($ / Day)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={settings.daily_fine_rate}
                onChange={(e) => setSettings({ ...settings, daily_fine_rate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Amount charged per day past due date.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Max Books Per Student
              </label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={settings.max_books_per_student}
                onChange={(e) => setSettings({ ...settings, max_books_per_student: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Concurrent active borrowing quota per patron.</p>
            </div>
          </div>
        </form>

        {/* Institution Information */}
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>Library Information & Branding</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Details displayed on system receipts and reports</p>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Info'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Library Facility Name</label>
              <input
                type="text"
                required
                value={settings.library_name}
                onChange={(e) => setSettings({ ...settings, library_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Email</label>
              <input
                type="email"
                required
                value={settings.library_email}
                onChange={(e) => setSettings({ ...settings, library_email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Help Desk Phone</label>
              <input
                type="text"
                value={settings.library_phone}
                onChange={(e) => setSettings({ ...settings, library_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Physical Campus Address</label>
              <input
                type="text"
                value={settings.library_address}
                onChange={(e) => setSettings({ ...settings, library_address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>
          </div>
        </form>

        {/* Administrator Profile & Password */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Admin Profile & Security</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage administrator credentials and portal authentication</p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Updating...' : 'Update Profile'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Administrator Name</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Login Email</label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Password <span className="text-slate-400 font-normal">(needed if changing password)</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={profile.currentPassword}
                onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={profile.newPassword}
                onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>
        </form>

        {/* Database & Architecture Status Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/30 border border-blue-400/30 rounded-2xl text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Database Engine: SQLite (better-sqlite3)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Fully persistent relational storage in <code className="font-mono text-blue-300">backend/library.db</code> • Zero external server dependency
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right text-xs text-slate-400">
            <p className="font-semibold text-slate-300">WAL Mode & Foreign Keys</p>
            <p>Active & Enforced</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { UserRole, LabNotification, AuthSession } from '../types';
import { Monitor, Calendar, Receipt, BarChart3, Database, Bell, Lock, LogOut, Clock, Printer } from 'lucide-react';

interface TopNavbarProps {
  currentTab: 'topology' | 'booking' | 'print_order' | 'cashier' | 'admin' | 'sql' | 'stats';
  onSelectTab: (tab: 'topology' | 'booking' | 'print_order' | 'cashier' | 'admin' | 'sql' | 'stats') => void;
  authSession: AuthSession;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  activeCount: number;
  availableCount: number;
  notifications: LabNotification[];
  onOpenNotifications: () => void;
  onOpenStats: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  onSelectTab,
  authSession,
  onOpenLoginModal,
  onLogout,
  activeCount,
  availableCount,
  notifications,
  onOpenNotifications,
  onOpenStats,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Brand Wordmark with Red & Orange Theme */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-md shadow-red-500/20 text-white font-black text-lg border border-red-400">
              S1S
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-tight">
                USMAN NetPrint
              </span>
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="text-emerald-700 font-bold tabular-nums">{availableCount} Kosong</span>
                <span className="text-slate-300">|</span>
                <span className="text-red-600 font-bold tabular-nums">{activeCount} Terpakai</span>
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold">
            {/* FRONTEND SISWA LINKS */}
            <button
              onClick={() => onSelectTab('topology')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                currentTab === 'topology'
                  ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                  : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'
              }`}
            >
              <Monitor className="w-4 h-4 text-red-500" />
              <span>Topologi Labkom</span>
            </button>

            <button
              onClick={() => onSelectTab('booking')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                currentTab === 'booking'
                  ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                  : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>Booking Siswa</span>
            </button>

            <button
              onClick={() => onSelectTab('print_order')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                currentTab === 'print_order'
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                  : 'text-slate-600 hover:text-orange-600 hover:bg-slate-50'
              }`}
            >
              <Printer className="w-4 h-4 text-orange-500" />
              <span>Pesan Cetak Dokumen</span>
            </button>

            {/* BACKEND OPERATOR / ADMIN LINKS (Accessible directly if logged in) */}
            {authSession.isLoggedIn && (
              <>
                <button
                  onClick={() => onSelectTab('cashier')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                    currentTab === 'cashier'
                      ? 'bg-red-100 text-red-700 border border-red-300 shadow-xs'
                      : 'text-red-700 hover:text-red-800 hover:bg-red-50'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Kasir &amp; Check-in</span>
                </button>

                {authSession.role === 'admin' && (
                  <>
                    <button
                      onClick={() => onSelectTab('admin')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                        currentTab === 'admin'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300 shadow-xs'
                          : 'text-orange-800 hover:text-orange-900 hover:bg-orange-50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Admin &amp; Laporan</span>
                    </button>

                    <button
                      onClick={() => onSelectTab('sql')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                        currentTab === 'sql'
                          ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      <span>Supabase &amp; SQL</span>
                    </button>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Zone 3: Controls & Authentication Status */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Student Real-time Asset Stats */}
            <button
              onClick={onOpenStats}
              title="Statistik Penggunaan Lab Real-Time"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden sm:inline">Statistik Aset</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              title="Notifikasi Sistem"
              className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
            >
              <Bell className="w-4 h-4 text-red-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Authentication Button: Login or Logout */}
            {authSession.isLoggedIn ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 pl-3 rounded-xl shadow-2xs">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">
                    {authSession.role === 'admin' ? 'Administrator' : 'Operator Kasir'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    @{authSession.username}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout Petugas"
                  className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-500/20 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login Petugas</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => onSelectTab('topology')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
              currentTab === 'topology' ? 'text-red-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Topologi</span>
          </button>
          <button
            onClick={() => onSelectTab('booking')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
              currentTab === 'booking' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Booking</span>
          </button>
          <button
            onClick={() => onSelectTab('print_order')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
              currentTab === 'print_order' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
          {authSession.isLoggedIn && (
            <button
              onClick={() => onSelectTab('cashier')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
                currentTab === 'cashier' ? 'text-red-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Kasir</span>
            </button>
          )}
          {authSession.isLoggedIn && authSession.role === 'admin' && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
                currentTab === 'admin' ? 'text-orange-600 font-bold' : 'text-slate-500'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

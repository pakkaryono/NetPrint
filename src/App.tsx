import React, { useState, useEffect } from 'react';
import { labStore } from './services/store';
import { ComputerUnit, Booking, LabSettings, Student, UserRole, LabNotification, AuthSession } from './types';
import { TopNavbar } from './components/TopNavbar';
import { LabTopology } from './components/LabTopology';
import { StudentBooking } from './components/StudentBooking';
import { StudentPrintOrder } from './components/StudentPrintOrder';
import { CashierPortal } from './components/CashierPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { SqlEditorModal } from './components/SqlEditorModal';
import { ReceiptModal } from './components/ReceiptModal';
import { StudentStatsModal } from './components/StudentStatsModal';
import { NotificationToast } from './components/NotificationToast';
import { LoginModal } from './components/LoginModal';
import { AlertTriangle, Clock, Lock, Sparkles, UserCheck } from 'lucide-react';

export default function App() {
  const [computers, setComputers] = useState<ComputerUnit[]>(labStore.getComputers());
  const [bookings, setBookings] = useState<Booking[]>(labStore.getBookings());
  const [settings, setSettings] = useState<LabSettings>(labStore.getSettings());
  const [students, setStudents] = useState<Student[]>(labStore.getStudents());
  const [notifications, setNotifications] = useState<LabNotification[]>(labStore.getNotifications());
  const [authSession, setAuthSession] = useState<AuthSession>(labStore.getAuthSession());

  // Navigation & View tabs
  const [currentTab, setCurrentTab] = useState<'topology' | 'booking' | 'print_order' | 'cashier' | 'admin' | 'sql' | 'stats'>('topology');

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [preSelectedCompId, setPreSelectedCompId] = useState<string | null>(null);
  const [prefilledBookingCode, setPrefilledBookingCode] = useState<string | undefined>(undefined);
  const [activeReceiptBooking, setActiveReceiptBooking] = useState<Booking | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Subscribe to reactive store
  useEffect(() => {
    const unsubscribe = labStore.subscribe(() => {
      setComputers([...labStore.getComputers()]);
      setBookings([...labStore.getBookings()]);
      setSettings({ ...labStore.getSettings() });
      setStudents([...labStore.getStudents()]);
      setNotifications([...labStore.getNotifications()]);
      setAuthSession({ ...labStore.getAuthSession() });
    });
    return () => unsubscribe();
  }, []);

  const availableCount = computers.filter((c) => c.status === 'available').length;
  const activeCount = computers.filter((c) => c.status === 'in_use').length;

  // Warning computers (< 10 minutes) - Notifikasi 1/2
  const warningComputers = computers.filter((c) => {
    if (c.status !== 'in_use' || !c.sessionEndTime) return false;
    const diffMs = new Date(c.sessionEndTime).getTime() - new Date().getTime();
    return diffMs > 0 && diffMs <= 10 * 60 * 1000;
  });

  // Expired computers (Waktu Habis) - Notifikasi 2/2
  const expiredComputers = computers.filter((c) => {
    if (c.status !== 'in_use' || !c.sessionEndTime) return false;
    const diffMs = new Date(c.sessionEndTime).getTime() - new Date().getTime();
    return diffMs <= 0;
  });

  // Handle Tab Selection with Protected Backend Route Checking
  const handleSelectTab = (tab: 'topology' | 'booking' | 'print_order' | 'cashier' | 'admin' | 'sql' | 'stats') => {
    if ((tab === 'cashier' || tab === 'admin' || tab === 'sql') && !authSession.isLoggedIn) {
      setIsLoginModalOpen(true);
      return;
    }
    if ((tab === 'admin' || tab === 'sql') && authSession.isLoggedIn && authSession.role !== 'admin') {
      alert('Akses Admin terbatas untuk Koordinator USMAN. Silakan login sebagai administrator (admin/gripil).');
      setIsLoginModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  const handleSelectComputerToBook = (compId: string) => {
    setPreSelectedCompId(compId);
    setCurrentTab('booking');
  };

  const handleOpenCashierWithCode = (code: string) => {
    setPrefilledBookingCode(code);
    if (!authSession.isLoggedIn) {
      setIsLoginModalOpen(true);
    } else {
      setCurrentTab('cashier');
    }
  };

  const handleLoginSuccess = (role: 'operator' | 'admin') => {
    if (role === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('cashier');
    }
  };

  const handleLogout = () => {
    labStore.logout();
    setCurrentTab('topology');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navbar */}
      <TopNavbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        authSession={authSession}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        activeCount={activeCount}
        availableCount={availableCount}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      {/* Notifikasi 1/2: 10-Minute Warning Banner */}
      {warningComputers.length > 0 && (
        <div className="bg-orange-100 border-b border-orange-300 px-4 py-2.5 text-center text-xs text-orange-950 flex items-center justify-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 animate-pulse" />
          <span>
            <strong>Peringatan 10 Menit Sistem (Notifikasi 1/2):</strong> Unit{' '}
            <span className="font-mono font-bold text-red-700 underline">
              {warningComputers.map((c) => c.code).join(', ')}
            </span>{' '}
            tersisa kurang dari 10 menit! Harap simpan semua berkas dan bersiap menuju kasir.
          </span>
        </div>
      )}

      {/* Notifikasi 2/2: Waktu Habis Banner */}
      {expiredComputers.length > 0 && (
        <div className="bg-red-100 border-b border-red-300 px-4 py-2.5 text-center text-xs text-red-950 flex items-center justify-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
          <span>
            <strong>Waktu Pemakaian Habis (Notifikasi 2/2):</strong> Sesi di unit{' '}
            <span className="font-mono font-bold text-red-700 underline">
              {expiredComputers.map((c) => c.code).join(', ')}
            </span>{' '}
            telah selesai. Pengguna dipersilakan menuju kasir untuk pelunasan pembayaran &amp; cetak dokumen.
          </span>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'topology' && (
          <LabTopology
            computers={computers}
            currentRole={authSession.role}
            onSelectComputerToBook={handleSelectComputerToBook}
            onOpenCashierWithCode={handleOpenCashierWithCode}
          />
        )}

        {currentTab === 'booking' && (
          <StudentBooking
            computers={computers}
            settings={settings}
            bookings={bookings}
            students={students}
            preSelectedComputerId={preSelectedCompId}
            onClearPreSelected={() => setPreSelectedCompId(null)}
            onViewReceipt={(b) => setActiveReceiptBooking(b)}
            onGoToPrintOrder={(code) => {
              setPrefilledBookingCode(code);
              setCurrentTab('print_order');
            }}
          />
        )}

        {currentTab === 'print_order' && (
          <StudentPrintOrder
            bookings={bookings}
            settings={settings}
            computers={computers}
            prefilledBookingCode={prefilledBookingCode}
          />
        )}

        {currentTab === 'cashier' && (
          <CashierPortal
            bookings={bookings}
            settings={settings}
            computers={computers}
            prefilledBookingCode={prefilledBookingCode}
            onClearPrefilledCode={() => setPrefilledBookingCode(undefined)}
            onViewReceipt={(b) => setActiveReceiptBooking(b)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            bookings={bookings}
            settings={settings}
            computers={computers}
            students={students}
            onViewReceipt={(b) => setActiveReceiptBooking(b)}
          />
        )}

        {currentTab === 'sql' && <SqlEditorModal />}
      </main>

      {/* Footer in White Theme */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-slate-600 font-medium">
            Laboratorium Komputer 1 · <strong>SMK Negeri 1 Songgom</strong> (Brebes, Jawa Tengah)
          </div>
          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>28 Unit Komputer</span>
            <span>·</span>
            <span>Toleransi Hadir 5 Menit</span>
            <span>·</span>
            <span>Bayar Selesai &amp; Cetak Dokumen</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {activeReceiptBooking && (
        <ReceiptModal
          booking={activeReceiptBooking}
          settings={settings}
          currentRole={authSession.role}
          onClose={() => setActiveReceiptBooking(null)}
        />
      )}

      {isStatsOpen && (
        <StudentStatsModal
          computers={computers}
          students={students}
          bookings={bookings}
          onClose={() => setIsStatsOpen(false)}
        />
      )}

      <NotificationToast
        notifications={notifications}
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onMarkRead={(id) => labStore.markNotificationAsRead(id)}
        onClearAll={() => labStore.clearAllNotifications()}
      />
    </div>
  );
}

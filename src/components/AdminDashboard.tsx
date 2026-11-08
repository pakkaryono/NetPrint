import React, { useState } from 'react';
import { Booking, LabSettings, ComputerUnit, Student } from '../types';
import { labStore } from '../services/store';
import { formatRupiah, generateFinancialReportPDF, exportTransactionsToCSV } from '../services/pdfExport';
import {
  BarChart3,
  Settings,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Shield,
  Printer,
  Clock,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Users,
  Monitor,
  Trash2,
  Pencil,
  X,
  Save,
  UserCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  bookings: Booking[];
  settings: LabSettings;
  computers: ComputerUnit[];
  students: Student[];
  onViewReceipt: (booking: Booking) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  settings,
  computers,
  students,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'history' | 'students'>('overview');

  // Filter for Transaction History
  const [searchHistory, setSearchHistory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Filter for Students List
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Edit Booking Modal State
  const [editingBooking, setEditingBooking] = useState<{
    id: string;
    bookingCode: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    durationHours: 1 | 2 | 3;
    studentName: string;
    studentNisn: string;
    studentClass: string;
    purpose: string;
    computerCode: string;
    computerCost: number;
    printPagesBw: number;
    printPagesColor: number;
    printCost: number;
    totalCost: number;
    status: Booking['status'];
    paymentStatus: 'unpaid' | 'paid';
  } | null>(null);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Editable Settings State
  const [editSettings, setEditSettings] = useState<LabSettings>({ ...settings });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Reliable in-app Confirmation & Feedback for iFrame
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [adminToastMsg, setAdminToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync settings when props change
  React.useEffect(() => {
    setEditSettings({ ...settings });
  }, [settings]);

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    labStore.updateSettings(editSettings);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Handle Midnight Reset
  const handleTriggerMidnightReset = () => {
    if (
      window.confirm(
        'Jalankan simulasi Reset Otomatis Pukul 00:00 WIB sekarang? Seluruh booking yang lewat hari dan pending akan dibatalkan, dan unit komputer yang aktif akan disinkronisasi kembali ke status normal.'
      )
    ) {
      labStore.executeMidnightReset();
      alert('Reset harian sistem lab pukul 00:00 WIB berhasil dieksekusi!');
    }
  };

  // Handle Admin Cancel Booking (Bebaskan PC & Hapus Bukti Booking Permanen)
  const handleAdminCancelBooking = (bookingCode: string) => {
    setConfirmDeleteModal({
      title: 'Batalkan Pemesanan',
      message: `Batalkan pemesanan ${bookingCode}? Booking akan dihapus secara permanen dari sistem dan unit PC akan langsung kembali tersedia (HIJAU).`,
      onConfirm: () => {
        const res = labStore.operatorCancelBooking(bookingCode, 'Dibatalkan oleh Administrator Lab');
        setAdminToastMsg({ type: res.success ? 'success' : 'error', text: res.message });
        setConfirmDeleteModal(null);
      },
    });
  };

  // Open Edit Booking Modal
  const handleOpenEditBooking = (b: Booking) => {
    setEditingBooking({
      id: b.id,
      bookingCode: b.bookingCode,
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: b.durationHours,
      studentName: b.studentName,
      studentNisn: b.studentNisn,
      studentClass: b.studentClass,
      purpose: b.purpose || '',
      computerCode: b.computerCode,
      computerCost: b.computerCost,
      printPagesBw: b.printPagesBw || 0,
      printPagesColor: b.printPagesColor || 0,
      printCost: b.printCost || 0,
      totalCost: b.totalCost,
      status: b.status,
      paymentStatus: b.paymentStatus,
    });
  };

  // Save Edit Booking
  const handleSaveEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const res = labStore.updateBooking(editingBooking.id, {
      bookingCode: editingBooking.bookingCode.trim(),
      bookingDate: editingBooking.bookingDate,
      startTime: editingBooking.startTime,
      endTime: editingBooking.endTime,
      durationHours: editingBooking.durationHours,
      studentName: editingBooking.studentName.trim(),
      studentNisn: editingBooking.studentNisn.trim(),
      studentClass: editingBooking.studentClass,
      purpose: editingBooking.purpose.trim(),
      computerCode: editingBooking.computerCode,
      computerCost: Number(editingBooking.computerCost),
      printPagesBw: Number(editingBooking.printPagesBw),
      printPagesColor: Number(editingBooking.printPagesColor),
      printCost: Number(editingBooking.printCost),
      totalCost: Number(editingBooking.totalCost),
      status: editingBooking.status,
      paymentStatus: editingBooking.paymentStatus,
    });

    if (res.success) {
      alert('Data transaksi pemesanan berhasil diperbarui!');
      setEditingBooking(null);
    } else {
      alert(res.message);
    }
  };

  // Permanent Delete Booking
  const handleDeleteBookingPermanent = (b: Booking) => {
    setConfirmDeleteModal({
      title: 'Hapus Transaksi Permanen',
      message: `Hapus transaksi ${b.bookingCode} untuk ${b.studentName} secara permanen? Data akan dihapus dari sistem dan unit PC ${b.computerCode} akan langsung dibebaskan.`,
      onConfirm: () => {
        const res = labStore.deleteBookingPermanent(b.id);
        setAdminToastMsg({ type: res.success ? 'success' : 'error', text: res.message });
        setConfirmDeleteModal(null);
      },
    });
  };

  // Open Edit Student Modal
  const handleOpenEditStudent = (s: Student) => {
    setEditingStudent({ ...s });
  };

  // Save Edit Student
  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const res = labStore.updateStudent(editingStudent.nisn, {
      name: editingStudent.name.trim(),
      className: editingStudent.className,
      purpose: editingStudent.purpose?.trim(),
      phone: editingStudent.phone?.trim(),
      email: editingStudent.email?.trim(),
    });

    if (res.success) {
      setAdminToastMsg({ type: 'success', text: 'Data siswa berhasil diperbarui!' });
      setEditingStudent(null);
    } else {
      setAdminToastMsg({ type: 'error', text: res.message });
    }
  };

  // Delete Student
  const handleDeleteStudent = (s: Student) => {
    setConfirmDeleteModal({
      title: 'Hapus Data Siswa',
      message: `Hapus data siswa ${s.name} (${s.nisn}) dari sistem secara permanen?`,
      onConfirm: () => {
        const res = labStore.deleteStudent(s.nisn);
        setAdminToastMsg({ type: res.success ? 'success' : 'error', text: res.message });
        setConfirmDeleteModal(null);
      },
    });
  };

  // KPIs
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = paidBookings.filter((b) => b.bookingDate === todayStr);

  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.totalCost, 0);
  const totalRentalRevenue = paidBookings.reduce((sum, b) => sum + b.computerCost, 0);
  const totalPrintRevenue = paidBookings.reduce((sum, b) => sum + b.printCost, 0);
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.totalCost, 0);
  const totalHoursUsed = paidBookings.reduce((sum, b) => sum + b.durationHours, 0);
  const totalPagesPrinted = paidBookings.reduce(
    (sum, b) => sum + (b.printPagesBw + b.printPagesColor),
    0
  );

  // Monthly breakdown for chart
  const monthlyData = [
    { month: 'Jul 2026', rental: 640000, print: 185000, total: 825000, hours: 140 },
    { month: 'Agu 2026', rental: 890000, print: 260000, total: 1150000, hours: 210 },
    { month: 'Sep 2026', rental: 1120000, print: 345000, total: 1465000, hours: 280 },
    { month: 'Okt 2026', rental: 1350000, print: 420000, total: 1770000, hours: 320 },
    {
      month: 'Nov 2026',
      rental: totalRentalRevenue,
      print: totalPrintRevenue,
      total: totalRevenue,
      hours: totalHoursUsed,
    },
  ];

  const maxMonthVal = Math.max(...monthlyData.map((m) => m.total)) * 1.15;

  // Filtered History
  const filteredHistory = bookings.filter((b) => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterDate && b.bookingDate !== filterDate) return false;
    if (searchHistory) {
      const q = searchHistory.toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.studentName.toLowerCase().includes(q) ||
        b.studentNisn.toLowerCase().includes(q) ||
        b.computerCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Panel Kontrol Administrator
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">SMK Negeri 1 Songgom</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Manajemen Lab &amp; Laporan Keuangan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Kelola fleksibilitas tarif sewa &amp; cetak, pantau grafik pendapatan bulanan, ekspor rekapitulasi PDF/Excel, dan reset harian 00:00 WIB.
            </p>
          </div>

          {/* Quick Action Reset 00:00 WIB */}
          <button
            onClick={handleTriggerMidnightReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl text-xs font-bold transition-all shrink-0 shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <span>Simulasi Reset 00:00 WIB</span>
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeTab === 'overview'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Grafik &amp; Ringkasan Eksekutif</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Riwayat Transaksi &amp; Ekspor</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeTab === 'students'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Siswa Pemesan ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeTab === 'settings'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Tarif &amp; Aturan Lab</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & MONTHLY REVENUE CHART */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 text-xs font-semibold flex items-center justify-between">
                <span>Total Pendapatan Lab</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 mt-2">
                {formatRupiah(totalRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Hari ini: <span className="text-emerald-700 font-bold">{formatRupiah(todayRevenue)}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 text-xs font-semibold flex items-center justify-between">
                <span>Total Jam Tersewa</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 mt-2">
                {totalHoursUsed} Jam
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dari <strong className="text-slate-800">{paidBookings.length}</strong> transaksi sukses
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 text-xs font-semibold flex items-center justify-between">
                <span>Cetak Dokumen</span>
                <Printer className="w-4 h-4 text-orange-500" />
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-orange-600 mt-2">
                {totalPagesPrinted} Lembar
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Omset: <span className="text-orange-600 font-bold">{formatRupiah(totalPrintRevenue)}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 text-xs font-semibold flex items-center justify-between">
                <span>Siswa Terdaftar</span>
                <Users className="w-4 h-4 text-red-600" />
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-red-600 mt-2">
                {students.length} Siswa
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                RPL, TKJ, AKL &amp; TKR
              </div>
            </div>
          </div>

          {/* MONTHLY REVENUE BAR & STACKED CHART */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-600" />
                  Grafik Pendapatan Bulanan Laboratorium Komputer
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Komparasi pendapatan sewa komputer per jam vs layanan cetak dokumen per lembar.
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-600" />
                  <span className="text-slate-700">Sewa Komputer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-orange-500" />
                  <span className="text-slate-700">Cetak Dokumen</span>
                </div>
              </div>
            </div>

            {/* Custom SVG/HTML Bar Chart Visualization */}
            <div className="grid grid-cols-5 gap-3 sm:gap-6 pt-6 pb-2 items-end h-64 border-b border-slate-200">
              {monthlyData.map((data, idx) => {
                const totalHeightPct = Math.round((data.total / maxMonthVal) * 100);
                const rentalPct = Math.round((data.rental / (data.total || 1)) * 100);
                const printPct = 100 - rentalPct;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] text-slate-600 font-mono mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      {formatRupiah(data.total)}
                    </div>
                    <div
                      style={{ height: `${totalHeightPct}%` }}
                      className="w-full max-w-[54px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-500 group-hover:brightness-105 shadow-sm"
                    >
                      {/* Print portion (orange top) */}
                      <div
                        style={{ height: `${printPct}%` }}
                        className="bg-orange-500 w-full"
                        title={`Cetak: ${formatRupiah(data.print)}`}
                      />
                      {/* Rental portion (red bottom) */}
                      <div
                        style={{ height: `${rentalPct}%` }}
                        className="bg-red-600 w-full"
                        title={`Sewa: ${formatRupiah(data.rental)}`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-3 font-mono">
                      {data.month}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {data.hours} Jam
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTION HISTORY & EXPORTS */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Riwayat Transaksi Pemakaian Lab</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar lengkap seluruh sesi peminjaman komputer dan biaya cetak dokumen SMKN 1 Songgom.
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportTransactionsToCSV(filteredHistory)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel (CSV)</span>
              </button>

              <button
                onClick={async () => {
                  await generateFinancialReportPDF(filteredHistory, settings, 'Bulan Berjalan 2026');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>Cetak Laporan PDF</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Pencarian Data:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder="Kode / NISN / Nama / Unit..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Status Sesi:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Sedang Aktif</option>
                <option value="completed">Selesai</option>
                <option value="pending_payment">Menunggu Kasir</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Filter Tanggal:</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Kode Transaksi</th>
                  <th className="py-3 px-3">Tanggal &amp; Jam</th>
                  <th className="py-3 px-3">Siswa</th>
                  <th className="py-3 px-2.5">Kelas</th>
                  <th className="py-3 px-3">Keperluan</th>
                  <th className="py-3 px-2">Unit / Durasi</th>
                  <th className="py-3 px-3">Biaya Sewa</th>
                  <th className="py-3 px-3">Cetak Dokumen</th>
                  <th className="py-3 px-3 text-right">Total Tagihan</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-sans">
                      Tidak ada transaksi yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{b.bookingCode}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        <div>{b.bookingDate}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {b.startTime} - {b.endTime} WIB
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900 whitespace-nowrap">{b.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NISN: {b.studentNisn}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 font-sans font-bold text-slate-800 whitespace-nowrap">
                        {b.studentClass}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-xs text-slate-700 min-w-[140px] max-w-[200px] break-words">
                        {b.purpose && b.purpose !== '-' ? (
                          <span className="text-orange-950 font-medium bg-orange-50/90 px-2 py-0.5 rounded-md border border-orange-200 block text-[11px]">
                            {b.purpose}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-red-600 whitespace-nowrap">
                        <div>{b.computerCode}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {b.durationHours} Jam
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {formatRupiah(b.computerCost)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {b.printPagesBw + b.printPagesColor > 0 ? (
                          <span className="text-orange-600 font-bold">
                            {b.printPagesBw + b.printPagesColor} lbr ({formatRupiah(b.printCost)})
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-red-600">
                        {formatRupiah(b.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'active'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : b.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : b.status === 'booked_waiting_checkin'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : b.status === 'awaiting_payment'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {b.status === 'active'
                            ? 'Aktif'
                            : b.status === 'completed'
                            ? 'Lunas'
                            : b.status === 'booked_waiting_checkin'
                            ? 'Tunggu Hadir'
                            : b.status === 'awaiting_payment'
                            ? 'Selesai/Bayar'
                            : 'Batal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewReceipt(b)}
                            title="Cetak Struk Resmi (Admin)"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-600 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-600" />
                          </button>

                          <button
                            onClick={() => handleOpenEditBooking(b)}
                            title="Edit Data Transaksi (Kode, Jadwal, Siswa, Unit, Biaya, Cetak, Total, Status)"
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 hover:border-orange-400 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-orange-600" />
                          </button>

                          <button
                            onClick={() => handleDeleteBookingPermanent(b)}
                            title="Hapus Transaksi Permanen &amp; Bebaskan PC"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & PRICING */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto">
          <div className="mb-6 pb-4 border-b border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-600" />
              Pengaturan Tarif &amp; Aturan Peminjaman Lab
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Atur tarif sewa fleksibel per durasi jam, tarif cetak dokumen per lembar, jeda antarpemesanan (cooldown), dan waktu toleransi pembatalan.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Tarif Sewa Komputer Fleksibel */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3">
                1. Tarif Fleksibel Sewa Komputer
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif 1 Jam (IDR):
                  </label>
                  <input
                    type="number"
                    value={editSettings.rate1Hour}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, rate1Hour: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif 2 Jam (IDR):
                  </label>
                  <input
                    type="number"
                    value={editSettings.rate2Hours}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, rate2Hours: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif 3 Jam (IDR):
                  </label>
                  <input
                    type="number"
                    value={editSettings.rate3Hours}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, rate3Hours: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Tarif Cetak Dokumen Fleksibel */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-3">
                2. Tarif Layanan Cetak Dokumen (Printer)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif Hitam Putih (B&amp;W) per Lembar:
                  </label>
                  <input
                    type="number"
                    value={editSettings.printRateBw}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        printRateBw: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif Warna (Full Color) per Lembar:
                  </label>
                  <input
                    type="number"
                    value={editSettings.printRateColor}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        printRateColor: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Parameter Waktu & Aturan Siswa */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3">
                3. Kebijakan &amp; Durasi Batas Siswa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cooldown Booking (Hari):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={editSettings.cooldownDays}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        cooldownDays: parseInt(e.target.value) || 2,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Default: 2 hari jeda agar siswa lain bergantian memakai lab.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Pembatalan (Menit):
                  </label>
                  <input
                    type="number"
                    value={editSettings.cancellationGraceMinutes}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        cancellationGraceMinutes: parseInt(e.target.value) || 15,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Batas cancel mandiri siswa sebelum jadwal mulai (15 mnt).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Toleransi Hadir (Menit):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editSettings.lateCheckInTimeoutMinutes}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        lateCheckInTimeoutMinutes: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Lewat batas ini saat jadwal tiba, PC direset otomatis ke hijau (5 mnt).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pengingat Selesai (Menit):
                  </label>
                  <input
                    type="number"
                    value={editSettings.warningNoticeMinutes}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        warningNoticeMinutes: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Notifikasi &amp; suara chime (10 mnt sebelum habis).
                  </span>
                </div>
              </div>
            </div>

            {/* Identitas Laboratorium & Petugas */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                4. Informasi Sekolah &amp; Penandatangan Struk
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Laboratorium:
                  </label>
                  <input
                    type="text"
                    value={editSettings.labName}
                    onChange={(e) => setEditSettings({ ...editSettings, labName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Koordinator USMAN:
                  </label>
                  <input
                    type="text"
                    value={editSettings.adminStaff}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, adminStaff: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Operator:
                  </label>
                  <input
                    type="text"
                    value={editSettings.operatorStaff}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, operatorStaff: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan berhasil disimpan ke sistem dan aktif secara instan!</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-red-500/20"
              >
                Simpan Perubahan Pengaturan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: DATA SISWA PEMESAN (OPERATOR & ADMIN VIEW) */}
      {activeTab === 'students' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Database Siswa Pemesan Komputer Lab</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Data siswa yang memesan tersimpan di sistem. Administrator dan operator dapat melakukan edit maupun penghapusan data jika diperlukan.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Cari Nama / NISN / Kelas..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">NISN</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Keperluan Pemesan</th>
                  <th className="py-3 px-3 text-center">Total Booking</th>
                  <th className="py-3 px-3 text-center">Total Jam</th>
                  <th className="py-3 px-3">Terakhir Booking</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {students
                  .filter((s) => {
                    if (!searchStudent) return true;
                    const q = searchStudent.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.nisn.toLowerCase().includes(q) ||
                      s.className.toLowerCase().includes(q) ||
                      (s.purpose && s.purpose.toLowerCase().includes(q))
                    );
                  })
                  .map((s) => (
                    <tr key={s.nisn} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-red-600">{s.nisn}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {s.purpose || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {s.totalBookings}x
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-orange-600 font-bold">
                        {s.totalHoursUsed} Jam
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {s.lastBookingDate || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditStudent(s)}
                            title="Edit Data Siswa"
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s)}
                            title="Hapus Data Siswa"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT TRANSAKSI / BOOKING LENGKAP (8 FIELD SESUAI PERMINTAAN USER) */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-slate-800 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Data Transaksi: {editingBooking.bookingCode}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Koreksi data pemesanan, jam sewa, siswa, unit komputer, biaya, atau status transaksi jika ada kesalahan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBooking} className="mt-4 space-y-4 text-xs">
              {/* 1. Kode Transaksi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">1. Kode Transaksi (Booking Code):</label>
                <input
                  type="text"
                  required
                  value={editingBooking.bookingCode}
                  onChange={(e) => setEditingBooking({ ...editingBooking, bookingCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* 2. Tanggal & Jam */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">2. Tanggal &amp; Jam Pemakaian:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Tanggal:</label>
                    <input
                      type="date"
                      required
                      value={editingBooking.bookingDate}
                      onChange={(e) => setEditingBooking({ ...editingBooking, bookingDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Jam Mulai (WIB):</label>
                    <input
                      type="text"
                      required
                      value={editingBooking.startTime}
                      onChange={(e) => setEditingBooking({ ...editingBooking, startTime: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      placeholder="08:00"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Jam Selesai (WIB):</label>
                    <input
                      type="text"
                      required
                      value={editingBooking.endTime}
                      onChange={(e) => setEditingBooking({ ...editingBooking, endTime: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      placeholder="09:00"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Durasi (Jam):</label>
                    <select
                      value={editingBooking.durationHours}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          durationHours: Number(e.target.value) as 1 | 2 | 3,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                    >
                      <option value={1}>1 Jam</option>
                      <option value={2}>2 Jam</option>
                      <option value={3}>3 Jam</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Siswa & Kelas */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">3. Siswa &amp; Kelas:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Nama Lengkap Siswa:</label>
                    <input
                      type="text"
                      required
                      value={editingBooking.studentName}
                      onChange={(e) => setEditingBooking({ ...editingBooking, studentName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">NISN (10 Digit):</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={editingBooking.studentNisn}
                      onChange={(e) => setEditingBooking({ ...editingBooking, studentNisn: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Kelas:</label>
                    <select
                      value={editingBooking.studentClass}
                      onChange={(e) => setEditingBooking({ ...editingBooking, studentClass: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="XII TKJ 1">XII TKJ 1</option>
                      <option value="XII TKJ 2">XII TKJ 2</option>
                      <option value="XII TKJ 3">XII TKJ 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Keperluan Pemesan:</label>
                    <input
                      type="text"
                      value={editingBooking.purpose}
                      onChange={(e) => setEditingBooking({ ...editingBooking, purpose: e.target.value })}
                      placeholder="Praktik ASJ, Tugas Jaringan, dll."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Unit Komputer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">4. Unit Komputer (PC):</label>
                  <select
                    value={editingBooking.computerCode}
                    onChange={(e) => setEditingBooking({ ...editingBooking, computerCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-red-600 focus:outline-none focus:border-red-500"
                  >
                    {computers.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.label}) - Row {c.row} {c.section}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Biaya Sewa */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">5. Biaya Sewa Komputer (Rp):</label>
                  <input
                    type="number"
                    min={0}
                    value={editingBooking.computerCost}
                    onChange={(e) => setEditingBooking({ ...editingBooking, computerCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* 6. Cetak Dokumen */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">6. Layanan Cetak Dokumen:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const bwCost = editingBooking.printPagesBw * settings.printRateBw;
                      const clCost = editingBooking.printPagesColor * settings.printRateColor;
                      const printCost = bwCost + clCost;
                      setEditingBooking({
                        ...editingBooking,
                        printCost,
                        totalCost: editingBooking.computerCost + printCost,
                      });
                    }}
                    className="text-[11px] text-orange-600 font-bold hover:underline"
                  >
                    Hitung Ulang Tarif Cetak
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Lembar B&amp;W:</label>
                    <input
                      type="number"
                      min={0}
                      value={editingBooking.printPagesBw}
                      onChange={(e) => setEditingBooking({ ...editingBooking, printPagesBw: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Lembar Warna:</label>
                    <input
                      type="number"
                      min={0}
                      value={editingBooking.printPagesColor}
                      onChange={(e) => setEditingBooking({ ...editingBooking, printPagesColor: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Total Biaya Cetak (Rp):</label>
                    <input
                      type="number"
                      min={0}
                      value={editingBooking.printCost}
                      onChange={(e) => setEditingBooking({ ...editingBooking, printCost: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-orange-600 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Total Tagihan & 8. Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">7. Total Tagihan (Rp):</label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingBooking({
                          ...editingBooking,
                          totalCost: editingBooking.computerCost + editingBooking.printCost,
                        })
                      }
                      className="text-[10px] text-red-600 font-bold hover:underline"
                    >
                      Auto
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={editingBooking.totalCost}
                    onChange={(e) => setEditingBooking({ ...editingBooking, totalCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-black text-red-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">8a. Status Pemesanan:</label>
                  <select
                    value={editingBooking.status}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        status: e.target.value as Booking['status'],
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  >
                    <option value="booked_waiting_checkin">Tunggu Hadir (Booked)</option>
                    <option value="active">Sedang Aktif (In Use)</option>
                    <option value="awaiting_payment">Selesai / Menunggu Kasir</option>
                    <option value="completed">Lunas &amp; Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">8b. Status Bayar:</label>
                  <select
                    value={editingBooking.paymentStatus}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        paymentStatus: e.target.value as 'unpaid' | 'paid',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  >
                    <option value="unpaid">Belum Lunas (Unpaid)</option>
                    <option value="paid">Lunas (Paid)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Transaksi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DATA SISWA */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Edit Data Siswa ({editingStudent.nisn})
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Siswa:</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kelas:</label>
                <select
                  value={editingStudent.className}
                  onChange={(e) => setEditingStudent({ ...editingStudent, className: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-red-500"
                >
                  <option value="XII TKJ 1">XII TKJ 1</option>
                  <option value="XII TKJ 2">XII TKJ 2</option>
                  <option value="XII TKJ 3">XII TKJ 3</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keperluan Pemesan:</label>
                <input
                  type="text"
                  value={editingStudent.purpose || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, purpose: e.target.value })}
                  placeholder="Praktik ASJ, Tugas Jaringan..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp:</label>
                <input
                  type="text"
                  value={editingStudent.phone || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Sekolah:</label>
                <input
                  type="email"
                  value={editingStudent.email || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Data Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (Guaranteed to work in iframe) */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{confirmDeleteModal.title}</h3>
                <p className="text-xs text-slate-500">Tindakan ini permanen dan langsung memperbarui denah lab.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              {confirmDeleteModal.message}
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmDeleteModal.onConfirm}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Ya, Hapus Sekarang
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TOAST NOTIFICATION */}
      {adminToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
              adminToastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <CheckCircle2
              className={`w-5 h-5 shrink-0 ${
                adminToastMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
            <div className="flex-1 text-xs font-medium leading-relaxed">
              {adminToastMsg.text}
            </div>
            <button
              onClick={() => setAdminToastMsg(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

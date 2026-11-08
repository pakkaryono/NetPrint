import React, { useState } from 'react';
import { Booking, LabSettings, ComputerUnit } from '../types';
import { labStore } from '../services/store';
import { formatRupiah, generateReceiptPDF } from '../services/pdfExport';
import {
  Receipt,
  Scan,
  Printer,
  CheckCircle2,
  DollarSign,
  User,
  Monitor,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  Calculator,
  UserCheck,
  AlertTriangle,
  Pencil,
  Trash2,
  Users,
  X,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CashierPortalProps {
  bookings: Booking[];
  settings: LabSettings;
  computers: ComputerUnit[];
  prefilledBookingCode?: string;
  onClearPrefilledCode?: () => void;
  onViewReceipt: (booking: Booking) => void;
}

export const CashierPortal: React.FC<CashierPortalProps> = ({
  bookings,
  settings,
  computers,
  prefilledBookingCode,
  onClearPrefilledCode,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(prefilledBookingCode || '');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Print adjustments at checkout
  const [printPagesBw, setPrintPagesBw] = useState<number>(0);
  const [printPagesColor, setPrintPagesColor] = useState<number>(0);

  // Cash payment fields
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [operatorStaffName, setOperatorStaffName] = useState<string>(settings.operatorStaff);
  const [cashierStatusMsg, setCashierStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Operator view tab
  const [activePortalTab, setActivePortalTab] = useState<'billing' | 'student_bookings'>('billing');
  const [searchStudentBooking, setSearchStudentBooking] = useState<string>('');

  // Confirmation modal for reliable delete in iframe
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Operator Edit Booking Modal State
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
    status: Booking['status'];
  } | null>(null);

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
      status: b.status,
    });
  };

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
      status: editingBooking.status,
    });

    if (res.success) {
      alert('Data pemesanan siswa berhasil diperbarui oleh operator!');
      setEditingBooking(null);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteBooking = (b: Booking) => {
    setConfirmDeleteModal({
      title: 'Hapus Pemesanan Komputer',
      message: `Hapus pemesanan ${b.bookingCode} untuk ${b.studentName} secara permanen? Unit PC ${b.computerCode} akan langsung dibebaskan dan kembali tersedia.`,
      onConfirm: () => {
        const res = labStore.deleteBookingPermanent(b.id);
        setCashierStatusMsg({
          type: res.success ? 'success' : 'error',
          text: res.message,
        });
        if (selectedBooking?.id === b.id) {
          setSelectedBooking(null);
        }
        setConfirmDeleteModal(null);
      },
    });
  };

  React.useEffect(() => {
    if (prefilledBookingCode) {
      setSearchQuery(prefilledBookingCode);
      const match = bookings.find((b) => b.bookingCode === prefilledBookingCode);
      if (match) {
        setSelectedBooking(match);
      }
    }
  }, [prefilledBookingCode, bookings]);

  const handleSearchBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setCashierStatusMsg(null);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const match = bookings.find(
      (b) =>
        b.bookingCode.toLowerCase() === q ||
        b.studentNisn.toLowerCase() === q ||
        b.bookingCode.toLowerCase().includes(q)
    );

    if (match) {
      setSelectedBooking(match);
      setPrintPagesBw(match.printPagesBw || 0);
      setPrintPagesColor(match.printPagesColor || 0);
      const grand =
        match.computerCost +
        (match.printPagesBw || 0) * settings.printRateBw +
        (match.printPagesColor || 0) * settings.printRateColor;
      setCashTendered(grand);
      if (onClearPrefilledCode) onClearPrefilledCode();
    } else {
      setCashierStatusMsg({
        type: 'error',
        text: `Pesanan dengan kode/NISN "${searchQuery}" tidak ditemukan.`,
      });
      setSelectedBooking(null);
    }
  };

  const handleSelectFromList = (b: Booking) => {
    setSelectedBooking(b);
    setSearchQuery(b.bookingCode);
    setPrintPagesBw(b.printPagesBw || 0);
    setPrintPagesColor(b.printPagesColor || 0);
    const grand =
      b.computerCost +
      (b.printPagesBw || 0) * settings.printRateBw +
      (b.printPagesColor || 0) * settings.printRateColor;
    setCashTendered(grand);
    setCashierStatusMsg(null);
  };

  // 1. Confirm Check-in (Siswa Baru Datang - Belum Bayar)
  const handleConfirmCheckIn = () => {
    if (!selectedBooking) return;
    setCashierStatusMsg(null);

    const res = labStore.operatorConfirmCheckIn(selectedBooking.bookingCode);
    if (res.success && res.booking) {
      setCashierStatusMsg({
        type: 'success',
        text: `Check-in berhasil! ${res.booking.studentName} dipersilakan menggunakan ${res.booking.computerCode}. Unit kini menyala MERAH di dasbor. Pembayaran dilakukan saat sesi selesai.`,
      });
      setSelectedBooking(res.booking);
    } else {
      setCashierStatusMsg({ type: 'error', text: res.message });
    }
  };

  // 1b. Operator / Admin Cancel Booking (Bebaskan PC & Hapus Bukti)
  const handleOperatorCancel = (bookingCode: string) => {
    setConfirmDeleteModal({
      title: 'Batalkan Pemesanan',
      message: `Batalkan pemesanan ${bookingCode}? Booking akan dihapus secara permanen dari sistem dan PC akan langsung kembali tersedia (HIJAU).`,
      onConfirm: () => {
        const res = labStore.operatorCancelBooking(bookingCode, 'Dibatalkan oleh Operator');
        if (res.success) {
          setCashierStatusMsg({
            type: 'success',
            text: res.message,
          });
          setSelectedBooking(null);
          setSearchQuery('');
        } else {
          setCashierStatusMsg({ type: 'error', text: res.message });
        }
        setConfirmDeleteModal(null);
      },
    });
  };

  // 2. Final Checkout & Settle Payment (Sesi Selesai / Selesai Pakai)
  const calcPrintCost = () => {
    return printPagesBw * settings.printRateBw + printPagesColor * settings.printRateColor;
  };

  const calcGrandTotal = () => {
    if (!selectedBooking) return 0;
    return selectedBooking.computerCost + calcPrintCost();
  };

  const calcChange = () => {
    const grand = calcGrandTotal();
    return Math.max(0, cashTendered - grand);
  };

  const handleProcessCheckoutAndPayment = async () => {
    if (!selectedBooking) return;
    setCashierStatusMsg(null);

    const grandTotal = calcGrandTotal();
    if (cashTendered < grandTotal) {
      setCashierStatusMsg({
        type: 'error',
        text: `Uang tunai kurang! Total tagihan: ${formatRupiah(grandTotal)}, diterima: ${formatRupiah(cashTendered)}`,
      });
      return;
    }

    const res = labStore.operatorFinalCheckoutAndPay({
      bookingCode: selectedBooking.bookingCode,
      printPagesBw,
      printPagesColor,
      amountPaid: cashTendered,
      operatorName: operatorStaffName,
    });

    if (res.success && res.booking) {
      try {
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      } catch {
        // ignore
      }

      setCashierStatusMsg({
        type: 'success',
        text: `Pembayaran ${formatRupiah(grandTotal)} lunas! PC ${res.booking.computerCode} telah selesai digunakan dan kembali menyala HIJAU (tersedia). Struk otomatis dicetak.`,
      });

      await generateReceiptPDF(res.booking, settings);
      setSelectedBooking(res.booking);
    } else {
      setCashierStatusMsg({ type: 'error', text: res.message });
    }
  };

  // Filter queues
  const waitingCheckInBookings = bookings.filter((b) => b.status === 'booked_waiting_checkin');
  const activeBookings = bookings.filter((b) => b.status === 'active' || b.status === 'awaiting_payment');

  return (
    <div className="space-y-6">
      {/* Header with White/Red/Orange Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Backend Operator Kasir Lab
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">SMK Negeri 1 Songgom</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Check-In Kehadiran &amp; Billing Kasir
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              1) Siswa datang: Konfirmasi hadir &amp; aktifkan PC (tanpa bayar). 2) Sesi selesai: Hitung durasi sewa + kertas cetak, terima pembayaran tunai &amp; cetak struk resmi.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-semibold">Operator Kasir:</span>
            <input
              type="text"
              value={operatorStaffName}
              onChange={(e) => setOperatorStaffName(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 text-xs font-bold focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Navigation Tabs for Operator */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActivePortalTab('billing')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors ${
              activePortalTab === 'billing'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>Meja Kasir &amp; Check-In Kehadiran</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('student_bookings')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors ${
              activePortalTab === 'student_bookings'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Siswa &amp; Pemesanan Lab ({bookings.length})</span>
          </button>
        </div>
      </div>

      {activePortalTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* REGISTER WORKSPACE (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Barcode / Search Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-red-600" />
                Pindai Barcode / Ketik Kode Booking / NISN Siswa:
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Contoh: SNG-20261106-0001</span>
            </label>

            <form onSubmit={handleSearchBooking} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan QR code atau ketik kode booking..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-xs shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Cari / Pindai</span>
              </button>
            </form>

            {cashierStatusMsg && (
              <div
                className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  cashierStatusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}
              >
                {cashierStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{cashierStatusMsg.text}</span>
              </div>
            )}
          </div>

          {/* ACTIVE SELECTION REGISTER */}
          {selectedBooking ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black text-slate-900">
                      {selectedBooking.bookingCode}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        selectedBooking.status === 'active'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : selectedBooking.status === 'booked_waiting_checkin'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : selectedBooking.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {selectedBooking.status === 'active'
                        ? 'Sedang Aktif Dipakai'
                        : selectedBooking.status === 'booked_waiting_checkin'
                        ? 'Menunggu Siswa Hadir'
                        : selectedBooking.status === 'completed'
                        ? 'Lunas & Selesai'
                        : selectedBooking.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unit: <strong className="text-red-600 font-mono">{selectedBooking.computerCode}</strong> ·{' '}
                    Jadwal: {selectedBooking.bookingDate} ({selectedBooking.startTime} - {selectedBooking.endTime} WIB)
                  </p>
                </div>

                <button
                  onClick={() => onViewReceipt(selectedBooking)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>Lihat / Cetak Struk</span>
                </button>
              </div>

              {/* Student Identity */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-orange-500" /> Identitas Siswa
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Nama:</span>
                    <span className="font-bold text-slate-900">{selectedBooking.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">NISN:</span>
                    <span className="font-mono font-bold text-red-600">
                      {selectedBooking.studentNisn}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kelas:</span>
                    <span className="text-slate-800 font-semibold">{selectedBooking.studentClass}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Keperluan:</span>
                    <span className="text-orange-600 font-medium truncate block" title={selectedBooking.purpose}>
                      {selectedBooking.purpose || 'Praktik ASJ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BRANCH: 
                  IF STATUS === 'booked_waiting_checkin' -> SHOW CHECK-IN BUTTON (NO PAYMENT)
                  IF STATUS === 'active' or 'awaiting_payment' -> SHOW FINAL CHECKOUT & CASH PAYMENT FORM
              */}
              {selectedBooking.status === 'booked_waiting_checkin' && (
                <div className="p-5 rounded-2xl bg-orange-50 border border-orange-300 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-orange-200">
                    <div>
                      <h3 className="font-bold text-orange-950 text-sm flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-orange-600" />
                        Siswa Telah Tiba di Laboratorium
                      </h3>
                      <p className="text-xs text-orange-800 mt-0.5">
                        Siswa tidak perlu bayar sekarang. Konfirmasi kehadiran untuk menyalakan komputer menjadi MERAH.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-orange-900 bg-orange-100 px-3 py-1 rounded-lg border border-orange-300">
                      Batas Hadir: {selectedBooking.checkInDeadline || '-'} WIB
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-orange-200 space-y-1">
                    <div>Unit Komputer: <strong className="text-slate-900 font-mono">{selectedBooking.computerCode}</strong></div>
                    <div>Durasi Pemakaian: <strong className="text-slate-900">{selectedBooking.durationHours} Jam</strong></div>
                    <div>Estimasi Tagihan Akhir: <strong className="text-red-600">{formatRupiah(selectedBooking.computerCost)}</strong> (dibayar saat sesi selesai)</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={handleConfirmCheckIn}
                      className="flex-1 py-3.5 px-5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-sm font-black shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <UserCheck className="w-5 h-5" />
                      <span>Konfirmasi Siswa Hadir &amp; Aktifkan PC (Nyalakan Merah)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOperatorCancel(selectedBooking.bookingCode)}
                      className="py-3.5 px-4 bg-white hover:bg-red-50 border border-red-300 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
                      title="Batalkan pemesanan ini dan kembalikan status komputer ke hijau"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span>Batalkan Booking</span>
                    </button>
                  </div>
                </div>
              )}

              {(selectedBooking.status === 'active' || selectedBooking.status === 'awaiting_payment') && (
                <div className="space-y-5">
                  {/* Service 1: Computer Rental */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-red-600" />
                        Sewa PC {selectedBooking.computerCode} ({selectedBooking.durationHours} Jam)
                      </span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {formatRupiah(selectedBooking.computerCost)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Durasi terhitung {selectedBooking.durationHours} jam sesuai jadwal booking.
                    </div>
                  </div>

                  {/* Service 2: Document Printing Adjustment */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-orange-600" />
                        <h4 className="font-bold text-slate-900 text-xs">
                          Layanan Cetak Dokumen (Verifikasi Lembar Kertas)
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-orange-600">
                        +{formatRupiah(calcPrintCost())}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* BW */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="text-slate-800 font-semibold">Hitam Putih (B&amp;W)</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            @{formatRupiah(settings.printRateBw)}/lbr
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPrintPagesBw(Math.max(0, printPagesBw - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={printPagesBw}
                            onChange={(e) => setPrintPagesBw(Math.max(0, parseInt(e.target.value) || 0))}
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-center text-sm font-bold text-slate-900 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setPrintPagesBw(printPagesBw + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 text-right font-mono">
                          Subtotal: {formatRupiah(printPagesBw * settings.printRateBw)}
                        </div>
                      </div>

                      {/* Color */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="text-slate-800 font-semibold">Warna (Full Color)</span>
                          <span className="text-[11px] text-orange-600 font-mono font-semibold">
                            @{formatRupiah(settings.printRateColor)}/lbr
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPrintPagesColor(Math.max(0, printPagesColor - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={printPagesColor}
                            onChange={(e) =>
                              setPrintPagesColor(Math.max(0, parseInt(e.target.value) || 0))
                            }
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-center text-sm font-bold text-slate-900 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setPrintPagesColor(printPagesColor + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-[10px] text-orange-600 mt-1.5 text-right font-mono font-semibold">
                          Subtotal: {formatRupiah(printPagesColor * settings.printRateColor)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Checkout & Cashier Calculation */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider block font-bold">
                          Total Durasi PC + Kertas Cetak:
                        </span>
                        <span className="text-xs text-slate-600 font-mono">
                          {selectedBooking.durationHours} Jam Sewa ({formatRupiah(selectedBooking.computerCost)}) + Cetak ({formatRupiah(calcPrintCost())})
                        </span>
                      </div>
                      <span className="text-2xl font-black font-mono text-red-600">
                        {formatRupiah(calcGrandTotal())}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Uang Tunai Diterima dari Siswa (Rp):
                        </label>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-lg font-mono font-black text-slate-900 focus:outline-none focus:border-red-500"
                        />
                      </div>

                      {/* Quick Cash */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setCashTendered(calcGrandTotal())}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          Uang Pas
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashTendered(10000)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          Rp 10.000
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashTendered(20000)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          Rp 20.000
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashTendered(50000)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          Rp 50.000
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                        <span className="text-slate-600 font-semibold">Uang Kembalian:</span>
                        <span className="text-lg font-mono font-black text-orange-600">
                          {formatRupiah(calcChange())}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleProcessCheckoutAndPayment}
                        className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-base font-black shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all mt-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Selesaikan Sesi, Bayar &amp; Cetak Struk PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOperatorCancel(selectedBooking.bookingCode)}
                        className="w-full py-2.5 px-4 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span>Batalkan Sesi / Void Booking (Bebaskan PC Langsung)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedBooking.status === 'completed' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
                  <div className="text-emerald-800 font-bold text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Transaksi Selesai &amp; Lunas
                  </div>
                  <div className="text-xs text-slate-600">
                    Unit PC <strong className="text-slate-900">{selectedBooking.computerCode}</strong> telah dilepas dan kembali menyala HIJAU di denah topologi lab.
                  </div>
                  <button
                    onClick={() => onViewReceipt(selectedBooking)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Cetak Ulang Struk PDF (Khusus Petugas)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <Scan className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <div className="font-bold text-slate-700 text-base">Meja Kasir &amp; Check-In Siap</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Pindai tiket siswa untuk check-in kehadiran, atau klik salah satu antrean di sebelah kanan untuk memproses checkout dan pembayaran akhir.
              </p>
            </div>
          )}
        </div>

        {/* QUEUES (Right 1 col) */}
        <div className="space-y-4">
          {/* Antrean Menunggu Hadir (Maks. 5 menit dari jadwal tiba) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Siswa Belum Hadir (&lt;5 Mnt)
              </h3>
              <span className="text-xs bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-full font-bold">
                {waitingCheckInBookings.length}
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {waitingCheckInBookings.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ada antrean tunggu hadir.
                </div>
              ) : (
                waitingCheckInBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-xs group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-orange-600 group-hover:text-red-600">
                        {b.computerCode}
                      </span>
                      <span className="text-[10px] text-orange-700 font-mono font-semibold">
                        Batas: {b.checkInDeadline}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 truncate">{b.studentName}</div>
                    <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                      <span>Jadwal: {b.startTime} WIB</span>
                      <span className="text-red-600 font-bold">{b.durationHours} Jam</span>
                    </div>
                    <div className="pt-1.5 flex gap-1.5 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleSelectFromList(b)}
                        className="flex-1 py-1 px-2 bg-white hover:bg-orange-500 hover:text-white border border-slate-200 hover:border-orange-500 rounded-lg text-[11px] font-bold text-slate-700 transition-colors text-center"
                      >
                        Pilih &amp; Check-In
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOperatorCancel(b.bookingCode);
                        }}
                        className="py-1 px-2 bg-white hover:bg-red-50 border border-red-200 hover:border-red-400 rounded-lg text-[11px] font-bold text-red-600 transition-colors"
                        title="Batalkan booking &amp; bebaskan PC"
                      >
                        Batalkan
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unit Aktif & Checkout Kasir */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Monitor className="w-4 h-4 text-red-600" />
                PC Aktif / Siap Checkout
              </h3>
              <span className="text-xs bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full font-bold">
                {activeBookings.length}
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {activeBookings.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada unit yang aktif.
                </div>
              ) : (
                activeBookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectFromList(b)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 transition-all text-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-red-600">{b.computerCode}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{b.endTime} WIB</span>
                    </div>
                    <div className="font-bold text-slate-800 truncate">{b.studentName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex justify-between">
                      <span>
                        Cetak: {b.printPagesBw + b.printPagesColor} lbr
                      </span>
                      <span className="text-red-600 font-bold">{formatRupiah(b.totalCost)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* TAB 2: DATA SISWA & PEMESANAN LAB (OPERATOR VIEW) */}
      {activePortalTab === 'student_bookings' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Data Siswa &amp; Pemesanan Lab</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar seluruh siswa yang telah memesan komputer lab. Operator kasir dapat mengoreksi data atau menghapus pesanan jika diperlukan.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchStudentBooking}
                onChange={(e) => setSearchStudentBooking(e.target.value)}
                placeholder="Cari Kode / Siswa / NISN / Unit..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Kode Booking</th>
                  <th className="py-3 px-3">Tanggal &amp; Jam</th>
                  <th className="py-3 px-3">Siswa &amp; Kelas</th>
                  <th className="py-3 px-3">Keperluan Pemesan</th>
                  <th className="py-3 px-2">Unit</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono">
                {bookings
                  .filter((b) => {
                    if (!searchStudentBooking) return true;
                    const q = searchStudentBooking.toLowerCase();
                    return (
                      b.bookingCode.toLowerCase().includes(q) ||
                      b.studentName.toLowerCase().includes(q) ||
                      b.studentNisn.toLowerCase().includes(q) ||
                      b.computerCode.toLowerCase().includes(q) ||
                      (b.purpose && b.purpose.toLowerCase().includes(q))
                    );
                  })
                  .map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{b.bookingCode}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {b.bookingDate} ({b.startTime}-{b.endTime})
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900">{b.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {b.studentClass} · {b.studentNisn}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        <span className="truncate max-w-[150px] block" title={b.purpose}>
                          {b.purpose || 'Praktik ASJ'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-red-600">{b.computerCode}</td>
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
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectFromList(b);
                              setActivePortalTab('billing');
                            }}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors border border-red-200"
                            title="Proses Check-in atau Bayar di Meja Kasir"
                          >
                            Pilih
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditBooking(b)}
                            className="p-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 transition-colors"
                            title="Edit Data Pemesanan Siswa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(b)}
                            className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                            title="Hapus Pemesanan Permanen &amp; Bebaskan PC"
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

      {/* OPERATOR EDIT BOOKING MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-800 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Data Booking: {editingBooking.bookingCode}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Koreksi identitas siswa, kelas XII TKJ, keperluan, unit komputer, atau status booking.
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

            <form onSubmit={handleSaveEditBooking} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Siswa:</label>
                <input
                  type="text"
                  required
                  value={editingBooking.studentName}
                  onChange={(e) => setEditingBooking({ ...editingBooking, studentName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NISN (10 Digit):</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={editingBooking.studentNisn}
                    onChange={(e) => setEditingBooking({ ...editingBooking, studentNisn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas:</label>
                  <select
                    value={editingBooking.studentClass}
                    onChange={(e) => setEditingBooking({ ...editingBooking, studentClass: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  >
                    <option value="XII TKJ 1">XII TKJ 1</option>
                    <option value="XII TKJ 2">XII TKJ 2</option>
                    <option value="XII TKJ 3">XII TKJ 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keperluan Pemesan:</label>
                <input
                  type="text"
                  value={editingBooking.purpose}
                  onChange={(e) => setEditingBooking({ ...editingBooking, purpose: e.target.value })}
                  placeholder="Praktik ASJ, Tugas Jaringan..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Komputer:</label>
                  <select
                    value={editingBooking.computerCode}
                    onChange={(e) => setEditingBooking({ ...editingBooking, computerCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-red-600 focus:outline-none focus:border-red-500"
                  >
                    {computers.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Pemesanan:</label>
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
                    <option value="booked_waiting_checkin">Tunggu Hadir</option>
                    <option value="active">Sedang Aktif</option>
                    <option value="awaiting_payment">Selesai / Bayar</option>
                    <option value="completed">Lunas</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
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
    </div>
  );
};

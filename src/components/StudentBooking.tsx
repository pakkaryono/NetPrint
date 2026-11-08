import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ComputerUnit, Booking, LabSettings, Student } from '../types';
import { labStore } from '../services/store';
import { formatRupiah } from '../services/pdfExport';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Sparkles,
  ShieldCheck,
  Info,
  Printer,
  AlertTriangle,
} from 'lucide-react';

interface StudentBookingProps {
  computers: ComputerUnit[];
  settings: LabSettings;
  bookings: Booking[];
  students: Student[];
  preSelectedComputerId?: string | null;
  onClearPreSelected?: () => void;
  onViewReceipt: (booking: Booking) => void;
  onGoToPrintOrder?: (bookingCode: string) => void;
}

export const StudentBooking: React.FC<StudentBookingProps> = ({
  computers,
  settings,
  bookings,
  students,
  preSelectedComputerId,
  onClearPreSelected,
  onViewReceipt,
  onGoToPrintOrder,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'new_booking' | 'check_booking'>('new_booking');

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState<string>(todayStr);
  const [selectedCompId, setSelectedCompId] = useState<string>(preSelectedComputerId || '');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [durationHours, setDurationHours] = useState<1 | 2 | 3>(1);

  // Student Identity Fields
  const [nisn, setNisn] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [className, setClassName] = useState<string>('XII TKJ 1');
  const [purpose, setPurpose] = useState<string>('');

  // UI status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Lookup Booking state
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<Booking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Perubahan jadwal belajar');

  useEffect(() => {
    if (preSelectedComputerId) {
      setSelectedCompId(preSelectedComputerId);
    }
  }, [preSelectedComputerId]);

  useEffect(() => {
    if (createdBooking) {
      QRCode.toDataURL(createdBooking.bookingCode, { width: 180, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [createdBooking]);

  const handleNisnChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setNisn(cleaned);
    if (cleaned.length === 10) {
      const existing = labStore.getStudentByNisn(cleaned);
      if (existing) {
        setStudentName(existing.name);
        setClassName(existing.className || 'XII TKJ 1');
        if (existing.purpose) setPurpose(existing.purpose);
      }
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nisn || nisn.length !== 10) {
      setErrorMsg('Harap masukkan 10 digit NISN yang valid.');
      return;
    }
    if (!studentName.trim()) {
      setErrorMsg('Nama lengkap siswa wajib diisi.');
      return;
    }
    if (!selectedCompId) {
      setErrorMsg('Silakan pilih salah satu unit komputer yang tersedia.');
      return;
    }

    const valResult = labStore.validateBookingRequest({
      nisn,
      bookingDate,
      startTime,
      durationHours,
      computerId: selectedCompId,
    });

    if (!valResult.valid) {
      setErrorMsg(valResult.error || 'Pemesanan tidak dapat diproses.');
      return;
    }

    try {
      const newBook = labStore.createBooking({
        studentNisn: nisn,
        studentName: studentName.trim(),
        studentClass: className,
        purpose: purpose.trim() || '-',
        computerId: selectedCompId,
        bookingDate,
        startTime,
        durationHours,
      });

      setCreatedBooking(newBook);
      if (onClearPreSelected) onClearPreSelected();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat booking.');
    }
  };

  const handleSearchBookings = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const query = lookupQuery.trim().toLowerCase();
    if (!query) {
      setLookupResult([]);
      return;
    }

    // Ketentuan: Jangan cek dengan NISN tapi dengan KODE BOOKING saja
    const matches = bookings.filter(
      (b) => b.bookingCode.toLowerCase() === query || b.bookingCode.toLowerCase().includes(query)
    );
    setLookupResult(matches);
  };

  const canCancelBooking = (booking: Booking): { canCancel: boolean; minutesRemaining: number } => {
    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'active') {
      return { canCancel: false, minutesRemaining: 0 };
    }
    const startDateTime = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
    const diffMinutes = (startDateTime.getTime() - new Date().getTime()) / (1000 * 60);

    return {
      canCancel: diffMinutes >= settings.cancellationGraceMinutes,
      minutesRemaining: Math.round(diffMinutes),
    };
  };

  const handleExecuteCancel = () => {
    if (!cancelModalBooking) return;
    const res = labStore.cancelBooking(cancelModalBooking.id, cancelReason);
    if (!res.success) {
      alert(res.message);
    } else {
      setCancelModalBooking(null);
      // Ketika dibatalkan, bukti booking dihapus sehingga tidak ada bukti booking tersisa
      setLookupResult([]);
    }
  };

  const getEstimatedCost = () => {
    if (durationHours === 1) return settings.rate1Hour;
    if (durationHours === 2) return settings.rate2Hours;
    return settings.rate3Hours;
  };

  const timeSlots = ['07:30', '08:00', '09:00', '10:00', '11:00', '12:30', '13:30', '14:30', '15:00'];

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs in White/Red/Orange Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Portal Mandiri Siswa
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">SMK Negeri 1 Songgom</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Booking Pemakaian Komputer Lab
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Pesan komputer untuk hari ini, 1 hari sebelumnya, atau beberapa hari ke depan tanpa bayar di awal. Konfirmasi ke operator maksimal 5 menit saat waktu pesanan tiba.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSubTab('new_booking');
                setCreatedBooking(null);
              }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'new_booking'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Form Booking Baru</span>
            </button>
            <button
              onClick={() => setActiveSubTab('check_booking')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'check_booking'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Cek Status / Tiket Saya</span>
            </button>
          </div>
        </div>

        {/* Highlight Banner: 2-Day Cooldown & Anti-Double Booking Rule */}
        <div className="mt-4 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-orange-950 font-bold">Ketentuan Penting Booking Siswa:</strong> Siswa yang sedang booking <strong className="text-red-700">tidak bisa memesan lagi di hari yang sama atau jam yang sama</strong>, serta diberlakukan <strong className="text-red-700">jeda (cooldown) 2 hari ke depan</strong> agar seluruh siswa lain dapat merasakan giliran memakai komputer laboratorium. Toleransi kehadiran adalah 5 menit saat waktu pesanan tiba.
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: NEW BOOKING */}
      {activeSubTab === 'new_booking' && (
        <>
          {createdBooking ? (
            /* SUCCESS BOOKING PASS */
            <div className="bg-white border border-emerald-400 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-md relative">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Booking Berhasil Dibuat!</h2>
                <div className="text-xs text-emerald-700 font-bold mt-1">
                  Status: Menunggu Kehadiran Siswa (Tanpa Bayar di Awal)
                </div>
              </div>

              {/* Ticket Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-5 border-b border-slate-200">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                      Kode Verifikasi Booking
                    </span>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-red-600 tracking-wider">
                      {createdBooking.bookingCode}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      Unit Komputer: <strong className="text-slate-900 font-mono text-sm">{createdBooking.computerCode}</strong>
                    </div>
                  </div>

                  {qrDataUrl && (
                    <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 shrink-0 text-center">
                      <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 object-contain" />
                      <span className="text-[10px] text-slate-800 font-mono font-bold block mt-1">
                        SCAN OPERATOR
                      </span>
                    </div>
                  )}
                </div>

                {/* Important 5-Minute Timeout Warning Badge */}
                <div className="p-3 bg-orange-100 border border-orange-300 rounded-xl text-xs text-orange-950 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-orange-950 block">
                      Batas Toleransi Kehadiran: Pukul {createdBooking.checkInDeadline} WIB (5 Menit)
                    </span>
                    <span>
                      Jadwal Anda adalah <strong>{createdBooking.startTime} WIB</strong>. Jika dalam <strong>5 menit saat waktu pesanan tiba</strong> ({createdBooking.checkInDeadline} WIB) Anda belum konfirmasi barcode/kode ke operator, PC otomatis direset menjadi tersedia kembali bagi siswa lain.
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-500 block">Siswa:</span>
                    <span className="font-bold text-slate-900">{createdBooking.studentName}</span>
                    <span className="text-[11px] text-slate-500 block font-mono">
                      NISN: {createdBooking.studentNisn}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kelas:</span>
                    <span className="font-bold text-slate-900">{createdBooking.studentClass}</span>
                    <span className="text-[10px] text-orange-600 block truncate" title={createdBooking.purpose}>
                      {createdBooking.purpose || 'Praktik ASJ'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Durasi Sesi:</span>
                    <span className="font-bold text-slate-900">{createdBooking.durationHours} Jam</span>
                    <span className="text-[11px] text-red-600 block font-mono font-semibold">
                      {createdBooking.startTime} - {createdBooking.endTime} WIB
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estimasi Tarif:</span>
                    <span className="text-base font-extrabold text-red-600">
                      {formatRupiah(createdBooking.computerCost)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Dibayar saat sesi selesai
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onViewReceipt(createdBooking)}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>Lihat / Simpan Tiket PDF</span>
                </button>

                <button
                  onClick={() => setCreatedBooking(null)}
                  className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Buat Booking Baru
                </button>
              </div>
            </div>
          ) : (
            /* BOOKING FORM (Light Theme) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  {/* Step 1: Identitas */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                        1
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">Identitas Siswa</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          NISN Siswa (10 Digit) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={nisn}
                          onChange={(e) => handleNisnChange(e.target.value)}
                          placeholder="Contoh: 0071829101"
                          maxLength={10}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Lengkap Siswa <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Nama lengkap sesuai Dapodik"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kelas <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white"
                        >
                          <option value="XII TKJ 1">XII TKJ 1</option>
                          <option value="XII TKJ 2">XII TKJ 2</option>
                          <option value="XII TKJ 3">XII TKJ 3</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Keperluan / Alasan Pemakaian <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          placeholder="Input keperluan: Contoh Praktik ASJ, Tugas Jaringan, Ujian..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Jadwal & Durasi */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">Jadwal &amp; Durasi (1–3 Jam)</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tanggal Booking
                        </label>
                        <input
                          type="date"
                          value={bookingDate}
                          min={todayStr}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jam Mulai
                        </label>
                        <select
                          value={startTime}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setStartTime(newStart);
                            if (newStart === '14:30') {
                              setDurationHours(1);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white font-mono"
                        >
                          {timeSlots.map((ts) => (
                            <option key={ts} value={ts}>
                              {ts} WIB {ts === '14:30' ? '(Maks. 1 Jam)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Durasi Sewa
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([1, 2, 3] as const).map((hrs) => {
                            const isDisabled = startTime === '14:30' && hrs > 1;
                            return (
                              <button
                                key={hrs}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setDurationHours(hrs)}
                                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                  durationHours === hrs
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : isDisabled
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                                }`}
                                title={isDisabled ? 'Slot 14:30 WIB hanya boleh 1 jam' : undefined}
                              >
                                {hrs} Jam
                              </button>
                            );
                          })}
                        </div>
                        {startTime === '14:30' && (
                          <span className="text-[10px] text-orange-600 font-bold block mt-1">
                            * Jadwal 14:30 WIB dibatasi maksimal 1 jam pemakaian.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Pilih Komputer dari Formasi 28 PC */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                          3
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">Pilih Unit Komputer Lab (28 Unit PC)</h3>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {computers.filter((c) => c.status === 'available').length} PC Tersedia
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {computers.map((comp) => {
                        const isSelected = selectedCompId === comp.id;
                        const isAvailable = comp.status === 'available';

                        return (
                          <button
                            key={comp.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedCompId(comp.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400'
                                : isAvailable
                                ? 'bg-white text-slate-800 border-slate-200 hover:border-red-400 hover:bg-red-50/50 shadow-2xs'
                                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <span className="font-mono font-bold text-xs block">{comp.code}</span>
                            <span className="text-[10px] block mt-0.5 font-medium">
                              {isAvailable ? 'Kosong' : comp.status === 'in_use' ? 'Dipakai' : 'Booked'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <strong className="block font-bold">Tidak Dapat Memesan:</strong>
                        <span>{errorMsg}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-extrabold rounded-xl text-sm transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Dapatkan Kode Booking (Tanpa Bayar Sekarang)</span>
                  </button>
                </form>
              </div>

              {/* Rules and Cost Summary */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-100">
                    Estimasi Biaya Sewa
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unit PC:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {computers.find((c) => c.id === selectedCompId)?.code || 'Belum dipilih'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Durasi:</span>
                      <span className="font-semibold text-slate-900">{durationHours} Jam</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimasi Tarif:</span>
                      <span className="font-bold text-red-600">
                        {formatRupiah(getEstimatedCost())}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 text-sm">
                      <span className="font-black text-slate-900">Bayar Saat Selesai:</span>
                      <span className="font-black text-red-600">
                        {formatRupiah(getEstimatedCost())}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-xs space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                    Ketentuan Penting Siswa
                  </h4>
                  <ul className="space-y-2 text-slate-600 list-disc list-inside">
                    <li>
                      <strong className="text-slate-900">Tidak perlu bayar di awal.</strong> Pembayaran dilakukan secara tunai kepada operator saat sesi selesai.
                    </li>
                    <li>
                      <strong className="text-red-600">Anti-Double Booking &amp; Cooldown 2 Hari:</strong> Siswa tidak bisa booking di hari yang sama dan ada jeda 2 hari ke depan agar siswa lain bergantian dapat memakai PC.
                    </li>
                    <li>
                      <strong className="text-orange-600">Toleransi 5 Menit:</strong> Hadir dan tunjukkan barcode/kode booking ke operator maksimal 5 menit saat waktu pesanan tiba agar PC tidak direset otomatis.
                    </li>
                    <li>
                      Peringatan alarm berbunyi <strong className="text-slate-900">10 menit</strong> sebelum waktu sewa habis.
                    </li>
                    <li>
                      Jika ada tambahan <strong className="text-orange-600">cetak dokumen</strong>, pesan sesuai kode booking sebelum sesi selesai.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SUB-TAB 2: CHECK BOOKINGS */}
      {activeSubTab === 'check_booking' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl mx-auto mb-8 text-center">
            <h2 className="text-xl font-black text-slate-900">Cek Status &amp; Pembatalan Booking</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Cari tiket pesanan Anda khusus menggunakan <strong className="text-red-600">Kode Booking</strong> (pencarian tidak menggunakan NISN).
            </p>

            <form onSubmit={handleSearchBookings} className="mt-4 flex gap-2">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Masukkan Kode Booking (contoh: SNG-20261106-0001)..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Cari Kode Booking</span>
              </button>
            </form>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              * Pencarian hanya dapat dilakukan dengan Kode Booking. Pesanan yang gagal atau telat tidak menyimpan bukti booking.
            </p>
          </div>

          {hasSearched && (
            <div className="space-y-4">
              {lookupResult.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
                  Tidak ditemukan pesanan dengan kata kunci "{lookupQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lookupResult.map((b) => {
                    const cancelCheck = canCancelBooking(b);

                    return (
                      <div
                        key={b.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div>
                            <span className="text-[11px] font-mono text-slate-500 font-bold">Kode Booking</span>
                            <div className="text-base font-black font-mono text-red-600">
                              {b.bookingCode}
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              b.status === 'active'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : b.status === 'booked_waiting_checkin'
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : b.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {b.status === 'active'
                              ? 'Sedang Aktif'
                              : b.status === 'booked_waiting_checkin'
                              ? 'Menunggu Hadir'
                              : b.status === 'completed'
                              ? 'Selesai & Lunas'
                              : 'Dibatalkan'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 block">Siswa:</span>
                            <span className="font-bold text-slate-800">{b.studentName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Unit:</span>
                            <span className="font-bold text-slate-900 font-mono">{b.computerCode}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Jadwal:</span>
                            <span className="text-slate-700">
                              {b.bookingDate} ({b.startTime} - {b.endTime})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Batas Hadir:</span>
                            <span className="font-bold text-orange-600 font-mono">
                              {b.checkInDeadline || '-'} WIB
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                          <button
                            onClick={() => onViewReceipt(b)}
                            className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-600" />
                            <span>Lihat Tiket / Struk</span>
                          </button>

                          {b.status === 'booked_waiting_checkin' && cancelCheck.canCancel && (
                            <button
                              onClick={() => setCancelModalBooking(b)}
                              className="py-1.5 px-3 bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 rounded-lg text-xs font-bold transition-colors"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL BATALKAN */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-2">Batalkan Booking</h3>
            <p className="text-xs text-slate-600 mb-4">
              Batalkan booking <strong className="text-red-600">{cancelModalBooking.bookingCode}</strong> ({cancelModalBooking.computerCode})? Unit komputer akan segera dilepas kembali ke status kosong.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              >
                <option value="Perubahan jadwal mapel pelajaran">Perubahan jadwal mapel pelajaran</option>
                <option value="Salah memilih komputer atau jam slot">Salah memilih komputer atau jam slot</option>
                <option value="Tugas lab sudah selesai">Tugas lab sudah selesai</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExecuteCancel}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Ya, Batalkan Pesanan
              </button>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

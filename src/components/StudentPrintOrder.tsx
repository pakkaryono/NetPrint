import React, { useState } from 'react';
import { Booking, LabSettings, ComputerUnit } from '../types';
import { labStore } from '../services/store';
import { formatRupiah } from '../services/pdfExport';
import { Printer, CheckCircle2, AlertCircle, Sparkles, FileText, Monitor, Clock, ShieldCheck, Lock } from 'lucide-react';

interface StudentPrintOrderProps {
  bookings: Booking[];
  settings: LabSettings;
  computers: ComputerUnit[];
  prefilledBookingCode?: string;
}

export const StudentPrintOrder: React.FC<StudentPrintOrderProps> = ({
  bookings,
  settings,
  computers,
  prefilledBookingCode,
}) => {
  const [bookingCode, setBookingCode] = useState(prefilledBookingCode || '');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pagesBw, setPagesBw] = useState<number>(1);
  const [pagesColor, setPagesColor] = useState<number>(0);
  const [docTitle, setDocTitle] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with prefilledBookingCode when tab opens
  React.useEffect(() => {
    if (prefilledBookingCode) {
      handleLookupBooking(prefilledBookingCode);
    }
  }, [prefilledBookingCode, bookings]);

  // Auto-search booking if code entered, sync docTitle with booking purpose
  const handleLookupBooking = (code: string) => {
    setBookingCode(code);
    setStatusMsg(null);
    const match = bookings.find(
      (b) => b.bookingCode.trim().toLowerCase() === code.trim().toLowerCase()
    );
    if (match) {
      setSelectedBooking(match);
      // Sesuaikan Judul Dokumen dengan keperluan siswa saat booking, tidak terisi otomatis teks statis
      setDocTitle(match.purpose && match.purpose !== '-' ? match.purpose : '');
    } else {
      setSelectedBooking(null);
      setDocTitle('');
    }
  };

  const isCompletedOrPaid =
    selectedBooking && (selectedBooking.status === 'completed' || selectedBooking.paymentStatus === 'paid');

  const handleSubmitPrintOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!selectedBooking) {
      setStatusMsg({
        type: 'error',
        text: 'Kode booking tidak ditemukan. Silakan periksa kembali kode booking Anda.',
      });
      return;
    }

    // Restriction check
    if (isCompletedOrPaid) {
      setStatusMsg({
        type: 'error',
        text: 'Booking sudah selesai dan dokumen sudah dicetak. Anda tidak dapat memesan cetak dokumen lagi untuk sesi ini.',
      });
      return;
    }

    if (pagesBw === 0 && pagesColor === 0) {
      setStatusMsg({
        type: 'error',
        text: 'Masukkan setidaknya 1 lembar dokumen (Hitam Putih atau Warna).',
      });
      return;
    }

    const res = labStore.addPrintToBooking({
      bookingCode: selectedBooking.bookingCode,
      printPagesBw: pagesBw,
      printPagesColor: pagesColor,
    });

    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: `Pesanan cetak dokumen (${pagesBw} lbr BW, ${pagesColor} lbr Warna) berhasil ditambahkan ke tagihan PC ${selectedBooking.computerCode}. Biaya cetak akan digabungkan pada struk pembayaran akhir saat selesai.`,
      });
      setPagesBw(0);
      setPagesColor(0);
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const calcPrintSubtotal = () => {
    return pagesBw * settings.printRateBw + pagesColor * settings.printRateColor;
  };

  // Active bookings list for quick selection
  const activeBookings = bookings.filter((b) => b.status === 'active');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with White/Red/Orange Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
            Layanan Siswa
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-medium">Stasiun Printer Lab SMKN 1 Songgom</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
          <Printer className="w-6 h-6 text-orange-500" />
          <span>Pesan Cetak Dokumen via Kode Booking PC</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Sedang menggunakan komputer dan ingin mencetak tugas/laporan? Masukkan kode booking Anda. Biaya cetak kertas akan otomatis digabung ke tagihan akhir saat checkout ke operator kasir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Order (Left 2 cols) */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kode Booking Pemakaian Komputer Anda:
            </label>
            <input
              type="text"
              required
              value={bookingCode}
              onChange={(e) => handleLookupBooking(e.target.value)}
              placeholder="Contoh: SNG-20261106-0001"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono text-red-600 font-bold focus:outline-none focus:border-red-500 focus:bg-white"
            />
          </div>

          {selectedBooking ? (
            isCompletedOrPaid ? (
              /* RESTRICTION NOTICE FOR COMPLETED/PAID BOOKINGS */
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Booking Sudah Selesai dan Dokumen Sudah Dicetak</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Pengguna siswa yang sudah selesai bayar tidak bisa memesan cetak dokumen lagi untuk sesi ini.
                </p>
                <div className="text-xs text-amber-900 bg-white/80 p-3 rounded-xl border border-amber-200 font-medium">
                  <strong>Pemberitahuan Cetak Ulang:</strong><br />
                  Hanya operator dan admin yang bisa cetak ulang. Jika Anda (siswa) ingin cetak ulang, silakan hubungi operator lab atau admin.
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>
                    Unit: {selectedBooking.computerCode} ({selectedBooking.studentName})
                  </span>
                  <span className="text-red-600">{selectedBooking.studentClass}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Sesi: {selectedBooking.startTime} - {selectedBooking.endTime} WIB · Status:{' '}
                  {selectedBooking.status === 'active' ? 'Sedang Aktif Digunakan' : selectedBooking.status}
                </div>
              </div>
            )
          ) : (
            <div className="text-xs text-slate-400 italic">
              * Masukkan kode booking valid atau pilih dari daftar komputer aktif di sebelah kanan.
            </div>
          )}

          {/* Form is only active if NOT completed/paid */}
          {!isCompletedOrPaid && (
            <form onSubmit={handleSubmitPrintOrder} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Dokumen / Nama Tugas:
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Contoh: Laporan Praktikum Jaringan Cisco Packet Tracer"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Hitam Putih */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">Hitam Putih (B&amp;W)</span>
                    <span className="font-mono text-slate-600">
                      @{formatRupiah(settings.printRateBw)}/lbr
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPagesBw(Math.max(0, pagesBw - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={pagesBw}
                      onChange={(e) => setPagesBw(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-sm font-bold text-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setPagesBw(pagesBw + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[11px] text-right text-slate-500 font-mono">
                    Subtotal: {formatRupiah(pagesBw * settings.printRateBw)}
                  </div>
                </div>

                {/* Berwarna */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">Full Color (Warna)</span>
                    <span className="font-mono text-orange-600 font-semibold">
                      @{formatRupiah(settings.printRateColor)}/lbr
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPagesColor(Math.max(0, pagesColor - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={pagesColor}
                      onChange={(e) => setPagesColor(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-sm font-bold text-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setPagesColor(pagesColor + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[11px] text-right text-orange-600 font-mono font-semibold">
                    Subtotal: {formatRupiah(pagesColor * settings.printRateColor)}
                  </div>
                </div>
              </div>

              {/* Total addition */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs">
                <span className="text-orange-900 font-semibold">Tambahan Biaya Cetak Kertas:</span>
                <span className="text-base font-extrabold font-mono text-orange-600">
                  +{formatRupiah(calcPrintSubtotal())}
                </span>
              </div>

              {statusMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}
                >
                  {statusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedBooking || selectedBooking.status === 'completed'}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Kirim Pesanan Cetak ke Stasiun Printer Lab</span>
              </button>
            </form>
          )}
        </div>

        {/* Quick Active Bookings Picker (Right 1 col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-red-600" />
              PC Sedang Digunakan Saat Ini
            </h3>
            <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-mono font-bold">
              {activeBookings.length} Aktif
            </span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {activeBookings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada PC yang aktif dipakai saat ini.
              </div>
            ) : (
              activeBookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleLookupBooking(b.bookingCode)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    bookingCode === b.bookingCode
                      ? 'bg-orange-50 border-orange-400 text-slate-900 ring-1 ring-orange-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-red-600">{b.computerCode}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{b.startTime} WIB</span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate">{b.studentName}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{b.bookingCode}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

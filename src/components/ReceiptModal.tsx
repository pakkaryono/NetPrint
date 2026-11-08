import React from 'react';
import QRCode from 'qrcode';
import { Booking, LabSettings, UserRole } from '../types';
import { formatRupiah, generateReceiptPDF } from '../services/pdfExport';
import { FileText, Printer, X, Download, CheckCircle2, Lock, AlertCircle } from 'lucide-react';

interface ReceiptModalProps {
  booking: Booking | null;
  settings: LabSettings;
  currentRole?: UserRole;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  booking,
  settings,
  currentRole = 'siswa',
  onClose,
}) => {
  const [qrUrl, setQrUrl] = React.useState<string>('');
  const isStaff = currentRole === 'operator' || currentRole === 'admin';

  React.useEffect(() => {
    if (booking) {
      QRCode.toDataURL(booking.bookingCode, { width: 140, margin: 1 })
        .then((url) => setQrUrl(url))
        .catch(() => {});
    }
  }, [booking]);

  if (!booking) return null;

  const handlePrint = () => {
    if (!isStaff && booking.paymentStatus === 'paid') {
      alert('Hanya operator dan admin yang bisa cetak ulang struk resmi. Silakan hubungi operator kasir atau kepala lab.');
      return;
    }
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!isStaff && booking.paymentStatus === 'paid') {
      alert('Hanya operator dan admin yang bisa cetak ulang struk resmi. Silakan hubungi operator kasir atau kepala lab.');
      return;
    }
    await generateReceiptPDF(booking, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-800 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Action Header in Modal */}
        <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Struk Bukti Sewa &amp; Cetak</h3>
              <span className="text-[10px] text-slate-500 font-medium">SMK Negeri 1 Songgom</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-8">
            {isStaff ? (
              <>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </>
            ) : booking.paymentStatus !== 'paid' ? (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan PDF Tiket</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* RESTRICTION NOTICE FOR SISWA ON PAID BOOKINGS */}
        {!isStaff && booking.paymentStatus === 'paid' && (
          <div className="no-print mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-orange-900 block">
                Aturan Cetak Ulang Struk &amp; Dokumen:
              </span>
              <span>
                Booking sudah selesai dan pembayaran lunas. <strong>Hanya operator dan admin yang bisa cetak ulang.</strong> Jika Anda (siswa) ingin cetak ulang struk ini, silakan hubungi operator lab atau admin.
              </span>
            </div>
          </div>
        )}

        {/* RECEIPT PAPER CONTAINER (White Paper Printed Cleanly - No Right Margin Overflow) */}
        <div id="receipt-print-area" className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm text-xs font-mono select-text border border-slate-200 w-full overflow-hidden">
          {/* Header Simetris Sesuai Lampiran Gambar (Logo di Kiri, Teks 4 Baris Rata Tengah) */}
          <div className="relative pb-3 border-b border-dashed border-slate-300">
            <div className="flex items-center justify-between min-h-[60px]">
              {/* Logo SMKN 1 Songgom di kiri */}
              <div className="shrink-0 w-12 sm:w-16 flex items-center justify-start">
                <img
                  src="/assets/aistudio/SMKN_1_SONGGOM_KECIL_3106485e.png"
                  alt="Logo SMKN 1 Songgom"
                  className="w-10 h-12 sm:w-12 sm:h-15 object-contain"
                />
              </div>

              {/* Tulisan Rata Tengah */}
              <div className="flex-1 text-center space-y-0.5 px-1 sm:px-2">
                <div className="text-[11px] sm:text-xs font-black tracking-wider text-red-600 uppercase">
                  USAHA MANDIRI
                </div>
                <div className="text-xs sm:text-sm font-black text-orange-600 font-mono tracking-wide">
                  &ldquo;NetPrint&rdquo;
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-950 uppercase leading-tight">
                  TEKNIK KOMPUTER DAN JARINGAN
                </div>
                <div className="text-[9px] sm:text-[11px] font-black text-slate-950 uppercase tracking-wide">
                  SMK NEGERI 1 SONGGOM
                </div>
              </div>

              {/* Dummy spacer balance width agar tulisan tetap di posisi center absolut */}
              <div className="w-12 sm:w-16 shrink-0 hidden sm:block" aria-hidden="true" />
            </div>

            <div className="text-[9px] text-slate-500 font-sans text-center pt-1.5">
              Alamat : {settings.address}
            </div>
          </div>

          {/* Struk Title & Code */}
          <div className="py-3 text-center border-b border-dashed border-slate-300">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700">
              STRUK BUKTI PEMBAYARAN RESMI
            </div>
            <div className="text-base font-extrabold text-red-600 mt-1 font-mono tracking-wider">
              {booking.bookingCode}
            </div>
            <div className="text-[10px] text-slate-500">
              Waktu Transaksi:{' '}
              {booking.paidAt
                ? new Date(booking.paidAt).toLocaleString('id-ID')
                : new Date().toLocaleString('id-ID')}
            </div>
          </div>

          {/* Student & Session Info */}
          <div className="py-3 space-y-1.5 text-[11px] border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">NISN Siswa:</span>
              <span className="font-bold text-slate-800">{booking.studentNisn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Siswa:</span>
              <span className="font-bold text-slate-900">{booking.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kelas:</span>
              <span className="text-slate-800 font-bold">{booking.studentClass}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-500 shrink-0">Keperluan:</span>
              <span className="text-slate-900 font-semibold text-right break-words max-w-[65%]">
                {booking.purpose && booking.purpose !== '-' ? booking.purpose : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unit Komputer / Durasi Sewa:</span>
              <span className="font-bold text-red-600">
                {booking.computerCode} / {booking.durationHours} Jam
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jadwal Sesi:</span>
              <span className="text-slate-800">
                {booking.bookingDate} ({booking.startTime} - {booking.endTime} WIB)
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span>
                Sewa PC {booking.computerCode} ({booking.durationHours} Jam)
              </span>
              <span className="font-semibold text-slate-900">{formatRupiah(booking.computerCost)}</span>
            </div>

            {booking.printPagesBw > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Cetak Dokumen Hitam Putih ({booking.printPagesBw} lbr)</span>
                <span>{formatRupiah(booking.printPagesBw * booking.printRateBw)}</span>
              </div>
            )}

            {booking.printPagesColor > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Cetak Dokumen Warna ({booking.printPagesColor} lbr)</span>
                <span>{formatRupiah(booking.printPagesColor * booking.printRateColor)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="py-3 space-y-1 text-xs border-b border-dashed border-slate-300">
            <div className="flex justify-between text-sm font-black text-slate-900">
              <span>TOTAL TAGIHAN:</span>
              <span className="text-red-600 font-extrabold">{formatRupiah(booking.totalCost)}</span>
            </div>

            {booking.paymentStatus === 'paid' && (
              <>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Tunai Diterima:</span>
                  <span>{formatRupiah(booking.amountPaid || booking.totalCost)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(booking.changeAmount || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Status Stamp & QR */}
          <div className="py-4 flex items-center justify-between">
            <div>
              <div
                className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold ${
                  booking.paymentStatus === 'paid'
                    ? 'border-emerald-500 text-emerald-800 bg-emerald-50'
                    : 'border-orange-500 text-orange-800 bg-orange-50'
                }`}
              >
                {booking.paymentStatus === 'paid' ? 'LUNAS (TUNAI)' : 'MENUNGGU BAYAR'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Petugas Kasir:{' '}
                <span className="font-semibold text-slate-800">{booking.operatorName || settings.operatorStaff}</span>
              </div>
            </div>

            {qrUrl && (
              <div className="text-center">
                <img src={qrUrl} alt="QR Code" className="w-16 h-16 mx-auto object-contain" />
                <span className="text-[9px] text-slate-500 block">KODE VALIDASI</span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center pt-2 text-[9px] text-slate-400 font-sans border-t border-dotted border-slate-200">
            Terima kasih telah mematuhi tata tertib USMAN NetPrint SMK Negeri 1 Songgom.
          </div>
        </div>

        {/* Dismiss Footer */}
        <div className="no-print mt-4 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Tutup Tampilan Struk
          </button>
        </div>
      </div>
    </div>
  );
};

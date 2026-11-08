import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, LabSettings } from '../types';

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const LOGO_SRC = '/assets/aistudio/SMKN_1_SONGGOM_KECIL_3106485e.png';
let cachedLogoDataUrl: string | null = null;

/**
 * Preload and cache logo as Base64 for instant embedding in jsPDF
 */
export const loadLogoImage = async (): Promise<string | null> => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const res = await fetch(LOGO_SRC);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUrl = reader.result as string;
        resolve(cachedLogoDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Gagal memuat logo SMK untuk PDF:', e);
    return null;
  }
};

/**
 * Generate official PDF receipt for lab rental + document printing
 */
export const generateReceiptPDF = async (booking: Booking, settings: LabSettings) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // A5 is 148mm x 210mm
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 148 mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 124 mm

  // Embed Logo SMK Negeri 1 Songgom di sebelah kiri kop
  const logoBase64 = await loadLogoImage();
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', marginX, 9, 16, 20);
  }

  // Header Simetris Sesuai Lampiran Gambar (Centered di seluruh lebar halaman)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38);
  doc.text('USAHA MANDIRI', pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12);
  doc.text('"NetPrint"', pageWidth / 2, 16.5, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TEKNIK KOMPUTER DAN JARINGAN', pageWidth / 2, 22, { align: 'center' });
  doc.text('SMK NEGERI 1 SONGGOM', pageWidth / 2, 27, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Alamat : ' + settings.address, pageWidth / 2, 33, { align: 'center' });

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, 36, pageWidth - marginX, 36);

  // Title of the receipt
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BUKTI PEMBAYARAN & STRUK SEWA LAB KOMPUTER', pageWidth / 2, 42, { align: 'center' });

  // Booking Info Block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const leftX = marginX;
  const colValX = marginX + 28;
  const rightX = pageWidth / 2 + 3;
  const rightValX = rightX + 35; // ruang untuk label 'Unit / Durasi Sewa'

  let y = 49;
  doc.text('Kode Booking', leftX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${booking.bookingCode}`, colValX, y);

  doc.setFont('helvetica', 'normal');
  doc.text('Tanggal Sesi', rightX, y);
  doc.text(`: ${booking.bookingDate}`, rightValX, y);

  y += 5;
  doc.text('NISN Siswa', leftX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${booking.studentNisn}`, colValX, y);

  doc.setFont('helvetica', 'normal');
  doc.text('Jam Penggunaan', rightX, y);
  doc.text(`: ${booking.startTime} - ${booking.endTime} WIB`, rightValX, y);

  y += 5;
  doc.text('Nama Siswa', leftX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${booking.studentName}`, colValX, y);

  doc.setFont('helvetica', 'normal');
  doc.text('Unit / Durasi Sewa', rightX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${booking.computerCode} / ${booking.durationHours} Jam`, rightValX, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Kelas', leftX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${booking.studentClass}`, colValX, y);

  doc.setFont('helvetica', 'normal');
  doc.text('Status Transaksi', rightX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(booking.paymentStatus === 'paid' ? 22 : 217, booking.paymentStatus === 'paid' ? 101 : 119, booking.paymentStatus === 'paid' ? 52 : 6);
  doc.text(`: ${booking.paymentStatus === 'paid' ? 'LUNAS (TUNAI)' : 'BELUM BAYAR'}`, rightValX, y);

  // Keperluan berdiri sendiri di baris terpisah agar muat teks panjang
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Keperluan', leftX, y);
  const purposeLines = doc.splitTextToSize(`: ${booking.purpose && booking.purpose !== '-' ? booking.purpose : '-'}`, contentWidth - 28);
  doc.text(purposeLines, colValX, y);

  const purposeHeight = (purposeLines.length - 1) * 3.8;
  const startTableY = y + 6 + purposeHeight;

  // Line items table
  const tableData: (string | number)[][] = [
    [
      '1',
      `Sewa Komputer ${booking.computerCode} (${booking.durationHours} Jam)`,
      `${booking.durationHours} Jam`,
      formatRupiah(booking.hourlyRate),
      formatRupiah(booking.computerCost),
    ],
  ];

  if (booking.printPagesBw > 0) {
    tableData.push([
      '2',
      `Layanan Cetak Dokumen (Hitam Putih)`,
      `${booking.printPagesBw} Lembar`,
      formatRupiah(booking.printRateBw),
      formatRupiah(booking.printPagesBw * booking.printRateBw),
    ]);
  }

  if (booking.printPagesColor > 0) {
    tableData.push([
      tableData.length + 1 + '',
      `Layanan Cetak Dokumen (Warna)`,
      `${booking.printPagesColor} Lembar`,
      formatRupiah(booking.printRateColor),
      formatRupiah(booking.printPagesColor * booking.printRateColor),
    ]);
  }

  // AutoTable exactly aligned to 124mm printable width (No right margin overflow)
  autoTable(doc, {
    startY: startTableY,
    head: [['No', 'Uraian Layanan', 'Volume', 'Tarif', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    tableWidth: contentWidth,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [51, 65, 85],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 105;

  // Total and Payment Summary Box
  let summaryY = finalY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Total Tagihan', pageWidth - marginX - 52, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupiah(booking.totalCost), pageWidth - marginX, summaryY, { align: 'right' });

  if (booking.paymentStatus === 'paid') {
    summaryY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Tunai Diterima', pageWidth - marginX - 52, summaryY);
    doc.text(formatRupiah(booking.amountPaid || booking.totalCost), pageWidth - marginX, summaryY, { align: 'right' });

    summaryY += 4.5;
    doc.text('Kembalian', pageWidth - marginX - 52, summaryY);
    doc.text(formatRupiah(booking.changeAmount || 0), pageWidth - marginX, summaryY, { align: 'right' });
  }

  // Stamp / Badge for Status
  doc.setDrawColor(booking.paymentStatus === 'paid' ? 22 : 217, booking.paymentStatus === 'paid' ? 101 : 119, booking.paymentStatus === 'paid' ? 52 : 6);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, finalY + 5, 48, 14, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(booking.paymentStatus === 'paid' ? 22 : 217, booking.paymentStatus === 'paid' ? 101 : 119, booking.paymentStatus === 'paid' ? 52 : 6);
  doc.text(booking.paymentStatus === 'paid' ? 'LUNAS (TUNAI)' : 'MENUNGGU PEMBAYARAN', marginX + 24, finalY + 14, { align: 'center' });

  // Signatures
  const signY = summaryY + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Songgom, ' + (booking.bookingDate || new Date().toISOString().split('T')[0]), pageWidth - marginX, signY, { align: 'right' });
  doc.text('Operator,', pageWidth - marginX, signY + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(booking.operatorName || settings.operatorStaff || 'Operator', pageWidth - marginX, signY + 19, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Siswa Penyewa,', marginX, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(booking.studentName, marginX, signY + 19);

  // Footer note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('* Struk ini merupakan bukti sah transaksi pemakaian USMAN NetPrint SMK Negeri 1 Songgom.', pageWidth / 2, signY + 26, { align: 'center' });

  // Download PDF
  doc.save(`Struk_Lab_${booking.bookingCode}.pdf`);
};

/**
 * Generate official financial & asset report PDF for SMKN 1 Songgom Headmaster / Admin
 */
export const generateFinancialReportPDF = async (bookings: Booking[], settings: LabSettings, periodTitle: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 269 mm

  // Embed Logo SMK Negeri 1 Songgom di sebelah kiri kop laporan
  const logoBase64 = await loadLogoImage();
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', marginX + 4, 8, 20, 25);
  }

  // Header Simetris Sesuai Lampiran Gambar (Centered di seluruh lebar halaman)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text('USAHA MANDIRI', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(234, 88, 12);
  doc.text('"NetPrint"', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('TEKNIK KOMPUTER DAN JARINGAN', pageWidth / 2, 21.5, { align: 'center' });
  doc.text('SMK NEGERI 1 SONGGOM', pageWidth / 2, 26.5, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN KEUANGAN & OPERASIONAL', pageWidth / 2, 33, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodTitle} | USMAN NetPrint`, pageWidth / 2, 38, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, 41, pageWidth - marginX, 41);

  // Financial KPI calculations
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const totalRental = paidBookings.reduce((sum, b) => sum + b.computerCost, 0);
  const totalPrint = paidBookings.reduce((sum, b) => sum + b.printCost, 0);
  const totalRevenue = totalRental + totalPrint;
  const totalHours = paidBookings.reduce((sum, b) => sum + b.durationHours, 0);
  const totalPrintedPages = paidBookings.reduce((sum, b) => sum + b.printPagesBw + b.printPagesColor, 0);

  // KPI boxes in PDF
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Transaksi: ${paidBookings.length} Sesi`, marginX + 2, 47);
  doc.text(`Total Durasi: ${totalHours} Jam`, 75, 47);
  doc.text(`Cetak Dokumen: ${totalPrintedPages} Lembar`, 135, 47);
  doc.text(`Pendapatan Sewa: ${formatRupiah(totalRental)}`, 190, 47);
  doc.setTextColor(22, 101, 52);
  doc.text(`TOTAL PENDAPATAN: ${formatRupiah(totalRevenue)}`, pageWidth - marginX - 2, 47, { align: 'right' });

  // Table of all bookings with separate Siswa, Kelas, and Keperluan columns
  const tableRows = bookings.map((b, idx) => [
    (idx + 1).toString(),
    b.bookingCode,
    `${b.bookingDate}\n${b.startTime}-${b.endTime}`,
    `${b.computerCode} (${b.durationHours} Jam)`,
    `${b.studentName}\nNISN: ${b.studentNisn}`,
    b.studentClass,
    b.purpose && b.purpose !== '-' ? b.purpose : '-',
    formatRupiah(b.computerCost),
    b.printPagesBw + b.printPagesColor > 0
      ? `${b.printPagesBw + b.printPagesColor} lbr\n(${formatRupiah(b.printCost)})`
      : '-',
    formatRupiah(b.totalCost),
    b.paymentStatus === 'paid' ? 'Lunas (Tunai)' : 'Belum Bayar',
  ]);

  autoTable(doc, {
    startY: 51,
    head: [
      [
        'No',
        'Kode Transaksi',
        'Tanggal & Sesi',
        'Unit / Durasi',
        'Siswa',
        'Kelas',
        'Keperluan',
        'Biaya Sewa',
        'Cetak Dokumen',
        'Total Tagihan',
        'Status',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    tableWidth: contentWidth,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 32 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 37 },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 26, halign: 'right' },
      9: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      10: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: marginX, right: marginX },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 160;

  // Signature Block
  const signY = Math.min(finalY + 10, doc.internal.pageSize.getHeight() - 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Mengetahui,', 30, signY);
  doc.text('Koordinator USMAN,', 30, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.adminStaff.replace(/Kepala Lab Komputer/gi, 'Koordinator USMAN'), 30, signY + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Songgom, ${new Date().toISOString().split('T')[0]}`, pageWidth - 45, signY, { align: 'center' });
  doc.text('Operator,', pageWidth - 45, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(settings.operatorStaff.replace(/Operator Kasir.*$/i, 'Operator'), pageWidth - 45, signY + 20, { align: 'center' });

  doc.save(`Laporan_Keuangan_Lab_SMKN1Songgom_${periodTitle.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Export records as CSV for Excel
 */
export const exportTransactionsToCSV = (bookings: Booking[]) => {
  const headers = [
    'Kode Booking',
    'Tanggal',
    'Unit Komputer',
    'NISN Siswa',
    'Nama Siswa',
    'Kelas',
    'Keperluan',
    'Jam Mulai',
    'Jam Selesai',
    'Durasi (Jam)',
    'Biaya Sewa (IDR)',
    'Cetak BW (Lembar)',
    'Cetak Warna (Lembar)',
    'Biaya Cetak (IDR)',
    'Total Tagihan (IDR)',
    'Status Pembayaran',
    'Metode Pembayaran',
    'Waktu Bayar',
    'Petugas Kasir',
    'Status Sesi',
  ];

  const rows = bookings.map((b) => [
    `"${b.bookingCode}"`,
    `"${b.bookingDate}"`,
    `"${b.computerCode}"`,
    `"${b.studentNisn}"`,
    `"${b.studentName.replace(/"/g, '""')}"`,
    `"${b.studentClass}"`,
    `"${(b.purpose && b.purpose !== '-' ? b.purpose : '-').replace(/"/g, '""')}"`,
    `"${b.startTime}"`,
    `"${b.endTime}"`,
    b.durationHours,
    b.computerCost,
    b.printPagesBw,
    b.printPagesColor,
    b.printCost,
    b.totalCost,
    `"${b.paymentStatus}"`,
    `"${b.paymentMethod}"`,
    `"${b.paidAt || '-'}"`,
    `"${b.operatorName || '-'}"`,
    `"${b.status}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Transaksi_Lab_SMKN1Songgom_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

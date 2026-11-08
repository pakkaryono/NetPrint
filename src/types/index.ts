export type ComputerStatus = 'available' | 'in_use' | 'booked' | 'maintenance';

export type LabSection = 'sayap_kiri' | 'tengah_kiri' | 'tengah_kanan' | 'sayap_kanan';

export interface ComputerUnit {
  id: string;
  code: string; // PC-01 to PC-28
  label: string;
  specs: {
    processor: string;
    ram: string;
    gpu: string;
    storage: string;
    os: string;
  };
  row: number; // 1 to 4 (Baris 1 s/d 4)
  section: LabSection; // Sesuai denah: sayap_kiri, tengah_kiri, tengah_kanan, sayap_kanan
  side: 'kiri' | 'kanan'; // Sisi meja
  deskPosition: 1 | 2; // Posisi 1 (kiri) atau 2 (kanan) pada meja berpasangan
  status: ComputerStatus;
  currentBookingId?: string;
  currentStudentNisn?: string;
  currentStudentName?: string;
  sessionStartTime?: string;
  sessionEndTime?: string; // ISO string
  checkInDeadline?: string; // Jam booking + 5 menit
}

export interface Student {
  nisn: string; // 10 digits
  name: string;
  className: string;
  department?: 'RPL' | 'TKJ' | 'AKL' | 'TKR' | 'TBSM';
  purpose?: string; // Keperluan: input siswa atau pemesan
  phone?: string;
  email?: string;
  totalBookings: number;
  totalHoursUsed: number;
  lastBookingDate?: string;
}

export type BookingStatus =
  | 'booked_waiting_checkin' // Siswa sudah booking, belum bayar, menunggu hadir di lab
  | 'active'                 // Siswa sudah check-in ke operator, PC menyala merah digunakan
  | 'awaiting_payment'       // Sesi waktu habis atau selesai, menunggu pembayaran ke operator
  | 'completed'              // Pembayaran lunas di kasir, sesi selesai, struk tercetak
  | 'cancelled';             // Dibatalkan mandiri atau otomatis karena telat >10 menit

export interface Booking {
  id: string;
  bookingCode: string; // Format: SNG-YYYYMMDD-XXXX
  computerId: string;
  computerCode: string;
  studentNisn: string;
  studentName: string;
  studentClass: string;
  purpose?: string; // Keperluan: input siswa atau pemesan
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm, e.g. "08:00"
  durationHours: 1 | 2 | 3;
  endTime: string; // HH:mm, e.g. "09:00"
  checkInDeadline: string; // HH:mm, e.g. "08:10" (startTime + 10 minutes)
  status: BookingStatus;

  // Waktu kehadiran & check-in
  checkedInAt?: string; // ISO string saat operator scan / konfirmasi hadir

  // Tarif & biaya
  hourlyRate: number;
  computerCost: number;

  // Layanan cetak dokumen (dipesan pada PC tersebut)
  printPagesBw: number;
  printRateBw: number;
  printPagesColor: number;
  printRateColor: number;
  printCost: number;

  // Tagihan akhir & pembayaran tunai
  totalCost: number;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod: 'cash';
  amountPaid?: number;
  changeAmount?: number;
  paidAt?: string;
  operatorName?: string;

  // Actual session hardware usage tracking
  actualStartTime?: string;
  actualEndTime?: string;

  // Pelacakan notifikasi 2 kali (10 menit sebelum habis & waktu habis)
  hasNotified10Min?: boolean;
  hasNotifiedExpired?: boolean;

  // Pembatalan
  cancelledAt?: string;
  cancellationReason?: string;

  createdAt: string;
}

export interface LabSettings {
  rate1Hour: number;
  rate2Hours: number;
  rate3Hours: number;
  printRateBw: number;
  printRateColor: number;
  minDurationHours: 1;
  maxDurationHours: 3;
  cooldownDays: number;
  cancellationGraceMinutes: number; // 15 menit sebelum start
  lateCheckInTimeoutMinutes: number; // 5 menit toleransi kehadiran saat waktu tiba
  warningNoticeMinutes: number; // 10 menit sebelum waktu habis
  openHour: string;
  closeHour: string;
  schoolName: string;
  labName: string;
  address: string;
  operatorStaff: string;
  adminStaff: string;
}

export interface LabNotification {
  id: string;
  type: 'booking' | 'checkin' | 'warning' | 'late_cancelled' | 'payment' | 'completed' | 'cancelled';
  title: string;
  message: string;
  timestamp: string;
  computerCode?: string;
  bookingCode?: string;
  read: boolean;
}

export type UserRole = 'siswa' | 'operator' | 'admin';

export interface AuthSession {
  role: UserRole;
  name: string;
  username: string;
  isLoggedIn: boolean;
}

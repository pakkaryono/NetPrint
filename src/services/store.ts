import { ComputerUnit, Student, Booking, LabSettings, LabNotification, AuthSession, UserRole } from '../types';
import { INITIAL_SETTINGS, INITIAL_STUDENTS, generateInitialComputers, generateInitialBookings } from './initialData';
import { soundAlert } from './soundAlert';

const KEYS = {
  COMPUTERS: 'sng_lab_computers_v2',
  STUDENTS: 'sng_lab_students_v2',
  BOOKINGS: 'sng_lab_bookings_v2',
  SETTINGS: 'sng_lab_settings_v2',
  NOTIFICATIONS: 'sng_lab_notifications_v2',
  LAST_RESET_DATE: 'sng_lab_last_reset_date_v2',
  SUPABASE_CONFIG: 'sng_lab_supabase_config_v2',
  AUTH_SESSION: 'sng_lab_auth_session_v2',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

class LabStore {
  private computers: ComputerUnit[] = [];
  private students: Student[] = [];
  private bookings: Booking[] = [];
  private settings: LabSettings = INITIAL_SETTINGS;
  private notifications: LabNotification[] = [];
  private authSession: AuthSession = {
    role: 'siswa',
    name: 'Siswa (Tamu Lab)',
    username: 'siswa',
    isLoggedIn: false,
  };
  private supabaseConfig: SupabaseConfig = { url: '', anonKey: '', isConnected: false };
  private listeners: Set<() => void> = new Set();
  private warnedBookings: Set<string> = new Set();
  private timerInterval: number | null = null;

  constructor() {
    this.loadFromStorage();
    this.startRealtimeEngine();
  }

  private loadFromStorage() {
    try {
      const DATA_VERSION = 'v5_usman_netprint_clean_slate';
      const currentVersion = localStorage.getItem('LAB_APP_DATA_VERSION');

      if (currentVersion !== DATA_VERSION) {
        // Reset kode dan booking siswa, kosongkan statistik aset dan riwayat, mulai dari awal
        localStorage.setItem('LAB_APP_DATA_VERSION', DATA_VERSION);
        localStorage.removeItem(KEYS.BOOKINGS);
        localStorage.removeItem(KEYS.COMPUTERS);
        localStorage.removeItem(KEYS.NOTIFICATIONS);
        localStorage.removeItem(KEYS.STUDENTS);

        this.settings = INITIAL_SETTINGS;
        this.computers = generateInitialComputers();
        this.students = [];
        this.bookings = [];
        this.notifications = [];
        this.saveToStorage();
        return;
      }

      const storedSettings = localStorage.getItem(KEYS.SETTINGS);
      this.settings = storedSettings ? JSON.parse(storedSettings) : INITIAL_SETTINGS;

      const storedComputers = localStorage.getItem(KEYS.COMPUTERS);
      this.computers = storedComputers ? JSON.parse(storedComputers) : generateInitialComputers();

      const storedStudents = localStorage.getItem(KEYS.STUDENTS);
      this.students = storedStudents ? JSON.parse(storedStudents) : INITIAL_STUDENTS;

      const storedBookings = localStorage.getItem(KEYS.BOOKINGS);
      this.bookings = storedBookings ? JSON.parse(storedBookings) : [];

      const storedNotifs = localStorage.getItem(KEYS.NOTIFICATIONS);
      this.notifications = storedNotifs ? JSON.parse(storedNotifs) : [];

      const storedAuth = localStorage.getItem(KEYS.AUTH_SESSION);
      if (storedAuth) {
        this.authSession = JSON.parse(storedAuth);
      }

      const storedSupabase = localStorage.getItem(KEYS.SUPABASE_CONFIG);
      if (storedSupabase) {
        this.supabaseConfig = JSON.parse(storedSupabase);
      }
    } catch (e) {
      console.error('Error loading lab data:', e);
      this.settings = INITIAL_SETTINGS;
      this.computers = generateInitialComputers();
      this.students = INITIAL_STUDENTS;
      this.bookings = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(this.settings));
      localStorage.setItem(KEYS.COMPUTERS, JSON.stringify(this.computers));
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(this.students));
      localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(this.bookings));
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
      localStorage.setItem(KEYS.AUTH_SESSION, JSON.stringify(this.authSession));
      localStorage.setItem(KEYS.SUPABASE_CONFIG, JSON.stringify(this.supabaseConfig));
    } catch (e) {
      console.error('Error saving lab data:', e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  // --- Real-time Engine (10-min late check-in timeout & 10-min end warning) ---
  private startRealtimeEngine() {
    if (typeof window === 'undefined') return;

    this.timerInterval = window.setInterval(() => {
      this.checkLateCheckInTimeout();
      this.checkActiveSessions();
      this.checkMidnightReset();
    }, 1000);
  }

  public stopRealtimeEngine() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  /**
   * KETENTUAN:
   * Siswa setelah booking tidak perlu bayar dulu, bisa pesan hari sebelumnya atau beberapa hari sebelumnya.
   * Tapi jika sudah pesan, 5 menit saat waktu pesanan tiba siswa tidak konfirmasi barcode atau kode ke operator,
   * maka pesanan direset dan komputer menjadi tersedia kembali (hijau).
   */
  private checkLateCheckInTimeout() {
    const now = new Date();
    let updated = false;

    this.bookings.forEach((booking) => {
      if (booking.status === 'booked_waiting_checkin') {
        const startDateTime = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
        // Batas toleransi kehadiran: 5 menit saat waktu pesanan tiba
        const timeoutThreshold = new Date(
          startDateTime.getTime() + this.settings.lateCheckInTimeoutMinutes * 60 * 1000
        );

        if (now.getTime() > timeoutThreshold.getTime()) {
          // Lepas unit komputer agar kembali menyala HIJAU (tersedia kembali)
          const comp = this.computers.find(
            (c) => c.id === booking.computerId || c.code === booking.computerCode
          );
          if (comp && comp.currentBookingId === booking.bookingCode) {
            comp.status = 'available';
            comp.currentBookingId = undefined;
            comp.currentStudentNisn = undefined;
            comp.currentStudentName = undefined;
            comp.checkInDeadline = undefined;
          }

          this.addNotification({
            type: 'late_cancelled',
            title: `Pemesanan ${booking.bookingCode} Direset (Telat 5 Mnt)`,
            message: `Siswa ${booking.studentName} tidak konfirmasi barcode/kode ke operator dalam 5 menit saat waktu tiba (${booking.startTime} WIB). Booking gagal dan dihapus, unit ${booking.computerCode} direset menjadi tersedia (hijau).`,
            computerCode: booking.computerCode,
            bookingCode: booking.bookingCode,
          });

          // Jika siswa sudah booking dan gagal maka tidak perlu ada bukti booking baik di siswa maupun di operator dan admin
          this.bookings = this.bookings.filter((b) => b.id !== booking.id && b.bookingCode !== booking.bookingCode);

          updated = true;
        }
      }
    });

    if (updated) {
      this.notify();
    }
  }

  /**
   * KETENTUAN NOTIFIKASI PC:
   * Notifikasi peringatan waktu pada PC hanya 2 kali:
   * 1. Tepat 1 kali untuk PC 10 menit sebelum habis waktunya (Notifikasi 1/2 + Chime Alarm)
   * 2. Tepat 1 kali untuk PC yang waktunya sudah habis (Notifikasi 2/2 + Chime Alarm + Ubah ke awaiting_payment)
   */
  private checkActiveSessions() {
    const now = new Date().getTime();
    let updated = false;

    this.computers.forEach((comp) => {
      if (comp.status === 'in_use' && comp.sessionEndTime) {
        const endTime = new Date(comp.sessionEndTime).getTime();
        const remainingMs = endTime - now;
        const remainingMinutes = Math.floor(remainingMs / (60 * 1000));

        const booking = this.bookings.find(
          (b) => b.bookingCode === comp.currentBookingId || b.id === comp.currentBookingId
        );

        // NOTIFIKASI 1: 10 menit sebelum waktu habis (hanya 1 kali per sesi)
        if (remainingMinutes <= this.settings.warningNoticeMinutes && remainingMinutes > 0) {
          const bookingKey = `${comp.currentBookingId}_warned_10m`;
          const alreadyWarned = (booking && booking.hasNotified10Min) || this.warnedBookings.has(bookingKey);

          if (!alreadyWarned) {
            if (booking) booking.hasNotified10Min = true;
            this.warnedBookings.add(bookingKey);
            soundAlert.playWarningChime();
            this.addNotification({
              type: 'warning',
              title: `Peringatan (1/2): Sisa Waktu di ${comp.code} Tersisa ${remainingMinutes} Menit!`,
              message: `Peringatan 10 menit sebelum waktu habis untuk ${comp.code} (${comp.currentStudentName}). Harap simpan semua pekerjaan Anda dan bersiap menuju kasir.`,
              computerCode: comp.code,
              bookingCode: comp.currentBookingId,
            });
            updated = true;
          }
        }

        // NOTIFIKASI 2: Waktu pemakaian habis (hanya 1 kali per sesi)
        if (remainingMs <= 0) {
          const expiredKey = `${comp.currentBookingId}_warned_expired`;
          const alreadyExpiredWarned = (booking && booking.hasNotifiedExpired) || this.warnedBookings.has(expiredKey);

          if (!alreadyExpiredWarned) {
            if (booking) {
              booking.hasNotifiedExpired = true;
              if (booking.status === 'active') {
                booking.status = 'awaiting_payment';
                booking.actualEndTime = new Date().toISOString();
              }
            }
            this.warnedBookings.add(expiredKey);
            soundAlert.playWarningChime();
            this.addNotification({
              type: 'warning',
              title: `Peringatan (2/2): Waktu Sesi di ${comp.code} Telah Habis!`,
              message: `Durasi pemakaian komputer untuk ${comp.currentStudentName} (${comp.code}) telah habis. Pengguna dipersilakan menuju kasir untuk pembayaran & cetak dokumen.`,
              computerCode: comp.code,
              bookingCode: comp.currentBookingId,
            });
            updated = true;
          }
        }
      }
    });

    if (updated) {
      this.notify();
    }
  }

  private checkMidnightReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = localStorage.getItem(KEYS.LAST_RESET_DATE);

    if (lastReset && lastReset !== today) {
      this.executeMidnightReset();
    }
  }

  public executeMidnightReset() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(KEYS.LAST_RESET_DATE, today);

    // KETENTUAN HARI KEDUA & MASA DEPAN:
    // Jika siswa sudah pesan untuk hari kedua / hari berjalan (b.bookingDate >= today),
    // jangan direset kode booking dan PC yang telah tersimpan!
    // Hanya batalkan pesanan lampau yang belum check-in (b.bookingDate < today).
    this.bookings.forEach((b) => {
      if (b.status === 'booked_waiting_checkin' && b.bookingDate < today) {
        b.status = 'cancelled';
        b.cancellationReason = 'Direset otomatis pada pergantian hari 00:00 WIB (Jadwal Lampau)';
      }
    });

    // Reset status PC sesi kemarin
    this.computers.forEach((c) => {
      if (c.status !== 'maintenance') {
        c.status = 'available';
        c.currentBookingId = undefined;
        c.currentStudentNisn = undefined;
        c.currentStudentName = undefined;
        c.sessionStartTime = undefined;
        c.sessionEndTime = undefined;
        c.checkInDeadline = undefined;
      }
    });

    // Sinkronkan kembali PC dengan jadwal booking aktif untuk hari ini
    const todayBookings = this.bookings.filter(
      (b) => b.bookingDate === today && (b.status === 'booked_waiting_checkin' || b.status === 'active')
    );
    todayBookings.forEach((b) => {
      const comp = this.computers.find((c) => c.id === b.computerId || c.code === b.computerCode);
      if (comp && comp.status !== 'maintenance') {
        comp.status = b.status === 'active' ? 'in_use' : 'booked';
        comp.currentBookingId = b.bookingCode;
        comp.currentStudentNisn = b.studentNisn;
        comp.currentStudentName = b.studentName;
        comp.checkInDeadline = b.checkInDeadline;
      }
    });

    this.saveToStorage();
    this.addNotification({
      type: 'booking',
      title: 'Sinkronisasi / Reset 00:00 WIB Selesai',
      message: `Jadwal harian disinkronkan. Pesanan hari kedua dan hari berjalan tetap aman tersimpan.`,
    });

    this.notify();
  }

  // --- Getters ---
  public getComputers(): ComputerUnit[] {
    return this.computers;
  }

  public getStudents(): Student[] {
    return this.students;
  }

  public getBookings(): Booking[] {
    return this.bookings;
  }

  public getSettings(): LabSettings {
    return this.settings;
  }

  public getNotifications(): LabNotification[] {
    return this.notifications;
  }

  public getAuthSession(): AuthSession {
    return this.authSession;
  }

  public getSupabaseConfig(): SupabaseConfig {
    return this.supabaseConfig;
  }

  // --- Authentication Service ---
  /**
   * KETENTUAN LOGIN:
   * Operator: username "operator", password "ops"
   * Admin: username "admin", password "gripil"
   */
  public login(username: string, pass: string): { success: boolean; message: string; session?: AuthSession } {
    const u = username.trim().toLowerCase();
    const p = pass.trim();

    if (u === 'operator' && p === 'ops') {
      this.authSession = {
        role: 'operator',
        name: 'Operator (M. Fadil)',
        username: 'operator',
        isLoggedIn: true,
      };
      this.notify();
      return { success: true, message: 'Login Operator berhasil!', session: this.authSession };
    }

    if (u === 'admin' && p === 'gripil') {
      this.authSession = {
        role: 'admin',
        name: 'Koordinator USMAN (Karyono, S.Kom)',
        username: 'admin',
        isLoggedIn: true,
      };
      this.notify();
      return { success: true, message: 'Login Administrator berhasil!', session: this.authSession };
    }

    return {
      success: false,
      message: 'Username atau password salah! (Operator: operator/ops, Admin: admin/gripil)',
    };
  }

  public logout() {
    this.authSession = {
      role: 'siswa',
      name: 'Siswa (Tamu Lab)',
      username: 'siswa',
      isLoggedIn: false,
    };
    this.notify();
  }

  // --- Notifications Helper ---
  public addNotification(notif: Omit<LabNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotif: LabNotification = {
      ...notif,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(newNotif);
    if (this.notifications.length > 50) this.notifications.pop();
    this.notify();
  }

  public markNotificationAsRead(id: string) {
    const n = this.notifications.find((i) => i.id === id);
    if (n) {
      n.read = true;
      this.notify();
    }
  }

  public clearAllNotifications() {
    this.notifications = [];
    this.notify();
  }

  // --- Student Registration ---
  public getStudentByNisn(nisn: string): Student | undefined {
    return this.students.find((s) => s.nisn.trim() === nisn.trim());
  }

  public registerOrUpdateStudent(studentData: Omit<Student, 'totalBookings' | 'totalHoursUsed'>): Student {
    const existingIndex = this.students.findIndex((s) => s.nisn === studentData.nisn);
    if (existingIndex >= 0) {
      this.students[existingIndex] = { ...this.students[existingIndex], ...studentData };
      this.notify();
      return this.students[existingIndex];
    } else {
      const newStudent: Student = { ...studentData, totalBookings: 0, totalHoursUsed: 0 };
      this.students.push(newStudent);
      this.notify();
      return newStudent;
    }
  }

  // --- Validation ---
  public validateBookingRequest(params: {
    nisn: string;
    bookingDate: string;
    startTime: string;
    durationHours: 1 | 2 | 3;
    computerId: string;
  }): { valid: boolean; error?: string } {
    const { nisn, bookingDate, startTime, durationHours, computerId } = params;

    if (durationHours < 1 || durationHours > 3) {
      return { valid: false, error: 'Durasi pemesanan minimal 1 jam dan maksimal 3 jam.' };
    }

    // Validasi jam berjalan dan batas maksimal 14.30 WIB
    const [startHr, startMin] = startTime.split(':').map((v) => parseInt(v, 10));

    // Jika pesan lebih dari jam 14.30 WIB
    if (startHr > 14 || (startHr === 14 && startMin > 30)) {
      return { valid: false, error: 'Waktu booking tidak sesuai' };
    }

    // Jika pesan jam 14.30 WIB, waktunya HANYA 1 jam
    if (startHr === 14 && startMin === 30 && durationHours > 1) {
      return { valid: false, error: 'Waktu booking tidak sesuai' };
    }

    // Cek jam berjalan jika pemesanan untuk hari ini (misal sekarang 08.00, pesan 07.30 tidak bisa)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (bookingDate === todayStr) {
      const currentHr = now.getHours();
      const currentMin = now.getMinutes();
      if (startHr < currentHr || (startHr === currentHr && startMin < currentMin)) {
        return { valid: false, error: 'Waktu booking tidak sesuai' };
      }
    }

    // 1. Siswa yang sedang booking tidak bisa booking lagi di hari yang sama atau jam yang sama
    const studentBookingsOnDay = this.bookings.filter(
      (b) =>
        b.studentNisn === nisn &&
        b.bookingDate === bookingDate &&
        b.status !== 'cancelled'
    );

    if (studentBookingsOnDay.length > 0) {
      return {
        valid: false,
        error: `Siswa dengan NISN ${nisn} sudah memiliki pemesanan pada tanggal ${bookingDate}. Tidak bisa booking lagi di hari yang sama agar siswa lain memiliki kesempatan menggunakan komputer lab.`,
      };
    }

    // 2. Cooldown 2 hari ke depan (dan 2 hari sebelumnya): agar siswa lain bisa merasakan booking komputer
    const targetDateObj = new Date(bookingDate + 'T00:00:00');
    const cooldownDays = this.settings.cooldownDays || 2;
    const cooldownConflict = this.bookings.find((b) => {
      if (b.studentNisn !== nisn || b.status === 'cancelled') return false;
      const existingDateObj = new Date(b.bookingDate + 'T00:00:00');
      const diffMs = Math.abs(targetDateObj.getTime() - existingDateObj.getTime());
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= cooldownDays;
    });

    if (cooldownConflict) {
      return {
        valid: false,
        error: `Aturan Lab: Terdapat jeda (cooldown) minimal ${cooldownDays} hari dengan jadwal booking Anda pada tanggal ${cooldownConflict.bookingDate}. Siswa belum bisa booking lagi agar siswa lain bisa merasakan booking komputer lab.`,
      };
    }

    // Komputer harus available
    const comp = this.computers.find((c) => c.id === computerId);
    if (!comp) return { valid: false, error: 'Komputer tidak ditemukan.' };
    if (comp.status === 'maintenance') return { valid: false, error: 'Unit sedang dalam masa perbaikan/maintenance.' };

    const startHourInt = parseInt(startTime.split(':')[0], 10);
    const endHourInt = startHourInt + durationHours;

    const compOccupied = this.bookings.some((b) => {
      if (b.computerId !== computerId || b.bookingDate !== bookingDate || b.status === 'cancelled') return false;
      const bStart = parseInt(b.startTime.split(':')[0], 10);
      const bEnd = parseInt(b.endTime.split(':')[0], 10);
      return Math.max(startHourInt, bStart) < Math.min(endHourInt, bEnd);
    });

    if (compOccupied) {
      return { valid: false, error: `Unit ${comp.code} sudah dipesan siswa lain pada jadwal tersebut.` };
    }

    return { valid: true };
  }

  // --- Create Booking (NO PAYMENT UPFRONT) ---
  public createBooking(data: {
    studentNisn: string;
    studentName: string;
    studentClass: string;
    purpose?: string;
    computerId: string;
    bookingDate: string;
    startTime: string;
    durationHours: 1 | 2 | 3;
    department?: 'RPL' | 'TKJ' | 'AKL' | 'TKR' | 'TBSM';
  }): Booking {
    const comp = this.computers.find((c) => c.id === data.computerId);
    if (!comp) throw new Error('Komputer tidak ditemukan.');

    const startHour = parseInt(data.startTime.split(':')[0], 10);
    const endHour = startHour + data.durationHours;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    // Hitung batas hadir: startTime + 5 menit toleransi
    const startMinutes = parseInt(data.startTime.split(':')[1] || '0', 10);
    const deadlineMin = (startMinutes + this.settings.lateCheckInTimeoutMinutes) % 60;
    const deadlineHr = startHour + Math.floor((startMinutes + this.settings.lateCheckInTimeoutMinutes) / 60);
    const checkInDeadline = `${deadlineHr.toString().padStart(2, '0')}:${deadlineMin.toString().padStart(2, '0')}`;

    let computerCost = this.settings.rate1Hour;
    if (data.durationHours === 2) computerCost = this.settings.rate2Hours;
    if (data.durationHours === 3) computerCost = this.settings.rate3Hours;

    const dateStr = data.bookingDate.replace(/-/g, '');
    const currentDayBookings = this.bookings.filter((b) => b.bookingDate === data.bookingDate);
    const seqNum = (currentDayBookings.length + 1).toString().padStart(4, '0');
    const bookingCode = `SNG-${dateStr}-${seqNum}`;

    const newBooking: Booking = {
      id: 'book-' + Date.now(),
      bookingCode,
      computerId: comp.id,
      computerCode: comp.code,
      studentNisn: data.studentNisn,
      studentName: data.studentName,
      studentClass: data.studentClass,
      purpose: data.purpose || '-',
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      durationHours: data.durationHours,
      endTime,
      checkInDeadline,
      status: 'booked_waiting_checkin', // Siswa TIDAK PERLU BAYAR DULU!
      hourlyRate: this.settings.rate1Hour,
      computerCost,
      printPagesBw: 0,
      printRateBw: this.settings.printRateBw,
      printPagesColor: 0,
      printRateColor: this.settings.printRateColor,
      printCost: 0,
      totalCost: computerCost,
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      createdAt: new Date().toISOString(),
    };

    this.bookings.unshift(newBooking);

    // Tandai status komputer sebagai "booked" (kuning) menunggu konfirmasi hadir jika untuk hari ini
    const today = new Date().toISOString().split('T')[0];
    if (data.bookingDate === today && comp.status === 'available') {
      comp.status = 'booked';
      comp.currentBookingId = newBooking.bookingCode;
      comp.currentStudentNisn = data.studentNisn;
      comp.currentStudentName = data.studentName;
      comp.checkInDeadline = checkInDeadline;
    }

    const student = this.registerOrUpdateStudent({
      nisn: data.studentNisn,
      name: data.studentName,
      className: data.studentClass,
      purpose: newBooking.purpose,
      department: data.department || 'TKJ',
    });
    student.lastBookingDate = data.bookingDate;

    soundAlert.playSuccessChime();

    this.addNotification({
      type: 'booking',
      title: `Booking Diterima: ${newBooking.bookingCode}`,
      message: `${data.studentName} berhasil memesan ${comp.code} (${data.startTime} WIB). Tidak perlu bayar dulu. Harap hadir sebelum ${checkInDeadline} WIB.`,
      computerCode: comp.code,
      bookingCode: newBooking.bookingCode,
    });

    this.notify();
    return newBooking;
  }

  /**
   * KETENTUAN 3:
   * Siswa datang ke operator -> scan bukti booking -> konfirmasi hadir -> PC AKTIF (MERAH)
   * Siswa langsung gunakan PC sesuai pesanan jam nya. (Belum bayar!)
   */
  public operatorConfirmCheckIn(bookingCode: string): { success: boolean; message: string; booking?: Booking } {
    const booking = this.bookings.find((b) => b.bookingCode.trim() === bookingCode.trim());
    if (!booking) {
      return { success: false, message: 'Kode booking tidak ditemukan.' };
    }

    if (booking.status === 'cancelled') {
      return { success: false, message: 'Pesanan ini sudah dibatalkan atau kadaluarsa.' };
    }

    if (booking.status === 'active') {
      return { success: false, message: 'Sesi ini sudah aktif dan sedang berjalan.' };
    }

    if (booking.status === 'completed') {
      return { success: false, message: 'Pesanan ini sudah selesai.' };
    }

    const now = new Date();
    const sessionEndTime = new Date(now.getTime() + booking.durationHours * 60 * 60 * 1000);

    booking.status = 'active';
    booking.checkedInAt = now.toISOString();
    booking.actualStartTime = now.toISOString();
    booking.actualEndTime = sessionEndTime.toISOString();
    booking.hasNotified10Min = false; // Reset pelacakan notifikasi
    booking.hasNotifiedExpired = false;
    this.warnedBookings.delete(`${booking.bookingCode}_warned_10m`);
    this.warnedBookings.delete(`${booking.bookingCode}_warned_expired`);

    // Aktifkan unit komputer: MENYALA MERAH dan aktifkan timer mundur!
    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (comp) {
      comp.status = 'in_use';
      comp.currentBookingId = booking.bookingCode;
      comp.currentStudentNisn = booking.studentNisn;
      comp.currentStudentName = booking.studentName;
      comp.sessionStartTime = now.toISOString();
      comp.sessionEndTime = sessionEndTime.toISOString();
      comp.checkInDeadline = undefined;
    }

    soundAlert.playSuccessChime();

    this.addNotification({
      type: 'checkin',
      title: `Check-in Hadir: ${comp?.code || booking.computerCode}`,
      message: `${booking.studentName} telah hadir dan diverifikasi. Unit ${booking.computerCode} kini aktif menyala MERAH (${booking.durationHours} Jam).`,
      computerCode: booking.computerCode,
      bookingCode: booking.bookingCode,
    });

    this.notify();
    return { success: true, message: 'Check-in berhasil! PC telah aktif menyala MERAH.', booking };
  }

  /**
   * KETENTUAN 4:
   * Tambah pesanan cetak dokumen pada kode booking PC tersebut.
   */
  public addPrintToBooking(params: {
    bookingCode: string;
    printPagesBw: number;
    printPagesColor: number;
  }): { success: boolean; message: string } {
    const booking = this.bookings.find((b) => b.bookingCode.trim() === params.bookingCode.trim());
    if (!booking) return { success: false, message: 'Booking tidak ditemukan.' };

    booking.printPagesBw = (booking.printPagesBw || 0) + (params.printPagesBw || 0);
    booking.printPagesColor = (booking.printPagesColor || 0) + (params.printPagesColor || 0);
    booking.printCost =
      booking.printPagesBw * this.settings.printRateBw +
      booking.printPagesColor * this.settings.printRateColor;
    booking.totalCost = booking.computerCost + booking.printCost;

    this.addNotification({
      type: 'booking',
      title: `Cetak Dokumen Ditambahkan: ${booking.computerCode}`,
      message: `Tambahan cetak: ${params.printPagesBw} lembar BW, ${params.printPagesColor} lembar Warna pada PC ${booking.computerCode}.`,
      computerCode: booking.computerCode,
      bookingCode: booking.bookingCode,
    });

    this.notify();
    return { success: true, message: 'Pesanan cetak dokumen berhasil ditambahkan ke tagihan.' };
  }

  /**
   * KETENTUAN 5:
   * Ketika selesai semua: siswa bayar ke operator, dihitung durasi booking + jumlah kertas cetak,
   * struk dicetak/diunduh, dan PC dilepas kembali ke hijau (tersedia).
   */
  public operatorFinalCheckoutAndPay(params: {
    bookingCode: string;
    printPagesBw: number;
    printPagesColor: number;
    amountPaid: number;
    operatorName: string;
  }): { success: boolean; message: string; booking?: Booking } {
    const { bookingCode, printPagesBw, printPagesColor, amountPaid, operatorName } = params;
    const booking = this.bookings.find((b) => b.bookingCode.trim() === bookingCode.trim());

    if (!booking) return { success: false, message: 'Kode booking tidak ditemukan.' };
    if (booking.status === 'completed') return { success: false, message: 'Transaksi ini sudah diselesaikan.' };

    // Update jumlah lembar cetak jika disesuaikan kasir
    booking.printPagesBw = printPagesBw;
    booking.printPagesColor = printPagesColor;
    booking.printCost =
      printPagesBw * this.settings.printRateBw + printPagesColor * this.settings.printRateColor;
    const grandTotal = booking.computerCost + booking.printCost;
    booking.totalCost = grandTotal;

    if (amountPaid < grandTotal) {
      return {
        success: false,
        message: `Uang tunai kurang. Total tagihan: Rp ${grandTotal.toLocaleString('id-ID')}, diterima: Rp ${amountPaid.toLocaleString('id-ID')}.`,
      };
    }

    const changeAmount = amountPaid - grandTotal;
    const now = new Date();

    booking.status = 'completed';
    booking.paymentStatus = 'paid';
    booking.amountPaid = amountPaid;
    booking.changeAmount = changeAmount;
    booking.paidAt = now.toISOString();
    booking.operatorName = operatorName || this.settings.operatorStaff;

    // Reset status PC kembali ke "available" (HIJAU KOSONG)
    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (comp) {
      comp.status = 'available';
      comp.currentBookingId = undefined;
      comp.currentStudentNisn = undefined;
      comp.currentStudentName = undefined;
      comp.sessionStartTime = undefined;
      comp.sessionEndTime = undefined;
    }

    // Update student stats
    const student = this.getStudentByNisn(booking.studentNisn);
    if (student) {
      student.totalBookings += 1;
      student.totalHoursUsed += booking.durationHours;
    }

    soundAlert.playSuccessChime();

    this.addNotification({
      type: 'payment',
      title: `Pembayaran Selesai: ${booking.bookingCode}`,
      message: `${booking.studentName} telah melunasi Rp ${grandTotal.toLocaleString('id-ID')} tunai. PC ${booking.computerCode} kembali menyala HIJAU.`,
      computerCode: booking.computerCode,
      bookingCode: booking.bookingCode,
    });

    this.notify();
    return { success: true, message: 'Transaksi berhasil diselesaikan! Struk siap dicetak.', booking };
  }

  // --- Pembatalan Mandiri oleh Siswa (Max 15 Menit Sebelum Jadwal) ---
  public cancelBooking(bookingId: string, reason: string): { success: boolean; message: string } {
    const booking = this.bookings.find((b) => b.id === bookingId || b.bookingCode === bookingId);
    if (!booking) return { success: false, message: 'Data booking tidak ditemukan.' };
    if (booking.status === 'cancelled') return { success: false, message: 'Booking sudah dibatalkan.' };
    if (booking.status === 'active' || booking.status === 'completed') {
      return { success: false, message: 'Sesi sedang berjalan atau sudah selesai, tidak bisa dibatalkan.' };
    }

    const startDateTime = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
    const diffMinutes = (startDateTime.getTime() - new Date().getTime()) / (1000 * 60);

    if (diffMinutes < this.settings.cancellationGraceMinutes) {
      return {
        success: false,
        message: `Pembatalan hanya dapat dilakukan maksimal ${this.settings.cancellationGraceMinutes} menit sebelum jadwal dimulai.`,
      };
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date().toISOString();
    booking.cancellationReason = reason;

    // Lepas unit komputer agar kembali tersedia
    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (comp && comp.currentBookingId === booking.bookingCode) {
      comp.status = 'available';
      comp.currentBookingId = undefined;
      comp.currentStudentNisn = undefined;
      comp.currentStudentName = undefined;
      comp.checkInDeadline = undefined;
    }

    // Hapus booking dari riwayat agar tidak ada bukti booking tersimpan bagi siswa, operator, maupun admin
    this.bookings = this.bookings.filter((b) => b.id !== booking.id && b.bookingCode !== booking.bookingCode);

    this.notify();
    return { success: true, message: 'Pemesanan berhasil dibatalkan dan bukti booking telah dihapus.' };
  }

  // --- Pembatalan oleh Petugas Operator / Admin ---
  public operatorCancelBooking(bookingCode: string, reason?: string): { success: boolean; message: string } {
    const booking = this.bookings.find((b) => b.bookingCode.trim() === bookingCode.trim() || b.id === bookingCode.trim());
    if (!booking) return { success: false, message: 'Data booking tidak ditemukan.' };

    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (comp && (comp.currentBookingId === booking.bookingCode || comp.id === booking.computerId)) {
      comp.status = 'available';
      comp.currentBookingId = undefined;
      comp.currentStudentNisn = undefined;
      comp.currentStudentName = undefined;
      comp.sessionStartTime = undefined;
      comp.sessionEndTime = undefined;
      comp.checkInDeadline = undefined;
    }

    const studentName = booking.studentName;
    const compCode = booking.computerCode;

    // Hapus booking dari sistem sehingga tidak ada bukti booking
    this.bookings = this.bookings.filter((b) => b.bookingCode !== booking.bookingCode && b.id !== booking.id);

    this.addNotification({
      type: 'late_cancelled',
      title: `Booking ${bookingCode} Dibatalkan Petugas`,
      message: `Pemesanan unit ${compCode} untuk ${studentName} dibatalkan oleh petugas (${reason || 'Pembatalan oleh Operator/Admin'}). Unit ${compCode} telah bebas (hijau) dan bukti booking dihapus.`,
      computerCode: compCode,
    });

    this.notify();
    return { success: true, message: `Booking ${bookingCode} berhasil dibatalkan. Unit ${compCode} kini tersedia kembali.` };
  }

  // --- Edit Data Transaksi & Booking oleh Admin / Operator ---
  public updateBooking(bookingId: string, updatedFields: Partial<Booking>): { success: boolean; message: string; booking?: Booking } {
    const booking = this.bookings.find((b) => b.id === bookingId || b.bookingCode === bookingId);
    if (!booking) return { success: false, message: 'Data transaksi booking tidak ditemukan.' };

    const oldCompCode = booking.computerCode;
    const oldStatus = booking.status;

    // Apply updates
    Object.assign(booking, updatedFields);

    // If student name / class / purpose / nisn updated, sync with student record
    if (updatedFields.studentNisn || updatedFields.studentName || updatedFields.studentClass || updatedFields.purpose) {
      const student = this.getStudentByNisn(booking.studentNisn);
      if (student) {
        if (updatedFields.studentName) student.name = updatedFields.studentName;
        if (updatedFields.studentClass) student.className = updatedFields.studentClass;
        if (updatedFields.purpose) student.purpose = updatedFields.purpose;
      }
    }

    // If unit changed
    if (updatedFields.computerCode && updatedFields.computerCode !== oldCompCode) {
      const oldComp = this.computers.find((c) => c.code === oldCompCode);
      if (oldComp && oldComp.currentBookingId === booking.bookingCode) {
        oldComp.status = 'available';
        oldComp.currentBookingId = undefined;
        oldComp.currentStudentNisn = undefined;
        oldComp.currentStudentName = undefined;
        oldComp.sessionStartTime = undefined;
        oldComp.sessionEndTime = undefined;
        oldComp.checkInDeadline = undefined;
      }

      const newComp = this.computers.find((c) => c.code === updatedFields.computerCode || c.id === updatedFields.computerId);
      if (newComp) {
        booking.computerId = newComp.id;
        booking.computerCode = newComp.code;
        const today = new Date().toISOString().split('T')[0];
        if (booking.bookingDate === today) {
          if (booking.status === 'active') {
            newComp.status = 'in_use';
            newComp.currentBookingId = booking.bookingCode;
            newComp.currentStudentNisn = booking.studentNisn;
            newComp.currentStudentName = booking.studentName;
          } else if (booking.status === 'booked_waiting_checkin') {
            newComp.status = 'booked';
            newComp.currentBookingId = booking.bookingCode;
            newComp.currentStudentNisn = booking.studentNisn;
            newComp.currentStudentName = booking.studentName;
            newComp.checkInDeadline = booking.checkInDeadline;
          }
        }
      }
    }

    // If status changed
    if (updatedFields.status && updatedFields.status !== oldStatus) {
      const comp = this.computers.find((c) => c.code === booking.computerCode);
      if (comp) {
        if (updatedFields.status === 'completed' || updatedFields.status === 'cancelled') {
          if (comp.currentBookingId === booking.bookingCode) {
            comp.status = 'available';
            comp.currentBookingId = undefined;
            comp.currentStudentNisn = undefined;
            comp.currentStudentName = undefined;
            comp.sessionStartTime = undefined;
            comp.sessionEndTime = undefined;
            comp.checkInDeadline = undefined;
          }
        } else if (updatedFields.status === 'active') {
          comp.status = 'in_use';
          comp.currentBookingId = booking.bookingCode;
          comp.currentStudentNisn = booking.studentNisn;
          comp.currentStudentName = booking.studentName;
        } else if (updatedFields.status === 'booked_waiting_checkin') {
          comp.status = 'booked';
          comp.currentBookingId = booking.bookingCode;
          comp.currentStudentNisn = booking.studentNisn;
          comp.currentStudentName = booking.studentName;
          comp.checkInDeadline = booking.checkInDeadline;
        }
      }
    }

    this.saveToStorage();
    this.notify();
    return { success: true, message: 'Data transaksi berhasil diperbarui!', booking };
  }

  // --- Hapus Data Booking Permanen oleh Admin / Operator ---
  public deleteBookingPermanent(bookingId: string): { success: boolean; message: string } {
    const booking = this.bookings.find((b) => b.id === bookingId || b.bookingCode === bookingId);
    if (!booking) return { success: false, message: 'Data booking tidak ditemukan.' };

    const comp = this.computers.find((c) => c.code === booking.computerCode || c.id === booking.computerId);
    if (comp && (comp.currentBookingId === booking.bookingCode || comp.id === booking.computerId)) {
      comp.status = 'available';
      comp.currentBookingId = undefined;
      comp.currentStudentNisn = undefined;
      comp.currentStudentName = undefined;
      comp.sessionStartTime = undefined;
      comp.sessionEndTime = undefined;
      comp.checkInDeadline = undefined;
    }

    const bookingCode = booking.bookingCode;
    this.bookings = this.bookings.filter((b) => b.id !== booking.id && b.bookingCode !== booking.bookingCode);
    this.saveToStorage();
    this.notify();
    return { success: true, message: `Data transaksi ${bookingCode} berhasil dihapus permanen.` };
  }

  // --- Edit & Hapus Siswa oleh Operator / Admin ---
  public updateStudent(nisn: string, updated: Partial<Student>): { success: boolean; message: string } {
    const student = this.students.find((s) => s.nisn === nisn);
    if (!student) return { success: false, message: 'Data siswa tidak ditemukan.' };

    Object.assign(student, updated);

    // Sync matching bookings
    this.bookings.forEach((b) => {
      if (b.studentNisn === nisn) {
        if (updated.name) b.studentName = updated.name;
        if (updated.className) b.studentClass = updated.className;
        if (updated.purpose) b.purpose = updated.purpose;
      }
    });

    this.saveToStorage();
    this.notify();
    return { success: true, message: 'Data siswa berhasil diperbarui.' };
  }

  public deleteStudent(nisn: string): { success: boolean; message: string } {
    this.students = this.students.filter((s) => s.nisn !== nisn);
    this.saveToStorage();
    this.notify();
    return { success: true, message: 'Data siswa berhasil dihapus.' };
  }

  // --- Admin settings ---
  public updateSettings(newSettings: Partial<LabSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.notify();
  }

  public toggleComputerMaintenance(computerId: string) {
    const comp = this.computers.find((c) => c.id === computerId);
    if (comp) {
      comp.status = comp.status === 'maintenance' ? 'available' : 'maintenance';
      if (comp.status === 'maintenance') {
        comp.currentBookingId = undefined;
        comp.currentStudentNisn = undefined;
        comp.currentStudentName = undefined;
      }
      this.notify();
    }
  }

  // --- Simulation Helpers ---
  public simulateLateCheckInTimeout5Min(bookingCode: string) {
    const booking = this.bookings.find((b) => b.bookingCode === bookingCode);
    if (!booking) return;

    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (comp) {
      comp.status = 'available';
      comp.currentBookingId = undefined;
      comp.currentStudentNisn = undefined;
      comp.currentStudentName = undefined;
      comp.checkInDeadline = undefined;
    }

    // Hapus booking agar tidak ada bukti booking
    this.bookings = this.bookings.filter((b) => b.bookingCode !== bookingCode);

    soundAlert.playWarningChime();
    this.addNotification({
      type: 'late_cancelled',
      title: `[SIMULASI] Booking ${booking.bookingCode} Direset (Telat 5 Mnt)`,
      message: `Simulasi: Siswa tidak konfirmasi barcode dalam 5 menit saat waktu tiba. Unit ${booking.computerCode} direset menjadi tersedia (hijau) dan bukti booking dihapus.`,
      computerCode: booking.computerCode,
    });

    this.notify();
  }

  public simulate10MinWarning(bookingCode: string) {
    const booking = this.bookings.find((b) => b.bookingCode === bookingCode);
    if (!booking) return;

    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (!comp) return;

    // Set end time to 8 minutes from now to trigger the 10-min warning state
    const newEndTime = new Date(Date.now() + 8 * 60 * 1000).toISOString();
    comp.sessionEndTime = newEndTime;
    booking.actualEndTime = newEndTime;
    booking.hasNotified10Min = true;
    this.warnedBookings.add(`${booking.bookingCode}_warned_10m`);

    soundAlert.playWarningChime();
    this.addNotification({
      type: 'warning',
      title: `[SIMULASI 1/2] Sisa Waktu di ${comp.code} Tersisa 8 Menit!`,
      message: `Peringatan ke-1 (10 menit sebelum habis): Sesi ${comp.currentStudentName} di ${comp.code} akan berakhir dalam 8 menit. Harap bersiap menuju kasir.`,
      computerCode: comp.code,
      bookingCode: booking.bookingCode,
    });

    this.notify();
  }

  public simulateExpiredWarning(bookingCode: string) {
    const booking = this.bookings.find((b) => b.bookingCode === bookingCode);
    if (!booking) return;

    const comp = this.computers.find((c) => c.code === booking.computerCode);
    if (!comp) return;

    // Set end time to past (now - 1 second)
    const newEndTime = new Date(Date.now() - 1000).toISOString();
    comp.sessionEndTime = newEndTime;
    booking.actualEndTime = newEndTime;
    booking.status = 'awaiting_payment';
    booking.hasNotifiedExpired = true;
    this.warnedBookings.add(`${booking.bookingCode}_warned_expired`);

    soundAlert.playWarningChime();
    this.addNotification({
      type: 'warning',
      title: `[SIMULASI 2/2] Waktu Sesi di ${comp.code} Telah Habis!`,
      message: `Peringatan ke-2 (Waktu Habis): Waktu penggunaan ${comp.code} (${comp.currentStudentName}) telah habis. Pengguna segera membayar ke kasir.`,
      computerCode: comp.code,
      bookingCode: booking.bookingCode,
    });

    this.notify();
  }

  /**
   * Reset seluruh data lab ke awal bersih (0 booking, semua 28 unit PC hijau/tersedia, kode dari 0001)
   */
  public resetAllDataToCleanInitial() {
    this.bookings = [];
    this.notifications = [];
    this.computers = generateInitialComputers();
    this.students = INITIAL_STUDENTS.map((s) => ({ ...s, totalBookings: 0, totalHoursUsed: 0, lastBookingDate: undefined }));
    this.warnedBookings.clear();
    this.saveToStorage();
    this.notify();
  }

  /**
   * Helper untuk melihat status ketersediaan PC pada tanggal & jam slot tertentu (bisa hari ini atau hari berikutnya)
   */
  public getComputersForDateAndSlot(date: string, timeSlot: string): ComputerUnit[] {
    const today = new Date().toISOString().split('T')[0];
    const targetHour = parseInt(timeSlot.split(':')[0], 10);

    return this.computers.map((comp) => {
      // If maintenance, always maintenance
      if (comp.status === 'maintenance') return comp;

      // Check if there is an active/booked reservation on this date and time
      const matchBooking = this.bookings.find((b) => {
        if (b.computerId !== comp.id && b.computerCode !== comp.code) return false;
        if (b.bookingDate !== date) return false;
        if (b.status === 'cancelled') return false;

        const bStart = parseInt(b.startTime.split(':')[0], 10);
        const bEnd = parseInt(b.endTime.split(':')[0], 10);
        return targetHour >= bStart && targetHour < bEnd;
      });

      if (matchBooking) {
        if (date === today && matchBooking.status === 'active') {
          return {
            ...comp,
            status: 'in_use',
            currentBookingId: matchBooking.bookingCode,
            currentStudentNisn: matchBooking.studentNisn,
            currentStudentName: matchBooking.studentName,
            sessionStartTime: matchBooking.actualStartTime,
            sessionEndTime: matchBooking.actualEndTime,
          };
        }
        return {
          ...comp,
          status: 'booked',
          currentBookingId: matchBooking.bookingCode,
          currentStudentNisn: matchBooking.studentNisn,
          currentStudentName: matchBooking.studentName,
          checkInDeadline: `${matchBooking.checkInDeadline} WIB`,
        };
      }

      // If viewing today and unit has an active live session, keep live session
      if (date === today && comp.status === 'in_use') {
        return comp;
      }

      return {
        ...comp,
        status: 'available',
        currentBookingId: undefined,
        currentStudentNisn: undefined,
        currentStudentName: undefined,
      };
    });
  }

  public simulate10MinuteWarning(computerCode: string) {
    const comp = this.computers.find((c) => c.code === computerCode);
    if (!comp) return;

    const now = new Date();
    comp.status = 'in_use';
    comp.sessionStartTime = new Date(now.getTime() - 50 * 60 * 1000).toISOString();
    comp.sessionEndTime = new Date(now.getTime() + 9.5 * 60 * 1000).toISOString();

    soundAlert.playWarningChime();
    this.addNotification({
      type: 'warning',
      title: `[SIMULASI] Peringatan 10 Menit: ${comp.code}`,
      message: `Peringatan: Waktu sewa di ${comp.code} tinggal 10 menit! Selesaikan pekerjaan Anda sebelum menuju kasir.`,
      computerCode: comp.code,
    });

    this.notify();
  }

  public setSupabaseConfig(cfg: SupabaseConfig) {
    this.supabaseConfig = cfg;
    this.notify();
  }
}

export const labStore = new LabStore();

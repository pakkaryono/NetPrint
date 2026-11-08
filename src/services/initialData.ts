import { ComputerUnit, Student, Booking, LabSettings } from '../types';

export const INITIAL_SETTINGS: LabSettings = {
  rate1Hour: 3000,
  rate2Hours: 6000,
  rate3Hours: 8000,
  printRateBw: 500,
  printRateColor: 1500,
  minDurationHours: 1,
  maxDurationHours: 3,
  cooldownDays: 2, // Siswa yang sedang booking tidak bisa booking lagi di hari yang sama, jam yang sama, serta 2 hari ke depan
  cancellationGraceMinutes: 15,
  lateCheckInTimeoutMinutes: 5, // 5 menit toleransi kehadiran saat waktu tiba
  warningNoticeMinutes: 10, // 10 menit sebelum waktu sewa habis
  openHour: '07:30',
  closeHour: '16:30',
  schoolName: 'SMK Negeri 1 Songgom',
  labName: 'USMAN NetPrint',
  address: 'Jl. Raya Songgom - Brebes, Kec. Songgom, Kab. Brebes, Jawa Tengah 52266',
  operatorStaff: 'Operator',
  adminStaff: 'Karyono, S.Kom (Koordinator USMAN)',
};

/**
 * Kosongkan statistik aset dan riwayat siswa, mulai dari awal.
 * Data siswa baru akan tercatat otomatis saat siswa melakukan pemesanan.
 */
export const INITIAL_STUDENTS: Student[] = [];

/**
 * Topologi Komputer sesuai denah laboratorium komputer:
 * - Depan Lab: Server & Internet (kiri), Printer Station (kiri), Papan Tulis (IFP) (tengah), Pintu Keluar-Masuk (kanan)
 * - 4 Kolom Meja (Meja Berpasangan 2-PC):
 *   1. Kolom Sayap Kiri: 4 baris x 2 PC = 8 PC (PC-01 s/d PC-08)
 *   2. Kolom Tengah Kiri: 3 baris x 2 PC = 6 PC (PC-09 s/d PC-14, baris 1 depan kosong di depan IFP)
 *   3. Kolom Tengah Kanan: 3 baris x 2 PC = 6 PC (PC-15 s/d PC-20, baris 1 depan kosong di depan IFP)
 *   4. Kolom Sayap Kanan: 4 baris x 2 PC = 8 PC (PC-21 s/d PC-28)
 * Total: 28 Unit PC - Semua dimulai dari status TERSEDIA (HIJAU).
 */
export const generateInitialComputers = (): ComputerUnit[] => {
  const specsTemplates = [
    {
      processor: 'Intel Core i5-12400 (6 Core, 4.4 GHz)',
      ram: '8 GB DDR4',
      gpu: 'Default VGA Onboard (Intel UHD Graphics 730)',
      storage: 'SSD 256 GB NVMe',
      os: 'Windows 11 Pro 64-bit & VS Code Dev Suite',
    },
    {
      processor: 'AMD Ryzen 5 5600G (6 Core, 4.4 GHz)',
      ram: '8 GB DDR4',
      gpu: 'Default VGA Onboard (AMD Radeon Graphics)',
      storage: 'SSD 512 GB SATA',
      os: 'Windows 11 Pro 64-bit & Cisco Packet Tracer',
    },
    {
      processor: 'Intel Core i5-11400 (6 Core, 4.4 GHz)',
      ram: '8 GB DDR4',
      gpu: 'Default VGA Onboard (Intel UHD Graphics 730)',
      storage: 'SSD 256 GB NVMe',
      os: 'Windows 11 Pro 64-bit & Multimedia Suite',
    },
  ];

  interface UnitBlueprint {
    idNum: number;
    code: string;
    row: number;
    section: 'sayap_kiri' | 'tengah_kiri' | 'tengah_kanan' | 'sayap_kanan';
    side: 'kiri' | 'kanan';
    deskPosition: 1 | 2;
  }

  const blueprints: UnitBlueprint[] = [
    // 1. Sayap Kiri (4 baris x 2 PC = 8 PC)
    { idNum: 1, code: 'PC-01', row: 1, section: 'sayap_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 2, code: 'PC-02', row: 1, section: 'sayap_kiri', side: 'kiri', deskPosition: 2 },
    { idNum: 3, code: 'PC-03', row: 2, section: 'sayap_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 4, code: 'PC-04', row: 2, section: 'sayap_kiri', side: 'kiri', deskPosition: 2 },
    { idNum: 5, code: 'PC-05', row: 3, section: 'sayap_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 6, code: 'PC-06', row: 3, section: 'sayap_kiri', side: 'kiri', deskPosition: 2 },
    { idNum: 7, code: 'PC-07', row: 4, section: 'sayap_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 8, code: 'PC-08', row: 4, section: 'sayap_kiri', side: 'kiri', deskPosition: 2 },

    // 2. Tengah Kiri (3 baris x 2 PC = 6 PC, Baris 1 area kosong presentasi IFP)
    { idNum: 9, code: 'PC-09', row: 2, section: 'tengah_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 10, code: 'PC-10', row: 2, section: 'tengah_kiri', side: 'kiri', deskPosition: 2 },
    { idNum: 11, code: 'PC-11', row: 3, section: 'tengah_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 12, code: 'PC-12', row: 3, section: 'tengah_kiri', side: 'kiri', deskPosition: 2 },
    { idNum: 13, code: 'PC-13', row: 4, section: 'tengah_kiri', side: 'kiri', deskPosition: 1 },
    { idNum: 14, code: 'PC-14', row: 4, section: 'tengah_kiri', side: 'kiri', deskPosition: 2 },

    // 3. Tengah Kanan (3 baris x 2 PC = 6 PC, Baris 1 area kosong presentasi IFP)
    { idNum: 15, code: 'PC-15', row: 2, section: 'tengah_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 16, code: 'PC-16', row: 2, section: 'tengah_kanan', side: 'kanan', deskPosition: 2 },
    { idNum: 17, code: 'PC-17', row: 3, section: 'tengah_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 18, code: 'PC-18', row: 3, section: 'tengah_kanan', side: 'kanan', deskPosition: 2 },
    { idNum: 19, code: 'PC-19', row: 4, section: 'tengah_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 20, code: 'PC-20', row: 4, section: 'tengah_kanan', side: 'kanan', deskPosition: 2 },

    // 4. Sayap Kanan (4 baris x 2 PC = 8 PC)
    { idNum: 21, code: 'PC-21', row: 1, section: 'sayap_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 22, code: 'PC-22', row: 1, section: 'sayap_kanan', side: 'kanan', deskPosition: 2 },
    { idNum: 23, code: 'PC-23', row: 2, section: 'sayap_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 24, code: 'PC-24', row: 2, section: 'sayap_kanan', side: 'kanan', deskPosition: 2 },
    { idNum: 25, code: 'PC-25', row: 3, section: 'sayap_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 26, code: 'PC-26', row: 3, section: 'sayap_kanan', side: 'kanan', deskPosition: 2 },
    { idNum: 27, code: 'PC-27', row: 4, section: 'sayap_kanan', side: 'kanan', deskPosition: 1 },
    { idNum: 28, code: 'PC-28', row: 4, section: 'sayap_kanan', side: 'kanan', deskPosition: 2 },
  ];

  return blueprints.map((bp, idx) => ({
    id: `comp-${bp.idNum}`,
    code: bp.code,
    label: `Workstation ${bp.code}`,
    specs: specsTemplates[idx % specsTemplates.length],
    row: bp.row,
    section: bp.section,
    side: bp.side,
    deskPosition: bp.deskPosition,
    status: 'available', // Semua unit mulai dari TERSEDIA (HIJAU)
  }));
};

/**
 * Reset seluruh booking dari awal (Empty / Clean Slate).
 * Kode booking siswa dimulai dari awal (SNG-YYYYMMDD-0001 dst).
 */
export const generateInitialBookings = (): Booking[] => {
  return [];
};


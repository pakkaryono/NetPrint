/**
 * Production-ready PostgreSQL / Supabase Schema for Laboratorium Komputer SMK Negeri 1 Songgom
 */

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- DATABASE SCHEMA: SISTEM BOOKING LAB KOMPUTER SMKN 1 SONGGOM
-- Platform: Supabase / PostgreSQL 15+
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. TABLE: lab_settings
-- Menyimpan tarif fleksibel, batas durasi, jam operasional, dan parameter sistem
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'primary_settings',
  school_name VARCHAR(150) NOT NULL DEFAULT 'SMK Negeri 1 Songgom',
  lab_name VARCHAR(150) NOT NULL DEFAULT 'Laboratorium Komputer 1 (TIK & Multimedia)',
  address TEXT NOT NULL DEFAULT 'Jl. Raya Songgom - Brebes, Jawa Tengah 52266',
  rate_1_hour NUMERIC(10, 2) NOT NULL DEFAULT 3000,
  rate_2_hours NUMERIC(10, 2) NOT NULL DEFAULT 6000,
  rate_3_hours NUMERIC(10, 2) NOT NULL DEFAULT 8000,
  print_rate_bw NUMERIC(10, 2) NOT NULL DEFAULT 500,
  print_rate_color NUMERIC(10, 2) NOT NULL DEFAULT 1500,
  min_duration_hours INT NOT NULL DEFAULT 1 CHECK (min_duration_hours >= 1),
  max_duration_hours INT NOT NULL DEFAULT 3 CHECK (max_duration_hours <= 3),
  cooldown_days INT NOT NULL DEFAULT 1,
  cancellation_grace_minutes INT NOT NULL DEFAULT 15,
  warning_notice_minutes INT NOT NULL DEFAULT 10,
  open_hour VARCHAR(5) NOT NULL DEFAULT '07:30',
  close_hour VARCHAR(5) NOT NULL DEFAULT '16:30',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- 2. TABLE: computers (Unit Perangkat Laboratorium)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.computers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL, -- e.g. 'PC-01' s/d 'PC-28'
  label VARCHAR(50) NOT NULL,
  processor VARCHAR(100) NOT NULL,
  ram VARCHAR(50) NOT NULL,
  gpu VARCHAR(100) NOT NULL,
  storage VARCHAR(50) NOT NULL,
  os VARCHAR(100) NOT NULL,
  cluster VARCHAR(20) NOT NULL CHECK (cluster IN ('Barat', 'Timur')),
  grid_row INT NOT NULL,
  grid_col INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'booked', 'maintenance')),
  current_booking_id VARCHAR(50),
  current_student_nisn VARCHAR(20),
  current_student_name VARCHAR(150),
  session_start_time TIMESTAMP WITH TIME ZONE,
  session_end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- 3. TABLE: students (Master Siswa SMKN 1 Songgom)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  nisn VARCHAR(10) PRIMARY KEY, -- 10 digit NISN
  name VARCHAR(150) NOT NULL,
  class_name VARCHAR(50) NOT NULL, -- e.g. 'XII RPL 1', 'XI TKJ 2'
  department VARCHAR(20) NOT NULL CHECK (department IN ('RPL', 'TKJ', 'AKL', 'TKR', 'TBSM')),
  phone VARCHAR(20),
  email VARCHAR(100),
  total_bookings INT DEFAULT 0,
  total_hours_used INT DEFAULT 0,
  last_booking_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- 4. TABLE: bookings (Pemesanan & Sewa Komputer)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_code VARCHAR(30) UNIQUE NOT NULL, -- Format: SNG-YYYYMMDD-XXXX
  computer_id UUID REFERENCES public.computers(id) ON DELETE RESTRICT,
  computer_code VARCHAR(10) NOT NULL,
  student_nisn VARCHAR(10) REFERENCES public.students(nisn) ON DELETE RESTRICT,
  student_name VARCHAR(150) NOT NULL,
  student_class VARCHAR(50) NOT NULL,
  booking_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL, -- e.g. '08:00'
  duration_hours INT NOT NULL CHECK (duration_hours BETWEEN 1 AND 3),
  end_time VARCHAR(5) NOT NULL,   -- e.g. '10:00'
  status VARCHAR(25) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'completed', 'cancelled')),
  
  -- Biaya sewa komputer
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 3000,
  computer_cost NUMERIC(10, 2) NOT NULL,
  
  -- Opsi Cetak Dokumen (Printer)
  print_pages_bw INT DEFAULT 0,
  print_rate_bw NUMERIC(10, 2) DEFAULT 500,
  print_pages_color INT DEFAULT 0,
  print_rate_color NUMERIC(10, 2) DEFAULT 1500,
  print_cost NUMERIC(10, 2) DEFAULT 0,
  
  -- Total & Pembayaran Tunai
  total_cost NUMERIC(10, 2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  payment_method VARCHAR(20) DEFAULT 'cash',
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  change_amount NUMERIC(10, 2) DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  operator_name VARCHAR(100),
  
  -- Tracking Sesi Real-Time
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Pembatalan
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- 5. TABLE: lab_activity_logs (Log Aktivitas & Audit Kasir)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  actor_role VARCHAR(20) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  booking_code VARCHAR(30),
  computer_code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- 6. VIEWS UNTUK REKAPITULASI & GRAFIK PENDAPATAN BULANAN
-- -------------------------------------------------------------------------

-- View Rekapitulasi Harian
CREATE OR REPLACE VIEW public.v_daily_recap AS
SELECT 
  booking_date,
  COUNT(id) AS total_transactions,
  SUM(CASE WHEN status = 'completed' OR status = 'active' THEN 1 ELSE 0 END) AS successful_bookings,
  SUM(CASE WHEN payment_status = 'paid' THEN computer_cost ELSE 0 END) AS total_rental_revenue,
  SUM(CASE WHEN payment_status = 'paid' THEN print_cost ELSE 0 END) AS total_print_revenue,
  SUM(CASE WHEN payment_status = 'paid' THEN total_cost ELSE 0 END) AS grand_total_revenue
FROM public.bookings
GROUP BY booking_date
ORDER BY booking_date DESC;

-- View Grafik Pendapatan Bulanan
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT 
  TO_CHAR(booking_date, 'YYYY-MM') AS month_period,
  COUNT(id) AS total_bookings,
  SUM(duration_hours) AS total_hours_rented,
  SUM(print_pages_bw + print_pages_color) AS total_pages_printed,
  SUM(CASE WHEN payment_status = 'paid' THEN computer_cost ELSE 0 END) AS rental_revenue,
  SUM(CASE WHEN payment_status = 'paid' THEN print_cost ELSE 0 END) AS print_revenue,
  SUM(CASE WHEN payment_status = 'paid' THEN total_cost ELSE 0 END) AS total_revenue
FROM public.bookings
GROUP BY TO_CHAR(booking_date, 'YYYY-MM')
ORDER BY month_period DESC;

-- -------------------------------------------------------------------------
-- 7. FUNCTION & TRIGGER: Auto-Update Status Komputer saat Booking Berubah
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_computer_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'active') THEN
    UPDATE public.computers
    SET 
      status = 'in_use',
      current_booking_id = NEW.booking_code,
      current_student_nisn = NEW.student_nisn,
      current_student_name = NEW.student_name,
      session_start_time = NEW.actual_start_time,
      session_end_time = NEW.actual_end_time
    WHERE code = NEW.computer_code;
  ELSIF (NEW.status = 'completed' OR NEW.status = 'cancelled') THEN
    UPDATE public.computers
    SET 
      status = 'available',
      current_booking_id = NULL,
      current_student_nisn = NULL,
      current_student_name = NULL,
      session_start_time = NULL,
      session_end_time = NULL
    WHERE code = NEW.computer_code AND current_booking_id = NEW.booking_code;
  ELSIF (NEW.status = 'pending_payment') THEN
    UPDATE public.computers
    SET 
      status = 'booked',
      current_booking_id = NEW.booking_code,
      current_student_nisn = NEW.student_nisn,
      current_student_name = NEW.student_name
    WHERE code = NEW.computer_code AND status = 'available';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_computer_status ON public.bookings;
CREATE TRIGGER trg_sync_computer_status
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_computer_status();

-- -------------------------------------------------------------------------
-- 8. FUNCTION: Reset Otomatis Pukul 00:00 WIB Setiap Harinya
-- Membatalkan booking pending yang kadaluarsa & me-reset status komputer
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_reset_lab_bookings_midnight()
RETURNS json AS $$
DECLARE
  reset_count INT;
BEGIN
  -- Batalkan booking pending yang tidak dibayarkan hingga lewat hari
  UPDATE public.bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'Dibatalkan otomatis oleh sistem saat reset 00:00 WIB'
  WHERE status = 'pending_payment' AND booking_date < CURRENT_DATE;

  GET DIAGNOSTICS reset_count = ROW_COUNT;

  -- Reset semua komputer yang tidak sedang maintenance menjadi available
  UPDATE public.computers
  SET 
    status = 'available',
    current_booking_id = NULL,
    current_student_nisn = NULL,
    current_student_name = NULL,
    session_start_time = NULL,
    session_end_time = NULL
  WHERE status IN ('booked', 'in_use');

  -- Catat log aktivitas reset
  INSERT INTO public.lab_activity_logs (event_type, actor_role, actor_name, description)
  VALUES ('DAILY_RESET_00_WIB', 'system', 'Cron Scheduler', 'Reset harian lab komputer pukul 00:00 WIB berhasil dieksekusi.');

  RETURN json_build_object('success', true, 'message', 'Reset 00:00 WIB selesai', 'cancelled_bookings', reset_count);
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE public.lab_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_activity_logs ENABLE ROW LEVEL SECURITY;

-- Siswa dapat membaca unit komputer & pengaturan lab
CREATE POLICY "Public read computers" ON public.computers FOR SELECT USING (true);
CREATE POLICY "Public read lab_settings" ON public.lab_settings FOR SELECT USING (true);

-- Siswa dapat membaca dan membuat booking baru
CREATE POLICY "Public create booking" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own booking" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public update own booking" ON public.bookings FOR UPDATE USING (true);

-- Siswa dapat mendaftar/verifikasi data diri
CREATE POLICY "Public read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Public insert students" ON public.students FOR INSERT WITH CHECK (true);

-- -------------------------------------------------------------------------
-- SEED DATA AWAL: Inisialisasi Pengaturan Lab SMKN 1 Songgom
-- -------------------------------------------------------------------------
INSERT INTO public.lab_settings (id, school_name, lab_name, rate_1_hour, rate_2_hours, rate_3_hours, print_rate_bw, print_rate_color)
VALUES ('primary_settings', 'SMK Negeri 1 Songgom', 'Laboratorium Komputer 1 (TIK & Multimedia)', 3000, 6000, 8000, 500, 1500)
ON CONFLICT (id) DO NOTHING;
`;

export const PRESET_QUERIES = [
  {
    title: 'Daftar Unit Komputer & Status Real-Time',
    description: 'Menampilkan 28 unit PC beserta status ketersediaan & sesi aktif',
    sql: `SELECT code, label, cluster, status, current_student_name, session_end_time 
FROM public.computers 
ORDER BY code ASC;`,
  },
  {
    title: 'Rekapitulasi Pendapatan Bulanan',
    description: 'Total pendapatan sewa komputer & cetak dokumen per bulan',
    sql: `SELECT * FROM public.v_monthly_revenue;`,
  },
  {
    title: 'Daftar Booking Aktif & Sedang Berjalan',
    description: 'Pesanan yang sedang digunakan saat ini di laboratorium',
    sql: `SELECT booking_code, computer_code, student_nisn, student_name, student_class, 
       start_time, end_time, duration_hours, total_cost, payment_status 
FROM public.bookings 
WHERE status = 'active'
ORDER BY created_at DESC;`,
  },
  {
    title: 'Top 5 Siswa dengan Penggunaan Lab Terbanyak',
    description: 'Ranking siswa berdasarkan jam peminjaman komputer',
    sql: `SELECT nisn, name, class_name, department, total_bookings, total_hours_used 
FROM public.students 
ORDER BY total_hours_used DESC 
LIMIT 5;`,
  },
  {
    title: 'Jalankan Simulasi Reset 00:00 WIB',
    description: 'Eksekusi fungsi otomatis reset harian sistem lab',
    sql: `SELECT * FROM public.fn_reset_lab_bookings_midnight();`,
  },
];

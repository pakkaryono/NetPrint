import React, { useState } from 'react';
import { ComputerUnit, UserRole } from '../types';
import { Monitor, Cpu, Clock, AlertTriangle, Server, Printer, Wifi, Sparkles, X, User, BellRing, RotateCcw, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { labStore } from '../services/store';

interface LabTopologyProps {
  computers: ComputerUnit[];
  currentRole: UserRole;
  onSelectComputerToBook: (computerId: string) => void;
  onOpenCashierWithCode?: (bookingCode: string) => void;
}

export const LabTopology: React.FC<LabTopologyProps> = ({
  computers,
  currentRole,
  onSelectComputerToBook,
  onOpenCashierWithCode,
}) => {
  const isStaff = currentRole === 'operator' || currentRole === 'admin';
  const todayStr = new Date().toISOString().split('T')[0];
  const [viewDate, setViewDate] = useState<string>(todayStr);
  const [viewTimeSlot, setViewTimeSlot] = useState<string>('08:00');
  const [selectedUnit, setSelectedUnit] = useState<ComputerUnit | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'in_use' | 'booked'>('all');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // If viewing today, use live computers; if viewing future date, resolve booked PCs for that date
  const resolvedComputers =
    viewDate === todayStr && viewTimeSlot === '08:00'
      ? computers
      : labStore.getComputersForDateAndSlot(viewDate, viewTimeSlot);

  // Format countdown string
  const getRemainingTime = (endTime?: string) => {
    if (!endTime) return null;
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - now;
    if (diffMs <= 0) return '00:00 (Habis)';
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hours > 0) return `${hours}j ${mins}m`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = (endTime?: string) => {
    if (!endTime) return false;
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - now;
    return diffMs > 0 && diffMs <= 10 * 60 * 1000;
  };

  const isExpired = (endTime?: string) => {
    if (!endTime) return false;
    return new Date(endTime).getTime() <= new Date().getTime();
  };

  const handleResetFromScratch = () => {
    if (!isStaff) return;
    if (window.confirm('Reset seluruh data booking siswa dan ulangi nomor kode booking dari awal (0001)? Seluruh 28 komputer akan kembali tersedia (hijau).')) {
      labStore.resetAllDataToCleanInitial();
      setResetMessage('Berhasil! Seluruh booking direset, 28 PC kembali hijau dan nomor kode booking diulang dari 0001.');
      setTimeout(() => setResetMessage(null), 4000);
    }
  };

  const handlePcClick = (unit: ComputerUnit, e: React.MouseEvent) => {
    e.stopPropagation();
    // Jika siswa ingin pesan, tinggal klik gambar komputernya!
    if (unit.status === 'available') {
      onSelectComputerToBook(unit.id);
    } else {
      setSelectedUnit(unit);
    }
  };

  const renderPcCard = (unit: ComputerUnit) => {
    const remaining = getRemainingTime(unit.sessionEndTime);
    const isWarning = isLowTime(unit.sessionEndTime);
    const hasEnded = isExpired(unit.sessionEndTime);
    const matchesFilter = filterStatus === 'all' || unit.status === filterStatus;
    const isAvailable = unit.status === 'available';

    return (
      <div
        key={unit.id}
        onClick={(e) => handlePcClick(unit, e)}
        title={isAvailable ? `Klik untuk langsung booking ${unit.code}` : `Klik untuk melihat detail ${unit.code}`}
        className={`relative group rounded-2xl p-2.5 sm:p-3 text-left transition-all duration-300 border flex flex-col justify-between min-h-[152px] w-full cursor-pointer select-none ${
          !matchesFilter ? 'opacity-30' : ''
        } ${
          unit.status === 'in_use'
            ? hasEnded
              ? 'bg-red-50 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.35)] ring-2 ring-red-500'
              : isWarning
              ? 'bg-red-50 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.3)] ring-2 ring-red-400 animate-pulse'
              : 'bg-red-50/80 border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:border-red-500 hover:shadow-md'
            : isAvailable
            ? 'bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-[0_4px_16px_rgba(16,185,129,0.25)] shadow-sm hover:scale-[1.02]'
            : unit.status === 'booked'
            ? 'bg-orange-50 border-orange-400 hover:border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
            : 'bg-slate-100 border-slate-300 opacity-60 cursor-not-allowed'
        }`}
      >
        {/* Top Header: Code & Status Indicator */}
        <div className="flex items-center justify-between w-full">
          <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 group-hover:text-red-600 transition-colors">
            {unit.code}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Info Icon Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUnit(unit);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Lihat Spesifikasi & Detail"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Glowing Status Dot */}
            <div className="relative">
              {unit.status === 'in_use' && (
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-[0_0_8px_#ef4444]" />
                </span>
              )}
              {isAvailable && (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              )}
              {unit.status === 'booked' && (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 shadow-[0_0_8px_#f97316]" />
              )}
              {unit.status === 'maintenance' && (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400" />
              )}
            </div>
          </div>
        </div>

        {/* LOGO / GAMBAR KOMPUTER (DESKTOP WORKSTATION LENGKAP) */}
        <div className="my-1.5 flex flex-col items-center justify-center">
          {/* Monitor Screen Frame */}
          <div
            className={`relative w-20 sm:w-24 h-14 rounded-lg border-2 p-1 flex flex-col justify-between transition-transform duration-200 group-hover:scale-105 shadow-sm ${
              unit.status === 'in_use'
                ? hasEnded
                  ? 'bg-red-700 border-red-800 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                  : isWarning
                  ? 'bg-red-600 border-red-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-red-500 border-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                : isAvailable
                ? 'bg-slate-900 border-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.3)] group-hover:border-emerald-500'
                : unit.status === 'booked'
                ? 'bg-orange-500 border-orange-600 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                : 'bg-slate-200 border-slate-400 text-slate-700'
            }`}
          >
            {/* Top monitor bar: Webcam dot & status glow */}
            <div className="flex items-center justify-between px-1">
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  unit.status === 'in_use'
                    ? 'bg-white animate-ping'
                    : isAvailable
                    ? 'bg-emerald-400'
                    : 'bg-amber-200'
                }`}
              ></span>
            </div>

            {/* Screen Display Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-0.5">
              {isAvailable && (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> PESAN
                  </span>
                  <span className="text-[7.5px] text-emerald-200 uppercase font-bold tracking-tight">
                    Klik Gambar
                  </span>
                </div>
              )}
              {unit.status === 'in_use' && (
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono font-bold text-white tabular-nums">
                    {remaining || '00:00'}
                  </span>
                  <span className="text-[7.5px] text-red-100 font-semibold truncate max-w-[75px]">
                    {unit.currentStudentName?.split(' ')[0] || 'Dipakai'}
                  </span>
                </div>
              )}
              {unit.status === 'booked' && (
                <div className="flex flex-col items-center">
                  <span className="text-[8.5px] font-mono font-bold text-white">
                    TERPESAN
                  </span>
                  <span className="text-[7px] text-orange-100 font-semibold">
                    &lt;5 Mnt Hadir
                  </span>
                </div>
              )}
              {unit.status === 'maintenance' && (
                <span className="text-[8px] text-slate-500 font-mono">MAINTENANCE</span>
              )}
            </div>

            {/* Monitor Chin / Brand */}
            <div className="text-[6.5px] text-center font-mono font-bold tracking-wider text-slate-400/80">
              SMKN 1 SONGGOM
            </div>
          </div>

          {/* Monitor Stand & Neck */}
          <div className="w-3 h-1.5 bg-slate-400 mx-auto"></div>
          <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto shadow-xs"></div>

          {/* Desk Keyboard & Mouse */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* Keyboard */}
            <div className="w-11 h-2 bg-slate-200 border border-slate-300 rounded-xs flex items-center justify-around px-0.5">
              <span className="w-1.5 h-0.5 bg-slate-400 rounded-xs"></span>
              <span className="w-1.5 h-0.5 bg-slate-400 rounded-xs"></span>
              <span className="w-1.5 h-0.5 bg-slate-400 rounded-xs"></span>
              <span className="w-1.5 h-0.5 bg-slate-400 rounded-xs"></span>
            </div>
            {/* Mouse */}
            <div className="w-2 h-2.5 bg-slate-300 border border-slate-400 rounded-full"></div>
          </div>
        </div>

        {/* Status Bottom Badge */}
        <div className="w-full text-center mt-1">
          {unit.status === 'in_use' && (
            <div className="bg-red-100 border border-red-300 rounded-lg px-1.5 py-0.5">
              <span className="text-[9.5px] font-mono font-bold text-red-700 tabular-nums flex items-center justify-center gap-1">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{remaining || 'Aktif'}</span>
              </span>
            </div>
          )}
          {isAvailable && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-1.5 py-0.5 group-hover:bg-red-600 group-hover:border-red-600 group-hover:text-white transition-colors">
              <span className="text-[9.5px] font-bold text-emerald-700 group-hover:text-white flex items-center justify-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Klik untuk Pesan
              </span>
            </div>
          )}
          {unit.status === 'booked' && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg px-1.5 py-0.5">
              <span className="text-[9px] font-semibold text-orange-800 truncate block">
                Menunggu Hadir
              </span>
            </div>
          )}
          {unit.status === 'maintenance' && (
            <div className="bg-slate-200 rounded-lg px-1.5 py-0.5">
              <span className="text-[9px] text-slate-500">Maintenance</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to extract PCs for a specific section and row
  const getSectionRowUnits = (section: 'sayap_kiri' | 'tengah_kiri' | 'tengah_kanan' | 'sayap_kanan', rowNum: number) => {
    return resolvedComputers
      .filter((c) => c.section === section && c.row === rowNum)
      .sort((a, b) => a.deskPosition - b.deskPosition);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner in White Theme with School Logo (Exact Kop Layout) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row items-center justify-center min-h-[110px] w-full">
          {/* Logo SMKN 1 Songgom di sebelah kiri */}
          <div className="sm:absolute sm:left-4 lg:left-8 mb-3 sm:mb-0 flex items-center justify-center">
            <img
              src="/assets/aistudio/SMKN_1_SONGGOM_KECIL_3106485e.png"
              alt="Logo SMK Negeri 1 Songgom"
              className="w-16 h-20 sm:w-20 sm:h-24 object-contain drop-shadow-xs"
            />
          </div>

          {/* Tulisan Header Simetris Rata Tengah Sesuai Gambar Contoh */}
          <div className="text-center space-y-1 w-full px-2 sm:px-24">
            <div className="text-base sm:text-xl font-black tracking-wider uppercase text-red-600">
              USAHA MANDIRI
            </div>
            <div className="text-xl sm:text-2xl font-black text-orange-600 tracking-wide font-mono">
              &ldquo;NetPrint&rdquo;
            </div>
            <div className="text-base sm:text-xl font-black text-slate-950 tracking-tight leading-tight uppercase">
              TEKNIK KOMPUTER DAN JARINGAN
            </div>
            <div className="text-sm sm:text-lg font-black text-slate-950 tracking-wider uppercase">
              SMK NEGERI 1 SONGGOM
            </div>
          </div>
        </div>

        {/* Action badge & Admin Quick Action (Centered) */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
          {isStaff ? (
            <button
              onClick={handleResetFromScratch}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 hover:border-red-400 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
              title="Reset seluruh data booking siswa dan ulangi kode booking dari awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              <span>Reset Kode &amp; Booking (Mulai Awal)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs font-semibold text-orange-800">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span>Mode Siswa / Tamu: Klik Gambar PC untuk Booking</span>
            </div>
          )}
        </div>

        {/* Reset Confirmation Toast */}
        {resetMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-400 text-emerald-800 text-xs rounded-xl flex items-center justify-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {/* Status Indicators & Notification Rule */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span>Tersedia (Klik Gambar untuk Pesan)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_#ef4444]" />
              <span>Digunakan (Menyala Merah)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" />
              <span>Terpesan (Toleransi &lt;5 mnt)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <BellRing className="w-3.5 h-3.5 text-blue-600" />
              <span>Notifikasi: 2x (10 Mnt &amp; Habis)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filter:</span>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(['all', 'available', 'in_use', 'booked'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filterStatus === st
                      ? 'bg-white text-red-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all'
                    ? 'Semua'
                    : st === 'available'
                    ? 'Tersedia'
                    : st === 'in_use'
                    ? 'Aktif'
                    : 'Terpesan'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advance Date & Time Slot Inspector Toolbar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Pantau Jadwal:</span>
            <button
              onClick={() => {
                setViewDate(todayStr);
                setViewTimeSlot('08:00');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                viewDate === todayStr
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Hari Ini (Real-Time)
            </button>
            <button
              onClick={() => {
                const tmrw = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setViewDate(tmrw);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                viewDate !== todayStr
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Pesan Hari Sebelumnya / Esok
            </button>

            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-500"
            />

            <select
              value={viewTimeSlot}
              onChange={(e) => setViewTimeSlot(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-mono"
            >
              <option value="07:30">07:30 WIB</option>
              <option value="08:00">08:00 WIB</option>
              <option value="09:00">09:00 WIB</option>
              <option value="10:00">10:00 WIB</option>
              <option value="11:00">11:00 WIB</option>
              <option value="12:30">12:30 WIB</option>
              <option value="13:30">13:30 WIB</option>
              <option value="14:30">14:30 WIB</option>
            </select>
          </div>
        </div>
      </div>

      {/* TOPOLOGY FLOORPLAN PERSIS GAMBAR (White Card Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-x-auto">
        <div className="min-w-[880px]">
          {/* 1. AREA DEPAN / FRONT OF LAB */}
          <div className="grid grid-cols-12 gap-4 items-center mb-7 pb-6 border-b border-slate-200">
            {/* Top Left: Server & INTERNET (square) + PRINTER (rectangle) */}
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-28 h-24 bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-blue-500 rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center text-white">
                <Server className="w-6 h-6 text-blue-100 mb-1" />
                <span className="text-[11px] font-bold uppercase tracking-wider leading-tight">
                  Server &amp;<br />INTERNET
                </span>
                <span className="text-[9px] text-emerald-200 font-mono flex items-center gap-1 mt-0.5">
                  <Wifi className="w-2.5 h-2.5" /> 1 Gbps LAN
                </span>
              </div>

              <div className="w-32 h-20 bg-gradient-to-br from-indigo-600 to-indigo-700 border-2 border-indigo-500 rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center text-white">
                <Printer className="w-5 h-5 text-indigo-100 mb-1" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  PRINTER
                </span>
                <span className="text-[9px] text-indigo-200 font-mono">LaserJet Station</span>
              </div>
            </div>

            {/* Top Center: PAPAN TULIS (IFP) */}
            <div className="col-span-5 px-2">
              <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 border-2 border-blue-400 rounded-2xl p-4 shadow-md text-center relative overflow-hidden text-white">
                <div className="absolute top-1.5 left-3 text-[9px] text-blue-100 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  IFP 75" Touchscreen
                </div>
                <div className="absolute top-1.5 right-3 text-[9px] text-blue-100 font-mono">
                  Smart Digital Board
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-widest uppercase mt-1 mb-0.5 text-white">
                  PAPAN TULIS (IFP)
                </h2>
                <p className="text-[11px] text-blue-100 font-medium">
                  Area Presentasi Guru &amp; Pengawas Laboratorium
                </p>
              </div>
            </div>

            {/* Top Right: PINTU KELUAR-MASUK */}
            <div className="col-span-3 flex justify-end">
              <div className="w-28 h-24 bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center text-white">
                <div className="w-6 h-8 border-2 border-dashed border-slate-300 rounded mb-1 flex items-center justify-center text-slate-200 text-xs">
                  🚪
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                  PINTU<br />KELUAR-MASUK
                </span>
                <span className="text-[8px] text-slate-300 font-mono mt-0.5">Akses Utama</span>
              </div>
            </div>
          </div>

          {/* 2. AREA MEJA KOMPUTER SISWA (4 KOLOM) */}
          {/* Kolom Headers */}
          <div className="grid grid-cols-12 gap-3 mb-2 px-1 text-center font-mono text-[10px] uppercase font-bold text-slate-500">
            <div className="col-span-3">Sayap Kiri (PC-01 s/d PC-08)</div>
            <div className="col-span-3">Tengah Kiri (PC-09 s/d PC-14)</div>
            <div className="col-span-3">Tengah Kanan (PC-15 s/d PC-20)</div>
            <div className="col-span-3">Sayap Kanan (PC-21 s/d PC-28)</div>
          </div>

          {/* 4 ROWS FROM FRONT TO BACK */}
          <div className="space-y-4">
            {/* ROW 1: Sayap Kiri (2 PC) | Area Terbuka Tengah IFP (No PCs!) | Sayap Kanan (2 PC) */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 relative">
              <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-500 uppercase font-semibold">
                Baris 1 (Depan)
              </div>
              <div className="grid grid-cols-12 gap-3 items-center pt-3">
                {/* Sayap Kiri Row 1: PC-01 & PC-02 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kiri', 1).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah (Kosong di depan IFP - 6 cols spanning Tengah Kiri & Tengah Kanan) */}
                <div className="col-span-6 bg-slate-100/70 border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[152px]">
                  <span className="text-xs font-semibold text-slate-600">
                    Area Bebas / Terbuka Depan Papan Tulis (IFP)
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Ruang mobilitas presentasi pengajar &amp; pandangan siswa ke layar
                  </span>
                </div>

                {/* Sayap Kanan Row 1: PC-21 & PC-22 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kanan', 1).map((unit) => renderPcCard(unit))}
                </div>
              </div>
            </div>

            {/* ROW 2: Sayap Kiri | Tengah Kiri | Tengah Kanan | Sayap Kanan */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 relative">
              <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-500 uppercase font-semibold">
                Baris 2
              </div>
              <div className="grid grid-cols-12 gap-3 items-center pt-3">
                {/* Sayap Kiri Row 2: PC-03 & PC-04 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kiri', 2).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah Kiri Row 2: PC-09 & PC-10 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('tengah_kiri', 2).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah Kanan Row 2: PC-15 & PC-16 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('tengah_kanan', 2).map((unit) => renderPcCard(unit))}
                </div>

                {/* Sayap Kanan Row 2: PC-23 & PC-24 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kanan', 2).map((unit) => renderPcCard(unit))}
                </div>
              </div>
            </div>

            {/* ROW 3: Sayap Kiri | Tengah Kiri | Tengah Kanan | Sayap Kanan */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 relative">
              <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-500 uppercase font-semibold">
                Baris 3
              </div>
              <div className="grid grid-cols-12 gap-3 items-center pt-3">
                {/* Sayap Kiri Row 3: PC-05 & PC-06 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kiri', 3).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah Kiri Row 3: PC-11 & PC-12 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('tengah_kiri', 3).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah Kanan Row 3: PC-17 & PC-18 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('tengah_kanan', 3).map((unit) => renderPcCard(unit))}
                </div>

                {/* Sayap Kanan Row 3: PC-25 & PC-26 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kanan', 3).map((unit) => renderPcCard(unit))}
                </div>
              </div>
            </div>

            {/* ROW 4: Sayap Kiri | Tengah Kiri | Tengah Kanan | Sayap Kanan */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 relative">
              <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-500 uppercase font-semibold">
                Baris 4 (Belakang)
              </div>
              <div className="grid grid-cols-12 gap-3 items-center pt-3">
                {/* Sayap Kiri Row 4: PC-07 & PC-08 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kiri', 4).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah Kiri Row 4: PC-13 & PC-14 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('tengah_kiri', 4).map((unit) => renderPcCard(unit))}
                </div>

                {/* Tengah Kanan Row 4: PC-19 & PC-20 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('tengah_kanan', 4).map((unit) => renderPcCard(unit))}
                </div>

                {/* Sayap Kanan Row 4: PC-27 & PC-28 */}
                <div className="col-span-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  {getSectionRowUnits('sayap_kanan', 4).map((unit) => renderPcCard(unit))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Corridor / Back Area */}
          <div className="text-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
            <span>Lorong Belakang Laboratorium Komputer SMK Negeri 1 Songgom</span>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL KOMPUTER (Light Theme) */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-800">
            <button
              onClick={() => setSelectedUnit(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
                  selectedUnit.status === 'in_use'
                    ? 'bg-red-50 border-red-300 text-red-600'
                    : selectedUnit.status === 'available'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                    : selectedUnit.status === 'booked'
                    ? 'bg-orange-50 border-orange-300 text-orange-600'
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>{selectedUnit.code}</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      selectedUnit.status === 'in_use'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : selectedUnit.status === 'available'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : selectedUnit.status === 'booked'
                        ? 'bg-orange-100 text-orange-800 border border-orange-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selectedUnit.status === 'in_use'
                      ? 'Sedang Digunakan'
                      : selectedUnit.status === 'available'
                      ? 'Tersedia'
                      : selectedUnit.status === 'booked'
                      ? 'Menunggu Siswa Hadir'
                      : 'Maintenance'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedUnit.section.replace('_', ' ').toUpperCase()} · Baris {selectedUnit.row} (Posisi {selectedUnit.deskPosition})
                </p>
              </div>
            </div>

            {/* Sesi Pemakaian Aktif */}
            {selectedUnit.status === 'in_use' && (
              <div className="mb-4 p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-red-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Pengguna Aktif:
                  </span>
                  <span className="font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-300">
                    Sisa: {getRemainingTime(selectedUnit.sessionEndTime)}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">{selectedUnit.currentStudentName}</div>
                <div className="text-xs text-slate-500 font-mono">
                  NISN: {selectedUnit.currentStudentNisn || '-'} · Booking: {selectedUnit.currentBookingId || '-'}
                </div>

                <div className="text-[11px] text-blue-900 bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex items-start gap-2 mt-2">
                  <BellRing className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-900">Aturan Notifikasi PC (Hanya 2 Kali):</strong>
                    <div className="text-[10px] text-blue-800 mt-0.5 leading-relaxed">
                      1. Notifikasi 1/2: Otomatis berbunyi chime 10 menit sebelum waktu habis.<br />
                      2. Notifikasi 2/2: Otomatis berbunyi chime saat waktu pemakaian habis.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sesi Terpesan Menunggu Hadir */}
            {selectedUnit.status === 'booked' && (
              <div className="mb-4 p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-2">
                <div className="text-xs font-bold text-orange-800">
                  Pemesanan Menunggu Siswa Hadir di Lab (Toleransi 5 Menit saat Waktu Tiba)
                </div>
                <div className="text-sm font-bold text-slate-900">{selectedUnit.currentStudentName}</div>
                <div className="text-xs text-slate-600 font-mono">
                  Kode: {selectedUnit.currentBookingId}
                </div>
                <div className="text-[11px] text-orange-900 bg-orange-100/70 p-2 rounded-lg border border-orange-300">
                  * Jika 5 menit saat waktu pesanan tiba siswa tidak konfirmasi barcode/kode ke operator, pesanan akan direset otomatis dan PC kembali menjadi tersedia (hijau).
                </div>
                {onOpenCashierWithCode && selectedUnit.currentBookingId && isStaff && (
                  <button
                    onClick={() => {
                      onOpenCashierWithCode(selectedUnit.currentBookingId!);
                      setSelectedUnit(null);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Buka di Meja Operator &amp; Konfirmasi Hadir
                  </button>
                )}
              </div>
            )}

            {/* Hardware Specs: RAM 8GB, Default VGA Onboard, SSD */}
            <div className="space-y-2 mb-5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-red-600" /> Spesifikasi Komputer Laboratorium
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">Processor:</span>
                  <span className="font-semibold text-slate-900">{selectedUnit.specs.processor}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">RAM:</span>
                  <span className="font-bold text-red-600">{selectedUnit.specs.ram}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">GPU (Grafis):</span>
                  <span className="font-semibold text-slate-900">{selectedUnit.specs.gpu}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Storage:</span>
                  <span className="font-bold text-slate-900">{selectedUnit.specs.storage}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[11px]">Sistem Operasi &amp; Software:</span>
                <span className="font-medium text-slate-800">{selectedUnit.specs.os}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {selectedUnit.status === 'available' && (
                <button
                  onClick={() => {
                    onSelectComputerToBook(selectedUnit.id);
                    setSelectedUnit(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Pesan Komputer Ini (Tanpa Bayar Dulu)</span>
                </button>
              )}

              {/* Simulation test triggers: ONLY FOR OPERATOR & ADMIN */}
              {isStaff && selectedUnit.status === 'booked' && selectedUnit.currentBookingId && (
                <button
                  onClick={() => {
                    labStore.simulateLateCheckInTimeout5Min(selectedUnit.currentBookingId!);
                    setSelectedUnit(null);
                  }}
                  className="py-2 px-3 bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 rounded-xl text-xs font-semibold"
                  title="Akses Petugas: Simulasi telat 5 menit"
                >
                  Uji Telat &gt;5 Mnt (Auto Reset Jadi Tersedia)
                </button>
              )}

              {isStaff && selectedUnit.status === 'in_use' && selectedUnit.currentBookingId && (
                <>
                  <button
                    onClick={() => {
                      labStore.simulate10MinWarning(selectedUnit.currentBookingId!);
                      setSelectedUnit(null);
                    }}
                    className="py-2 px-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs"
                    title="Akses Petugas: Uji Notifikasi 1 dari 2 (10 menit sebelum habis)"
                  >
                    Uji Notif 10 Mnt (1/2)
                  </button>
                  <button
                    onClick={() => {
                      labStore.simulateExpiredWarning(selectedUnit.currentBookingId!);
                      setSelectedUnit(null);
                    }}
                    className="py-2 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs"
                    title="Akses Petugas: Uji Notifikasi 2 dari 2 (Waktu pemakaian habis)"
                  >
                    Uji Waktu Habis (2/2)
                  </button>
                </>
              )}

              {/* Notice for Siswa that test buttons are restricted */}
              {!isStaff && (selectedUnit.status === 'in_use' || selectedUnit.status === 'booked') && (
                <div className="w-full text-center py-1 text-[11px] text-slate-500 italic">
                  * Tombol uji notifikasi dan reset waktu hanya dapat dijalankan oleh Operator dan Admin.
                </div>
              )}

              <button
                onClick={() => setSelectedUnit(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

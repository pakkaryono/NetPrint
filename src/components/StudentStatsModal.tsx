import React, { useState } from 'react';
import { ComputerUnit, Student, Booking } from '../types';
import { formatRupiah } from '../services/pdfExport';
import {
  Clock,
  TrendingUp,
  Cpu,
  Users,
  Search,
  X,
  Award,
  Zap,
  CheckCircle2,
  PieChart,
} from 'lucide-react';

interface StudentStatsModalProps {
  computers: ComputerUnit[];
  students: Student[];
  bookings: Booking[];
  onClose: () => void;
}

export const StudentStatsModal: React.FC<StudentStatsModalProps> = ({
  computers,
  students,
  bookings,
  onClose,
}) => {
  const [searchNisn, setSearchNisn] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Asset utilization calculations
  const totalComputers = computers.length;
  const activeComputers = computers.filter((c) => c.status === 'in_use').length;
  const bookedComputers = computers.filter((c) => c.status === 'booked').length;
  const availableComputers = computers.filter((c) => c.status === 'available').length;
  const utilizationPct = Math.round(((activeComputers + bookedComputers) / (totalComputers || 1)) * 100);

  // Class distribution (XII TKJ 1, XII TKJ 2, XII TKJ 3)
  const classCounts = {
    'XII TKJ 1': students.filter((s) => s.className === 'XII TKJ 1').length,
    'XII TKJ 2': students.filter((s) => s.className === 'XII TKJ 2').length,
    'XII TKJ 3': students.filter((s) => s.className === 'XII TKJ 3').length,
  };

  // Top students by usage
  const topStudents = [...students].filter((s) => s.totalHoursUsed > 0).sort((a, b) => b.totalHoursUsed - a.totalHoursUsed).slice(0, 5);

  const handleLookupStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const found = students.find((s) => s.nisn === searchNisn.trim());
    setSelectedStudent(found || null);
    if (!found) {
      alert(`Siswa dengan NISN ${searchNisn} belum memiliki histori pemakaian lab.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 text-slate-800 shadow-2xl relative my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md font-bold">
                Akses Terbuka Siswa
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">SMKN 1 Songgom</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 mt-1">
              <Clock className="w-5 h-5 text-red-600" />
              Dasbor Statistik Penggunaan Aset Laboratorium Real-Time
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Asset Utilization KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-semibold">Tingkat Utilisasi Aset:</span>
            <div className="text-2xl font-black font-mono text-red-600 mt-1">
              {utilizationPct}%
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                style={{ width: `${utilizationPct}%` }}
                className="bg-red-600 h-full rounded-full"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-semibold">Unit Aktif (Merah):</span>
            <div className="text-2xl font-black font-mono text-red-600 mt-1">
              {activeComputers} <span className="text-xs text-slate-400 font-normal">/ {totalComputers} PC</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Sesi sedang berlangsung</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-semibold">Unit Siap Pakai (Hijau):</span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
              {availableComputers} <span className="text-xs text-slate-400 font-normal">PC Kosong</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Siap dipesan</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-semibold">Total Siswa Aktif:</span>
            <div className="text-2xl font-black font-mono text-orange-600 mt-1">
              {students.length} Siswa
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Terdata di sistem lab</span>
          </div>
        </div>

        {/* Top Active Students & Major Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Top 5 Students */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-orange-500" />
                Peringkat Jam Belajar Siswa di Lab
              </h3>
            </div>
            <div className="space-y-2">
              {topStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada histori pemakaian. Statistik riwayat dimulai dari awal (0 jam).
                </div>
              ) : (
                topStudents.map((st, i) => (
                  <div
                    key={st.nisn}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          i === 0
                            ? 'bg-red-600 text-white'
                            : i === 1
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{st.className}</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-red-600">{st.totalHoursUsed} Jam</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Class Breakdown (XII TKJ 1, XII TKJ 2, XII TKJ 3) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-red-600" />
                Distribusi Siswa per Kelas TKJ
              </h3>
            </div>
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Kelas XII TKJ 1</span>
                  <span className="font-mono font-bold text-red-600">{classCounts['XII TKJ 1']} Siswa</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full" style={{ width: `${Math.min(100, classCounts['XII TKJ 1'] * 10)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Kelas XII TKJ 2</span>
                  <span className="font-mono font-bold text-orange-600">{classCounts['XII TKJ 2']} Siswa</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full" style={{ width: `${Math.min(100, classCounts['XII TKJ 2'] * 10)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Kelas XII TKJ 3</span>
                  <span className="font-mono font-bold text-slate-800">{classCounts['XII TKJ 3']} Siswa</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-600 h-full" style={{ width: `${Math.min(100, classCounts['XII TKJ 3'] * 10)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Self-service Student Lookup */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <Search className="w-4 h-4 text-red-600" />
            Cek Rekapitulasi Jam Penggunaan Pribadi Saya
          </h3>

          <form onSubmit={handleLookupStudent} className="flex gap-2">
            <input
              type="text"
              value={searchNisn}
              onChange={(e) => setSearchNisn(e.target.value)}
              placeholder="Masukkan 10 digit NISN Anda (contoh: 0071829101)..."
              maxLength={10}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Cek Data
            </button>
          </form>

          {selectedStudent && (
            <div className="mt-3 p-3.5 rounded-xl bg-white border border-red-200 text-xs flex items-center justify-between shadow-2xs">
              <div>
                <span className="font-bold text-slate-900 text-sm">{selectedStudent.name}</span>
                <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                  {selectedStudent.className} · NISN: {selectedStudent.nisn}
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-base font-black text-red-600">
                  {selectedStudent.totalHoursUsed} Jam Pemakaian
                </div>
                <div className="text-[10px] text-slate-500">
                  Total {selectedStudent.totalBookings} kali sesi booking
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

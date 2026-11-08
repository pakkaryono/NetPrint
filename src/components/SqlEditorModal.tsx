import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SQL_SCHEMA, PRESET_QUERIES } from '../services/supabaseSchema';
import { labStore } from '../services/store';
import {
  Database,
  Copy,
  Download,
  Play,
  Check,
  Code2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const SqlEditorModal: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'schema' | 'query_runner' | 'supabase_conn'>('schema');
  const [copied, setCopied] = useState(false);
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [customQuery, setCustomQuery] = useState(PRESET_QUERIES[0].sql);
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: (string | number | boolean | null)[][];
    executionTimeMs: number;
    rowCount: number;
  } | null>(null);

  // Supabase Configuration
  const [supabaseUrl, setSupabaseUrl] = useState(labStore.getSupabaseConfig().url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(labStore.getSupabaseConfig().anonKey || '');
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connMessage, setConnMessage] = useState<string>('');

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schema_labkom_smkn1songgom_supabase.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectPreset = (idx: number) => {
    setActivePresetIndex(idx);
    setCustomQuery(PRESET_QUERIES[idx].sql);
    setQueryResult(null);
  };

  const handleExecuteQuery = () => {
    const startTime = performance.now();
    const query = customQuery.trim().toLowerCase();

    try {
      if (query.includes('from public.computers') || query.includes('from computers')) {
        const comps = labStore.getComputers();
        const columns = ['code', 'label', 'row_side', 'status', 'current_student_name', 'session_end_time'];
        const rows = comps.map((c) => [
          c.code,
          c.label,
          `Baris ${c.row} (${c.side})`,
          c.status,
          c.currentStudentName || '-',
          c.sessionEndTime ? new Date(c.sessionEndTime).toLocaleTimeString() : '-',
        ]);
        const executionTimeMs = Math.round(performance.now() - startTime);
        setQueryResult({ columns, rows, executionTimeMs, rowCount: rows.length });
      } else if (query.includes('from public.v_monthly_revenue') || query.includes('v_monthly_revenue')) {
        const columns = ['month_period', 'total_bookings', 'rental_revenue', 'print_revenue', 'total_revenue'];
        const rows = [
          ['2026-07', 42, 640000, 185000, 825000],
          ['2026-08', 58, 890000, 260000, 1150000],
          ['2026-09', 76, 1120000, 345000, 1465000],
          ['2026-10', 92, 1350000, 420000, 1770000],
          ['2026-11', labStore.getBookings().length, 145000, 26000, 171000],
        ];
        const executionTimeMs = Math.round(performance.now() - startTime);
        setQueryResult({ columns, rows, executionTimeMs, rowCount: rows.length });
      } else if (query.includes('from public.students') || query.includes('from students')) {
        const students = labStore.getStudents();
        const columns = ['nisn', 'name', 'class_name', 'department', 'total_bookings', 'total_hours_used'];
        const rows = students.map((s) => [
          s.nisn,
          s.name,
          s.className,
          s.department || '-',
          s.totalBookings,
          s.totalHoursUsed,
        ]);
        const executionTimeMs = Math.round(performance.now() - startTime);
        setQueryResult({ columns, rows, executionTimeMs, rowCount: rows.length });
      } else if (query.includes('fn_reset_lab_bookings_midnight')) {
        labStore.executeMidnightReset();
        const columns = ['success', 'message', 'status_code'];
        const rows = [[true, 'Reset harian lab komputer pukul 00:00 WIB sukses dijalankan', '200_OK']];
        const executionTimeMs = Math.round(performance.now() - startTime);
        setQueryResult({ columns, rows, executionTimeMs, rowCount: 1 });
      } else {
        const books = labStore.getBookings();
        const columns = ['booking_code', 'computer_code', 'student_name', 'booking_date', 'total_cost', 'status'];
        const rows = books.slice(0, 15).map((b) => [
          b.bookingCode,
          b.computerCode,
          b.studentName,
          b.bookingDate,
          b.totalCost,
          b.status,
        ]);
        const executionTimeMs = Math.round(performance.now() - startTime);
        setQueryResult({ columns, rows, executionTimeMs, rowCount: rows.length });
      }
    } catch {
      alert('Gagal mengeksekusi query.');
    }
  };

  const handleTestSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnStatus('testing');
    setConnMessage('Menghubungkan ke Supabase Cloud REST endpoint...');

    try {
      if (!supabaseUrl.startsWith('http')) {
        throw new Error('URL Supabase harus diawali dengan https:// (contoh: https://xyz.supabase.co)');
      }
      if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
        throw new Error('Supabase Anon Key tidak valid.');
      }

      const client = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await client.from('computers').select('*').limit(1);

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      setConnStatus('connected');
      setConnMessage('Koneksi ke Supabase berhasil terverifikasi! Database siap digunakan.');
      labStore.setSupabaseConfig({
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
        isConnected: true,
      });
    } catch (err: unknown) {
      setConnStatus('error');
      setConnMessage(err instanceof Error ? err.message : 'Koneksi gagal. Periksa URL dan Anon Key Anda.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Database Engine
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">Supabase &amp; PostgreSQL 15+</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Supabase DDL Schema &amp; SQL Editor
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Skrip SQL DDL lengkap (tabel, foreign key, trigger status komputer, cron reset 00:00 WIB, view analitik, RLS) dan query editor interaktif.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin SQL Schema'}</span>
            </button>
            <button
              onClick={handleDownloadSql}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
            >
              <Download className="w-4 h-4" />
              <span>Unduh .SQL</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeSubTab === 'schema'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Skrip Schema PostgreSQL (.sql)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('query_runner')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeSubTab === 'query_runner'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>SQL Editor &amp; Query Simulator</span>
          </button>

          <button
            onClick={() => setActiveSubTab('supabase_conn')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeSubTab === 'supabase_conn'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Konektor Supabase Cloud Live</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DDL SCHEMA VIEWER */}
      {activeSubTab === 'schema' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs">
            <div className="text-slate-700">
              <strong className="text-slate-900">Cara Menggunakan:</strong> Buka tab{' '}
              <span className="text-red-600 font-mono font-bold">SQL Editor</span> di dasbor Supabase Anda, buat New Query, tempelkan skrip di bawah ini, lalu klik <span className="text-red-600 font-mono font-bold">Run</span>.
            </div>
            <span className="text-slate-500 font-mono">9 Bagian Struktur Data (PostgreSQL 15)</span>
          </div>

          <div className="relative">
            <pre className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[550px] leading-relaxed shadow-inner">
              <code>{SUPABASE_SQL_SCHEMA}</code>
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUERY RUNNER SIMULATOR */}
      {activeSubTab === 'query_runner' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Preset queries pill selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Query Template Siap Pakai:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((pq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activePresetIndex === idx
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {pq.title}
                </button>
              ))}
            </div>
          </div>

          {/* Editor Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">SQL Query Input:</span>
              <span className="font-mono text-slate-400">Run Simulator</span>
            </div>
            <textarea
              rows={4}
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-red-500 shadow-inner"
            />
            <div className="flex justify-end">
              <button
                onClick={handleExecuteQuery}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Eksekusi SQL (Run)</span>
              </button>
            </div>
          </div>

          {/* Results Output */}
          {queryResult && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-orange-500" /> Hasil Query Output:
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {queryResult.rowCount} baris ({queryResult.executionTimeMs} ms)
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[300px]">
                <table className="w-full text-left text-xs font-mono text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      {queryResult.columns.map((col, idx) => (
                        <th key={idx} className="py-2.5 px-3">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3">
                            {cell === null ? (
                              <span className="text-slate-400 italic">null</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: SUPABASE CLOUD CONNECTOR */}
      {activeSubTab === 'supabase_conn' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-red-600" />
              Konfigurasi Supabase Project Anda
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hubungkan sistem aplikasi ini secara langsung ke cloud Supabase Anda dengan memasukkan Project URL dan Anon Public API Key.
            </p>
          </div>

          <form onSubmit={handleTestSupabase} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project URL Supabase:
              </label>
              <input
                type="text"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzabcdefghijklm.supabase.co"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Anon / Public API Key:
              </label>
              <input
                type="password"
                required
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            {connMessage && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  connStatus === 'connected'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : connStatus === 'error'
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {connMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={connStatus === 'testing'}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
            >
              {connStatus === 'testing' ? 'Sedang Menguji Koneksi...' : 'Uji Koneksi & Simpan Konfigurasi'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

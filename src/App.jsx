import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  FileText, Settings2, RefreshCw, Moon, Sun,
  Building2, User, Calendar, Clock, Loader2,
} from 'lucide-react';

import UploadArea   from './UploadArea';
import TablePreview from './TablePreview';
import TextPreview  from './TextPreview';
import FilterBar    from './FilterBar';
import { buildReport } from './Transformer';

// ── Positional column map (index → field name) ───────────────────────────────
// Excel has 15 columns; col 9 and col 11 are both named 'override' in the source.
// We parse by INDEX so duplicate headers never corrupt the mapping.
const COL_MAP = [
  'refn',      // 0
  'tanggal',   // 1  YYYYMMDD
  'kode',      // 2
  'keterangan',// 3
  'rekening',  // 4
  'nama',      // 5
  'ccy',       // 6
  'nominal',   // 7
  'prog',      // 8
  'override',  // 9
  'cab_trx',   // 10
  'override2', // 11  (2nd override column – stored separately)
  'user',      // 12
  'otorisasi', // 13
  'jam',       // 14  HHMMSS
];
const MIN_COLS = 14; // at minimum expect columns 0-13 (jam optional but present)

/** Convert YYYYMMDD number/string → 'YYYY-MM-DD' for <input type="date"> */
function tanggalToInputDate(raw) {
  const s = String(Math.round(Number(raw) || 0)).replace(/\D/g, '');
  if (s.length !== 8) return '';
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

function nowDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
function tomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

export default function App() {
  const [darkMode, setDarkMode]     = useState(true);
  const [rows,     setRows]         = useState([]);
  const [fileName, setFileName]     = useState('');
  const [reportText, setReportText] = useState('');
  const [error,    setError]        = useState('');
  const [isLoading, setIsLoading]    = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filterUser,     setFilterUser]     = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');

  // Editable header state
  const [headerInfo, setHeaderInfo] = useState({
    cabang:     'CABANG SIDOARJO',
    teller:     'JTM026IP19',
    reportDate: nowDate(),
    reportTime: nowTime(),
    sysDate:    tomorrowDate(),
  });

  // ── Derived: min/max tanggal from loaded data (for date input bounds) ────────
  const dateBounds = useMemo(() => {
    if (!rows.length) return { min: '', max: '' };
    let min = '99999999', max = '00000000';
    rows.forEach((row) => {
      const s = String(Math.round(Number(row.tanggal) || 0)).replace(/\D/g, '');
      if (s.length === 8) {
        if (s < min) min = s;
        if (s > max) max = s;
      }
    });
    return {
      min: min !== '99999999' ? `${min.slice(0,4)}-${min.slice(4,6)}-${min.slice(6,8)}` : '',
      max: max !== '00000000' ? `${max.slice(0,4)}-${max.slice(4,6)}-${max.slice(6,8)}` : '',
    };
  }, [rows]);

  // ── Derived: filtered rows ────────────────────────────────────────────────
  // Compare tanggal as YYYYMMDD strings — zero timezone-offset risk.
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // User filter: exact match on trimmed value
      if (filterUser && String(row.user || '').trim() !== filterUser) return false;

      // Date filter: compare YYYYMMDD strings directly (lexicographic = chronologic)
      if (filterDateFrom || filterDateTo) {
        const rowYMD = String(Math.round(Number(row.tanggal) || 0)).replace(/\D/g, '');
        if (rowYMD.length === 8) {
          if (filterDateFrom) {
            const fromYMD = filterDateFrom.replace(/-/g, ''); // YYYY-MM-DD → YYYYMMDD
            if (rowYMD < fromYMD) return false;
          }
          if (filterDateTo) {
            const toYMD = filterDateTo.replace(/-/g, '');
            if (rowYMD > toYMD) return false;
          }
        }
      }
      return true;
    });
  }, [rows, filterUser, filterDateFrom, filterDateTo]);

  // ── Parse Excel ────────────────────────────────────────────────────────────
  // Use header:1 to get raw 2D array, then map EACH COLUMN BY INDEX.
  // This is the only reliable way to handle duplicate header names like 'override'.
  const handleFileLoaded = useCallback((file) => {
    setError('');
    setRows([]);
    setReportText('');
    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      // Delay slightly to let the loading UI render
      setTimeout(() => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];

          // header:1 → array-of-arrays; row 0 = header, rows 1+ = data
          const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          if (grid.length < 2) {
            setError('Sheet pertama tidak memiliki data.');
            setIsLoading(false);
            return;
          }

          const headerRow = grid[0];
          const dataRows  = grid.slice(1).filter((r) => r.some((c) => c !== ''));

          if (headerRow.length < MIN_COLS) {
            setError(`Jumlah kolom kurang. Ditemukan ${headerRow.length}, minimal ${MIN_COLS}.`);
            setIsLoading(false);
            return;
          }

          // Map each row by column index → named fields
          const normalized = dataRows.map((r) => {
            const obj = {};
            COL_MAP.forEach((name, idx) => {
              obj[name] = r[idx] !== undefined ? r[idx] : '';
            });
            return obj;
          });

          setRows(normalized);
        } catch (e) {
          setError(`Gagal membaca file: ${e.message}`);
        } finally {
          setIsLoading(false);
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ── Convert (uses filteredRows so report matches what's visible) ──────────
  const handleConvert = useCallback(() => {
    if (filteredRows.length === 0) return;

    // Override header dates with filter date range when set
    const mergedHeader = { ...headerInfo };
    if (filterDateFrom) {
      const [y, m, d] = filterDateFrom.split('-');
      mergedHeader.reportDate = `${d}-${m}-${y}`;
    }
    if (filterDateTo) {
      const [y, m, d] = filterDateTo.split('-');
      mergedHeader.sysDate = `${d}-${m}-${y}`;
    }

    const text = buildReport(filteredRows, mergedHeader);
    setReportText(text);
  }, [filteredRows, headerInfo, filterDateFrom, filterDateTo]);

  // ── Download TXT ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!reportText) return;
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = buildExportName('txt');
    a.click();
    URL.revokeObjectURL(url);
  }, [reportText, filterUser, filterDateFrom, fileName]);

  // ── Download PDF ───────────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(() => {
    if (!reportText) return;

    // Use landscape orientation, unit pt, A4 size
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    // Set a monospace font to keep fixed-width alignment
    doc.setFont('courier', 'normal');

    const margin = 15;
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const lines = reportText.split('\n');

    // Auto-calculate font size so the widest line fills the page width
    const maxLineLen = Math.max(...lines.filter(l => l !== '\f').map(l => l.length), 1);
    const usableWidth = pageWidth - 2 * margin;
    // Courier char width ≈ 0.6 × fontSize
    const fontSize = usableWidth / (maxLineLen * 0.6);
    doc.setFontSize(fontSize);

    const lineHeight = fontSize * 1.15;
    let cursorY = margin;

    lines.forEach(line => {
      // Handle manual page break from form feed character
      if (line === '\f') {
        doc.addPage();
        cursorY = margin;
        return;
      }

      // Check if we need to add a new page
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    });

    doc.save(buildExportName('pdf'));
  }, [reportText, filterUser, filterDateFrom, fileName]);

  // ── Build export file name from active filters ───────────────────────────
  const buildExportName = useCallback((ext) => {
    const parts = ['PR16K'];
    if (filterUser) parts.push(filterUser.trim());
    if (filterDateFrom) {
      // YYYY-MM-DD → DDMMYY
      const [y, m, d] = filterDateFrom.split('-');
      parts.push(`${d}${m}${y.slice(2)}`);
    }
    return parts.length > 1
      ? `${parts.join('-')}.${ext}`
      : `${fileName.replace(/\.(xlsx|xls)$/i, '')}_report.${ext}`;
  }, [filterUser, filterDateFrom, fileName]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setRows([]);
    setReportText('');
    setFileName('');
    setError('');
    setFilterUser('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const clearFilters = () => {
    setFilterUser('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setReportText('');
  };

  const setHeader = (key, val) =>
    setHeaderInfo((prev) => ({ ...prev, [key]: val }));

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-950 text-gray-100">

        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 flex items-center justify-between
          px-6 py-3 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600
              flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">BPD Jatim Report</h1>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">Excel → Teller Transaction Log</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                  text-gray-400 border border-gray-700 hover:border-red-500/50
                  hover:text-red-400 transition-all duration-200"
              >
                <RefreshCw size={12} />
                Reset
              </button>
            )}
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`p-2 rounded-lg border transition-all duration-200
                ${showSettings
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              title="Pengaturan Header"
            >
              <Settings2 size={16} />
            </button>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-lg border border-gray-700 text-gray-400
                hover:border-yellow-500/50 hover:text-yellow-400 transition-all duration-200"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* ── MAIN ─────────────────────────────────────────────────────────── */}
        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

          {/* ── SETTINGS PANEL ─────────────────────────────────────────────── */}
          {showSettings && (
            <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
              <h2 className="text-sm font-semibold text-blue-300 mb-4 flex items-center gap-2">
                <Settings2 size={14} />
                Edit Header Laporan
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { key: 'cabang',     label: 'Nama Cabang',  icon: Building2 },
                  { key: 'teller',     label: 'Kode Teller',  icon: User },
                  { key: 'reportDate', label: 'Tanggal',       icon: Calendar },
                  { key: 'reportTime', label: 'Jam',           icon: Clock },
                  { key: 'sysDate',    label: 'Tanggal Sistem',icon: Calendar },
                ].map(({ key, label, icon: Icon }) => (
                  <label key={key} className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Icon size={10} /> {label}
                    </span>
                    <input
                      value={headerInfo[key]}
                      onChange={(e) => setHeader(key, e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2
                        text-xs text-gray-200 outline-none focus:border-blue-500
                        transition-colors duration-200 font-mono"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* ── HERO / UPLOAD ──────────────────────────────────────────────── */}
          {rows.length === 0 && !isLoading && (
            <section className="space-y-4">
              {/* Gradient title */}
              <div className="text-center space-y-2 py-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400
                  bg-clip-text text-transparent">
                  Konversi Data Transaksi Bank
                </h2>
                <p className="text-gray-500 text-sm max-w-lg mx-auto">
                  Upload file Excel berisi data transaksi teller, lalu dapatkan laporan teks terformat
                  ala log transaksi bank BPD Jatim secara instan.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { label: 'Format Didukung', value: '.xlsx / .xls' },
                  { label: 'Pemrosesan',      value: 'Client-Side' },
                  { label: 'Output',          value: '.txt Fixed-Width' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-gray-900/60 border border-gray-800 p-3 text-center">
                    <p className="text-xs text-blue-400 font-semibold">{s.value}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <UploadArea onFileLoaded={handleFileLoaded} />
            </section>
          )}

          {/* ── LOADING STATE ──────────────────────────────────────────────── */}
          {isLoading && (
            <section className="flex flex-col items-center justify-center gap-5 py-20">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20
                  flex items-center justify-center">
                  <Loader2 size={28} className="text-blue-400 animate-spin" />
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-blue-500/5 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-gray-200">Memproses file Excel...</p>
                <p className="text-xs text-gray-500">{fileName}</p>
              </div>
            </section>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              ⚠️ {error}
            </div>
          )}

          {/* ── FILE LOADED STATE ──────────────────────────────────────────── */}
          {rows.length > 0 && (
            <div className="space-y-6">
              {/* File info bar */}
              <div className="flex items-center justify-between rounded-xl
                border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <FileText size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-300">{fileName}</p>
                    <p className="text-xs text-gray-500">
                      {filteredRows.length !== rows.length
                        ? <><span className="text-violet-400 font-semibold">{filteredRows.length}</span> dari {rows.length} baris (difilter)</>
                        : <>{rows.length} baris data ditemukan</>
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleConvert}
                  disabled={filteredRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                    bg-gradient-to-r from-blue-600 to-indigo-600
                    hover:from-blue-500 hover:to-indigo-500
                    disabled:opacity-40 disabled:cursor-not-allowed
                    text-white text-sm font-semibold shadow-lg shadow-blue-500/20
                    transition-all duration-200 active:scale-95"
                >
                  <FileText size={14} />
                  Convert ke Laporan
                  {filteredRows.length !== rows.length && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px]
                      bg-white/10 font-normal">
                      {filteredRows.length} baris
                    </span>
                  )}
                </button>
              </div>

              {/* ── Filter Bar ─────────────────────────────────────────────── */}
              <FilterBar
                rows={rows}
                filterUser={filterUser}
                setFilterUser={setFilterUser}
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                setFilterDateFrom={setFilterDateFrom}
                setFilterDateTo={setFilterDateTo}
                filteredCount={filteredRows.length}
                minDate={dateBounds.min}
                maxDate={dateBounds.max}
                onClear={clearFilters}
              />

              {/* Table preview — uses filteredRows */}
              <TablePreview rows={filteredRows} />

              {/* Upload another file (small) */}
              <details className="group">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors select-none">
                  ↑ Upload file lain
                </summary>
                <div className="mt-3">
                  <UploadArea onFileLoaded={handleFileLoaded} />
                </div>
              </details>
            </div>
          )}

          {/* ── TEXT REPORT OUTPUT ─────────────────────────────────────────── */}
          {reportText && (
            <div className="space-y-1">
              {/* Visual divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                <span className="text-xs text-gray-600 px-2">OUTPUT</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
              </div>

              <TextPreview 
                text={reportText} 
                onDownloadTxt={handleDownload} 
                onDownloadPdf={handleDownloadPdf}
              />
            </div>
          )}
        </main>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <footer className="text-center py-6 text-xs text-gray-700 border-t border-gray-900">
          BPD Jatim Report Converter · Client-side only · No data stored
        </footer>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, Calendar, X, Filter } from 'lucide-react';

/**
 * FilterBar
 * Props:
 *  - rows          : all raw rows (to derive unique user list)
 *  - filterUser    : string (selected user value, '' = all)
 *  - setFilterUser : setter
 *  - filterDateFrom: string 'YYYY-MM-DD' or ''
 *  - filterDateTo  : string 'YYYY-MM-DD' or ''
 *  - setFilterDateFrom / setFilterDateTo : setters
 *  - filteredCount : number of rows after filter
 *  - onClear       : clear all filters
 */
export default function FilterBar({
  rows,
  filterUsers,
  setFilterUsers,
  filterDateFrom,
  filterDateTo,
  setFilterDateFrom,
  setFilterDateTo,
  filteredCount,
  minDate,   // 'YYYY-MM-DD' — earliest tanggal in the loaded data
  maxDate,   // 'YYYY-MM-DD' — latest tanggal in the loaded data
  onClear,
}) {
  const [userOpen, setUserOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const userWrapRef = useRef(null);

  // Unique, sorted user list derived from the loaded rows
  const userOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.user && String(r.user).trim()) set.add(String(r.user).trim());
    });
    return Array.from(set).sort();
  }, [rows]);

  const visibleUserOptions = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return userOptions;
    return userOptions.filter((u) => u.toLowerCase().includes(q));
  }, [userOptions, userQuery]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!userWrapRef.current) return;
      if (!userWrapRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const isActive = filterUsers.length > 0 || filterDateFrom !== '' || filterDateTo !== '';

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
            isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-gray-800 text-gray-500'
          }`}>
            <Filter size={12} />
          </div>
          Filter Data
          {isActive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500/20 text-violet-300 font-medium">
              Aktif
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Filtered result badge */}
          <span className="text-xs text-gray-500">
            Menampilkan{' '}
            <span className={`font-semibold ${isActive ? 'text-violet-400' : 'text-gray-300'}`}>
              {filteredCount}
            </span>
            {' '}dari{' '}
            <span className="text-gray-300 font-semibold">{rows.length}</span>
            {' '}baris
          </span>

          {/* Clear all button */}
          {isActive && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                text-red-400 border border-red-500/30 bg-red-500/5
                hover:bg-red-500/10 hover:border-red-500/50
                transition-all duration-150"
            >
              <X size={10} />
              Hapus Filter
            </button>
          )}
        </div>
      </div>

      {/* Filter controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ── Filter User ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <User size={10} className="text-violet-400" />
            Filter User / Teller
          </label>
          <div className="relative" ref={userWrapRef}>
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className={
                `w-full px-3 py-2.5 rounded-xl text-xs text-left ` +
                `bg-gray-800 border outline-none transition-all duration-200 ` +
                (filterUsers.length > 0
                  ? 'border-violet-500/60 text-violet-200 bg-violet-500/5'
                  : 'border-gray-700 text-gray-300 hover:border-gray-600')
              }
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <Search size={13} className="text-gray-600 shrink-0" />
                  <span className="truncate">
                    {filterUsers.length === 0
                      ? 'Pilih user...'
                      : `${filterUsers.length} user dipilih`}
                  </span>
                </span>
                <span className="text-gray-600 shrink-0">▾</span>
              </span>
            </button>

            {userOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 shadow-xl">
                <div className="p-2 border-b border-gray-800">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg text-xs bg-gray-900 border border-gray-800
                        text-gray-200 outline-none focus:border-violet-500/60"
                      placeholder="Cari user..."
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setFilterUsers(userOptions)}
                      className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Pilih semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterUsers([])}
                      className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto">
                  {visibleUserOptions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-gray-600">User tidak ditemukan</div>
                  ) : (
                    visibleUserOptions.map((u) => {
                      const checked = filterUsers.includes(u);
                      return (
                        <label
                          key={u}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-xs
                            text-gray-300 hover:bg-gray-900 cursor-pointer"
                        >
                          <span className="truncate">{u}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) setFilterUsers(filterUsers.filter((x) => x !== u));
                              else setFilterUsers([...filterUsers, u]);
                            }}
                            className="accent-violet-500"
                          />
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="p-2 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">{filterUsers.length} dipilih</span>
                  <button
                    type="button"
                    onClick={() => setUserOpen(false)}
                    className="text-[11px] text-violet-300 hover:text-violet-200 transition-colors"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter Tanggal Dari ──────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <Calendar size={10} className="text-blue-400" />
            Tanggal Dari
          </label>
          <div className="relative">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              min={minDate || undefined}
              max={filterDateTo || maxDate || undefined}
              className={`
                w-full px-3 py-2.5 rounded-xl text-xs
                bg-gray-800 border outline-none
                transition-all duration-200 cursor-pointer
                ${filterDateFrom
                  ? 'border-blue-500/60 text-blue-200 bg-blue-500/5'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }
              `}
            />
          </div>
          {minDate && (
            <span className="text-[10px] text-gray-600">
              Data mulai: <span className="text-gray-500 font-mono">{formatDisplayDate(minDate)}</span>
            </span>
          )}
        </div>

        {/* ── Filter Tanggal Sampai ────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <Calendar size={10} className="text-blue-400" />
            Tanggal Sampai
          </label>
          <div className="relative">
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              min={filterDateFrom || minDate || undefined}
              max={maxDate || undefined}
              className={`
                w-full px-3 py-2.5 rounded-xl text-xs
                bg-gray-800 border outline-none
                transition-all duration-200 cursor-pointer
                ${filterDateTo
                  ? 'border-blue-500/60 text-blue-200 bg-blue-500/5'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }
              `}
            />
          </div>
          {maxDate && (
            <span className="text-[10px] text-gray-600">
              Data sampai: <span className="text-gray-500 font-mono">{formatDisplayDate(maxDate)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Active filter pills */}
      {isActive && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-800">
          <span className="text-[10px] text-gray-600">Filter aktif:</span>
          {filterUsers.map((u) => (
            <Pill
              key={u}
              label={`User: ${u}`}
              color="violet"
              onRemove={() => setFilterUsers(filterUsers.filter((x) => x !== u))}
            />
          ))}
          {filterDateFrom && (
            <Pill
              label={`Dari: ${formatDisplayDate(filterDateFrom)}`}
              color="blue"
              onRemove={() => setFilterDateFrom('')}
            />
          )}
          {filterDateTo && (
            <Pill
              label={`Sampai: ${formatDisplayDate(filterDateTo)}`}
              color="blue"
              onRemove={() => setFilterDateTo('')}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Convert 'YYYY-MM-DD' → 'DD/MM/YYYY' for display */
function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function Pill({ label, color, onRemove }) {
  const colors = {
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    blue:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${colors[color]}`}>
      {label}
      <button
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity"
        title="Hapus filter ini"
      >
        <X size={8} />
      </button>
    </span>
  );
}

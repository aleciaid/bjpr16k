import { formatTanggal, formatJam, formatNominal } from './Transformer';

const COLUMNS = [
  { key: 'refn',      label: 'REFN',        fmt: (v) => v },
  { key: 'tanggal',   label: 'TANGGAL',     fmt: formatTanggal },
  { key: 'kode',      label: 'KODE',        fmt: (v) => v },
  { key: 'keterangan',label: 'KETERANGAN',  fmt: (v) => v },
  { key: 'rekening',  label: 'REKENING',    fmt: (v) => v || '-' },
  { key: 'nama',      label: 'NAMA',        fmt: (v) => v },
  { key: 'ccy',       label: 'CCY',         fmt: (v) => v },
  { key: 'nominal',   label: 'NOMINAL',     fmt: formatNominal },
  { key: 'prog',      label: 'PROG',        fmt: (v) => v },
  { key: 'override',  label: 'OVERRIDE',    fmt: (v) => v },
  { key: 'cab_trx',   label: 'CAB TRX',     fmt: (v) => v },
  { key: 'user',      label: 'USER',        fmt: (v) => v },
  { key: 'otorisasi', label: 'OTORISASI',   fmt: (v) => v },
  { key: 'jam',       label: 'JAM',         fmt: formatJam },
];

export default function TablePreview({ rows }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-200">
          Preview Data
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 font-normal">
            {rows.length} baris
          </span>
        </h2>
        <p className="text-xs text-gray-500">Data diformat otomatis untuk preview</p>
      </div>

      <div className="rounded-xl border border-gray-800 overflow-auto max-h-72 scrollbar-thin">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-900 border-b border-gray-700">
              <th className="px-3 py-2 text-left text-gray-500 font-medium w-8">#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-gray-400 font-semibold whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-800/60 transition-colors hover:bg-gray-800/40 ${
                  i % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/10'
                }`}
              >
                <td className="px-3 py-1.5 text-gray-600">{i + 1}</td>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-1.5 whitespace-nowrap ${
                      col.key === 'nominal'
                        ? 'text-right font-mono text-emerald-400'
                        : col.key === 'tanggal' || col.key === 'jam'
                        ? 'font-mono text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  >
                    {col.fmt(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

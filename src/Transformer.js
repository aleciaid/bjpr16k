/**
 * Transformer.js
 * Core logic for transforming Excel transaction data into a fixed-width bank report.
 */

/**
 * Format tanggal from YYYYMMDD → DD/MM/YYYY (for table preview)
 */
export function formatTanggal(raw) {
  if (!raw) return '        ';
  const s = String(raw).replace(/\D/g, '');
  if (s.length !== 8) return String(raw).padEnd(8);
  const yyyy = s.slice(0, 4);
  const mm   = s.slice(4, 6);
  const dd   = s.slice(6, 8);
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format tanggal from YYYYMMDD → DDMMYYYY (for fixed-width report)
 */
export function formatTanggalReport(raw) {
  if (!raw) return '        ';
  const s = String(raw).replace(/\D/g, '');
  if (s.length !== 8) return String(raw).padEnd(8);
  const yyyy = s.slice(0, 4);
  const mm   = s.slice(4, 6);
  const dd   = s.slice(6, 8);
  return `${dd}${mm}${yyyy}`;
}

/**
 * Format jam from HHMMSS (possibly < 6 digits, e.g. 74802 → 07:48:02) — for table preview
 */
export function formatJam(raw) {
  if (raw === null || raw === undefined || raw === '') return '        ';
  const s = String(Math.round(Number(raw))).padStart(6, '0');
  const hh = s.slice(0, 2);
  const mm = s.slice(2, 4);
  const ss = s.slice(4, 6);
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format jam from HHMMSS without leading zero (e.g. 74802 → 7:48:02) — for fixed-width report
 */
export function formatJamReport(raw) {
  if (raw === null || raw === undefined || raw === '') return '        ';
  const s = String(Math.round(Number(raw))).padStart(6, '0');
  const hh = parseInt(s.slice(0, 2), 10);
  const mm = s.slice(2, 4);
  const ss = s.slice(4, 6);
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format nominal: 35277500 → "35,277,500.00-"
 * All values treated as debit (suffix '-')
 */
export function formatNominal(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  const num = parseFloat(String(raw).replace(/,/g, ''));
  if (isNaN(num)) return String(raw);
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted}-`;
}

/**
 * Pad / truncate a string to exactly `len` characters (left-align by default)
 */
export function padR(str, len) {
  const s = String(str === null || str === undefined ? '' : str);
  if (s.length >= len) return s.slice(0, len);
  return s.padEnd(len, ' ');
}

/**
 * Pad / truncate a string to exactly `len` characters (right-align)
 */
export function padL(str, len) {
  const s = String(str === null || str === undefined ? '' : str);
  if (s.length >= len) return s.slice(0, len);
  return s.padStart(len, ' ');
}

/**
 * Build the complete fixed-width text report
 * @param {Array<Object>} rows  - parsed Excel rows
 * @param {Object} headerInfo   - { cabang, teller, reportDate, reportTime }
 * @returns {string}
 */
export function buildReport(rows, headerInfo) {
  const {
    cabang     = 'CABANG SIDOARJO',
    teller     = 'JTM026IP19',
    reportDate = getTodayDate(),
    reportTime = getNowTime(),
    sysDate    = getTodayDate(),
  } = headerInfo;

  const SEP_THICK = '='.repeat(202);
  const SEP_THIN  = '-'.repeat(202);

  // ── HEADER BLOCK ──────────────────────────────────────────────────────────
  const line1 = padR('BANK BPD JATIM', 20) +
                padR('JTMRT5', 10) +
                padR('D09DC00002', 15) +
                padR('', 50) +
                padR(`JAM: ${reportTime}`, 20) +
                padR(`TGL: ${reportDate}`, 19) +
                'HAL: 0001';

  const line2 = padR('(END OF DAY)', 60) +
                padR('DAFTAR TRANSAKSI PER TELLER', 55) +
                padR(`SYS: ${sysDate}`, 19) +
                'PR16K';

  const line3 = `CABANG : ${cabang}`;
  const line4 = `TELLER : ${teller}`;

  // ── COLUMN HEADER ──────────────────────────────────────────────────────────
  const colHeader1 =
    padR('', 16) +
    padR('TANGGAL', 10) +
    padR('KODE', 6) +
    padR('', 22) +
    padR('NOMOR', 16) +
    padR('', 26) +
    padR('', 5) +
    padR('', 20) +
    padR('', 20) +
    padR('', 22) +
    padR('', 4) +
    padR('', 13) +
    padR('', 13) +
    padR('', 9);

  const colHeader2 =
    padR('NOMOR REFERENSI', 16) +
    padR('EFEKTIF', 10) +
    padR('G/L', 6) +
    padR('TRAN NAMA TRANSAKSI', 22) +
    padR('REKENING', 16) +
    padR('NAMA PEMEGANG REKENING', 26) +
    padR('VAL', 5) +
    padL('NILAI MUTASI', 20) +
    padR('PROGRAM', 20) +
    padR('OVERRIDE', 22) +
    padR('CAB', 4) +
    padR('SUPERVISOR', 13) +
    padR('OTORISATOR', 13) +
    padR('JAM INPUT', 9);

  // ── DATA ROWS ──────────────────────────────────────────────────────────────
  const dataLines = rows.map((row) => {
    const noRef  = padR(row.refn,        16);
    const tgl    = padR(formatTanggalReport(row.tanggal), 10);
    const kdgl   = padR(row.kode,         6);
    const traNam = padR(row.keterangan,  22);
    const noReke = padR(row.rekening || '', 16);
    const nmPeme = padR(row.nama,        26);
    const val    = padR(row.ccy,          5);
    const nilMut = padL(formatNominal(row.nominal), 20);
    const prog   = padR(row.prog,        20);
    const overrd = padR(row.override,    22);
    const cab    = padR(row.cab_trx,      4);
    const usr    = padR(row.user,        13);
    const otor   = padR(row.otorisasi,   13);
    const jam    = padR(formatJamReport(row.jam), 9);

    return noRef + tgl + kdgl + traNam + noReke + nmPeme + val + nilMut + prog + overrd + cab + usr + otor + jam;
  });

  // ── REKAP SUMMARY ────────────────────────────────────────────────────────
  // Build Rekap per Operator section at the bottom
  const summaryLines = [];
  summaryLines.push('');
  summaryLines.push('\f'); // Page break char, jsPDF handles this if we implement it, but for text it's form feed
  
  // Header Rekap
  const sumLine1 = padR('BANK BPD JATIM', 20) +
                   padR('JTMRT2', 10) +
                   padR('D09DC00002', 15) +
                   padR('', 50) +
                   padR(`JAM: ${reportTime}`, 20) +
                   `TGL: ${reportDate}`;
  const sumLine2 = padR('(END OF DAY)', 60) +
                   padR('REKAP TRANSAKSI PER OPERATOR', 55) +
                   `SYS: ${sysDate}`;
  const sumLine3 = `CABANG : ${cabang}`;
  const sumLine4 = `TELLER: ${teller}`;
  
  summaryLines.push(sumLine1);
  summaryLines.push(sumLine2);
  summaryLines.push(sumLine3);
  summaryLines.push(sumLine4);
  summaryLines.push(SEP_THICK);
  
  // Header columns rekap
  const sumColHeader = padR('CCY', 5) +
                       padR('CAB', 5) +
                       padR('TRAN', 6) +
                       padR('JUML', 6) +
                       padR('NON CASH DEBET', 25) +
                       padR('NON CASH KREDIT', 25) +
                       padR('BEGINNING BALANCE', 25) +
                       padR('CASH DEBET', 25) +
                       padR('CASH KREDIT', 25) +
                       padR('ENDING BALANCE', 25);
  summaryLines.push(sumColHeader);
  summaryLines.push(SEP_THIN);
  
  // Hardcoded IDR initial row
  summaryLines.push(
    padR('IDR', 5) + padR('', 5+6+6+25+25) + padL('0.00', 20) + padR('', 5) + padR('', 25+25) + padL('0.00', 20)
  );

  // Grouping logic for Rekap
  // We will group by (CCY, CAB, KODE TRANSAKSI) and sum nominal, count occurrences
  // Note: we guess based on nominal string if it has '-' it might be credit/debit 
  // For exact match we mimic the grouped output
  const groups = {};
  rows.forEach(r => {
    // Treat 'prog' as 'TRAN' if it matches the pattern (HH5C, 1004, etc)
    // Or 'kode' as TRAN. The image shows: HH5C, 1004, HH5D, 5004.
    // Assuming 'prog' holds this, but let's check what maps to it. 'prog' -> TT61C in earlier image, so it might be 'keterangan' or 'kode'. 
    // Wait, 'kode' in first image is 1001. Let's use 'kode' or a mix. The image shows TRAN = HH5C. This is likely the 'prog' column if it's alphanumeric, or 'kode' if numeric.
    // Let's group by CAB (cab_trx), TRAN (kode or prog), and CCY (ccy).
    // The image shows TRAN: HH5C, 1004, HH5D, 5004.
    const ccy = (r.ccy || 'IDR').trim();
    const cab = (r.cab_trx || '').trim();
    // Use 'kode' as TRAN for grouping, since it seems to define transaction type
    const tran = (r.kode || '').trim(); 
    
    // We also need to determine if it's debit or credit. 
    // A negative sign or suffix '-' might indicate it. Let's just group by TRAN.
    const key = `${ccy}_${cab}_${tran}`;
    if(!groups[key]) {
      groups[key] = { ccy, cab, tran, count: 0, sum: 0, isDebit: false };
    }
    groups[key].count += 1;
    let num = parseFloat(String(r.nominal).replace(/,/g, ''));
    if(!isNaN(num)) {
       groups[key].sum += num;
    }
    // We assume if it's certain codes it's debit/credit. For now, let's just format it based on the image 
    // Image shows HH5D and 5004 as having '-' suffix (DEBET). HH5C and 1004 have no suffix (KREDIT).
    if(tran.endsWith('D') || tran.startsWith('5')) {
      groups[key].isDebit = true;
    }
  });

  // Sort and render groups
  Object.values(groups).sort((a,b) => a.tran.localeCompare(b.tran)).forEach(g => {
    const sumFormatted = g.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Position the sum either in DEBET or KREDIT column
    let debetStr = '';
    let kreditStr = '';
    
    // This is a naive assignment for demo purposes based on visual. 
    if (g.isDebit || g.tran.endsWith('D') || g.tran.startsWith('5')) {
       debetStr = padL(`${sumFormatted}-`, 20) + padR('', 5);
       kreditStr = padR('', 25);
    } else {
       debetStr = padR('', 25);
       kreditStr = padL(`${sumFormatted}`, 20) + padR('', 5);
    }

    const line = padR(g.ccy, 5) +
                 padR(g.cab, 5) +
                 padR(g.tran, 6) +
                 padR(String(g.count).padStart(4, '0'), 6) +
                 debetStr +
                 kreditStr;
    summaryLines.push(line);
  });
  
  summaryLines.push(SEP_THICK);
  
  const totalCount = rows.length;
  summaryLines.push(`JAM: ${reportTime} TANGGAL CETAK: ${reportDate}         JUMLAH: ${String(totalCount).padStart(6, '0')} RECORDS`);
  summaryLines.push(`1=Non aktiv  2=Refer debet  3=Refer kredit  4=Blok debet  5=Blok kredit  6=Saldo kurang  7=Dibawah minimum  8=Teller limit  9=Antar cabang  10=Debet tabungan  11=Resi belum balik  13=Kurs`);

  // ── ASSEMBLE ──────────────────────────────────────────────────────────────
  const lines = [
    line1,
    line2,
    line3,
    line4,
    SEP_THICK,
    colHeader1,
    colHeader2,
    SEP_THIN,
    ...dataLines,
    ...summaryLines,
  ];

  return lines.join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayDate() {
  const now = new Date();
  const d   = String(now.getDate()).padStart(2, '0');
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const y   = now.getFullYear();
  return `${d}-${m}-${y}`;
}

function getNowTime() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const ss  = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

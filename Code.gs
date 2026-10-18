/**
 * BACKEND CHECKLIST KENDARAAN PKP-PK
 * Pasang di Google Spreadsheet: Extensions > Apps Script
 * Jalankan fungsi setup() sekali, lalu Deploy > Web app.
 */

const SHEETS = {
  Users: ['username', 'nama', 'jabatan', 'role', 'salt', 'hash', 'aktif'],
  Pemeriksaan: ['id', 'tanggal', 'jam', 'kodeKendaraan', 'namaKendaraan', 'pelaksana', 'namaPelaksana',
    'penanggungJawab', 'pemanasanMenit', 'catatan', 'totalItem', 'jumlahTemuan', 'detail'],
  Temuan: ['id', 'pemeriksaanId', 'tanggal', 'jam', 'kodeKendaraan', 'namaKendaraan', 'item', 'keterangan',
    'fotoId', 'fotoUrl', 'dilaporkanOleh', 'status', 'tglSelesai', 'jamSelesai', 'diperbaikiOleh',
    'catatanPerbaikan', 'fotoPerbaikanId', 'fotoPerbaikanUrl'],
  // jenis: 'Libur' (hari ini tidak ada pengecekan) atau 'Kerja' (menimpa akhir pekan: tetap ada pengecekan)
  Libur: ['tanggal', 'jenis', 'keterangan', 'dibuatOleh']
};

// Libur nasional & cuti bersama 2026 (SKB 3 Menteri). Admin bisa mengubah lewat menu Kalender.
const LIBUR_AWAL = [
  ['2026-01-01', 'Tahun Baru 2026 Masehi'], ['2026-01-16', 'Isra Mikraj Nabi Muhammad saw.'],
  ['2026-02-16', 'Cuti Bersama Tahun Baru Imlek'], ['2026-02-17', 'Tahun Baru Imlek 2577 Kongzili'],
  ['2026-03-18', 'Cuti Bersama Nyepi'], ['2026-03-19', 'Hari Suci Nyepi (Tahun Baru Saka 1948)'],
  ['2026-03-20', 'Cuti Bersama Idulfitri'], ['2026-03-21', 'Idulfitri 1447 H'], ['2026-03-22', 'Idulfitri 1447 H'],
  ['2026-03-23', 'Cuti Bersama Idulfitri'], ['2026-03-24', 'Cuti Bersama Idulfitri'],
  ['2026-04-03', 'Wafat Yesus Kristus'], ['2026-04-05', 'Paskah'], ['2026-05-01', 'Hari Buruh Internasional'],
  ['2026-05-14', 'Kenaikan Yesus Kristus'], ['2026-05-15', 'Cuti Bersama Kenaikan Yesus Kristus'],
  ['2026-05-27', 'Iduladha 1447 H'], ['2026-05-28', 'Cuti Bersama Iduladha'], ['2026-05-31', 'Hari Raya Waisak 2570 BE'],
  ['2026-06-01', 'Hari Lahir Pancasila'], ['2026-06-16', '1 Muharam Tahun Baru Islam 1448 H'],
  ['2026-08-17', 'Proklamasi Kemerdekaan RI'], ['2026-08-25', 'Maulid Nabi Muhammad saw.'],
  ['2026-12-24', 'Cuti Bersama Natal'], ['2026-12-25', 'Kelahiran Yesus Kristus (Natal)']
];
const FOLDER_NAME = 'PKPPK_Foto_Temuan';

// Sheet log per kendaraan: Log_F1, Log_F2, dst. Satu baris = satu pemeriksaan, satu kolom = satu item checklist.
const KODE_KENDARAAN = ['F1', 'F2', 'A1', 'A2', 'WT'];
const LOG_FIXED = [
  { k: 'tanggal', h: 'Tanggal' }, { k: 'jam', h: 'Jam' }, { k: 'namaPelaksana', h: 'Pelaksana' },
  { k: 'penanggungJawab', h: 'Penanggung jawab' }, { k: 'pemanasanMenit', h: 'Pemanasan (menit)' },
  { k: 'jumlahTemuan', h: 'Jumlah temuan' }, { k: 'catatan', h: 'Catatan' }, { k: 'id', h: 'ID' }
];
const TZ = Session.getScriptTimeZone();
const WRITE_ACTIONS = ['submit', 'fixTemuan', 'addUser', 'setUserActive', 'resetPassword', 'changePassword', 'setLibur', 'deleteLibur'];

/* ---------- SETUP ---------- */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const n = SHEETS[name].length;
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, n).setValues([SHEETS[name]]).setFontWeight('bold').setBackground('#fee2e2');
      sh.setFrozenRows(1);
    }
    sh.getRange(1, 1, sh.getMaxRows(), n).setNumberFormat('@');
  });
  const us = ss.getSheetByName('Users');
  if (us.getLastRow() < 2) {
    addUserRow_('admin', 'Administrator', 'Admin', 'admin', 'admin123');
    addUserRow_('petugas1', 'Petugas Contoh', 'Anggota PKP-PK', 'user', 'petugas123');
  }
  const ls = ss.getSheetByName('Libur');
  if (ls.getLastRow() < 2) {
    LIBUR_AWAL.forEach(function (x) { appendText_('Libur', { tanggal: x[0], jenis: 'Libur', keterangan: x[1], dibuatOleh: 'sistem' }); });
  }
  KODE_KENDARAAN.forEach(function (k) { logSheet_(k); });
  folder_();
  Logger.log('Setup selesai. Login awal: admin / admin123 (SEGERA GANTI).');
}

/* ---------- ENTRY POINT ---------- */
function doGet() {
  return json_({ ok: true, data: 'API Checklist PKP-PK aktif' });
}

function doPost(e) {
  let out;
  let locked = false;
  const lock = LockService.getScriptLock();
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.action === 'login') {
      out = { ok: true, data: login_(req) };
    } else {
      const user = auth_(req.token);
      if (WRITE_ACTIONS.indexOf(req.action) >= 0) { lock.waitLock(25000); locked = true; }
      out = { ok: true, data: route_(req.action, req, user) };
    }
  } catch (err) {
    out = { ok: false, error: String(err.message || err), code: err.code || '' };
  } finally {
    if (locked) lock.releaseLock();
  }
  return json_(out);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(msg, code) {
  const e = new Error(msg);
  if (code) e.code = code;
  return e;
}

/* ---------- ROUTER ---------- */
function route_(a, req, user) {
  switch (a) {
    case 'dashboard': return dashboard_();
    case 'users': return activeUsers_();
    case 'submit': return submit_(req, user);
    case 'listLibur': return liburList_();
    case 'setLibur': requireAdmin_(user); return setLibur_(req, user);
    case 'deleteLibur': requireAdmin_(user); return deleteLibur_(req);
    case 'listTemuan': return listTemuan_(req);
    case 'fixTemuan': return fixTemuan_(req, user);
    case 'listPemeriksaan': return listPemeriksaan_(req);
    case 'getPemeriksaan': return getPemeriksaan_(req);
    case 'changePassword': return changePassword_(req, user);
    case 'listUsers': requireAdmin_(user); return allUsers_();
    case 'addUser': requireAdmin_(user); return addUser_(req);
    case 'setUserActive': requireAdmin_(user); return setUserActive_(req, user);
    case 'resetPassword': requireAdmin_(user); return resetPassword_(req);
    default: throw fail_('Aksi tidak dikenal');
  }
}

/* ---------- SHEET HELPERS ---------- */
function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function rows_(name) {
  const sh = sheet_(name);
  const v = sh.getDataRange().getValues();
  const h = v.shift();
  const out = [];
  v.forEach(function (r, i) {
    if (r[0] === '' || r[0] === null) return;
    const o = { _row: i + 2 };
    h.forEach(function (k, j) {
      const val = r[j];
      o[k] = (val instanceof Date) ? Utilities.formatDate(val, TZ, 'yyyy-MM-dd') : (val === null || val === undefined ? '' : String(val));
    });
    out.push(o);
  });
  return out;
}

function appendText_(name, obj) {
  const sh = sheet_(name);
  const cols = SHEETS[name];
  const row = sh.getLastRow() + 1;
  const rng = sh.getRange(row, 1, 1, cols.length);
  rng.setNumberFormat('@');
  rng.setValues([cols.map(function (k) { return obj[k] === undefined ? '' : String(obj[k]); })]);
}

function updateCells_(name, row, obj) {
  const sh = sheet_(name);
  const cols = SHEETS[name];
  Object.keys(obj).forEach(function (k) {
    const c = cols.indexOf(k);
    if (c < 0) return;
    const cell = sh.getRange(row, c + 1);
    cell.setNumberFormat('@');
    cell.setValue(String(obj[k]));
  });
}

function strip_(o) {
  const c = {};
  Object.keys(o).forEach(function (k) { if (k !== '_row' && k !== 'detail') c[k] = o[k]; });
  return c;
}

function todayStr_(off) {
  return Utilities.formatDate(new Date(Date.now() - (off || 0) * 86400000), TZ, 'yyyy-MM-dd');
}
function nowTime_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }
function newId_(p) {
  return p + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmmss') + Math.floor(Math.random() * 900 + 100);
}
function byNewest_(a, b) { return (b.tanggal + b.jam).localeCompare(a.tanggal + a.jam); }

/* ---------- AUTH ---------- */
function hash_(pw, salt) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw, Utilities.Charset.UTF_8);
  return d.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function addUserRow_(username, nama, jabatan, role, password) {
  const salt = Utilities.getUuid();
  appendText_('Users', {
    username: username, nama: nama, jabatan: jabatan, role: role,
    salt: salt, hash: hash_(password, salt), aktif: 'TRUE'
  });
}

function login_(req) {
  const uname = String(req.username || '').trim().toLowerCase();
  const pw = String(req.password || '');
  const cache = CacheService.getScriptCache();
  const fk = 'f_' + uname;
  if (Number(cache.get(fk) || 0) >= 5) throw fail_('Terlalu banyak percobaan gagal. Coba lagi 10 menit lagi.');
  const u = rows_('Users').filter(function (x) { return x.username.toLowerCase() === uname; })[0];
  if (!u || u.aktif !== 'TRUE' || hash_(pw, u.salt) !== u.hash) {
    cache.put(fk, String(Number(cache.get(fk) || 0) + 1), 600);
    throw fail_('Username atau password salah');
  }
  cache.remove(fk);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('t_' + token, u.username, 21600);
  return { token: token, user: { username: u.username, nama: u.nama, jabatan: u.jabatan, role: u.role } };
}

function auth_(token) {
  if (!token) throw fail_('Silakan login', 'AUTH');
  const uname = CacheService.getScriptCache().get('t_' + token);
  if (!uname) throw fail_('Sesi berakhir, silakan login ulang', 'AUTH');
  const u = rows_('Users').filter(function (x) { return x.username === uname && x.aktif === 'TRUE'; })[0];
  if (!u) throw fail_('Akun tidak aktif', 'AUTH');
  return u;
}

function requireAdmin_(u) { if (u.role !== 'admin') throw fail_('Hanya admin yang boleh melakukan ini'); }

function changePassword_(req, user) {
  if (!req.newPassword || String(req.newPassword).length < 6) throw fail_('Password baru minimal 6 karakter');
  if (hash_(String(req.oldPassword || ''), user.salt) !== user.hash) throw fail_('Password lama salah');
  const salt = Utilities.getUuid();
  updateCells_('Users', user._row, { salt: salt, hash: hash_(String(req.newPassword), salt) });
  return true;
}

/* ---------- USERS ---------- */
function activeUsers_() {
  return rows_('Users').filter(function (u) { return u.aktif === 'TRUE'; })
    .map(function (u) { return { username: u.username, nama: u.nama, jabatan: u.jabatan }; });
}
function allUsers_() {
  return rows_('Users').map(function (u) {
    return { username: u.username, nama: u.nama, jabatan: u.jabatan, role: u.role, aktif: u.aktif === 'TRUE' };
  });
}
function addUser_(req) {
  const uname = String(req.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(uname)) throw fail_('Username 3-30 karakter (huruf kecil, angka, titik, strip)');
  if (!req.nama) throw fail_('Nama wajib diisi');
  if (!req.password || String(req.password).length < 6) throw fail_('Password minimal 6 karakter');
  if (rows_('Users').some(function (u) { return u.username.toLowerCase() === uname; })) throw fail_('Username sudah dipakai');
  addUserRow_(uname, String(req.nama).trim(), String(req.jabatan || '').trim(), req.role === 'admin' ? 'admin' : 'user', String(req.password));
  return true;
}
function setUserActive_(req, me) {
  const u = rows_('Users').filter(function (x) { return x.username === req.username; })[0];
  if (!u) throw fail_('User tidak ditemukan');
  if (u.username === me.username) throw fail_('Tidak bisa menonaktifkan akun sendiri');
  updateCells_('Users', u._row, { aktif: req.aktif ? 'TRUE' : 'FALSE' });
  return true;
}
function resetPassword_(req) {
  const u = rows_('Users').filter(function (x) { return x.username === req.username; })[0];
  if (!u) throw fail_('User tidak ditemukan');
  if (!req.password || String(req.password).length < 6) throw fail_('Password minimal 6 karakter');
  const salt = Utilities.getUuid();
  updateCells_('Users', u._row, { salt: salt, hash: hash_(String(req.password), salt) });
  return true;
}

/* ---------- FOTO (Google Drive) ---------- */
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* buat ulang */ } }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function saveFoto_(dataUrl, name) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const i = dataUrl.indexOf(',');
  if (i < 0 || dataUrl.indexOf('data:image/') !== 0) return null;
  const mime = dataUrl.substring(5, dataUrl.indexOf(';'));
  const blob = Utilities.newBlob(Utilities.base64Decode(dataUrl.substring(i + 1)), mime, name + '.jpg');
  const f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: f.getId(), url: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1200' };
}

/* ---------- PEMERIKSAAN ---------- */
function submit_(req, user) {
  if (!req.kode || !req.nama) throw fail_('Kendaraan tidak valid');
  if (!req.penanggungJawab) throw fail_('Penanggung jawab wajib diisi');
  const items = req.items || [];
  if (!items.length) throw fail_('Checklist kosong');
  const pid = newId_('P');
  const tgl = todayStr_();
  const jam = nowTime_();
  const temuan = [];
  const detail = items.map(function (it, idx) {
    const d = { s: it.s, n: it.n, q: it.q || '', k: it.k, hasil: it.hasil || '', nilai: it.nilai || '', ket: it.ket || '', fotoUrl: '' };
    if (it.hasil === 'Rusak' || it.hasil === 'Kurang') {
      const foto = saveFoto_(it.foto, pid + '_' + idx);
      if (foto) d.fotoUrl = foto.url;
      temuan.push({
        id: newId_('T') + idx, pemeriksaanId: pid, tanggal: tgl, jam: jam,
        kodeKendaraan: req.kode, namaKendaraan: req.nama, item: it.n + (it.q ? ' (' + it.q + ')' : ''),
        keterangan: it.ket || '', fotoId: foto ? foto.id : '', fotoUrl: foto ? foto.url : '',
        dilaporkanOleh: user.nama, status: 'Open'
      });
    }
    return d;
  });
  appendText_('Pemeriksaan', {
    id: pid, tanggal: tgl, jam: jam, kodeKendaraan: req.kode, namaKendaraan: req.nama,
    pelaksana: user.username, namaPelaksana: user.nama, penanggungJawab: req.penanggungJawab,
    pemanasanMenit: req.pemanasan || '', catatan: req.catatan || '',
    totalItem: items.length, jumlahTemuan: temuan.length, detail: JSON.stringify(detail)
  });
  temuan.forEach(function (t) { appendText_('Temuan', t); });
  try {
    logWriteBatch_(req.kode, [{
      id: pid, tanggal: tgl, jam: jam, namaPelaksana: user.nama, penanggungJawab: req.penanggungJawab,
      pemanasanMenit: req.pemanasan || '', jumlahTemuan: temuan.length, catatan: req.catatan || '', items: detail
    }]);
  } catch (e) { Logger.log('Log kendaraan gagal: ' + e); } // jangan gagalkan pengiriman checklist
  return { id: pid, jumlahTemuan: temuan.length };
}

/* ---------- SHEET LOG PER KENDARAAN ---------- */
function logSheet_(kode) {
  if (!/^[A-Za-z0-9_-]{1,12}$/.test(String(kode))) throw fail_('Kode kendaraan tidak valid');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Log_' + kode;
  let sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  const n = LOG_FIXED.length;
  sh.getRange(1, 1).setValue('Log checklist ' + kode);
  sh.getRange(2, 1, 1, n).setValues([LOG_FIXED.map(function (c) { return c.h; })]);
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#fecaca');
  sh.getRange(2, 1, 1, n).setFontWeight('bold').setBackground('#fee2e2').setWrap(true);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(2);
  return sh;
}

// Tulis satu atau banyak pemeriksaan ke Log_<kode>. Kolom item dibuat otomatis (judul seksi di baris 1, nama item di baris 2).
// Kalau daftar item di checklists.js berubah, kolom baru ditambahkan di kanan; kolom lama tetap.
function logWriteBatch_(kode, recs) {
  if (!recs.length) return;
  const sh = logSheet_(kode);
  const F = LOG_FIXED.length;
  let lc = Math.max(sh.getLastColumn(), F);
  const hdr = sh.getRange(1, 1, 2, lc).getValues();
  const map = {}; // 'seksi|item' -> indeks kolom (0-based)
  for (let c = F; c < lc; c++) { if (hdr[1][c] !== '') map[hdr[0][c] + '|' + hdr[1][c]] = c; }
  const newH1 = [], newH2 = [];
  const prepared = recs.map(function (r) {
    const seen = {};
    const cells = {};
    (r.items || []).forEach(function (it) {
      const sec = it.s || '';
      let label = it.n, k = sec + '|' + label, t = 2;
      while (seen[k]) { label = it.n + ' (' + (t++) + ')'; k = sec + '|' + label; }
      seen[k] = true;
      if (map[k] === undefined) { map[k] = lc + newH1.length; newH1.push(sec); newH2.push(label); }
      const bad = it.hasil === 'Rusak' || it.hasil === 'Kurang';
      const v = it.k === 'val' ? String(it.nilai || '') : (it.hasil || '') + (bad && it.ket ? ': ' + it.ket : '');
      cells[map[k]] = { v: v, bad: bad };
    });
    return { r: r, cells: cells };
  });
  const total = lc + newH1.length;
  if (total > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), total - sh.getMaxColumns());
  if (newH1.length) {
    sh.getRange(1, lc + 1, 2, newH1.length).setValues([newH1, newH2]).setWrap(true);
    sh.getRange(1, lc + 1, 1, newH1.length).setFontWeight('bold').setBackground('#fecaca');
    sh.getRange(2, lc + 1, 1, newH1.length).setFontWeight('bold').setBackground('#fee2e2');
    sh.setColumnWidths(lc + 1, newH1.length, 110);
    lc = total;
  }
  const start = Math.max(sh.getLastRow(), 2) + 1;
  if (start + recs.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), recs.length + 50);
  const values = [], bg = [];
  prepared.forEach(function (p) {
    const row = [], col = [];
    for (let c = 0; c < total; c++) { row.push(''); col.push('#ffffff'); }
    LOG_FIXED.forEach(function (f, i) { row[i] = p.r[f.k] === undefined ? '' : String(p.r[f.k]); });
    Object.keys(p.cells).forEach(function (c) {
      row[c] = p.cells[c].v;
      if (p.cells[c].bad) col[c] = '#fecaca';
    });
    values.push(row);
    bg.push(col);
  });
  const rng = sh.getRange(start, 1, recs.length, total);
  rng.setNumberFormat('@');
  rng.setValues(values);
  rng.setBackgrounds(bg);
}

// Jalankan SEKALI dari editor Apps Script untuk mengisi sheet Log_* dari riwayat pemeriksaan yang sudah ada.
// Aman diulang: sheet Log_* dihapus lalu dibuat ulang dari sheet Pemeriksaan (data asli tidak diubah).
function rebuildLogSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const all = rows_('Pemeriksaan').sort(function (a, b) { return (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam); });
  const kodes = KODE_KENDARAAN.slice();
  all.forEach(function (p) { if (kodes.indexOf(p.kodeKendaraan) < 0 && /^[A-Za-z0-9_-]{1,12}$/.test(p.kodeKendaraan)) kodes.push(p.kodeKendaraan); });
  kodes.forEach(function (k) {
    const old = ss.getSheetByName('Log_' + k);
    if (old) { if (ss.getSheets().length > 1) ss.deleteSheet(old); }
    const recs = all.filter(function (p) { return p.kodeKendaraan === k; }).map(function (p) {
      let items = [];
      try { items = JSON.parse(p.detail); } catch (e) { items = []; }
      return {
        id: p.id, tanggal: p.tanggal, jam: p.jam, namaPelaksana: p.namaPelaksana, penanggungJawab: p.penanggungJawab,
        pemanasanMenit: p.pemanasanMenit, jumlahTemuan: p.jumlahTemuan, catatan: p.catatan, items: items
      };
    });
    logSheet_(k);
    for (let i = 0; i < recs.length; i += 100) logWriteBatch_(k, recs.slice(i, i + 100));
  });
  Logger.log('Sheet Log_* selesai dibuat ulang dari ' + all.length + ' pemeriksaan.');
}

function dashboard_() {
  const p = rows_('Pemeriksaan');
  const t = rows_('Temuan');
  const today = todayStr_();
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = todayStr_(i);
    last7.push({ tanggal: d, jumlah: p.filter(function (r) { return r.tanggal === d; }).length });
  }
  return {
    tanggal: today,
    today: p.filter(function (r) { return r.tanggal === today; }).map(strip_).sort(function (a, b) { return a.jam.localeCompare(b.jam); }),
    openTemuan: t.filter(function (x) { return x.status === 'Open'; }).map(strip_).sort(byNewest_),
    last7: last7,
    libur: liburList_()
  };
}

/* ---------- KALENDER LIBUR ---------- */
// Aturan: entri di sheet Libur menang; kalau tidak ada, Sabtu & Minggu = libur; selain itu hari kerja.
function liburList_() {
  return rows_('Libur').map(function (r) {
    return { tanggal: r.tanggal, jenis: r.jenis, keterangan: r.keterangan };
  });
}

function setLibur_(req, user) {
  const tgl = String(req.tanggal || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) throw fail_('Tanggal tidak valid');
  const jenis = req.jenis === 'Kerja' ? 'Kerja' : 'Libur';
  const ket = String(req.keterangan || '').trim();
  const ada = rows_('Libur').filter(function (x) { return x.tanggal === tgl; })[0];
  if (ada) updateCells_('Libur', ada._row, { jenis: jenis, keterangan: ket, dibuatOleh: user.nama });
  else appendText_('Libur', { tanggal: tgl, jenis: jenis, keterangan: ket, dibuatOleh: user.nama });
  return liburList_();
}

function deleteLibur_(req) {
  const ada = rows_('Libur').filter(function (x) { return x.tanggal === String(req.tanggal); })[0];
  if (ada) sheet_('Libur').deleteRow(ada._row);
  return liburList_();
}

function listPemeriksaan_(req) {
  let r = rows_('Pemeriksaan');
  if (req.kode) r = r.filter(function (x) { return x.kodeKendaraan === req.kode; });
  if (req.dari) r = r.filter(function (x) { return x.tanggal >= req.dari; });
  if (req.sampai) r = r.filter(function (x) { return x.tanggal <= req.sampai; });
  return r.map(strip_).sort(byNewest_).slice(0, Math.min(Number(req.limit) || 100, 300));
}

function getPemeriksaan_(req) {
  const r = rows_('Pemeriksaan').filter(function (x) { return x.id === req.id; })[0];
  if (!r) throw fail_('Data tidak ditemukan');
  const out = strip_(r);
  try { out.items = JSON.parse(r.detail); } catch (e) { out.items = []; }
  return out;
}

/* ---------- TEMUAN ---------- */
function listTemuan_(req) {
  let r = rows_('Temuan');
  if (req.status === 'Open') r = r.filter(function (x) { return x.status === 'Open'; });
  if (req.status === 'Fixed') r = r.filter(function (x) { return x.status === 'Fixed'; });
  return r.map(strip_).sort(byNewest_).slice(0, 200);
}

function fixTemuan_(req, user) {
  const t = rows_('Temuan').filter(function (x) { return x.id === req.id; })[0];
  if (!t) throw fail_('Temuan tidak ditemukan');
  if (t.status === 'Fixed') throw fail_('Temuan ini sudah ditandai selesai');
  const foto = saveFoto_(req.foto, 'fix_' + t.id);
  updateCells_('Temuan', t._row, {
    status: 'Fixed', tglSelesai: todayStr_(), jamSelesai: nowTime_(), diperbaikiOleh: user.nama,
    catatanPerbaikan: req.catatan || '', fotoPerbaikanId: foto ? foto.id : '', fotoPerbaikanUrl: foto ? foto.url : ''
  });
  return true;
}

(function () {
  'use strict';
  const CFG = window.APP_CONFIG;
  const VEHICLES = window.VEHICLES;
  const CHECKLISTS = window.CHECKLISTS;
  // Item tambahan: isi tangki air saat ini (WT). Ditambahkan di sini agar tidak perlu mengubah checklists.js.
  (function () {
    const w = CHECKLISTS && CHECKLISTS.WT;
    if (w && !w.some((sec) => sec.items.some((it) => it.n === 'Isi tangki air saat ini'))) {
      w.push({ title: 'Tangki air', items: [{ n: 'Isi tangki air saat ini', q: 'Kapasitas penuh 5.000 liter', k: 'val', u: 'liter', max: 5000 }] });
    }
  })();
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ICON = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-1.7.8-3 1.7-4.100C9 9.400 10 10.500 11 11c0-3 .5-6 1-9z"/><path d="M12 22a7 7 0 0 0 7-7c0-2-.8-3.700-2-5 .1 1 0 2-.6 3C16 9 14 6 12 4c.3 2-1 4-2.500 5.700C8.200 11.200 7 12.800 7 15a5 5 0 0 0 5 5z" opacity=".0"/></svg>'
  };

  const S = { token: null, user: null, view: 'beranda', users: [], form: null, temFilter: 'Open', openCount: 0, menunggu: 0, libur: [], calMonth: null };
  try {
    const raw = localStorage.getItem('pkppk_session');
    if (raw) { const o = JSON.parse(raw); S.token = o.token; S.user = o.user; }
  } catch (e) { /* abaikan */ }

  function saveSession() {
    try {
      if (S.token) localStorage.setItem('pkppk_session', JSON.stringify({ token: S.token, user: S.user }));
      else localStorage.removeItem('pkppk_session');
    } catch (e) { /* abaikan */ }
  }

  /* ---------- util UI ---------- */
  let loadCount = 0;
  function loading(on, text) {
    loadCount = Math.max(0, loadCount + (on ? 1 : -1));
    $('#loading').classList.toggle('hidden', loadCount === 0);
    if (text) $('#loading-text').textContent = text;
    else if (on) $('#loading-text').textContent = 'Memuat…';
  }
  let toastT;
  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.className = 'toast'; }, 3200);
  }
  function fmtTgl(s) {
    if (!s) return '';
    const p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtHariPanjang(s) {
    const p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function hariPendek(s) {
    const p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('id-ID', { weekday: 'short' });
  }
  // "3 hari lalu" / "hari ini" untuk tanggal yyyy-mm-dd
  function hariLalu(s) {
    const p = String(s).split('-');
    const a = new Date(+p[0], +p[1] - 1, +p[2]);
    const n = new Date();
    const k = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - a) / 86400000);
    return k <= 0 ? 'hari ini' : k + ' hari lalu';
  }
  function ymd(d) {
    const z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  const vehicleOf = (k) => VEHICLES.find((v) => v.kode === k);
  // Aturan hari: entri kalender menang; selain itu Sabtu & Minggu = libur; selain itu hari kerja.
  function dayType(str) {
    const e = S.libur.find((x) => x.tanggal === str);
    if (e) {
      return e.jenis === 'Kerja'
        ? { libur: false, khusus: true, alasan: e.keterangan || 'Hari kerja khusus', sumber: 'kalender' }
        : { libur: true, khusus: false, alasan: e.keterangan || 'Libur', sumber: 'kalender' };
    }
    const p = str.split('-');
    const w = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
    if (w === 0 || w === 6) return { libur: true, khusus: false, alasan: w === 0 ? 'Hari Minggu' : 'Hari Sabtu', sumber: 'akhir pekan' };
    return { libur: false, khusus: false, alasan: '', sumber: '' };
  }
  const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  // Kapasitas kendaraan (ditampilkan di pilihan kendaraan dan form). Bisa juga diisi lewat field `kapasitas` di VEHICLES.
  const KAPASITAS = { WT: '5.000 liter' };
  const kapOf = (v) => v.kapasitas || KAPASITAS[v.kode] || '';
  const sapa = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; };
  // Angka naik dari 0 (dipakai di papan kesiapan Beranda)
  function countUp() {
    $$('[data-n]').forEach((el) => {
      const n = Number(el.dataset.n);
      if (!n) return;
      const t0 = performance.now();
      el.textContent = '0';
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 700);
        el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  const ROLE = { admin: 'Admin', pj: 'Penanggung jawab', user: 'Petugas' };
  // Daftar penanggung jawab: user ber-role pj; bila belum ada satu pun, tampilkan semua agar form tetap bisa dipakai.
  const pjUsers = () => { const p = S.users.filter((u) => u.role === 'pj'); return p.length ? p : S.users; };

  /* ---------- API ---------- */
  async function api(action, data, opt) {
    const silent = opt && opt.silent;
    if (!CFG.API_URL || CFG.API_URL.indexOf('GANTI_') === 0) throw new Error('API_URL belum diisi di js/config.js');
    if (!silent) loading(true);
    try {
      const res = await fetch(CFG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, token: S.token }, data || {}))
      });
      const j = await res.json();
      if (!j.ok) {
        if (j.code === 'AUTH') { doLogout(true); }
        throw new Error(j.error || 'Terjadi kesalahan');
      }
      return j.data;
    } finally {
      if (!silent) loading(false);
    }
  }

  async function compress(file, maxDim, quality) {
    maxDim = maxDim || 1280; quality = quality || 0.72;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const r = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', quality);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---------- modal & lightbox ---------- */
  function modal(html, onMount) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal">' + html + '</div>';
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    if (onMount) onMount($('.modal', bg), close);
    return close;
  }
  function lightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<img src="' + esc(url) + '" alt="foto">';
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  }
  document.addEventListener('click', (e) => {
    const im = e.target.closest('img[data-zoom]');
    if (im) { e.stopPropagation(); lightbox(im.getAttribute('data-zoom')); }
  }, true);

  /* ---------- LOGIN ---------- */
  function renderLogin() {
    $('#app').innerHTML = `
      <div class="login-wrap"><form class="login-card" id="lf" autocomplete="on">
        <div class="logo">${ICON.fire}</div>
        <h1>Checklist Kendaraan PKP-PK</h1>
        <p class="muted" style="margin:6px 0 4px">${esc(CFG.NAMA_UNIT)} · silakan masuk</p>
        <label class="f">Username</label>
        <input class="in" name="username" autocomplete="username" autocapitalize="none" required>
        <label class="f">Password</label>
        <input class="in" name="password" type="password" autocomplete="current-password" required>
        <div id="le" class="err hidden"></div>
        <button class="btn block" style="margin-top:18px" type="submit">Masuk</button>
      </form></div>`;
    $('#lf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      $('#le').classList.add('hidden');
      try {
        const d = await api('login', { username: f.username.value, password: f.password.value });
        S.token = d.token; S.user = d.user; saveSession();
        renderShell();
      } catch (err) {
        $('#le').textContent = err.message;
        $('#le').classList.remove('hidden');
      }
    });
  }

  function doLogout(expired) {
    S.token = null; S.user = null; saveSession();
    renderLogin();
    if (expired) toast('Sesi berakhir, silakan login ulang', true);
  }

  /* ---------- SHELL ---------- */
  function renderShell() {
    const admin = S.user.role === 'admin';
    $('#app').innerHTML = `
      <header class="topbar"><div class="topbar-in">
        <div class="logo">${ICON.fire}</div>
        <div class="brand"><b>Checklist PKP-PK</b><span>${esc(CFG.NAMA_UNIT)}</span></div>
        <button class="chip" id="me"><div class="avatar">${esc(initials(S.user.nama))}</div><span class="nm">${esc(S.user.nama)}</span></button>
      </div></header>
      <nav class="nav" id="nav">
        <button data-v="beranda">${ICON.home}<span>Beranda</span></button>
        <button data-v="isi">${ICON.plus}<span>Isi</span></button>
        <button data-v="temuan">${ICON.alert}<span>Temuan</span><b class="badge hidden" id="nb">0</b></button>
        ${!admin ? `<button data-v="status">${ICON.ok}<span>Status</span><b class="badge hidden" id="nb3">0</b></button>` : ''}
        ${admin ? `<button data-v="setuju">${ICON.ok}<span>Setujui</span><b class="badge hidden" id="nb2">0</b></button>` : ''}
        <button data-v="riwayat">${ICON.hist}<span>Riwayat</span></button>
        ${admin ? `<button data-v="kalender">${ICON.cal}<span>Kalender</span></button><button data-v="users">${ICON.users}<span>Pengguna</span></button>` : ''}
      </nav>
      <main id="main"></main>`;
    $('#nav').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) go(b.dataset.v); });
    $('#me').addEventListener('click', profileModal);
    go(S.view || 'beranda');
  }

  function setBadge(n) {
    S.openCount = n;
    const b = $('#nb');
    if (!b) return;
    b.textContent = n;
    b.classList.toggle('hidden', !n);
  }

  function setBadgeSetuju(n) {
    S.menunggu = n;
    const b = $('#nb2');
    if (!b) return;
    b.textContent = n;
    b.classList.toggle('hidden', !n);
  }

  async function go(v, arg) {
    S.view = v;
    $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    const m = $('#main');
    m.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    window.scrollTo(0, 0);
    try {
      if (v === 'beranda') await viewBeranda();
      else if (v === 'isi') await viewIsi(arg);
      else if (v === 'temuan') await viewTemuan();
      else if (v === 'status') await viewStatus();
      else if (v === 'setuju') await viewSetuju();
      else if (v === 'riwayat') await viewRiwayat();
      else if (v === 'kalender') await viewKalender();
      else if (v === 'users') await viewUsers();
    } catch (err) {
      m.innerHTML = '<div class="card empty">' + esc(err.message) + '<br><br><button class="btn sm" id="retry">Coba lagi</button></div>';
      const r = $('#retry'); if (r) r.onclick = () => go(v, arg);
    }
  }

  /* ---------- BERANDA ---------- */
  async function viewBeranda() {
    const d = await api('dashboard', {}, { silent: true });
    setBadge(d.openTemuan.length);
    setBadgeSetuju(d.menunggu || 0);
    S.libur = d.libur || [];
    const hari = dayType(d.tanggal);
    const byK = {};
    const aktif = d.today.filter((r) => (r.status || 'Disetujui') !== 'Ditolak'); // yang ditolak dianggap belum dicek
    aktif.forEach((r) => { (byK[r.kodeKendaraan] = byK[r.kodeKendaraan] || []).push(r); });
    const doneN = VEHICLES.filter((v) => byK[v.kode]).length;
    const max = Math.max(1, ...d.last7.map((x) => x.jumlah));
    // Status persetujuan checklist milik petugas yang sedang login (hari ini)
    const mineToday = d.today.filter((r) => r.pelaksana === S.user.username);
    const seen = {}; mineToday.forEach((r) => { seen[r.id] = 1; });
    const mine = mineToday.concat((d.menungguSaya || []).filter((r) => !seen[r.id]));
    const stOf = (r) => r.status || 'Disetujui';
    const stCls = (s) => (s === 'Disetujui' ? 'ok' : s === 'Ditolak' ? 'bad' : 'gray');
    // Kondisi tiap armada hari ini: ok (aman), warn (ada temuan), wait (menunggu persetujuan), '' (belum dicek)
    const kondisi = (v) => {
      const r = byK[v.kode];
      if (!r) return '';
      if (!r.some((x) => (x.status || 'Disetujui') === 'Disetujui')) return 'wait';
      return r.reduce((a, x) => a + Number(x.jumlahTemuan || 0), 0) ? 'warn' : 'ok';
    };
    const pct = Math.round(doneN / VEHICLES.length * 100);
    const libOnly = hari.libur && !doneN;
    const msgHero = libOnly ? 'Hari libur, pengecekan tidak diwajibkan' : doneN === VEHICLES.length ? 'Semua armada sudah dicek' : (VEHICLES.length - doneN) + ' armada belum dicek';
    const hero = `<div class="hero">
      <div class="ring"><svg viewBox="0 0 44 44"><defs><linearGradient id="rgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
        <circle class="rg-bg" cx="22" cy="22" r="19"/><circle class="rg-fg" cx="22" cy="22" r="19" style="--pct:${pct}"/></svg>
        <div class="ring-t"><b>${libOnly ? 'Libur' : doneN + '/' + VEHICLES.length}</b><small>${libOnly ? '' : 'dicek'}</small></div></div>
      <div class="hero-body"><div class="hero-k">Kesiapan armada hari ini</div><div class="hero-h">${esc(msgHero)}</div>
        <div class="bays">${VEHICLES.map((v, i) => `<div class="bay ${kondisi(v)}" style="--i:${i}" title="${esc(v.nama)}"><i></i>${esc(v.kode)}</div>`).join('')}</div></div>
      <div class="hero-stats">
        <div class="hs ${d.openTemuan.length ? 'warn' : ''}"><b data-n="${d.openTemuan.length}">${d.openTemuan.length}</b><span>Temuan belum diperbaiki</span></div>
        <div class="hs"><b data-n="${aktif.length}">${aktif.length}</b><span>Pengisian hari ini</span></div>
      </div></div>`;
    $('#main').innerHTML = `
      <div class="page-title"><div><div class="muted small">${esc(fmtHariPanjang(d.tanggal))}</div><h2>${sapa()}, ${esc(S.user.nama.split(' ')[0])} 👋</h2></div></div>
      ${hari.libur ? `<div class="card libur-banner"><b>Hari ini libur · ${esc(hari.alasan)}</b><span>Pengecekan tidak diwajibkan, tetapi tetap bisa diisi bila ada.</span></div>`
          : hari.khusus ? `<div class="card libur-banner khusus"><b>Hari kerja khusus · ${esc(hari.alasan)}</b><span>Pengecekan tetap dilakukan hari ini.</span></div>` : ''}
      ${(d.ditolakSaya || []).map((x) => `<div class="card libur-banner tolak"><b>Ditolak · ${esc(x.kodeKendaraan)} (${esc(fmtTgl(x.tanggal))} ${esc(x.jam)})</b><span>${esc(x.alasanTolak || '')}</span><div><button class="btn sm" data-isi="${esc(x.kodeKendaraan)}" style="margin-top:8px">Isi ulang</button></div></div>`).join('')}
      ${S.user.role === 'admin' && d.menunggu ? `<div class="card libur-banner"><b>${d.menunggu} checklist menunggu persetujuan</b><div><button class="btn sm" id="gosetuju" style="margin-top:8px">Tinjau sekarang</button></div></div>` : ''}
      ${hero}
      ${S.user.role !== 'admin' ? `
      <div class="section-t">Persetujuan checklist saya</div>
      <div class="card">
        ${mine.length ? mine.map((r) => {
          const s = stOf(r);
          return `<div class="appr-row">
            <div><b>${esc(r.kodeKendaraan)}</b> <span class="muted small">${esc(r.namaKendaraan)} · ${r.tanggal !== d.tanggal ? esc(fmtTgl(r.tanggal)) + ' ' : ''}${esc(r.jam)}</span>
              ${s === 'Ditolak' && r.alasanTolak ? `<div class="small" style="color:var(--bad)">${esc(r.alasanTolak)}</div>` : ''}
              ${s === 'Disetujui' && r.disetujuiOleh ? `<div class="muted small">Disetujui oleh ${esc(r.disetujuiOleh)}</div>` : ''}
            </div>
            <span class="pill ${stCls(s)}">${esc(s)}</span>
          </div>`;
        }).join('') : '<div class="empty" style="padding:14px">Tidak ada checklist yang menunggu persetujuan, dan kamu belum mengirim checklist hari ini.</div>'}
      </div>` : ''}
      <div class="section-t">Status kendaraan hari ini</div>
      <div class="grid vgrid">
        ${VEHICLES.map((v) => {
          const r = byK[v.kode];
          const last = r ? r[r.length - 1] : null;
          const tem = r ? r.reduce((a, x) => a + Number(x.jumlahTemuan || 0), 0) : 0;
          return `<div class="card veh ${r ? 'done ' + kondisi(v) : ''}">
            <div class="vk">${v.kode}</div>
            <div class="vi"><b>${esc(v.nama)}</b>
              <span>${last ? 'Oleh ' + esc(last.namaPelaksana) + ' · ' + esc(last.jam) : (hari.libur ? 'Libur · ' + esc(hari.alasan) : 'Belum dicek')}</span></div>
            ${r ? (r.some((x) => (x.status || 'Disetujui') === 'Disetujui') ? `<span class="pill ${tem ? 'warn' : 'ok'}">${tem ? tem + ' temuan' : 'Aman'}</span>` : '<span class="pill gray">Menunggu</span>')
                : `<div style="display:flex;gap:6px;align-items:center">${hari.libur ? '<span class="pill gray">Libur</span>' : ''}<button class="btn ${hari.libur ? 'ghost ' : ''}sm" data-isi="${v.kode}">Isi</button></div>`}
          </div>`;
        }).join('')}
      </div>
      <div class="section-t">Yang mengisi hari ini</div>
      <div class="card">
        ${aktif.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>Jam</th><th>Kendaraan</th><th>Pelaksana</th><th>Penanggung jawab</th><th></th></tr></thead><tbody>
          ${aktif.map((r) => `<tr><td>${esc(r.jam)}</td><td><b>${esc(r.kodeKendaraan)}</b> <span class="muted small">${esc(r.namaKendaraan)}</span></td><td>${esc(r.namaPelaksana)}</td><td>${esc(r.penanggungJawab)}</td>
            <td>${(r.status || 'Disetujui') === 'Menunggu' ? '<span class="pill gray">Menunggu</span> ' : ''}${Number(r.jumlahTemuan) ? '<span class="pill warn">' + esc(r.jumlahTemuan) + ' temuan</span>' : '<span class="pill ok">Aman</span>'}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty" style="padding:18px">Belum ada yang mengisi hari ini.</div>'}
      </div>
      <div class="section-t">Pengisian 7 hari terakhir</div>
      <div class="card"><div class="chart">
        ${d.last7.map((x) => `<div class="c"><b>${x.jumlah}</b><i style="height:${Math.max(4, Math.round(x.jumlah / max * 62))}px"></i><span>${esc(hariPendek(x.tanggal))}</span></div>`).join('')}
      </div></div>
      ${d.openTemuan.length ? `<div class="section-t">Temuan terbaru <button class="link" id="allt">Lihat semua</button></div>
        <div class="list">${d.openTemuan.slice(0, 3).map(temCard).join('')}</div>` : ''}`;
    $$('[data-isi]').forEach((b) => { b.onclick = () => go('isi', b.dataset.isi); });
    const at = $('#allt'); if (at) at.onclick = () => go('temuan');
    const gs = $('#gosetuju'); if (gs) gs.onclick = () => go('setuju');
    bindTemActions();
    countUp();
  }

  /* ---------- ISI CHECKLIST ---------- */
  async function viewIsi(pre) {
    if (!S.users.length) {
      try { S.users = await api('users', {}, { silent: true }); } catch (e) { S.users = []; }
    }
    if (pre && CHECKLISTS[pre]) return renderForm(pre);
    $('#main').innerHTML = `
      <div class="page-title"><h2>Pilih kendaraan</h2></div>
      <div class="grid vgrid">${VEHICLES.map((v) => `
        <div class="card veh pick" data-k="${v.kode}"><div class="vk">${v.kode}</div>
        <div class="vi"><b>${esc(v.nama)}</b><span>${esc(v.jenis)}${kapOf(v) ? ' · Kapasitas ' + esc(kapOf(v)) : ''}</span></div></div>`).join('')}</div>`;
    $$('.pick').forEach((c) => { c.onclick = () => renderForm(c.dataset.k); });
  }

  const GOOD = { cond: 'Baik', fill: 'Penuh' };
  const BAD = { cond: 'Rusak', fill: 'Kurang' };

  async function renderForm(kode) {
    $('#main').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    // Temuan yang masih terbuka pada kendaraan ini (terlama dulu), supaya item yang sama tidak dilaporkan dobel
    let openTem = [];
    try {
      openTem = (await api('listTemuan', { status: 'Open' }, { silent: true }))
        .filter((t) => t.kodeKendaraan === kode)
        .sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));
    } catch (e) { openTem = []; }
    const temOf = {};
    openTem.forEach((t) => { if (!temOf[t.item]) temOf[t.item] = t; });
    const v = vehicleOf(kode);
    const items = [];
    CHECKLISTS[kode].forEach((sec) => sec.items.forEach((it) => {
      items.push({ s: sec.title, n: it.n, q: it.q || '', k: it.k, u: it.u || '', max: it.max || 0, hasil: '', nilai: '', ket: '', foto: '', perbaikan: null, tem: temOf[it.n + (it.q ? ' (' + it.q + ')' : '')] || null });
    }));
    S.form = { kode: kode, items: items };
    let idx = 0;
    const secHtml = CHECKLISTS[kode].map((sec) => {
      const start = idx;
      const rows = sec.items.map((it) => {
        const i = idx++;
        const tem = temOf[it.n + (it.q ? ' (' + it.q + ')' : '')];
        const right = it.k === 'val'
          ? `<div class="valbox"><input class="in val" inputmode="decimal" placeholder="isi"><span>${esc(it.u)}</span></div>`
          : `<div class="seg"><button type="button" class="g" data-v="${GOOD[it.k]}">${GOOD[it.k]}</button><button type="button" class="r" data-v="${BAD[it.k]}">${BAD[it.k]}</button></div>`;
        return `<div class="item" data-i="${i}"${tem ? ' style="box-shadow:inset 4px 0 0 #f59e0b"' : ''}>
          <div class="item-top"><div class="item-name">${esc(it.n)}${tem ? ' <span class="pill warn" style="margin-left:4px;white-space:nowrap">Belum diperbaiki</span>' : ''}${it.q ? '<small>' + esc(it.q) + '</small>' : ''}</div>${right}</div>
          ${tem ? '<div class="item-open" style="margin-top:8px;padding:7px 10px;border-radius:10px;background:#fffbeb;color:#92400e;font-size:12px;font-weight:600">⚠ Masih tercatat rusak sejak ' + esc(fmtTgl(tem.tanggal)) + ' (' + hariLalu(tem.tanggal) + '), belum diperbaiki.</div>' : ''}
          <div class="item-extra hidden">
            <input class="in ket" placeholder="Jelaskan kerusakan / kekurangan…">
            <div class="photo-row"><label class="photo-btn">${ICON.cam} Foto temuan<input type="file" accept="image/*" capture="environment"></label><div class="pv hidden"></div></div>
          </div></div>`;
      }).join('');
      const allBtn = sec.items.some((x) => x.k !== 'val') ? `<button type="button" class="link sec-all" data-s="${start}-${idx - 1}">Semua baik</button>` : '';
      return `<div class="sec"><div class="sec-h"><b>${esc(sec.title)}</b>${allBtn}</div>${rows}</div>`;
    }).join('');

    const panelTem = openTem.length ? `<div class="card" style="border-color:#fcd34d;background:#fffbeb">
        <b>Belum diperbaiki di kendaraan ini (${openTem.length})</b>
        <div class="muted small" style="margin:2px 0 8px">Jika item di bawah masih rusak, cukup tandai Rusak lagi. Laporan tidak akan dobel.</div>
        ${openTem.map((t) => `<div style="padding:8px 0;border-top:1px solid #fde68a"><b>${esc(t.item)}</b>
          <div class="small" style="color:#b45309">Rusak sejak ${esc(fmtTgl(t.tanggal))} (${hariLalu(t.tanggal)})${Number(t.jumlahDicek) ? ' · dicek ulang ' + esc(t.jumlahDicek) + '×' : ''}</div>
          ${t.keterangan ? '<div class="muted small">' + esc(t.keterangan) + ' · ' + esc(t.dilaporkanOleh) + '</div>' : ''}</div>`).join('')}
      </div>` : '';
    const opts = pjUsers().map((u) => `<option value="${esc(u.nama)}">${esc(u.nama)}${u.jabatan ? ' — ' + esc(u.jabatan) : ''}</option>`).join('');
    $('#main').innerHTML = `
      <div class="page-title"><div><button class="link" id="back">← Ganti kendaraan</button><h2>${esc(v.kode)} · ${esc(v.nama)}</h2>${kapOf(v) ? '<div class="muted small">Kapasitas tangki ' + esc(kapOf(v)) + '</div>' : ''}</div></div>
      <div class="card">
        <div class="row2">
          <div><label class="f" style="margin-top:0">Pelaksana</label><input class="in" value="${esc(S.user.nama)}" disabled></div>
          <div><label class="f" style="margin-top:0">Penanggung jawab</label><select class="in" id="pj"><option value="">Pilih…</option>${opts}</select></div>
        </div>
      </div>
      ${panelTem}
      <div class="progress"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700"><span id="pt">0 / ${items.length} terisi</span>${openTem.length ? '<button type="button" class="link" id="goopen" style="color:#b45309;font-weight:700;font-size:13px">⚠ ' + openTem.length + ' belum diperbaiki</button>' : ''}<span id="pb" class="muted">0 temuan</span></div><div class="bar"><i id="pbar"></i></div></div>
      <div id="secs">${secHtml}</div>
      <div class="card" style="margin-top:16px">
        <label class="f" style="margin-top:0">Lama pemanasan kendaraan & peralatan (menit)</label>
        <input class="in" id="pem" inputmode="numeric" placeholder="mis. 15">
        <label class="f">Catatan</label>
        <textarea class="in" id="cat" placeholder="Opsional"></textarea>
      </div>
      <div class="submit-bar"><button class="btn block" id="send">Kirim checklist</button></div>`;

    const secs = $('#secs');
    function refresh() {
      const done = items.filter((x) => (x.k === 'val' ? x.nilai.trim() !== '' : x.hasil !== '')).length;
      const bad = items.filter((x) => x.hasil === 'Rusak' || x.hasil === 'Kurang').length;
      $('#pt').textContent = done + ' / ' + items.length + ' terisi';
      $('#pb').textContent = bad + ' temuan';
      $('#pb').style.color = bad ? 'var(--bad)' : '';
      $('#pbar').style.width = Math.round(done / items.length * 100) + '%';
    }
    function paint(i) {
      const it = items[i];
      const el = $('.item[data-i="' + i + '"]', secs);
      const bad = it.hasil === 'Rusak' || it.hasil === 'Kurang';
      el.classList.toggle('bad', bad);
      el.classList.toggle('done', it.k === 'val' ? it.nilai.trim() !== '' : it.hasil !== '');
      $$('.seg button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === it.hasil));
      $('.item-extra', el).classList.toggle('hidden', !bad);
      const note = $('.item-open', el);
      if (note && it.tem) {
        const sejak = 'sejak ' + esc(fmtTgl(it.tem.tanggal)) + ' (' + hariLalu(it.tem.tanggal) + ')';
        note.innerHTML = bad ? '✓ Dicatat masih rusak ' + sejak + '. Tidak dibuat laporan baru.'
          : it.perbaikan ? '✓ Ditandai sudah diperbaiki: ' + esc(it.perbaikan.catatan) + '. Temuan ditutup setelah admin menyetujui.'
          : '⚠ Masih tercatat rusak ' + sejak + ', belum diperbaiki.';
      }
    }
    // Ditandai baik padahal masih ada temuan terbuka: tanya apakah benar sudah diperbaiki
    function tanyaPerbaikan(i) {
      const it = items[i]; const t = it.tem; let foto = '';
      modal(`<div class="modal-h"><h3>Yakin sudah diperbaiki?</h3><button class="x" data-close>×</button></div>
        <div style="margin-top:4px"><b>${esc(it.n)}</b> masih tercatat <b>belum diperbaiki</b> sejak ${esc(fmtTgl(t.tanggal))} (${hariLalu(t.tanggal)}). Yakin statusnya sudah diperbaiki?</div>
        ${t.keterangan ? '<div class="muted small" style="margin-top:6px">Kerusakan yang dilaporkan: ' + esc(t.keterangan) + '</div>' : ''}
        <label class="f">Apa yang diperbaiki / diganti? (wajib)</label>
        <textarea class="in" id="pf-c" placeholder="Mis. selang diganti baru"></textarea>
        <label class="f">Foto setelah diperbaiki (opsional)</label>
        <div class="photo-row"><label class="photo-btn">${ICON.cam} Ambil foto<input type="file" accept="image/*" capture="environment" id="pf-f"></label><div class="pv hidden" id="pf-p"></div></div>
        <button class="btn ok block" style="margin-top:18px" id="pf-y">Yakin, sudah diperbaiki</button>
        <button class="btn ghost block" style="margin-top:10px" id="pf-n">Belum, masih rusak</button>
        <div class="muted small" style="margin-top:10px">Temuan baru ditutup setelah admin menyetujui checklist ini.</div>`, (m, close) => {
        $('#pf-f', m).onchange = async (e) => {
          if (!e.target.files[0]) return;
          try {
            loading(true, 'Memproses foto…');
            foto = await compress(e.target.files[0]);
            const pv = $('#pf-p', m); pv.innerHTML = '<img src="' + foto + '" alt="foto">'; pv.classList.remove('hidden');
          } catch (err) { toast('Foto gagal diproses', true); } finally { loading(false); }
        };
        $('#pf-y', m).onclick = () => {
          const c = $('#pf-c', m).value.trim();
          if (!c) { toast('Tulis apa yang diperbaiki', true); return; }
          items[i].hasil = GOOD[items[i].k]; items[i].perbaikan = { catatan: c, foto: foto };
          close(); paint(i); refresh();
        };
        $('#pf-n', m).onclick = () => {
          close();
          items[i].hasil = BAD[items[i].k]; items[i].perbaikan = null;
          if (!items[i].ket.trim()) {
            items[i].ket = t.keterangan || '';
            $('.ket', $('.item[data-i="' + i + '"]', secs)).value = items[i].ket;
          }
          paint(i); refresh();
        };
      });
    }
    secs.addEventListener('click', (e) => {
      const sb = e.target.closest('.seg button');
      if (sb) {
        const i = +sb.closest('.item').dataset.i;
        const baik = sb.dataset.v === 'Baik' || sb.dataset.v === 'Penuh';
        if (baik && items[i].tem && !items[i].perbaikan) { tanyaPerbaikan(i); return; }
        if (!baik) items[i].perbaikan = null;
        items[i].hasil = sb.dataset.v;
        if ((sb.dataset.v === 'Rusak' || sb.dataset.v === 'Kurang') && items[i].tem && !items[i].ket.trim()) {
          items[i].ket = items[i].tem.keterangan || '';
          $('.ket', sb.closest('.item')).value = items[i].ket;
        }
        paint(i); refresh();
        return;
      }
      const all = e.target.closest('.sec-all');
      if (all) {
        const r = all.dataset.s.split('-').map(Number);
        for (let i = r[0]; i <= r[1]; i++) if (items[i].k !== 'val' && !items[i].tem) { items[i].hasil = GOOD[items[i].k]; paint(i); }
        refresh();
        return;
      }
      const x = e.target.closest('.pv button');
      if (x) {
        const el = x.closest('.item'); const i = +el.dataset.i;
        items[i].foto = ''; const pv = $('.pv', el); pv.classList.add('hidden'); pv.innerHTML = '';
      }
    });
    secs.addEventListener('input', (e) => {
      const el = e.target.closest('.item'); if (!el) return;
      const i = +el.dataset.i;
      if (e.target.classList.contains('val')) { items[i].nilai = e.target.value; paint(i); refresh(); }
      else if (e.target.classList.contains('ket')) items[i].ket = e.target.value;
    });
    secs.addEventListener('change', async (e) => {
      if (e.target.type !== 'file' || !e.target.files[0]) return;
      const el = e.target.closest('.item'); const i = +el.dataset.i;
      try {
        loading(true, 'Memproses foto…');
        items[i].foto = await compress(e.target.files[0]);
        const pv = $('.pv', el);
        pv.innerHTML = '<img src="' + items[i].foto + '" data-zoom="' + items[i].foto + '" alt="foto"><button type="button">×</button>';
        pv.classList.remove('hidden');
      } catch (err) { toast('Foto gagal diproses', true); }
      finally { loading(false); e.target.value = ''; }
    });
    $('#back').onclick = () => go('isi');
    const goOpen = $('#goopen');
    if (goOpen) goOpen.onclick = () => { const n = $('.item-open', secs); if (n) n.closest('.item').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    $('#send').onclick = async () => {
      const pj = $('#pj').value;
      if (!pj) { toast('Pilih penanggung jawab dulu', true); $('#pj').focus(); return; }
      const first = items.findIndex((x) => (x.k === 'val' ? x.nilai.trim() === '' : x.hasil === ''));
      if (first >= 0) {
        const el = $('.item[data-i="' + first + '"]', secs);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '2px solid var(--brand)'; setTimeout(() => { el.style.outline = ''; }, 1800);
        toast('Masih ada item yang belum diisi', true); return;
      }
      const over = items.findIndex((x) => x.k === 'val' && x.max && (isNaN(Number(String(x.nilai).replace(',', '.'))) || Number(String(x.nilai).replace(',', '.')) > x.max || Number(String(x.nilai).replace(',', '.')) < 0));
      if (over >= 0) {
        const el = $('.item[data-i="' + over + '"]', secs);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('.val', el).focus();
        toast('Nilai ' + items[over].n + ' harus berupa angka 0 sampai ' + items[over].max + ' ' + items[over].u + ' (tulis tanpa titik)', true); return;
      }
      const noKet = items.findIndex((x) => (x.hasil === 'Rusak' || x.hasil === 'Kurang') && !x.ket.trim());
      if (noKet >= 0) {
        const el = $('.item[data-i="' + noKet + '"]', secs);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('.ket', el).focus();
        toast('Isi keterangan untuk item yang rusak/kurang', true); return;
      }
      const btn = $('#send'); btn.disabled = true;
      try {
        loading(true, 'Mengirim data & foto…');
        const res = await api('submit', {
          kode: kode, nama: v.nama, penanggungJawab: pj, pemanasan: $('#pem').value.trim(), catatan: $('#cat').value.trim(),
          items: items.map((x) => ({ s: x.s, n: x.n, q: x.q, k: x.k, hasil: x.hasil, nilai: x.nilai, ket: x.ket, foto: x.foto, perbaikan: x.perbaikan || null }))
        }, { silent: true });
        const tmp = res.jumlahTemuan ? res.jumlahTemuan + ' temuan dicatat. ' : '';
        toast(res.status === 'Menunggu' ? 'Terkirim. ' + tmp + 'Menunggu persetujuan admin.' : (res.jumlahTemuan ? 'Tersimpan. ' + tmp : 'Checklist tersimpan. Semua aman ✅'));
        S.form = null;
        go('beranda');
      } catch (err) { toast(err.message, true); }
      finally { loading(false); btn.disabled = false; }
    };
    window.scrollTo(0, 0);
  }

  /* ---------- TEMUAN ---------- */
  function temCard(t) {
    const open = t.status === 'Open';
    // Riwayat: tiap pengecekan yang menemukan item ini masih rusak (terbaru di atas), ditutup laporan awal
    const tglPendek = (x) => { const q = String(x).split('-'); return new Date(+q[0], +q[1] - 1, +q[2]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); };
    let rw = [];
    try { rw = JSON.parse(t.riwayat || '[]'); } catch (e) { rw = []; }
    rw.sort((a, b) => (b.t + ' ' + b.j).localeCompare(a.t + ' ' + a.j));
    const thumb = (u) => u ? `<img src="${esc(u)}" data-zoom="${esc(u)}" alt="foto" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin-top:6px;display:block">` : '';
    const rwRow = (tgl, jam, oleh, ket, foto, label) => `<div style="padding:8px 0;border-top:1px solid #eee">
        <div class="small"><b>${esc(fmtTgl(tgl))} ${esc(jam)}</b> · ${esc(oleh || '-')} <span class="muted">· ${label}</span></div>
        ${ket ? '<div style="margin-top:2px">' + esc(ket) + '</div>' : ''}${thumb(foto)}</div>`;
    const riwayatHtml = (open || rw.length) ? `<details class="tem-rw" style="margin:8px 0">
        <summary style="cursor:pointer;font-weight:700;font-size:13px">Riwayat (${rw.length + 1} catatan)</summary>
        ${rw.map((e) => rwRow(e.t, e.j, e.o, e.k, e.f, 'masih rusak')).join('')}
        ${rwRow(t.tanggal, t.jam, t.dilaporkanOleh, t.keterangan, t.fotoUrl, 'laporan awal')}
      </details>` : '';
    return `<div class="card tem" data-id="${esc(t.id)}">
      <div class="tem-img">${t.fotoUrl ? `<img loading="lazy" src="${esc(t.fotoUrl)}" data-zoom="${esc(t.fotoUrl)}" alt="foto temuan">` : 'Tanpa foto'}</div>
      <div class="tem-body">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b>${esc(t.item)}</b><span class="pill ${open ? 'bad' : 'ok'}">${open ? 'Belum' : 'Selesai'}</span></div>
        <div class="muted small">${esc(t.kodeKendaraan)} · ${esc(t.namaKendaraan)}<br>${esc(fmtTgl(t.tanggal))} ${esc(t.jam)} · ${esc(t.dilaporkanOleh)}</div>
        ${open ? `<div class="small" style="color:#b45309"><b>Dilaporkan sejak ${esc(fmtTgl(t.tanggal))}</b> (${hariLalu(t.tanggal)})</div>` : ''}
        ${open && rw.length ? `<div class="small" style="color:#b45309">Dicek lagi, masih rusak: ${rw.slice(0, 5).reverse().map((e) => esc(tglPendek(e.t)) + ' ' + esc(e.j)).join(' · ')}${rw.length > 5 ? ' · …' : ''}</div>` : ''}
        ${riwayatHtml}
        ${t.keterangan ? `<p>${esc(t.keterangan)}</p>` : ''}
        ${open ? `<button class="btn ok sm" data-fix="${esc(t.id)}">Tandai selesai</button>`
          : `<div class="fixbox">${t.fotoPerbaikanUrl ? `<img src="${esc(t.fotoPerbaikanUrl)}" data-zoom="${esc(t.fotoPerbaikanUrl)}" alt="foto perbaikan">` : ''}<div><b>Diperbaiki</b> ${esc(fmtTgl(t.tglSelesai))} ${esc(t.jamSelesai)}<br>oleh ${esc(t.diperbaikiOleh)}${t.catatanPerbaikan ? '<br>' + esc(t.catatanPerbaikan) : ''}</div></div>`}
      </div></div>`;
  }

  function bindTemActions() {
    $$('[data-fix]').forEach((b) => { b.onclick = () => fixModal(b.dataset.fix); });
  }

  async function viewTemuan() {
    const list = await api('listTemuan', { status: S.temFilter }, { silent: true });
    if (S.temFilter === 'Open') setBadge(list.length);
    const F = [['Open', 'Belum diperbaiki'], ['Fixed', 'Sudah selesai'], ['All', 'Semua']];
    $('#main').innerHTML = `
      <div class="page-title"><h2>Temuan kerusakan</h2></div>
      <div class="chips">${F.map((f) => `<button data-f="${f[0]}" class="${S.temFilter === f[0] ? 'on' : ''}">${f[1]}</button>`).join('')}</div>
      <div class="list">${list.length ? list.map(temCard).join('') : '<div class="card empty">Tidak ada data.</div>'}</div>`;
    $$('.chips button').forEach((b) => { b.onclick = () => { S.temFilter = b.dataset.f; go('temuan'); }; });
    bindTemActions();
  }

  function fixModal(id) {
    let foto = '';
    modal(`<div class="modal-h"><h3>Tandai sudah diperbaiki</h3><button class="x" data-close>×</button></div>
      <label class="f">Catatan perbaikan</label>
      <textarea class="in" id="fc" placeholder="Apa yang diperbaiki / diganti?"></textarea>
      <label class="f">Foto setelah diperbaiki (opsional)</label>
      <div class="photo-row"><label class="photo-btn">${ICON.cam} Ambil foto<input type="file" accept="image/*" capture="environment" id="ff"></label><div class="pv hidden" id="fp"></div></div>
      <button class="btn ok block" style="margin-top:18px" id="fs">Simpan</button>`, (m, close) => {
      $('#ff', m).onchange = async (e) => {
        if (!e.target.files[0]) return;
        try {
          loading(true, 'Memproses foto…');
          foto = await compress(e.target.files[0]);
          const pv = $('#fp', m); pv.innerHTML = '<img src="' + foto + '" alt="foto">'; pv.classList.remove('hidden');
        } catch (err) { toast('Foto gagal diproses', true); } finally { loading(false); }
      };
      $('#fs', m).onclick = async () => {
        try {
          loading(true, 'Menyimpan…');
          await api('fixTemuan', { id: id, catatan: $('#fc', m).value.trim(), foto: foto }, { silent: true });
          close(); toast('Temuan ditandai selesai ✅'); go(S.view);
        } catch (err) { toast(err.message, true); } finally { loading(false); }
      };
    });
  }

  /* ---------- RIWAYAT ---------- */
  function buildRiwayat(list, f) {
    const byDate = {};
    list.forEach((r) => { (byDate[r.tanggal] = byDate[r.tanggal] || []).push(r); });
    const hariIni = ymd(new Date());
    const e0 = (f.sampai || hariIni).split('-'), s0 = (f.dari || hariIni).split('-');
    const cur = new Date(+e0[0], +e0[1] - 1, +e0[2]);
    const start = new Date(+s0[0], +s0[1] - 1, +s0[2]);
    let out = '';
    let guard = 0;
    while (cur >= start && guard++ < 120) {
      const d = ymd(cur);
      if (byDate[d]) {
        out += byDate[d].map((r) => `
          <div class="card hrow" data-id="${esc(r.id)}"><div class="vk">${esc(r.kodeKendaraan)}</div>
            <div class="hi"><b>${esc(r.namaKendaraan)}</b><span class="muted small">${esc(fmtTgl(r.tanggal))} ${esc(r.jam)} · ${esc(r.namaPelaksana)}</span><br><span class="muted small">PJ: ${esc(r.penanggungJawab)}</span>${r.tglDiedit ? ' <span class="pill gray" style="margin-left:4px">Diedit</span>' : ''}</div>
            ${(r.status || 'Disetujui') === 'Disetujui' ? `<span class="pill ${Number(r.jumlahTemuan) ? 'warn' : 'ok'}">${Number(r.jumlahTemuan) ? r.jumlahTemuan + ' temuan' : 'Aman'}</span>` : `<span class="pill ${r.status === 'Ditolak' ? 'bad' : 'gray'}">${esc(r.status)}</span>`}</div>`).join('');
      } else if (!f.kode && d < hariIni) {
        const t = dayType(d);
        out += t.libur
          ? `<div class="card hrow mk"><div class="vk">L</div><div class="hi"><b>${esc(fmtTgl(d))} · Libur</b><span class="muted small">${esc(t.alasan)}</span></div><span class="pill gray">Libur</span></div>`
          : `<div class="card hrow mk"><div class="vk">!</div><div class="hi"><b>${esc(fmtTgl(d))}</b><span class="muted small">Belum ada pengecekan yang disetujui</span></div><span class="pill bad">Kosong</span></div>`;
      }
      cur.setDate(cur.getDate() - 1);
    }
    return out ? '<div class="list">' + out + '</div>' : '<div class="card empty">Tidak ada data pada rentang ini.</div>';
  }

  async function viewRiwayat() {
    if (!S.libur.length) { try { S.libur = await api('listLibur', {}, { silent: true }); } catch (e) { /* abaikan */ } }
    const today = new Date();
    const f = S.rf || (S.rf = { kode: '', dari: ymd(new Date(today.getTime() - 29 * 86400000)), sampai: ymd(today) });
    f.status = f.status || 'Disetujui';
    $('#main').innerHTML = `
      <div class="page-title"><h2>Riwayat pengecekan</h2></div>
      <div class="filters">
        <select class="in" id="rk"><option value="">Semua kendaraan</option>${VEHICLES.map((v) => `<option value="${v.kode}" ${f.kode === v.kode ? 'selected' : ''}>${v.kode} · ${esc(v.nama)}</option>`).join('')}</select>
        <input class="in" type="date" id="rd" value="${f.dari}"><input class="in" type="date" id="rs" value="${f.sampai}">
      </div>
      ${S.user.role === 'admin' ? `<select class="in" id="rst" style="margin-bottom:12px">${['Disetujui', 'Menunggu', 'Ditolak', 'Semua'].map((x) => `<option value="${x}" ${f.status === x ? 'selected' : ''}>Status: ${x}</option>`).join('')}</select>` : ''}
      <div class="chips"><button type="button" data-q="0">Hari ini</button><button type="button" data-q="1">Kemarin</button></div>
      <button class="btn block" id="rzip" style="margin-bottom:12px" disabled>Unduh semua PDF</button>
      <div id="rl"><div class="skel"></div></div>`;
    const load = async () => {
      f.kode = $('#rk').value; f.dari = $('#rd').value; f.sampai = $('#rs').value;
      f.status = $('#rst') ? $('#rst').value : 'Disetujui';
      const rl = $('#rl'); rl.innerHTML = '<div class="skel"></div><div class="skel"></div>';
      const zb = $('#rzip'); zb.disabled = true; zb.textContent = 'Unduh semua PDF';
      try {
        const list = await api('listPemeriksaan', { kode: f.kode, dari: f.dari, sampai: f.sampai, status: f.status, limit: 150 }, { silent: true });
        const n = list.length;
        const bisaUnduh = f.status === 'Disetujui';
        zb.textContent = !bisaUnduh ? 'PDF hanya untuk checklist yang disetujui'
          : n === 0 ? 'Tidak ada pengecekan untuk diunduh'
          : n > 40 ? 'Terlalu banyak (' + n + ' pengecekan), persempit tanggal'
          : n === 1 ? 'Unduh PDF (1 pengecekan)' : 'Unduh semua PDF (' + n + ' pengecekan, ZIP)';
        zb.disabled = !bisaUnduh || n === 0 || n > 40;
        rl.innerHTML = buildRiwayat(list, f);
        $$('.hrow[data-id]', rl).forEach((c) => { c.onclick = () => detailModal(c.dataset.id); });
      } catch (err) { rl.innerHTML = '<div class="card empty">' + esc(err.message) + '</div>'; }
    };
    ['rk', 'rd', 'rs', 'rst'].forEach((id) => { const el = $('#' + id); if (el) el.onchange = load; });
    $$('[data-q]').forEach((b) => {
      b.onclick = () => { const d = ymd(new Date(Date.now() - Number(b.dataset.q) * 86400000)); $('#rd').value = d; $('#rs').value = d; load(); };
    });
    $('#rzip').onclick = () => unduhSemua(f);
    load();
  }

  /* ---------- UNDUH PDF ---------- */
  let pdfLib = null;
  function muatJsPdf() {
    if (window.jspdf) return Promise.resolve();
    if (!pdfLib) {
      pdfLib = new Promise((ok, no) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        sc.onload = ok;
        sc.onerror = () => { pdfLib = null; no(new Error('Library PDF gagal dimuat, periksa koneksi internet')); };
        document.head.appendChild(sc);
      });
    }
    return pdfLib;
  }

  function buatDokumen(d) {
    const v = vehicleOf(d.kodeKendaraan) || { kode: d.kodeKendaraan, nama: d.namaKendaraan, jenis: '' };
    // Satuan isian (psi, °C, V) tidak disimpan di data; ambil dari daftar checklist.
    const unit = {};
    (CHECKLISTS[d.kodeKendaraan] || []).forEach((sec) => sec.items.forEach((it) => { if (it.u) unit[sec.title + '|' + it.n] = it.u; }));
    const items = (d.items || []).map((x) => Object.assign({}, x, { u: x.u || unit[x.s + '|' + x.n] || '' }));
    return window.PKPPKPdf.buat(Object.assign({}, d, { items: items }), v, CFG.NAMA_UNIT);
  }

  let zipLib = null;
  function muatJsZip() {
    if (window.JSZip) return Promise.resolve();
    if (!zipLib) {
      zipLib = new Promise((ok, no) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        sc.onload = ok;
        sc.onerror = () => { zipLib = null; no(new Error('Library ZIP gagal dimuat, periksa koneksi internet')); };
        document.head.appendChild(sc);
      });
    }
    return zipLib;
  }

  function unduhBlob(blob, nama) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nama;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // Unduh semua pengecekan pada filter Riwayat (tanggal / kendaraan) sebagai satu ZIP berisi PDF per pengecekan.
  async function unduhSemua(f) {
    const btn = $('#rzip');
    if (btn) btn.disabled = true;
    const prog = (t) => { const el = $('#loading-text'); if (el) el.textContent = t; };
    try {
      loading(true, 'Menyiapkan data…');
      const list = await api('exportPemeriksaan', { kode: f.kode, dari: f.dari, sampai: f.sampai }, { silent: true });
      if (!list.length) { toast('Tidak ada pengecekan pada filter ini', true); return; }
      await muatJsPdf();
      if (list.length === 1) {
        buatDokumen(list[0]).save(window.PKPPKPdf.namaFile(list[0]));
        toast('PDF diunduh');
        return;
      }
      await muatJsZip();
      const zip = new window.JSZip();
      const perTanggal = f.dari !== f.sampai;
      for (let i = 0; i < list.length; i++) {
        prog('Membuat PDF ' + (i + 1) + ' dari ' + list.length + '…');
        await new Promise((r) => setTimeout(r, 30)); // beri waktu layar memperbarui tampilan
        const d = list[i];
        zip.file((perTanggal ? d.tanggal + '/' : '') + window.PKPPKPdf.namaFile(d), buatDokumen(d).output('arraybuffer'));
      }
      prog('Mengemas ZIP…');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      unduhBlob(blob, 'Checklist_PKPPK_' + f.dari + (f.sampai !== f.dari ? '_sd_' + f.sampai : '') + (f.kode ? '_' + f.kode : '') + '.zip');
      toast(list.length + ' PDF diunduh dalam satu ZIP');
    } catch (err) {
      toast('Gagal mengunduh: ' + err.message, true);
    } finally {
      loading(false);
      if (btn) btn.disabled = false;
    }
  }

  async function unduhPdf(d) {
    try {
      loading(true, 'Membuat PDF…');
      await muatJsPdf();
      const doc = buatDokumen(d);
      doc.save(window.PKPPKPdf.namaFile(d));
      toast('PDF diunduh');
    } catch (err) {
      toast('Gagal membuat PDF: ' + err.message, true);
    } finally {
      loading(false);
    }
  }

  async function detailModal(id) {
    let d;
    try { d = await api('getPemeriksaan', { id: id }); } catch (e) { toast(e.message, true); return; }
    const groups = {};
    d.items.forEach((x) => { (groups[x.s] = groups[x.s] || []).push(x); });
    modal(`<div class="modal-h"><h3>${esc(d.kodeKendaraan)} · ${esc(d.namaKendaraan)}</h3><button class="x" data-close>×</button></div>
      <div class="muted small">${esc(fmtTgl(d.tanggal))} ${esc(d.jam)}<br>Pelaksana: <b>${esc(d.namaPelaksana)}</b> · Penanggung jawab: <b>${esc(d.penanggungJawab)}</b>${d.pemanasanMenit ? '<br>Pemanasan: ' + esc(d.pemanasanMenit) + ' menit' : ''}${d.catatan ? '<br>Catatan: ' + esc(d.catatan) : ''}</div>
      ${d.tglDiedit ? '<div style="margin-top:8px"><span class="pill gray">Diedit</span> <span class="muted small">oleh ' + esc(d.diEditOleh || '-') + ' · ' + esc(d.tglDiedit) + '</span></div>' : ''}
      ${Number(d.klaimPerbaikan) ? '<div style="margin-top:8px"><span class="pill ok">' + esc(d.klaimPerbaikan) + ' klaim perbaikan</span> <span class="muted small">temuan terkait ditutup saat disetujui</span></div>' : ''}
      ${(d.status || 'Disetujui') === 'Disetujui' ? '<button class="btn sm" id="dpdf" style="margin-top:12px">Unduh PDF</button>' : ''}
      ${d.status === 'Menunggu' ? '<div style="margin-top:12px"><span class="pill gray">Menunggu persetujuan admin</span></div>' : ''}
      ${d.status === 'Ditolak' ? `<div class="card libur-banner tolak" style="margin-top:12px"><b>Ditolak oleh ${esc(d.disetujuiOleh || '-')}</b><span>${esc(d.alasanTolak || '')}</span></div>` : ''}
      ${S.user.role === 'admin' && d.status === 'Menunggu' ? '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn ok sm" id="dsetuju">Setujui</button><button class="btn ghost sm" id="dtolak">Tolak</button></div>' : ''}
      ${S.user.role === 'admin' ? '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost sm" id="dedit">Edit data</button><button class="btn ghost sm" id="ddel" style="color:var(--bad)">Hapus</button></div>' : ''}
      ${Object.keys(groups).map((g) => `<div class="dgroup">${esc(g)}</div>${groups[g].map((x) => {
        const bad = x.hasil === 'Rusak' || x.hasil === 'Kurang';
        return `<div class="drow ${bad ? 'bad' : ''}"><div>${esc(x.n)}${x.q ? ' <span class="muted small">(' + esc(x.q) + ')</span>' : ''}${bad && x.ket ? '<br><span class="small">' + esc(x.ket) + '</span>' : ''}${x.perbaikan ? '<br><span class="small" style="color:#15803d">✓ Klaim sudah diperbaiki: ' + esc(x.perbaikan) + '</span>' : ''}${x.selisih ? '<br><span class="small" style="color:#b45309">⚠ Ditandai baik, tetapi temuan lama belum ditutup</span>' : ''}</div>
          <div style="display:flex;gap:8px;align-items:center">${(x.fotoUrl || x.perbaikanFotoUrl) ? `<img src="${esc(x.fotoUrl || x.perbaikanFotoUrl)}" data-zoom="${esc(x.fotoUrl || x.perbaikanFotoUrl)}" alt="foto">` : ''}<span>${esc(x.k === 'val' ? x.nilai : x.hasil)}</span></div></div>`;
      }).join('')}`).join('')}`, (m, close) => {
      const bp = $('#dpdf', m); if (bp) bp.onclick = () => unduhPdf(d);
      const bs = $('#dsetuju', m); if (bs) bs.onclick = async () => { if (await setujui(d.id)) { close(); go(S.view); } };
      const bt = $('#dtolak', m); if (bt) bt.onclick = () => tolakModal(d.id, () => { close(); go(S.view); });
      const be = $('#dedit', m); if (be) be.onclick = () => editModal(d, () => { close(); go(S.view); });
      const bd = $('#ddel', m); if (bd) bd.onclick = async () => {
        if (!confirm('Hapus pengecekan ' + d.kodeKendaraan + ' (' + fmtTgl(d.tanggal) + ' ' + d.jam + ')?\nTemuan terkait dan fotonya ikut terhapus. Tidak bisa dibatalkan.')) return;
        try {
          loading(true, 'Menghapus…');
          await api('deletePemeriksaan', { id: d.id }, { silent: true });
          close(); toast('Pengecekan dihapus'); go(S.view);
        } catch (e) { toast(e.message, true); } finally { loading(false); }
      };
    });
  }

  async function editModal(d, selesai) {
    if (!S.users.length) {
      try { S.users = await api('users', {}, { silent: true }); } catch (e) { S.users = []; }
    }
    const names = pjUsers().map((u) => u.nama);
    if (d.penanggungJawab && names.indexOf(d.penanggungJawab) < 0) names.unshift(d.penanggungJawab);
    const items = (d.items || []).map((x) => ({ s: x.s, n: x.n, q: x.q || '', k: x.k, hasil: x.hasil || '', nilai: x.nilai || '', ket: x.ket || '', fotoUrl: x.fotoUrl || '', foto: '' }));
    let last = null, rows = '';
    items.forEach((it, i) => {
      if (it.s !== last) { rows += `<div class="dgroup">${esc(it.s)}</div>`; last = it.s; }
      const right = it.k === 'val'
        ? `<div class="valbox"><input class="in val" inputmode="decimal" value="${esc(it.nilai)}"></div>`
        : `<div class="seg"><button type="button" class="g" data-v="${GOOD[it.k]}">${GOOD[it.k]}</button><button type="button" class="r" data-v="${BAD[it.k]}">${BAD[it.k]}</button></div>`;
      rows += `<div class="item" data-i="${i}">
        <div class="item-top"><div class="item-name">${esc(it.n)}${it.q ? '<small>' + esc(it.q) + '</small>' : ''}</div>${right}</div>
        <div class="item-extra hidden">
          <input class="in ket" value="${esc(it.ket)}" placeholder="Jelaskan kerusakan / kekurangan…">
          <div class="photo-row"><label class="photo-btn">${ICON.cam} ${it.fotoUrl ? 'Ganti foto' : 'Foto temuan'}<input type="file" accept="image/*" capture="environment"></label>
            <div class="pv ${it.fotoUrl ? '' : 'hidden'}">${it.fotoUrl ? '<img src="' + esc(it.fotoUrl) + '" data-zoom="' + esc(it.fotoUrl) + '" alt="foto">' : ''}</div></div>
        </div></div>`;
    });
    modal(`<div class="modal-h"><h3>Edit pengecekan</h3><button class="x" data-close>×</button></div>
      <div class="muted small">${esc(d.kodeKendaraan)} · ${esc(fmtTgl(d.tanggal))} ${esc(d.jam)} · pelaksana ${esc(d.namaPelaksana)}.<br>Setelah disimpan, data ditandai <b>Diedit</b>.</div>
      <label class="f">Penanggung jawab</label>
      <select class="in" id="ep">${names.map((n) => `<option value="${esc(n)}" ${n === d.penanggungJawab ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <label class="f">Lama pemanasan (menit)</label>
      <input class="in" id="em" inputmode="numeric" value="${esc(d.pemanasanMenit || '')}">
      <label class="f">Catatan</label>
      <textarea class="in" id="ec">${esc(d.catatan || '')}</textarea>
      <div id="eitems">${rows}</div>
      <button class="btn block" style="margin-top:18px" id="es">Simpan perubahan</button>`, (m, close) => {
      const box = $('#eitems', m);
      const paint = (i) => {
        const it = items[i];
        const el = $('.item[data-i="' + i + '"]', box);
        const bad = it.hasil === 'Rusak' || it.hasil === 'Kurang';
        el.classList.toggle('bad', bad);
        el.classList.toggle('done', it.k === 'val' ? it.nilai.trim() !== '' : it.hasil !== '');
        $$('.seg button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === it.hasil));
        $('.item-extra', el).classList.toggle('hidden', !bad);
      };
      items.forEach((_, i) => paint(i));
      box.addEventListener('click', (e) => {
        const sb = e.target.closest('.seg button');
        if (!sb) return;
        const i = +sb.closest('.item').dataset.i;
        items[i].hasil = sb.dataset.v;
        paint(i);
      });
      box.addEventListener('input', (e) => {
        const el = e.target.closest('.item'); if (!el) return;
        const i = +el.dataset.i;
        if (e.target.classList.contains('val')) { items[i].nilai = e.target.value; paint(i); }
        else if (e.target.classList.contains('ket')) items[i].ket = e.target.value;
      });
      box.addEventListener('change', async (e) => {
        if (e.target.type !== 'file' || !e.target.files[0]) return;
        const el = e.target.closest('.item'); const i = +el.dataset.i;
        try {
          loading(true, 'Memproses foto…');
          items[i].foto = await compress(e.target.files[0]);
          const pv = $('.pv', el);
          pv.innerHTML = '<img src="' + items[i].foto + '" data-zoom="' + items[i].foto + '" alt="foto">';
          pv.classList.remove('hidden');
        } catch (err) { toast('Foto gagal diproses', true); }
        finally { loading(false); e.target.value = ''; }
      });
      $('#es', m).onclick = async () => {
        const first = items.findIndex((x) => (x.k === 'val' ? x.nilai.trim() === '' : x.hasil === ''));
        if (first >= 0) {
          const el = $('.item[data-i="' + first + '"]', box);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast('Masih ada item yang kosong', true); return;
        }
        const noKet = items.findIndex((x) => (x.hasil === 'Rusak' || x.hasil === 'Kurang') && !x.ket.trim());
        if (noKet >= 0) {
          const el = $('.item[data-i="' + noKet + '"]', box);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          $('.ket', el).focus();
          toast('Isi keterangan untuk item yang rusak/kurang', true); return;
        }
        try {
          loading(true, 'Menyimpan…');
          await api('editPemeriksaan', {
            id: d.id, penanggungJawab: $('#ep', m).value, pemanasan: $('#em', m).value.trim(), catatan: $('#ec', m).value.trim(),
            items: items.map((x) => ({ s: x.s, n: x.n, hasil: x.hasil, nilai: x.nilai, ket: x.ket, foto: x.foto }))
          }, { silent: true });
          close(); toast('Data diperbarui dan ditandai Diedit'); selesai();
        } catch (e) { toast(e.message, true); } finally { loading(false); }
      };
    });
  }

  /* ---------- STATUS PERSETUJUAN SAYA (petugas) ---------- */
  async function viewStatus() {
    const f = S.stFilter || 'Semua';
    const semua = (S.stScope || 'semua') === 'semua';
    const mine = (r) => r.pelaksana === S.user.username;
    const list = await api('listSaya', { status: f, semua: semua }, { silent: true });
    // badge di tab: jumlah checklist milik sendiri yang ditolak (perlu diisi ulang)
    const own = f === 'Semua' ? list.filter(mine) : await api('listSaya', { status: 'Semua' }, { silent: true });
    const nTolak = own.filter((r) => r.status === 'Ditolak').length;
    const nb = $('#nb3'); if (nb) { nb.textContent = nTolak; nb.classList.toggle('hidden', !nTolak); }
    // urut: Menunggu dulu, lalu Ditolak, lalu Disetujui; di dalamnya yang terbaru di atas
    const rank = (r) => (r.status === 'Menunggu' ? 0 : r.status === 'Ditolak' ? 1 : 2);
    list.sort((a, b) => rank(a) - rank(b) || (b.tanggal + b.jam).localeCompare(a.tanggal + a.jam));
    const F = ['Semua', 'Menunggu', 'Ditolak', 'Disetujui'];
    const stCls = (s) => (s === 'Disetujui' ? 'ok' : s === 'Ditolak' ? 'bad' : 'gray');
    $('#main').innerHTML = `
      <div class="page-title"><h2>Status persetujuan</h2></div>
      <p class="muted small" style="margin:0 0 12px">${semua ? 'Status checklist semua pegawai' : 'Checklist milikmu'} dalam 30 hari terakhir. Isi lengkap hanya bisa dibuka untuk checklist milikmu.</p>
      <div class="chips">${[['semua', 'Semua pegawai'], ['saya', 'Punya saya']].map((x) => `<button data-sc="${x[0]}" class="${(semua ? 'semua' : 'saya') === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>
      <div class="chips">${F.map((x) => `<button data-sf="${x}" class="${f === x ? 'on' : ''}">${x}</button>`).join('')}</div>
      <div class="list">${list.length ? list.map((r) => {
        const s = r.status || 'Disetujui';
        const sendiri = mine(r);
        return `<div class="card hrow"${sendiri ? ' data-id="' + esc(r.id) + '"' : ' style="cursor:default"'}><div class="vk">${esc(r.kodeKendaraan)}</div>
          <div class="hi"><b>${esc(r.namaKendaraan)}</b><span class="muted small">${esc(fmtTgl(r.tanggal))} ${esc(r.jam)} · ${sendiri ? '<b>Kamu</b>' : esc(r.namaPelaksana)}</span><br><span class="muted small">PJ: ${esc(r.penanggungJawab)}</span>
            ${s === 'Ditolak' && r.alasanTolak ? `<div class="small" style="color:var(--bad);margin-top:4px">${esc(r.alasanTolak)}</div>` : ''}
            ${s === 'Disetujui' && r.disetujuiOleh ? `<div class="muted small">Disetujui oleh ${esc(r.disetujuiOleh)}</div>` : ''}
            ${r.tglDiedit ? '<div><span class="pill gray">Diedit</span></div>' : ''}
            ${s === 'Ditolak' && sendiri ? `<button class="btn sm" data-isi="${esc(r.kodeKendaraan)}" style="margin-top:8px">Isi ulang</button>` : ''}
          </div>
          <span class="pill ${stCls(s)}">${esc(s)}</span></div>`;
      }).join('') : '<div class="card empty">Tidak ada data.</div>'}</div>`;
    $$('[data-sc]').forEach((b) => { b.onclick = () => { S.stScope = b.dataset.sc; go('status'); }; });
    $$('[data-sf]').forEach((b) => { b.onclick = () => { S.stFilter = b.dataset.sf; go('status'); }; });
    $$('.hrow[data-id]').forEach((c) => { c.onclick = () => detailModal(c.dataset.id); });
    $$('[data-isi]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); go('isi', b.dataset.isi); }; });
  }

  /* ---------- PERSETUJUAN (admin) ---------- */
  async function setujui(id) {
    try {
      loading(true, 'Menyetujui…');
      await api('setStatusPemeriksaan', { id: id, status: 'Disetujui' }, { silent: true });
      toast('Disetujui, masuk riwayat ✅');
      return true;
    } catch (err) { toast(err.message, true); return false; } finally { loading(false); }
  }

  function tolakModal(id, selesai) {
    modal(`<div class="modal-h"><h3>Tolak checklist</h3><button class="x" data-close>×</button></div>
      <label class="f">Alasan penolakan (dilihat petugas)</label>
      <textarea class="in" id="ta" placeholder="Mis. foto kurang jelas, data tidak lengkap, isi ulang"></textarea>
      <button class="btn block" style="margin-top:18px" id="ts">Tolak</button>`, (m, close) => {
      $('#ts', m).onclick = async () => {
        const alasan = $('#ta', m).value.trim();
        if (!alasan) { toast('Alasan wajib diisi', true); return; }
        try {
          loading(true, 'Menyimpan…');
          await api('setStatusPemeriksaan', { id: id, status: 'Ditolak', alasan: alasan }, { silent: true });
          close(); toast('Checklist ditolak'); selesai();
        } catch (err) { toast(err.message, true); } finally { loading(false); }
      };
    });
  }

  async function viewSetuju() {
    const list = await api('listMenunggu', {}, { silent: true });
    setBadgeSetuju(list.length);
    $('#main').innerHTML = `
      <div class="page-title"><h2>Persetujuan checklist</h2></div>
      ${list.length ? `<p class="muted small" style="margin:0 0 12px">Hanya checklist yang disetujui yang masuk Riwayat dan bisa diunduh PDF-nya. Ketuk kartu untuk melihat isinya.</p>
      <div class="list">${list.map((r) => `
        <div class="card hrow" data-id="${esc(r.id)}"><div class="vk">${esc(r.kodeKendaraan)}</div>
          <div class="hi"><b>${esc(r.namaKendaraan)}</b><span class="muted small">${esc(fmtTgl(r.tanggal))} ${esc(r.jam)} · ${esc(r.namaPelaksana)}</span><br><span class="muted small">PJ: ${esc(r.penanggungJawab)}</span></div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="pill ${Number(r.jumlahTemuan) ? 'warn' : 'ok'}">${Number(r.jumlahTemuan) ? r.jumlahTemuan + ' temuan' : 'Aman'}</span>${Number(r.klaimPerbaikan) ? '<span class="pill ok">' + esc(r.klaimPerbaikan) + ' klaim perbaikan</span>' : ''}<button class="btn ok sm" data-ok="${esc(r.id)}">Setujui</button></div></div>`).join('')}</div>`
      : '<div class="card empty">Tidak ada checklist yang menunggu persetujuan. 🎉</div>'}`;
    $$('.hrow[data-id]').forEach((c) => { c.onclick = () => detailModal(c.dataset.id); });
    $$('[data-ok]').forEach((b) => {
      b.onclick = async (e) => { e.stopPropagation(); if (await setujui(b.dataset.ok)) go('setuju'); };
    });
  }

  /* ---------- KALENDER LIBUR (admin) ---------- */
  async function viewKalender() {
    S.libur = await api('listLibur', {}, { silent: true });
    if (!S.calMonth) { const n = new Date(); S.calMonth = { y: n.getFullYear(), m: n.getMonth() }; }
    renderKal();
  }

  function renderKal() {
    const y = S.calMonth.y, m = S.calMonth.m;
    const startW = (new Date(y, m, 1).getDay() + 6) % 7;
    const dim = new Date(y, m + 1, 0).getDate();
    const hariIni = ymd(new Date());
    const z = (n) => String(n).padStart(2, '0');
    let cells = '';
    for (let i = 0; i < startW; i++) cells += '<div class="cal-c off"></div>';
    for (let d = 1; d <= dim; d++) {
      const str = y + '-' + z(m + 1) + '-' + z(d);
      const t = dayType(str);
      const cls = 'cal-c' + (t.libur ? (t.sumber === 'kalender' ? ' libur' : ' wk') : '') + (t.khusus ? ' khusus' : '') + (str === hariIni ? ' today' : '');
      cells += `<button class="${cls}" data-d="${str}"><span>${d}</span>${t.sumber === 'kalender' ? '<i></i>' : ''}</button>`;
    }
    const prefix = y + '-' + z(m + 1);
    const ents = S.libur.filter((x) => x.tanggal.indexOf(prefix) === 0).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    $('#main').innerHTML = `
      <div class="page-title"><h2>Kalender libur</h2></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <button class="btn ghost sm" id="kp">‹</button>
          <b style="text-transform:capitalize">${esc(new Date(y, m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }))}</b>
          <button class="btn ghost sm" id="kn">›</button>
        </div>
        <div class="cal"><div class="cal-h">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((n) => '<span>' + n + '</span>').join('')}</div><div class="cal-g">${cells}</div></div>
        <div class="legend small muted"><span><i class="lg libur"></i>Libur</span><span><i class="lg wk"></i>Sabtu/Minggu (otomatis libur)</span><span><i class="lg khusus"></i>Hari kerja khusus</span></div>
        <p class="muted small" style="margin:10px 0 0">Ketuk tanggal untuk mengubah. Sabtu-Minggu otomatis libur; ketuk lalu pilih "Hari kerja" bila tetap ada pengecekan.</p>
      </div>
      <div class="section-t">Pengaturan bulan ini</div>
      <div class="list">${ents.length ? ents.map((e) => `
        <div class="card hrow" data-d="${esc(e.tanggal)}"><div class="vk">${esc(e.tanggal.slice(8))}</div>
          <div class="hi"><b>${esc(e.keterangan || (e.jenis === 'Kerja' ? 'Hari kerja khusus' : 'Libur'))}</b><span class="muted small">${esc(fmtTgl(e.tanggal))}</span></div>
          <span class="pill ${e.jenis === 'Kerja' ? 'ok' : 'bad'}">${e.jenis === 'Kerja' ? 'Hari kerja' : 'Libur'}</span></div>`).join('') : '<div class="card empty">Belum ada pengaturan khusus di bulan ini.</div>'}</div>`;
    $('#kp').onclick = () => { S.calMonth = m === 0 ? { y: y - 1, m: 11 } : { y: y, m: m - 1 }; renderKal(); };
    $('#kn').onclick = () => { S.calMonth = m === 11 ? { y: y + 1, m: 0 } : { y: y, m: m + 1 }; renderKal(); };
    $$('[data-d]').forEach((b) => { b.onclick = () => dayModal(b.dataset.d); });
  }

  function dayModal(str) {
    const t = dayType(str);
    const cur = S.libur.find((x) => x.tanggal === str);
    const val = cur ? cur.jenis : 'auto';
    modal(`<div class="modal-h"><h3>${esc(fmtHariPanjang(str))}</h3><button class="x" data-close>×</button></div>
      <div class="muted small">Saat ini: <b>${t.libur ? 'Libur' : (t.khusus ? 'Hari kerja khusus' : 'Hari kerja')}</b>${t.alasan ? ' · ' + esc(t.alasan) : ''}</div>
      <label class="f">Status</label>
      <select class="in" id="ds">
        <option value="auto" ${val === 'auto' ? 'selected' : ''}>Ikuti aturan biasa (Sabtu-Minggu libur)</option>
        <option value="Libur" ${val === 'Libur' ? 'selected' : ''}>Libur</option>
        <option value="Kerja" ${val === 'Kerja' ? 'selected' : ''}>Hari kerja (pengecekan wajib)</option>
      </select>
      <label class="f">Keterangan</label><input class="in" id="dk" value="${esc(cur ? cur.keterangan : '')}" placeholder="mis. Cuti bersama, libur daerah">
      <label class="f">Terapkan sampai tanggal (opsional, maks. 14 hari)</label><input class="in" type="date" id="dsd" min="${str}">
      <button class="btn block" style="margin-top:18px" id="dsave">Simpan</button>`, (m, close) => {
      $('#dsave', m).onclick = async () => {
        const st = $('#ds', m).value, ket = $('#dk', m).value.trim(), sd = $('#dsd', m).value;
        const days = [str];
        if (sd && sd > str) {
          const a = str.split('-'), c = new Date(+a[0], +a[1] - 1, +a[2]);
          while (days.length < 14) { c.setDate(c.getDate() + 1); const d = ymd(c); if (d > sd) break; days.push(d); }
        }
        try {
          loading(true, 'Menyimpan…');
          for (const d of days) {
            S.libur = st === 'auto'
              ? await api('deleteLibur', { tanggal: d }, { silent: true })
              : await api('setLibur', { tanggal: d, jenis: st, keterangan: ket }, { silent: true });
          }
          close(); toast('Kalender diperbarui'); renderKal();
        } catch (e) { toast(e.message, true); } finally { loading(false); }
      };
    });
  }

  /* ---------- PENGGUNA (admin) ---------- */
  async function viewUsers() {
    const list = await api('listUsers', {}, { silent: true });
    $('#main').innerHTML = `
      <div class="page-title"><h2>Kelola pengguna</h2><button class="btn sm" id="au">+ Tambah</button></div>
      <div class="list">${list.map((u) => `
        <div class="card hrow" style="cursor:default"><div class="vk">${esc(initials(u.nama))}</div>
          <div class="hi"><b>${esc(u.nama)}</b><span class="muted small">@${esc(u.username)} · ${esc(u.jabatan || '-')} · ${esc(ROLE[u.role] || 'Petugas')}</span></div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn ghost sm" data-rp="${esc(u.username)}">Reset PW</button>
            <button class="btn ghost sm" data-eu="${esc(u.username)}">Edit</button>
            ${u.username !== S.user.username ? `<button class="btn ghost sm" data-ac="${esc(u.username)}" data-to="${u.aktif ? 0 : 1}">${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
          </div></div>`).join('')}</div>`;
    $('#au').onclick = addUserModal;
    $$('[data-eu]').forEach((b) => { b.onclick = () => editUserModal(list.find((u) => u.username === b.dataset.eu)); });
    $$('[data-rp]').forEach((b) => {
      b.onclick = async () => {
        const pw = prompt('Password baru untuk ' + b.dataset.rp + ' (min. 6 karakter):');
        if (!pw) return;
        try { await api('resetPassword', { username: b.dataset.rp, password: pw }); toast('Password diperbarui'); } catch (e) { toast(e.message, true); }
      };
    });
    $$('[data-ac]').forEach((b) => {
      b.onclick = async () => {
        try { await api('setUserActive', { username: b.dataset.ac, aktif: b.dataset.to === '1' }); S.users = []; go('users'); } catch (e) { toast(e.message, true); }
      };
    });
  }

  function editUserModal(u) {
    const self = u.username === S.user.username;
    modal(`<div class="modal-h"><h3>Edit pengguna</h3><button class="x" data-close>×</button></div>
      <div class="muted small">@${esc(u.username)} (username tidak bisa diubah)</div>
      <label class="f">Nama lengkap</label><input class="in" id="en" value="${esc(u.nama)}">
      <label class="f">Jabatan</label><input class="in" id="ej" value="${esc(u.jabatan || '')}" placeholder="mis. Anggota PKP-PK">
      <label class="f">Role</label>
      <select class="in" id="er" ${self ? 'disabled' : ''}>${Object.keys(ROLE).map((k) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${ROLE[k]}</option>`).join('')}</select>
      ${self ? '<div class="muted small" style="margin-top:6px">Role akun sendiri tidak bisa diubah.</div>' : ''}
      <button class="btn block" style="margin-top:18px" id="es3">Simpan</button>`, (m, close) => {
      $('#es3', m).onclick = async () => {
        const nama = $('#en', m).value.trim(), jab = $('#ej', m).value.trim(), role = $('#er', m).value;
        if (!nama) { toast('Nama wajib diisi', true); return; }
        try {
          loading(true, 'Menyimpan…');
          await api('editUser', { username: u.username, nama: nama, jabatan: jab, role: role }, { silent: true });
          S.users = [];
          if (self) { S.user.nama = nama; S.user.jabatan = jab; saveSession(); }
          close(); toast('Pengguna diperbarui');
          if (self) renderShell(); else go('users');
        } catch (e) { toast(e.message, true); } finally { loading(false); }
      };
    });
  }

  function addUserModal() {
    modal(`<div class="modal-h"><h3>Tambah pengguna</h3><button class="x" data-close>×</button></div>
      <label class="f">Nama lengkap</label><input class="in" id="un">
      <label class="f">Jabatan</label><input class="in" id="uj" placeholder="mis. Anggota PKP-PK">
      <div class="row2"><div><label class="f">Username</label><input class="in" id="uu" autocapitalize="none"></div>
      <div><label class="f">Role</label><select class="in" id="ur"><option value="user">Petugas</option><option value="pj">Penanggung jawab</option><option value="admin">Admin</option></select></div></div>
      <label class="f">Password awal (min. 6)</label><input class="in" id="up" type="text">
      <button class="btn block" style="margin-top:18px" id="us">Simpan</button>`, (m, close) => {
      $('#us', m).onclick = async () => {
        try {
          await api('addUser', { nama: $('#un', m).value, jabatan: $('#uj', m).value, username: $('#uu', m).value, role: $('#ur', m).value, password: $('#up', m).value });
          S.users = []; close(); toast('Pengguna ditambahkan'); go('users');
        } catch (e) { toast(e.message, true); }
      };
    });
  }

  /* ---------- PROFIL ---------- */
  function profileModal() {
    modal(`<div class="modal-h"><h3>${esc(S.user.nama)}</h3><button class="x" data-close>×</button></div>
      <div class="muted small">@${esc(S.user.username)} · ${esc(S.user.jabatan || '-')}</div>
      <div class="dgroup">Ganti password</div>
      <input class="in" id="po" type="password" placeholder="Password lama" autocomplete="current-password">
      <input class="in" id="pn" type="password" placeholder="Password baru (min. 6)" style="margin-top:8px" autocomplete="new-password">
      <button class="btn block" style="margin-top:12px" id="ps">Simpan password</button>
      <button class="btn ghost block" style="margin-top:10px" id="lo">Keluar</button>`, (m, close) => {
      $('#ps', m).onclick = async () => {
        try { await api('changePassword', { oldPassword: $('#po', m).value, newPassword: $('#pn', m).value }); close(); toast('Password diperbarui'); } catch (e) { toast(e.message, true); }
      };
      $('#lo', m).onclick = () => { close(); doLogout(); };
    });
  }

  /* ---------- START ---------- */
  if (S.token && S.user) renderShell(); else renderLogin();
})();

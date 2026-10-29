/* Pembuat PDF checklist, susunan mengikuti logbook kertas.
   Butuh jsPDF (window.jspdf). Dipakai lewat window.PKPPKPdf.buat(data, kendaraan, namaUnit). */
(function () {
  'use strict';

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Ukuran dalam mm (A4 potret). Lebar tabel, kotak catatan, dan tanda tangan memakai TW yang sama.
  const PW = 210, PH = 297, M = 12;
  const TW = PW - 2 * M; // 186
  const COL = { no: 9, name: 62, qty: 24, a: 16, b: 16, ket: 59 };
  const X = {};
  X.no = M;
  X.name = X.no + COL.no;
  X.qty = X.name + COL.name;
  X.a = X.qty + COL.qty;
  X.b = X.a + COL.a;
  X.ket = X.b + COL.b;
  X.end = X.ket + COL.ket; // harus sama dengan M + TW

  const ROW_MIN = 5.2, SEC_H = 5.8, HEAD_H = 6.2;
  // Batas bawah isi. Dibuat longgar (24 mm dari tepi kertas) karena banyak printer
  // tidak bisa mencetak 5-6 mm terakhir di tepi bawah; nomor halaman ada di bawah batas ini.
  const LIMIT_Y = PH - 24;
  const FOOT_Y = PH - 12; // posisi teks nomor halaman
  const LINE = 0.2;

  // Teks hanya boleh karakter Latin-1 (font bawaan PDF); sisanya diganti supaya tidak jadi simbol aneh.
  const T = (s) => String(s == null ? '' : s)
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');

  function parseTgl(s) {
    const p = String(s || '').split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function tglPanjang(s) {
    const d = parseTgl(s);
    if (isNaN(d)) return String(s || '');
    return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  }

  function namaFile(d) {
    return 'Checklist_' + String(d.kodeKendaraan || 'X').replace(/[^A-Za-z0-9_-]/g, '') + '_' +
      String(d.tanggal || '').replace(/[^0-9-]/g, '') + '_' + String(d.jam || '').replace(/[^0-9]/g, '') + '.pdf';
  }

  const isBad = (x) => x.hasil === 'Rusak' || x.hasil === 'Kurang';

  // Teks kolom Keterangan. Bahan bakar (bar 1-6) selalu menampilkan levelnya; keterangan kerusakan ditambahkan bila ada.
  function ketTeks(it) {
    const lv = it.k === 'fuel' && it.nilai ? 'Level ' + it.nilai + ' dari 6' : '';
    const ket = isBad(it) ? String(it.ket || '').trim() : '';
    return lv && ket ? lv + ' - ' + ket : (lv || ket);
  }

  function groupSections(items) {
    const out = [];
    const idx = {};
    items.forEach(function (it) {
      const k = it.s || '';
      if (idx[k] === undefined) { idx[k] = out.length; out.push({ title: k, items: [] }); }
      out[idx[k]].items.push(it);
    });
    return out;
  }

  function sectionLabels(sec) {
    const kinds = {};
    sec.items.forEach(function (x) { kinds[x.k] = true; });
    const cond = kinds.cond, fill = kinds.fill || kinds.fuel, val = kinds.val; // bahan bakar (fuel) dihitung Penuh/Kurang
    if (val && !cond && !fill) return { val: true, a: 'Nilai', b: '' };
    if (cond && fill) return { a: 'Baik/Penuh', b: 'Rusak/Kurang' };
    if (fill) return { a: 'Penuh', b: 'Kurang' };
    return { a: 'Baik', b: 'Rusak' };
  }

  function drawTick(doc, cx, cy, rgb) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.55);
    doc.setLineCap('round');
    doc.setLineJoin('round');
    doc.line(cx - 2, cy + 0.1, cx - 0.7, cy + 1.6);
    doc.line(cx - 0.7, cy + 1.6, cx + 2.1, cy - 1.7);
    doc.setLineCap('butt');
    doc.setLineJoin('miter');
  }

  // Teks rata tengah vertikal di dalam sel (mendukung banyak baris).
  function putText(doc, lines, x, y, h, size, align, w) {
    const lh = size * 0.3528 * 1.18;
    const total = lines.length * lh;
    const top = y + (h - total) / 2;
    const tx = align === 'center' ? x + w / 2 : x + 1.6;
    doc.text(lines, tx, top, { baseline: 'top', align: align === 'center' ? 'center' : 'left', lineHeightFactor: 1.18 });
  }

  function cellBox(doc, x, y, w, h) {
    doc.setDrawColor(70, 70, 70);
    doc.setLineWidth(LINE);
    doc.rect(x, y, w, h, 'S');
  }

  function tableHead(doc, y) {
    doc.setFillColor(31, 41, 55);
    doc.rect(X.no, y, TW, HEAD_H, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const cells = [['No', X.no, COL.no, 'center'], ['Uraian pemeriksaan', X.name, COL.name, 'left'], ['Jumlah', X.qty, COL.qty, 'center'],
      ['Hasil', X.a, COL.a + COL.b, 'center'], ['Keterangan', X.ket, COL.ket, 'left']];
    cells.forEach(function (c) { putText(doc, [c[0]], c[1], y, HEAD_H, 8, c[3], c[2]); });
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(LINE);
    doc.rect(X.no, y, TW, HEAD_H, 'S');
    doc.setTextColor(0, 0, 0);
    return y + HEAD_H;
  }

  function sectionRow(doc, y, title, lab) {
    doc.setFillColor(229, 231, 235);
    doc.rect(X.no, y, TW, SEC_H, 'F');
    cellBox(doc, X.no, y, COL.no + COL.name + COL.qty, SEC_H);
    cellBox(doc, X.a, y, COL.a + COL.b, SEC_H);
    cellBox(doc, X.ket, y, COL.ket, SEC_H);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    putText(doc, [T(title)], X.no, y, SEC_H, 8.5, 'left', COL.no + COL.name + COL.qty);
    doc.setFontSize(7);
    if (lab.val) {
      putText(doc, ['Nilai'], X.a, y, SEC_H, 7, 'center', COL.a + COL.b);
    } else {
      doc.line(X.b, y, X.b, y + SEC_H);
      putText(doc, [lab.a], X.a, y, SEC_H, 7, 'center', COL.a);
      putText(doc, [lab.b], X.b, y, SEC_H, 7, 'center', COL.b);
    }
    return y + SEC_H;
  }

  function itemRow(doc, y, no, it, nameLines, ketLines, h) {
    const bad = isBad(it);
    if (bad) { doc.setFillColor(254, 226, 226); doc.rect(X.no, y, TW, h, 'F'); }
    cellBox(doc, X.no, y, COL.no, h);
    cellBox(doc, X.name, y, COL.name, h);
    cellBox(doc, X.qty, y, COL.qty, h);
    cellBox(doc, X.ket, y, COL.ket, h);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    putText(doc, [String(no)], X.no, y, h, 8, 'center', COL.no);
    doc.setFontSize(8.5);
    putText(doc, nameLines, X.name, y, h, 8.5, 'left', COL.name);
    doc.setFontSize(8);
    if (it.q) putText(doc, [T(it.q)], X.qty, y, h, 8, 'center', COL.qty);
    if (ketLines.length) {
      doc.setFontSize(7.5);
      if (bad) doc.setTextColor(153, 27, 27);
      putText(doc, ketLines, X.ket, y, h, 7.5, 'left', COL.ket);
      doc.setTextColor(0, 0, 0);
    }
    if (it.k === 'val') {
      cellBox(doc, X.a, y, COL.a + COL.b, h);
      const v = String(it.nilai || '').trim();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      putText(doc, [v ? T(v + (it.u && /^[0-9.,\-\s]+$/.test(v) ? ' ' + it.u : '')) : '-'], X.a, y, h, 8.5, 'center', COL.a + COL.b);
      doc.setFont('helvetica', 'normal');
    } else {
      cellBox(doc, X.a, y, COL.a, h);
      cellBox(doc, X.b, y, COL.b, h);
      const cy = y + h / 2;
      if (it.hasil === 'Baik' || it.hasil === 'Penuh') drawTick(doc, X.a + COL.a / 2, cy, [22, 101, 52]);
      else if (bad) drawTick(doc, X.b + COL.b / 2, cy, [185, 28, 28]);
    }
  }

  function infoBlock(doc, d, v, unit, summary) {
    let y = M;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CHECKLIST HARIAN KENDARAAN PKP-PK', PW / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(T(unit || ''), PW / 2, y + 10, { align: 'center' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(M, y + 13, M + TW, y + 13);
    y += 16;

    const half = TW / 2, LBL = 31, RH = 6.2;
    const rows = [
      [['Kendaraan', v.kode + ' - ' + v.nama], ['Jenis', v.jenis || '-']],
      [['Hari / tanggal', tglPanjang(d.tanggal)], ['Jam pengisian', d.jam || '-']],
      [['Pelaksana', d.namaPelaksana || '-'], ['Penanggung jawab', d.penanggungJawab || '-']],
      [['Pemanasan', d.pemanasanMenit ? d.pemanasanMenit + ' menit' : '-'], ['Ringkasan', summary]]
    ];
    rows.forEach(function (r) {
      r.forEach(function (c, i) {
        const x = M + i * half;
        cellBox(doc, x, y, half, RH);
        doc.line(x + LBL, y, x + LBL, y + RH);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        putText(doc, [c[0]], x, y, RH, 8, 'left', LBL);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const txt = doc.splitTextToSize(T(c[1]), half - LBL - 3)[0] || '';
        putText(doc, [txt], x + LBL, y, RH, 9, 'left', half - LBL);
      });
      y += RH;
    });
    return y;
  }

  function miniHeader(doc, d, v) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(T('CHECKLIST ' + v.kode + ' - ' + v.nama), M, M + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(T(tglPanjang(d.tanggal) + ' ' + (d.jam || '')), M + TW, M + 4, { align: 'right' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(M, M + 6, M + TW, M + 6);
    return M + 9;
  }

  // Tinggi blok catatan + tanda tangan (dipakai juga untuk menentukan perlu halaman baru atau tidak)
  const CAT_H = 19, SIG_H = 30, FOOT_GAP = 5;
  const FOOT_TOTAL = FOOT_GAP + CAT_H + 4 + SIG_H;

  function footerBlock(doc, y, d) {
    // Kotak catatan selebar tabel (TW)
    const catH = CAT_H;
    cellBox(doc, M, y, TW, catH);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Catatan:', M + 1.6, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(T(d.catatan || '-'), TW - 4).slice(0, 4);
    doc.text(lines, M + 1.6, y + 8.4, { baseline: 'top', lineHeightFactor: 1.18 });
    y += catH + 4;

    // Tanda tangan: dua kotak bersebelahan, satu blok utuh
    const sh = SIG_H, half = TW / 2;
    const sig = [['Pelaksana', d.namaPelaksana], ['Penanggung Jawab', d.penanggungJawab]];
    sig.forEach(function (s, i) {
      const x = M + i * half;
      cellBox(doc, x, y, half, sh);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(s[0], x + half / 2, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setLineWidth(LINE);
      doc.line(x + 14, y + sh - 9, x + half - 14, y + sh - 9);
      doc.text(T(s[1] || ''), x + half / 2, y + sh - 4.5, { align: 'center' });
    });
    return y + sh;
  }

  function buat(d, v, unit) {
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error('Library jsPDF belum dimuat');
    v = v || { kode: d.kodeKendaraan, nama: d.namaKendaraan, jenis: '' };
    const items = (d.items || []).slice();
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    doc.setProperties({ title: 'Checklist ' + v.kode + ' ' + (d.tanggal || ''), subject: 'Checklist harian kendaraan PKP-PK', creator: 'Checklist PKP-PK' });

    const nTem = items.filter(isBad).length;
    let y = infoBlock(doc, d, v, unit, items.length + ' item, ' + (nTem ? nTem + ' temuan' : 'tidak ada temuan'));
    y = tableHead(doc, y + 3);

    function newPage() {
      doc.addPage();
      y = miniHeader(doc, d, v);
      y = tableHead(doc, y);
    }

    groupSections(items).forEach(function (sec) {
      const lab = sectionLabels(sec);
      const prep = sec.items.map(function (it, i) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const nameLines = doc.splitTextToSize(T(it.n), COL.name - 3.2);
        doc.setFontSize(7.5);
        const ket = ketTeks(it);
        const ketLines = ket ? doc.splitTextToSize(T(ket), COL.ket - 3.2) : [];
        const h = Math.max(ROW_MIN, nameLines.length * 3.6 + 2, ketLines.length * 3.2 + 2.2);
        return { it: it, no: i + 1, nameLines: nameLines, ketLines: ketLines, h: h };
      });
      // Judul seksi tidak boleh ditinggal sendirian di dasar halaman.
      if (y + SEC_H + prep[0].h > LIMIT_Y) newPage();
      y = sectionRow(doc, y, sec.title, lab);
      prep.forEach(function (p) {
        if (y + p.h > LIMIT_Y) {
          newPage();
          y = sectionRow(doc, y, sec.title + ' (lanjutan)', lab);
        }
        itemRow(doc, y, p.no, p.it, p.nameLines, p.ketLines, p.h);
        y += p.h;
      });
    });

    // Catatan + tanda tangan dijaga tetap utuh dalam satu halaman, dan tidak melewati batas bawah (LIMIT_Y).
    if (y + FOOT_TOTAL > LIMIT_Y) { doc.addPage(); y = miniHeader(doc, d, v) - 3; }
    footerBlock(doc, y + FOOT_GAP, d);

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(T('Checklist Kendaraan PKP-PK - ' + v.kode + ' - ' + (d.tanggal || '')), M, FOOT_Y);
      doc.text('Halaman ' + i + ' dari ' + n, M + TW, FOOT_Y, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0);
    return doc;
  }

  window.PKPPKPdf = { buat: buat, namaFile: namaFile };
})();

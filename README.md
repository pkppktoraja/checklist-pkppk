# Checklist Kendaraan PKP-PK

Dashboard checklist harian kendaraan PKP-PK (Foam Tender F1/F2, Ambulance A1/A2, Water Tank WT).
Frontend di GitHub Pages, data di Google Spreadsheet, foto temuan di Google Drive.

## Fitur
- Login username/password (admin kelola pengguna)
- Isi checklist per kendaraan, tercatat pelaksana + penanggung jawab
- Daftar "siapa yang mengisi hari ini" di Beranda
- Item rusak/kurang: keterangan + foto, preview, tandai selesai (opsional foto setelah perbaikan)
- Riwayat pengecekan dengan filter kendaraan/tanggal dan detail lengkap; hari libur dan hari tanpa pengecekan diberi penanda
- Kalender libur: Sabtu-Minggu otomatis libur; admin bisa menandai libur, atau hari kerja khusus, per tanggal atau rentang (maks. 14 hari). Libur nasional & cuti bersama 2026 (SKB 3 Menteri) terisi otomatis
- Sheet log per kendaraan (`Log_F1`, `Log_F2`, `Log_A1`, `Log_A2`, `Log_WT`): satu baris = satu pemeriksaan, satu kolom = satu item checklist, sel Rusak/Kurang diberi warna merah
- Unduh PDF dari detail riwayat, susunan seperti logbook kertas (tabel No/Uraian/Jumlah/Hasil/Keterangan, kotak catatan, tanda tangan pelaksana & penanggung jawab)
- Tampilan mobile-first, mendukung mode gelap

## Langkah pasang

### 1. Backend (Google Spreadsheet + Apps Script)
1. Buat Google Spreadsheet baru, beri nama mis. `Checklist PKP-PK`.
2. Menu **Extensions > Apps Script**. Hapus isi default, tempel isi `backend/Code.gs`, simpan.
3. Di **Project Settings** pastikan zona waktu `Asia/Makassar` (WITA).
4. Pilih fungsi `setup` lalu **Run**. Izinkan akses (Spreadsheet & Drive).
   Sheet `Users`, `Pemeriksaan`, `Temuan`, `Libur`, dan `Log_*` (satu per kendaraan) terbuat otomatis, plus folder Drive `PKPPK_Foto_Temuan`.
5. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Salin URL berakhiran `/exec`.

> Jika memperbarui dari versi sebelumnya: tempel `Code.gs` baru, jalankan `setup` lagi (membuat sheet `Libur` + isi libur 2026), lalu deploy versi baru.

> Pembaruan ini menambah sheet `Log_*`: setelah tempel `Code.gs` baru dan `setup`, jalankan fungsi `rebuildLogSheets` **sekali** untuk mengisi sheet log dari riwayat yang sudah ada. Pengisian checklist berikutnya otomatis masuk ke sheet kendaraan masing-masing. Data di sheet `Pemeriksaan` tidak diubah.

> Setiap mengubah `Code.gs`, buat **New version** di Manage deployments agar perubahan aktif.

### 2. Frontend (GitHub Pages)
1. Buka `js/config.js`, ganti `API_URL` dengan URL `/exec` tadi.
2. Buat repository GitHub baru, unggah semua isi folder ini (kecuali `backend/` boleh ikut).
3. **Settings > Pages > Deploy from a branch > main / (root)**.
4. Alamat: `https://USERNAME.github.io/NAMA-REPO/`

### 3. Login awal
- `admin` / `admin123`
- `petugas1` / `petugas123`

**Segera ganti password** (klik nama di pojok kanan atas) dan tambahkan akun anggota lewat menu Pengguna.

## Catatan keamanan
- Password disimpan sebagai hash SHA-256 + salt di sheet Users, bukan teks asli.
- Sesi login berlaku 6 jam; 5x salah password memblokir login 10 menit.
- Foto di Drive berstatus "siapa pun dengan link" supaya bisa tampil di dashboard. Jangan foto data sensitif.
- Jangan bagikan Spreadsheet ke orang yang tidak berwenang, karena berisi seluruh data.

## Mengubah daftar item checklist
Edit `js/checklists.js` (sudah disalin dari logbook fisik). Contoh baris: `C('Lampu depan', '1 Saklar')` = Baik/Rusak, `F('Foam', '480 Liter')` = Penuh/Kurang.

## Unduh PDF
Buka **Riwayat**, ketuk salah satu pengecekan, lalu **Unduh PDF**. Library jsPDF dimuat dari cdnjs saat tombol pertama kali ditekan, jadi perlu koneksi internet. Tampilan PDF diatur di `js/pdf.js` (lebar kolom di konstanta `COL`).

## Libur tahun berikutnya
Daftar awal hanya libur 2026. Untuk tahun lain, admin cukup menambah tanggal lewat menu **Kalender**, atau menambah baris langsung di sheet `Libur` (kolom: tanggal `yyyy-mm-dd`, jenis `Libur`/`Kerja`, keterangan).

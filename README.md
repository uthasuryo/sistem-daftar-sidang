# 📊 PANDUAN SETUP SPREADSHEET
## Sistem Pendaftaran Ujian Sidang — IAI Al-Aqidah Al-Hasyimiyyah

---

## BERAPA SHEET YANG DISIAPKAN?
**Sediakan 4 Sheet** dengan nama persis seperti berikut:

---

## SHEET 1: `Pendaftaran`
> **Fungsi:** Data utama semua pendaftar (otomatis diisi sistem)

| Kolom | Header | Keterangan |
|-------|--------|------------|
| A | No. Pendaftaran | Format: SIDANG/YYYY/MM/NNNN |
| B | Timestamp | Tanggal & jam submit |
| C | Nama Lengkap | |
| D | NIM | |
| E | Tempat Lahir | |
| F | Tanggal Lahir | |
| G | No. HP/WA | |
| H | Email | |
| I | Fakultas | |
| J | Program Studi | |
| K | Jenjang | S1 / S2 |
| L | Judul Skripsi/Tesis | |
| M | Pembimbing I | |
| N | Pembimbing II | |
| O | Link KHS (Drive) | URL Google Drive |
| P | Link Pengesahan Bimbingan | URL Google Drive |
| Q | Link Berita Acara | URL Google Drive |
| R | Link RKP Adm. Kuliah | URL Google Drive |
| S | Link Bebas Pustaka | URL Google Drive |
| T | Link Folder Dokumen | URL folder semua berkas |
| U | Status | Menunggu/Terverifikasi/Ditolak/Lulus |
| V | Tanggal Ujian | Diisi Admin |
| W | Ruang Ujian | Diisi Admin |
| X | Catatan Admin | Diisi Admin |

**Baris 1 = Header** (tulis semua label di atas)
**Baris 2 dst** = Data (otomatis dari sistem)

---

## SHEET 2: `Status Ujian`
> **Fungsi:** Summary status tiap mahasiswa (digunakan fitur Cek Status)

| Kolom | Header |
|-------|--------|
| A | No. Pendaftaran |
| B | NIM |
| C | Nama |
| D | Program Studi |
| E | Jenjang |
| F | Judul |
| G | Status |
| H | Tanggal Daftar |
| I | Tanggal Ujian |
| J | Ruang |
| K | Nilai Akhir |

---

## SHEET 3: `Log Aktivitas`
> **Fungsi:** Rekam jejak semua aktivitas sistem (audit trail)

| Kolom | Header |
|-------|--------|
| A | Timestamp |
| B | Jenis Aksi (SUBMIT/UPDATE/DELETE) |
| C | No. Pendaftaran |
| D | NIM |
| E | Nama |
| F | Keterangan |

---

## SHEET 4: `Rekap Dashboard` *(Opsional, buat manual)*
> **Fungsi:** Ringkasan statistik untuk monitoring admin

Buat tabel manual dengan rumus COUNTIF:

| Label | Rumus Excel/Sheets |
|-------|-------------------|
| Total Pendaftar | `=COUNTA(Pendaftaran!A:A)-1` |
| Menunggu Verifikasi | `=COUNTIF(Pendaftaran!U:U,"Menunggu Verifikasi")` |
| Terverifikasi | `=COUNTIF(Pendaftaran!U:U,"Terverifikasi")` |
| Ditolak | `=COUNTIF(Pendaftaran!U:U,"Ditolak")` |
| Lulus | `=COUNTIF(Pendaftaran!U:U,"Lulus")` |
| Pendaftar S1 | `=COUNTIF(Pendaftaran!K:K,"S1 (Sarjana)")` |
| Pendaftar S2 | `=COUNTIF(Pendaftaran!K:K,"S2 (Magister)")` |

---

## CARA DEPLOY (LANGKAH-LANGKAH)

### 1. Buat Google Spreadsheet
1. Buka **sheets.google.com** → Buat spreadsheet baru
2. Beri nama: "Pendaftaran Ujian Sidang IAI Al-Aqidah"
3. Buat **4 sheet** dengan nama:
   - `Pendaftaran`
   - `Status Ujian`
   - `Log Aktivitas`
   - `Rekap Dashboard`
4. Tambahkan **header di Baris 1** pada masing-masing sheet
5. Salin **ID spreadsheet** dari URL (bagian setelah `/d/` dan sebelum `/edit`)

### 2. Buat Folder Google Drive
1. Buka **drive.google.com**
2. Buat folder baru: "Berkas Sidang Skripsi IAI"
3. Salin **ID folder** dari URL (bagian setelah `/folders/`)

### 3. Buat Google Apps Script
1. Buka **script.google.com** → Buat Project baru
2. Beri nama: "Pendaftaran Sidang IAI Al-Aqidah"
3. Buat **2 file**:
   - `Code.gs` → paste isi Code.gs
   - `Index.html` → klik `+` → pilih HTML → paste isi Index.html
4. Di `Code.gs`, ganti:
   - `GANTI_DENGAN_ID_SPREADSHEET_ANDA` → ID spreadsheet Anda
   - `GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA` → ID folder Drive Anda

### 4. Deploy sebagai Web App
1. Klik **Deploy** → **New Deployment**
2. Pilih Type: **Web app**
3. Pengaturan:
   - Description: "Pendaftaran Sidang v1"
   - Execute as: **Me (email Anda)**
   - Who has access: **Anyone** (agar mahasiswa bisa akses tanpa login) ATAU **Anyone with Google account** (jika ingin login dulu)
4. Klik **Deploy** → Izinkan akses yang diminta
5. Salin **Web App URL** → bagikan ke mahasiswa

---

## TIPS TAMBAHAN

### Freeze Header
Di setiap sheet, freeze baris pertama:
**View → Freeze → 1 row**

### Format Kolom Tanggal
Pilih kolom B (Timestamp) dan F (Tanggal Lahir):
**Format → Number → Date time**

### Proteksi Sheet
Untuk mencegah admin tidak sengaja mengubah data otomatis:
**Data → Protect Sheets & Ranges** → Lock kolom A–T di sheet Pendaftaran

### Notifikasi Email Admin
Tambahkan di akhir fungsi `submitPendaftaran` di Code.gs:
```javascript
// Notif ke admin
GmailApp.sendEmail(
  'email-admin@iai-alaqidah.ac.id',
  '[SIDANG BARU] ' + formData.namaLengkap + ' - ' + formData.prodi,
  'Ada pendaftaran baru dari ' + formData.namaLengkap + ' (NIM: ' + formData.nim + ')'
);
```

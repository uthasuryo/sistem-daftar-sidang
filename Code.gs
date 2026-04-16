// ============================================================
// KONFIGURASI - Sesuaikan dengan ID Spreadsheet Anda
// ============================================================
const SPREADSHEET_ID = '1TxK0o0qLlnQI4JgMr10ZObjd26t7lo1qV6iBV0B2FOU';
const FOLDER_ID = '14LtOfo_ALEs2uUs2tUCcqYBpY5pUF9W3'; // Folder penyimpanan file upload

// Nama Sheet
const SHEET_PENDAFTARAN = 'Pendaftaran';
const SHEET_STATUS = 'Status Ujian';
const SHEET_LOG = 'Log Aktivitas';

// ============================================================
// ENTRY POINT - Web App
// ============================================================

// ==== FEATURE FLAG ====
// Set to true to enable email notifications; currently disabled
const SEND_EMAIL_ENABLED = false;
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Pendaftaran Ujian Sidang Skripsi/Tesis - IAI Al-Aqidah Al-Hasyimiyyah')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// INCLUDE HTML PARTIAL
// ============================================================
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// CEK DUPLIKASI NIM (dipanggil real-time dari Step 2)
// ============================================================
function cekDuplikasiNIM(nim) {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'GANTI_DENGAN_ID_SPREADSHEET_ANDA') {
      return { isDuplikat: false }; // Belum dikonfigurasi, lewati saja
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PENDAFTARAN);
    if (!sheet || sheet.getLastRow() < 2) return { isDuplikat: false };

    var data = sheet.getRange(2, 4, sheet.getLastRow() - 1, 18).getValues();
    // Kolom D (NIM) = index 0, kolom U (Status) = index 17

    var STATUS_AKTIF = ['Menunggu Verifikasi', 'Terverifikasi'];
    // Status 'Ditolak' dan 'Lulus' diizinkan daftar ulang

    for (var i = 0; i < data.length; i++) {
      var nimRow    = String(data[i][0]).trim();
      var statusRow = String(data[i][17]).trim();

      if (nimRow === String(nim).trim() && STATUS_AKTIF.indexOf(statusRow) !== -1) {
        // Ambil juga nomor pendaftaran (kolom A = 3 kolom sebelum D)
        var nomorPendaftaran = String(sheet.getRange(i + 2, 1).getValue());
        var tanggalDaftar    = String(sheet.getRange(i + 2, 2).getValue());
        return {
          isDuplikat: true,
          status: statusRow,
          nomorPendaftaran: nomorPendaftaran,
          tanggalDaftar: tanggalDaftar
        };
      }
    }

    return { isDuplikat: false };

  } catch (error) {
    Logger.log('Error cekDuplikasiNIM: ' + error.toString());
    return { isDuplikat: false }; // Jika error, jangan blokir — biarkan server yang menangani
  }
}

// ============================================================
// SUBMIT PENDAFTARAN
// ============================================================
function submitPendaftaran(formData, files) {
  try {
    // Pastikan nama kapital sebelum diproses (triple-safety)
    formData.namaLengkap = (formData.namaLengkap || '').toUpperCase().trim();
    formData.tempatLahir  = (formData.tempatLahir  || '').toUpperCase().trim();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPendaftaran = ss.getSheetByName(SHEET_PENDAFTARAN);
    const sheetStatus = ss.getSheetByName(SHEET_STATUS);
    const sheetLog = ss.getSheetByName(SHEET_LOG);
    const folder = DriveApp.getFolderById(FOLDER_ID);

    // ── CEK DUPLIKAT SEBELUM PROSES APAPUN ──────────────────
    // (dilakukan di sini juga agar tidak bisa di-bypass dari client)
    var dupCek = cekDuplikasiNIM(formData.nim);
    if (dupCek.isDuplikat) {
      sheetLog.appendRow([
        Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'),
        'DITOLAK_DUPLIKAT',
        dupCek.nomorPendaftaran,
        formData.nim,
        formData.namaLengkap,
        'Percobaan daftar ulang. Status aktif: ' + dupCek.status
      ]);
      return {
        success: false,
        duplicate: true,
        status: dupCek.status,
        nomorPendaftaran: dupCek.nomorPendaftaran,
        tanggalDaftar: dupCek.tanggalDaftar,
        message: 'NIM sudah terdaftar'
      };
    }
    // ────────────────────────────────────────────────────────

    // Generate Nomor Pendaftaran
    const nomorPendaftaran = generateNomor(sheetPendaftaran);
    const timestamp = new Date();

    // Buat subfolder per mahasiswa
    const subFolderName = `${nomorPendaftaran}_${formData.nim}_${formData.namaLengkap}`;
    const subFolder = folder.createFolder(subFolderName);

    // Upload file-file ke Drive
    const fileUrls = {};
    const fileNames = {
      fileKHS: 'KHS',
      filePengesahan: 'Lembar_Pengesahan_Bimbingan',
      fileBeritaAcara: 'Berita_Acara_Bimbingan',
      fileRKP: 'RKP_Adm_Kuliah',
      fileBebasPustaka: 'Surat_Bebas_Pustaka'
    };

    for (const [key, label] of Object.entries(fileNames)) {
      if (files[key]) {
        const fileData = files[key];
        const blob = Utilities.newBlob(
          Utilities.base64Decode(fileData.data),
          fileData.mimeType,
          `${label}_${formData.nim}.pdf`
        );
        const uploadedFile = subFolder.createFile(blob);
        uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrls[key] = uploadedFile.getUrl();
      } else {
        fileUrls[key] = 'Tidak diupload';
      }
    }

    // Tentukan jenjang
    const jenjang = getJenjang(formData.prodi);

    // Simpan ke sheet Pendaftaran
    sheetPendaftaran.appendRow([
      nomorPendaftaran,                  // A: No. Pendaftaran
      Utilities.formatDate(timestamp, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'), // B: Timestamp
      formData.namaLengkap,              // C: Nama Lengkap
      formData.nim,                      // D: NIM
      formData.tempatLahir,              // E: Tempat Lahir
      formData.tanggalLahir,             // F: Tanggal Lahir
      formData.noHp,                     // G: No. HP/WA
      formData.email,                    // H: Email
      formData.fakultas,                 // I: Fakultas
      formData.prodi,                    // J: Program Studi
      jenjang,                           // K: Jenjang
      formData.judulSkripsi,             // L: Judul Skripsi/Tesis
      formData.pembimbing1,              // M: Pembimbing 1
      formData.pembimbing2 || '-',       // N: Pembimbing 2
      fileUrls.fileKHS,                  // O: Link KHS
      fileUrls.filePengesahan,           // P: Link Pengesahan
      fileUrls.fileBeritaAcara,          // Q: Link Berita Acara
      fileUrls.fileRKP,                  // R: Link RKP
      fileUrls.fileBebasPustaka,         // S: Link Bebas Pustaka
      subFolder.getUrl(),                // T: Link Folder Dokumen
      'Menunggu Verifikasi',             // U: Status
      '',                               // V: Tanggal Ujian (diisi admin)
      '',                               // W: Ruang Ujian (diisi admin)
      '',                               // X: Catatan Admin
    ]);

    // Simpan ke sheet Status
    sheetStatus.appendRow([
      nomorPendaftaran,
      formData.nim,
      formData.namaLengkap,
      formData.prodi,
      jenjang,
      formData.judulSkripsi,
      'Menunggu Verifikasi',
      Utilities.formatDate(timestamp, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'),
      '',  // Tanggal Ujian
      '',  // Ruang
      '',  // Nilai Akhir
    ]);

    // Log aktivitas
    sheetLog.appendRow([
      Utilities.formatDate(timestamp, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'),
      'SUBMIT',
      nomorPendaftaran,
      formData.nim,
      formData.namaLengkap,
      'Pendaftaran berhasil disubmit',
    ]);

    // Kirim email konfirmasi (dinonaktifkan — aktifkan jika sudah dikonfigurasi)
    // sendEmailKonfirmasi(formData, nomorPendaftaran, timestamp);

    return {
      success: true,
      nomorPendaftaran: nomorPendaftaran,
      message: `Pendaftaran berhasil! Nomor pendaftaran Anda: ${nomorPendaftaran}`
    };

  } catch (error) {
    Logger.log('Error submitPendaftaran: ' + error.toString());
    return {
      success: false,
      message: 'Terjadi kesalahan: ' + error.toString()
    };
  }
}

// ============================================================
// CEK STATUS PENDAFTARAN
// ============================================================
function cekStatus(nim) {
  try {
    // Guard: pastikan SPREADSHEET_ID sudah dikonfigurasi
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'GANTI_DENGAN_ID_SPREADSHEET_ANDA') {
      return { found: false, message: '⚠️ SPREADSHEET_ID belum dikonfigurasi di Code.gs. Silakan isi dengan ID spreadsheet Anda.' };
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      return { found: false, message: 'Spreadsheet tidak ditemukan. Periksa kembali SPREADSHEET_ID.' };
    }

    var sheet = ss.getSheetByName(SHEET_STATUS);
    if (!sheet) {
      return { found: false, message: 'Sheet "' + SHEET_STATUS + '" tidak ditemukan. Pastikan nama sheet sudah dibuat persis: Status Ujian' };
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { found: false, message: 'Belum ada data pendaftaran dalam sistem.' };
    }

    var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    var results = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      // Bandingkan NIM (kolom B = index 1) — convert ke string agar aman
      if (String(row[1]).trim() === String(nim).trim()) {
        results.push({
          nomorPendaftaran: String(row[0] || '-'),
          nim:              String(row[1] || '-'),
          nama:             String(row[2] || '-'),
          prodi:            String(row[3] || '-'),
          jenjang:          String(row[4] || '-'),
          judul:            String(row[5] || '-'),
          status:           String(row[6] || 'Menunggu Verifikasi').trim(),
          tanggalDaftar:    String(row[7] || '-'),
          tanggalUjian:     String(row[8] || 'Belum dijadwalkan'),
          ruang:            String(row[9] || 'Belum ditentukan'),
          nilai:            String(row[10] || 'Belum tersedia'),
        });
      }
    }

    if (results.length === 0) {
      return { found: false, message: 'NIM <strong>' + nim + '</strong> tidak ditemukan dalam sistem. Pastikan NIM yang dimasukkan sudah benar.' };
    }

    return { found: true, data: results };

  } catch (error) {
    Logger.log('Error cekStatus: ' + error.toString() + ' | Stack: ' + error.stack);
    return { found: false, message: 'Terjadi kesalahan server: ' + error.toString() };
  }
}

// ============================================================
// FUNGSI DEBUG — jalankan ini di Apps Script Editor untuk tes
// ============================================================
function debugCekStatus() {
  // Ganti NIM_TEST dengan NIM yang ada di spreadsheet Anda
  var result = cekStatus('NIM_TEST');
  Logger.log('Result: ' + JSON.stringify(result));
  if (result.found) {
    Logger.log('Status dari Spreadsheet: ' + result.data[0].status);
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function generateNomor(sheet) {
  const lastRow = sheet.getLastRow();
  const year = new Date().getFullYear();
  const bulan = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(lastRow).padStart(4, '0');
  return `SIDANG/${year}/${bulan}/${seq}`;
}

function getJenjang(prodi) {
  const s2 = ['Pendidikan Agama Islam (PAI) - S2'];
  return s2.includes(prodi) ? 'S2 (Magister)' : 'S1 (Sarjana)';
}

function sendEmailKonfirmasi(formData, nomorPendaftaran, timestamp) {
  if (!formData.email) return;

  const subject = `[IAI Al-Aqidah] Konfirmasi Pendaftaran Ujian Sidang - ${nomorPendaftaran}`;
  const body = `
Bismillahirrahmanirrahim,

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. ${formData.namaLengkap},

Kami sampaikan bahwa pendaftaran Ujian Sidang Skripsi/Tesis Anda telah berhasil diterima oleh sistem kami.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DETAIL PENDAFTARAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nomor Pendaftaran : ${nomorPendaftaran}
Tanggal Daftar    : ${Utilities.formatDate(timestamp, 'Asia/Jakarta', 'dd MMMM yyyy, HH:mm')} WIB
NIM               : ${formData.nim}
Program Studi     : ${formData.prodi}
Judul             : ${formData.judulSkripsi}
Status            : Menunggu Verifikasi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Silakan simpan nomor pendaftaran Anda untuk keperluan pengecekan status.

Tim administrasi akan memverifikasi kelengkapan berkas Anda dalam 1-3 hari kerja.
Apabila berkas dinyatakan lengkap, Anda akan mendapatkan pemberitahuan jadwal ujian.

Jazakumullahu Khairan Katsiran.

Wassalamu'alaikum Warahmatullahi Wabarakatuh,

Bagian Akademik
Institut Agama Islam Al-Aqidah Al-Hasyimiyyah Jakarta
  `;

  try {
    GmailApp.sendEmail(formData.email, subject, body);
  } catch (e) {
    Logger.log('Gagal kirim email: ' + e.toString());

function syncStatusSheets(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Pendaftaran') return;
  const statusCol = 2;
  const row = e.range.getRow();
  if (e.range.getColumn() !== statusCol) return;
  const newStatus = e.value;
  if (!newStatus) return;
  const statusUjuan = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Status Ujian');
  if (!statusUjuan) return;
  statusUjuan.getRange(row, 1).setValue(newStatus);
}
  }
}

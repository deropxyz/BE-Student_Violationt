# 📊 PlantUML Activity Diagrams - Sistem Kesiswaan SMK14

## 📋 Cara Menggunakan File Ini
File ini berisi diagram dalam format PlantUML yang dapat di-render menggunakan:
- VS Code dengan extension PlantUML
- Online PlantUML Editor (plantuml.com)
- IntelliJ IDEA dengan PlantUML plugin

---

## 1. Login Multi-Role System

```plantuml
@startuml Login_MultiRole
start

:User mengakses halaman login;

if (Jenis User?) then (Siswa)
  :Masukkan NISN & Password;
  :Validasi kredensial siswa;
elseif (Guru/BK/Superadmin/Orang Tua) then
  :Masukkan Email & Password;
  :Validasi kredensial email;
endif

if (Kredensial valid?) then (Ya)
  :Generate JWT Token;
  :Set user session;
  
  switch (Role user?)
  case (Siswa)
    :Redirect ke dashboard siswa;
  case (Guru)
    :Redirect ke dashboard guru;
  case (BK)
    :Redirect ke dashboard BK;
  case (Superadmin)
    :Redirect ke dashboard admin;
  case (Orang Tua)
    :Redirect ke dashboard orang tua;
  endswitch
else (Tidak)
  :Tampilkan pesan error;
  :User mencoba login lagi;
  backward :Kembali ke form login;
endif

stop
@enduml
```

---

## 2. Manajemen Siswa (CRUD)

```plantuml
@startuml CRUD_Siswa
start

:Superadmin akses menu siswa;

switch (Pilih aksi?)
case (Tambah)
  :Klik tambah siswa;
  repeat
    :Isi form data siswa;
    :Submit form;
    :Validasi data;
  repeat while (Data valid?) is (Tidak) not (Ya)
  :Simpan ke database;
  :Auto-generate email & password;
  :Tampilkan sukses;

case (Lihat)
  :Tampilkan daftar siswa;
  :Filter & pencarian opsional;
  :Tampilkan hasil;

case (Edit)
  :Pilih siswa untuk diedit;
  :Load data siswa ke form;
  :Edit data;
  :Submit perubahan;
  :Update database;
  :Tampilkan sukses;

case (Hapus)
  :Pilih siswa untuk dihapus;
  :Konfirmasi penghapusan;
  if (Konfirmasi?) then (Ya)
    :Hapus dari database;
    :Tampilkan sukses;
  else (Tidak)
    :Batal hapus;
  endif

case (Import)
  :Upload file Excel;
  :Validasi format Excel;
  if (Format valid?) then (Ya)
    :Proses import;
    :Validasi setiap baris;
    :Simpan data valid;
    :Tampilkan hasil import;
  else (Tidak)
    :Tampilkan error format;
  endif
endswitch

stop
@enduml
```

---

## 3. Laporan Pelanggaran Siswa

```plantuml
@startuml Laporan_Pelanggaran
start

:Guru/BK akses menu laporan;
:Pilih buat laporan pelanggaran;

:Pilih siswa;
note right: Cari by nama/NISN

:Pilih jenis pelanggaran;
note right: Load pelanggaran aktif

:Isi detail laporan;
note right
- Tanggal kejadian
- Waktu (opsional)
- Deskripsi detail
- Upload bukti (opsional)
end note

:Submit laporan;

repeat
  :Validasi data laporan;
repeat while (Data valid?) is (Tidak) not (Ya)

:Simpan laporan ke database;

partition "Update Score Siswa" {
  :Update total score siswa;
  note right: totalScore + pointPelanggaran
  :Simpan perubahan score;
  :Catat ke score history;
}

partition "Cek Tindakan Otomatis" {
  :Cek tindakan otomatis;
  if (Score memicu tindakan?) then (Ya)
    :Trigger tindakan otomatis;
    :Buat notifikasi tindakan;
  else (Tidak)
    :Buat notifikasi biasa;
  endif
}

:Kirim notifikasi ke siswa & ortu;
:Tampilkan sukses;

stop
@enduml
```

---

## 4. Sistem Tindakan Otomatis

```plantuml
@startuml Tindakan_Otomatis
start

:Siswa mendapat pelanggaran;
:Update total score siswa;

partition "Proses Tindakan Otomatis" {
  :Query daftar tindakan aktif;
  
  repeat
    :Ambil tindakan berikutnya;
    
    if (Score >= minPoint?) then (Ya)
      if (maxPoint ada?) then (Ya)
        if (Score <= maxPoint?) then (Ya)
          :Tindakan ini terpicu;
          break
        else (Tidak)
          :Lanjut tindakan berikutnya;
        endif
      else (Tidak)
        :Tindakan ini terpicu;
        break
      endif
    else (Tidak)
      :Lanjut tindakan berikutnya;
    endif
  repeat while (Ada tindakan lain?) is (Ya)
}

if (Ada tindakan terpicu?) then (Ya)
  partition "Eksekusi Tindakan" {
    :Buat record tindakan otomatis;
    :Insert ke tabel StudentAction;
    :Buat notifikasi khusus;
    :Kirim notifikasi ke siswa;
    :Kirim notifikasi ke orang tua;
    
    if (Tindakan = "Panggil Orang Tua"?) then (Ya)
      :Kirim notifikasi khusus ke ortu;
      :Buat jadwal panggilan;
    endif
    
    if (Tindakan = "Drop Out"?) then (Ya)
      :Set flag siswa untuk review;
      :Notifikasi ke BK untuk tindakan lanjut;
    endif
  }
else (Tidak)
  :Tidak ada tindakan;
endif

stop
@enduml
```

---

## 5. Generate Kenaikan Kelas

```plantuml
@startuml Kenaikan_Kelas
start

:Superadmin akses menu kenaikan kelas;
:Klik generate kenaikan kelas;

:Input tahun ajaran baru;
:Input deskripsi proses;
:Konfirmasi generate;

if (Konfirmasi proses?) then (Tidak)
  :Batal proses;
  stop
else (Ya)
  :Mulai proses kenaikan kelas;
endif

partition "Proses Batch Kenaikan" {
  :Query semua siswa aktif;
  :Inisialisasi counter;
  
  repeat
    :Ambil data siswa berikutnya;
    :Cek status siswa;
    
    if (Siswa layak naik kelas?) then (Ya)
      switch (Kelas sekarang?)
      case (Kelas X)
        :Naik ke kelas XI;
        :Update classroom siswa;
        :Increment counter sukses;
      case (Kelas XI)
        :Naik ke kelas XII;
        :Update classroom siswa;
        :Increment counter sukses;
      case (Kelas XII)
        :Set status lulus;
        :Update status menjadi alumni;
        :Increment counter lulus;
      endswitch
    else (Tidak)
      :Set status tidak naik;
      :Increment counter gagal;
    endif
  repeat while (Ada siswa lain?) is (Ya)
}

:Simpan record kenaikan kelas;
:Insert ke tabel KenaikanKelas;
:Simpan total summary;
:Generate laporan hasil;
:Tampilkan hasil proses;
:Tampilkan detail sukses/gagal/lulus;

stop
@enduml
```

---

## 6. Dashboard Siswa

```plantuml
@startuml Dashboard_Siswa
start

:Siswa login ke sistem;
:Load dashboard siswa;

partition "Load Data Dashboard" {
  :Query data siswa;
  :Tampilkan info profil;
  :Tampilkan total score saat ini;
  :Query history pelanggaran;
  :Query history prestasi;
  :Query notifikasi belum dibaca;
  :Query tindakan otomatis aktif;
}

:Tampilkan summary dashboard;

if (Ada notifikasi baru?) then (Ya)
  :Tampilkan badge notifikasi;
  :Tampilkan jumlah notifikasi;
  
  if (User klik notifikasi?) then (Ya)
    :Buka halaman notifikasi;
    :Tampilkan daftar notifikasi;
    :Mark sebagai dibaca;
    :Update status notifikasi;
    :Kembali ke dashboard;
  endif
else (Tidak)
  :Tampilkan dashboard normal;
endif

:Tampilkan chart timeline score;
:Tampilkan recent violations;
:Tampilkan recent achievements;

if (Ada tindakan otomatis?) then (Ya)
  :Tampilkan warning tindakan;
  :Tampilkan jenis tindakan;
  :Tampilkan info follow up;
else (Tidak)
  :Dashboard normal;
endif

note right
Dashboard dapat di-refresh
untuk update data terbaru
end note

stop
@enduml
```

---

## 7. Import Data dari Excel

```plantuml
@startuml Import_Excel
start

:Superadmin akses menu import;

switch (Pilih jenis data?)
case (Siswa)
  :Pilih import siswa;
  :Download template Excel siswa;
case (Guru)
  :Pilih import guru;
  :Download template Excel guru;
case (BK)
  :Pilih import BK;
  :Download template Excel BK;
endswitch

:Isi data di template;
:Upload file Excel;

partition "Validasi File" {
  :Validasi format file;
  if (File valid?) then (Tidak)
    :Tampilkan error format;
    stop
  endif
  
  :Baca data dari Excel;
  :Validasi header kolom;
  if (Header sesuai?) then (Tidak)
    :Tampilkan error header;
    stop
  endif
}

partition "Proses Data" {
  repeat
    :Ambil baris data berikutnya;
    :Validasi data per baris;
    
    if (Data baris valid?) then (Tidak)
      :Simpan error ke list;
    else (Ya)
      :Simpan data valid ke list;
    endif
  repeat while (Ada baris lain?) is (Ya)
  
  :Proses data valid;
  
  repeat
    :Insert data ke database;
    
    if (Data siswa?) then (Ya)
      :Generate email & password;
    else (Tidak)
      :Generate password default;
    endif
    
    :Create user account;
    :Insert ke tabel terkait;
    :Increment counter sukses;
  repeat while (Ada data lain?) is (Ya)
}

:Generate laporan import;
:Tampilkan hasil import;
:Tampilkan jumlah sukses;
:Tampilkan jumlah error;

if (Ada error?) then (Ya)
  :Tampilkan detail error;
else (Tidak)
  :Import sukses semua;
endif

stop
@enduml
```

---

## 8. Automasi Cron Job Surat Peringatan

```plantuml
@startuml Automasi_SuratPeringatan
start

note right: Cron job berjalan setiap hari

:Cron job dimulai;
:Load konfigurasi automasi;

if (Automasi aktif?) then (Tidak)
  :Skip proses;
  stop
else (Ya)
  :Query siswa dengan score tinggi;
endif

:Filter siswa yang belum dapat surat hari ini;

if (Ada siswa yang perlu surat?) then (Tidak)
  :Log: tidak ada yang perlu surat;
  stop
else (Ya)
  repeat
    :Ambil siswa berikutnya;
    :Cek score siswa;
    
    if (Score >= threshold surat peringatan?) then (Tidak)
      :Skip siswa ini;
    else (Ya)
      :Cek tindakan otomatis terkait;
      
      if (Sudah dapat surat peringatan?) then (Ya)
        :Cek interval kirim ulang;
        if (Sudah waktunya kirim ulang?) then (Tidak)
          :Skip siswa ini;
        else (Ya)
          :Generate surat peringatan;
        endif
      else (Tidak)
        :Generate surat peringatan;
      endif
    endif
  repeat while (Ada siswa lain?) is (Ya)
endif

partition "Generate Surat" {
  :Create record AutomasiSurat;
  :Generate content surat;
  :Insert ke database;
  :Kirim notifikasi ke siswa;
  :Kirim notifikasi ke orang tua;
  
  if (Kirim email automatis?) then (Ya)
    :Queue email surat peringatan;
    :Send email async;
  else (Tidak)
    :Simpan record saja;
  endif
}

:Log summary proses;
:Update last run timestamp;
:Cleanup old records;

stop
@enduml
```

---

## 9. Sistem Laporan & Statistik

```plantuml
@startuml Laporan_Statistik
start

:User akses menu laporan;

switch (Jenis laporan?)
case (Statistik)
  :Pilih laporan statistik;
  :Set filter tanggal (opsional);
  :Submit filter;
  
  partition "Generate Statistik" {
    :Query data pelanggaran;
    :Hitung total pelanggaran;
    :Hitung siswa terlibat;
    :Group by jenis pelanggaran;
    :Group by kategori;
    :Group by kelas;
    :Generate summary;
  }
  
  :Tampilkan statistik;
  :Tampilkan chart/grafik;

case (Mingguan)
  :Pilih laporan mingguan;
  :Set tanggal minggu ini;
  :Query pelanggaran minggu ini;
  :Group by hari;
  :Tampilkan timeline mingguan;

case (Bulanan)
  :Pilih laporan bulanan;
  :Pilih bulan dan tahun;
  :Query pelanggaran bulan tersebut;
  :Group by minggu;
  :Tampilkan trend bulanan;

case (Per Kelas)
  :Pilih laporan per kelas;
  :Pilih kelas dari dropdown;
  :Query pelanggaran kelas;
  :Tampilkan detail per siswa;
  :Tampilkan summary kelas;
  :Bandingkan dengan kelas lain;
endswitch

:Option export PDF/Excel;

if (Export?) then (Ya)
  :Generate file export;
  :Download file;
else (Tidak)
  :Selesai lihat laporan;
endif

stop
@enduml
```

---

## 📋 Summary Diagram PlantUML

### Keuntungan Menggunakan PlantUML:
1. **Sintaks yang Mudah**: Text-based diagram yang mudah di-maintain
2. **Version Control**: Dapat di-track di Git sebagai text
3. **Konsistensi**: Style yang seragam untuk semua diagram
4. **Integrasi**: Mudah diintegrasikan dengan dokumentasi
5. **Export**: Dapat di-export ke berbagai format (PNG, SVG, PDF)

### Cara Render Diagram:
1. **VS Code**: Install extension "PlantUML" 
2. **Online**: Buka plantuml.com dan paste code
3. **CLI**: Install plantuml dan jalankan `plantuml filename.puml`

### Template untuk Diagram Tambahan:
```plantuml
@startuml Template_Baru
start
:Langkah pertama;
if (Kondisi?) then (Ya)
  :Aksi jika ya;
else (Tidak)
  :Aksi jika tidak;
endif
:Langkah terakhir;
stop
@enduml
```

Semua diagram di atas dapat langsung digunakan dan dimodifikasi sesuai kebutuhan pengembangan aplikasi SMK14.
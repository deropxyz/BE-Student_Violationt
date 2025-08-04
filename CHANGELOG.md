# Changelog - SMK14 Student Violation System

## [2025-08-04] - Separation of Violations and Achievements

### Added

- **Model Achievement**: Tabel terpisah untuk data prestasi siswa
- **Model StudentAchievement**: Tabel untuk laporan prestasi siswa
- **Achievement Controller**: CRUD untuk master data prestasi
- **Student Achievement Controller**: CRUD untuk laporan prestasi siswa
- **Achievement Routes**: API endpoints untuk prestasi
- **Student Achievement Routes**: API endpoints untuk laporan prestasi
- **Enum KategoriPrestasi**: Kategori prestasi (akademik, non_akademik, olahraga, kesenian, lainnya)

### Changed

- **Model Violation**: Removed field `tipe` (TipePoin enum)
- **Model User**: Updated relations untuk achievement reporting
- **Model Student**: Added relation ke StudentAchievement
- **Student Violation Controller**: Updated logic untuk pelanggaran saja (menambah poin)
- **Score Calculation Logic**:
  - Pelanggaran: `totalScore + violationPoint`
  - Prestasi: `totalScore - achievementPoint` (minimum 0)
- **ScoreHistory**: Added field `tanggal` for better tracking

### Removed

- **Enum TipePoin**: Tidak lagi diperlukan karena sudah dipisah

### API Endpoints

```
# Master Data Prestasi
GET /api/achievements
GET /api/achievements/:id
POST /api/achievements (guru, superadmin)
PUT /api/achievements/:id (guru, superadmin)
DELETE /api/achievements/:id (superadmin)

# Laporan Prestasi Siswa
GET /api/student-achievements
GET /api/student-achievements/:id
POST /api/student-achievements (guru, bk)
PUT /api/student-achievements/:id (guru, bk)
DELETE /api/student-achievements/:id (bk, superadmin)
```

### Score Logic

- **Total Score** tetap satu field di model Student
- **Pelanggaran**: Menambah poin (semakin tinggi = semakin buruk)
- **Prestasi**: Mengurangi poin (reward untuk prestasi)
- **Minimum Score**: 0 (tidak bisa negatif)

### Technical Details

- Migration: `20250804143210_separate_violation_achievement`
- Migration: `20250804143534_add_tanggal_to_score_history`
- Backward compatibility maintained untuk existing violation data

---

## [2025-08-04] - Constraint Wali Kelas

### Added

- **Validasi Wali Kelas Unik**: Setiap guru hanya bisa menjadi wali kelas untuk satu kelas
- **Endpoint Baru**: `GET /api/classrooms/available-teachers` - Mengambil daftar guru yang belum menjadi wali kelas
- **Database Constraint**: Menambahkan UNIQUE constraint pada kolom `waliKelasId` di tabel `Classroom`

### Changed

- **`createClassroom` Function**: Menambahkan validasi untuk mencegah duplikasi wali kelas
- **`updateClassroom` Function**: Menambahkan validasi untuk mencegah duplikasi wali kelas saat update
- **Prisma Schema**: Menambahkan `@unique` constraint pada `waliKelasId`

### Technical Details

- Migration: `20250804134017_add_unique_wali_kelas_constraint`
- Validasi dilakukan di level aplikasi (controller) dan database (schema constraint)
- Error handling yang informatif untuk pengguna

### API Endpoints

```
GET /api/classrooms/available-teachers
POST /api/classrooms (dengan validasi wali kelas)
PUT /api/classrooms/:id (dengan validasi wali kelas)
```

### Error Messages

- `"Guru sudah menjadi wali kelas di kelas lain"`
- `"Satu guru hanya bisa menjadi wali kelas untuk satu kelas"`

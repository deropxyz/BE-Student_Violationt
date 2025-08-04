# Changelog - SMK14 Student Violation System

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

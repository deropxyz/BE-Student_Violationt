# Dokumentasi Endpoint REST API

## Auth

- `POST /api/auth/login` — Login user

## Superadmin

- `GET /api/superadmin/users` — Get semua user (token superadmin)

## Kelola User

- `GET /api/users/teachers` — Get semua guru
- `POST /api/users/teachers` — Tambah guru
- `PUT /api/users/teachers/:id` — Update guru
- `DELETE /api/users/teachers/:id` — Hapus guru
- `GET /api/users/teachers/:id` — Detail guru
- `GET /api/users/teachers/search?q=...` — Cari guru
- `PUT /api/users/teachers/:id/reset-password` — Reset password guru

- `GET /api/users/students` — Get semua siswa
- `POST /api/users/students` — Tambah siswa
- `PUT /api/users/students/:id` — Update siswa
- `DELETE /api/users/students/:id` — Hapus siswa
- `GET /api/users/students/:id` — Detail siswa
- `GET /api/users/students/search?q=...` — Cari siswa
- `POST /api/users/students/import` — Import siswa dari Excel
- `GET /api/users/students/export` — Export data siswa ke Excel

- `GET /api/users/bk` — Get semua BK

## Kelola Kelas

- `GET /api/classroom` — Get semua kelas
- `POST /api/classroom` — Tambah kelas
- `PUT /api/classroom/:id` — Update kelas
- `DELETE /api/classroom/:id` — Hapus kelas
- `GET /api/classroom/:id/students` — Get siswa di kelas

## Kelola Pelanggaran

- `GET /api/violation` — Get semua jenis pelanggaran
- `POST /api/violation` — Tambah jenis pelanggaran (BK)
- `PUT /api/violation/:id` — Update jenis pelanggaran (BK)
- `DELETE /api/violation/:id` — Hapus jenis pelanggaran (BK)
- `GET /api/violation/:id` — Detail jenis pelanggaran

## Laporan Pelanggaran Siswa

- `POST /api/student-violation` — Input pelanggaran siswa (guru/BK)
- `GET /api/student-violation` — Get semua laporan pelanggaran siswa (BK/superadmin)
- `GET /api/student-violation/:id` — Detail laporan pelanggaran siswa
- `PUT /api/student-violation/:id` — Update laporan pelanggaran siswa (BK/superadmin)
- `DELETE /api/student-violation/:id` — Hapus laporan pelanggaran siswa (BK/superadmin)
- `PUT /api/student-violation/:id/approve` — Approval pelanggaran siswa (BK/superadmin)
- `PUT /api/student-violation/:id/reject` — Reject pelanggaran siswa (BK/superadmin)

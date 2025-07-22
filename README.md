# Dokumentasi Endpoint REST API

## Auth

- `POST /api/auth/login` — Login user

## Superadmin

- `GET /api/superadmin/users` — Get semua user (token superadmin)

## Kelola User

- `GET /api/users/teachers` — Get semua guru
- `POST /api/users/teachers` — Tambah guru
  Payload:
  ```json
  {
    "name": "",
    "email": ""
  }
  ```
- `PUT /api/users/teachers/:id` — Update guru
  Payload:
  ```json
  {
    "name": " ",
    "email": " "
  }
  ```
- `DELETE /api/users/teachers/:id` — Hapus guru
- `GET /api/users/teachers/:id` — Detail guru
- `GET /api/users/teachers/search?q=...` — Cari guru
- `PUT /api/users/teachers/:id/reset-password` — Reset password guru
  Payload:

  ```json
  {
    "password": " "
  }
  ```

- `GET /api/users/students` — Get semua siswa
- `POST /api/users/students` — Tambah siswa
  Payload:
  ```json
  {
    "nis": "2206012",
    "class": "XII RPL 1",
    "classroomId": 1
  }
  ```
- `PUT /api/users/students/:id` — Update siswa
  Payload:
  ```json
  {
    "nis": "",
    "class": " ",
    "classroomId": 1
  }
  ```
- `DELETE /api/users/students/:id` — Hapus siswa
- `GET /api/users/students/:id` — Detail siswa
- `GET /api/users/students/search?q=...` — Cari siswa
- `POST /api/users/students/import` — Import siswa dari Excel
  Payload:
  ```
  file Excel (.xlsx) dengan kolom: nis, name, kelas
  ```
- `GET /api/users/students/export` — Export data siswa ke Excel

- `GET /api/users/bk` — Get semua BK

## Kelola Kelas

- `GET /api/classroom` — Get semua kelas
- `POST /api/classroom` — Tambah kelas
  Payload:
  ```json
  {
    "name": " "
  }
  ```
- `PUT /api/classroom/:id` — Update kelas
  Payload:
  ```json
  {
    "name": " "
  }
  ```
- `DELETE /api/classroom/:id` — Hapus kelas
- `GET /api/classroom/:id/students` — Get siswa di kelas

## Kelola Pelanggaran

- `GET /api/violation` — Get semua jenis pelanggaran
- `POST /api/violation` — Tambah jenis pelanggaran (BK)
  Payload:
  ```json
  {
    "name": "Tidak memakai seragam",
    "category": "Kedisiplinan",
    "point": 10
  }
  ```
- `PUT /api/violation/:id` — Update jenis pelanggaran (BK)
  Payload:
  ```json
  {
    "name": "Terlambat",
    "category": "Kedisiplinan",
    "point": 5
  }
  ```
- `DELETE /api/violation/:id` — Hapus jenis pelanggaran (BK)
- `GET /api/violation/:id` — Detail jenis pelanggaran

## Laporan Pelanggaran Siswa

- `POST /api/student-violation` — Input pelanggaran siswa (guru/BK)
  Payload:
  ```json
  {
    "studentId": 1,
    "violationId": 2,
    "description": "Siswa tidak memakai seragam pada hari Senin."
  }
  ```
- `GET /api/student-violation` — Get semua laporan pelanggaran siswa (BK/superadmin)
- `GET /api/student-violation/:id` — Detail laporan pelanggaran siswa
- `PUT /api/student-violation/:id` — Update laporan pelanggaran siswa (BK/superadmin)
  Payload:
  ```json
  {
    "status": "approved",
    "description": "Sudah dikonfirmasi oleh BK"
  }
  ```
- `DELETE /api/student-violation/:id` — Hapus laporan pelanggaran siswa (BK/superadmin)
- `PUT /api/student-violation/:id/approve` — Approval pelanggaran siswa (BK/superadmin)
- `PUT /api/student-violation/:id/reject` — Reject pelanggaran siswa (BK/superadmin)

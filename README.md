# 📚 Dokumentasi API Sistem Kesiswaan SMK

## 🔐 Authentication

### Login

- **Endpoint**: `POST /api/auth/login`
- **Description**: Login untuk semua role user
- **Payload**:

  ```json
  // Login Guru, BK, Superadmin, Orang Tua (by email)
  {
    "email": "user@example.com",
    "password": "password123"
  }

  // Login Siswa (by NISN)
  {
    "nisn": "2024001001",
    "password": "password123"
  }
  ```

- **Response**:
  ```json
  {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "name": "John Doe",
      "role": "siswa",
      "email": "2024001001@smk14.sch.id",
      "studentId": 1,
      "nisn": "2024001001",
      "classroom": {
        "id": 1,
        "namaKelas": "XII RPL 1"
      },
      "totalScore": 50
    }
  }
  ```

---

## 👥 User Management

### 👨‍🏫 Teachers (Guru)

#### Get All Teachers

- **Endpoint**: `GET /api/users/teachers`
- **Access**: All roles
- **Response**:
  ```json
  [
    {
      "id": 1,
      "user": {
        "id": 1,
        "name": "Ahmad Guru",
        "email": "ahmad@smk14.com",
        "role": "guru"
      },
      "nip": "198501012010011001",
      "noHp": "081234567890",
      "alamat": "Jl. Merdeka No. 123",
      "classrooms": []
    }
  ]
  ```

#### Create Teacher

- **Endpoint**: `POST /api/users/teachers`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "name": "Ahmad Guru",
    "email": "ahmad@smk14.com",
    "nip": "198501012010011001",
    "noHp": "081234567890",
    "alamat": "Jl. Merdeka No. 123"
  }
  ```

#### Update Teacher

- **Endpoint**: `PUT /api/users/teachers/:id`
- **Access**: Superadmin only
- **Payload**: Same as create

#### Delete Teacher

- **Endpoint**: `DELETE /api/users/teachers/:id`
- **Access**: Superadmin only

#### Get Teacher Detail

- **Endpoint**: `GET /api/users/teachers/:id`
- **Access**: All roles

#### Search Teachers

- **Endpoint**: `GET /api/users/teachers/search?q=nama_atau_email`
- **Access**: All roles

#### Reset Teacher Password

- **Endpoint**: `PUT /api/users/teachers/:id/reset-password`
- **Access**: Superadmin only

### 👨‍🎓 Students (Siswa)

#### Get All Students

- **Endpoint**: `GET /api/users/students`
- **Query Params**: `?classroomId=1` (optional)
- **Access**: All roles
- **Response**:
  ```json
  [
    {
      "id": 1,
      "user": {
        "id": 2,
        "name": "Budi Siswa",
        "email": "2024001001@smk14.sch.id",
        "role": "siswa"
      },
      "nisn": "2024001001",
      "gender": "L",
      "tempatLahir": "Jakarta",
      "tglLahir": "2006-01-15T00:00:00.000Z",
      "alamat": "Jl. Siswa No. 456",
      "noHp": "081234567891",
      "totalScore": 50,
      "classroom": {
        "id": 1,
        "namaKelas": "XII RPL 1"
      },
      "angkatan": {
        "id": 1,
        "tahun": "2024"
      },
      "orangTua": {
        "id": 1,
        "user": {
          "name": "Ayah Budi"
        }
      },
      "violations": []
    }
  ]
  ```

#### Create Student

- **Endpoint**: `POST /api/users/students`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "nisn": "2024001001",
    "name": "Budi Siswa",
    "gender": "L", // "L" atau "P"
    "tempatLahir": "Jakarta",
    "tglLahir": "2006-01-15",
    "alamat": "Jl. Siswa No. 456",
    "noHp": "081234567891",
    "classroomId": 1,
    "angkatanId": 1,
    "orangTuaId": 1 // optional
  }
  ```
- **Note**: Email auto-generated: `{nisn}@smk14.sch.id`, Password default: `smkn14garut`

#### Update Student

- **Endpoint**: `PUT /api/users/students/:id`
- **Access**: Superadmin only
- **Payload**: Same as create (all fields optional)

#### Delete Student

- **Endpoint**: `DELETE /api/users/students/:id`
- **Access**: Superadmin only

#### Get Student Detail

- **Endpoint**: `GET /api/users/students/:id`
- **Access**: All roles

#### Search Students

- **Endpoint**: `GET /api/users/students/search?q=nama_atau_nisn`
- **Access**: All roles

#### Import Students from Excel

- **Endpoint**: `POST /api/users/students/import`
- **Access**: Superadmin only
- **Content-Type**: `multipart/form-data`
- **File Format**: Excel (.xlsx) with columns: `nisn`, `nama`, `gender`, `tempatLahir`, `tglLahir`, `alamat`, `noHp`, `kelas`, `angkatan`

#### Export Students to Excel

- **Endpoint**: `GET /api/users/students/export`
- **Access**: Superadmin only

### 👨‍💼 BK (Bimbingan Konseling)

#### Get All BK

- **Endpoint**: `GET /api/users/bk`
- **Access**: All roles

#### Create BK

- **Endpoint**: `POST /api/users/bk`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "name": "Bu Konselor",
    "email": "konselor@smk14.com",
    "nip": "198001012005012001", // optional
    "noHp": "081234567892",
    "alamat": "Jl. BK No. 789"
  }
  ```

#### Update BK

- **Endpoint**: `PUT /api/users/bk/:id`
- **Access**: Superadmin only

#### Delete BK

- **Endpoint**: `DELETE /api/users/bk/:id`
- **Access**: Superadmin only

### 👪 Orang Tua

#### Get All Orang Tua

- **Endpoint**: `GET /api/users/orangtua`
- **Access**: Superadmin only
- **Response**:
  ```json
  [
    {
      "id": 1,
      "user": {
        "id": 5,
        "name": "Ayah Budi",
        "email": "ayahbudi@gmail.com",
        "role": "orangtua"
      },
      "noHp": "081234567893",
      "alamat": "Jl. Orang Tua No. 999",
      "pekerjaan": "Wiraswasta",
      "children": [
        {
          "id": 1,
          "user": {
            "name": "Budi Siswa"
          },
          "nisn": "2024001001",
          "classroom": {
            "namaKelas": "XII RPL 1"
          }
        }
      ]
    }
  ]
  ```

#### Create Orang Tua

- **Endpoint**: `POST /api/users/orangtua`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "name": "Ayah Budi",
    "email": "ayahbudi@gmail.com",
    "noHp": "081234567893",
    "alamat": "Jl. Orang Tua No. 999",
    "pekerjaan": "Wiraswasta"
  }
  ```

#### Update Orang Tua

- **Endpoint**: `PUT /api/users/orangtua/:id`
- **Access**: Superadmin only

#### Delete Orang Tua

- **Endpoint**: `DELETE /api/users/orangtua/:id`
- **Access**: Superadmin only

---

## 🏫 Classroom Management

### Get All Classrooms

- **Endpoint**: `GET /api/classrooms`
- **Access**: All roles
- **Response**:
  ```json
  [
    {
      "id": 1,
      "kodeKelas": "XII-RPL-1",
      "namaKelas": "XII RPL 1",
      "jmlSiswa": 25,
      "waliKelas": {
        "id": 1,
        "user": {
          "name": "Ahmad Guru",
          "email": "ahmad@smk14.com"
        },
        "nip": "198501012010011001"
      },
      "students": []
    }
  ]
  ```

### Create Classroom

- **Endpoint**: `POST /api/classrooms`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "kodeKelas": "XII-RPL-1",
    "namaKelas": "XII RPL 1",
    "waliKelasId": 1
  }
  ```

### Update Classroom

- **Endpoint**: `PUT /api/classrooms/:id`
- **Access**: Superadmin only
- **Payload**: Same as create

### Delete Classroom

- **Endpoint**: `DELETE /api/classrooms/:id`
- **Access**: Superadmin only

### Get Students in Class

- **Endpoint**: `GET /api/classrooms/:id/students`
- **Access**: All roles

### Assign Student to Class

- **Endpoint**: `PUT /api/classrooms/:classroomId/assign/:studentId`
- **Access**: Superadmin only

### Move Students to New Class

- **Endpoint**: `PUT /api/classrooms/move-students`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "fromClassId": 1,
    "toClassId": 2
  }
  ```

---

## 📚 Angkatan Management

### Get All Angkatan

- **Endpoint**: `GET /api/angkatan`
- **Access**: Superadmin only
- **Response**:
  ```json
  [
    {
      "id": 1,
      "tahun": "2024",
      "lulusDate": "2027-06-15T00:00:00.000Z",
      "students": []
    }
  ]
  ```

### Create Angkatan

- **Endpoint**: `POST /api/angkatan`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "tahun": "2024",
    "lulusDate": "2027-06-15" // optional
  }
  ```

### Update Angkatan

- **Endpoint**: `PUT /api/angkatan/:id`
- **Access**: Superadmin only

### Delete Angkatan

- **Endpoint**: `DELETE /api/angkatan/:id`
- **Access**: Superadmin only

---

## ⚠️ Violation Management

### Get All Violations

- **Endpoint**: `GET /api/violations`
- **Access**: BK, Superadmin
- **Response**:
  ```json
  [
    {
      "id": 1,
      "nama": "Terlambat ke sekolah",
      "kategori": "ringan", // "ringan", "sedang", "berat"
      "jenis": "kedisiplinan", // "kedisiplinan", "akademik", "lainnya"
      "point": 10,
      "tipe": "pelanggaran", // "pelanggaran", "prestasi"
      "isActive": true,
      "createdAt": "2024-07-28T00:00:00.000Z"
    }
  ]
  ```

### Create Violation

- **Endpoint**: `POST /api/violations`
- **Access**: BK, Superadmin
- **Payload**:
  ```json
  {
    "nama": "Terlambat ke sekolah",
    "kategori": "ringan",
    "jenis": "kedisiplinan",
    "point": 10,
    "tipe": "pelanggaran"
  }
  ```

### Update Violation

- **Endpoint**: `PUT /api/violations/:id`
- **Access**: BK, Superadmin
- **Payload**: Same as create

### Delete Violation

- **Endpoint**: `DELETE /api/violations/:id`
- **Access**: BK, Superadmin

### Get Violation Detail

- **Endpoint**: `GET /api/violations/:id`
- **Access**: BK, Superadmin

---

## 📝 Student Violation Reports

### Get All Student Violations

- **Endpoint**: `GET /api/student-violations`
- **Access**: BK, Superadmin
- **Response**:
  ```json
  [
    {
      "id": 1,
      "student": {
        "id": 1,
        "user": {
          "name": "Budi Siswa"
        },
        "nisn": "2024001001",
        "classroom": {
          "namaKelas": "XII RPL 1"
        }
      },
      "violation": {
        "id": 1,
        "nama": "Terlambat ke sekolah",
        "kategori": "ringan",
        "point": 10
      },
      "reporter": {
        "id": 1,
        "name": "Ahmad Guru"
      },
      "tanggal": "2024-07-28T07:30:00.000Z",
      "waktu": "2024-07-28T07:15:00.000Z",
      "deskripsi": "Terlambat 15 menit",
      "evidenceUrl": "https://example.com/evidence.jpg",
      "pointSaat": 10,
      "createdAt": "2024-07-28T08:00:00.000Z"
    }
  ]
  ```

### Create Student Violation Report

- **Endpoint**: `POST /api/student-violations`
- **Access**: Guru, BK
- **Payload**:
  ```json
  {
    "studentId": 1,
    "violationId": 1,
    "tanggal": "2024-07-28", // optional, default: today
    "waktu": "2024-07-28T07:15:00.000Z", // optional
    "deskripsi": "Terlambat 15 menit",
    "evidenceUrl": "https://example.com/evidence.jpg" // optional
  }
  ```
- **Note**: Akan otomatis menghitung dan update total score siswa

### Update Student Violation

- **Endpoint**: `PUT /api/student-violations/:id`
- **Access**: BK, Superadmin
- **Payload**:
  ```json
  {
    "tanggal": "2024-07-28",
    "waktu": "2024-07-28T07:15:00.000Z",
    "deskripsi": "Terlambat 15 menit (update)",
    "evidenceUrl": "https://example.com/evidence-new.jpg"
  }
  ```

### Delete Student Violation

- **Endpoint**: `DELETE /api/student-violations/:id`
- **Access**: BK, Superadmin

### Get Student Violation Detail

- **Endpoint**: `GET /api/student-violations/:id`
- **Access**: BK, Superadmin

---

## 🚨 Tindakan Otomatis Management

### Get All Tindakan Otomatis

- **Endpoint**: `GET /api/tindakan-otomatis`
- **Access**: BK, Superadmin
- **Response**:
  ```json
  [
    {
      "id": 1,
      "minPoint": 100,
      "maxPoint": 199,
      "namaTindakan": "SP1",
      "deskripsi": "Surat Peringatan 1",
      "isActive": true
    },
    {
      "id": 2,
      "minPoint": 200,
      "maxPoint": 299,
      "namaTindakan": "Panggil Orang Tua",
      "deskripsi": "Panggil orang tua ke sekolah",
      "isActive": true
    },
    {
      "id": 3,
      "minPoint": 300,
      "maxPoint": null,
      "namaTindakan": "Drop Out",
      "deskripsi": "Dikeluarkan dari sekolah",
      "isActive": true
    }
  ]
  ```

### Create Tindakan Otomatis

- **Endpoint**: `POST /api/tindakan-otomatis`
- **Access**: BK, Superadmin
- **Payload**:
  ```json
  {
    "minPoint": 100,
    "maxPoint": 199, // optional
    "namaTindakan": "SP1",
    "deskripsi": "Surat Peringatan 1"
  }
  ```

### Update Tindakan Otomatis

- **Endpoint**: `PUT /api/tindakan-otomatis/:id`
- **Access**: BK, Superadmin
- **Payload**: Same as create + `isActive: boolean`

### Delete Tindakan Otomatis

- **Endpoint**: `DELETE /api/tindakan-otomatis/:id`
- **Access**: BK, Superadmin

---

## 🎓 Kenaikan Kelas

### Generate Kenaikan Kelas

- **Endpoint**: `POST /api/kenaikan-kelas/generate`
- **Access**: Superadmin only
- **Payload**:
  ```json
  {
    "tahunAjaran": "2024/2025",
    "deskripsi": "Kenaikan kelas semester genap"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Kenaikan kelas berhasil diproses",
    "data": {
      "id": 1,
      "tahunAjaran": "2024/2025",
      "tanggalProses": "2024-07-28T10:00:00.000Z",
      "deskripsi": "Kenaikan kelas semester genap",
      "totalSiswa": 100,
      "sukses": 85,
      "gagal": 15
    },
    "detail": {
      "totalSiswa": 100,
      "sukses": 85,
      "gagal": 15
    }
  }
  ```

### Get All Kenaikan Kelas Records

- **Endpoint**: `GET /api/kenaikan-kelas`
- **Access**: Superadmin, BK

### Get Kenaikan Kelas Detail

- **Endpoint**: `GET /api/kenaikan-kelas/:id`
- **Access**: Superadmin, BK

---

## 📊 Reports & Statistics

### Get Violation Statistics

- **Endpoint**: `GET /api/reports/statistics`
- **Access**: BK, Guru, Superadmin
- **Query Params**: `?startDate=2024-07-01&endDate=2024-07-31`
- **Response**:
  ```json
  {
    "summary": {
      "totalViolations": 50,
      "totalStudentsAffected": 25,
      "totalPoints": 500
    },
    "violationsByType": {
      "Terlambat ke sekolah": {
        "count": 20,
        "totalPoints": 200,
        "category": "ringan",
        "jenis": "kedisiplinan"
      }
    },
    "violationsByStudent": [
      {
        "student": {
          "id": 1,
          "user": { "name": "Budi Siswa" },
          "nisn": "2024001001"
        },
        "violations": [],
        "totalPoints": 30
      }
    ],
    "violationsByClass": {
      "XII RPL 1": {
        "count": 15,
        "totalPoints": 150,
        "uniqueStudents": 8
      }
    }
  }
  ```

### Get Weekly Violations

- **Endpoint**: `GET /api/reports/weekly`
- **Access**: BK, Superadmin
- **Response**:
  ```json
  {
    "period": "weekly",
    "startDate": "2024-07-22T00:00:00.000Z",
    "endDate": "2024-07-28T23:59:59.999Z",
    "violations": []
  }
  ```

### Get Monthly Violations

- **Endpoint**: `GET /api/reports/monthly`
- **Access**: BK, Superadmin

### Get Class Violation Report

- **Endpoint**: `GET /api/reports/class/:classroomId`
- **Access**: BK, Guru (Wali Kelas), Superadmin
- **Response**:
  ```json
  {
    "classroom": {
      "id": 1,
      "namaKelas": "XII RPL 1",
      "waliKelas": {
        "user": { "name": "Ahmad Guru" }
      }
    },
    "violations": [],
    "students": [],
    "summary": {
      "totalStudents": 25,
      "totalViolations": 15,
      "studentsWithViolations": 8
    }
  }
  ```

---

## 🔔 Notifications & Student Dashboard

### Get Student Dashboard

- **Endpoint**: `GET /api/notifications/dashboard/:studentId`
- **Access**: Siswa, Orang Tua, BK, Superadmin
- **Response**:
  ```json
  {
    "student": {
      "id": 1,
      "user": { "name": "Budi Siswa" },
      "nisn": "2024001001",
      "totalScore": 50,
      "classroom": { "namaKelas": "XII RPL 1" },
      "violations": [],
      "notifications": []
    },
    "scoreHistory": [
      {
        "id": 1,
        "pointLama": 40,
        "pointBaru": 50,
        "alasan": "Pelanggaran: Terlambat ke sekolah",
        "createdAt": "2024-07-28T08:00:00.000Z"
      }
    ],
    "tindakanOtomatis": [],
    "summary": {
      "totalScore": 50,
      "totalViolations": 5,
      "unreadNotifications": 2
    }
  }
  ```

### Get Student Notifications

- **Endpoint**: `GET /api/notifications/:studentId`
- **Access**: Siswa, Orang Tua, BK, Superadmin
- **Response**:
  ```json
  [
    {
      "id": 1,
      "studentId": 1,
      "judul": "Pelanggaran Baru",
      "pesan": "Anda mendapat pelanggaran: Terlambat ke sekolah",
      "isRead": false,
      "createdAt": "2024-07-28T08:00:00.000Z"
    }
  ]
  ```

### Mark Notification as Read

- **Endpoint**: `PUT /api/notifications/read/:id`
- **Access**: Siswa, Orang Tua

---

## 📥 Import Data

### Import from Excel

- **Endpoint**: `POST /api/import/:type`
- **Access**: Superadmin only
- **Types**: `students`, `teachers`, `bk`
- **Content-Type**: `multipart/form-data`
- **File Field**: `file`

#### Excel Format for Students:

| nisn       | nama       | gender | tempatLahir | tglLahir   | alamat            | noHp         | kelas     | angkatan |
| ---------- | ---------- | ------ | ----------- | ---------- | ----------------- | ------------ | --------- | -------- |
| 2024001001 | Budi Siswa | L      | Jakarta     | 2006-01-15 | Jl. Siswa No. 456 | 081234567891 | XII RPL 1 | 2024     |

#### Excel Format for Teachers:

| nama       | email           | nip                | noHp         | alamat              |
| ---------- | --------------- | ------------------ | ------------ | ------------------- |
| Ahmad Guru | ahmad@smk14.com | 198501012010011001 | 081234567890 | Jl. Merdeka No. 123 |

#### Excel Format for BK:

| nama        | email              | nip                | noHp         | alamat         |
| ----------- | ------------------ | ------------------ | ------------ | -------------- |
| Bu Konselor | konselor@smk14.com | 198001012005012001 | 081234567892 | Jl. BK No. 789 |

- **Response**:
  ```json
  {
    "message": "Import students berhasil",
    "imported": 45,
    "errors": 5,
    "errorDetails": []
  }
  ```

---

## 🔒 Role-based Access Control

### Role Permissions:

#### **Superadmin**

- ✅ Full access to all endpoints
- ✅ User management (CRUD)
- ✅ System configuration
- ✅ Data import/export
- ✅ Class promotion generation

#### **BK (Bimbingan Konseling)**

- ✅ Violation management (CRUD)
- ✅ Student violation reports (view, create, update, delete)
- ✅ Automatic action management
- ✅ Reports and statistics
- ✅ Student monitoring

#### **Guru (Teacher)**

- ✅ Create student violation reports
- ✅ View student data
- ✅ View class reports (if wali kelas)
- ✅ Basic statistics access

#### **Siswa (Student)**

- ✅ View own violations and score
- ✅ View own notifications
- ✅ Dashboard access

#### **Orang Tua (Parent)**

- ✅ View child's violations and score
- ✅ View child's notifications
- ✅ Monitor child's progress

---

## 📋 Important Notes

### Default Credentials:

- **Teachers/BK**: Password = `smkn14@garut`
- **Students**: Password = `smkn14garut`
- **Parents**: Password = `smkn14@garut`

### Auto-generated Fields:

- **Student Email**: `{nisn}@smk14.sch.id`
- **Score Calculation**: Automatic when violations are reported
- **Notifications**: Auto-created when violations are reported

### Date Formats:

- Use ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- For date-only fields: `YYYY-MM-DD`

### File Upload:

- **Evidence**: Images/documents for violation reports
- **Import**: Excel files (.xlsx format only)

### Error Responses:

```json
{
  "error": "Error message here"
}
```

### Success Responses:

```json
{
  "message": "Success message here",
  "data": {}
}
```

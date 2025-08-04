# API Documentation - Pelanggaran dan Prestasi Terpisah

## Endpoints Achievement (Prestasi)

### Master Data Prestasi

#### GET /api/achievements

**Deskripsi**: Mengambil semua data prestasi  
**Auth**: Tidak diperlukan  
**Response**:

```json
[
  {
    "id": 1,
    "nama": "Juara 1 Olimpiade Matematika",
    "kategori": "akademik",
    "point": 50,
    "isActive": true,
    "createdAt": "2025-08-04T14:40:52.648Z"
  }
]
```

#### GET /api/achievements/:id

**Deskripsi**: Mengambil detail prestasi berdasarkan ID  
**Auth**: Tidak diperlukan

#### POST /api/achievements

**Deskripsi**: Menambah data prestasi baru  
**Auth**: Bearer Token (guru, superadmin)  
**Body**:

```json
{
  "nama": "Juara 1 Olimpiade Biologi",
  "kategori": "akademik",
  "point": 50
}
```

#### PUT /api/achievements/:id

**Deskripsi**: Update data prestasi  
**Auth**: Bearer Token (guru, superadmin)

#### DELETE /api/achievements/:id

**Deskripsi**: Hapus data prestasi  
**Auth**: Bearer Token (superadmin)

---

## Endpoints Student Achievement (Laporan Prestasi)

#### GET /api/student-achievements

**Deskripsi**: Mengambil semua laporan prestasi siswa  
**Auth**: Bearer Token (semua role)  
**Response**:

```json
[
  {
    "id": 1,
    "studentId": 1,
    "achievementId": 1,
    "reporterId": 2,
    "tanggal": "2025-08-04T14:30:00.000Z",
    "deskripsi": "Meraih juara 1 olimpiade matematika tingkat kabupaten",
    "pointSaat": 50,
    "student": {
      "user": { "name": "Ahmad Siswa" },
      "classroom": { "namaKelas": "XII RPL 1" }
    },
    "achievement": {
      "nama": "Juara 1 Olimpiade Matematika",
      "kategori": "akademik"
    },
    "reporter": {
      "name": "Guru Matematika"
    }
  }
]
```

#### POST /api/student-achievements

**Deskripsi**: Input laporan prestasi siswa  
**Auth**: Bearer Token (guru, bk)  
**Body**:

```json
{
  "studentId": 1,
  "achievementId": 1,
  "tanggal": "2025-08-04",
  "deskripsi": "Meraih juara 1 olimpiade matematika tingkat kabupaten",
  "evidenceUrl": "https://example.com/certificate.jpg"
}
```

**Proses**:

1. Ambil data achievement untuk mendapatkan point
2. Kurangi totalScore siswa dengan point prestasi (minimum 0)
3. Buat record StudentAchievement
4. Update totalScore siswa
5. Buat histori perubahan score

#### PUT /api/student-achievements/:id

**Deskripsi**: Update laporan prestasi  
**Auth**: Bearer Token (guru, bk)

#### DELETE /api/student-achievements/:id

**Deskripsi**: Hapus laporan prestasi dan kembalikan poin  
**Auth**: Bearer Token (bk, superadmin)

---

## Kategori Prestasi

- **akademik**: Prestasi dalam bidang akademik
- **non_akademik**: Prestasi non-akademik (teknologi, dll)
- **olahraga**: Prestasi dalam bidang olahraga
- **kesenian**: Prestasi dalam bidang seni dan budaya
- **lainnya**: Prestasi lainnya (teladan, dll)

---

## Logika Score

### Score Calculation

- **Pelanggaran**: `totalScore = totalScore + violationPoint`
- **Prestasi**: `totalScore = max(0, totalScore - achievementPoint)`

### Contoh Skenario

1. Siswa awal: `totalScore = 0`
2. Melakukan pelanggaran 100 poin: `totalScore = 100`
3. Mendapat prestasi 30 poin: `totalScore = 70`
4. Mendapat prestasi 80 poin: `totalScore = 0` (tidak negatif)

### Score History

Setiap perubahan score tercatat di tabel `ScoreHistory` dengan:

- `pointLama`: Score sebelum perubahan
- `pointBaru`: Score setelah perubahan
- `alasan`: "Pelanggaran: [nama]" atau "Prestasi: [nama]"
- `tanggal`: Timestamp perubahan

---

## Migration History

1. `20250804143210_separate_violation_achievement`: Pisahkan violation dan achievement
2. `20250804143534_add_tanggal_to_score_history`: Tambah field tanggal di ScoreHistory

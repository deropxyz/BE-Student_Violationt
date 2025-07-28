# 🚀 Frontend Integration Quick Guide

## 📋 Essential Information for Frontend Development

### 🔑 Authentication Headers

All API requests (except login) require authentication header:

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 🎯 Base URL

```javascript
const API_BASE_URL = "http://localhost:3000/api";
// or for production: 'https://your-production-url.com/api'
```

---

## 🔐 Login Examples

### Login Siswa (by NISN)

```javascript
const loginStudent = async (nisn, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nisn: nisn,
      password: password,
    }),
  });

  const data = await response.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};
```

### Login Guru/BK/Admin (by Email)

```javascript
const loginByEmail = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });

  return await response.json();
};
```

---

## 📝 Common CRUD Operations

### Get Data with Authentication

```javascript
const getDataWithAuth = async (endpoint) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
};

// Usage examples:
// const students = await getDataWithAuth('/users/students');
// const violations = await getDataWithAuth('/violations');
// const classrooms = await getDataWithAuth('/classrooms');
```

### Create Data

```javascript
const createData = async (endpoint, data) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await response.json();
};

// Usage example:
// const newStudent = await createData('/users/students', studentData);
```

### Update Data

```javascript
const updateData = async (endpoint, data) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await response.json();
};

// Usage example:
// const updated = await updateData('/users/students/1', updatedData);
```

### Delete Data

```javascript
const deleteData = async (endpoint) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
};

// Usage example:
// await deleteData('/users/students/1');
```

---

## 📤 File Upload (Excel Import)

### Import Students from Excel

```javascript
const importStudents = async (file) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/import/students`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type for FormData - browser will set it automatically
    },
    body: formData,
  });

  return await response.json();
};
```

### Report Violation with Evidence

```javascript
const reportViolationWithEvidence = async (violationData, evidenceFile) => {
  const token = localStorage.getItem("token");

  // First upload evidence if provided
  let evidenceUrl = null;
  if (evidenceFile) {
    const formData = new FormData();
    formData.append("evidence", evidenceFile);

    const uploadResponse = await fetch(`${API_BASE_URL}/upload/evidence`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadResult = await uploadResponse.json();
    evidenceUrl = uploadResult.url;
  }

  // Then create violation report
  const reportData = {
    ...violationData,
    evidenceUrl: evidenceUrl,
  };

  return await createData("/student-violations", reportData);
};
```

---

## 📊 Common Data Structures

### Student Data Structure

```javascript
const studentExample = {
  id: 1,
  user: {
    id: 2,
    name: "Budi Siswa",
    email: "2024001001@smk14.sch.id",
    role: "siswa",
  },
  nisn: "2024001001",
  gender: "L", // "L" or "P"
  tempatLahir: "Jakarta",
  tglLahir: "2006-01-15T00:00:00.000Z",
  alamat: "Jl. Siswa No. 456",
  noHp: "081234567891",
  totalScore: 50,
  classroom: {
    id: 1,
    namaKelas: "XII RPL 1",
  },
  angkatan: {
    id: 1,
    tahun: "2024",
  },
};
```

### Violation Data Structure

```javascript
const violationExample = {
  id: 1,
  nama: "Terlambat ke sekolah",
  kategori: "ringan", // "ringan", "sedang", "berat"
  jenis: "kedisiplinan", // "kedisiplinan", "akademik", "lainnya"
  point: 10,
  tipe: "pelanggaran", // "pelanggaran", "prestasi"
  isActive: true,
};
```

### Student Violation Report Structure

```javascript
const violationReportExample = {
  id: 1,
  student: studentExample,
  violation: violationExample,
  reporter: {
    id: 1,
    name: "Ahmad Guru",
  },
  tanggal: "2024-07-28T07:30:00.000Z",
  waktu: "2024-07-28T07:15:00.000Z", // optional
  deskripsi: "Terlambat 15 menit",
  evidenceUrl: "https://example.com/evidence.jpg", // optional
  pointSaat: 10,
};
```

---

## 🎨 Frontend Form Examples

### Student Registration Form Data

```javascript
const studentFormData = {
  nisn: "2024001001",
  name: "Budi Siswa",
  gender: "L",
  tempatLahir: "Jakarta",
  tglLahir: "2006-01-15", // Use date input format
  alamat: "Jl. Siswa No. 456",
  noHp: "081234567891",
  classroomId: 1, // From classroom dropdown
  angkatanId: 1, // From angkatan dropdown
  orangTuaId: 1, // Optional, from parent dropdown
};
```

### Violation Report Form Data

```javascript
const violationFormData = {
  studentId: 1, // From student dropdown/search
  violationId: 1, // From violation dropdown
  tanggal: "2024-07-28", // Date picker
  waktu: "2024-07-28T07:15:00", // Time picker (optional)
  deskripsi: "Terlambat 15 menit", // Text area
  evidenceUrl: "url_if_file_uploaded", // Optional
};
```

### Classroom Form Data

```javascript
const classroomFormData = {
  kodeKelas: "XII-RPL-1",
  namaKelas: "XII RPL 1",
  waliKelasId: 1, // From teacher dropdown
};
```

---

## 🔍 Search & Filter Examples

### Search Students

```javascript
const searchStudents = async (query) => {
  return await getDataWithAuth(
    `/users/students/search?q=${encodeURIComponent(query)}`
  );
};
```

### Get Students by Class

```javascript
const getStudentsByClass = async (classroomId) => {
  return await getDataWithAuth(`/users/students?classroomId=${classroomId}`);
};
```

### Get Violation Statistics

```javascript
const getViolationStats = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  return await getDataWithAuth(`/reports/statistics?${params.toString()}`);
};
```

---

## 🚨 Error Handling

### Standard Error Response

```javascript
const handleApiCall = async (apiFunction) => {
  try {
    const result = await apiFunction();

    if (result.error) {
      // API returned error
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    // Network or other errors
    console.error("API Error:", error);
    throw error;
  }
};

// Usage:
try {
  const students = await handleApiCall(() =>
    getDataWithAuth("/users/students")
  );
  // Process successful result
} catch (error) {
  // Handle error (show toast, alert, etc.)
  alert("Error: " + error.message);
}
```

---

## 📱 Role-based UI Components

### Check User Role

```javascript
const user = JSON.parse(localStorage.getItem("user"));
const userRole = user?.role;

// Show/hide components based on role
const canCreateStudent = userRole === "superadmin";
const canReportViolation = ["guru", "bk"].includes(userRole);
const canViewReports = ["bk", "superadmin", "guru"].includes(userRole);
```

### Role-based Navigation

```javascript
const getNavigation = (userRole) => {
  const baseNav = [{ path: "/dashboard", label: "Dashboard", roles: ["all"] }];

  const adminNav = [
    { path: "/students", label: "Kelola Siswa", roles: ["superadmin"] },
    { path: "/teachers", label: "Kelola Guru", roles: ["superadmin"] },
    { path: "/classrooms", label: "Kelola Kelas", roles: ["superadmin"] },
  ];

  const bkNav = [
    {
      path: "/violations",
      label: "Kelola Pelanggaran",
      roles: ["bk", "superadmin"],
    },
    { path: "/reports", label: "Laporan", roles: ["bk", "superadmin"] },
  ];

  const teacherNav = [
    {
      path: "/report-violation",
      label: "Lapor Pelanggaran",
      roles: ["guru", "bk"],
    },
  ];

  // Filter navigation based on user role
  return [...baseNav, ...adminNav, ...bkNav, ...teacherNav].filter(
    (item) => item.roles.includes("all") || item.roles.includes(userRole)
  );
};
```

---

## 💡 Best Practices

### 1. Token Management

```javascript
// Check if token is expired
const isTokenExpired = () => {
  const token = localStorage.getItem("token");
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Auto logout on token expiry
if (isTokenExpired()) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}
```

### 2. Loading States

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    const result = await getDataWithAuth("/users/students");
    setStudents(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 3. Form Validation

```javascript
const validateStudentForm = (data) => {
  const errors = {};

  if (!data.nisn) errors.nisn = "NISN harus diisi";
  if (!data.name) errors.name = "Nama harus diisi";
  if (!data.gender) errors.gender = "Jenis kelamin harus dipilih";
  if (!data.classroomId) errors.classroomId = "Kelas harus dipilih";

  return errors;
};
```

---

## 📚 Useful Utils

### Date Formatting

```javascript
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("id-ID");
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString("id-ID");
};
```

### Score Color Coding

```javascript
const getScoreColor = (score) => {
  if (score >= 300) return "red"; // Danger
  if (score >= 200) return "orange"; // Warning
  if (score >= 100) return "yellow"; // Caution
  return "green"; // Good
};
```

### Role Display Names

```javascript
const getRoleDisplayName = (role) => {
  const roleNames = {
    superadmin: "Super Admin",
    guru: "Guru",
    bk: "BK",
    siswa: "Siswa",
    orangtua: "Orang Tua",
  };
  return roleNames[role] || role;
};
```

This quick guide should help the frontend team integrate with your API effectively! 🚀

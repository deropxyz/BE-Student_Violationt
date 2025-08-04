# 🧪 SMK14 API Testing Guide

## 📋 Overview

This guide provides comprehensive instructions for testing the SMK14 Student Violation Management API using Postman.

## 🚀 Quick Start

### 1. Import Collection & Environments

1. Open Postman
2. Click **Import** button
3. Select and import these files:
   - `SMK14_API_Collection.postman_collection.json`
   - `SMK14_Local.postman_environment.json`
   - `SMK14_Production.postman_environment.json`

### 2. Select Environment

- For local testing: Select **SMK14 Local Environment**
- For production testing: Select **SMK14 Production Environment**

### 3. Start Testing

1. Run **Authentication > Login - Superadmin** first to get auth token
2. The token will be automatically saved to environment variables
3. All subsequent requests will use this token automatically

## 🔐 Authentication Flow

### Available User Types & Credentials

| Role           | Email/Login                | Password      | Token Variable |
| -------------- | -------------------------- | ------------- | -------------- |
| **Superadmin** | `superadmin@smk14.com`     | `superadmin`  | `authToken`    |
| **Teacher**    | `ahmad.suryadi@smk14.com`  | `smkn14garut` | `teacherToken` |
| **BK**         | `bk@smk14.com`             | `smkn14garut` | `bkToken`      |
| **Student**    | NISN: `2024001001`         | `smkn14garut` | `studentToken` |
| **Parent**     | `bambang.wijaya@gmail.com` | `smkn14garut` | `parentToken`  |

### Login Sequence

1. **Login - Superadmin** → Gets admin access token
2. **Login - Teacher** → Gets teacher access token
3. **Login - Student (NISN)** → Gets student access token
4. **Login - BK** → Gets BK staff access token
5. **Login - Parent** → Gets parent access token

## 📊 Test Scenarios

### 🎯 **Scenario 1: Complete User Management Flow**

```
1. Authentication > Login - Superadmin
2. User Management > Teachers > Get All Teachers
3. User Management > Teachers > Create Teacher
4. User Management > Students > Get All Students
5. User Management > Students > Create Student
6. User Management > Parents > Create Parent
```

### 🎯 **Scenario 2: Violation Management Flow**

```
1. Authentication > Login - Teacher
2. Violation Management > Violations > Create Violation
3. Violation Management > Student Violations > Create Student Violation
4. Reports & Analytics > Dashboard Stats
5. Authentication > Login - Student (NISN)
6. Violation Management > Student Violations > My Violations
```

### 🎯 **Scenario 3: Academic Management Flow**

```
1. Authentication > Login - Superadmin
2. Academic Management > Classrooms > Create Classroom
3. Academic Management > Angkatan > Create Angkatan
4. User Management > Students > Create Student (with classroom)
5. Academic Management > Classrooms > Get All Classrooms
```

### 🎯 **Scenario 4: Reporting & Analytics Flow**

```
1. Authentication > Login - Superadmin
2. Reports & Analytics > Dashboard Stats
3. Reports & Analytics > Student Rankings
4. Reports & Analytics > Monthly Statistics
5. Reports & Analytics > Export Students Excel
6. Reports & Analytics > Export Violations Excel
```

### 🎯 **Scenario 5: Import Data Flow**

```
1. Authentication > Login - Superadmin
2. Import Data > Download Students Template
3. Import Data > Import Students Excel (prepare Excel file)
4. Import Data > Import Teachers Excel
5. User Management > Students > Get All Students (verify import)
```

## 🔍 Testing Guidelines

### ✅ **What to Test**

#### **Authentication Tests**

- [ ] Valid login credentials
- [ ] Invalid login credentials
- [ ] Token expiration handling
- [ ] Role-based access control
- [ ] Student NISN-based login

#### **CRUD Operations Tests**

- [ ] Create operations (POST)
- [ ] Read operations (GET)
- [ ] Update operations (PUT)
- [ ] Delete operations (DELETE)
- [ ] Data validation
- [ ] Required field validation

#### **Business Logic Tests**

- [ ] Automatic score calculation
- [ ] Score history tracking
- [ ] Notification generation
- [ ] Role-based data access
- [ ] Automatic disciplinary actions

#### **File Operations Tests**

- [ ] Excel import functionality
- [ ] Excel export functionality
- [ ] File upload validation
- [ ] Template downloads

#### **Error Handling Tests**

- [ ] Invalid data submission
- [ ] Unauthorized access attempts
- [ ] Non-existent resource requests
- [ ] Server error responses

### ⚠️ **Common Test Cases**

#### **Authentication Errors**

```json
// Invalid credentials
{
  "email": "wrong@email.com",
  "password": "wrongpassword"
}

// Missing fields
{
  "email": "test@email.com"
}
```

#### **Validation Errors**

```json
// Invalid email format
{
  "name": "Test User",
  "email": "invalid-email",
  "password": "password123"
}

// Missing required fields
{
  "name": "Test Student"
  // Missing nisn, classroomId, etc.
}
```

#### **Authorization Errors**

- Access student endpoints with teacher token
- Access admin endpoints with student token
- Access other user's private data

## 📈 Expected Response Formats

### ✅ **Success Response**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### ❌ **Error Response**

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors array
  ]
}
```

### 🔐 **Authentication Response**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@email.com",
    "role": "superadmin"
  }
}
```

## 🧪 Advanced Testing

### **Automated Test Scripts**

Each request includes test scripts that automatically:

- Validate response time (< 3000ms)
- Check JSON format
- Store tokens in environment variables
- Validate response structure

### **Collection Runner**

1. Select the entire collection
2. Click **Run Collection**
3. Select environment
4. Run all tests automatically
5. View detailed test results

### **Load Testing**

- Use multiple iterations in Collection Runner
- Test concurrent user scenarios
- Monitor response times under load

## 🔧 Troubleshooting

### **Common Issues**

#### **Token Issues**

- **Problem**: "Unauthorized" errors
- **Solution**: Re-run login request to refresh token

#### **Environment Issues**

- **Problem**: Variables not working
- **Solution**: Ensure correct environment is selected

#### **Server Connection**

- **Problem**: Connection refused
- **Solution**: Verify server is running on correct port

#### **CORS Issues**

- **Problem**: CORS errors in browser
- **Solution**: Use Postman desktop app, not web version

### **Debug Steps**

1. Check Console tab for detailed errors
2. Verify environment variables are set
3. Test authentication first
4. Check server logs for backend errors
5. Validate request body format

## 📋 Test Checklist

### **Pre-Testing**

- [ ] Server is running (local/production)
- [ ] Database is accessible
- [ ] Seed data is populated
- [ ] Postman collection imported
- [ ] Environment variables configured

### **Core Functionality**

- [ ] All authentication methods work
- [ ] User management CRUD operations
- [ ] Violation management system
- [ ] Academic structure management
- [ ] Reporting and analytics
- [ ] File import/export
- [ ] Notification system

### **Role-Based Access**

- [ ] Superadmin can access all endpoints
- [ ] Teachers can manage their data
- [ ] Students can only access their data
- [ ] BK can manage violation system
- [ ] Parents can view their children's data

### **Data Integrity**

- [ ] Automatic score calculation
- [ ] Score history tracking
- [ ] Notification generation
- [ ] Relationship constraints
- [ ] Data validation rules

## 🎯 Success Criteria

### **API Performance**

- Response time < 3 seconds
- All endpoints return correct HTTP status codes
- Proper error handling and messages

### **Data Accuracy**

- Score calculations are correct
- Relationships are maintained
- Data validation works properly

### **Security**

- Authentication is required
- Role-based access is enforced
- Sensitive data is protected

### **Usability**

- Clear error messages
- Consistent response formats
- Proper documentation coverage

---

## 📞 Support

If you encounter issues during testing:

1. Check this guide first
2. Review the API documentation
3. Check server logs for backend errors
4. Verify your test data and environment setup

Happy Testing! 🚀

# 🧑‍💼 HR Nexus – Full‑Stack HR Management System

HR Nexus is a **modern full‑stack Human Resource Management System (HRMS)** with a **React + Tailwind CSS frontend** and a **FastAPI + MongoDB backend**. It is designed with a clean, scalable UI system and a robust backend for real‑world HR workflows.

---

## 🚀 Overview

HR Nexus is a **production-ready HR Management System** designed to handle complete employee lifecycles — from onboarding to payroll — with secure authentication, role-based access, and analytics-driven dashboards.

---

## 🔐 Authentication & Authorization

* JWT-based authentication
* Secure password hashing using **bcrypt**
* Role-based access control (`intern`, `employee`, `hr_manager`)
* User profile management

---

## 👥 User Management

* Intern, Employee, and HR Manager roles
* Auto-assignment of interns to employees and HR mentors
* Mentor appointment and tracking
* Team hierarchy visualization

---

## 🕒 Attendance Management

* Daily check-in / check-out
* Attendance history (last 30 days)
* HR-level attendance overview

---

## 🏖 Leave Management

* Apply, approve, or reject leave requests
* Leave status tracking
* HR approval workflow

---

## 📋 Onboarding System

* Automated onboarding checklist
* HR-controlled onboarding completion
* Onboarding status tracking

---

## 🧑‍🏫 Mentorship System

* Auto and manual intern assignment
* Intern limit per employee (maximum 15)
* Mentor and HR visibility

---

## 📢 Announcements

* Company-wide announcements
* Categories, tags, and view tracking
* Sample announcements auto-generated

---

## 🎯 Performance & Tasks

* Performance goals with progress tracking
* Task assignments with priority and deadlines

---

## 💰 Payroll Management

* Payroll creation and updates
* Salary breakdown (base, bonus, deductions)
* Payment status tracking

---

## 📊 Dashboards & Analytics

* User dashboard statistics
* HR dashboard analytics (attendance, payroll, onboarding)

---

## 🎨 Frontend UI System

The frontend follows a **design‑system approach** using Tailwind’s `@apply` pattern for consistency.

### UI Components Included

* Sidebar & mobile sidebar
* Dashboard cards & stats widgets
* Data tables
* Forms (inputs, labels, checkboxes)
* Buttons (primary, secondary, ghost, destructive)
* Badges & progress bars
* Modals & overlays
* Announcement cards
* Empty states & loaders

### Example Utility Classes

```css
.sidebar {
  @apply h-screen w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800;
}

.btn-primary {
  @apply bg-blue-700 text-white hover:bg-blue-800 shadow-sm font-medium px-4 py-2 rounded-md transition-all;
}
```

---

## 🧩 Tailwind Utility Helper

A shared utility function is used to merge Tailwind classes safely:

```ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

This prevents class conflicts and improves component composition.

---

## 🛠 Tech Stack

### Frontend

* React
* Tailwind CSS
* PostCSS
* CRACO
* clsx + tailwind-merge

### Backend

* FastAPI
* MongoDB (Motor)
* JWT Authentication
* bcrypt / passlib
* Pydantic

---

## ⚙️ Prerequisites

Make sure the following tools are installed before running the project:

* **Node.js** (v18+)
* **npm or yarn**
* **Python** (v3.10+)
* **MongoDB** (local or MongoDB Atlas)
* **Git**

---

## 🔄 Project Workflow

This project follows a **clean full-stack workflow** separating UI, logic, and data layers for scalability and maintainability.

### 1️⃣ Frontend Workflow (React + Tailwind)

1. User interacts with UI components (Sidebar, Forms, Tables, Modals)
2. Components use shared Tailwind utility classes and the `cn()` helper
3. User actions trigger API calls (login, attendance, tasks, payroll, etc.)
4. JWT token is stored securely (localStorage / memory)
5. Requests are sent to backend with `Authorization: Bearer <token>`
6. UI updates based on API response states (loading, success, error)

---

### 2️⃣ Authentication Workflow

1. User registers or logs in from frontend
2. Credentials sent to FastAPI `/auth/login`
3. Password verified using `bcrypt`
4. JWT token generated with role & expiry
5. Token returned to frontend
6. Protected routes validate token via dependency injection

---

### 3️⃣ Backend Workflow (FastAPI)

1. Request received by FastAPI router
2. Middleware validates JWT & user role
3. Business logic executed (attendance, payroll, onboarding, etc.)
4. Async MongoDB (Motor) operations performed
5. Response returned as JSON (Pydantic models)

---

### 4️⃣ Database Workflow (MongoDB)

1. Collections auto-created on first use
2. Indexed fields for users, attendance, payroll
3. Relations handled via references (user_id)
4. Async reads/writes using Motor

---

### 5️⃣ Role-Based Access Flow

| Role       | Access Level             |
| ---------- | ------------------------ |
| Intern     | Self data, tasks, goals  |
| Employee   | Intern mentorship, tasks |
| HR Manager | Full system access       |

---

### 6️⃣ End-to-End Request Flow

```text
User Action
   ↓
React Component
   ↓
API Call (Axios / Fetch)
   ↓
FastAPI Route
   ↓
Auth Dependency
   ↓
Business Logic
   ↓
MongoDB (Motor)
   ↓
JSON Response
   ↓
UI State Update
```

---

## ▶️ Running the Project

### Backend

```bash
uvicorn server:app --reload
```

Access API docs:

* Swagger: `http://localhost:8000/docs`
* ReDoc: `http://localhost:8000/redoc`

### Frontend

```bash
npm install
npm start
```

---

## 🔐 Authentication

* JWT‑based authentication
* Role‑based route protection
* Secure password hashing

---

## 👤 Author

**Divyanshi Singh**
Full‑Stack Developer
FastAPI • MongoDB • Tailwind CSS

---

This README reflects the **design‑system‑driven frontend** and **production‑ready FastAPI backend** used in HR Nexus.

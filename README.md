# 📚 LibriCore LMS — Complete Library Management System

A full-stack, enterprise-grade **Library Management System** built from scratch with **React 19**, **Tailwind CSS**, **Node.js**, **Express.js**, and an embedded **SQLite** database using `better-sqlite3`.

Designed with a modern **blue-and-white** aesthetic, complete with responsive cards, tables, charts (**Recharts**), Lucide icons, toast alerts, role-based authentication, automated fine calculations, and persistent SQLite storage.

---

## 🚀 Key Features

### 1. 🔐 Authentication & Session Security
- Administrator login with password hashing via `bcryptjs` and token-based authentication (`jsonwebtoken`).
- Protected dashboard routes with auto-redirect for unauthenticated users.
- Convenient **"Quick Fill Demo"** button on the login screen for instant testing.
- Change admin username, email, and password from the Settings page.

### 2. 📊 Interactive Dashboard & Real-Time Analytics
- **KPI Metrics**: Total book titles, total physical copies, copies available on shelves, active registered borrowers, currently issued items, overdue books, and pending/collected fines.
- **Data Visualizations** (Recharts):
  - Monthly borrowing and return circulation trends (Bar/Column chart).
  - Books by subject category distribution (Interactive Donut/Pie chart).
- **Recent Transactions Log**: Live stream of latest lending events with dynamic status badges.
- **Quick-Access Action Buttons**: Issue/Return desk, new book entry, and student registration.

### 3. 📖 Books Catalog Management
- View, search, and filter catalog by title, author, ISBN, shelf location, category, and real-time stock availability.
- **Add Book Modal**: Title, author, ISBN, category, publisher, publish year, total copies, shelf location, and synopsis.
- **Edit Book Modal**: Update existing details; automatically adjusts available copies while safeguarding already-issued copies.
- **Book Details & Loan History**: View complete circulation logs for each specific book.
- **Safe Deletion**: Validates that no active student loans exist before allowing a title to be deleted.

### 4. 👨‍🎓 Student Patron Directory
- Register, search, filter, and manage student members.
- Records: Student ID (e.g., `STU-2024-001`), name, email, phone, department, academic year, and status (`ACTIVE` / `SUSPENDED`).
- **Student Profile View**: Full profile, active loans, borrowing history, and unsettled fine balances.
- **Patron Protection**: Prevents deletion of students with active loans or pending fines.

### 5. 🔄 Circulation Desk (Issue & Return)
- **Issue Books**:
  - Select registered student (shows active borrowing count).
  - Select available book (books with 0 copies are disabled and marked "OUT OF STOCK").
  - Automated due date calculation based on library loan duration settings (default 14 days).
  - Enforces max books borrowing quota per student (default 3 books).
  - Atomic stock decrement (`available_copies - 1`).
  - Blocks duplicate checkout of the exact same title to the same student.
- **Process Returns**:
  - Live search of active loans.
  - **Automated Overdue Fine Calculation**: Calculates days overdue based on the daily fine rate and creates an unpaid fine record.
  - Prevents duplicate returns with explicit validation.
  - Atomic stock increment (`available_copies + 1`).

### 6. 📜 Transactions History
- Complete log of all book lending and return activities.
- Multi-dimensional filters: Filter by status (`ISSUED`, `RETURNED`, `OVERDUE`) and date range (`From` / `To`).
- Real-time search across transaction codes (`TXN-...`), book titles, student names, and IDs.
- One-click **Quick Return** modal button directly from the table rows.

### 7. 💵 Fines & Dues Management
- Financial overview: Total penalties assessed, collected revenue, pending dues, and unpaid invoice counts.
- Search by student name, student ID, book title, or receipt number.
- **Collect Payment Modal**: Settle fines via Cash, Credit/Debit Card, Online/UPI, or Campus Account.
- **Official Printable Receipt**: Generates formatted digital receipts with receipt number, patron name, book title, payment method, and amount.

### 8. ⚙️ System Settings & Policies
- Custom borrowing duration (days).
- Custom daily overdue fine rate ($/day).
- Maximum allowed books per patron limit.
- Facility details: Library Name, Help Desk Email, Phone, and Physical Address.
- Administrator password change form.
- Persistent SQLite storage status indicator.

---

## 🗄️ Database Architecture & Pre-Seeded Data

The application uses an embedded **SQLite** database (`backend/library.db`) managed via `better-sqlite3` with **Write-Ahead Logging (WAL)** and **Foreign Key constraints** enabled. No external database server installation or configuration is required.

### Automatically Seeded Data on First Launch:
- **1 Default Administrator** (`admin@library.com` / `admin123`).
- **16 Books** across diverse categories (Computer Science, Artificial Intelligence, Literature, History, Physics, Mathematics, Psychology).
- **11 Students** with diverse academic departments and statuses.
- **17+ Transactions** including returned on time, returned late with paid fines, active loans, and overdue loans with automatic fines.
- **System Settings** pre-configured.

---

## 💻 Windows 11 Setup & Running Instructions

### Prerequisites
- **Node.js** (v18, v20, v22, or v24): [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)

> **Note on Windows PowerShell Policy:**  
> If your PowerShell restricts running script files (like `npm.ps1`), use `cmd.exe` (Command Prompt) or prefix commands with `cmd /c npm ...`.

---

### Step 1: Clone / Open the Project Folder
Open Command Prompt (`cmd.exe`) and navigate to the project directory:
```cmd
cd C:\Users\janavi\Desktop\JMINIPROJECT
```

---

### Step 2: Install Dependencies (Frontend & Backend)
Run the automated install script:
```cmd
npm run install:all
```
*Or install manually in each folder:*
```cmd
cd backend && npm install
cd ..\frontend && npm install --legacy-peer-deps
cd ..
```

---

### Step 3: Start the Application

You can start the full application in **Production Mode** (single command) or **Development Mode** (dual terminal):

#### Option A: Single Command Full-Stack Launch (Recommended)
This runs the Express backend and serves the compiled React production frontend on a single port:
```cmd
npm start
```
Once started, open your web browser and visit:
👉 **`http://localhost:5000`**

---

#### Option B: Development Mode (Vite Hot-Reload)
Open two Command Prompt windows:

- **Terminal 1 (Backend):**
  ```cmd
  cd backend
  node server.js
  ```
  *(Runs backend API on `http://localhost:5000`)*

- **Terminal 2 (Frontend):**
  ```cmd
  cd frontend
  npm run dev
  ```
  *(Runs Vite dev server on `http://localhost:5173`)*

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@library.com` | `admin123` |

*(Tip: You can also click the **"Quick Fill"** button directly on the login card to auto-populate credentials)*

---

## 📁 Project Directory Structure

```
JMINIPROJECT/
├── package.json                 # Unified startup scripts
├── README.md                    # Setup documentation
├── backend/
│   ├── package.json             # Express, better-sqlite3, bcryptjs, jwt
│   ├── server.js                # Express app entry & static frontend serving
│   ├── db.js                    # SQLite schema, tables & auto-seed data
│   ├── library.db               # SQLite database file (auto-created & persistent)
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   └── routes/
│       ├── auth.js              # Login & admin profile
│       ├── books.js             # Books CRUD & availability
│       ├── students.js          # Students CRUD & borrow history
│       ├── transactions.js      # Issue, return & stock validation
│       ├── fines.js             # Overdue fees & payment receipts
│       ├── settings.js          # Policy & library configurations
│       └── dashboard.js         # Analytics & chart statistics
└── frontend/
    ├── package.json             # React 19, Tailwind CSS, Lucide, Recharts
    ├── vite.config.js           # Vite configuration
    ├── tailwind.config.js       # Tailwind CSS theme configuration
    ├── postcss.config.js        # PostCSS configuration
    ├── index.html               # Main HTML entry with Google fonts
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # Routing & route protection
        ├── index.css            # Tailwind & global design styles
        ├── api.js               # Centralized API fetch client
        ├── context/
        │   ├── AuthContext.jsx  # Authentication state & JWT storage
        │   └── ToastContext.jsx # Toast notification alert system
        ├── components/
        │   ├── Sidebar.jsx      # Navigation sidebar
        │   ├── Navbar.jsx       # Header bar with live clock
        │   ├── StatCard.jsx     # Modern KPI cards
        │   ├── Modal.jsx        # Accessible dialog modal
        │   └── ProtectedRoute.jsx # Route authentication guard
        └── pages/
            ├── Login.jsx        # Login page with quick demo fill
            ├── Dashboard.jsx    # Metrics, Recharts trends & recent logs
            ├── Books.jsx        # Catalog, search, filters & modals
            ├── Students.jsx     # Patron management & profiles
            ├── IssueReturn.jsx  # Issue & return desk with fine preview
            ├── Transactions.jsx # Historical audit log with quick return
            ├── Fines.jsx        # Fine collection & printable receipts
            └── Settings.jsx     # Circulation rules & institution config
```

---

## 🛡️ Business Rules & Safeguards Implemented

1. **Strict Book Availability**:
   - Books with 0 copies available cannot be issued.
   - Available copies cannot drop below zero.
   - Deleting a book is forbidden if active copies are currently checked out.
2. **Patron Loan Limits**:
   - Students cannot exceed the maximum allowed book limit (configurable in Settings, default 3).
   - Patrons with account status `SUSPENDED` are blocked from new checkouts.
   - Students cannot borrow duplicate copies of the same book at the same time.
   - Deleting a student patron is blocked if they have active loans or unpaid fines.
3. **Automated Return & Fine Calculations**:
   - Overdue days and penalty amounts are calculated automatically using the daily fine rate setting.
   - Duplicate returns of already-returned transactions are strictly prevented.
4. **Data Persistence**:
   - All data (books, patrons, loans, fines, settings) is persisted in the local SQLite database (`backend/library.db`) and survives server restarts.

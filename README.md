# PDFCraft Studio 🚀

A high-performance, privacy-first PDF manipulation suite built with **Node.js + Express** (Backend) and **React + Vite + Vanilla CSS** (Frontend).

---

## ⚡ Quick Start Guide

You need **Node.js** (v18+) installed.

### 1. Install Dependencies (First time only)

Open PowerShell / Terminal in `d:\pdf_web`:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

*(Note for Windows PowerShell: If you encounter an execution policy warning for npm, use `npm.cmd install`)*

---

### 2. Run the Application

The project runs with two processes (Backend on port 5000 and Frontend on port 5173):

#### Terminal 1 — Start Backend Server:
```bash
cd server
npm start
```
> Server will start at: **http://localhost:5000**  
> Health check: **http://localhost:5000/api/health**

#### Terminal 2 — Start Frontend Client:
```bash
cd client
npm run dev
```
> Web application will open at: **http://localhost:5173**

---

### 3. Generate Test Sample PDFs (Optional)

If you want ready-to-use sample PDFs to test merging right away:

```bash
cd server
node create_test_pdfs.js
```
This generates 3 sample PDF files in `server/test_samples/`:
- `Document_Alpha_Report.pdf` (2 pages)
- `Document_Beta_Contract.pdf` (3 pages)
- `Document_Gamma_Appendix.pdf` (1 page)

You can drag and drop these directly into the web UI!

---

## 🏗️ Project Architecture

```
pdf_web/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── config/
│   │   │   └── tools.js        # Modular Tool Registry (add future tools here)
│   │   ├── components/
│   │   │   ├── Header.jsx      # Navigation & brand identity
│   │   │   ├── Dashboard.jsx   # Hero, search filter, and tools grid
│   │   │   ├── MergeStudio.jsx # Dropzone, reordering, progress & download
│   │   │   ├── Toast.jsx       # Floating notifications
│   │   │   └── Footer.jsx      # Footer & status
│   │   ├── index.css           # Vanilla CSS Design System (Glassmorphic dark theme)
│   │   ├── App.jsx             # Main router & state manager
│   │   └── main.jsx
│   └── vite.config.js          # Configured with proxy to port 5000
│
├── server/                     # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── mergeController.js # Upload validation & HTTP response streaming
│   │   ├── routes/
│   │   │   └── mergeRoutes.js     # Multer config & route definitions
│   │   ├── services/
│   │   │   └── pdfService.js      # pdf-lib engine for memory merging
│   │   └── index.js               # Express entrypoint
│   ├── create_test_pdfs.js        # Script to create sample PDFs
│   └── test_merge.js              # Automated merge test script
│
├── package.json
└── README.md
```

---

## 🛡️ Security & Privacy
- **Zero Permanent Storage**: Files are processed in volatile memory and never saved to the server disk.
- **Header Inspection**: Strict validation of genuine `%PDF-` file magic bytes.

# 🤖 BizBuddy AI

> **AI-powered business operating system for small Indian shop owners**
> Built for the Microsoft Agents League Hackathon

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)

---

## 📌 Problem Statement

Over **63 million micro and small businesses** in India run entirely on pen and paper. Shop owners in tier-2 and tier-3 cities struggle to:
- Track daily expenses and income manually
- Understand if their business is loan-ready
- Create marketing content for festivals
- Build any digital presence

BizBuddy AI solves all of this in one app — in their language, on their phone.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Live cash flow charts, business health score, profit margin |
| 💸 **Expense Tracker** | Log expenses by category (inventory, rent, electricity, etc.) |
| 💰 **Income Tracker** | Record daily sales, bulk orders, online income |
| 🧾 **Receipt Scanner** | Upload a photo → Gemini Vision extracts vendor, items, total |
| 📈 **Financial Reports** | Weekly/monthly P&L, top expense categories, cash flow trends |
| 🏦 **Loan Readiness** | AI-generated score (0–100) + eligible schemes (MUDRA, PM SVANidhi, CGTMSE) |
| 📣 **Marketing Generator** | Festival-aware social media posts with hashtags for Instagram/WhatsApp |
| 🌐 **AI Website Builder** | Generate a product showcase website for the business |
| 🤖 **AI Advisor** | Real-time Gemini-powered chat grounded in the user's own financial data |

---

## 🏗️ Architecture

```
bizbuddy-ai/
├── frontend/                   # React + Vite + TypeScript
│   └── src/
│       ├── pages/              # LoginPage, DashboardPage, ExpensesPage, ...
│       ├── components/
│       │   └── shared/         # AppLayout, ProtectedRoute
│       ├── context/
│       │   └── AuthContext.tsx # Firebase Auth state
│       ├── services/
│       │   ├── api.ts          # Axios client with Firebase token injection
│       │   └── firebase.ts     # Firebase client SDK init
│       └── types/
│           └── index.ts        # Shared TypeScript interfaces
│
├── backend/                    # Node.js + Express + TypeScript
│   └── src/
│       ├── index.ts            # Express app entry point
│       ├── middleware/
│       │   └── auth.ts         # Firebase Admin token verification
│       ├── routes/
│       │   ├── ai.ts           # /api/ai — Gemini chat + marketing + website
│       │   ├── expenses.ts     # /api/expenses
│       │   ├── income.ts       # /api/income
│       │   ├── receipts.ts     # /api/receipts — Gemini Vision OCR
│       │   ├── reports.ts      # /api/reports — financial + loan readiness
│       │   ├── marketing.ts    # /api/marketing
│       │   ├── website.ts      # /api/website
│       │   └── dashboard.ts    # /api/dashboard
│       └── lib/
│           ├── gemini.ts       # Gemini 2.5 Flash chat helper
│           ├── businessContext.ts  # Pulls 30-day Firestore data for AI context
│           └── firebase.ts     # Firebase Admin SDK init
│
└── package.json                # npm workspaces root
```

---

## 🧠 AI Stack

### Chat Advisor — `gemini.ts`
- Uses **Gemini 2.5 Flash** via `@google/genai` SDK
- Before every reply, `businessContext.ts` queries Firestore for the user's last 30 days of expenses and income
- System instruction is dynamically built with **real financial numbers** — top expense category, net profit, transaction count
- Gives grounded advice (not generic tips) referencing Indian schemes like MUDRA loans and GST filing

### Receipt OCR — `receipts.ts`
- Uses **Gemini 1.5 Flash** with inline image data (base64)
- Extracts: vendor name, date, line items (name/qty/price), tax, total
- Returns JSON directly — no regex, clean parse
- Processes asynchronously so UI shows a "processing" state immediately

---

## 🛠️ Tech Stack

**Frontend**
- React 18, Vite 4, TypeScript 5
- Tailwind CSS 3 (custom `brand` green + `saffron` orange palette)
- React Router v6 (protected routes)
- TanStack Query v5 (server state / caching)
- Recharts (cash flow charts)
- React Hook Form + Zod (form validation)
- Firebase JS SDK v10 (Auth)
- Axios (API client with token interceptor)

**Backend**
- Node.js 18+, Express 4, TypeScript 5
- Firebase Admin SDK v11 (Firestore, Auth token verification)
- `@google/genai` — Gemini 2.5 Flash (chat)
- `@google/generative-ai` — Gemini 1.5 Flash (receipt vision)
- Multer (file uploads)
- Zod (env validation)

**Infrastructure**
- Firebase Authentication (Google OAuth + Email/Password)
- Firestore (expenses, income, user profiles)
- Firebase Storage (receipt images)
- Firebase Hosting (frontend)
- npm workspaces (monorepo)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with **Authentication**, **Firestore**, and **Storage** enabled
- A Google AI Studio API key (Gemini)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/bizbuddy-ai.git
cd bizbuddy-ai
npm install
```

### 2. Configure environment variables

**Backend** — create `backend/.env`:

```env
PORT=5001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Firebase Admin SDK — download from Firebase Console > Project Settings > Service Accounts
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Frontend** — create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Run in development

```bash
# Terminal 1 — backend (http://localhost:5001)
npm run dev:backend

# Terminal 2 — frontend (http://localhost:3000)
npm run dev:frontend
```

The frontend Vite dev server proxies all `/api/*` requests to the backend automatically.

### 4. Build for production

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dashboard/overview` | Cash flow, scores, profit margin |
| `GET` | `/api/dashboard/activity` | Recent transactions |
| `GET` | `/api/expenses` | List expenses |
| `POST` | `/api/expenses` | Add expense |
| `PUT` | `/api/expenses/:id` | Update expense |
| `DELETE` | `/api/expenses/:id` | Delete expense |
| `GET` | `/api/income` | List income entries |
| `POST` | `/api/income` | Add income |
| `POST` | `/api/receipts/upload` | Upload receipt image (Gemini OCR) |
| `GET` | `/api/receipts/:id` | Poll receipt processing status |
| `POST` | `/api/ai/chat` | Gemini-powered chat (grounded on user data) |
| `GET` | `/api/ai/business-health` | Business health score + insights |
| `POST` | `/api/ai/marketing` | Generate festival marketing post |
| `GET` | `/api/reports/financial` | P&L summary by period |
| `POST` | `/api/reports/loan-readiness` | Loan score + eligible schemes |
| `GET` | `/api/marketing/festivals` | Upcoming Indian festivals |
| `POST` | `/api/website` | Generate AI website for business |
| `POST` | `/api/website/publish` | Publish the website |

---

## 🗺️ Roadmap

- [ ] Wire real Gemini chat (replace keyword-matching mock in `ai.ts`)
- [ ] Implement Firebase Admin `verifyIdToken` in `auth.ts`
- [ ] Persist user onboarding profile to Firestore
- [ ] WhatsApp Business Cloud API integration
- [ ] Multi-language support (Hindi, Tamil, Telugu)
- [ ] PWA / offline-first support
- [ ] PDF export for loan readiness report

---

## 🙏 Acknowledgements

- [Google Gemini API](https://ai.google.dev) — AI chat and vision
- [Firebase](https://firebase.google.com) — Auth, database, storage
- [MUDRA Bank](https://mudra.org.in) — Loan scheme reference data
- [Recharts](https://recharts.org) — Chart components
- [Lucide React](https://lucide.dev) — Icon library

---

## 📄 License

MIT © 2026 Thiru — Chennai Institute of Technology

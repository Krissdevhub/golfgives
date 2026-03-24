# GolfGives — Golf Charity Subscription Platform

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT (jsonwebtoken)
- **Payments**: Stripe
- **Email**: Nodemailer / Resend
- **Deploy**: Vercel (frontend) + Railway/Render (backend)

## Project Structure
```
golfgives/
├── frontend/          # Next.js 14 App
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   └── api/       # Next.js API routes (proxy layer)
│   ├── components/
│   ├── lib/
│   └── types/
└── backend/           # Express API Server
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── services/
    │   └── utils/
    └── supabase/
        └── schema.sql
```

## Setup Instructions

### 1. Clone and Install
```bash
git clone <repo>
cd golfgives/frontend && npm install
cd ../backend && npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` in both folders and fill in values.

### 3. Supabase Setup
- Create new project at supabase.com
- Run `backend/supabase/schema.sql` in SQL editor

### 4. Stripe Setup
- Create products in Stripe dashboard (monthly + yearly)
- Add price IDs to `.env`

### 5. Run Locally
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 6. Deploy
- Frontend → Vercel (connect GitHub repo, set env vars)
- Backend → Railway or Render

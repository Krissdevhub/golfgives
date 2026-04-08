# 🏌️ GolfGives — Charity Subscription Platform

🌐 Live Demo: https://golfgives-tau.vercel.app

GolfGives is a full-stack platform that enables users to subscribe to golf-based charity initiatives and contribute through recurring payments.

---

## 🚀 Features

- 🔐 Secure authentication using JWT
- 💳 Subscription-based payments via Stripe (monthly/yearly)
- 📊 User dashboard to track contributions
- 🛠️ Admin panel for managing campaigns
- 📧 Email notifications (Nodemailer / Resend)
- ⚡ Real-time, scalable full-stack architecture

---

## 🧱 Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript  
- **Backend**: Node.js, Express, TypeScript  
- **Database**: Supabase (PostgreSQL)  
- **Auth**: JWT  
- **Payments**: Stripe  
- **Deploy**: Vercel (frontend), Railway/Render (backend)

---

## 📂 Project Structure


golfgives/
├── frontend/
│ ├── app/
│ ├── components/
│ ├── lib/
│ └── types/
└── backend/
├── src/
│ ├── routes/
│ ├── controllers/
│ ├── middleware/
│ ├── services/
│ └── utils/
└── supabase/
└── schema.sql


---

## ⚙️ Setup Instructions

### 1. Clone and Install

git clone <repo>
cd golfgives/frontend && npm install
cd ../backend && npm install 

2. Environment Variables

Copy .env.example to .env in both folders and configure values.

3. Supabase Setup
Create a new project at https://supabase.com
Run backend/supabase/schema.sql in SQL editor
4. Stripe Setup
Create products (monthly/yearly) in Stripe dashboard
Add price IDs to .env
5. Run Locally
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

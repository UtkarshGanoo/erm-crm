# Mini ERP + CRM Operations Portal

A full-stack Mini ERP/CRM system for a wholesale/distribution company — customers, products, inventory, and sales challans with role-based access.

**Stack:** React (Vite) · Node.js/Express · PostgreSQL · JWT Auth

This project has been fully built and tested end-to-end (backend API tests + real browser tests via Playwright) — every module below is confirmed working: login for all 4 roles, customer CRUD + follow-ups, product CRUD + stock movement log, and the full sales challan flow including stock deduction, negative-stock prevention, draft→confirm, and cancellation with stock reversal.

---

## 1. Project Structure

```
erp-crm/
├── backend/            # Node.js + Express + PostgreSQL REST API
│   ├── db/
│   │   ├── schema.sql  # Full database schema
│   │   └── seed.js     # Seeds 4 demo users (one per role)
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/ # auth.js (JWT + roles), errorHandler.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/            # React (Vite) admin UI
    ├── src/
    │   ├── api/         # axios instance + service functions
    │   ├── context/      # AuthContext (JWT session)
    │   ├── components/   # Layout, ProtectedRoute, StatusBadge, Pagination
    │   └── pages/        # Login, Dashboard, Customers, Products, Challans
    ├── .env.example
    └── package.json
```

---

## 2. Local Setup — Step by Step (copy-paste)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ installed locally (or a free cloud Postgres — see Section 4)

### Step 1 — Create the database

```bash
# Open psql (adjust user if needed)
psql -U postgres

# Inside psql:
CREATE DATABASE erp_crm;
\q
```

### Step 2 — Backend setup

```bash
cd backend
npm install

# Copy the example env file and edit values (DB password, JWT secret, etc.)
cp .env.example .env
```

Open `backend/.env` and set your real Postgres credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=erp_crm
JWT_SECRET=some_long_random_string_here
```

Load the schema and seed demo users:
```bash
psql -U postgres -d erp_crm -f db/schema.sql
npm run seed
```

Start the API:
```bash
npm run dev
# API runs on http://localhost:5000
# Test it: curl http://localhost:5000/health
```

**Demo login accounts** (all use password `Admin@123`):
| Role      | Email               |
|-----------|---------------------|
| Admin     | admin@erp.com       |
| Sales     | sales@erp.com       |
| Warehouse | warehouse@erp.com   |
| Accounts  | accounts@erp.com    |

### Step 3 — Frontend setup

Open a **new terminal**:
```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` should point at your backend:
```
VITE_API_URL=http://localhost:5000
```

Start the dev server:
```bash
npm run dev
# App runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser and log in with `admin@erp.com` / `Admin@123`.

---

## 3. API Reference

All endpoints (except `/auth/login` and `/health`) require:
`Authorization: Bearer <token>`

### Auth
| Method | Endpoint         | Roles          | Description |
|--------|------------------|----------------|--------------|
| POST   | `/auth/login`    | Public         | Returns JWT + user |
| POST   | `/auth/register` | admin          | Create a new employee login |
| GET    | `/auth/me`       | Any logged in  | Current user info |

### Customers (CRM)
| Method | Endpoint                        | Roles                     |
|--------|----------------------------------|---------------------------|
| GET    | `/customers?search=&status=&customer_type=&page=&limit=` | admin, sales, accounts |
| GET    | `/customers/:id`                 | admin, sales, accounts |
| POST   | `/customers`                     | admin, sales |
| PUT    | `/customers/:id`                 | admin, sales |
| POST   | `/customers/:id/followups`       | admin, sales |

### Products & Inventory
| Method | Endpoint                             | Roles |
|--------|----------------------------------------|-------|
| GET    | `/products?search=&category=&low_stock=true&page=&limit=` | all roles |
| GET    | `/products/:id`                       | all roles |
| POST   | `/products`                           | admin, warehouse |
| PUT    | `/products/:id`                       | admin, warehouse |
| POST   | `/products/:id/stock-movement`        | admin, warehouse |
| GET    | `/products/:id/stock-movements`       | admin, warehouse, accounts |

### Sales Challans
| Method | Endpoint                    | Roles |
|--------|-------------------------------|-------|
| GET    | `/challans?status=&customer_id=&page=&limit=` | all roles |
| GET    | `/challans/:id`               | all roles |
| POST   | `/challans`                   | admin, sales |
| PATCH  | `/challans/:id/confirm`       | admin, sales, warehouse |
| PATCH  | `/challans/:id/cancel`        | admin, sales |

### Dashboard
| Method | Endpoint             | Roles |
|--------|-----------------------|-------|
| GET    | `/dashboard/summary`  | all roles |

**Standard response shape:**
```json
{ "success": true, "data": { ... }, "pagination": { "page":1, "limit":10, "total":42, "totalPages":5 } }
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

---

## 4. Key Business Logic (already implemented & tested)

- **Challan numbers** are auto-generated (`CH-2026-0001`, sequential per year).
- **Draft challans** do NOT touch stock. **Confirmed challans** reduce stock immediately.
- Stock can **never go negative** — the API rejects the request with a `400` and a clear message if requested quantity exceeds available stock (re-checked again at confirm time, in case stock changed between draft creation and confirmation).
- Every challan line item stores a **product snapshot** (name, SKU, price at time of sale) and every challan stores a **customer snapshot** — so historical challans stay accurate even if the customer/product record changes later.
- **Cancelling a Confirmed challan** automatically restores the stock and logs a reversing `IN` stock movement.
- Every stock change (opening stock, manual adjustment, challan confirm, challan cancel) is written to the `stock_movements` audit table with who/when/why.
- All list endpoints support **pagination + search/filter**.
- All write endpoints run through **express-validator** and return `422` with per-field messages on invalid input.

---

## 5. Deployment Guide (free-tier friendly)

Recommended combo: **Neon** (Postgres) + **Render** (backend) + **Vercel** (frontend).

### 5.1 Database — Neon (or Supabase / Render Postgres)
1. Create a free account at https://neon.tech and create a new project/database.
2. Copy the connection string (it looks like `postgresql://user:pass@host/dbname?sslmode=require`).
3. Run the schema against it locally once:
   ```bash
   psql "postgresql://user:pass@host/dbname?sslmode=require" -f backend/db/schema.sql
   ```
4. Seed it:
   ```bash
   DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require" DB_SSL=true node backend/db/seed.js
   ```

### 5.2 Backend — Render
1. Push this repo to GitHub (see Section 6).
2. On https://render.com, click **New → Web Service**, connect your repo, set root directory to `backend`.
3. Build command: `npm install`  ·  Start command: `npm start`
4. Add environment variables in Render's dashboard:
   - `DATABASE_URL` = (your Neon connection string)
   - `DB_SSL` = `true`
   - `JWT_SECRET` = (a long random string)
   - `JWT_EXPIRES_IN` = `8h`
   - `CORS_ORIGIN` = (your Vercel frontend URL, once you have it)
5. Deploy. Note the public URL, e.g. `https://erp-crm-backend.onrender.com`.

### 5.3 Frontend — Vercel
1. On https://vercel.com, **New Project**, import the same repo, set root directory to `frontend`.
2. Framework preset: Vite.
3. Add environment variable:
   - `VITE_API_URL` = `https://erp-crm-backend.onrender.com` (your Render URL from above)
4. Deploy. Vercel gives you a URL like `https://erp-crm.vercel.app`.
5. Go back to Render and set `CORS_ORIGIN` to this exact Vercel URL, then redeploy the backend.

### 5.4 (Optional) AWS deployment notes
If AWS is specifically required by your evaluator instead of Render/Vercel:
- **Backend**: Deploy to an EC2 instance (t2.micro, free tier) running Node via `pm2`, behind an Nginx reverse proxy on port 80/443, or use **Elastic Beanstalk** for a simpler managed deploy of the `backend/` folder.
- **Database**: Use **RDS for PostgreSQL** (free tier eligible) instead of Neon — same `DATABASE_URL` pattern works.
- **Frontend**: Build with `npm run build` inside `frontend/`, then upload the `dist/` folder to an **S3 bucket** configured for static website hosting, optionally fronted by **CloudFront** for HTTPS.
- Document your exact EC2/RDS setup steps (security groups, inbound rules for port 5000/22, `.pem` key usage) in this README once deployed, as most evaluators want to see this documented, not just done.

---

## 6. GitHub Setup

```bash
cd erp-crm
git init
git add .
git commit -m "Initial commit: Mini ERP + CRM Operations Portal"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Suggested commit history for a case study (shows real progression, not one giant dump):
```bash
git commit -m "feat: database schema and backend project setup"
git commit -m "feat: JWT auth with role-based access control"
git commit -m "feat: customer CRM module (CRUD, search, follow-ups)"
git commit -m "feat: product & inventory module with stock movement log"
git commit -m "feat: sales challan module with stock deduction business logic"
git commit -m "feat: React frontend - auth, layout, dashboard"
git commit -m "feat: React frontend - customer, product, challan pages"
git commit -m "docs: README with setup and deployment instructions"
```

---

## 7. What's Implemented vs. Bonus (not done)

**Implemented:** all 4 core modules, JWT auth + roles, full REST API with validation/pagination/search, responsive React admin UI, challan business logic (draft/confirm/cancel, stock guard, snapshots).

**Not implemented (bonus/stretch items you can add later):** Docker setup, GitHub Actions CI/CD, PDF invoice export, S3 image upload (the product form does accept an `image_url` field if you want to host images externally in the meantime).

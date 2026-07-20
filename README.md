#MY CRM-CRP

A full-stack ERP/CRM system for wholesale/distribution companies — featuring Customer Management, Product & Inventory Tracking, Sales Challan generation, Role-based Access Control, Stock Movement Audit Trail, Public Self-Signup, and PDF Invoice Export.

---

## 🚀 Live Deployments

Two independent, fully live deployments (either can be used for evaluation):

| | Frontend | Backend API |
|---|---|---|
| **Render + Vercel + Neon** | [https://erm-crm-brown.vercel.app](https://erm-crm-brown.vercel.app) | [https://erm-crm.onrender.com](https://erm-crm.onrender.com) |
| **AWS (EC2 + RDS + S3/CloudFront)** | [https://d37cx1xkjybczs.cloudfront.net](https://d37cx1xkjybczs.cloudfront.net) | [https://dv4zryvx1xlx6.cloudfront.net](https://dv4zryvx1xlx6.cloudfront.net) |

**GitHub Repository:** [https://github.com/UtkarshGanoo/erm-crm](https://github.com/UtkarshGanoo/erm-crm)

> Render's free tier sleeps after ~15 min idle - the first request afterward can take 30-60s to wake up. The AWS backend has no such cold start.

---

## 🏗 Architecture Overview

```
erp-crm/
├── backend/                # Node.js + Express + PostgreSQL REST API
│   ├── db/
│   │   ├── schema.sql      # Full database schema
│   │   └── seed.js         # Seeds 4 demo users (one per role)
│   ├── src/
│   │   ├── config/db.js    # pg Pool - DATABASE_URL or discrete DB_* vars
│   │   ├── middleware/     # auth.js (JWT verify + role authorize), errorHandler.js
│   │   ├── controllers/    # auth, customer, product, challan, dashboard
│   │   ├── routes/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/                # React (Vite) admin UI
│   ├── src/
│   │   ├── api/            # axios instance (JWT interceptor) + service functions
│   │   ├── context/         # AuthContext (JWT session, login/signup/logout)
│   │   ├── components/      # Layout, ProtectedRoute, StatusBadge, Pagination, Alert
│   │   └── pages/            # Login, Signup, Dashboard, Customers, Products, Challans
│   ├── .env.example
│   └── package.json
├── .github/workflows/ci-cd.yml   # build check + automated AWS deploy
├── postman_collection.json
├── postman_environment_local.json
├── postman_environment_production.json
└── SUBMISSION.md
```

**Data Flow:**
`React SPA → Axios (JWT in Authorization header) → Express REST API → node-postgres (pg) → PostgreSQL`

**Key Design Decisions:**
- JWT stored in `localStorage`, attached via an Axios request interceptor; a response interceptor force-logs-out on any `401`.
- Role checks are enforced in the `authorize()` **backend** middleware on every route, not just hidden in the UI - the frontend hiding a button is a UX nicety, not the security boundary.
- Stock is only ever deducted when a challan is `Confirmed`; a `SELECT ... FOR UPDATE` row lock plus a re-check at confirm time prevents negative stock even under concurrent requests.
- Every challan stores a **customer + product snapshot** (JSONB) at time of sale, so historical invoices stay accurate even if the customer/product record changes later.
- Cancelling a `Confirmed` challan restores stock and logs a reversing `IN` stock movement - nothing is silently lost.
- Two deployments exist side by side: Vercel+Render+Neon (all auto-deploy on git push via native GitHub integration) and AWS EC2+RDS+S3/CloudFront (deploys via `.github/workflows/ci-cd.yml`). A second CloudFront distribution fronts the EC2 backend purely to give it an HTTPS URL, avoiding mixed-content blocking from the HTTPS frontend.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router DOM, Axios |
| Backend | Node.js, Express 5, express-validator |
| Database | PostgreSQL (Neon in one deployment, RDS in the other) |
| Auth | JSON Web Tokens (JWT) + bcryptjs |
| PDF Export | pdfkit |
| Process management | pm2 (AWS EC2) |
| CI/CD | GitHub Actions |

---

## 🔑 Test Credentials (All Roles)

Seeded via `backend/db/seed.js`, present in both deployments' databases:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@erp.com` | `Admin@123` | Full access to all modules |
| **Sales** | `sales@erp.com` | `Admin@123` | Customers + Challans (create/edit) |
| **Warehouse** | `warehouse@erp.com` | `Admin@123` | Products + Stock adjustment, confirm challans |
| **Accounts** | `accounts@erp.com` | `Admin@123` | Read-heavy access across modules |

New accounts can also be self-registered via the **"Sign up"** link on the login page - limited to `sales`/`warehouse`/`accounts` roles; `admin` is intentionally not self-assignable and is only provisioned via the seed script.

---

## 📦 Local Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ installed locally (or a free cloud Postgres - see Deployment Guide below)

### 1. Clone the Repository
```bash
git clone https://github.com/UtkarshGanoo/erm-crm.git
cd erm-crm
```

### 2. Create the database
```bash
psql -U postgres
CREATE DATABASE erp_crm;
\q
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your real Postgres credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=erp_crm
JWT_SECRET=some_long_random_string_here
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

Load the schema and seed demo users:
```bash
psql -U postgres -d erp_crm -f db/schema.sql
npm run seed
```

Start the API:
```bash
npm run dev
# API runs on http://localhost:5000 - test with: curl http://localhost:5000/health
```

### 4. Frontend Setup
Open a **new terminal**:
```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:
```bash
npm run dev
```

The app is available at **http://localhost:5173**. Log in with `admin@erp.com` / `Admin@123`, or click **"Sign up"** to create a new account.

---

## ☁️ Deployment Guide

### Frontend → Vercel
1. Push the repository to GitHub.
2. On [vercel.com](https://vercel.com), **New Project**, import the repo, set **Root Directory** to `frontend`.
3. Framework preset: Vite. Build command: `npm run build`. Output: `dist`.
4. Environment variable: `VITE_API_URL=https://<your-backend-url>`.

### Backend → Render
1. On [render.com](https://render.com), **New → Web Service**, connect the repo, set **Root Directory** to `backend`.
2. Build command: `npm install`. Start command: `npm start`.
3. Environment variables:
   - `DATABASE_URL` - your Postgres connection string
   - `DB_SSL=true`
   - `JWT_SECRET` - a long random string
   - `JWT_EXPIRES_IN=8h`
   - `CORS_ORIGIN` - your deployed frontend URL (set after the frontend is live)

### Database → Neon (or Supabase / Render Postgres)
1. Create a free project at [neon.tech](https://neon.tech), copy the connection string.
2. Load schema + seed once locally:
   ```bash
   psql "postgresql://user:pass@host/dbname?sslmode=require" -f backend/db/schema.sql
   DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require" DB_SSL=true node backend/db/seed.js
   ```

### (Bonus) AWS - EC2 + RDS + S3/CloudFront
This project also ships a second, fully automated AWS deployment:
- **Database**: RDS for PostgreSQL (`db.t3.micro`, private - only reachable from the EC2 security group).
- **Backend**: EC2 instance running the Node app via `pm2`, behind an `nginx` reverse proxy. A second CloudFront distribution fronts it purely to provide an HTTPS URL (avoids custom-domain/ACM certificate setup).
- **Frontend**: built and synced to a private S3 bucket, served via CloudFront with Origin Access Control (bucket has no public access - only that CloudFront distribution can read it).
- **Automation**: see `.github/workflows/ci-cd.yml` - pushes to `main` auto-deploy every layer.

---

## 🔧 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` / `DB_HOST,DB_PORT,DB_USER,DB_PASSWORD,DB_NAME` | backend/.env | Postgres connection (either form works) |
| `DB_SSL` | backend/.env | Set `true` for hosted Postgres (Neon/RDS) |
| `JWT_SECRET` | backend/.env | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | backend/.env | Token lifetime (default `8h`) |
| `CORS_ORIGIN` | backend/.env | Allowed frontend origin |
| `PORT` | backend/.env | Express port (default `5000`) |
| `VITE_API_URL` | frontend/.env | Backend base URL the SPA calls |

---

## 📮 API Documentation

A full Postman collection is included: **[`postman_collection.json`](postman_collection.json)**, with environment files [`postman_environment_local.json`](postman_environment_local.json) and [`postman_environment_production.json`](postman_environment_production.json).

Import all three into Postman, select an environment, run **Auth → Login** first (it auto-captures the JWT into a collection variable), then every other request uses it automatically.

All endpoints (except `/auth/login`, `/auth/register`, and `/health`) require `Authorization: Bearer <token>`.

### Key Endpoints

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns JWT + user |
| POST | `/auth/register` | Public | Self-signup (`sales`/`warehouse`/`accounts` only), returns JWT + user |
| GET | `/auth/me` | Any logged in | Current user info |
| GET | `/customers?search=&status=&customer_type=&page=&limit=` | admin, sales, accounts | List customers |
| POST | `/customers` | admin, sales | Create customer |
| PUT | `/customers/:id` | admin, sales | Update customer |
| POST | `/customers/:id/followups` | admin, sales | Add follow-up note |
| GET | `/products?search=&category=&low_stock=&page=&limit=` | all roles | List products |
| POST | `/products` | admin, warehouse | Add product |
| POST | `/products/:id/stock-movement` | admin, warehouse | Adjust stock IN/OUT |
| GET | `/products/:id/stock-movements` | admin, warehouse, accounts | Stock movement log |
| GET | `/challans?status=&customer_id=&page=&limit=` | all roles | List challans |
| GET | `/challans/:id/pdf` | all roles | Download challan as PDF invoice |
| POST | `/challans` | admin, sales | Create challan (Draft or Confirmed) |
| PATCH | `/challans/:id/confirm` | admin, sales, warehouse | Confirm challan (reduces stock) |
| PATCH | `/challans/:id/cancel` | admin, sales | Cancel challan (restores stock) |
| GET | `/dashboard/summary` | all roles | Dashboard stats |

**Standard response shape:**
```json
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

---

## ✅ Features Implemented

- [x] JWT Authentication with 4 roles (Admin, Sales, Warehouse, Accounts)
- [x] Public self-signup (role-limited) alongside admin-provisioned accounts
- [x] Role-based access enforced on the backend (middleware), not just the UI
- [x] Customer CRM - all fields, add/edit, search (name/mobile/business), status/type filter, detail page, follow-up notes with history
- [x] Product & Inventory - all fields, category/low-stock filter, full stock movement audit log (who/when/why)
- [x] Sales Challan - auto-generated challan number, multi-product, Draft/Confirmed/Cancelled, atomic stock deduction with negative-stock guard, customer + product snapshots
- [x] Cancel Challan - restores stock + logs a reversing movement
- [x] Dashboard - live stats, recent challans, low-stock/leads counts
- [x] PDF Export of challans (pdfkit)
- [x] Server-side search, filter, and pagination on all list endpoints
- [x] Input validation (express-validator) with proper HTTP status codes and per-field error messages
- [x] Two independent live deployments (Render+Vercel+Neon, and AWS EC2+RDS+S3/CloudFront)
- [x] GitHub Actions CI/CD - build/test check on every push/PR, automated AWS deploy on push to `main`

---

## ⚠️ Known Limitations & Assumptions

1. **No automated test suite.** Every flow (auth, CRUD, challan stock logic, PDF export) was verified manually via curl and in-browser during development, not via a committed Jest/Playwright/supertest suite - the most significant gap for a production-grade submission.
2. **Render free tier cold starts.** The Render-hosted backend spins down after ~15 minutes idle; the first request afterward can take 30-60 seconds. The AWS backend does not have this issue.
3. **No image upload pipeline.** The product form accepts an `image_url` string field, but there's no S3/upload integration for product photos - images must be hosted externally and linked by URL.
4. **No Docker setup.** Local dev requires Node + PostgreSQL installed directly; there's no `Dockerfile`/`docker-compose.yml` for a one-command containerized environment.
5. **No password reset / email verification flow.** Self-signup creates an account immediately with no email confirmation step, and there's no "forgot password" flow.
6. **No refresh tokens.** JWTs expire after 8 hours with no silent refresh - users must log in again after expiry.
7. **AWS SSH is open to 0.0.0.0/0.** The EC2 security group's port 22 was widened from a single-IP allowlist so GitHub Actions runners (no fixed IP range) can deploy. Actual login still requires the private key, but this is broader network exposure than a locked-down single-IP rule.
8. **CloudFront-in-front-of-EC2 is a workaround, not a full CDN/API Gateway setup.** It exists solely to terminate HTTPS for the backend without provisioning a custom domain/ACM certificate.

Full architecture/submission writeup also available in [`SUBMISSION.md`](SUBMISSION.md).

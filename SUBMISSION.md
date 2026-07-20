# Submission - Mini ERP + CRM Operations Portal

## 1. GitHub Repository

**https://github.com/UtkarshGanoo/erm-crm**

## 2. Live Frontend URL

Two independent deployments are live (either can be used for evaluation):

| Platform | URL |
|---|---|
| Vercel | https://erm-crm-brown.vercel.app |
| AWS (S3 + CloudFront) | https://d37cx1xkjybczs.cloudfront.net |

## 3. Live Backend API URL

| Platform | URL | Notes |
|---|---|---|
| Render | https://erm-crm.onrender.com | Free tier - the instance sleeps after ~15 min idle, so the first request after inactivity can take 30-60s to wake up |
| AWS (EC2, fronted by CloudFront for HTTPS) | https://dv4zryvx1xlx6.cloudfront.net | Always-on (no idle sleep) |

Health check: `GET /health` on either URL returns `{"success":true,"message":"API is running"}`.

## 4. Test Login Credentials (all roles)

Seeded via `backend/db/seed.js`, present in both deployments' databases:

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.com | Admin@123 |
| Sales | sales@erp.com | Admin@123 |
| Warehouse | warehouse@erp.com | Admin@123 |
| Accounts | accounts@erp.com | Admin@123 |

New accounts can also be self-registered via the "Sign up" link on the login page (limited to `sales`/`warehouse`/`accounts` roles - `admin` is not self-assignable by design).

## 5. Postman Collection

Included in the repo root:
- [`postman_collection.json`](postman_collection.json) - every endpoint (auth, customers, products, challans, dashboard), organized by module
- [`postman_environment_local.json`](postman_environment_local.json) - points `base_url` at `http://localhost:5000`
- [`postman_environment_production.json`](postman_environment_production.json) - points `base_url` at the Render URL (edit the `base_url` value to switch to the AWS backend instead)

Import all three into Postman, select an environment, run **Auth → Login** first (it auto-captures the JWT into a collection variable), then all other requests use it automatically via the `Authorization` header.

Full endpoint reference with roles/params is also documented in the README (Section 3, "API Reference").

## 6. README - Setup and Deployment Instructions

See [`README.md`](README.md), which covers:
- Project structure (Section 1)
- Local setup, step by step, including demo accounts (Section 2)
- Full API reference (Section 3)
- Key business logic already implemented (Section 4)
- Deployment guide for Neon + Render + Vercel, plus AWS EC2/RDS/S3/CloudFront notes (Section 5)
- GitHub setup / commit conventions (Section 6)
- Implemented vs. bonus features (Section 7)
- GitHub Actions CI/CD - what it automates and which secrets it needs (Section 8)

## 7. Architecture

```
                    ┌─────────────────┐
                    │  React (Vite)   │   Frontend: axios + JWT in localStorage,
                    │   SPA frontend  │   role-gated routes via ProtectedRoute
                    └────────┬────────┘
                             │ HTTPS / REST (JSON)
                    ┌────────▼────────┐
                    │  Express API    │   JWT auth + role middleware (authenticate/authorize)
                    │  (Node.js)      │   express-validator on every write endpoint
                    └────────┬────────┘   Centralized error handler -> consistent {success, message} shape
                             │ pg (node-postgres)
                    ┌────────▼────────┐
                    │   PostgreSQL    │   users, customers, followups, products,
                    │                 │   stock_movements, challans, challan_items
                    └─────────────────┘
```

**Key design decisions:**
- **Role-based access** is enforced at the route layer (`authorize('admin','sales',...)`) on every endpoint, not just in the UI - the frontend hiding a button is a UX nicety, not the security boundary.
- **Stock integrity**: all stock changes (opening stock, manual adjustment, challan confirm/cancel) go through a single audited path into `stock_movements`, and challan confirmation uses `SELECT ... FOR UPDATE` row locks plus a re-check at confirm time to prevent negative stock even under concurrent requests.
- **Historical accuracy via snapshots**: `challans`/`challan_items` store a JSONB snapshot of the customer and product data at the time of sale, so a later edit to a customer or product record doesn't silently rewrite historical invoices.
- **Two independent deployments** exist for redundancy/comparison: Vercel+Render+Neon (all auto-deploy on git push via their native GitHub integration) and AWS EC2+RDS+S3/CloudFront (deploys via the GitHub Actions workflow in `.github/workflows/ci-cd.yml`). CloudFront fronts the EC2 backend specifically to give it an HTTPS URL, avoiding mixed-content blocking from the HTTPS frontend.

## 8. Known Limitations / Incomplete Parts

- **No automated test suite.** Every flow (auth, CRUD, challan stock logic, PDF export) was verified manually via curl and in-browser during development, not via a committed Jest/Playwright/supertest suite. This is the most significant gap for a production-grade submission.
- **Render free tier cold starts.** The Render-hosted backend spins down after ~15 minutes idle; the first request afterward can take 30-60 seconds. The AWS backend does not have this issue.
- **No image upload pipeline.** The product form accepts an `image_url` string field, but there's no S3/upload integration for product photos - images must be hosted externally and linked by URL.
- **No Docker setup.** Local dev requires Node + PostgreSQL installed directly; there's no `Dockerfile`/`docker-compose.yml` for a one-command containerized environment.
- **No password reset / email verification flow.** Self-signup creates an account immediately with no email confirmation step, and there's no "forgot password" flow.
- **No refresh tokens.** JWTs expire after 8 hours (`JWT_EXPIRES_IN`) with no silent refresh - users must log in again after expiry.
- **AWS SSH is open to 0.0.0.0/0.** During CI/CD setup, the EC2 security group's port 22 was widened from a single-IP allowlist to all origins, since GitHub Actions runners don't have a fixed IP range to allowlist. Actual login still requires the private key, but this is a broader network exposure than the original single-IP rule.
- **CloudFront-in-front-of-EC2 is a workaround, not a full CDN setup.** It exists solely to terminate HTTPS for the backend without provisioning a custom domain/ACM certificate - there's no purpose-built API Gateway/ALB with a proper certificate in front of the backend.

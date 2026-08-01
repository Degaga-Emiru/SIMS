# SIMS — Quick Start Guide

Follow these steps to run the Smart Inventory Management System locally.

---

## Option A: PostgreSQL on your PC (Windows)

### Step 1 — Install PostgreSQL

1. Download the installer from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer (use defaults; remember the **password** you set for the `postgres` user)
3. Keep port **5432** unless you changed it
4. Finish installation (pgAdmin is optional but helpful)

### Step 2 — Create the database

**Using pgAdmin (GUI):**
1. Open pgAdmin
2. Connect to your local server (password = what you set during install)
3. Right-click **Databases** → **Create** → **Database**
4. Name it: `sims_db`
5. Click **Save**

**Using Command Line (psql):**
```powershell
# Open psql (from Start menu or):
psql -U postgres

# Then run:
CREATE DATABASE sims_db;
\q
```

### Step 3 — Configure environment

In the project folder, copy the example env file:

```powershell
cd D:\inventory-management-system
copy .env.example .env
```

Edit `.env` and set:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sims_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-long-random-string-at-least-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> Replace `YOUR_PASSWORD` with your PostgreSQL password.  
> Generate a secret: run `openssl rand -base64 32` or use any long random string.

---

## Option B: PostgreSQL in the cloud (Neon — free tier, no local install)

1. Go to [https://neon.tech](https://neon.tech) and sign up
2. Create a new project (e.g. `sims`)
3. Copy the **connection string** (starts with `postgresql://...`)
4. Paste it into `.env` as `DATABASE_URL`

Example:
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## Run the application

From the project folder:

```powershell
cd D:\inventory-management-system

# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Create database tables (first time only)
npx prisma migrate dev --name init

# 4. Seed demo data + admin user
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open in browser: **http://localhost:3000**

### Default login (after seed)

| Field    | Value            |
|----------|------------------|
| Email    | `admin@sims.io`  |
| Password | `admin123`       |

---

## What you can do in the app

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Main dashboard (requires login) |
| `/dashboard/products` | Product management |
| `/dashboard/inventory` | Stock in/out |
| `/dashboard/sales` | Sales & invoices |

---

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Reset seed data |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npx prisma studio` | Same as above |

---

## Troubleshooting

**`Can't reach database server`**
- Check PostgreSQL is running (Services → `postgresql-x64-...`)
- Verify `DATABASE_URL` username, password, port, and database name

**`NEXTAUTH_SECRET` missing**
- Add it to `.env` (required for login)

**Migration fails**
- Ensure the database `sims_db` exists
- Try: `npx prisma migrate reset` (⚠️ deletes all data)

**Port 3000 in use**
- Run: `npm run dev -- -p 3001` and set `NEXTAUTH_URL=http://localhost:3001`

---

## Deploy later (Vercel + Neon)

1. Push code to GitHub
2. Create Neon database → copy `DATABASE_URL`
3. Import repo in Vercel
4. Add env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
5. After deploy: `npx prisma migrate deploy`

See [README.md](./README.md) and [docs/API.md](./docs/API.md) for full documentation.

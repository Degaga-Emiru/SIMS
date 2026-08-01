# Smart Inventory Management System (SIMS)

Production-ready inventory management built with Next.js, PostgreSQL, and Prisma.

## Tech Stack

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Next.js Route Handlers, Prisma ORM
- **Database:** PostgreSQL (Neon recommended for production)
- **Auth:** NextAuth.js (JWT + bcrypt)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default admin credentials:** `admin@sims.io` / `admin123`

## Features

- Landing page with Hero, Features, Pricing, FAQ, Contact
- Authentication (Login, Register, Forgot/Reset Password)
- Role-based access (Super Admin, Inventory Manager, Store Manager, Sales Staff)
- Dashboard with stats, charts, and recent activities
- Product, Category, Supplier CRUD
- Inventory management (Stock In/Out/Adjust, Low Stock Alerts)
- Purchase Orders (Create, Approve, Reject, Receive)
- Sales with automatic stock reduction
- Customer management
- Reports with PDF, Excel, CSV export
- Notifications and audit logs
- Company settings, taxes, currency, dark mode

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Create a [Neon](https://neon.tech) PostgreSQL database
3. Import project in [Vercel](https://vercel.com)
4. Set environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `CLOUDINARY_*` (optional, for image uploads)
5. Run migrations: `npx prisma migrate deploy`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
app/
  (auth)/          # Login, register, password reset
  (dashboard)/     # Protected dashboard pages
  api/             # REST API route handlers
components/
  landing/         # Landing page sections
  dashboard/       # Dashboard UI components
  ui/              # Shadcn UI components
lib/               # Utilities, auth, validations, hooks
prisma/            # Schema, migrations, seed
types/             # Shared TypeScript types
```

## API Documentation

See [docs/API.md](docs/API.md) for full API reference.

## License

MIT

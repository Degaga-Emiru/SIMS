# Smart Inventory Management System (SIMS)

A modern inventory and sales management platform built with Next.js, Prisma, PostgreSQL, and Tailwind CSS. It is designed for small and medium-sized businesses that need a unified system for products, stock movement, purchasing, sales, reporting, and user management.

## Overview

SIMS helps teams manage:

- Products, categories, suppliers, and customers
- Inventory stock in/out and adjustments
- Purchase orders and receiving workflows
- Sales and invoices
- Low-stock alerts, audit logs, and notifications
- Role-based access for admins, managers, and staff

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js API routes, Prisma ORM
- Database: PostgreSQL
- Authentication: NextAuth.js with bcrypt
- Exporting: PDF, Excel, and CSV support

## Features

- Landing page with marketing sections
- Authentication flow for login, registration, forgot password, and reset password
- Role-based dashboard access
- Analytics dashboard with summary cards and charts
- Product, category, supplier, and customer management
- Inventory operations including stock adjustments and movement history
- Purchase order creation, approval, and receiving
- Sales workflow with invoice generation
- Reports, exports, notifications, and audit logs
- Dark mode and company settings

## Project Structure

```text
app/                # App Router pages and API routes
components/         # Reusable UI components
lib/                # Auth, utilities, validations, hooks
prisma/             # Prisma schema, migrations, and seed data
types/              # Shared TypeScript types
docs/               # API documentation
```

## Prerequisites

Make sure you have the following installed:

- Node.js 20+ or newer
- npm
- PostgreSQL 14+ (local or cloud)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd inventory-management-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a file named `.env` in the project root and add:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sims_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-this-with-a-long-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional for image uploads
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

> If you are using Neon or another hosted PostgreSQL service, place that connection string in `DATABASE_URL` instead.

### 4. Create the database

If you are using a local PostgreSQL server, create a database called `sims_db` first.

### 5. Run Prisma migrations and seed data

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 6. Start the development server

```bash
npm run dev
```

Then open http://localhost:3000.

### Default login

After seeding the database, you can sign in with:

- Email: `admin@sims.io`
- Password: `admin123`

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

A common production setup is:

1. Push the repository to GitHub
2. Create a PostgreSQL database on Neon or another provider
3. Import the project into Vercel
4. Add the required environment variables
5. Run Prisma migrations in production:

```bash
npx prisma migrate deploy
```

## Documentation

- API reference: [docs/API.md](docs/API.md)
- Setup guide: [SETUP.md](SETUP.md)

## License

This project is licensed under the MIT License.

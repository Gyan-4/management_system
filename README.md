# ConstructFlow — Construction Management System

A web-based construction cost and project management system for civil engineering projects.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- Lucide React
- pnpm

## Main modules

- Dashboard
- Project management
- BOQ / cost estimation
- Materials
- Labor & payroll tracking
- Equipment usage
- Other expenses
- Actual project costs
- Cost analysis and variance
- Physical project progress
- Reports

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `MONGODB_URI` in `.env.local` to your MongoDB connection string.

## Production

```bash
pnpm install
pnpm build
pnpm start
```

For Vercel, add `MONGODB_URI` under Project Settings → Environment Variables, then redeploy.

## Cost workflow

`Project → BOQ → Actual Costs → Progress → Cost Analysis → Reports`

The system uses Philippine Peso formatting and calculates line totals, actual spending, budget variance, and projected profit from project contract value and actual costs.

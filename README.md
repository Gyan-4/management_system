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
- Printable reports

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

The system uses Philippine Peso formatting and calculates line totals, actual spending, budget variance, cost utilization, and projected profit from project contract value and actual costs.

## Recommended project workflow

1. Create the project and enter contract amount, budget, dates, client, and engineer.
2. Build the BOQ with quantities, units, unit costs, and cost categories.
3. Record actual material purchases, labor costs, equipment costs, and other expenses.
4. Record physical progress periodically using percentage, milestone, and notes.
5. Review Cost Analysis to identify over-budget categories and remaining budget.
6. Print the Project Report for client, management, or site documentation.

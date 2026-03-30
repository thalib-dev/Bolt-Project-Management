# Project Management System

A full-stack, collaborative project management tool for task tracking, team collaboration, and resource management. Built with Next.js 15, Node.js/Express, and PostgreSQL.

## Features

- **Project & Task Management**: Kanban boards, list views, progress tracking, budget vs actual.
- **Team Collaboration**: Comments, @mentions (infrastructure), activity feeds, read-only/write access.
- **Time Tracking**: Live timers, manual time entries, billable/non-billable hours tracking.
- **Resource Management**: Workload allocation charts, directory, capacity planning.
- **Reporting**: Project health scorecard, global completion rates.
- **Modern UI**: Premium dark mode, glassmorphism, responsive design (Tailwind v4 + shadcn/ui).

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Lucide React.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod validation, JWT Auth.
- **Database**: PostgreSQL 15.
- **Infrastructure**: Docker Compose for easy deployment.

## Prerequisites

- Node.js 20+
- PostgreSQL (or use Docker)
- Docker Desktop (optional, for containerized run)

## Setup Instructions (Local Development)

### 1. Database Setup
Create a local PostgreSQL database named `openclaw` (or update the `.env` file with your URL).

### 2. Backend Setup
```bash
cd server
npm install
npm run build
npx prisma generate
npx prisma db push --accept-data-loss # Run migrations
npx prisma db seed # Optional: Add seed data
npm run dev
```
The backend will run on `http://localhost:4000`.

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The frontend will run on `http://localhost:3000`.

## Setup Instructions (Docker)

To run the entire stack (Postgres + API + Next.js) using Docker Compose:

```bash
docker-compose up -d --build
```
This will start:
- Frontend on port `3000`
- API on port `4000`
- DB on port `5432`

## API endpoints

A comprehensive REST API is available. Key endpoints include:
- `POST /api/auth/register` & `POST /api/auth/login`
- `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`
- `POST /api/projects/:id/tasks`
- `PATCH /api/tasks/:id/position` (Kanban drag & drop)
- `POST /api/tasks/:id/comments`
- `GET /api/time-entries`, `POST /api/time-entries`
- `GET /api/reports/health`, `GET /api/reports/workload`

*Note: All endpoints (except login/register) require setting the `Authorization: Bearer <token>` header.*

## License

MIT License

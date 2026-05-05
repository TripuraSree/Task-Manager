# TaskFlow - Role-Based Task Management App

TaskFlow is a full-stack task management web app where users can create projects, manage team members, assign tasks, and track project progress with role-based access control for Admin and Member users.

## Live Links

- Live Application: https://frontend-production-d8a3.up.railway.app
- Backend API: https://backend-production-8fe9.up.railway.app
- Backend Health Check: https://backend-production-8fe9.up.railway.app/health
- GitHub Repository: https://github.com/TripuraSree/Task-Manager

## Features

- Supabase authentication for signup and login
- Project creation, listing, selection, and deletion
- Team management with Admin and Member roles
- Add project members by registered email
- Task creation, assignment, priority, due date, and status tracking
- Task board with Todo, In Progress, and Done columns
- Dashboard summary for projects, total tasks, overdue tasks, and completed tasks
- Role-based backend authorization and role-aware frontend controls
- In-app confirmation dialogs for destructive actions
- Responsive, polished UI for desktop, tablet, and mobile screens

## Role-Based Access

### Admin

- Create and delete projects
- Add members to projects by email
- Change member roles
- Remove project members
- Create, assign, update, and delete tasks
- Update any task status

### Member

- View projects they belong to
- View team members and tasks inside assigned projects
- Update only the status of tasks assigned to them
- Cannot create tasks
- Cannot update unassigned tasks
- Cannot update another member's tasks
- Cannot manage projects, members, or task details

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Supabase Auth client
- Lucide React icons
- Custom responsive CSS

### Backend

- Node.js
- Express
- TypeScript
- Supabase JS
- Zod validation
- Helmet, CORS, Morgan

### Database and Auth

- Supabase Auth
- Supabase Postgres
- Row Level Security policies
- SQL schema with relationships between projects, project members, tasks, and auth users

## Project Structure

```text
Task Management/
  backend/
    src/
      config/
      middleware/
      routes/
      utils/
    supabase/
      schema.sql
    .env.example
    package.json
    README.md
  frontend/
    src/
      lib/
      types/
      App.tsx
      styles.css
    .env.example
    package.json
    README.md
  README.md
```

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd "Task Management"
```

### 2. Create Supabase project

Create a new Supabase project, then open the SQL editor and run:

```text
backend/supabase/schema.sql
```

This creates the database tables, enums, indexes, triggers, helper functions, relationships, and RLS policies.

### 3. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Start the backend:

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

### 4. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Environment Variable Notes

- `SUPABASE_SERVICE_ROLE_KEY` must be used only on the backend.
- Never expose the service role key in frontend code.
- The frontend should only use the Supabase anon key.
- In production, set these values in Railway or the deployment platform's environment variable settings.

## API Overview

All protected routes require:

```http
Authorization: Bearer <supabase-access-token>
```

### Health

- `GET /`
- `GET /health`

### Current User

- `GET /api/me`

### Projects

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

### Members

- `POST /api/projects/:projectId/members`
- `GET /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:memberId`
- `DELETE /api/projects/:projectId/members/:memberId`

### Tasks

- `POST /api/projects/:projectId/tasks`
- `GET /api/projects/:projectId/tasks`
- `GET /api/tasks/:taskId`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`

### Dashboard

- `GET /api/dashboard`

## Validation and Relationships

- Request validation is handled with Zod.
- Project names, task titles, roles, task status, priority, dates, UUIDs, and email inputs are validated.
- Each project has an owner.
- Each project has many members through `project_members`.
- Each task belongs to a project.
- Tasks can be assigned to project members.
- Foreign keys maintain database relationships.
- RLS policies protect project, member, and task data.

## Testing Status

The following flows were tested with temporary Supabase users and cleaned up afterward:

- Admin can create a project
- Admin can add a Member by email
- Member can view assigned project
- Member cannot create tasks
- Admin can create assigned tasks
- Admin can create unassigned tasks
- Member can update status for their assigned task
- Member cannot update unassigned task status
- Member cannot edit task fields beyond status
- Dashboard returns task summary

Build checks:

```bash
# backend
npm run build
npm run typecheck

# frontend
npm run build
```

## Deployment

### Backend on Railway

1. Create a new Railway project.
2. Connect the GitHub repository.
3. Select the `backend` folder as the service root if using a monorepo setup.
4. Add backend environment variables:

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

5. Build command:

```bash
npm run build
```

6. Start command:

```bash
npm start
```

### Frontend Deployment

Deploy the frontend to Railway, Vercel, or Netlify.

Frontend environment variables:

```env
VITE_API_URL=https://your-backend-url
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

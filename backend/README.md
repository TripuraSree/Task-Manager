# TaskFlow Backend

Express + TypeScript REST API backed by Supabase Postgres and Supabase Auth.

For the full project overview, setup guide, features, deployment notes, and submission checklist, see the root `README.md`.

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill in your Supabase values.
4. Install dependencies and run the API:

```bash
npm install
npm run dev
```

## Auth

The frontend signs users up and logs them in with Supabase Auth. Send the logged-in user's access token with API requests:

```http
Authorization: Bearer <supabase-access-token>
```

## Core Routes

- `GET /health`
- `GET /api/me`
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/members`
- `GET /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:memberId`
- `DELETE /api/projects/:projectId/members/:memberId`
- `POST /api/projects/:projectId/tasks`
- `GET /api/projects/:projectId/tasks`
- `GET /api/tasks/:taskId`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/dashboard`

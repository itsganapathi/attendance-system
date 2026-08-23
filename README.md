# Student/Employee Attendance Management System (MERN → Vercel + Supabase)

## Stack
- **Frontend:** React (Vite) + React Router + Recharts + Axios — deployed to Vercel as a static site
- **Backend:** Node.js + Express + JWT auth — deployed to Vercel as a serverless function
- **Database:** Supabase (managed Postgres)

## Project structure
```
attendance-system/
  backend/     Express API, wrapped for Vercel serverless (api/[...slug].js)
  frontend/    React app (Vite)
  supabase/    schema.sql — run this in Supabase to create your tables
```

## 1. Create your Supabase project
1. Go to supabase.com, create a new project, and wait for it to provision.
2. Open **SQL Editor -> New query**, paste the contents of `supabase/schema.sql`, and run it. This creates the `users`, `attendance`, and `leaves` tables.
3. Go to **Project Settings -> API** and copy:
   - **Project URL** -> `SUPABASE_URL`
   - **service_role key** (NOT the anon/public key) -> `SUPABASE_SERVICE_ROLE_KEY`

The service_role key has full read/write access and bypasses Row Level Security — it must only ever live in the backend's environment variables, never in frontend code.

## 2. Run locally
### Backend
```bash
cd backend
npm install
cp .env.example .env    # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm run dev              # http://localhost:5000
```
### Frontend
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173, proxies /api to localhost:5000
```

## 3. Deploy to Vercel (two projects: backend + frontend)

### Deploy the backend
1. Push this repo to GitHub (or push `backend/` as its own repo).
2. In Vercel: **Add New -> Project**, import the repo, and set **Root Directory** to `backend`.
3. Vercel auto-detects the Node app. Add these Environment Variables in the Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN` (e.g. `7d`)
   - `FRONTEND_URL` (add after step 4, once you know your frontend's URL)
4. Deploy. Your API will be live at `https://your-backend.vercel.app/api/...` (health check: `/api/health`).

This works because `backend/api/[...slug].js` is a catch-all Vercel serverless function that wraps the existing Express app with `serverless-http` — no rewrite rules needed.

### Deploy the frontend
1. In Vercel: **Add New -> Project**, import the repo again, set **Root Directory** to `frontend`.
2. Vercel auto-detects Vite. Add this Environment Variable:
   - `VITE_API_URL` = `https://your-backend.vercel.app/api`
3. Deploy. Your app will be live at `https://your-frontend.vercel.app`.

### Finish CORS setup
Go back to the **backend** Vercel project, set `FRONTEND_URL` to your frontend's actual URL, and redeploy (or just redeploy — env var changes require a redeploy to take effect).

## 4. Creating the first admin account
Self-signup (`/signup`) always creates a **student** account. To create an admin:
- Sign up normally, then in **Supabase -> Table Editor -> users**, edit that row's `role` column from `student` to `admin`, **or**
- Call `POST /api/auth/register` directly with `"role": "admin"` in the JSON body (e.g. via Postman) before disabling that option.

## API overview

### Auth (`/api/auth`)
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Create account (student by default) |
| POST | `/login` | Login, returns JWT + user |
| GET | `/me` | Get current logged-in user |

### Admin (`/api/admin`, requires admin JWT)
| Method | Route | Description |
|---|---|---|
| POST | `/students` | Add a student |
| GET | `/students` | List students |
| DELETE | `/students/:id` | Remove a student |
| POST | `/attendance` | Mark attendance for one student (upsert) |
| POST | `/attendance/bulk` | Mark attendance for many students at once |
| GET | `/attendance` | View attendance records (filter by studentId/from/to) |
| GET | `/attendance/export` | Export attendance as CSV |
| GET | `/reports/summary` | Attendance % summary per student |
| GET | `/leaves` | View all leave requests |
| PATCH | `/leaves/:id` | Approve/reject a leave request |

### Student (`/api/student`, requires JWT)
| Method | Route | Description |
|---|---|---|
| GET | `/attendance` | Own attendance history |
| GET | `/attendance/summary` | Own attendance % + breakdown |
| POST | `/leaves` | Apply for leave |
| GET | `/leaves` | View own leave requests |

## Data model (Postgres / Supabase)
- **users**: id (uuid), name, email (unique), password (bcrypt hash), role (`admin`/`student`), roll_number, department, is_active
- **attendance**: id, student_id (fk), date, status (`present`/`absent`/`late`), marked_by (fk), remarks — unique per (student_id, date)
- **leaves**: id, student_id (fk), from_date, to_date, reason, status (`pending`/`approved`/`rejected`), reviewed_by (fk)

## Notes
- Vercel serverless functions are stateless and spin up per-request — that's why the backend no longer holds a persistent DB connection (Mongoose-style); the Supabase client makes lightweight REST/Postgres calls per request instead, which fits this model well.
- For production: restrict admin creation, add input validation, rate-limit auth routes, and tighten CORS (`FRONTEND_URL`) once your frontend URL is final.

# ICT Help Desk Website

A ticketing system for ICT support requests, with three user roles: **admin**,
**technician**, and **user**.

```
ict-help-website/
├── backend/     Node + Express + MongoDB API
└── frontend/    Plain HTML / CSS / JavaScript
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set your own values — in particular `MONGODB_URI`,
`JWT_SECRET`, and the `ADMIN_*` fields for the first admin account.

Create the first admin account (only needs to be run once):

```bash
npm run seed:admin
```

Start the API:

```bash
npm run dev      # with nodemon, auto-restarts on changes
# or
npm start
```

The API runs at `http://localhost:5000` by default (`PORT` in `.env`).

## 2. Frontend setup

The frontend is plain static HTML/CSS/JS — no build step required.

1. Open `frontend/js/config.js` and confirm `API_BASE_URL` points at your
   backend (defaults to `http://localhost:5000/api`).
2. Serve the folder with any static server, e.g. from inside `frontend/`:

   ```bash
   npx serve .
   ```

   or just open `index.html` directly in a browser, or use the VS Code
   "Live Server" extension.

## 3. Logging in

- Log in with the admin account you created via `npm run seed:admin`.
- The admin panel (`admin.html`) lets you create user and technician
  accounts — regular users cannot self-register, by design.
- Users land on `dashboard.html` after login, technicians on
  `technician.html`, and admins on `admin.html`.

## 4. Ticket lifecycle

`pending → approved → assigned → closed` (or `denied` at the pending stage).

- A user submits a request → **pending**.
- Admin **approves** or **denies** it.
- Admin **assigns** a technician → **assigned**.
- The technician and the user each mark their own side **solved**; once
  *both* are solved the ticket automatically becomes **closed**.
- Admin can also **force close** or **delete** any ticket at any time.

## 5. Variables to change when hosting

| What | Where |
|---|---|
| MongoDB connection string | `backend/.env` → `MONGODB_URI` |
| JWT secret | `backend/.env` → `JWT_SECRET` |
| Allowed frontend origin(s) (CORS) | `backend/.env` → `CLIENT_ORIGIN` |
| API base URL the frontend calls | `frontend/js/config.js` → `API_BASE_URL` |

## 6. Deploying: backend on Render, frontend on Vercel

The project is already split into two independent folders for exactly this
setup, and nothing in the code assumes they share a domain — every request
goes through `fetch()` with the API's full URL and a CORS allow-list, not
relative paths or cookies.

**Backend (Render):**
1. Create a new Web Service on Render, pointed at the `backend/` folder
   (set the "Root Directory" to `backend`).
2. Build command: `npm install`. Start command: `npm start`.
3. Add environment variables in the Render dashboard matching `.env.example`
   — in particular `MONGODB_URI` (Render doesn't host MongoDB itself, so use
   a free MongoDB Atlas cluster and paste its connection string here),
   `JWT_SECRET`, and `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`.
4. `PORT` is provided automatically by Render — you don't need to set it.
5. Once deployed, run `npm run seed:admin` once (Render's "Shell" tab, or
   run it locally with `MONGODB_URI` pointed at the same Atlas cluster) to
   create the first admin account.
6. Note the live URL Render gives you, e.g. `https://ict-help-api.onrender.com`.

**Frontend (Vercel):**
1. Create a new Vercel project pointed at the `frontend/` folder (set the
   "Root Directory" to `frontend`). No framework/build step is needed — it's
   deployed as-is.
2. Before deploying (or right after, then redeploy), edit
   `frontend/js/config.js` and set `API_BASE_URL` to your Render URL, e.g.
   `https://ict-help-api.onrender.com/api`.
3. Vercel gives you both a production domain and a preview domain per
   deploy — copy both into `CLIENT_ORIGIN` on Render (comma-separated), then
   redeploy the backend so CORS allows them.

No code changes are needed beyond those two values — there's no
Express server serving the frontend, no shared session/cookie state, and no
hardcoded `localhost` reference left in application logic (only in the
example/default config values, which you're expected to replace).

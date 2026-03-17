Getting started — local auth + password reset

This project includes a small demo backend that supports:

- Email/password sign in using the built-in `/api/login` endpoint
- "Forgot password" flow via a small Node server that sends a numeric code to the user's email

Quick setup

1. Run the server (for auth + reset code email sending):
   - Node 16+ installed
   - cd server
   - copy `.env.example` to `.env` and fill SMTP credentials (if you want email)
   - npm install
   - npm start

2. Open the frontend (either via a static server or directly in the browser):
   - Ensure the server is running on port 3000 (default)
   - The frontend sends API requests to `http://localhost:3000` by default

   **Important:** the frontend sends requests to the server on port 3000. If that process isn’t running or you’re opening the HTML files via `file://`, `fetch` requests will fail and you’ll see a “Network error during registration/login” alert. Make sure to start the server (`cd server && npm start`).

> ⚠️ `server/db.sqlite` is added to `.gitignore` so it won’t be checked into source control.

How it works

- Login uses email/password via `/api/login`. A successful login stores the user in localStorage and redirects to `dashboard.html`.
- "Forgot password" → enter email → click "Send code". The server sends a numeric reset code to that email.
- After receiving the code, enter it with a new password and click "Verify & Update". The client calls `/verify-reset-code`, and on success you can log in with the updated password.

Security notes

- This server demo stores codes in the database and is only suitable for testing. Use a persistent store with expirations (Redis) for production and rate-limit requests.
- Always hash passwords before storing them. The demo does not enforce hashing — integrate `/verify-reset-code` and `/api/register` with your real user database for production.

Files added

- `site.js` — shared frontend utilities (nav, auth helpers, API wrapper, theme toggle)
- `server/index.js` — Express API handling users, courses, enrollments, exercise progress, leaderboard, and reset codes
- `server/package.json`, `.env.example` — server setup

New API endpoints (see `server/index.js`):

```
POST /api/register            { email, password, fullname }           → create user
POST /api/login               { email, password }                     → authenticate
GET  /api/users/:userId       → fetch user profile
POST /api/users/:userId       { fullname, location, bio, website }   → update profile
GET  /api/courses             → list available courses
POST /api/enroll              { userId, courseId }                   → enroll user in course
POST /api/exercises/save-progress { userId, exerciseId, code, status, points }
GET  /api/leaderboard         → top users (points desc)
GET  /api/leaderboard/rank/:userId → user rank + stats
(send/verify reset code endpoints live under root /send-reset-code, /verify-reset-code)
```

These support the new features on the front end, such as dynamic course listings, enrollment buttons, profile syncing, and leaderboard.

If you want, I can:

- Propagate the OAuth buttons + label to other pages.
- Wire the Firebase config into `login.html` for you if you provide it.
- Modify the server to update your real user DB (let me know what DB you use).

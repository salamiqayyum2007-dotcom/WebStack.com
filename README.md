Getting started — OAuth and password reset

This project includes front-end helpers and a small demo backend to support:

- Sign in with Google and GitHub using Firebase Auth (client-side)
- "Forgot password" flow that can either use Firebase's reset email or a small Node server that sends a numeric code

Quick setup

1. Firebase (recommended for OAuth):
   - Create a Firebase project at https://console.firebase.google.com
   - In "Authentication" enable Google and GitHub providers. For GitHub you must register an OAuth app on GitHub and paste the Client ID/Secret into Firebase.
   - Add your web app and copy the Firebase config object.
   - In `login.html` before the `auth.js` script, set `window.FIREBASE_CONFIG = { ... }` with your config.

2. Optional: Run the reset-code server (to send numeric codes via SMTP):
   - Node 16+ installed
   - cd server
   - copy `.env.example` to `.env` and fill SMTP credentials
   - npm install
   - npm start
   - In your page (before `auth.js`) set `window.RESET_SERVER_URL = 'http://localhost:3000'`

How it works

- Clicking "Google" or "GitHub" calls Firebase sign-in popups. On success the user is redirected to `dashboard.html`.
- "Forgot password" -> enter email -> click "Send code". If a `RESET_SERVER_URL` is configured the server will email a numeric code. Otherwise, Firebase's password reset email/link will be used.
- After receiving the code, enter it with a new password and click "Verify & Update". The client will call `/verify-reset-code` on the reset server; on success the client updates demo localStorage account if present. For a real site, implement password update in the server against your user database.

Security notes

- This server demo stores codes in memory and is only suitable for testing. Use a persistent store with expirations (Redis) for production and rate-limit requests.
- Always hash passwords before storing them. The demo does not manage a user DB — integrate the `/verify-reset-code` endpoint to update your real users.

Files added

- `auth.js` — client-side helpers for OAuth and reset flows
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

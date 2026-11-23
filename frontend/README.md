# CivicEvents+ Frontend

A responsive, accessible frontend for the CivicEvents+ city portal, built with HTML, Tailwind CSS and jQuery. It talks to the provided Node/Express/PostgreSQL backend.

## What it does

- Sign up and log in, with a password strength meter and token handling
- Events: browse, search and filter, register or cancel, leave feedback
- Announcements with an audio player, and promos with video and captions
- In-app notifications with an unread count
- Profile and "My registrations" for normal users
- Admin: create, edit and delete events, announcements and promos, publish or unpublish them, a statistics dashboard, and user enable/disable

## Run it locally

### 1. Start the backend

Requirements: Node.js 18+ and PostgreSQL 15+.

```bash
cd backend
npm install
```

1. Create the database: `CREATE DATABASE "civic-events-db";`
2. Create the tables:
   ```bash
   psql -U <db-user> -d civic-events-db -h localhost -p 5432 -f ./migrations/001_create_tables.sql
   ```
3. Fill in `backend/.env` with your database credentials (keep the variable names, change the values).
4. Start the server:
   ```bash
   npm run dev
   ```
   You should see `Connected to PostgreSQL`. The API runs at `http://localhost:4000`.

### 2. Start the frontend

The frontend is static files, so it only needs a web server (opening the files directly won't work).

1. Install the **Live Server** extension in VS Code.
2. Right-click `frontend/login.html` and choose **Open with Live Server**.
3. The app opens at something like `http://127.0.0.1:5500/frontend/login.html`.

### 3. Connect the frontend to the backend

The API address is set in one place, `frontend/js/config.js`:

```js
const CONFIG = {
  API_URL: "http://localhost:4000",
  ...
};
```

Change `API_URL` if your backend runs on a different port or machine. There are no other environment variables.

## Creating an admin account

Signup creates normal users. To make an admin, send a signup request with a role:

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin User","email":"admin@gmail.com","password":"Password123@","role":"admin"}'
```

## Role-based access

Admin and user permissions are enforced in two layers. The backend is the real security boundary, and the frontend hides controls and redirects so people only see what they can use.

- `js/auth.js`: `requireLogin()` sends anonymous visitors to the login page, and `requireAdmin()` sends non-admins to the events page.
- Every admin-only page (`event-form.html`, `admin/dashboard.html`, `admin/users.html`) calls `Auth.requireAdmin()` before anything else.
- Admin buttons (create, edit, delete, publish) are rendered only when `Auth.isAdmin()` is true, and each click handler checks the role again. The comments `Role-based access guard:` mark each place in the code.
- `js/api.js`: attaches the Bearer token to every request and signs the user out on a 401.

## Backend limits the UI respects

- Uploads: images up to 2 MB (JPG, PNG, GIF), audio up to 5 MB (MP3, WAV, M4A, OGG), video up to 8 MB (MP4, MOV, AVI, MKV). Files are checked in the browser before upload. Use MP4 for videos, since most browsers can't play AVI or MKV.
- Events, announcements and promos are published as soon as they are created. Admins can unpublish announcements and promos afterwards.
- Only admins can read all feedback for an event, so the average rating is shown to admins.
- The API has no "mark as read" or "create notification" route, so read state is kept in the browser and admins can delete notifications.

## Project structure

```
frontend/
  index.html, login.html, signup.html
  events.html, event-detail.html, event-form.html
  announcements.html, announcement-detail.html
  promos.html, promo-detail.html
  notifications.html, profile.html, my-registrations.html
  admin/ dashboard.html, users.html
  js/ config.js, auth.js, api.js, ui.js, layout.js, admin-nav.js
  js/pages/ one script per page
```
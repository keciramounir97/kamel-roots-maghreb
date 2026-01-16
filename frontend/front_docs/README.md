# Frontend Overview

## Stack
- React + Vite (type: module)
- React Router for navigation
- Axios for API calls
- Tailwind CSS (V4) for styling utilities

## Key Scripts
- `npm run dev` — start dev server (defaults to port 5173).
- `npm run build` — production build.
- `npm run preview` — preview the build locally.

## API Base
- Point Axios to the backend API base (e.g., `https://your-backend.com/api`).
- Ensure CORS is configured on the backend for your deployed domain.

## Auth Flow
- Uses JWT issued by backend; store token securely (e.g., in memory/context) and attach as `Authorization: Bearer <token>` on requests to protected routes.
- On login: hit `/api/auth/login`, persist token, fetch profile via `/api/auth/me`.

## Routing Notes
- Public pages: landing, search, library.
- Protected areas: admin panel, user dashboard (must check token before render).
- Use `BrowserRouter` (no hash) so hosting must serve `index.html` for unknown routes (configure `.htaccess`/rewrites accordingly).

## Data Features
- Library/Research search: calls `/api/search` for suggestions/results.
- Books: public list `/api/books`, downloads via `/api/books/:id/download` when allowed.
- Trees: public `/api/trees`; user and admin views via authenticated routes.

## Environment Variables (frontend)
- Typical: `VITE_API_BASE` for backend URL.
- Do not hardcode secrets into the frontend.

## Handover Tips
- Keep API contracts in sync with backend docs (`backend/api_docs`).
- When adding new routes, update navigation guards and error handling around 401/403.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConregationOrganizer is a full-stack monorepo for managing congregation carts, events, and user bookings. It consists of a React frontend (Vite) and FastAPI backend with PostgreSQL.

## Development Commands

### Frontend (client/)
```bash
cd client
npm install
npm run dev       # Vite dev server on localhost:5173
npm run build     # Production build
npm run lint      # ESLint
```

### Backend (server/)
```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py    # FastAPI on localhost:8000
```

### Database
```bash
docker-compose up -d                      # Start PostgreSQL (port 5433)
python server/scripts/create_admin_user.py    # Bootstrap admin user
python server/scripts/reset_admin_password.py # Reset admin password
```

## Architecture

### Backend Structure
- **routers/**: API endpoints (auth, users, carts, events, bookings) - each feature is a separate router
- **models/**: SQLAlchemy ORM models (User, Cart, Event, CartBooking, RefreshToken)
- **schemas/**: Pydantic request/response validation
- **auth/**: JWT creation (`jwt.py`), security utilities (`security.py`), dependencies (`deps.py`)
- **db/**: Database connection and session management via `get_db()` dependency
- **config.py**: Pydantic settings from environment variables

### Frontend Structure
- **auth/AuthContext.jsx**: Global auth state (React Context)
- **auth/ProtectedRoute.jsx**: Role-based route protection
- **api.js**: Axios instance with JWT Bearer token interceptor
- **layout/**: AppLayout, AdminLayout, UserLayout wrappers
- **pages/**: Organized by user role (entry/, admin/, user/)

## Key Patterns

### Adding a New API Endpoint
1. Create/update schema in `server/schemas/`
2. Create/update model in `server/models/` if needed
3. Add route in `server/routers/`
4. Include router in `server/main.py` if new

### Adding a New Frontend Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Use `ProtectedRoute` wrapper for protected routes with appropriate `allowedRoles`

### Authentication Flow
- Login via `/auth/login` accepts username OR email + password
- Returns JWT access token + user role (stored in localStorage)
- Axios interceptor in `api.js` auto-adds Bearer token to requests
- Refresh tokens support 14-day session extension

## Environment Variables

Backend requires these in `.env` or environment:
```
DATABASE_URL=postgresql://jwco:jwco_dev_pw@localhost:5433/jwco
JWT_SECRET=<change-in-production>
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_EMAIL=system@jwco.local
BOOTSTRAP_ADMIN_USERNAME=congregation-admin
```

## Database

PostgreSQL 16 via Docker Compose:
- Container port: 5433 (maps to internal 5432)
- Credentials: user=jwco, password=jwco_dev_pw, database=jwco

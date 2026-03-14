# Attendify

Multi-tenant school attendance management SaaS built with Next.js 14, Supabase, Zustand, and Tailwind CSS.

## Tech Stack

- **Framework:** Next.js 14 (App Router + TypeScript)
- **Database & Auth:** Supabase (PostgreSQL + RLS + Realtime)
- **State Management:** Zustand (with persist)
- **Styling:** Tailwind CSS
- **Email:** Brevo (transactional)
- **Charts:** Recharts
- **CSV export:** Built-in (zero deps)

## Features

- 🏫 Multi-tenant (each school is isolated via RLS)
- 👥 Roles: Super Admin / Admin / Teacher
- 📅 Weekly planning with slot management
- ✅ Real-time attendance tracking per session
- 📊 Reports with bar/pie charts, per-group & per-student stats
- 📤 CSV export of absence details
- 📧 Email invitations via Brevo
- 🌙 Dark / Light mode
- 🌍 Multilingual: Français / English / العربية (RTL)
- 📱 Fully responsive (mobile drawer sidebar)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/attendify.git
cd attendify
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BREVO_API_KEY=your_brevo_key
FROM_EMAIL=noreply@yourschool.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database

Run the SQL schema in your Supabase SQL editor:

```bash
# File: sql/schema.sql
```

### 4. Run

```bash
npm run dev
```

## Project Structure

```
app/
├── api/                    # API routes (invite, sessions, attendance, delete-user)
├── auth/                   # Login, Register, Accept-invite pages
├── dashboard/              # Admin pages (students, teachers, groups, fields, courses, planning, reports, invitations, settings)
└── teacher/                # Teacher schedule + attendance page

components/
├── analytics/              # Dashboard charts and stat cards
├── dashboard/              # Forms and bulk upload
├── shared/                 # Sidebar, Header, ThemeProvider
└── ui/                     # Button, Input, Badge, Select, etc.

stores/                     # Zustand stores (auth, groups, students, courses, planning, attendance, invitations, settings)
lib/                        # Supabase clients, auth helpers, email, i18n
sql/                        # Database schema
```

## Database Schema

Key tables: `schools`, `profiles`, `fields`, `groups`, `students`, `courses`, `teacher_planning`, `class_sessions`, `attendance`, `invitations`

See `sql/schema.sql` for the full schema with RLS policies.
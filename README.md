# GT Mapper — Unified Platform

**GT Mapper Unified** merges the original GT-Mapper GPS tracking app with FieldOps data collection into a single multi-organisational platform.

## Roles

| Role | Scope | Cap |
|------|-------|-----|
| Super Admin | All organisations | 3 max |
| Supervisor | Own organisation | Unlimited |
| Officer | Own zone | Unlimited |

## Stack
- **Frontend:** React 18 + Vite
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Maps:** Leaflet / react-leaflet
- **Charts:** Recharts

## Setup

### 1. Supabase
1. Create a project at supabase.com
2. Go to SQL Editor → New query
3. Paste and run `supabase_migration_v2.sql`
4. Go to Authentication → Users → Add user (create your first Super Admin)
5. In SQL Editor run:
   ```sql
   UPDATE profiles SET role = 'super_admin' WHERE id = '874e23ef-db3e-4ca4-bbbe-0a830874a14a';
   ```

### 2. Environment variables
Create `.env` in project root:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

### 3. Install & run
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
```bash
npm run build
# Push to GitHub, connect repo to Vercel, add env vars
```

## Features

### Super Admin
- Manage all organisations (create, suspend, delete)
- Approve/reject all Supervisor proposals (zones, users, forms, submission edits)
- Global live map across all orgs
- Real-time presence (online/offline status for all users)
- Full audit log
- Manage 3-seat Super Admin roster

### Supervisor
- GPS live map with officer tracking
- Propose zones, officers, forms (all pending Admin approval)
- Build data collection forms with drag-and-drop field builder
- View & export form submissions (CSV)
- Propose edits to submitted data
- Track own approval request status
- Reports, notifications, settings

### Field Officer
- Collect data with dynamic forms
- Step-by-step field fill with GPS auto-capture
- GPS check-in and visit recording
- View own submission history
- Announcements

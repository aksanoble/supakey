## SupaKey (Supakey) — React + Supabase

This app lets a user manage multiple applications, each with its own schema and migration history. It stores:

- User connection settings: Postgres URL, Supabase URL, Supabase Service Role
- Applications: name, schema, app-level email/password
- Migration entries per application

### Prerequisites

1. **Sqitch CLI** - Database migration tool
   ```bash
   # macOS (using Homebrew)
   brew install sqitch
   
   # Ubuntu/Debian
   sudo apt-get install sqitch
   
   # Windows (using Chocolatey)
   choco install sqitch
   
   # Or download from: https://sqitch.org/download/
   ```

2. **PostgreSQL client** (psql) - Required by Sqitch
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

### Setup

1) Create a Supabase project and set env vars:

Create `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://user:pass@host:port/database
```

2) Deploy database migrations using Sqitch:

```bash
# Navigate to the sqitch directory
cd sqitch

# Deploy all migrations to your database
sqitch deploy --target production

# To revert all migrations (if needed)
sqitch revert --target production

# To check migration status
sqitch status --target production
```

**Note**: The `production` target is configured in `sqitch/sqitch.conf` to use the `DATABASE_URL` from your `.env` file.

3) Deploy edge function (optional):

`supabase/functions/run-app-migrations` is a stub you can deploy in your Supabase project.

### Dev

```bash
npm install
npm run dev
```

### Database Schema

The application uses a custom `supakey` schema with the following tables:

- `user_connections` - User-level database connection settings
- `applications` - User applications with schema names
- `application_migrations` - Migration tracking per application

All tables have Row Level Security (RLS) enabled and appropriate policies for user isolation.

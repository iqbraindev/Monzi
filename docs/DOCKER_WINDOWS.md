# Docker on Windows — Troubleshooting

## Error: `mkdir /run/desktop/mnt/host/d: file exists`

This is a **Docker Desktop bug** when bind-mounting folders from the **`D:` drive**. It affects services that mount the project directory (e.g. `app`, `watch-worker`).

The `supabase-api` service no longer uses a bind mount (nginx config is baked into a small image). If you still see this error on **`app`** or **`watch-worker`**, use one of the options below.

---

## Option A — Hybrid dev (recommended workaround)

Run **infrastructure in Docker**, **app + watch worker on the host**:

```powershell
# 1. Start DB, Redis, PostgREST, Supabase API proxy
docker compose up -d postgres redis postgrest supabase-api

# 2. Apply migrations (first time or after schema changes)
npm run db:migrate:013
npm run db:reload-schema

# 3. Next.js app (terminal 1)
npm run dev

# 4. Watch poller (terminal 2)
npm run watch-worker
```

Ensure `.env` points at local Docker services:

- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/aria`
- `REDIS_URL=redis://localhost:6379`
- `SUPABASE_URL=http://localhost:54321` (or `http://127.0.0.1:54321`)

---

## Option B — Fix Docker Desktop D: drive sharing

1. **Docker Desktop** → **Settings** → **Resources** → **File sharing**
2. Ensure **`D:\`** is listed and enabled
3. **Apply & restart**
4. In PowerShell (admin optional):
   ```powershell
   wsl --shutdown
   ```
5. Quit and reopen **Docker Desktop**
6. Retry:
   ```powershell
   docker compose up -d
   ```

---

## Option C — Move the repo off `D:`

Clone or move the project to **`C:\`** or into **WSL**:

```powershell
# WSL example
wsl
cd ~
git clone <your-repo-url> Monzi-2.1
cd Monzi-2.1
docker compose up -d
```

Linux filesystem paths avoid the `/run/desktop/mnt/host/d` mount bug.

---

## Option D — Reset Docker Desktop (last resort)

Docker Desktop → **Troubleshoot** → **Reset to factory defaults**

Then re-enable **D:** file sharing (Option B) before starting compose again.

---

## Verify infra is healthy

```powershell
docker compose ps
curl http://localhost:54321/health
```

You should see `ok` from the Supabase API proxy.

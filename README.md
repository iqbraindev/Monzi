# Monzi

AI-powered dashboard and agent platform built with Next.js 16, Clerk, and Supabase-compatible Postgres.

## Quick Start (Docker — recommended)

```bash
cp .env.example .env   # fill in Clerk, OpenRouter, and other external keys
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). See [DOCKER.md](./DOCKER.md) for full setup, architecture, and troubleshooting.

## Local Development (without Docker app container)

```bash
docker compose up postgres postgrest redis -d
cp .env.example .env
npm install
npm run dev
```

## Health Check

```bash
curl http://localhost:3000/api/health
```

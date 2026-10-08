# Deployment guide (free tier)

You will end up with three public links:

| What | Where | Example |
|---|---|---|
| Web app | Vercel | `https://taskflow-pro.vercel.app` |
| API + Swagger | Render | `https://taskflow-pro-api.onrender.com/api/docs` |
| Automation report | GitHub Pages | `https://<you>.github.io/taskflow-pro/` (after the CI/CD stories) |

Order matters: **GitHub → Database → API → Web → CI links**. Total time: about 45 minutes.

> Free-tier note: Render's free web services go to sleep when idle, so the first request after a pause can take 30–60 seconds. Your test pipelines should "wake" the API (call `/health` in a loop) before testing. Check each provider's pricing page for current limits.

---

## Step 1 – Push the code to GitHub

```bash
cd taskflow-pro
git init
git add .
git commit -m "feat: TaskFlow Pro v1.0 – application"
git branch -M main
# create an EMPTY public repo named taskflow-pro on github.com first, then:
git remote add origin https://github.com/<your-username>/taskflow-pro.git
git push -u origin main
```

Keep the repo **public**: GitHub Pages and unlimited Actions minutes are free for public repos, and recruiters can see it.

## Step 2 – Database on Neon

1. Sign up at https://neon.com with GitHub.
2. **Create project** → name `taskflow-pro`, Postgres 17, region **AWS Asia Pacific (Singapore)** (closest to India).
3. Copy the **connection string** from the dashboard. It looks like:
   `postgresql://neondb_owner:xxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it safe. You'll paste it into Render in the next step.

## Step 3 – API on Render

1. Sign up at https://render.com with GitHub.
2. **New → Blueprint** → choose your `taskflow-pro` repo. Render reads `render.yaml`.
3. When prompted, fill:
   - `DATABASE_URL` = the Neon string from step 2
   - `CORS_ORIGIN` = `http://localhost:3000` for now (you'll update it after step 4)
4. Click **Apply**. The first build takes ~5 minutes. Migrations run automatically on every start.
5. **Seed demo users once.** Render → your service → **Shell** tab:
   ```bash
   cd apps/api && node dist/database/seed.js
   ```
   *(No shell on the free plan? Run it from your laptop instead: set `DATABASE_URL` to the Neon string and `DATABASE_SSL=true` in `apps/api/.env`, then `pnpm db:seed`.)*

   The seed also creates the read-only **guest** user behind the "Continue as guest" button. Already deployed before guest mode existed? Push the new code (Render applies the new migration on start), then run the seed once more. It only adds the guest and leaves your other data alone.
6. Open `https://<your-api>.onrender.com/api/v1/health` → you should see `{"status":"ok","database":"up",...}`
7. Open `https://<your-api>.onrender.com/api/docs` → Swagger UI.

## Step 4 – Web on Vercel

1. Sign up at https://vercel.com with GitHub → **Add New → Project** → import `taskflow-pro`.
2. **Root Directory:** `apps/web` (click *Edit*). Framework preset: Next.js (auto-detected).
3. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` = `https://<your-api>.onrender.com/api/v1`
4. **Deploy.** You get `https://<project>.vercel.app`.
5. Go back to **Render → Environment** and set `CORS_ORIGIN` to your Vercel URL (comma-separate several, e.g. `https://taskflow-pro.vercel.app,http://localhost:3000`). Render redeploys.
6. Log in as `admin@taskflow.dev` / `Password@123`. 🎉


## Step 5 – Automation report link (later)

Your public test-report link (`https://<your-username>.github.io/taskflow-pro/`) comes from the **CI/CD epic** in the tracker. You'll build that pipeline yourself. For now, just enable **Settings → Pages → Source: GitHub Actions** so it's ready.

## Step 6 – Note your deployed URLs

Keep the Vercel and Render URLs handy. Several tracker stories run your tests against the deployed environment (`BASE_URL` / `API_URL`), and the nightly-smoke story stores them as GitHub repo variables.

## Step 7 – Update the README

Replace `<your-username>`, `<your-app>` and `<your-api>` in `README.md` with your real values so the badges and links work. Put the three links on your resume and LinkedIn.

---

## Alternative: everything in Docker

```bash
docker compose up --build
docker compose exec api node dist/database/seed.js
```
App on http://localhost:3000, API on http://localhost:4000. The same images can be deployed to Railway, Fly.io, AWS ECS or Azure Container Apps.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser console shows a CORS error | `CORS_ORIGIN` on Render must exactly match the Vercel URL (no trailing slash) |
| Login works locally but not in prod | Check `NEXT_PUBLIC_API_URL` on Vercel ends with `/api/v1`, then **redeploy** (it's baked in at build time) |
| API health shows `database: down` | Wrong `DATABASE_URL`, or `DATABASE_SSL` is not `true` for Neon |
| First request is very slow | The Render free instance was asleep; it wakes in under a minute |
| `relation "users" does not exist` | Migrations didn't run: check the Render deploy logs for `✅ Migrations applied` |

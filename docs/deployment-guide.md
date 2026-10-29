# DevTrack — Deployment & Operations Guide

## 1. Prerequisites
- **Node.js:** v20.x LTS or higher
- **Package Manager:** npm v10.x or higher
- **Container Engine (Optional):** Docker Desktop v24+ & Docker Compose v2.20+
- **Database (Optional for native backend):** PostgreSQL 16

---

## 2. Quickstart — Local Development

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/ShanmukhaAditya1056/CSA1001-SE.git
cd CSA1001-SE
npm install
```

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
```

### Step 3: Run Development Server
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

---

## 3. Containerized Deployment with Docker Compose

DevTrack provides a complete multi-container setup including a PostgreSQL 16 database and production web server.

### Run Containers
```bash
docker compose up --build -d
```

### Check Container Health
```bash
docker compose ps
docker compose logs -f
```

### Stop Containers
```bash
docker compose down
```

---

## 4. Cloud Deployment (Vercel & Render)

DevTrack is architected for seamless cloud deployment:
- **Frontend SPA:** Deployed on **Vercel** with global edge CDN, automatic SPA route rewriting (`vercel.json`), and instant HTTPS.
- **Backend API:** Deployed on **Render** as a high-availability Node.js Web Service (`render.yaml`).

### Deploying the Frontend to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Import the GitHub repository: `ShanmukhaAditya1056/CSA1001-SE`.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variables in the Vercel Project Settings (Copy the values from your local `.env`):
   - `VITE_FIREBASE_API_KEY`: *(From your .env)*
   - `VITE_FIREBASE_AUTH_DOMAIN`: *(From your .env)*
   - `VITE_FIREBASE_PROJECT_ID`: *(From your .env)*
   - `VITE_FIREBASE_STORAGE_BUCKET`: *(From your .env)*
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: *(From your .env)*
   - `VITE_FIREBASE_APP_ID`: *(From your .env)*
   - `VITE_FIREBASE_MEASUREMENT_ID`: *(From your .env)*
6. Click **Deploy**. Vercel will build the frontend and provide a live URL (`https://<project-name>.vercel.app`).

### Deploying the Backend to Render

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Web Service**.
3. Connect your repository: `ShanmukhaAditya1056/CSA1001-SE`.
4. Configure Web Service Settings:
   - **Name:** `devtrack-api`
   - **Region:** Any preferred region (e.g. Oregon, Frankfurt, Singapore)
   - **Branch:** `main`
   - **Root Directory:** `./`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node server/src/server.js`)
   - **Instance Type:** `Free`
5. Add Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (or leave default, Render sets this automatically)
   - `CLIENT_URL`: `https://<your-vercel-domain>.vercel.app`
   - `JWT_SECRET`: *(A long random secret string)*
6. Click **Create Web Service**. Render will provision and launch the backend at `https://devtrack-api.onrender.com`.

---

## 5. Troubleshooting & FAQ

### Port 5173 or 5432 Already in Use
If another service is using port 5173:
```bash
npm run dev -- --port 3000
```

### Database Connection Refused
Ensure the PostgreSQL container has passed its healthcheck:
```bash
docker compose exec postgres pg_isready -U devtrack -d devtrack
```

### Resetting Seed Data
To restore factory default demo users and lifecycle records, open the web app, navigate to **Settings & Audit** (`#/settings`), and click **"Reset Data to Initial Seed State"**.


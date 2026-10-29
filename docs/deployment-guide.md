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

## 4. Troubleshooting & FAQ

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

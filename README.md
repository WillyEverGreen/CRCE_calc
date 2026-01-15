# CRCE Results Portal 🎓

A fast, modern web application to check your Fr. CRCE academic results and SGPA calculations.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Playwright](https://img.shields.io/badge/Playwright-1.57-green)
![Redis](https://img.shields.io/badge/Upstash-Redis-red)

## ✨ Features

- **📊 Instant SGPA Calculation** - Accurate grade point calculations
- **🚀 Fast Performance** - Cookie replay optimization (20x faster data fetching)
- **💾 Smart Caching** - 6-hour Redis cache for instant repeat lookups
- **👥 Multi-User Support** - Queue system handles 16+ concurrent users
- **📱 Mobile-First Design** - Beautiful responsive UI with dark mode
- **🔄 Real-time Updates** - Live progress streaming during data fetch

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Request                            │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis Cache Check                         │
│                 (Cache hit? → Instant response!)             │
└─────────────────────┬───────────────────────────────────────┘
                      ▼ (Cache miss)
┌─────────────────────────────────────────────────────────────┐
│                    Queue System                              │
│           MAX_CONCURRENT=4 | MAX_QUEUE=12                    │
│         (Position updates every 2 seconds)                   │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Playwright Login (~10s)                         │
│         (Handles reCAPTCHA, captures cookies)                │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          🍪 Cookie Replay + Early Browser Close              │
│              (Browser closes, HTTP takes over)               │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Parallel HTTP Subject Fetching (~0.5s)             │
│              (20x faster than browser-based)                 │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   SGPA Calculation                           │
│            (Cache result, return to user)                    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Upstash Redis account (for caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/crce-results.git
cd crce-results

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Copy environment template
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```env
# Upstash Redis (required for caching)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Admin panel access
ADMIN_KEY=your_secret_admin_key
```

### Run Locally

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000`

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape` | POST | Fetch results (SSE streaming) |
| `/api/admin?key=ADMIN_KEY` | GET | View queue stats & analytics |
| `/api/health` | GET | Health check for keep-alive |

### Scrape Request

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"prn": "MU1234567890", "dob": "01-01-2000"}'
```

## ⚡ Performance Optimizations

### Cookie Replay Strategy
Instead of keeping the browser open for the entire request, we:
1. Use Playwright only for login (handles reCAPTCHA)
2. Capture session cookies
3. Close browser immediately (~10s vs 60s)
4. Use pure HTTP for all data fetching (20x faster)

### Queue System
- **4 concurrent** browser instances
- **12 queued** users with live position updates
- **Race condition protection** prevents slot leaks
- **Client disconnect detection** frees slots instantly

### Caching
- **6-hour TTL** on results
- Cache hits return in **<200ms**
- Force refresh available for users

## 🧪 Testing

### Load Test (10 concurrent users)

```bash
# Start with memory limit (simulates Render)
npm run dev:mem-test

# Run load test
npm run test:load
```

### Cookie Replay Test

```bash
node test-cookie-replay.js
```

## 🌐 Deployment (Render)

### render.yaml

```yaml
services:
  - type: web
    name: crce-results
    env: node
    plan: free
    buildCommand: npm install && npx playwright install chromium --with-deps
    startCommand: npm start
    envVars:
      - key: UPSTASH_REDIS_REST_URL
        sync: false
      - key: UPSTASH_REDIS_REST_TOKEN
        sync: false
      - key: ADMIN_KEY
        sync: false
```

### Prevent Cold Starts

Set up [UptimeRobot](https://uptimerobot.com) to ping `/api/health` every 5 minutes.

## 📊 Admin Panel

Access queue stats and analytics:

```
GET /api/admin?key=YOUR_ADMIN_KEY
```

Returns:
```json
{
  "stats": {
    "totalRequests": 1234,
    "todayRequests": 56,
    "cacheHits": 789,
    "uniqueUsers": 234
  },
  "queue": {
    "active": 2,
    "waiting": ["MU12****5678"],
    "maxConcurrent": 4
  }
}
```

## 🔧 Configuration

### Queue Settings (route.ts)

```typescript
const MAX_CONCURRENT = 4;  // Parallel browser instances
const MAX_QUEUE = 12;      // Max users waiting
const CACHE_TTL = 60 * 60 * 6;  // 6 hours
```

### Memory Optimization

For 512MB RAM (Render free tier):
- MAX_CONCURRENT = 4 (with early browser close)
- Browser lifetime: ~10s per request

For 1GB+ RAM:
- MAX_CONCURRENT = 8-10
- Can handle 20+ concurrent users

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── scrape/route.ts   # Main scraping logic
│   │   ├── admin/route.ts    # Analytics & queue stats
│   │   └── health/route.ts   # Keep-alive endpoint
│   ├── page.tsx              # Home page
│   └── about/page.tsx        # About page
├── lib/
│   └── creditMap.ts          # Subject credit mappings
└── components/
```

## 🛡️ Reliability Features

| Feature | Protection |
|---------|------------|
| Queue overflow | Fail-fast after MAX_QUEUE (no crashes) |
| Slot leaks | `timedOut` flag prevents race conditions |
| Stuck requests | 60s queue timeout with cleanup |
| Client disconnect | Instant slot release via AbortController |
| Browser crashes | Always caught, slot released in finally |
| Redis failures | Graceful degradation, errors logged |

## 📝 License

MIT License - Built for Fr. CRCE students by PCELL

---

**Made with 💚 by Sai Balkawade**

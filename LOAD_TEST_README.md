# Load Testing Guide - 512MB RAM Constraint

## Quick Start

### Option 1: Using Node.js Memory Limit (Fastest)

```bash
# Start your dev server with 512MB memory limit
NODE_OPTIONS="--max-old-space-size=512" npm run dev

# In a new terminal, run the load test
node load-test.js
```

### Option 2: Using Docker (Most Accurate)

```bash
# Build the Docker image
docker build -t crce-test .

# Run with 512MB memory limit
docker run -m 512m -p 3000:3000 --env-file .env.local crce-test

# In a new terminal, run the load test
node load-test.js
```

---

## Test Configuration

The load test simulates **10 concurrent users** hitting the API simultaneously:

- **Expected behavior:**
  - 2 users process immediately (MAX_CONCURRENT = 2)
  - 8 users wait in queue (MAX_QUEUE = 10)
  - All receive position updates every 2 seconds
  - No timeouts, no errors, no stuck states

---

## Understanding the Output

### During Test
```
[User 1] Starting request...
[User 2] Starting request...
[User 3] ⏳ Queue position: #1 (2/2 browsers active)
[User 4] ⏳ Queue position: #2 (2/2 browsers active)
...
[User 1] ✓ SUCCESS (35.2s) - Processed immediately
[User 3] ✓ SUCCESS (67.5s) - Was in queue at position #1
```

### Success Criteria
- ✓ All requests processed (10/10)
- ✓ No timeouts (0)
- ✓ No errors (0)
- ✓ 2 users immediate, 8 queued

---

## Monitoring During Test

### Watch Server Logs
In your dev server terminal, you'll see:
```
[PRN] Checking queue status: activeRequests=2, queueLength=6
[PRN] Queue slot acquired, activeRequests: 2
[Parallel] Fetched 8/8 subjects in 1523ms
```

### Check Admin Panel
While test is running:
```bash
curl "http://localhost:3000/api/admin?key=YOUR_ADMIN_KEY" | jq
```

Expected output:
```json
{
  "queue": {
    "active": 2,
    "waiting": ["TEST****0003", "TEST****0004", ...],
    "maxConcurrent": 2
  }
}
```

---

## Memory Monitoring

### Check Node.js Memory Usage
```bash
# Linux/Mac
ps aux | grep node

# Windows PowerShell
Get-Process node | Select-Object WorkingSet64
```

### Expected Memory Profile
- **Idle:** ~100-150MB
- **2 active browsers:** ~350-450MB
- **Peak during processing:** ~400-500MB
- **Should NOT exceed:** 512MB

---

## What to Look For

### ✅ Good Signs
- All 10 requests complete successfully
- Queue positions update regularly (every 2s)
- Response times: 30-60s for immediate, 60-180s for queued
- No "slot leak" errors in logs
- Memory stays under 512MB

### ❌ Bad Signs
- Timeouts after 60 seconds
- "High traffic" errors (queue overflow)
- Memory exceeding 512MB → crashes
- Logs showing "slot leak" or "stuck" errors
- Queue positions not updating

---

## Adjusting the Test

Edit `load-test.js`:

```javascript
// Test with different user counts
const NUM_USERS = 15; // Will cause 5 to fail-fast (queue overflow)

// Test with different credentials (if you have valid test accounts)
const TEST_USERS = [
  { prn: 'YOUR_REAL_PRN', dob: '01-01-2000' },
  // ... more users
];
```

---

## Expected Results

With **MAX_CONCURRENT = 2** and **512MB RAM**:

| Metric | Expected Value |
|--------|---------------|
| **Success rate** | 100% (10/10) |
| **Immediate processing** | 2 users |
| **Queued users** | 8 users |
| **Avg response time** | 60-120s |
| **Max memory** | ~450MB |
| **Timeouts** | 0 |
| **Errors** | 0 |

---

## Troubleshooting

### "Connection refused"
- Make sure dev server is running on port 3000
- Check `npm run dev` is active

### "Invalid credentials"
- The test uses dummy PRNs by default
- For real testing, use valid credentials in TEST_USERS

### Memory crashes
- If server crashes under 512MB with 2 concurrent
- Indicates need for browser optimization
- Check Playwright args in route.ts

### Queue timeouts
- If users timeout after 60s
- Might indicate scraping is too slow
- Check parallel fetch performance

---

## Next Steps After Testing

1. **If test passes:** System is ready for Render deployment
2. **If memory issues:** Reduce MAX_CONCURRENT to 1
3. **If queue works well:** Consider increasing MAX_CONCURRENT to 3-4 (monitor first)
4. **Document results:** Share output in commit message or docs

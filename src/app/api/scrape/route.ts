import { chromium, Browser } from "playwright";
import { load } from "cheerio";
import { Redis } from "@upstash/redis";
import { getCredits } from "@/lib/creditMap";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ---------------------- REDIS CACHE ----------------------
const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

// Log Redis status on startup
console.log(`[Redis] Status: ${redis ? 'CONNECTED' : 'NOT CONFIGURED (caching disabled)'}`);
if (!redis) {
  console.log('[Redis] Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable caching');
}

const CACHE_TTL = 60 * 60 * 6; // 6 hours (fresher data)

// ---------------------- ANALYTICS ----------------------
async function trackAnalytics(prn: string, isCacheHit: boolean) {
  if (!redis) return;
  try {
    const today = new Date().toISOString().split("T")[0];
    await Promise.all([
      redis.incr("stats:total"),
      redis.incr(`stats:daily:${today}`),
      isCacheHit ? redis.incr("stats:cache_hits") : Promise.resolve(),
      redis.lpush("stats:recent_users", prn),
      redis.ltrim("stats:recent_users", 0, 99), // Keep last 100
      redis.sadd("stats:unique_users", prn),    // Track unique PRNs (Set = no duplicates)
      redis.sadd(`stats:unique_daily:${today}`, prn) // Unique users today
    ]);
  } catch (e) {
    // Analytics error shouldn't break the app
  }
}

// ---------------------- QUEUE ----------------------
let activeRequests = 0;
const MAX_CONCURRENT = 4; // Increased capacity with parallel HTTP fetch (low memory)
const queue: Array<() => void> = [];

// Sync queue state to Redis for admin panel
async function syncQueueToRedis(prn?: string, action?: 'add' | 'remove') {
  if (!redis) return;
  try {
    await redis.set("queue:active", activeRequests);
    if (prn && action === 'add') {
      await redis.lpush("queue:waiting", prn);
    } else if (prn && action === 'remove') {
      await redis.lrem("queue:waiting", 1, prn);
    }
  } catch (e) {
    // Ignore sync errors
  }
}

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    await syncQueueToRedis();
    return;
  }
  return new Promise(resolve => queue.push(() => {
    activeRequests++;
    syncQueueToRedis();
    resolve();
  }));
}

async function releaseSlot(): Promise<void> {
  activeRequests--;
  await syncQueueToRedis();
  if (queue.length > 0) {
    const next = queue.shift();
    next?.();
  }
}

function getQueuePosition(): number {
  return queue.length + 1;
}

// ---------------------- TYPES ------------------------
interface Mark { obtained: number; max: number; }
interface Subject { subjectName: string; marks: string[]; totalObt: number; totalMax: number; percentage: number | null; grade: string; gradePoint: number | null; credits?: number; }
interface Result { sgpa: number | null; estimatedCgpa: number | null; totalMarksAll: number; maxMarksAll: number; subjects: Subject[]; }

// ---------------------- HELPERS ------------------------
const percentToGrade = (p: number | null | undefined): string => {
  if (p === null || p === undefined) return "NA";
  if (p >= 85) return "O"; if (p >= 80) return "A"; if (p >= 70) return "B"; if (p >= 60) return "C";
  if (p >= 50) return "D"; if (p >= 45) return "E"; if (p >= 40) return "P"; return "F";
};
const gradeToPoint: Record<string, number | null> = { O: 10, A: 9, B: 8, C: 7, D: 6, E: 5, P: 4, F: 0, NA: null };

function parseMark(raw: string | null): Mark | null {
  if (!raw) return null; raw = raw.trim(); if (!raw.includes("/")) return null;
  const parts = raw.split("/");
  const obt = Number(parts[0].replace(/[^\d.]/g, ""));
  const max = Number(parts[1].replace(/[^\d.]/g, ""));
  if (Number.isFinite(obt) && Number.isFinite(max)) return { obtained: obt, max };
  return null;
}

// getCredits is now imported from @/lib/creditMap

function computeSGPA(subjects: Subject[]): number | null {
  let totalPoints = 0; let totalCredits = 0;
  for (const s of subjects) {
    if (s.gradePoint !== null && s.gradePoint !== undefined) {
      const credits = s.credits || getCredits(s.subjectName);
      totalPoints += s.gradePoint * credits; totalCredits += credits;
    }
  }
  if (totalCredits === 0) return null;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

export async function POST(req: Request) {
  const { prn, dob, forceRefresh } = await req.json();
  const encoder = new TextEncoder();
  const cacheKey = `crce:${prn}:${dob}`;
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (message: string, current?: number, total?: number) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", message, current, total })}\n\n`));
      };

      // Check cache first (unless forceRefresh is true)
      if (redis && !forceRefresh) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            await trackAnalytics(prn, true); // Track cache hit
            sendProgress("✅ Retrieved from cache (instant!) - Use 'Refresh' button for latest data");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", data: cached, fromCache: true })}\n\n`));
            controller.close();
            return;
          }
        } catch (e) {
          // Cache miss, continue with scrape
        }
      }
      
      if (forceRefresh) {
        sendProgress("🔄 Fetching fresh data (ignoring cache)...");
      }

      // Queue management with dynamic updates
      if (activeRequests >= MAX_CONCURRENT) {
        let myPosition = queue.length + 1;
        sendProgress(`⏳ You're #${myPosition} in queue...`);
        await syncQueueToRedis(prn, 'add');
        
        // Wait for slot with dynamic position updates
        await new Promise<void>(resolve => {
          const myCallback = () => {
            clearInterval(checkInterval);
            activeRequests++;
            syncQueueToRedis(prn, 'remove');
            resolve();
          };
          
          queue.push(myCallback);
          
          // Update position every 3 seconds
          const checkInterval = setInterval(() => {
            const newPosition = queue.indexOf(myCallback) + 1;
            if (newPosition > 0 && newPosition !== myPosition) {
              myPosition = newPosition;
              sendProgress(`⏳ You're #${myPosition} in queue...`);
            }
          }, 3000);
        });
      } else {
        activeRequests++;
        await syncQueueToRedis();
      }
      
      sendProgress("🚀 Processing your request...");

      let browser: Browser | undefined;
      try {
        const baseUrl = "https://crce-students.contineo.in/parents";
        const parts = dob.trim().split(/[-/]/);
        if (parts.length < 3) throw new Error("Invalid DOB format (DD-MM-YYYY)");
        const dd = parts[0];
        const mm = parts[1];
        const yyyy = parts[2];

        sendProgress("🌐 Launching browser...");
        
        // Use local Playwright with aggressive memory optimization
        browser = await chromium.launch({ 
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--disable-features=site-per-process',
            '--no-first-run',
            '--no-zygote'
          ]
        });
        
        const context = await browser.newContext({ 
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" 
        });
        const page = await context.newPage();

        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if ([
            "image", "stylesheet", "font", "media",
            "websocket", "manifest", "other"
          ].includes(type)) {
            return route.abort();
          }
          route.continue();
        });

        sendProgress("🔐 Logging into portal...");
        await page.goto(baseUrl + "/", { waitUntil: "networkidle" });

        await page.fill("#username", prn.trim());
        await page.selectOption("#dd", { value: (dd.length < 2 ? "0" + dd : dd) + " " });
        await page.selectOption("#mm", { value: (mm.length < 2 ? "0" + mm : mm) });
        await page.selectOption("#yyyy", { value: yyyy });

        await Promise.all([
          page.click(".cn-login-btn"),
          page.waitForNavigation({ waitUntil: "networkidle" })
        ]);

        if (page.url().includes("login") || await page.isVisible(".alert-error")) {
          throw new Error("Invalid credentials - please check PRN and DOB");
        }

        sendProgress("📚 Finding your subjects...");
        
        // Get dashboard HTML to find subject URLs
        const dashboardHtml = await page.content();
        const dashboard$ = load(dashboardHtml);
        const subjectUrls: string[] = [];
        
        dashboard$('a[href*="task=ciedetails"]').each((_, el) => {
          const href = dashboard$(el).attr('href');
          if (href) {
            let fullUrl: string;
            if (href.startsWith('http')) {
              fullUrl = href;
            } else if (href.startsWith('/')) {
              fullUrl = 'https://crce-students.contineo.in' + href;
            } else {
              fullUrl = baseUrl + '/' + href;
            }
            subjectUrls.push(fullUrl);
          }
        });
        
        if (subjectUrls.length === 0) throw new Error("No subjects found on dashboard");
        
        // Get cookies for HTTP requests
        const cookies = await context.cookies();
        const cookieHeader = cookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join('; ');
        
        sendProgress(`🚀 Parallel fetching ${subjectUrls.length} subjects...`);
        
        // Helper: fetch and parse one subject with timeout
        async function fetchSubject(url: string): Promise<Subject | null> {
          try {
            // Create timeout for fetch
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const response = await fetch(url, {
              headers: {
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
              },
              signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) return null;
            
            const html = await response.text();
            const $$ = load(html);
            
            // Check if redirected to login
            if (html.includes('Login to Your Account')) return null;
            
            let subjectName = $$("caption").first().text().trim();
            if (!subjectName) {
              $$("h3, .uk-h3").each((_, el) => {
                const t = $$(el).text().trim();
                if (t.match(/\d{2}[A-Z]{2,3}\d{2}[A-Z]{2}\d{2}/) || t.length > 5) {
                  subjectName = t;
                  return false;
                }
              });
            }
            if (!subjectName) return null;
            
            let foundMarks: Mark[] = [];
            $$("tr").each((_, tr) => {
              const cells = $$(tr).find("td").map((_, td) => $$(td).text().trim()).get();
              const parsedRow = cells.filter(c => c.match(/\d+(\.\d+)?\s*\/\s*\d+/))
                .map(m => parseMark(m)).filter((x): x is Mark => x !== null);
              if (parsedRow.length > 0) {
                foundMarks = parsedRow;
                return false;
              }
            });
            
            if (foundMarks.length === 0) return null;
            
            const credits = getCredits(subjectName);
            
            // Skip DM (Double Minor) subjects
            if (credits === 0 && subjectName.match(/25DM/i)) {
              return null;
            }
            
            let totalObt = 0, totalMax = 0;
            foundMarks.forEach(m => { totalObt += m.obtained; totalMax += m.max; });
            const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : null;
            const grade = percentage !== null ? percentToGrade(percentage) : "NA";
            
            return {
              subjectName,
              marks: foundMarks.map(m => `${m.obtained}/${m.max}`),
              totalObt: Math.round(totalObt * 100) / 100,
              totalMax,
              percentage,
              grade,
              gradePoint: gradeToPoint[grade],
              credits
            };
          } catch {
            return null;
          }
        }
        
        // Fetch ALL subjects in parallel
        const startFetch = Date.now();
        const results = await Promise.all(subjectUrls.map(url => fetchSubject(url)));
        const subjects = results.filter((r): r is Subject => r !== null);
        
        console.log(`[Parallel] Fetched ${subjects.length}/${subjectUrls.length} subjects in ${Date.now() - startFetch}ms`);
        
        // Safety check: ensure we got at least some subjects
        if (subjects.length === 0) {
          throw new Error("Could not fetch any subjects. Session may have expired. Please try again.");
        }

        sendProgress("📊 Calculating your SGPA...");
        const totalMarksAll = subjects.reduce((a, s) => a + s.totalObt, 0);
        const maxMarksAll = subjects.reduce((a, s) => a + s.totalMax, 0);
        const sgpa = computeSGPA(subjects);

        const result = { sgpa, estimatedCgpa: sgpa, totalMarksAll, maxMarksAll, subjects };

        // Cache the result
        if (redis) {
          try {
            await redis.set(cacheKey, result, { ex: CACHE_TTL });
            await trackAnalytics(prn, false); // Track fresh scrape
            sendProgress("💾 Result cached for faster access next time!");
          } catch (e) {
            // Cache save failed, continue anyway
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", data: result })}\n\n`));
      } catch (err: any) {
        let errorMessage = err?.message || "Unknown error occurred";
        
        // Handle various crash/error scenarios
        if (errorMessage.includes("Target closed") || 
            errorMessage.includes("Protocol error") || 
            errorMessage.includes("browser has been closed") ||
            errorMessage.includes("Browser closed") ||
            errorMessage.includes("Execution context was destroyed")) {
          console.error("[CRASH] Browser crash/OOM:", errorMessage);
          errorMessage = "Server busy (High Traffic). Please try again in 30 seconds.";
        } else if (errorMessage.includes("Navigation timeout") ||
                   errorMessage.includes("Timeout") ||
                   errorMessage.includes("timeout")) {
          console.error("[TIMEOUT] Navigation timeout:", errorMessage);
          errorMessage = "Portal is slow to respond. Please try again.";
        } else if (errorMessage.includes("net::ERR") ||
                   errorMessage.includes("ECONNREFUSED") ||
                   errorMessage.includes("fetch failed")) {
          console.error("[NETWORK] Network error:", errorMessage);
          errorMessage = "Cannot reach the portal. Please check your connection.";
        } else if (errorMessage.includes("Invalid credentials")) {
          // Keep as is - user-facing error
        } else if (errorMessage.includes("No subjects found")) {
          // Keep as is - user-facing error
        } else {
          console.error("[ERROR] Unexpected error:", errorMessage);
          // Don't expose internal errors
          if (!errorMessage.includes("PRN") && !errorMessage.includes("DOB")) {
            errorMessage = "Something went wrong. Please try again.";
          }
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`));
      } finally {
        // Always clean up browser
        if (browser) {
          try {
            await browser.close();
          } catch (closeErr) {
            console.error("[CLEANUP] Failed to close browser:", closeErr);
          }
        }
        releaseSlot();
      }
      controller.close();
    }
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
}

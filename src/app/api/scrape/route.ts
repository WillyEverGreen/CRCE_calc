import { chromium, Browser } from "playwright-core";
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
      redis.ltrim("stats:recent_users", 0, 99) // Keep last 100
    ]);
  } catch (e) {
    // Analytics error shouldn't break the app
  }
}

// ---------------------- QUEUE ----------------------
let activeRequests = 0;
const MAX_CONCURRENT = 2; // Restored for production
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
        
        // Use local Playwright (fast on Render.com)
        browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const context = await browser.newContext({ 
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" 
        });
        const page = await context.newPage();

        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (["image", "stylesheet", "font", "media"].includes(type)) return route.abort();
          route.continue();
        });

        sendProgress("🔐 Logging into portal...");
        await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded" });

        await page.fill("#username", prn.trim());
        await page.selectOption("#dd", { value: (dd.length < 2 ? "0" + dd : dd) + " " });
        await page.selectOption("#mm", { value: (mm.length < 2 ? "0" + mm : mm) });
        await page.selectOption("#yyyy", { value: yyyy });

        await Promise.all([
          page.click(".cn-login-btn"),
          page.waitForNavigation({ waitUntil: "domcontentloaded" })
        ]);

        if (page.url().includes("login") || await page.isVisible(".alert-error")) {
          throw new Error("Invalid credentials - please check PRN and DOB");
        }

        sendProgress("📚 Finding your subjects...");
        
        let cieLinksCount = await page.locator('a[href*="task=ciedetails"]').count();
        if (cieLinksCount === 0) throw new Error("No subjects found on dashboard");

        const subjects: Subject[] = [];
        let processedCount = 0;
        
        for (let i = 0; i < cieLinksCount; i++) {
          sendProgress(`📖 Reading subject ${i + 1}/${cieLinksCount}...`, i + 1, cieLinksCount);
          
          const link = page.locator('a[href*="task=ciedetails"]').nth(i);
          
          try {
            await Promise.all([
              link.click(),
              page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 })
            ]);
          } catch (e) {
            await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
            continue;
          }
          
          await page.waitForTimeout(200);

          const content = await page.content();
          const $$ = load(content);

          let subjectName = $$("caption").first().text().trim();
          if (!subjectName) {
            $$("h3, .uk-h3").each((_, el) => {
                const t = $$(el).text().trim();
                if (t.match(/\d{2}[A-Z]{2,3}\d{2}[A-Z]{2}\d{2}/) || t.length > 5) {
                    subjectName = t; return false;
                }
            });
          }
          if (!subjectName) subjectName = "Unknown Subject";
          
          if (subjectName.includes("25DM")) {
            await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
            continue;
          }

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

          if (foundMarks.length > 0) {
            let totalObt = 0, totalMax = 0;
            foundMarks.forEach(m => { totalObt += m.obtained; totalMax += m.max; });
            const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : null;
            const grade = percentage !== null ? percentToGrade(percentage) : "NA";

            subjects.push({
              subjectName, marks: foundMarks.map(m => `${m.obtained}/${m.max}`), 
              totalObt: Math.round(totalObt * 100) / 100, totalMax, 
              percentage, grade, gradePoint: gradeToPoint[grade],
              credits: getCredits(subjectName)
            });
            processedCount++;
          }
          
          await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
          await page.waitForTimeout(100);
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
        let errorMessage = err.message;
        
        // Handle OOM / Browser crash specific errors
        if (errorMessage.includes("Target closed") || 
            errorMessage.includes("Protocol error") || 
            errorMessage.includes("browser has been closed")) {
          console.error("Browser crash potential OOM:", errorMessage);
          errorMessage = "Server busy (High Traffic). Please try again in 30 seconds.";
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`));
      } finally {
        if (browser) await browser.close().catch(() => {});
        releaseSlot();
      }
      controller.close();
    }
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
}

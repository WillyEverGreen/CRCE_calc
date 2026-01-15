import { chromium, Browser } from "playwright";
import { load } from "cheerio";
import { Redis } from "@upstash/redis";
import { getCredits } from "@/lib/creditMap";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ---------------------- REDIS CACHE ----------------------
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Log Redis status on startup
console.log(
  `[Redis] Status: ${redis ? "CONNECTED" : "NOT CONFIGURED (caching disabled)"}`
);
if (!redis) {
  console.log(
    "[Redis] Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable caching"
  );
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
      redis.sadd("stats:unique_users", prn), // Track unique PRNs (Set = no duplicates)
      redis.sadd(`stats:unique_daily:${today}`, prn), // Unique users today
    ]);
  } catch {
    // Analytics error shouldn't break the app
  }
}

// ---------------------- QUEUE ----------------------
let activeRequests = 0;
const MAX_CONCURRENT = 4; // Increased! Early browser close = lower memory per request
const MAX_QUEUE = 12; // Proportionally increased with MAX_CONCURRENT
const LOGIN_RETRIES = 2; // Retry login without spawning new browser
const queue: Array<() => void> = [];

// Sync queue state to Redis for admin panel
async function syncQueueToRedis(prn?: string, action?: "add" | "remove") {
  if (!redis) return;
  try {
    await redis.set("queue:active", activeRequests);
    if (prn && action === "add") {
      await redis.lpush("queue:waiting", prn);
    } else if (prn && action === "remove") {
      await redis.lrem("queue:waiting", 1, prn);
    }
  } catch (err) {
    // Log Redis sync errors for debugging
    console.error(`[Redis] Queue sync failed for ${prn || 'unknown'}:`, err);
  }
}

async function releaseSlot(): Promise<void> {
  activeRequests--;
  await syncQueueToRedis();
  if (queue.length > 0) {
    const next = queue.shift();
    next?.();
  }
}

// ---------------------- TYPES ------------------------
interface Mark {
  obtained: number;
  max: number;
}
interface Subject {
  subjectName: string;
  marks: string[];
  totalObt: number;
  totalMax: number;
  percentage: number | null;
  grade: string;
  gradePoint: number | null;
  credits?: number;
}
interface Result {
  sgpa: number | null;
  estimatedCgpa: number | null;
  totalMarksAll: number;
  maxMarksAll: number;
  subjects: Subject[];
}

// ---------------------- HELPERS ------------------------
const percentToGrade = (p: number | null | undefined): string => {
  if (p === null || p === undefined) return "NA";
  if (p >= 85) return "O";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  if (p >= 45) return "E";
  if (p >= 40) return "P";
  return "F";
};
const gradeToPoint: Record<string, number | null> = {
  O: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  P: 4,
  F: 0,
  NA: null,
};

function parseMark(raw: string | null): Mark | null {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw.includes("/")) return null;
  const parts = raw.split("/");
  const obt = Number(parts[0].replace(/[^\d.]/g, ""));
  const max = Number(parts[1].replace(/[^\d.]/g, ""));
  if (Number.isFinite(obt) && Number.isFinite(max))
    return { obtained: obt, max };
  return null;
}

// getCredits is now imported from @/lib/creditMap

function computeSGPA(subjects: Subject[]): number | null {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const s of subjects) {
    if (s.gradePoint !== null && s.gradePoint !== undefined) {
      const credits = s.credits || getCredits(s.subjectName);
      totalPoints += s.gradePoint * credits;
      totalCredits += credits;
    }
  }
  if (totalCredits === 0) return null;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

export async function POST(req: Request) {
  const { prn, dob, forceRefresh } = await req.json();
  const encoder = new TextEncoder();
  const cacheKey = `crce:${prn}:${dob}`;
  
  // Create abort controller to handle client disconnects
  const abortController = new AbortController();
  let disconnected = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (
        message: string,
        current?: number,
        total?: number
      ) => {
        // Don't send if client disconnected
        if (disconnected) return;
        
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              message,
              current,
              total,
            })}\n\n`
          )
        );
      };

      // Check cache first (unless forceRefresh is true)
      if (redis && !forceRefresh) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            await trackAnalytics(prn, true); // Track cache hit
            sendProgress(
              "✅ Retrieved from cache (instant!) - Use 'Refresh' button for latest data"
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "result",
                  data: cached,
                  fromCache: true,
                })}\n\n`
              )
            );
            controller.close();
            return;
          }
        } catch {
          // Cache miss, continue with scrape
        }
      }

      // Track if this request currently holds a valid execution slot
      let hasSlot = false;
      let myCallback: (() => void) | undefined;

      let browser: Browser | undefined;
      try {
        if (forceRefresh) {
          sendProgress("🔄 Fetching fresh data (ignoring cache)...");
        }
        
        // Check if client disconnected before heavy processing
        if (disconnected || abortController.signal.aborted) {
          throw new Error("Client disconnected");
        }

        // CRITICAL: Check queue and increment activeRequests atomically
        console.log(
          `[${prn}] Checking queue status: activeRequests=${activeRequests}, MAX_CONCURRENT=${MAX_CONCURRENT}, queueLength=${queue.length}`
        );

        // Queue overflow protection - fail fast
        if (queue.length >= MAX_QUEUE) {
          console.log(
            `[${prn}] Queue overflow: ${queue.length} >= ${MAX_QUEUE}`
          );
          throw new Error(
            "High traffic right now. Please try again in 1-2 minutes."
          );
        }

        // Queue management with dynamic updates
        if (activeRequests >= MAX_CONCURRENT) {
          let myPosition = queue.length + 1;
          console.log(
            `[${prn}] Entering queue at position ${myPosition}, activeRequests: ${activeRequests}`
          );
          sendProgress(
            `⏳ Queue position: #${myPosition} (${activeRequests}/${MAX_CONCURRENT} browsers active)`
          );
          await syncQueueToRedis(prn, "add");

          // Wait for slot with dynamic position updates (with 1 minute timeout)
          await new Promise<void>((resolve, reject) => {
            let checkInterval: NodeJS.Timeout;
            let timeoutId: NodeJS.Timeout;
            let timedOut = false; // Flag to prevent race condition

            // Cleanup function to stop timers
            const cleanup = () => {
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
            };

            myCallback = () => {
              // Prevent race condition: ignore if already timed out
              if (timedOut) {
                console.log(
                  `[${prn}] Callback invoked after timeout - ignoring to prevent slot leak`
                );
                return;
              }
              cleanup();
              activeRequests++;
              hasSlot = true; // Mark as holding a slot
              syncQueueToRedis(prn, "remove");
              console.log(
                `[${prn}] Queue slot acquired, activeRequests: ${activeRequests}`
              );
              resolve();
            };

            queue.push(myCallback);

            // Update position every 2 seconds (more responsive)
            checkInterval = setInterval(() => {
              // Check if callback is still in queue
              if (!myCallback) return;

              const newPosition = queue.indexOf(myCallback) + 1;
              if (newPosition > 0 && newPosition !== myPosition) {
                myPosition = newPosition;
                sendProgress(
                  `⏳ Queue position: #${myPosition} (${activeRequests}/${MAX_CONCURRENT} browsers active)`
                );
              } else if (newPosition === 0) {
                // Callback was removed from queue but not called - error recovery
                cleanup();
                console.log(
                  `[${prn}] WARNING: Removed from queue unexpectedly`
                );
                reject(new Error("Queue processing error. Please try again."));
              }
            }, 2000);

            // Timeout safety fallback
            timeoutId = setTimeout(() => {
              timedOut = true; // Mark as timed out to prevent race
              cleanup();
              console.log(`[${prn}] Queue timeout after 60 seconds`);
              // Remove myself from queue to prevent ghost slot acquisition later
              if (myCallback) {
                const idx = queue.indexOf(myCallback);
                if (idx > -1) {
                  queue.splice(idx, 1);
                  console.log(
                    `[${prn}] Cleaned up timed-out request from queue`
                  );
                }
              }
              reject(
                new Error(
                  "Server busy - queue timeout. Please try again in 30 seconds."
                )
              );
            }, 60000); // 60 second timeout
          });
        } else {
          activeRequests++;
          hasSlot = true; // Mark as holding a slot
          console.log(
            `[${prn}] Direct slot acquired, activeRequests: ${activeRequests}`
          );
          await syncQueueToRedis();
        }

        sendProgress("🚀 Starting your request now...");

        sendProgress("🚀 Processing your request...");

        const baseUrl = "https://crce-students.contineo.in/parents";
        const parts = dob.trim().split(/[-/]/);
        if (parts.length < 3)
          throw new Error("Invalid DOB format (DD-MM-YYYY)");
        const dd = parts[0];
        const mm = parts[1];
        const yyyy = parts[2];

        sendProgress("🌐 Launching browser...");
        console.log(`[${prn}] Starting browser launch...`);

        // Use local Playwright with aggressive memory optimization
        browser = await chromium.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-translate",
            "--disable-features=site-per-process",
            "--no-first-run",
            "--no-zygote",
          ],
        });

        const context = await browser.newContext({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        });
        const page = await context.newPage();
        
        // Check if client disconnected during browser launch
        if (disconnected || abortController.signal.aborted) {
          throw new Error("Client disconnected during browser launch");
        }

        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (
            [
              "image",
              "stylesheet",
              "font",
              "media",
              "websocket",
              "manifest",
              "other",
            ].includes(type)
          ) {
            return route.abort();
          }
          route.continue();
        });

        sendProgress("🔐 Logging into portal...");
        console.log(`[${prn}] Browser ready, starting login...`);

        // Navigate to login page
        console.log(`[${prn}] Navigating to login page...`);
        await page.goto(baseUrl + "/", {
          waitUntil: "networkidle",
          timeout: 25000,
        });
        console.log(`[${prn}] Login page loaded`);

        // Fill credentials
        console.log(`[${prn}] Filling credentials...`);
        await page.fill("#username", prn.trim());

        console.log(`[${prn}] Selecting day: ${dd}`);
        await page.selectOption("#dd", {
          value: (dd.length < 2 ? "0" + dd : dd) + " ",
        });

        console.log(`[${prn}] Selecting month: ${mm}`);
        await page.selectOption("#mm", {
          value: mm.length < 2 ? "0" + mm : mm,
        });

        console.log(`[${prn}] Selecting year: ${yyyy}`);
        try {
          // Try without leading zeros first
          await page.selectOption("#yyyy", { value: yyyy }, { timeout: 5000 });
        } catch (yearErr) {
          console.log(
            `[${prn}] Year selection failed with value "${yyyy}", trying alternative formats...`
          );
          // Get available years to help diagnose
          const availableYears = await page.$$eval("#yyyy option", (options) =>
            options
              .map((o: any) => o.value)
              .filter((v: string) => v)
              .slice(0, 10)
          );
          console.log(`[${prn}] Available years in dropdown:`, availableYears);

          // Try selecting by text instead
          try {
            await page.selectOption(
              "#yyyy",
              { label: yyyy },
              { timeout: 3000 }
            );
            console.log(`[${prn}] Year selected by label`);
          } catch {
            throw new Error(
              `Invalid year ${yyyy}. Please check your Date of Birth format (DD-MM-YYYY).`
            );
          }
        }

        console.log(`[${prn}] Credentials filled, submitting login...`);

        // Click login button and wait for response
        try {
          await page.click(".cn-login-btn", { timeout: 5000 });
          console.log(`[${prn}] Login button clicked`);
        } catch (clickErr) {
          console.log(`[${prn}] Click error (non-critical): ${clickErr}`);
        }

        // Wait 2 seconds for server response (reduced from 3)
        console.log(`[${prn}] Waiting for login response...`);
        await page.waitForTimeout(2000);

        // Quick check for invalid credentials
        console.log(`[${prn}] Checking credentials validity...`);
        const currentUrl = page.url();
        const isStillOnLogin = currentUrl.includes("login");
        const hasErrorAlert = await page
          .isVisible(".alert-error", { timeout: 500 })
          .catch(() => false);

        console.log(`[${prn}] Current URL: ${currentUrl}`);
        console.log(`[${prn}] Still on login page: ${isStillOnLogin}`);
        console.log(`[${prn}] Has error alert: ${hasErrorAlert}`);

        if (isStillOnLogin || hasErrorAlert) {
          console.log(`[${prn}] INVALID CREDENTIALS - failing immediately`);
          throw new Error(
            "Invalid credentials. Please check your PRN and Date of Birth (DD-MM-YYYY format)."
          );
        }

        // Credentials accepted - now verify we have a valid dashboard
        console.log(`[${prn}] Login accepted, verifying dashboard...`);

        sendProgress("📚 Finding your subjects...");

        // Wait a moment for dashboard to fully load
        await page.waitForTimeout(1000);

        // Get dashboard HTML to find subject URLs
        const dashboardHtml = await page.content();
        const dashboard$ = load(dashboardHtml);

        // Check if we're on an empty/invalid dashboard (wrong credentials but accepted)
        const pageTitle = dashboard$("title").text().toLowerCase();
        const hasWelcomeMessage =
          dashboard$("body").text().includes("Welcome") ||
          dashboard$("body").text().includes("Dashboard");
        console.log(`[${prn}] Page title: ${pageTitle}`);
        console.log(
          `[${prn}] Has welcome/dashboard content: ${hasWelcomeMessage}`
        );

        const subjectUrls: string[] = [];

        dashboard$('a[href*="task=ciedetails"]').each((_, el) => {
          const href = dashboard$(el).attr("href");
          if (href) {
            let fullUrl: string;
            if (href.startsWith("http")) {
              fullUrl = href;
            } else if (href.startsWith("/")) {
              fullUrl = "https://crce-students.contineo.in" + href;
            } else {
              fullUrl = baseUrl + "/" + href;
            }
            subjectUrls.push(fullUrl);
          }
        });

        console.log(
          `[${prn}] Found ${subjectUrls.length} subject links on dashboard`
        );

        if (subjectUrls.length === 0) {
          console.log(
            `[${prn}] No subjects found. Waiting 2 more seconds and retrying...`
          );
          // Dashboard might still be loading - wait and retry once
          await page.waitForTimeout(2000);
          const retryHtml = await page.content();
          const retry$ = load(retryHtml);

          retry$('a[href*="task=ciedetails"]').each((_, el) => {
            const href = retry$(el).attr("href");
            if (href) {
              let fullUrl: string;
              if (href.startsWith("http")) {
                fullUrl = href;
              } else if (href.startsWith("/")) {
                fullUrl = "https://crce-students.contineo.in" + href;
              } else {
                fullUrl = baseUrl + "/" + href;
              }
              subjectUrls.push(fullUrl);
            }
          });

          console.log(
            `[${prn}] After retry: Found ${subjectUrls.length} subjects`
          );

          if (subjectUrls.length === 0) {
            console.log(
              `[${prn}] Still no subjects. Checking if empty dashboard (wrong PRN)...`
            );
            // Empty dashboard likely means wrong PRN (portal accepted wrong credentials)
            throw new Error(
              "Invalid credentials. No subjects found - please verify your PRN and Date of Birth."
            );
          }
        }

        console.log(`[${prn}] Found ${subjectUrls.length} subjects`);

        // Get cookies for HTTP requests
        const cookies = await context.cookies();
        const cookieHeader = cookies
          .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
          .join("; ");

        // 🚀 OPTIMIZATION: Close browser immediately after cookie capture!
        // Cookies remain valid for HTTP requests (tested: 20x faster)
        console.log(`[${prn}] Captured cookies, closing browser early to free RAM...`);
        if (browser) {
          try {
            await browser.close();
            browser = undefined; // Mark as closed so finally block doesn't try again
            console.log(`[${prn}] Browser closed early - using pure HTTP for subject fetch`);
          } catch (closeErr) {
            console.error(`[${prn}] Early browser close failed:`, closeErr);
          }
        }

        sendProgress(`🚀 Parallel fetching ${subjectUrls.length} subjects via HTTP...`);

        // Helper: fetch and parse one subject with timeout
        async function fetchSubject(url: string): Promise<Subject | null> {
          try {
            // Create timeout for fetch
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000); // 12 second timeout

            const response = await fetch(url, {
              headers: {
                Cookie: cookieHeader,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
              },
              signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) return null;

            const html = await response.text();
            const $$ = load(html);

            // Check if redirected to login
            if (html.includes("Login to Your Account")) return null;

            let subjectName = $$("caption").first().text().trim();
            if (!subjectName) {
              $$("h3, .uk-h3").each((_, el) => {
                const t = $$(el).text().trim();
                if (
                  t.match(/\d{2}[A-Z]{2,3}\d{2}[A-Z]{2}\d{2}/) ||
                  t.length > 5
                ) {
                  subjectName = t;
                  return false;
                }
              });
            }
            if (!subjectName) return null;

            let foundMarks: Mark[] = [];
            $$("tr").each((_, tr) => {
              const cells = $$(tr)
                .find("td")
                .map((_, td) => $$(td).text().trim())
                .get();
              const parsedRow = cells
                .filter((c) => c.match(/\d+(\.\d+)?\s*\/\s*\d+/))
                .map((m) => parseMark(m))
                .filter((x): x is Mark => x !== null);
              if (parsedRow.length > 0) {
                foundMarks = parsedRow;
                return false;
              }
            });

            if (foundMarks.length === 0) return null;

            const credits = getCredits(subjectName);

            // Skip DM (Double Minor), Honors, Minors, and explicitly excluded (0 credit) subjects
            if (
              credits === 0 || // Scrape logic returns 0 for audit/excluded courses
              subjectName.match(/25DM|25DMX|25HXXX|25MIN/i) ||
              subjectName.includes("Double Minor") ||
              subjectName.includes("Honors") ||
              subjectName.includes("Minor Degree")
            ) {
              return null;
            }

            let totalObt = 0,
              totalMax = 0;
            foundMarks.forEach((m) => {
              totalObt += m.obtained;
              totalMax += m.max;
            });
            const percentage =
              totalMax > 0
                ? Math.round((totalObt / totalMax) * 10000) / 100
                : null;
            const grade =
              percentage !== null ? percentToGrade(percentage) : "NA";

            return {
              subjectName,
              marks: foundMarks.map((m) => `${m.obtained}/${m.max}`),
              totalObt: Math.round(totalObt * 100) / 100,
              totalMax,
              percentage,
              grade,
              gradePoint: gradeToPoint[grade],
              credits,
            };
          } catch {
            return null;
          }
        }

        // Fetch ALL subjects in parallel
        const startFetch = Date.now();
        const results = await Promise.all(
          subjectUrls.map((url) => fetchSubject(url))
        );
        const subjects = results.filter((r): r is Subject => r !== null);

        console.log(
          `[Parallel] Fetched ${subjects.length}/${
            subjectUrls.length
          } subjects in ${Date.now() - startFetch}ms`
        );

        // Safety check: ensure we got at least some subjects
        if (subjects.length === 0) {
          throw new Error(
            "Could not fetch any subjects. Session may have expired. Please try again."
          );
        }

        sendProgress("📊 Calculating your SGPA...");
        const totalMarksAll = subjects.reduce((a, s) => a + s.totalObt, 0);
        const maxMarksAll = subjects.reduce((a, s) => a + s.totalMax, 0);
        const sgpa = computeSGPA(subjects);

        const result = {
          sgpa,
          estimatedCgpa: sgpa,
          totalMarksAll,
          maxMarksAll,
          subjects,
        };

        // Close browser IMMEDIATELY after data fetch (free up RAM)
        if (browser) {
          try {
            await browser.close();
            browser = undefined;
          } catch (closeErr) {
            console.error("[CLEANUP] Failed to close browser:", closeErr);
          }
        }

        // Cache the result
        if (redis) {
          try {
            await redis.set(cacheKey, result, { ex: CACHE_TTL });
            await trackAnalytics(prn, false); // Track fresh scrape
          } catch {
            // Cache save failed, continue anyway
          }
        }

        sendProgress("✅ Complete! Data ready.");
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "result", data: result })}\n\n`
          )
        );
      } catch (err: unknown) {
        let errorMessage = "Unknown error occurred";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        console.log(`[${prn}] ERROR CAUGHT: ${errorMessage}`);

        // Handle various crash/error scenarios
        if (
          errorMessage.includes("Target closed") ||
          errorMessage.includes("Protocol error") ||
          errorMessage.includes("browser has been closed") ||
          errorMessage.includes("Browser closed") ||
          errorMessage.includes("Execution context was destroyed")
        ) {
          console.error("[CRASH] Browser crash/OOM:", errorMessage);
          errorMessage =
            "Server busy (High Traffic). Please try again in 30 seconds.";
        } else if (
          errorMessage.includes("Navigation timeout") ||
          errorMessage.includes("Timeout") ||
          errorMessage.includes("timeout")
        ) {
          console.error("[TIMEOUT] Navigation timeout:", errorMessage);
          errorMessage = "Portal is slow to respond. Please try again.";
        } else if (
          errorMessage.includes("net::ERR") ||
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("fetch failed")
        ) {
          console.error("[NETWORK] Network error:", errorMessage);
          errorMessage =
            "Cannot reach the portal. Please check your connection.";
        } else if (errorMessage.includes("Invalid credentials")) {
          // Keep as is - user-facing error
        } else if (errorMessage.includes("No subjects found")) {
          // Keep as is - user-facing error
        } else if (errorMessage.includes("High traffic")) {
          // Keep as is - user-facing queue overflow error
        } else if (errorMessage.includes("Invalid year")) {
          // Keep as is - user-facing year validation error
        } else if (errorMessage.includes("Invalid DOB")) {
          // Keep as is - user-facing DOB format error
        } else {
          console.error("[ERROR] Unexpected error:", errorMessage);
          // Don't expose internal errors
          if (
            !errorMessage.includes("PRN") &&
            !errorMessage.includes("DOB") &&
            !errorMessage.includes("queue") &&
            !errorMessage.includes("traffic")
          ) {
            errorMessage = "Something went wrong. Please try again.";
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: errorMessage,
            })}\n\n`
          )
        );
      } finally {
        // Release slot FIRST so next user can start immediately
        if (hasSlot) {
          await releaseSlot();
          hasSlot = false; // Prevent double-release
        }
        
        // THEN clean up browser (slower operation)
        if (browser) {
          try {
            await browser.close();
          } catch (closeErr) {
            console.error("[CLEANUP] Failed to close browser:", closeErr);
          }
        }
      }
      controller.close();
    },
    cancel() {
      // Called when client disconnects or stream is aborted
      console.log(`[${prn}] Stream canceled - client disconnected`);
      disconnected = true;
      abortController.abort();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import { chromium as playwright } from "playwright-core";
import chromium from "@sparticuz/chromium-min";
import { load } from "cheerio";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
}

interface Result {
  sgpa: number | null;
  estimatedCgpa: number | null;
  totalMarksAll: number;
  maxMarksAll: number;
  subjects: Subject[];
}

// ---------------------- GRADING HELPERS ------------------------
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
  O: 10, A: 9, B: 8, C: 7, D: 6, E: 5, P: 4, F: 0, NA: null,
};

function parseMark(raw: string | null): Mark | null {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw.includes("/")) return null;
  const [obt, max] = raw.split("/").map((v) => Number(v.replace(/[^\d.]/g, "")));
  if (Number.isFinite(obt) && Number.isFinite(max)) {
    return { obtained: obt, max };
  }
  return null;
}

function computeSGPA(subjects: Subject[]): number | null {
  const pts = subjects.map((s) => s.gradePoint).filter((x): x is number => x !== null && x !== undefined);
  if (pts.length === 0) return null;
  return Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100;
}

export async function POST(req: Request) {
  const { prn, dob } = await req.json();

  if (!prn || !dob) {
    return new Response(JSON.stringify({ error: "prn and dob required" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const parts = dob.split(/[-/]/);
  if (parts.length < 3) {
    return new Response(JSON.stringify({ error: "Invalid DOB format. Use DD-MM-YYYY" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const [ddR, mmR, yyyy] = parts;
  const dd = ddR.padStart(2, "0") + " ";
  const mm = mmR.padStart(2, "0");

  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (message: string, current?: number, total?: number) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", message, current, total })}\n\n`));
      };

      const sendResult = (data: Result) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", data })}\n\n`));
      };

      const sendError = (error: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error })}\n\n`));
      };

      let browser;
      try {
        sendProgress("Launching browser...");
        
        if (process.env.NODE_ENV === "production") {
          const executablePath = await chromium.executablePath(
            `https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar`
          );
          browser = await playwright.launch({
            args: chromium.args,
            executablePath,
            headless: true,
          });
        } else {
          browser = await playwright.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          });
        }

        const page = await browser.newPage();

        sendProgress("Connecting to portal...");
        await page.goto("https://crce-students.contineo.in/parents/", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector('input[name="username"]', { timeout: 5000 });

        sendProgress("Logging in...");
        await page.fill('input[name="username"]', prn);
        await page.selectOption('select[name="dd"]', dd);
        await page.selectOption('select[name="mm"]', mm);
        await page.selectOption('select[name="yyyy"]', yyyy);

        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }),
          page.click('input[type="submit"], button[type="submit"]'),
        ]);

        const html = await page.content();
        if (load(html)('input[name="username"]').length > 0) {
          await browser.close();
          sendError("Invalid credentials. Please check your PRN and Date of Birth (DD-MM-YYYY)");
          controller.close();
          return;
        }

        sendProgress("Loading dashboard...");
        try {
          await page.waitForSelector('a[href*="task=ciedetails"]', { timeout: 8000 });
        } catch {
          // Continue
        }

        const cieLinks = await page.$$('a[href*="task=ciedetails"]');
        const subjects: Subject[] = [];

        for (let i = 0; i < cieLinks.length; i++) {
          try {
            sendProgress(`Fetching subject ${i + 1}...`, i + 1, cieLinks.length);
            
            const links = await page.$$('a[href*="task=ciedetails"]');
            if (i >= links.length) continue;

            await Promise.all([
              page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }),
              links[i].click()
            ]);

            try {
              await page.waitForSelector('table.cn-cie-table, table.uk-table', { timeout: 3000 });
            } catch {
              // Continue
            }

            const subjectHtml = await page.content();
            const $$ = load(subjectHtml);

            let subjectName = $$("caption").first().text().trim();
            if (!subjectName) {
              $$("h3").each((_, el) => {
                const text = $$(el).text().trim();
                if (text.match(/\d{2}[A-Z]{2,3}\d{2}[A-Z]{2}\d{2}/)) {
                  subjectName = text;
                  return false;
                }
              });
            }
            if (!subjectName) subjectName = "Unknown Subject";

            if (subjectName && subjectName.includes("25DM")) {
              await page.goBack({ waitUntil: "domcontentloaded" });
              continue;
            }

            const row = $$("table.cn-cie-table tbody tr").first().length
              ? $$("table.cn-cie-table tbody tr").first()
              : $$("table.uk-table tbody tr").first().length
              ? $$("table.uk-table tbody tr").first()
              : $$("table tbody tr").first();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cells = row.find("td").map((_: number, el: unknown) => $$(el as any).text().trim()).get();
            const markCells = cells.filter((c: string) => c.includes("/"));
            const parsed = markCells.map((m: string) => parseMark(m)).filter((x): x is Mark => x !== null);

            if (parsed.length === 0) {
              await page.goBack({ waitUntil: "domcontentloaded" });
              continue;
            }

            let totalObt = 0, totalMax = 0;
            parsed.forEach((m: Mark) => { totalObt += m.obtained; totalMax += m.max; });
            totalObt = Math.round(totalObt * 1000) / 1000;
            totalMax = Math.round(totalMax * 1000) / 1000;

            const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : null;
            const grade = percentage !== null ? percentToGrade(percentage) : "NA";
            const gradePoint = gradeToPoint[grade];

            subjects.push({
              subjectName,
              marks: markCells,
              totalObt,
              totalMax,
              percentage,
              grade,
              gradePoint,
            });

            await page.goBack({ waitUntil: "domcontentloaded" });

          } catch (err: unknown) {
            try {
              await page.goBack({ waitUntil: "domcontentloaded" });
            } catch {
              // Ignore
            }
          }
        }

        sendProgress("Calculating SGPA...");
        const totalMarksAll = subjects.reduce((a: number, s: Subject) => a + (s.totalObt || 0), 0);
        const maxMarksAll = subjects.reduce((a: number, s: Subject) => a + (s.totalMax || 0), 0);
        const sgpa = computeSGPA(subjects);

        await browser.close();

        sendResult({
          sgpa,
          estimatedCgpa: sgpa,
          totalMarksAll,
          maxMarksAll,
          subjects,
        });

      } catch (err: unknown) {
        if (browser) await browser.close();
        sendError(err instanceof Error ? err.message : String(err));
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

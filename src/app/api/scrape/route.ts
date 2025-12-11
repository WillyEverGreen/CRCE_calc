import { NextResponse } from "next/server";
import { load } from "cheerio";

export const maxDuration = 60; // Allow up to 60 seconds for scraping
export const dynamic = "force-dynamic";

// ---------------------- GRADING HELPERS ------------------------
const percentToGrade = (p: number | null | undefined) => {
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

// Parse "12/20"
function parseMark(raw: string | null) {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw.includes("/")) return null;

  const [obt, max] = raw
    .split("/")
    .map((v) => Number(v.replace(/[^\d.]/g, "")));

  if (Number.isFinite(obt) && Number.isFinite(max)) {
    return { obtained: obt, max };
  }
  return null;
}

// SGPA = avg of grade points (no credits)
function computeSGPA(subjects: any[]) {
  const pts = subjects
    .map((s) => s.gradePoint)
    .filter((x) => x !== null && x !== undefined);

  if (pts.length === 0) return null;
  return Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100;
}

// Convert relative to absolute URL
function absoluteUrl(href: string | undefined) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return "https://crce-students.contineo.in" + href;

  return "https://crce-students.contineo.in/parents/" + href;
}

export async function POST(req: Request) {
  let browser;
  try {
    const { prn, dob } = await req.json();

    if (!prn || !dob) {
      return NextResponse.json(
        { error: "prn and dob required" },
        { status: 400 }
      );
    }

    // Handle both - and / separators
    const parts = dob.split(/[-/]/);
    if (parts.length < 3) {
      return NextResponse.json(
        { error: "Invalid DOB format. Use DD-MM-YYYY" },
        { status: 400 }
      );
    }
    const [ddR, mmR, yyyy] = parts;

    const dd = ddR.padStart(2, "0");
    const mm = mmR.padStart(2, "0");

    // ---------------- BROWSER LAUNCH LOGIC ----------------
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL;
    
    let page: any;
    
    if (isProduction) {
      // Vercel / Production Environment - use puppeteer-core with @sparticuz/chromium
      const puppeteer = (await import("puppeteer-core")).default;
      const chromium = (await import("@sparticuz/chromium")).default;
      
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
      
      page = await browser.newPage();

      // 1) OPEN LOGIN PAGE
      await page.goto("https://crce-students.contineo.in/parents/", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for form to load
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // 2) FILL LOGIN FORM (Puppeteer style)
      const usernameInput = await page.$('input[name="username"]');
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 });
        await usernameInput.type(prn);
      }
      await page.select('select[name="dd"]', dd);
      await page.select('select[name="mm"]', mm);
      await page.select('select[name="yyyy"]', yyyy);

      // 3) SUBMIT
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
    } else {
      // Local Development - use full Playwright (which works!)
      const { chromium: playwrightChromium } = await import("playwright");
      
      browser = await playwrightChromium.launch({ headless: true });
      page = await browser.newPage();

      // 1) OPEN LOGIN PAGE
      await page.goto("https://crce-students.contineo.in/parents/", {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      // Wait for form
      await page.waitForSelector('input[name="username"]');
      await page.waitForSelector('select[name="dd"]');

      // 2) FILL LOGIN FORM (Playwright style - fill() clears first)
      await page.fill('input[name="username"]', prn);
      await page.selectOption('select[name="dd"]', dd);
      await page.selectOption('select[name="mm"]', mm);
      await page.selectOption('select[name="yyyy"]', yyyy);

      // 3) SUBMIT
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
    }

    // 4) CHECK LOGIN SUCCESS - check if we reached the dashboard
    const pageUrl = page.url();
    
    // The original working code checks for "task=dashboard" in URL
    if (!pageUrl.includes("task=dashboard")) {
      const html = await page.content();
      await browser.close();
      return NextResponse.json(
        { 
          error: "Login failed. Please check PRN and DOB.",
          currentUrl: pageUrl,
          snippet: html.substring(0, 500)
        },
        { status: 401 }
      );
    }

    // 5) FIND RESULT LINKS FROM DASHBOARD - look for ciedetails links like original
    const dashboardHtml = await page.content();
    const $dash = load(dashboardHtml);

    const subjectLinks: string[] = [];
    
    // First try to find ciedetails links (the original approach that worked)
    $dash("a").each((_, el) => {
      const href = $dash(el).attr("href");
      if (href && href.includes("task=ciedetails")) {
        const url = absoluteUrl(href);
        if (url && !subjectLinks.includes(url)) {
          subjectLinks.push(url);
        }
      }
    });

    // Fallback to other result/marksheet links
    if (subjectLinks.length === 0) {
      $dash('a[href*="result"], a[href*="marksheet"]').each((_, el) => {
        const href = $dash(el).attr("href");
        const url = absoluteUrl(href);
        if (url && !subjectLinks.includes(url)) {
          subjectLinks.push(url);
        }
      });
    }

    // Final fallback: try all links in the dashboard sidebar
    if (subjectLinks.length === 0) {
      $dash("a").each((_, el) => {
        const href = $dash(el).attr("href");
        const text = $dash(el).text().toLowerCase();
        if (
          href &&
          (text.includes("result") ||
            text.includes("mark") ||
            text.includes("exam"))
        ) {
          const url = absoluteUrl(href);
          if (url && !subjectLinks.includes(url)) {
            subjectLinks.push(url);
          }
        }
      });
    }

    // 6) SCRAPE EACH SUBJECT PAGE (using exact logic from working server.js)
    const subjects: any[] = [];

    for (const url of subjectLinks) {
      try {
        await page.goto(url, { 
          waitUntil: isProduction ? "networkidle2" : "domcontentloaded", 
          timeout: 30000 
        });
        const html = await page.content();
        const $$ = load(html);

        // ----------- SUBJECT NAME EXTRACTION (from server.js) -------------
        const subjectName =
          $$("caption").first().text().trim() ||
          $$("h3.md-card-head-text span").first().text().trim() ||
          null;

        // FIND THE TABLE row containing marks
        let row =
          $$("table.cn-cie-table tbody tr").first().length ? $$("table.cn-cie-table tbody tr").first() :
          $$("table.uk-table tbody tr").first().length ? $$("table.uk-table tbody tr").first() :
          $$("table tbody tr").first();

        const cells = row
          .find("td")
          .map((_: number, el: any) => $$(el).text().trim())
          .get();

        // NEW LOGIC: extract *all* "X/Y" marks dynamically
        const markCells = cells.filter((c: string) => c.includes("/"));

        const parsed = markCells.map((m: string) => parseMark(m)).filter(Boolean);

        if (parsed.length === 0) continue;

        let totalObt = 0,
          totalMax = 0;
        parsed.forEach((m: any) => {
          totalObt += m.obtained;
          totalMax += m.max;
        });

        const percentage =
          totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : null;

        const grade = percentage !== null ? percentToGrade(percentage) : "NA";
        const gradePoint = gradeToPoint[grade];

        subjects.push({
          url,
          subjectName,
          marks: markCells,
          totalObt,
          totalMax,
          percentage,
          grade,
          gradePoint,
        });
      } catch (err: any) {
        subjects.push({ url, error: err.toString() });
      }
    }

    // 7) TOTALS
    const totalMarksAll = subjects.reduce((a: number, s: any) => a + (s.totalObt || 0), 0);
    const maxMarksAll = subjects.reduce((a: number, s: any) => a + (s.totalMax || 0), 0);

    const sgpa = computeSGPA(subjects);

    await browser.close();

    return NextResponse.json({
      sgpa,
      estimatedCgpa: sgpa,
      totalMarksAll,
      maxMarksAll,
      subjects,
    });
  } catch (err: any) {
    if (browser) await browser.close();
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.toString() }, { status: 500 });
  }
}

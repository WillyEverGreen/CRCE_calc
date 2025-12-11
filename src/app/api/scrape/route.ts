import { NextResponse } from "next/server";
import { load } from "cheerio";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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
    
    if (isProduction) {
      // Vercel / Production Environment
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // Local Development - use local Chrome
      browser = await puppeteer.launch({
        headless: true,
        executablePath:
          process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : process.platform === "darwin"
            ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            : "/usr/bin/google-chrome",
      });
    }

    const page = await browser.newPage();

    // 1) OPEN LOGIN PAGE
    await page.goto("https://crce-students.contineo.in/parents/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // 2) FILL LOGIN FORM
    await page.type('input[name="username"]', prn);
    await page.select('select[name="dd"]', dd);
    await page.select('select[name="mm"]', mm);
    await page.select('select[name="yyyy"]', yyyy);

    // 3) SUBMIT
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);

    // 4) CHECK LOGIN SUCCESS
    const pageUrl = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);

    if (
      pageUrl.includes("parents") &&
      !pageUrl.includes("dashboard") &&
      (bodyText.toLowerCase().includes("invalid") ||
        bodyText.toLowerCase().includes("error"))
    ) {
      await browser.close();
      return NextResponse.json(
        { error: "Invalid PRN or DOB. Login failed." },
        { status: 401 }
      );
    }

    // 5) FIND RESULT LINKS FROM DASHBOARD
    const dashboardHtml = await page.content();
    const $dash = load(dashboardHtml);

    const subjectLinks: string[] = [];
    $dash('a[href*="result"], a[href*="marksheet"]').each((_, el) => {
      const href = $dash(el).attr("href");
      const url = absoluteUrl(href);
      if (url && !subjectLinks.includes(url)) {
        subjectLinks.push(url);
      }
    });

    // Fallback: try all links in the dashboard sidebar
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

    // 6) SCRAPE EACH SUBJECT PAGE
    const subjects: any[] = [];

    for (const url of subjectLinks) {
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
        const html = await page.content();
        const $ = load(html);

        // Try to find subject name
        let subjectName =
          $("h1, h2, h3, .subject-name, .course-name").first().text().trim() ||
          $("title").text().trim() ||
          "Unknown Subject";

        // Skip empty or navigation pages
        if (
          subjectName.toLowerCase().includes("dashboard") ||
          subjectName.toLowerCase().includes("login")
        ) {
          continue;
        }

        // Find marks table
        const rows: any[] = [];
        $("table tr").each((_, tr) => {
          const cells = $(tr).find("td, th");
          if (cells.length >= 2) {
            const label = $(cells[0]).text().trim();
            const value = $(cells[1]).text().trim();
            if (label && value) {
              rows.push({ label, value });
            }
          }
        });

        // Parse marks
        let ise1 = null,
          ise2 = null,
          mse = null,
          ese = null;
        let totalObt = 0,
          totalMax = 0;

        for (const row of rows) {
          const lbl = row.label.toLowerCase();
          const parsed = parseMark(row.value);
          if (!parsed) continue;

          if (lbl.includes("ise1") || lbl.includes("ise 1")) {
            ise1 = parsed;
          } else if (lbl.includes("ise2") || lbl.includes("ise 2")) {
            ise2 = parsed;
          } else if (lbl.includes("mse")) {
            mse = parsed;
          } else if (lbl.includes("ese") || lbl.includes("end sem")) {
            ese = parsed;
          }

          totalObt += parsed.obtained;
          totalMax += parsed.max;
        }

        // Skip subjects with no marks at all
        if (totalMax === 0) {
          continue;
        }

        const percent = totalMax > 0 ? (totalObt / totalMax) * 100 : null;
        const grade = percentToGrade(percent);
        const gradePoint = gradeToPoint[grade];

        subjects.push({
          url,
          subjectName,
          ise1,
          ise2,
          mse,
          ese,
          totalObt,
          totalMax,
          percent: percent !== null ? Math.round(percent * 100) / 100 : null,
          grade,
          gradePoint,
        });
      } catch (err: any) {
        subjects.push({ url, error: err.toString() });
      }
    }

    // 7) TOTALS
    const totalMarksAll = subjects.reduce((a, s) => a + (s.totalObt || 0), 0);
    const maxMarksAll = subjects.reduce((a, s) => a + (s.totalMax || 0), 0);

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

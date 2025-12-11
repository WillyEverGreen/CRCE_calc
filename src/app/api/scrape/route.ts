import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { load } from "cheerio";

export const maxDuration = 60;
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

function computeSGPA(subjects: any[]) {
  const pts = subjects
    .map((s) => s.gradePoint)
    .filter((x) => x !== null && x !== undefined);
  if (pts.length === 0) return null;
  return Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100;
}

function isDoubleMinor(subjectName: string | null) {
  if (!subjectName) return false;
  return subjectName.toUpperCase().includes("25DM");
}

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

    // Launch browser - Playwright will use its bundled Chromium
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // 1) OPEN LOGIN PAGE
    await page.goto("https://crce-students.contineo.in/parents/", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // 2) ENSURE LOGIN FIELDS EXIST
    await page.waitForSelector('input[name="username"]');
    await page.waitForSelector('select[name="dd"]');

    // 3) FILL LOGIN FORM
    await page.fill('input[name="username"]', prn);
    await page.selectOption('select[name="dd"]', dd);
    await page.selectOption('select[name="mm"]', mm);
    await page.selectOption('select[name="yyyy"]', yyyy);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    // 4) CHECK DASHBOARD
    if (!page.url().includes("task=dashboard")) {
      const html = await page.content();
      await browser.close();
      return NextResponse.json(
        {
          error: "Login failed",
          currentUrl: page.url(),
          snippet: html.substring(0, 1500),
        },
        { status: 500 }
      );
    }

    // 5) EXTRACT SUBJECT LINKS
    const dashboardHtml = await page.content();
    const $ = load(dashboardHtml);

    const subjectLinks = new Set<string>();
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("task=ciedetails")) {
        const url = absoluteUrl(href);
        if (url) subjectLinks.add(url);
      }
    });

    const subjects: any[] = [];

    // 6) VISIT EACH SUBJECT PAGE
    for (const url of subjectLinks) {
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const html = await page.content();
        const $$ = load(html);

        const subjectName =
          $$("caption").first().text().trim() ||
          $$("h3.md-card-head-text span").first().text().trim() ||
          null;

        let row = $$("table.cn-cie-table tbody tr").first().length
          ? $$("table.cn-cie-table tbody tr").first()
          : $$("table.uk-table tbody tr").first().length
          ? $$("table.uk-table tbody tr").first()
          : $$("table tbody tr").first();

        const cells = row
          .find("td")
          .map((_: number, el: any) => $$(el).text().trim())
          .get();

        const markCells = cells.filter((c: string) => c.includes("/"));
        const parsed = markCells
          .map((m: string) => parseMark(m))
          .filter(Boolean);

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

    // FILTER OUT DOUBLE MINOR SUBJECTS
    const filteredSubjects = subjects.filter(
      (s) => !isDoubleMinor(s.subjectName)
    );

    // 7) TOTALS
    const totalMarksAll = filteredSubjects.reduce(
      (a: number, s: any) => a + (s.totalObt || 0),
      0
    );
    const maxMarksAll = filteredSubjects.reduce(
      (a: number, s: any) => a + (s.totalMax || 0),
      0
    );
    const sgpa = computeSGPA(filteredSubjects);

    await browser.close();

    return NextResponse.json({
      sgpa,
      estimatedCgpa: sgpa,
      totalMarksAll,
      maxMarksAll,
      subjects: filteredSubjects,
    });
  } catch (err: any) {
    if (browser) await browser.close();
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.toString() }, { status: 500 });
  }
}

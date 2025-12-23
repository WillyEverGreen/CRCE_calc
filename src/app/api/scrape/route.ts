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
  O: 10, A: 9, B: 8, C: 7, D: 6, E: 5, P: 4, F: 0, NA: null,
};

function parseMark(raw: string | null) {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw.includes("/")) return null;
  const [obt, max] = raw.split("/").map((v) => Number(v.replace(/[^\d.]/g, "")));
  if (Number.isFinite(obt) && Number.isFinite(max)) {
    return { obtained: obt, max };
  }
  return null;
}

function computeSGPA(subjects: any[]) {
  const pts = subjects.map((s) => s.gradePoint).filter((x) => x !== null && x !== undefined);
  if (pts.length === 0) return null;
  return Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100;
}

export async function POST(req: Request) {
  let browser;
  try {
    const { prn, dob } = await req.json();

    if (!prn || !dob) {
      return NextResponse.json({ error: "prn and dob required" }, { status: 400 });
    }

    const parts = dob.split(/[-/]/);
    if (parts.length < 3) {
      return NextResponse.json({ error: "Invalid DOB format. Use DD-MM-YYYY" }, { status: 400 });
    }
    const [ddR, mmR, yyyy] = parts;
    const dd = ddR.padStart(2, "0") + " "; // Trailing space required by portal
    const mm = mmR.padStart(2, "0");

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const page = await browser.newPage();

    // 1) Login
    await page.goto("https://crce-students.contineo.in/parents/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    
    await page.fill('input[name="username"]', prn);
    await page.selectOption('select[name="dd"]', dd);
    await page.selectOption('select[name="mm"]', mm);
    await page.selectOption('select[name="yyyy"]', yyyy);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    // 2) Check login success
    const html = await page.content();
    if (load(html)('input[name="username"]').length > 0) {
      await browser.close();
      return NextResponse.json({
        error: "Login failed - Invalid credentials or wrong DOB format",
        hint: "Please check your PRN and DOB (format: DD-MM-YYYY)"
      }, { status: 401 });
    }

    // 3) Wait for dashboard to load
    try {
      await page.waitForSelector('a[href*="task=ciedetails"]', { timeout: 8000 });
    } catch (e) {
      // Continue anyway
    }

    // 4) Get all CIE links
    const cieLinks = await page.$$('a[href*="task=ciedetails"]');
    const subjects: any[] = [];

    // 5) Visit each subject by clicking links (maintains session)
    for (let i = 0; i < cieLinks.length; i++) {
      try {
        const links = await page.$$('a[href*="task=ciedetails"]');
        if (i >= links.length) continue;

        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }),
          links[i].click()
        ]);

        // Wait for table (reduced timeout for speed)
        try {
          await page.waitForSelector('table.cn-cie-table, table.uk-table', { timeout: 3000 });
        } catch (e) {
          // Continue anyway
        }

        const subjectHtml = await page.content();
        const $$ = load(subjectHtml);

        // Get subject name from caption (has the course name) or find h3 with course code pattern
        let subjectName = $$("caption").first().text().trim();
        if (!subjectName) {
          // Look for h3 containing course code pattern like "25BSC12CE05"
          $$("h3").each((_, el) => {
            const text = $$(el).text().trim();
            if (text.match(/\d{2}[A-Z]{2,3}\d{2}[A-Z]{2}\d{2}/)) {
              subjectName = text;
              return false; // break
            }
          });
        }
        if (!subjectName) subjectName = "Unknown Subject";

        // Skip 25DM subjects
        if (subjectName && subjectName.includes("25DM")) {
          await page.goBack({ waitUntil: "domcontentloaded" });
          continue;
        }

        const row = $$("table.cn-cie-table tbody tr").first().length
          ? $$("table.cn-cie-table tbody tr").first()
          : $$("table.uk-table tbody tr").first().length
          ? $$("table.uk-table tbody tr").first()
          : $$("table tbody tr").first();

        const cells = row.find("td").map((_: number, el: any) => $$(el).text().trim()).get();
        const markCells = cells.filter((c: string) => c.includes("/"));
        const parsed = markCells.map((m: string) => parseMark(m)).filter(Boolean);

        if (parsed.length === 0) {
          await page.goBack({ waitUntil: "domcontentloaded" });
          continue;
        }

        let totalObt = 0, totalMax = 0;
        parsed.forEach((m: any) => { totalObt += m.obtained; totalMax += m.max; });
        totalObt = Math.round(totalObt * 1000) / 1000;
        totalMax = Math.round(totalMax * 1000) / 1000;

        const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : null;
        const grade = percentage !== null ? percentToGrade(percentage) : "NA";
        const gradePoint = gradeToPoint[grade];

        // Remove session tokens from URL before storing
        const cleanUrl = page.url().split('&ksign=')[0].split('?ksign=')[0];

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

      } catch (err: any) {
        try {
          await page.goBack({ waitUntil: "domcontentloaded" });
        } catch (e) {
          // Ignore
        }
      }
    }

    // 6) Calculate totals
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
    return NextResponse.json({ error: err.message || err.toString() }, { status: 500 });
  }
}

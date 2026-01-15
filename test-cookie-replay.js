/**
 * Cookie Replay Test
 * Tests if we can:
 * 1. Login with Playwright once
 * 2. Capture session cookies
 * 3. Replay them via pure HTTP to access protected pages
 * 
 * If this works, we could implement a "cookie pool" for massive speedups!
 */

const { chromium } = require('playwright');
const { load } = require('cheerio');

// Test credentials
const TEST_PRN = 'MU0341120240233054';
const TEST_DOB = '10-03-2006'; // DD-MM-YYYY

const BASE_URL = 'https://crce-students.contineo.in/parents';

async function testCookieReplay() {
  console.log('\n='.repeat(60));
  console.log('Cookie Replay Test');
  console.log('='.repeat(60) + '\n');

  let browser;
  let capturedCookies = '';
  let subjectUrls = [];

  try {
    // ====================
    // PHASE 1: Playwright Login
    // ====================
    console.log('📍 PHASE 1: Login with Playwright\n');
    
    const startLogin = Date.now();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Block resources for speed
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
      }
      route.continue();
    });

    console.log('  → Navigating to login page...');
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 30000 });

    // Parse DOB
    const parts = TEST_DOB.split(/[-/]/);
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];

    console.log('  → Filling credentials...');
    await page.fill('#username', TEST_PRN);
    await page.selectOption('#dd', { value: dd + ' ' }); // Note: trailing space
    await page.selectOption('#mm', { value: mm });
    await page.selectOption('#yyyy', { value: yyyy });

    console.log('  → Clicking login...');
    await page.click('.cn-login-btn');
    await page.waitForTimeout(2500);

    // Check login success
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      throw new Error('Login failed - still on login page');
    }

    console.log('  ✅ Login successful!');
    
    // Get dashboard and extract subject URLs
    const dashboardHtml = await page.content();
    const $ = load(dashboardHtml);
    
    $('a[href*="task=ciedetails"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        let fullUrl;
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = 'https://crce-students.contineo.in' + href;
        } else {
          fullUrl = BASE_URL + '/' + href;
        }
        subjectUrls.push(fullUrl);
      }
    });

    console.log(`  → Found ${subjectUrls.length} subject URLs`);

    // CAPTURE COOKIES
    const cookies = await context.cookies();
    capturedCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log('\n  📦 Captured cookies:');
    cookies.forEach(c => {
      console.log(`     - ${c.name}: ${c.value.substring(0, 20)}...`);
    });

    const loginTime = Date.now() - startLogin;
    console.log(`\n  ⏱️  Login completed in ${(loginTime / 1000).toFixed(2)}s`);

    // CLOSE BROWSER IMMEDIATELY
    await browser.close();
    browser = null;
    console.log('  🔒 Browser closed - now testing pure HTTP...\n');

    // ====================
    // PHASE 2: Cookie Replay via HTTP
    // ====================
    console.log('📍 PHASE 2: Cookie Replay Test\n');

    if (subjectUrls.length === 0) {
      console.log('  ⚠️ No subject URLs to test. Skipping HTTP test.');
      return;
    }

    const testUrl = subjectUrls[0];
    console.log(`  → Testing URL: ${testUrl.substring(0, 80)}...`);

    const startFetch = Date.now();
    
    // Make HTTP request with captured cookies
    const response = await fetch(testUrl, {
      headers: {
        'Cookie': capturedCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      }
    });

    const fetchTime = Date.now() - startFetch;
    console.log(`  → HTTP Status: ${response.status}`);
    console.log(`  → Fetch time: ${fetchTime}ms`);

    const html = await response.text();
    
    // Check if we got redirected to login
    if (html.includes('Login to Your Account')) {
      console.log('\n  ❌ COOKIE REPLAY FAILED');
      console.log('     Session was not preserved. Got login page instead.');
      console.log('     Possible reasons:');
      console.log('     - Session cookies are IP-bound');
      console.log('     - Session expired immediately after browser close');
      console.log('     - Additional browser fingerprinting required');
      return;
    }

    // Try to find subject name
    const $$ = load(html);
    const subjectName = $$('caption').first().text().trim() || 
                        $$('h3, .uk-h3').first().text().trim();

    if (subjectName) {
      console.log(`\n  ✅ COOKIE REPLAY SUCCESSFUL!`);
      console.log(`     Subject found: ${subjectName}`);
      console.log('\n  💡 This means we can:');
      console.log('     1. Login with Playwright ONCE');
      console.log('     2. Close browser immediately');
      console.log('     3. Use pure HTTP for ALL subject fetches');
      console.log('     4. Potentially cache cookies for session reuse!');
    } else {
      console.log('\n  ⚠️ Got a response but could not find subject data');
      console.log('     HTML preview:', html.substring(0, 500));
    }

    // ====================
    // PHASE 3: Test Cookie Lifetime
    // ====================
    console.log('\n📍 PHASE 3: Cookie Lifetime Test\n');
    console.log('  → Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));

    const response2 = await fetch(testUrl, {
      headers: {
        'Cookie': capturedCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      }
    });

    const html2 = await response2.text();
    if (!html2.includes('Login to Your Account')) {
      console.log('  ✅ Cookies still valid after 5 seconds');
    } else {
      console.log('  ❌ Cookies expired after 5 seconds');
    }

    // ====================
    // Summary
    // ====================
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Login time: ${(loginTime / 1000).toFixed(2)}s`);
    console.log(`  HTTP fetch time: ${fetchTime}ms`);
    console.log(`  Speed improvement: ~${Math.round(loginTime / fetchTime)}x faster for data fetch`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testCookieReplay();

const { chromium } = require('playwright');
const axios = require('axios');

async function getAdminStats() {
    try {
        const res = await axios.get('http://localhost:3000/api/admin?key=saiisadmin');
        return res.data;
    } catch (e) { return null; }
}

(async () => {
    console.log("🚀 Starting Sequential Stress Test (MAX_CONCURRENT=1)...");
    
    // Users (Added new one)
    const users = [
        { id: 1, prn: "MU0341120240233054", dob: "10-03-2006" },
        { id: 2, prn: "MU0341120240233075", dob: "22-10-2006" },
        { id: 3, prn: "MU0341120240233082", dob: "20-03-2006" },
        { id: 4, prn: "MU0341120240233086", dob: "29-07-2006" },
        { id: 5, prn: "MU0341120240231434", dob: "16-11-2006" }, // New User
        { id: 6, prn: "MU0341120240233054", dob: "10-03-2006" }  // Reuse User 1 as 6th
    ];

    const browser = await chromium.launch({ headless: true });
    
    // Clear Cache first
    const adminPage = await browser.newPage();
    adminPage.on('dialog', d => d.accept());
    await adminPage.goto('http://localhost:3000/admin?key=saiisadmin');
    await adminPage.click('text=Clear Cache');
    await adminPage.waitForTimeout(1000);
    console.log("🧹 Cache Cleared.\n");

    const startTime = Date.now();
    const pages = [];
    
    // Launch all pages
    for (const user of users) {
        const page = await browser.newPage();
        await page.goto('http://localhost:3000');
        await page.fill('input[placeholder="e.g. 12345678"]', user.prn);
        await page.fill('input[placeholder="DD-MM-YYYY"]', user.dob);
        pages.push({ id: user.id, page });
    }

    console.log("⚡ Submitting 6 requests simultaneously...");
    
    const userTimings = {};
    
    const promises = pages.map(({ id, page }) => {
        return (async () => {
            const start = Date.now();
            await page.click('button[type="submit"]');
            
            // Wait for result
            try {
                await page.waitForSelector('.text-5xl.font-bold, .text-red-600', { timeout: 180000 }); // 3 min timeout
                const duration = (Date.now() - start) / 1000;
                
                // Get SGPA if success
                const sgpaEl = await page.$('.text-5xl.font-bold');
                const result = sgpaEl ? await sgpaEl.innerText() : 'Error';
                
                userTimings[id] = duration;
                console.log(`✅ User ${id} Finished: ${duration.toFixed(1)}s (Result: ${result})`);
                return duration;
            } catch (e) {
                console.log(`❌ User ${id} Timeout/Error`);
                return 0;
            }
        })();
    });

    // Monitor Admin Panel while running
    const monitor = setInterval(async () => {
        const stats = await getAdminStats();
        if (stats && stats.queue) {
            console.log(`[Admin Panel] Active: ${stats.queue.active} | Waiting: ${stats.queue.waiting.length}`);
        }
    }, 5000);

    await Promise.all(promises);
    clearInterval(monitor);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n🏁 Total Test Time: ${totalTime.toFixed(1)}s`);
    console.log(`📊 User 6 Wait Time: ${userTimings[6]?.toFixed(1)}s`);
    
    // Calculate Average Scrape Time
    const avgTime = Object.values(userTimings).reduce((a, b) => a + b, 0) / 6;
    console.log(`⏱️ Average Scrape Time: ${avgTime.toFixed(1)}s`);
    
    await browser.close();
})();

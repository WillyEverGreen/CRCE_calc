const { chromium } = require('playwright');
const axios = require('axios');

async function getAdminStats() {
    try {
        const res = await axios.get('http://localhost:3000/api/admin?key=saiisadmin');
        return res.data;
    } catch (e) { return null; }
}

(async () => {
    console.log("🚀 Starting Concurrent Stress Test (MAX_CONCURRENT=4)...");
    
    // 4 Unique Users
    const users = [
        { id: 1, prn: "MU0341120240233054", dob: "10-03-2006" },
        { id: 2, prn: "MU0341120240233075", dob: "22-10-2006" },
        { id: 3, prn: "MU0341120240233082", dob: "20-03-2006" },
        { id: 4, prn: "MU0341120240231434", dob: "16-11-2006" }
    ];

    const browser = await chromium.launch({ headless: true });
    
    // Clear Cache first (to ensure fresh scrape)
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

    console.log("⚡ Submitting 4 requests simultaneously...");
    
    const promises = pages.map(({ id, page }) => {
        return (async () => {
            const start = Date.now();
            await page.click('button[type="submit"]');
            
            // Wait for result
            try {
                // Check for result or queue message
                await Promise.race([
                    page.waitForSelector('.text-5xl.font-bold', { timeout: 120000 }),
                    page.waitForSelector('.bg-red-50', { timeout: 120000 }) // Error box
                ]);
                
                const duration = (Date.now() - start) / 1000;
                
                // Get SGPA if success
                const sgpaEl = await page.$('.text-5xl.font-bold');
                const result = sgpaEl ? await sgpaEl.innerText() : 'Error/Timeout';
                
                console.log(`✅ User ${id} Finished: ${duration.toFixed(1)}s (Result: ${result})`);
                return duration;
            } catch (e) {
                console.log(`❌ User ${id} Timeout/Error: ${e.message}`);
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
    }, 2000); // Check every 2s

    await Promise.all(promises);
    clearInterval(monitor);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n🏁 Total Test Time: ${totalTime.toFixed(1)}s`);
    
    await browser.close();
})();

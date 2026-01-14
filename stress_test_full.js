const { chromium } = require('playwright');
const axios = require('axios');

async function getAdminStats() {
    try {
        const res = await axios.get('http://localhost:3000/api/admin?key=saiisadmin');
        return res.data;
    } catch (e) { return null; }
}

(async () => {
    console.log("🚀 Starting Full Load Test (6 Users, Limit 4 Active)...");
    
    // 6 Users (Expect 4 Active, 2 Queued)
    const users = [
        { id: 1, prn: "MU0341120240233054", dob: "10-03-2006" },
        { id: 2, prn: "MU0341120240233075", dob: "22-10-2006" },
        { id: 3, prn: "MU0341120240233082", dob: "20-03-2006" },
        { id: 4, prn: "MU0341120240231434", dob: "16-11-2006" },
        { id: 5, prn: "MU0341120240233086", dob: "29-07-2006" },
        { id: 6, prn: "MU0341120240233054", dob: "10-03-2006" }
    ];

    const browser = await chromium.launch({ headless: true });
    
    // Clear Cache
    const adminPage = await browser.newPage();
    adminPage.on('dialog', d => d.accept());
    await adminPage.goto('http://localhost:3000/admin?key=saiisadmin');
    await adminPage.click('text=Clear Cache');
    await adminPage.waitForTimeout(1000);
    console.log("🧹 Cache Cleared.\n");

    const startTime = Date.now();
    const pages = [];
    
    // Setup pages
    for (const user of users) {
        const page = await browser.newPage();
        await page.goto('http://localhost:3000');
        await page.fill('input[placeholder="e.g. 12345678"]', user.prn);
        await page.fill('input[placeholder="DD-MM-YYYY"]', user.dob);
        pages.push({ id: user.id, page });
    }

    console.log("⚡ Submitting 6 requests simultaneously...");
    console.log("🎯 Expectation: 4 Active, 2 Waiting in Queue\n");
    
    const promises = pages.map(({ id, page }) => {
        return (async () => {
            const start = Date.now();
            await page.click('button[type="submit"]');
            
            // Check if queued
            let isQueued = false;
            try {
                // Wait briefly to see if queue message appears
                const btn = page.locator('button[type="submit"]');
                await page.waitForTimeout(1500); 
                const text = await btn.textContent();
                if (text.includes("queue")) {
                    console.log(`⏳ User ${id} is in QUEUE`);
                    isQueued = true;
                }
            } catch(e) {}

            // Wait for final result
            try {
                await page.waitForSelector('.text-5xl.font-bold', { timeout: 120000 });
                const duration = (Date.now() - start) / 1000;
                console.log(`✅ User ${id} Finished: ${duration.toFixed(1)}s ${isQueued ? '(Was Queued)' : ''}`);
                return duration;
            } catch (e) {
                console.log(`❌ User ${id} Error`);
                return 0;
            }
        })();
    });

    // Monitor Admin Panel
    let maxWaiting = 0;
    const monitor = setInterval(async () => {
        const stats = await getAdminStats();
        if (stats && stats.queue) {
            console.log(`[Admin Panel] Active: ${stats.queue.active} | Waiting: ${stats.queue.waiting.length}`);
            if (stats.queue.waiting.length > maxWaiting) maxWaiting = stats.queue.waiting.length;
        }
    }, 2000);

    await Promise.all(promises);
    clearInterval(monitor);

    console.log(`\n🏁 Test Complete.`);
    console.log(`📊 Max Waiting Observed: ${maxWaiting} (Matches expected 2? ${maxWaiting === 2 ? 'Yes ✅' : 'No ❌'})`);
    
    await browser.close();
})();

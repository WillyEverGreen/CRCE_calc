const { chromium } = require('playwright');

(async () => {
  console.log("🚀 Starting Validated UI Stress Test...");
  const browser = await chromium.launch({ headless: true });
  
  // 1. Clear Cache via Admin Panel
  console.log("🧹 Step 1: Clearing Cache via Admin UI...");
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  
  let dialogAccepted = false;
  adminPage.on('dialog', async dialog => {
    await dialog.accept();
    dialogAccepted = true;
  });

  await adminPage.goto('http://localhost:3000/admin?key=saiisadmin');
  await adminPage.click('text=Clear Cache');
  await adminPage.waitForTimeout(1000); 
  
  if (dialogAccepted) console.log("✅ Cache Cleared successfully!");
  await adminContext.close();

  // 2. Launch 5 Concurrent Users (Staggered)
  console.log("\n👥 Step 2: Launching 5 Simultaneous Users...");
  
  const users = [
    { id: 1, prn: "MU0341120240233054", dob: "10-03-2006" },
    { id: 2, prn: "MU0341120240233075", dob: "22-10-2006" },
    { id: 3, prn: "MU0341120240233082", dob: "20-03-2006" },
    { id: 4, prn: "MU0341120240233086", dob: "29-07-2006" },
    { id: 5, prn: "MU0341120240233054", dob: "10-03-2006" }
  ];

  const pages = [];
  
  for (const user of users) {
    console.log(`Loading User ${user.id}...`);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000');
    
    // Fixed selector
    await page.fill('input[placeholder="e.g. 12345678"]', user.prn);
    await page.fill('input[placeholder="DD-MM-YYYY"]', user.dob);
    pages.push({ id: user.id, page });
    
    // Stagger slightly to prevent server choke
    await page.waitForTimeout(1000); 
  }

  console.log("⚡ Submitting all requests...");
  
  const submitPromises = pages.map(({ id, page }) => {
    return (async () => {
      try {
        const btn = page.locator('button[type="submit"]');
        await btn.click();
        console.log(`▶️ User ${id} submitted`);
        
        // Monitor for queue message for 10s
        for (let i = 0; i < 20; i++) {
            await page.waitForTimeout(500);
            const btnText = await btn.textContent();
            if (btnText.includes("queue") || btnText.includes("Queue")) {
                console.log(`⚠️ User ${id} sees QUEUE message: "${btnText.trim()}"`);
                return "queued";
            }
        }
        return "active";
      } catch (e) { return "error"; }
    })();
  });

  const results = await Promise.all(submitPromises);
  const queuedCount = results.filter(r => r === "queued").length;
  
  console.log("\n📊 Test Results:");
  console.log(`- Active Scrapes: ${results.filter(r => r === "active").length}`);
  console.log(`- Queued Users: ${queuedCount}`);

  if (queuedCount > 0) {
      console.log("✅ UI TEST PASSED: Queue UI triggered correctly!");
  } else {
      console.log("❌ UI TEST FAILED: No queue message seen.");
  }

  await browser.close();
})();
